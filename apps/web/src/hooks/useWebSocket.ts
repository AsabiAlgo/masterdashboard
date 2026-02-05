/**
 * WebSocket Hook
 *
 * Custom hook for managing WebSocket connections to the backend server.
 * Uses a singleton pattern to maintain connection across React StrictMode remounts.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { WS_EVENTS } from '@masterdashboard/shared';
import { useCanvasStore } from '@/stores/canvas-store';

interface UseWebSocketOptions {
  /** WebSocket server URL */
  url?: string;
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Connection callback */
  onConnect?: () => void;
  /** Disconnection callback */
  onDisconnect?: (reason: string) => void;
  /** Error callback */
  onError?: (error: Error) => void;
  /** Reconnection attempt callback */
  onReconnectAttempt?: (attemptNumber: number) => void;
}

interface UseWebSocketReturn {
  /** Current socket instance */
  socket: Socket | null;
  /** Whether socket is connected */
  connected: boolean;
  /** Whether socket is currently connecting */
  connecting: boolean;
  /** Emit an event to the server, optionally with correlation ID for request/response matching */
  emit: <T>(event: string, payload?: T, correlationId?: string) => void;
  /** Subscribe to an event */
  on: <T>(event: string, handler: (payload: T) => void) => () => void;
  /** Unsubscribe from an event */
  off: (event: string, handler?: (payload: unknown) => void) => void;
  /** Manually connect to the server */
  connect: () => void;
  /** Manually disconnect from the server */
  disconnect: () => void;
}

const DEFAULT_WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4050';

// Singleton socket manager to persist across React StrictMode remounts
class SocketManager {
  private static instance: SocketManager;
  private socket: Socket | null = null;
  private url: string;
  private listeners: Set<() => void> = new Set();
  private _connected = false;
  private _connecting = false;

  private constructor(url: string) {
    this.url = url;
  }

  static getInstance(url: string): SocketManager {
    if (!SocketManager.instance || SocketManager.instance.url !== url) {
      SocketManager.instance = new SocketManager(url);
    }
    return SocketManager.instance;
  }

  get connected() {
    return this._connected;
  }

  get connecting() {
    return this._connecting;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  connect(callbacks?: {
    onConnect?: () => void;
    onDisconnect?: (reason: string) => void;
    onError?: (error: Error) => void;
    onReconnectAttempt?: (attemptNumber: number) => void;
  }): void {
    // If already connected or connecting, don't create a new socket
    if (this.socket?.connected) {
      this._connected = true;
      this._connecting = false;
      this.notify();
      callbacks?.onConnect?.();
      return;
    }

    if (this._connecting && this.socket) {
      return;
    }

    this._connecting = true;
    this.notify();

    // Reuse existing socket if it exists
    if (!this.socket) {
      this.socket = io(this.url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
        timeout: 20000,
      });

      this.socket.on('connect', () => {
        this._connected = true;
        this._connecting = false;
        this.notify();
        callbacks?.onConnect?.();
      });

      this.socket.on('disconnect', (reason) => {
        this._connected = false;
        this.notify();
        callbacks?.onDisconnect?.(reason);
      });

      this.socket.on('connect_error', (error) => {
        this._connecting = false;
        this.notify();
        callbacks?.onError?.(error);
      });

      this.socket.io.on('reconnect_attempt', (attemptNumber) => {
        this._connecting = true;
        this.notify();
        callbacks?.onReconnectAttempt?.(attemptNumber);
      });

      this.socket.io.on('reconnect', () => {
        this._connecting = false;
        this.notify();
      });

      this.socket.io.on('reconnect_failed', () => {
        this._connecting = false;
        this.notify();
      });
    } else {
      // Socket exists but disconnected, reconnect
      this.socket.connect();
    }
  }

  disconnect(): void {
    // Don't disconnect in development to handle StrictMode
    // Only disconnect when explicitly requested
    if (this.socket) {
      this.socket.disconnect();
      this._connected = false;
      this._connecting = false;
      this.notify();
    }
  }

  emit<T>(event: string, payload?: T, correlationId?: string): void {
    if (this.socket?.connected) {
      // Include correlation ID in the payload wrapper for request/response matching
      const wrappedPayload = correlationId
        ? { ...payload as object, _correlationId: correlationId }
        : payload;
      this.socket.emit(event, wrappedPayload);
    }
  }

