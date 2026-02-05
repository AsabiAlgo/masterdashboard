/**
 * Browser Socket Hook
 *
 * Manages WebSocket communication for browser sessions.
 * Handles session lifecycle, screencast frames, input, and navigation.
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
  WS_EVENTS,
  SessionType,
  type BrowserConfig,
  type BrowserInputPayload,
  type BrowserNavigatePayload,
  type BrowserNavigateResult,
  type ScreencastFrame,
  type SessionCreatedPayload,
  type SessionTerminatedPayload,
  type SessionErrorPayload,
} from '@masterdashboard/shared';

interface UseBrowserSocketOptions {
  /** Existing session ID to reconnect to */
  sessionId?: string;
  /** Callback for screencast frames */
  onFrame: (frame: string) => void;
  /** Callback when navigated */
  onNavigated: (url: string, title?: string) => void;
  /** Callback when session is connected */
  onConnected: (sessionId: string) => void;
  /** Callback when session is disconnected */
  onDisconnected: () => void;
  /** Callback for errors */
  onError?: (error: string) => void;
  /** Callback for console messages */
  onConsole?: (type: string, text: string) => void;
}

interface UseBrowserSocketReturn {
  /** Whether the browser session is connected */
  connected: boolean;
  /** Whether currently connecting */
  connecting: boolean;
  /** Whether the WebSocket is ready for connections */
  socketReady: boolean;
  /** Create a new browser session */
  connect: (config: BrowserConfig) => void;
  /** Terminate the browser session */
  disconnect: () => void;
  /** Send input event to browser */
  sendInput: (input: Omit<BrowserInputPayload, 'sessionId'>) => void;
  /** Navigate to URL */
  navigate: (url: string) => void;
  /** Go back in history */
  goBack: () => void;
  /** Go forward in history */
  goForward: () => void;
  /** Reload page */
  reload: () => void;
  /** Take screenshot */
  screenshot: () => Promise<string | null>;
  /** Resize viewport */
  resize: (width: number, height: number) => void;
}

// Generate unique request ID for correlation
let requestIdCounter = 0;
function generateRequestId(): string {
  return `browser_req_${Date.now()}_${++requestIdCounter}`;
}

