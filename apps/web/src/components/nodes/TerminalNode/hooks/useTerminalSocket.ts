/**
 * Terminal Socket Hook
 *
 * Manages WebSocket communication for a terminal session.
 * Handles session lifecycle, input/output, resize events, and reconnection.
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
  WS_EVENTS,
  SessionType,
  type TerminalConfig,
  type TerminalOutputPayload,
  type SessionCreatedPayload,
  type SessionTerminatedPayload,
  type SessionDisconnectedPayload,
  type SessionErrorPayload,
  type TerminalReconnectResponse,
} from '@masterdashboard/shared';

interface UseTerminalSocketOptions {
  /** Existing session ID to reconnect to */
  sessionId?: string;
  /** Callback for terminal output data */
  onOutput: (data: string) => void;
  /** Callback when session is connected */
  onConnected: (sessionId: string) => void;
  /** Callback when session is disconnected */
  onDisconnected: (exitCode?: number) => void;
  /** Callback for errors */
  onError?: (error: string) => void;
  /** Callback for reconnection with buffered output */
  onReconnect?: (bufferedOutput: string) => void;
  /** Callback when session is expired/invalid (tmux session killed) */
  onSessionExpired?: () => void;
  /** Callback to clear terminal before replay */
  onClearTerminal?: () => void;
}

interface UseTerminalSocketReturn {
  /** Whether the terminal session is connected */
  connected: boolean;
  /** Whether currently connecting */
  connecting: boolean;
  /** Whether the WebSocket is ready for connections */
  socketReady: boolean;
  /** Create a new terminal session */
  connect: (config: TerminalConfig) => void;
  /** Terminate the terminal session */
  disconnect: () => void;
  /** Send keyboard input to the terminal */
  sendInput: (data: string) => void;
  /** Send resize event to the terminal */
  sendResize: (cols: number, rows: number) => void;
  /** Reconnect to an existing session */
  reconnect: (sessionId: string) => void;
}

// Generate unique request ID for correlation
let requestIdCounter = 0;
function generateRequestId(): string {
  return `term_req_${Date.now()}_${++requestIdCounter}`;
}

