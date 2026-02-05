/**
 * Database Socket Hook
 *
 * Manages WebSocket communication for database operations.
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
  WS_EVENTS,
  DatabaseEngine,
  type DatabaseSchema,
  type QueryResult,
  type DatabaseTable,
} from '@masterdashboard/shared';

interface DatabaseConnectConfig {
  engine: DatabaseEngine;
  name: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database: string;
  ssl?: boolean;
}

interface UseDatabaseSocketOptions {
  projectId: string;
  onConnected?: (sessionId: string) => void;
  onDisconnected?: () => void;
  onQueryResult?: (result: QueryResult) => void;
  onSchemaLoaded?: (schema: DatabaseSchema) => void;
  onError?: (error: string) => void;
}

interface UseDatabaseSocketReturn {
  connected: boolean;
  socketReady: boolean;
  sessionId: string | null;
  connecting: boolean;
  querying: boolean;
  lastError: string | null;
  connect: (config: DatabaseConnectConfig) => void;
  disconnect: () => void;
  query: (sql: string, params?: unknown[], options?: QueryOptions) => void;
  getSchema: (schemaName?: string) => void;
  getTables: (schemaName?: string) => void;
  testConnection: (config: Omit<DatabaseConnectConfig, 'name'>) => Promise<TestConnectionResult>;
}

interface QueryOptions {
  limit?: number;
  offset?: number;
}

interface TestConnectionResult {
  success: boolean;
  error?: string;
  version?: string;
}

let requestIdCounter = 0;
function generateRequestId(): string {
  return `db_req_${Date.now()}_${++requestIdCounter}`;
}

export function useDatabaseSocket({
  projectId,
  onConnected,
  onDisconnected,
  onQueryResult,
  onSchemaLoaded,
  onError,
}: UseDatabaseSocketOptions): UseDatabaseSocketReturn {
  const { emit, on, connected: socketConnected } = useWebSocket();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [querying, setQuerying] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const testConnectionResolveRef = useRef<((result: TestConnectionResult) => void) | null>(null);

  // Set up event listeners
  useEffect(() => {
    const handleConnected = (payload: {
      sessionId: string;
      engine: DatabaseEngine;
      name: string;
      host?: string;
      port?: number;
      database: string;
      username?: string;
    }) => {
      setSessionId(payload.sessionId);
      setConnecting(false);
      setLastError(null);
      onConnected?.(payload.sessionId);
    };

    const handleDisconnected = (payload: { sessionId: string }) => {
      if (payload.sessionId === sessionId) {
        setSessionId(null);
        onDisconnected?.();
      }
    };

    const handleQueryResult = (payload: {
      sessionId: string;
      result: QueryResult;
      correlationId?: string;
    }) => {
      if (payload.sessionId === sessionId) {
        setQuerying(false);
        setLastError(null);
        onQueryResult?.(payload.result);
      }
    };

    const handleQueryError = (payload: {
      sessionId: string;
      error: string;
      query: string;
    }) => {
      if (payload.sessionId === sessionId) {
        setQuerying(false);
        setLastError(payload.error);
        onError?.(payload.error);
      }
    };

    const handleSchemaResponse = (payload: {
      sessionId: string;
      schema: DatabaseSchema;
    }) => {
      if (payload.sessionId === sessionId) {
        onSchemaLoaded?.(payload.schema);
      }
    };

    const handleTablesResponse = (payload: {
      sessionId: string;
      tables: DatabaseTable[];
    }) => {
      if (payload.sessionId === sessionId) {
        // Convert tables-only response to full schema
        onSchemaLoaded?.({ tables: payload.tables });
      }
    };

    const handleError = (payload: {
      sessionId?: string;
      error: string;
      code?: string;
    }) => {
      if (!payload.sessionId || payload.sessionId === sessionId) {
        setConnecting(false);
        setQuerying(false);
        setLastError(payload.error);
        onError?.(payload.error);
      }
    };

    const handleTestConnectionResponse = (payload: TestConnectionResult) => {
      if (testConnectionResolveRef.current) {
        testConnectionResolveRef.current(payload);
        testConnectionResolveRef.current = null;
      }
    };

    const unsubs = [
      on(WS_EVENTS.DATABASE_CONNECTED, handleConnected),
      on(WS_EVENTS.DATABASE_DISCONNECTED, handleDisconnected),
      on(WS_EVENTS.DATABASE_QUERY_RESULT, handleQueryResult),
      on(WS_EVENTS.DATABASE_QUERY_ERROR, handleQueryError),
      on(WS_EVENTS.DATABASE_SCHEMA_RESPONSE, handleSchemaResponse),
      on(WS_EVENTS.DATABASE_TABLES_RESPONSE, handleTablesResponse),
      on(WS_EVENTS.DATABASE_ERROR, handleError),
      on(WS_EVENTS.DATABASE_TEST_CONNECTION_RESPONSE, handleTestConnectionResponse),
    ];

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [on, sessionId, onConnected, onDisconnected, onQueryResult, onSchemaLoaded, onError]);

  const connect = useCallback(
    (config: DatabaseConnectConfig) => {
      if (!socketConnected) {
        onError?.('WebSocket not connected');
        return;
      }

      setConnecting(true);
      setLastError(null);

      emit(WS_EVENTS.DATABASE_CONNECT, {
        engine: config.engine,
        name: config.name,
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        database: config.database,
        projectId,
        ssl: config.ssl,
      });
    },
    [emit, socketConnected, projectId, onError]
  );

  const disconnect = useCallback(() => {
    if (!socketConnected || !sessionId) {
      return;
    }

    emit(WS_EVENTS.DATABASE_DISCONNECT, { sessionId });
    setSessionId(null);
  }, [emit, socketConnected, sessionId]);

  const query = useCallback(
    (sql: string, params?: unknown[], options?: QueryOptions) => {
      if (!socketConnected) {
        onError?.('WebSocket not connected');
        return;
      }

      if (!sessionId) {
        onError?.('Not connected to database');
        return;
      }

      const reqId = generateRequestId();
      requestIdRef.current = reqId;

      setQuerying(true);
      setLastError(null);

      emit(WS_EVENTS.DATABASE_QUERY, {
        sessionId,
        query: sql,
        params,
        limit: options?.limit,
        offset: options?.offset,
        _correlationId: reqId,
      });
    },
    [emit, socketConnected, sessionId, onError]
  );

  const getSchema = useCallback(
    (schemaName?: string) => {
      if (!socketConnected || !sessionId) {
        onError?.('Not connected to database');
        return;
      }

      emit(WS_EVENTS.DATABASE_SCHEMA, {
        sessionId,
        schema: schemaName,
      });
    },
    [emit, socketConnected, sessionId, onError]
  );

  const getTables = useCallback(
    (schemaName?: string) => {
      if (!socketConnected || !sessionId) {
        onError?.('Not connected to database');
        return;
      }

      emit(WS_EVENTS.DATABASE_TABLES, {
        sessionId,
        schema: schemaName,
      });
    },
    [emit, socketConnected, sessionId, onError]
  );

  const testConnection = useCallback(
    (config: Omit<DatabaseConnectConfig, 'name'>): Promise<TestConnectionResult> => {
      return new Promise((resolve) => {
        if (!socketConnected) {
          resolve({ success: false, error: 'WebSocket not connected' });
          return;
        }

        testConnectionResolveRef.current = resolve;

        // Set timeout for test connection
        setTimeout(() => {
          if (testConnectionResolveRef.current) {
            testConnectionResolveRef.current({ success: false, error: 'Connection test timed out' });
            testConnectionResolveRef.current = null;
          }
        }, 10000);

        emit(WS_EVENTS.DATABASE_TEST_CONNECTION, {
          engine: config.engine,
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
          database: config.database,
          ssl: config.ssl,
        });
      });
    },
    [emit, socketConnected]
  );

  return {
    connected: sessionId !== null,
    socketReady: socketConnected,
    sessionId,
    connecting,
    querying,
    lastError,
    connect,
    disconnect,
    query,
    getSchema,
    getTables,
    testConnection,
  };
}
