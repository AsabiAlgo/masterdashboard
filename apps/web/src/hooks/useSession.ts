/**
 * Session Hook
 *
 * Custom hook for managing terminal and browser sessions.
 * Handles session creation, termination, and state synchronization.
 */

import { useCallback, useEffect } from 'react';
import { useWebSocket, WS_EVENTS } from './useWebSocket';
import { useCanvasStore } from '@/stores/canvas-store';
import {
  NodeType,
  type TerminalConfig,
  type BrowserConfig,
  type SessionCreatedPayload,
  type SessionTerminatedPayload,
  type SessionErrorPayload,
  ShellType,
  BrowserEngine,
} from '@masterdashboard/shared';

interface UseSessionReturn {
  /** Create a new terminal session for a node */
  createTerminalSession: (
    nodeId: string,
    config?: Partial<TerminalConfig>
  ) => void;
  /** Create a new browser session for a node */
  createBrowserSession: (
    nodeId: string,
    config?: Partial<BrowserConfig>
  ) => void;
  /** Terminate a session */
  terminateSession: (sessionId: string) => void;
  /** Reconnect to an existing session */
  reconnectSession: (sessionId: string) => void;
  /** Send input to a terminal session */
  sendTerminalInput: (sessionId: string, data: string) => void;
  /** Resize a terminal session */
  resizeTerminal: (
    sessionId: string,
    dimensions: { cols: number; rows: number }
  ) => void;
}

export function useSession(): UseSessionReturn {
  const { emit, on, connected } = useWebSocket();
  const {
    setNodeSessionId,
    setNodeConnected,
    updateNodeData,
    nodes,
  } = useCanvasStore();

  // Handle session created events
  useEffect(() => {
    if (!connected) return;

    const unsubscribeCreated = on<SessionCreatedPayload>(
      WS_EVENTS.SESSION_CREATED,
      (payload) => {
        const { sessionId, type } = payload;

        // Find the node waiting for this session
        const pendingNode = nodes.find(
          (n) =>
            n.data.sessionId === '' &&
            ((type === 'terminal' && n.type === NodeType.TERMINAL) ||
              (type === 'browser' && n.type === NodeType.BROWSER))
        );

        if (pendingNode) {
          setNodeSessionId(pendingNode.id, sessionId);
          setNodeConnected(pendingNode.id, true);
        }
      }
    );

    const unsubscribeTerminated = on<SessionTerminatedPayload>(
      WS_EVENTS.SESSION_TERMINATED,
      (payload) => {
        const { sessionId } = payload;

        // Find and update the node with this session
        const node = nodes.find((n) => n.data.sessionId === sessionId);
        if (node) {
          setNodeConnected(node.id, false);
        }
      }
    );

    const unsubscribeError = on<SessionErrorPayload>(
      WS_EVENTS.SESSION_ERROR,
      (payload) => {
        const { sessionId, error } = payload;

        // Find and update the node with this session
        const node = nodes.find((n) => n.data.sessionId === sessionId);
        if (node) {
          setNodeConnected(node.id, false);
          updateNodeData(node.id, { error });
        }
      }
    );

    return () => {
      unsubscribeCreated();
      unsubscribeTerminated();
      unsubscribeError();
    };
  }, [
    connected,
    on,
    nodes,
    setNodeSessionId,
    setNodeConnected,
    updateNodeData,
  ]);

  // Create a terminal session
  const createTerminalSession = useCallback(
    (nodeId: string, config: Partial<TerminalConfig> = {}) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || node.type !== NodeType.TERMINAL) return;

      const terminalConfig: TerminalConfig = {
        shell: config.shell ?? ShellType.BASH,
        cwd: config.cwd ?? process.env.HOME ?? '~',
        cols: config.cols ?? 80,
        rows: config.rows ?? 24,
        projectId: config.projectId ?? 'default',
        ...config,
      };

      emit(WS_EVENTS.SESSION_CREATE, {
        type: 'terminal',
        nodeId,
        config: terminalConfig,
      });
    },
    [emit, nodes]
  );

  // Create a browser session
  const createBrowserSession = useCallback(
    (nodeId: string, config: Partial<BrowserConfig> = {}) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || node.type !== NodeType.BROWSER) return;

      const browserConfig: BrowserConfig = {
        engine: config.engine ?? BrowserEngine.CHROMIUM,
        url: config.url ?? 'about:blank',
        viewport: config.viewport ?? { width: 1280, height: 720 },
        headless: config.headless ?? false,
        isInteractive: config.isInteractive ?? true,
        projectId: config.projectId ?? 'default',
        ...config,
      };

      emit(WS_EVENTS.SESSION_CREATE, {
        type: 'browser',
        nodeId,
        config: browserConfig,
      });
    },
    [emit, nodes]
  );

  // Terminate a session
  const terminateSession = useCallback(
    (sessionId: string) => {
      emit(WS_EVENTS.SESSION_TERMINATE, { sessionId });
    },
    [emit]
  );

  // Reconnect to a session
  const reconnectSession = useCallback(
    (sessionId: string) => {
      emit(WS_EVENTS.TERMINAL_RECONNECT, { sessionId });
    },
    [emit]
  );

  // Send terminal input
  const sendTerminalInput = useCallback(
    (sessionId: string, data: string) => {
      emit(WS_EVENTS.TERMINAL_INPUT, { sessionId, data });
    },
    [emit]
  );

  // Resize terminal
  const resizeTerminal = useCallback(
    (sessionId: string, dimensions: { cols: number; rows: number }) => {
      emit(WS_EVENTS.TERMINAL_RESIZE, { sessionId, ...dimensions });
    },
    [emit]
  );

  return {
    createTerminalSession,
    createBrowserSession,
    terminateSession,
    reconnectSession,
    sendTerminalInput,
    resizeTerminal,
  };
}
