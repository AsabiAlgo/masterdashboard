/**
 * SSH Socket Hook
 *
 * Manages WebSocket communication for SSH sessions.
 * Handles connection lifecycle, input/output, and resize events.
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
  WS_EVENTS,
  type SSHConfig,
} from '@masterdashboard/shared';

interface SSHConnectedPayload {
  sessionId: string;
  host: string;
  port: number;
  username: string;
}

interface SSHOutputPayload {
  sessionId: string;
  data: string;
  timestamp: number;
}

interface SSHErrorPayload {
  sessionId: string;
  error: string;
}

interface SSHKeyboardInteractivePayload {
  sessionId: string;
  name: string;
  instructions: string;
  prompts: Array<{ prompt: string; echo: boolean }>;
}

interface UseSSHSocketOptions {
  /** Existing session ID to use */
  sessionId?: string;
  /** Callback for SSH output data */
  onOutput: (data: string) => void;
  /** Callback when SSH session is connected */
  onConnected: (sessionId: string, info: { host: string; username: string }) => void;
  /** Callback when SSH session is disconnected */
  onDisconnected: () => void;
  /** Callback for keyboard-interactive auth prompts */
  onKeyboardInteractive?: (prompts: Array<{ prompt: string; echo: boolean }>) => void;
  /** Callback for errors */
  onError?: (error: string) => void;
}

interface UseSSHSocketReturn {
  /** Whether the SSH session is connected */
  connected: boolean;
  /** Whether currently connecting */
  connecting: boolean;
  /** Connect to an SSH server */
  connect: (config: Omit<SSHConfig, 'projectId'>) => void;
  /** Disconnect from the SSH session */
  disconnect: () => void;
  /** Send keyboard input to the SSH session */
  sendInput: (data: string) => void;
  /** Send resize event to the SSH session */
  sendResize: (cols: number, rows: number) => void;
  /** Respond to keyboard-interactive auth */
  respondKeyboardInteractive: (responses: string[]) => void;
}

export function useSSHSocket({
  sessionId,
  onOutput,
  onConnected,
  onDisconnected,
  onKeyboardInteractive,
  onError,
}: UseSSHSocketOptions): UseSSHSocketReturn {
  const currentSessionId = useRef(sessionId);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const { emit, on, connected: socketConnected } = useWebSocket();

  // Keep session ID ref in sync
  useEffect(() => {
    currentSessionId.current = sessionId;
  }, [sessionId]);

  // Set up WebSocket event listeners
  useEffect(() => {
    const handleOutput = (payload: SSHOutputPayload) => {
      if (payload.sessionId === currentSessionId.current) {
        onOutput(payload.data);
      }
    };

    const handleConnected = (payload: SSHConnectedPayload) => {
      currentSessionId.current = payload.sessionId;
      setConnected(true);
      setConnecting(false);
      onConnected(payload.sessionId, {
        host: payload.host,
        username: payload.username,
      });
    };

    const handleDisconnected = (payload: { sessionId: string }) => {
      if (payload.sessionId === currentSessionId.current) {
        setConnected(false);
        onDisconnected();
      }
    };

    const handleKeyboardInteractive = (payload: SSHKeyboardInteractivePayload) => {
      if (payload.sessionId === currentSessionId.current) {
        onKeyboardInteractive?.(payload.prompts);
      }
    };

    const handleError = (payload: SSHErrorPayload) => {
      if (payload.sessionId === currentSessionId.current) {
        setConnecting(false);
        onError?.(payload.error);
      }
    };

    // Subscribe to SSH events
    const unsubOutput = on<SSHOutputPayload>(WS_EVENTS.SSH_OUTPUT, handleOutput);
    const unsubConnected = on<SSHConnectedPayload>(WS_EVENTS.SSH_CONNECTED, handleConnected);
    const unsubDisconnected = on<{ sessionId: string }>('ssh:disconnected', handleDisconnected);
    const unsubKeyboardInteractive = on<SSHKeyboardInteractivePayload>(
      'ssh:keyboard-interactive',
      handleKeyboardInteractive
    );
    const unsubError = on<SSHErrorPayload>(WS_EVENTS.SSH_ERROR, handleError);

    return () => {
      unsubOutput();
      unsubConnected();
      unsubDisconnected();
      unsubKeyboardInteractive();
      unsubError();
    };
  }, [on, onOutput, onConnected, onDisconnected, onKeyboardInteractive, onError]);

  // Connect to SSH server
  const connect = useCallback(
    (config: Omit<SSHConfig, 'projectId'>) => {
      if (!socketConnected) {
        onError?.('WebSocket not connected');
        return;
      }

      setConnecting(true);
      emit(WS_EVENTS.SSH_CONNECT, {
        ...config,
      });
    },
    [emit, socketConnected, onError]
  );

  // Disconnect from SSH session
  const disconnect = useCallback(() => {
    if (currentSessionId.current) {
      emit(WS_EVENTS.SSH_CLOSE, {
        sessionId: currentSessionId.current,
      });
      setConnected(false);
    }
  }, [emit]);

  // Send keyboard input
  const sendInput = useCallback(
    (data: string) => {
      if (currentSessionId.current && connected) {
        emit(WS_EVENTS.SSH_INPUT, {
          sessionId: currentSessionId.current,
          data,
        });
      }
    },
    [emit, connected]
  );

  // Send resize event
  const sendResize = useCallback(
    (cols: number, rows: number) => {
      if (currentSessionId.current && connected) {
        emit('ssh:resize', {
          sessionId: currentSessionId.current,
          cols,
          rows,
        });
      }
    },
    [emit, connected]
  );

  // Respond to keyboard-interactive auth
  const respondKeyboardInteractive = useCallback(
    (responses: string[]) => {
      if (currentSessionId.current) {
        emit('ssh:keyboard-interactive-response', {
          sessionId: currentSessionId.current,
          responses,
        });
      }
    },
    [emit]
  );

  return {
    connected: connected && socketConnected,
    connecting,
    connect,
    disconnect,
    sendInput,
    sendResize,
    respondKeyboardInteractive,
  };
}
