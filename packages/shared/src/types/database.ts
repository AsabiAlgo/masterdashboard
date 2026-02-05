/**
 * Database Types
 *
 * Types for database connections, queries, and schema inspection.
 * Supports PostgreSQL, MySQL, and SQLite.
 */

import type { BaseSession, SessionType, SessionStatus } from './session.js';

/**
 * Supported database engines
 */
export enum DatabaseEngine {
  POSTGRESQL = 'postgresql',
  MYSQL = 'mysql',
  SQLITE = 'sqlite',
}

/**
 * Database connection status
 */
export enum DatabaseConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  /** Database engine type */
  engine: DatabaseEngine;
  /** Connection name for display */
  name: string;
  /** Host address (not used for SQLite) */
  host?: string;
  /** Port number (not used for SQLite) */
  port?: number;
  /** Username (not used for SQLite) */
  username?: string;
  /** Password - never stored, only used for connection (not used for SQLite) */
  password?: string;
  /** Database name or file path for SQLite */
  database: string;
  /** Project this connection belongs to */
  projectId: string;
  /** Connection timeout in milliseconds */
  connectionTimeout?: number;
  /** Query timeout in milliseconds */
  queryTimeout?: number;
  /** Use SSL/TLS for connection */
  ssl?: boolean;
}

/**
 * Database session extending base session
 */
export interface DatabaseSession extends BaseSession {
  readonly type: SessionType;
  /** Database engine */
  engine: DatabaseEngine;
  /** Connection name */
  name: string;
  /** Host (redacted for display) */
  host?: string;
  /** Port */
  port?: number;
  /** Database name/path */
  database: string;
  /** Username (redacted for display) */
  username?: string;
  /** Connection status */
  connectionStatus: DatabaseConnectionStatus;
}

/**
 * Serializable database session for WebSocket transport
 */
export interface SerializedDatabaseSession {
  readonly id: string;
  readonly type: SessionType;
  status: SessionStatus;
  readonly projectId: string;
  readonly createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
  engine: DatabaseEngine;
  name: string;
  host?: string;
  port?: number;
  database: string;
  username?: string;
  connectionStatus: DatabaseConnectionStatus;
}

/**
 * Column information from database schema
 */
export interface DatabaseColumn {
  /** Column name */
  name: string;
  /** Column data type */
  type: string;
  /** Whether column allows null values */
  nullable: boolean;
  /** Whether column is a primary key */
  primaryKey: boolean;
  /** Default value if any */
  defaultValue?: string;
  /** Whether column is auto-increment/serial */
  autoIncrement?: boolean;
  /** Foreign key reference if any */
  foreignKey?: {
    table: string;
    column: string;
  };
}

/**
 * Table information from database schema
 */
export interface DatabaseTable {
  /** Table name */
  name: string;
  /** Schema name (PostgreSQL/MySQL) */
  schema?: string;
  /** Table columns */
  columns: DatabaseColumn[];
  /** Approximate row count */
  rowCount?: number;
  /** Table type (table, view, etc.) */
  type: 'table' | 'view' | 'materialized_view';
}

/**
 * Index information
 */
export interface DatabaseIndex {
  /** Index name */
  name: string;
  /** Indexed columns */
  columns: string[];
  /** Whether index is unique */
  unique: boolean;
  /** Whether this is the primary key index */
  primary: boolean;
}

/**
 * Complete database schema
 */
export interface DatabaseSchema {
  /** Tables in the database */
  tables: DatabaseTable[];
  /** Views in the database */
  views?: DatabaseTable[];
  /** Available schemas (PostgreSQL) */
  schemas?: string[];
}

/**
 * Query result from database
 */
export interface QueryResult {
  /** Column names in order */
  columns: string[];
  /** Column types */
  columnTypes?: string[];
  /** Result rows as array of records */
  rows: Record<string, unknown>[];
  /** Number of rows returned */
  rowCount: number;
  /** Number of rows affected (for INSERT/UPDATE/DELETE) */
  affectedRows?: number;
  /** Query execution time in milliseconds */
  executionTime: number;
  /** Whether results were truncated */
  truncated?: boolean;
  /** Total available rows if truncated */
  totalRows?: number;
}

/**
 * Query history entry
 */
export interface QueryHistoryEntry {
  /** Unique identifier */
  id: string;
  /** SQL query text */
  query: string;
  /** When query was executed */
  executedAt: string;
  /** Execution time in ms */
  executionTime: number;
  /** Number of rows returned/affected */
  rowCount: number;
  /** Whether query succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Database node viewport configuration
 */
export interface DatabaseViewport {
  /** Height of results panel */
  resultsHeight: number;
  /** Width of schema explorer */
  schemaWidth: number;
  /** Whether schema explorer is visible */
  showSchema: boolean;
}

/**
 * Default database viewport settings
 */
export const DEFAULT_DATABASE_VIEWPORT: Readonly<DatabaseViewport> = {
  resultsHeight: 300,
  schemaWidth: 250,
  showSchema: true,
} as const;

/**
 * Default ports for database engines
 */
export const DEFAULT_DATABASE_PORTS: Readonly<Record<DatabaseEngine, number>> = {
  [DatabaseEngine.POSTGRESQL]: 5432,
  [DatabaseEngine.MYSQL]: 3306,
  [DatabaseEngine.SQLITE]: 0, // Not applicable
} as const;

/**
 * Query limits for safety
 */
export const DATABASE_QUERY_LIMITS = {
  /** Maximum rows to return in a single query */
  MAX_ROWS: 10000,
  /** Default rows to return */
  DEFAULT_ROWS: 1000,
  /** Maximum query execution time in ms */
  MAX_QUERY_TIMEOUT: 30000,
  /** Default query timeout in ms */
  DEFAULT_QUERY_TIMEOUT: 10000,
  /** Maximum connection timeout in ms */
  MAX_CONNECTION_TIMEOUT: 10000,
  /** Default connection timeout in ms */
  DEFAULT_CONNECTION_TIMEOUT: 5000,
} as const;