  on<T>(event: string, handler: (payload: T) => void): () => void {
    if (!this.socket) {
      return () => {};
    }
    this.socket.on(event, handler as (payload: unknown) => void);
    return () => {
      this.socket?.off(event, handler as (payload: unknown) => void);
    };
  }

  off(event: string, handler?: (payload: unknown) => void): void {
    if (handler) {
      this.socket?.off(event, handler);
    } else {
      this.socket?.off(event);
    }
  }
}

// Global manager instance
let managerInstance: SocketManager | null = null;

function getManager(url: string): SocketManager {
  if (!managerInstance) {
    managerInstance = SocketManager.getInstance(url);
  }
  return managerInstance;
}

export function useWebSocket(
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const {
    url = DEFAULT_WS_URL,
    autoConnect = true,
    onConnect,
    onDisconnect,
    onError,
    onReconnectAttempt,
  } = options;

  const managerRef = useRef<SocketManager | null>(null);

  // Initialize manager
  if (!managerRef.current) {
    managerRef.current = getManager(url);
  }
  const manager = managerRef.current;

  // Use refs for callbacks to avoid stale closures
  const callbacksRef = useRef({ onConnect, onDisconnect, onError, onReconnectAttempt });
  callbacksRef.current = { onConnect, onDisconnect, onError, onReconnectAttempt };

  const setConnectionStatus = useCanvasStore(
    (state) => state.setConnectionStatus
  );

  // Subscribe to manager state changes
  const [, forceUpdate] = useState({});
  useEffect(() => {
    return manager.subscribe(() => forceUpdate({}));
  }, [manager]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      manager.connect({
        onConnect: () => {
          setConnectionStatus('connected');
          callbacksRef.current.onConnect?.();
        },
        onDisconnect: (reason) => {
          setConnectionStatus('disconnected');
          callbacksRef.current.onDisconnect?.(reason);
        },
        onError: (error) => {
          setConnectionStatus('disconnected');
          callbacksRef.current.onError?.(error);
        },
        onReconnectAttempt: (attemptNumber) => {
          setConnectionStatus('connecting');
          callbacksRef.current.onReconnectAttempt?.(attemptNumber);
        },
      });
    }
  }, [autoConnect, manager, setConnectionStatus]);

  // Update connection status based on manager state
  useEffect(() => {
    if (manager.connected) {
      setConnectionStatus('connected');
    } else if (manager.connecting) {
      setConnectionStatus('connecting');
    } else {
      setConnectionStatus('disconnected');
    }
  }, [manager.connected, manager.connecting, setConnectionStatus]);

  const emit = useCallback(<T,>(event: string, payload?: T, correlationId?: string) => {
    manager.emit(event, payload, correlationId);
  }, [manager]);

  const on = useCallback(<T,>(event: string, handler: (payload: T) => void) => {
    return manager.on(event, handler);
  }, [manager]);

  const off = useCallback(
    (event: string, handler?: (payload: unknown) => void) => {
      manager.off(event, handler);
    },
    [manager]
  );

  const connect = useCallback(() => {
    manager.connect({
      onConnect: () => {
        setConnectionStatus('connected');
        callbacksRef.current.onConnect?.();
      },
      onDisconnect: (reason) => {
        setConnectionStatus('disconnected');
        callbacksRef.current.onDisconnect?.(reason);
      },
      onError: (error) => {
        setConnectionStatus('disconnected');
        callbacksRef.current.onError?.(error);
      },
      onReconnectAttempt: (attemptNumber) => {
        setConnectionStatus('connecting');
        callbacksRef.current.onReconnectAttempt?.(attemptNumber);
      },
    });
  }, [manager, setConnectionStatus]);

  const disconnect = useCallback(() => {
    manager.disconnect();
  }, [manager]);

  return {
    socket: manager.getSocket(),
    connected: manager.connected,
    connecting: manager.connecting,
    emit,
    on,
    off,
    connect,
    disconnect,
  };
}

// Re-export WS_EVENTS for convenience
export { WS_EVENTS };