export function useBrowserSocket({
  sessionId,
  onFrame,
  onNavigated,
  onConnected,
  onDisconnected,
  onError,
  onConsole,
}: UseBrowserSocketOptions): UseBrowserSocketReturn {
  const currentSessionId = useRef(sessionId);
  const [connected, setConnected] = useState(false);
  const connectedRef = useRef(false); // Ref to avoid stale closure in sendInput/navigate
  const [connecting, setConnecting] = useState(false);
  const requestIdRef = useRef<string | null>(null); // Track our pending request
  const { emit, on, off, connected: socketConnected } = useWebSocket();

  // Keep session ID ref in sync
  useEffect(() => {
    currentSessionId.current = sessionId;
  }, [sessionId]);

  // Cleanup request ID ref on unmount
  useEffect(() => {
    return () => {
      requestIdRef.current = null;
    };
  }, []);

  // Set up WebSocket event listeners
  useEffect(() => {
    const handleFrame = (payload: ScreencastFrame) => {
      if (payload.sessionId === currentSessionId.current) {
        onFrame(payload.data);
      }
    };

    const handleNavigated = (payload: { sessionId: string; url: string; title?: string }) => {
      if (payload.sessionId === currentSessionId.current) {
        onNavigated(payload.url, payload.title);
      }
    };

    const handleNavigateResult = (payload: BrowserNavigateResult & { sessionId: string }) => {
      if (payload.sessionId === currentSessionId.current && payload.success) {
        onNavigated(payload.url, payload.title);
      }
    };

    const handleCreated = (payload: SessionCreatedPayload & { correlationId?: string }) => {
      if (payload.type !== SessionType.BROWSER) {
        return;
      }

      // Only claim this session if we have a pending request with matching correlation ID
      if (requestIdRef.current && payload.correlationId === requestIdRef.current) {
        requestIdRef.current = null; // Clear the pending request
        currentSessionId.current = payload.sessionId;
        connectedRef.current = true;
        setConnected(true);
        setConnecting(false);
        onConnected(payload.sessionId);
      }
    };

    const handleTerminated = (payload: SessionTerminatedPayload) => {
      if (payload.sessionId === currentSessionId.current) {
        connectedRef.current = false;
        setConnected(false);
        onDisconnected();
      }
    };

    const handleError = (payload: SessionErrorPayload) => {
      if (payload.sessionId === currentSessionId.current) {
        setConnecting(false);
        onError?.(payload.error);
      }
    };

    const handleConsole = (payload: { sessionId: string; type: string; text: string }) => {
      if (payload.sessionId === currentSessionId.current) {
        onConsole?.(payload.type, payload.text);
      }
    };

    // Subscribe to events
    const unsubFrame = on<ScreencastFrame>(WS_EVENTS.BROWSER_FRAME, handleFrame);
    const unsubNavigated = on<{ sessionId: string; url: string; title?: string }>(
      'browser:loaded',
      handleNavigated
    );
    const unsubNavigateResult = on<BrowserNavigateResult & { sessionId: string }>(
      WS_EVENTS.BROWSER_NAVIGATE_RESULT,
      handleNavigateResult
    );
    const unsubCreated = on<SessionCreatedPayload>(
      WS_EVENTS.SESSION_CREATED,
      handleCreated
    );
    const unsubTerminated = on<SessionTerminatedPayload>(
      WS_EVENTS.SESSION_TERMINATED,
      handleTerminated
    );
    const unsubError = on<SessionErrorPayload>(
      WS_EVENTS.SESSION_ERROR,
      handleError
    );
    const unsubConsole = on<{ sessionId: string; type: string; text: string }>(
      WS_EVENTS.BROWSER_CONSOLE,
      handleConsole
    );

    return () => {
      unsubFrame();
      unsubNavigated();
      unsubNavigateResult();
      unsubCreated();
      unsubTerminated();
      unsubError();
      unsubConsole();
    };
  }, [on, off, onFrame, onNavigated, onConnected, onDisconnected, onError, onConsole]);

  // Create a new browser session
  const connect = useCallback(
    (config: BrowserConfig) => {
      if (!socketConnected) {
        onError?.('WebSocket not connected');
        return;
      }

      // Generate unique request ID for correlation
      const reqId = generateRequestId();
      requestIdRef.current = reqId;

      setConnecting(true);
      emit(
        WS_EVENTS.SESSION_CREATE,
        {
          type: SessionType.BROWSER,
          projectId: config.projectId,
          config: {
            ...config,
          },
        },
        reqId // Pass correlation ID
      );
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

  // Send input event - use ref to avoid stale closure
  const sendInput = useCallback(
    (input: Omit<BrowserInputPayload, 'sessionId'>) => {
      if (currentSessionId.current && connectedRef.current) {
        emit(WS_EVENTS.BROWSER_INPUT, {
          sessionId: currentSessionId.current,
          ...input,
        } as BrowserInputPayload);
      }
    },
    [emit]
  );

  // Navigate to URL - use ref to avoid stale closure
  const navigate = useCallback(
    (url: string) => {
      if (currentSessionId.current && connectedRef.current) {
        emit(WS_EVENTS.BROWSER_NAVIGATE, {
          sessionId: currentSessionId.current,
          url,
        } as BrowserNavigatePayload);
      }
    },
    [emit]
  );

  // Go back in history - use ref to avoid stale closure
  const goBack = useCallback(() => {
    if (currentSessionId.current && connectedRef.current) {
      emit('browser:back', { sessionId: currentSessionId.current });
    }
  }, [emit]);

  // Go forward in history - use ref to avoid stale closure
  const goForward = useCallback(() => {
    if (currentSessionId.current && connectedRef.current) {
      emit('browser:forward', { sessionId: currentSessionId.current });
    }
  }, [emit]);

  // Reload page - use ref to avoid stale closure
  const reload = useCallback(() => {
    if (currentSessionId.current && connectedRef.current) {
      emit('browser:reload', { sessionId: currentSessionId.current });
    }
  }, [emit]);

  // Take screenshot - use ref to avoid stale closure
  const screenshot = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!currentSessionId.current || !connectedRef.current) {
        resolve(null);
        return;
      }

      const handler = (payload: { sessionId: string; data: string }) => {
        if (payload.sessionId === currentSessionId.current) {
          off('browser:screenshot:response');
          resolve(payload.data);
        }
      };

      on<{ sessionId: string; data: string }>('browser:screenshot:response', handler);
      emit('browser:screenshot', { sessionId: currentSessionId.current });

      // Timeout after 5 seconds
      setTimeout(() => {
        off('browser:screenshot:response');
        resolve(null);
      }, 5000);
    });
  }, [emit, on, off]);

  // Resize viewport - use ref to avoid stale closure
  const resize = useCallback(
    (width: number, height: number) => {
      if (currentSessionId.current && connectedRef.current) {
        emit('browser:resize', {
          sessionId: currentSessionId.current,
          width,
          height,
        });
      }
    },
    [emit]
  );

  return {
    connected: connected && socketConnected,
    connecting,
    socketReady: socketConnected,
    connect,
    disconnect,
    sendInput,
    navigate,
    goBack,
    goForward,
    reload,
    screenshot,
    resize,
  };
}