export function useTerminalSocket({
  sessionId,
  onOutput,
  onConnected,
  onDisconnected,
  onError,
  onReconnect,
  onSessionExpired,
  onClearTerminal,
}: UseTerminalSocketOptions): UseTerminalSocketReturn {
  const currentSessionId = useRef(sessionId);
  const [connected, setConnected] = useState(false);
  const connectedRef = useRef(false); // Ref to avoid stale closure in sendInput
  const [connecting, setConnecting] = useState(false);
  const requestIdRef = useRef<string | null>(null);
  const { emit, on, off: _off, connected: socketConnected } = useWebSocket();

  // Keep session ID ref in sync
  useEffect(() => {
    currentSessionId.current = sessionId;
  }, [sessionId]);

  // Store callbacks in refs to avoid dependency issues
  const onOutputRef = useRef(onOutput);
  const onConnectedRef = useRef(onConnected);
  const onDisconnectedRef = useRef(onDisconnected);
  const onErrorRef = useRef(onError);
  const onReconnectRef = useRef(onReconnect);
  const onSessionExpiredRef = useRef(onSessionExpired);
  const onClearTerminalRef = useRef(onClearTerminal);

  // Keep callback refs in sync
  useEffect(() => {
    onOutputRef.current = onOutput;
    onConnectedRef.current = onConnected;
    onDisconnectedRef.current = onDisconnected;
    onErrorRef.current = onError;
    onReconnectRef.current = onReconnect;
    onSessionExpiredRef.current = onSessionExpired;
    onClearTerminalRef.current = onClearTerminal;
  });

  // Set up WebSocket event listeners - use refs to avoid dependency issues
  useEffect(() => {
    const handleOutput = (payload: TerminalOutputPayload) => {
      if (payload.sessionId === currentSessionId.current) {
        onOutputRef.current(payload.data);
      }
    };

    const handleCreated = (payload: SessionCreatedPayload & { correlationId?: string }) => {
      if (payload.type !== SessionType.TERMINAL) {
        return;
      }

      // Only claim this session if the correlation ID matches our pending request
      // This ensures each terminal only claims its own session
      if (
        requestIdRef.current &&
        payload.correlationId &&
        payload.correlationId === requestIdRef.current
      ) {
        requestIdRef.current = null;
        currentSessionId.current = payload.sessionId;
        connectedRef.current = true;
        setConnected(true);
        setConnecting(false);
        onConnectedRef.current(payload.sessionId);
      }
    };

    const handleTerminated = (payload: SessionTerminatedPayload) => {
      if (payload.sessionId === currentSessionId.current) {
        connectedRef.current = false;
        setConnected(false);
        onDisconnectedRef.current(payload.exitCode);
      }
    };

    const handleDisconnected = (payload: SessionDisconnectedPayload) => {
      if (payload.sessionId === currentSessionId.current) {
        // PTY died but tmux session is alive - mark as disconnected so user can reconnect
        connectedRef.current = false;
        setConnected(false);
        // Don't call onDisconnected with exit code - session can be reconnected
        onErrorRef.current?.('Connection lost - click reconnect to resume');
      }
    };

    const handleError = (payload: SessionErrorPayload & { code?: string }) => {
      if (payload.sessionId === currentSessionId.current) {
        setConnecting(false);

        // If this is a write error (PTY not found), mark as disconnected
        // so the reconnect button shows
        if (payload.code === 'TERMINAL_WRITE_FAILED') {
          connectedRef.current = false;
          setConnected(false);
        }

        onErrorRef.current?.(payload.error);
      }
    };

    const handleReconnectResponse = (payload: TerminalReconnectResponse) => {
      if (payload.sessionId !== currentSessionId.current) {
        return;
      }

      setConnecting(false);

      if (payload.success) {
        connectedRef.current = true;
        setConnected(true);
        // Notify that connection is established (updates node data)
        onConnectedRef.current(payload.sessionId);

        // Handle buffered output - delay to let tmux finish its initial redraw
        // Tmux redraws its screen when we attach, which would overwrite immediate buffer replay
        if (payload.bufferedOutput) {
          const bufferedOutput = payload.bufferedOutput;
          setTimeout(() => {
            onReconnectRef.current?.(bufferedOutput);
          }, 500);
        }
      } else {
        // Session no longer exists
        const isExpired =
          payload.error === 'Session expired' ||
          payload.error === 'Session not found' ||
          payload.error === 'Failed to attach to session';

        if (isExpired) {
          // Clear the invalid sessionId
          onSessionExpiredRef.current?.();
        }
        onErrorRef.current?.(payload.error ?? 'Failed to reconnect');
      }
    };

    // Subscribe to events
    const unsubOutput = on<TerminalOutputPayload>(
      WS_EVENTS.TERMINAL_OUTPUT,
      handleOutput
    );
    const unsubCreated = on<SessionCreatedPayload>(
      WS_EVENTS.SESSION_CREATED,
      handleCreated
    );
    const unsubTerminated = on<SessionTerminatedPayload>(
      WS_EVENTS.SESSION_TERMINATED,
      handleTerminated
    );
    const unsubDisconnected = on<SessionDisconnectedPayload>(
      WS_EVENTS.SESSION_DISCONNECTED,
      handleDisconnected
    );
    const unsubError = on<SessionErrorPayload>(
      WS_EVENTS.SESSION_ERROR,
      handleError
    );
    const unsubReconnect = on<TerminalReconnectResponse>(
      WS_EVENTS.TERMINAL_RECONNECT_RESPONSE,
      handleReconnectResponse
    );

    return () => {
      unsubOutput();
      unsubCreated();
      unsubTerminated();
      unsubDisconnected();
      unsubError();
      unsubReconnect();
    };
    // Only depend on `on` - callbacks are accessed via refs to prevent re-subscription
  }, [on]);

  // Auto-reconnect is handled by TerminalNode.tsx's useEffect
  // We removed the duplicate auto-reconnect here to avoid race conditions

  // Create a new terminal session
  const connect = useCallback(
    (config: TerminalConfig) => {
      if (!socketConnected) {
        onError?.('WebSocket not connected');
        return;
      }

      // Generate unique request ID for correlation
      const reqId = generateRequestId();
      requestIdRef.current = reqId;

      setConnecting(true);
      const payload = {
        type: SessionType.TERMINAL,
        projectId: config.projectId,
        config: {
          ...config,
        },
      };
      // Include correlation ID so we can match the response to this specific request
      emit(WS_EVENTS.SESSION_CREATE, payload, reqId);
    },
    [emit, socketConnected, onError]
  );

  // Terminate the current session
  const disconnect = useCallback(() => {
    if (currentSessionId.current) {
      emit(WS_EVENTS.SESSION_TERMINATE, {
        sessionId: currentSessionId.current,
      });
    }
  }, [emit]);

  // Send keyboard input - use ref to avoid stale closure
  const sendInput = useCallback(
    (data: string) => {
      if (currentSessionId.current && connectedRef.current) {
        emit(WS_EVENTS.TERMINAL_INPUT, {
          sessionId: currentSessionId.current,
          data,
        });
      }
    },
    [emit]
  );

  // Send resize event - use ref to avoid stale closure
  const sendResize = useCallback(
    (cols: number, rows: number) => {
      if (currentSessionId.current && connectedRef.current) {
        emit(WS_EVENTS.TERMINAL_RESIZE, {
          sessionId: currentSessionId.current,
          cols,
          rows,
        });
      }
    },
    [emit]
  );

  // Reconnect to an existing session
  const reconnect = useCallback(
    (targetSessionId: string) => {
      if (!socketConnected) {
        onError?.('WebSocket not connected');
        return;
      }

      setConnecting(true);
      currentSessionId.current = targetSessionId;
      emit(WS_EVENTS.TERMINAL_RECONNECT, {
        sessionId: targetSessionId,
      });
    },
    [emit, socketConnected, onError]
  );

  return {
    connected: connected && socketConnected,
    connecting,
    socketReady: socketConnected,
    connect,
    disconnect,
    sendInput,
    sendResize,
    reconnect,
  };
}
