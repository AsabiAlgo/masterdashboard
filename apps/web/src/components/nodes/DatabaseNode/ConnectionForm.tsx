/**
 * Database Connection Form
 *
 * Form for entering database connection details.
 */

'use client';

import { useState, useCallback, memo } from 'react';
import {
  DatabaseEngine,
  DEFAULT_DATABASE_PORTS,
} from '@masterdashboard/shared';

interface ConnectionFormProps {
  onConnect: (config: ConnectionConfig) => void;
  onTestConnection: (config: Omit<ConnectionConfig, 'name'>) => Promise<TestResult>;
  loading?: boolean;
  error?: string | null;
  /** Initial values from saved node data */
  initialConfig?: Partial<ConnectionConfig>;
}

export interface ConnectionConfig {
  engine: DatabaseEngine;
  name: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database: string;
  ssl?: boolean;
}

interface TestResult {
  success: boolean;
  error?: string;
  version?: string;
}

export const ConnectionForm = memo(function ConnectionForm({
  onConnect,
  onTestConnection,
  loading = false,
  error,
  initialConfig,
}: ConnectionFormProps) {
  const initialEngine = initialConfig?.engine ?? DatabaseEngine.POSTGRESQL;
  const [engine, setEngine] = useState<DatabaseEngine>(initialEngine);
  const [name, setName] = useState(initialConfig?.name ?? '');
  const [host, setHost] = useState(initialConfig?.host ?? 'localhost');
  const [port, setPort] = useState(initialConfig?.port ?? DEFAULT_DATABASE_PORTS[initialEngine]);
  const [username, setUsername] = useState(initialConfig?.username ?? '');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState(initialConfig?.database ?? '');
  const [ssl, setSsl] = useState(initialConfig?.ssl ?? false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const isSQLite = engine === DatabaseEngine.SQLITE;

  const handleEngineChange = useCallback((newEngine: DatabaseEngine) => {
    setEngine(newEngine);
    setPort(DEFAULT_DATABASE_PORTS[newEngine]);
    setTestResult(null);
  }, []);

  const handleTestConnection = useCallback(async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const result = await onTestConnection({
        engine,
        host: isSQLite ? undefined : host,
        port: isSQLite ? undefined : port,
        username: isSQLite ? undefined : username,
        password: isSQLite ? undefined : password,
        database,
        ssl: isSQLite ? undefined : ssl,
      });
      setTestResult(result);
    } catch {
      setTestResult({ success: false, error: 'Test failed' });
    } finally {
      setTesting(false);
    }
  }, [engine, host, port, username, password, database, ssl, isSQLite, onTestConnection]);

  const handleConnect = useCallback(() => {
    const connectionName = name || `${engine} - ${database}`;

    onConnect({
      engine,
      name: connectionName,
      host: isSQLite ? undefined : host,
      port: isSQLite ? undefined : port,
      username: isSQLite ? undefined : username,
      password: isSQLite ? undefined : password,
      database,
      ssl: isSQLite ? undefined : ssl,
    });
  }, [engine, name, host, port, username, password, database, ssl, isSQLite, onConnect]);

  const isValid = database.trim().length > 0 && (isSQLite || (host.trim().length > 0 && username.trim().length > 0));

  return (
    <div className="p-4 space-y-4 h-full overflow-auto nodrag nopan nowheel">
      <h3 className="text-lg font-semibold text-white">Connect to Database</h3>

      {/* Engine Selection */}
      <div className="space-y-1">
        <label className="block text-sm text-slate-400">Database Type</label>
        <select
          value={engine}
          onChange={(e) => handleEngineChange(e.target.value as DatabaseEngine)}
          className="w-full px-3 py-2 bg-slate-800 text-white rounded border border-slate-600 focus:border-cyan-500 focus:outline-none"
          disabled={loading}
        >
          <option value={DatabaseEngine.POSTGRESQL}>PostgreSQL</option>
          <option value={DatabaseEngine.MYSQL}>MySQL</option>
          <option value={DatabaseEngine.SQLITE}>SQLite</option>
        </select>
      </div>

      {/* Connection Name (optional) */}
      <div className="space-y-1">
        <label className="block text-sm text-slate-400">Connection Name (optional)</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Database"
          className="w-full px-3 py-2 bg-slate-800 text-white rounded border border-slate-600 focus:border-cyan-500 focus:outline-none"
          disabled={loading}
        />
      </div>

      {/* Host/Port (not for SQLite) */}
      {!isSQLite && (
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 space-y-1">
            <label className="block text-sm text-slate-400">Host</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="localhost"
              className="w-full px-3 py-2 bg-slate-800 text-white rounded border border-slate-600 focus:border-cyan-500 focus:outline-none"
              disabled={loading}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm text-slate-400">Port</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-800 text-white rounded border border-slate-600 focus:border-cyan-500 focus:outline-none"
              disabled={loading}
            />
          </div>
        </div>
      )}

      {/* Username/Password (not for SQLite) */}
      {!isSQLite && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="block text-sm text-slate-400">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="postgres"
              className="w-full px-3 py-2 bg-slate-800 text-white rounded border border-slate-600 focus:border-cyan-500 focus:outline-none"
              disabled={loading}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm text-slate-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 text-white rounded border border-slate-600 focus:border-cyan-500 focus:outline-none"
              disabled={loading}
            />
          </div>
        </div>
      )}

      {/* Database Name/Path */}
      <div className="space-y-1">
        <label className="block text-sm text-slate-400">
          {isSQLite ? 'Database File Path' : 'Database Name'}
        </label>
        <input
          type="text"
          value={database}
          onChange={(e) => setDatabase(e.target.value)}
          placeholder={isSQLite ? '/path/to/database.db or :memory:' : 'mydatabase'}
          className="w-full px-3 py-2 bg-slate-800 text-white rounded border border-slate-600 focus:border-cyan-500 focus:outline-none"
          disabled={loading}
        />
      </div>

      {/* SSL Option (not for SQLite) */}
      {!isSQLite && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="ssl"
            checked={ssl}
            onChange={(e) => setSsl(e.target.checked)}
            className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-cyan-500 focus:ring-cyan-500"
            disabled={loading}
          />
          <label htmlFor="ssl" className="text-sm text-slate-400">
            Use SSL/TLS
          </label>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Test Result */}
      {testResult && (
        <div className={`p-3 rounded text-sm ${
          testResult.success
            ? 'bg-green-500/20 border border-green-500/50 text-green-400'
            : 'bg-red-500/20 border border-red-500/50 text-red-400'
        }`}>
          {testResult.success ? (
            <>
              <span className="font-medium">Connection successful!</span>
              {testResult.version && (
                <span className="block text-xs mt-1 opacity-80">
                  Version: {testResult.version}
                </span>
              )}
            </>
          ) : (
            testResult.error
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleTestConnection}
          disabled={!isValid || loading || testing}
          className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded transition-colors"
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
        <button
          onClick={handleConnect}
          disabled={!isValid || loading}
          className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded transition-colors font-medium"
        >
          {loading ? 'Connecting...' : 'Connect'}
        </button>
      </div>
    </div>
  );
});
