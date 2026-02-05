/**
 * Database Node Component
 *
 * Node for connecting to databases, running queries, and viewing results.
 */

'use client';

import { memo, useCallback, useState, useEffect } from 'react';
import { type NodeProps, NodeResizer } from '@xyflow/react';
import type { DatabaseNodeData, DatabaseSchema, QueryResult, QueryHistoryEntry } from '@masterdashboard/shared';
import { BaseNode } from '../BaseNode';
import { ConnectionForm, type ConnectionConfig } from './ConnectionForm';
import { QueryEditor } from './QueryEditor';
import { ResultsTable } from './ResultsTable';
import { SchemaExplorer } from './SchemaExplorer';
import { useDatabaseSocket } from './hooks/useDatabaseSocket';
import { useCanvasStore } from '@/stores/canvas-store';

interface DatabaseNodeProps extends NodeProps {
  data: DatabaseNodeData;
}

export const DatabaseNode = memo(function DatabaseNode({
  id,
  data,
  selected,
}: DatabaseNodeProps) {
  const { updateNodeData } = useCanvasStore();

  const [query, setQuery] = useState(data.query || '');
  const [results, setResults] = useState<QueryResult | null>(data.results);
  const [schema, setSchema] = useState<DatabaseSchema | null>(data.schema);
  const [showSchema, setShowSchema] = useState(data.showSchema ?? true);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryEntry[]>(data.queryHistory || []);
  const [error, setError] = useState<string | null>(data.error);

  // Database socket hook
  const {
    connected,
    connecting,
    querying,
    lastError,
    connect,
    disconnect,
    query: executeQuery,
    getSchema,
    testConnection,
  } = useDatabaseSocket({
    projectId: data.projectId,
    onConnected: (sessionId) => {
      updateNodeData<DatabaseNodeData>(id, {
        sessionId,
        connected: true,
        error: null,
      });
      // Load schema on connect
      setTimeout(() => getSchema(), 100);
    },
    onDisconnected: () => {
      updateNodeData<DatabaseNodeData>(id, {
        sessionId: '',
        connected: false,
      });
      setResults(null);
      setSchema(null);
    },
    onQueryResult: (result) => {
      setResults(result);
      setError(null);
      // Add to history
      const historyEntry: QueryHistoryEntry = {
        id: `qh_${Date.now()}`,
        query,
        executedAt: new Date().toISOString(),
        executionTime: result.executionTime,
        rowCount: result.rowCount,
        success: true,
      };
      setQueryHistory((prev) => [historyEntry, ...prev.slice(0, 49)]);
    },
    onSchemaLoaded: (loadedSchema) => {
      setSchema(loadedSchema);
    },
    onError: (err) => {
      setError(err);
      // Add failed query to history
      if (querying) {
        const historyEntry: QueryHistoryEntry = {
          id: `qh_${Date.now()}`,
          query,
          executedAt: new Date().toISOString(),
          executionTime: 0,
          rowCount: 0,
          success: false,
          error: err,
        };
        setQueryHistory((prev) => [historyEntry, ...prev.slice(0, 49)]);
      }
    },
  });

  // Sync state to node data
  useEffect(() => {
    updateNodeData<DatabaseNodeData>(id, {
      query,
      results,
      schema,
      showSchema,
      queryHistory,
      error,
      loading: querying,
    });
  }, [id, query, results, schema, showSchema, queryHistory, error, querying, updateNodeData]);

  const handleConnect = useCallback(
    (config: ConnectionConfig) => {
      updateNodeData<DatabaseNodeData>(id, {
        engine: config.engine,
        connectionName: config.name,
        host: config.host ?? '',
        port: config.port ?? 0,
        database: config.database,
        username: config.username ?? '',
      });
      connect(config);
    },
    [id, connect, updateNodeData]
  );

  const handleDisconnect = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const handleExecuteQuery = useCallback(() => {
    if (query.trim()) {
      executeQuery(query);
    }
  }, [query, executeQuery]);

  const handleInsertTableName = useCallback(
    (tableName: string) => {
      setQuery((prev) => {
        if (!prev.trim()) {
          return `SELECT * FROM ${tableName} LIMIT 100;`;
        }
        return `${prev}\n${tableName}`;
      });
    },
    []
  );

  const handleInsertColumnName = useCallback(
    (tableName: string, columnName: string) => {
      setQuery((prev) => {
        if (!prev.trim()) {
          return `SELECT ${columnName} FROM ${tableName} LIMIT 100;`;
        }
        return `${prev}${columnName}`;
      });
    },
    []
  );

  const handleRefreshSchema = useCallback(() => {
    if (connected) {
      getSchema();
    }
  }, [connected, getSchema]);

  // Status indicator based on connection state
  const statusIndicator = (
    <span
      className={`w-2 h-2 rounded-full flex-shrink-0 ${
        connected
          ? 'bg-green-500'
          : connecting
          ? 'bg-yellow-500 animate-pulse'
          : 'bg-slate-500'
      }`}
      title={connected ? 'Connected' : connecting ? 'Connecting...' : 'Disconnected'}
    />
  );

  // Header actions
  const headerActions = connected ? (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setShowSchema(!showSchema)}
        className={`p-1 rounded transition-colors ${
          showSchema ? 'bg-cyan-600/50 text-cyan-300' : 'hover:bg-black/20 text-white/70'
        }`}
        title={showSchema ? 'Hide schema' : 'Show schema'}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      </button>
      <button
        onClick={handleDisconnect}
        className="p-1 hover:bg-black/20 rounded transition-colors"
        title="Disconnect"
      >
        <svg className="w-3.5 h-3.5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>
  ) : null;

  return (
    <>
      <NodeResizer
        minWidth={400}
        minHeight={300}
        isVisible={selected}
        lineClassName="!border-cyan-500"
        handleClassName="!w-2 !h-2 !bg-cyan-500 !border-cyan-600"
      />
      <BaseNode
        id={id}
        title={connected ? data.connectionName || 'Database' : 'Database'}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
        }
        headerColor={connected ? 'bg-cyan-700' : 'bg-slate-700'}
        connected={connected}
        selected={selected}
        statusIndicator={statusIndicator}
        headerActions={headerActions}
      >
        <div className="flex flex-col h-full">
          {!connected ? (
            <ConnectionForm
              onConnect={handleConnect}
              onTestConnection={testConnection}
              loading={connecting}
              error={lastError}
              initialConfig={{
                engine: data.engine,
                name: data.connectionName,
                host: data.host,
                port: data.port,
                database: data.database,
                username: data.username,
              }}
            />
          ) : (
            <div className="flex flex-1 overflow-hidden nodrag nopan nowheel">
              {/* Schema Explorer */}
              {showSchema && (
                <div className="w-56 flex-shrink-0">
                  <SchemaExplorer
                    schema={schema}
                    loading={!schema && connected}
                    onRefresh={handleRefreshSchema}
                    onTableClick={handleInsertTableName}
                    onColumnClick={handleInsertColumnName}
                  />
                </div>
              )}

              {/* Query/Results Panel */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Query Editor */}
                <QueryEditor
                  value={query}
                  onChange={setQuery}
                  onExecute={handleExecuteQuery}
                  disabled={!connected}
                  executing={querying}
                  history={queryHistory}
                  onSelectHistory={setQuery}
                />

                {/* Results Table */}
                <ResultsTable
                  results={results}
                  loading={querying}
                  error={error}
                />
              </div>
            </div>
          )}
        </div>
      </BaseNode>
    </>
  );
});
