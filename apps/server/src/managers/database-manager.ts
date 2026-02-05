/**
 * Database Manager
 *
 * Manages database connections for PostgreSQL, MySQL, and SQLite.
 * Provides connection pooling, query execution, and schema inspection.
 */

import { EventEmitter } from 'events';
import {
  DatabaseEngine,
  DatabaseConnectionStatus,
  type DatabaseConfig,
  type DatabaseSession,
  type DatabaseSchema,
  type DatabaseTable,
  type DatabaseColumn,
  type QueryResult,
  SessionType,
  SessionStatus,
  DATABASE_QUERY_LIMITS,
  DEFAULT_DATABASE_PORTS,
} from '@masterdashboard/shared';
import { createChildLogger } from '../utils/logger.js';
import Database from 'better-sqlite3';

// Dynamic imports for database drivers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pgModule: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mysqlModule: any;

const logger = createChildLogger('database-manager');

/**
 * Generate a unique database session ID
 */
function createDatabaseId(): string {
  return `db-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Internal structure for a managed database connection
 */
interface ManagedDatabase {
  session: DatabaseSession;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pool: any; // pg.Pool | mysql.Pool | Database
  config: DatabaseConfig;
  createdAt: Date;
}

/**
 * Database Manager events
 */
export interface DatabaseManagerEvents {
  connected: { sessionId: string; engine: DatabaseEngine; database: string };
  disconnected: { sessionId: string };
  error: { sessionId?: string; error: string; code?: string };
  queryResult: { sessionId: string; result: QueryResult };
  queryError: { sessionId: string; error: string; query: string };
}

export class DatabaseManager extends EventEmitter {
  private connections = new Map<string, ManagedDatabase>();

  constructor() {
    super();
    logger.info('Database manager initialized');
  }

  /**
   * Connect to a database
   */
  async connect(config: DatabaseConfig): Promise<DatabaseSession> {
    const sessionId = createDatabaseId();

    logger.info(
      {
        sessionId,
        engine: config.engine,
        host: config.host,
        database: config.database,
      },
      'Connecting to database'
    );

    const now = new Date();
    const session: DatabaseSession = {
      id: sessionId,
      type: SessionType.SSH, // Reusing SSH as it's closest, should add DATABASE to SessionType
      status: SessionStatus.ACTIVE,
      projectId: config.projectId,
      engine: config.engine,
      name: config.name,
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      connectionStatus: DatabaseConnectionStatus.CONNECTING,
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let pool: any;

      switch (config.engine) {
        case DatabaseEngine.POSTGRESQL:
          pool = await this.connectPostgres(config);
          break;

        case DatabaseEngine.MYSQL:
          pool = await this.connectMySQL(config);
          break;

        case DatabaseEngine.SQLITE:
          pool = this.connectSQLite(config);
          break;

        default:
          throw new Error(`Unsupported database engine: ${config.engine}`);
      }

      // Store the connection
      const managed: ManagedDatabase = {
        session: { ...session, connectionStatus: DatabaseConnectionStatus.CONNECTED },
        pool,
        config: { ...config, password: undefined }, // Don't store password
        createdAt: now,
      };

      this.connections.set(sessionId, managed);

      logger.info({ sessionId, engine: config.engine }, 'Database connected');

      this.emit('connected', {
        sessionId,
        engine: config.engine,
        database: config.database,
      });

      return managed.session;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      logger.error({ sessionId, error: message }, 'Database connection failed');

      this.emit('error', {
        sessionId,
        error: message,
        code: 'CONNECTION_FAILED',
      });

      throw error;
    }
  }

  /**
   * Connect to PostgreSQL
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async connectPostgres(config: DatabaseConfig): Promise<any> {
    if (!pgModule) {
      pgModule = await import('pg');
    }

    const { Pool } = pgModule;
    const pool = new Pool({
      host: config.host,
      port: config.port ?? DEFAULT_DATABASE_PORTS[DatabaseEngine.POSTGRESQL],
      user: config.username,
      password: config.password,
      database: config.database,
      max: 5,
      connectionTimeoutMillis: config.connectionTimeout ?? DATABASE_QUERY_LIMITS.DEFAULT_CONNECTION_TIMEOUT,
      idleTimeoutMillis: 30000,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    });

    // Test connection
    await pool.query('SELECT 1');
    return pool;
  }

  /**
   * Connect to MySQL
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async connectMySQL(config: DatabaseConfig): Promise<any> {
    if (!mysqlModule) {
      mysqlModule = await import('mysql2/promise');
    }

    const pool = mysqlModule.createPool({
      host: config.host,
      port: config.port ?? DEFAULT_DATABASE_PORTS[DatabaseEngine.MYSQL],
      user: config.username,
      password: config.password,
      database: config.database,
      connectionLimit: 5,
      connectTimeout: config.connectionTimeout ?? DATABASE_QUERY_LIMITS.DEFAULT_CONNECTION_TIMEOUT,
      waitForConnections: true,
      queueLimit: 0,
    });

    // Test connection
    await pool.query('SELECT 1');
    return pool;
  }

  /**
   * Connect to SQLite
   */
  private connectSQLite(config: DatabaseConfig): Database.Database {
    const db = new Database(config.database, {
      readonly: false,
      fileMustExist: config.database !== ':memory:',
    });

    // Enable WAL mode for better concurrent access
    if (config.database !== ':memory:') {
      db.pragma('journal_mode = WAL');
    }

    return db;
  }

  /**
   * Disconnect from a database
   */
  async disconnect(sessionId: string): Promise<void> {
    const managed = this.connections.get(sessionId);
    if (!managed) {
      logger.warn({ sessionId }, 'Database connection not found');
      return;
    }

    logger.info({ sessionId, engine: managed.config.engine }, 'Disconnecting from database');

    try {
      switch (managed.config.engine) {
        case DatabaseEngine.POSTGRESQL:
          await managed.pool.end();
          break;

        case DatabaseEngine.MYSQL:
          await managed.pool.end();
          break;

        case DatabaseEngine.SQLITE:
          (managed.pool as Database.Database).close();
          break;
      }

      this.connections.delete(sessionId);
      this.emit('disconnected', { sessionId });

      logger.info({ sessionId }, 'Database disconnected');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Disconnect failed';
      logger.error({ sessionId, error: message }, 'Database disconnect error');
      throw error;
    }
  }

  /**
   * Execute a query
   */
  async query(
    sessionId: string,
    sql: string,
    params?: unknown[],
    options?: { limit?: number; offset?: number }
  ): Promise<QueryResult> {
    const managed = this.connections.get(sessionId);
    if (!managed) {
      throw new Error('Connection not found');
    }

    const startTime = Date.now();
    const limit = Math.min(
      options?.limit ?? DATABASE_QUERY_LIMITS.DEFAULT_ROWS,
      DATABASE_QUERY_LIMITS.MAX_ROWS
    );

    logger.debug({ sessionId, sql: sql.substring(0, 100) }, 'Executing query');

    try {
      let result: QueryResult;

      switch (managed.config.engine) {
        case DatabaseEngine.POSTGRESQL:
          result = await this.queryPostgres(managed.pool, sql, params, limit, options?.offset);
          break;

        case DatabaseEngine.MYSQL:
          result = await this.queryMySQL(managed.pool, sql, params, limit, options?.offset);
          break;

        case DatabaseEngine.SQLITE:
          result = this.querySQLite(managed.pool as Database.Database, sql, params, limit, options?.offset);
          break;

        default:
          throw new Error(`Unsupported engine: ${managed.config.engine}`);
      }

      result.executionTime = Date.now() - startTime;

      // Update last active time
      managed.session.lastActiveAt = new Date();

      this.emit('queryResult', { sessionId, result });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Query failed';
      logger.error({ sessionId, error: message, sql: sql.substring(0, 100) }, 'Query error');

      this.emit('queryError', { sessionId, error: message, query: sql });

      throw error;
    }
  }

  /**
   * Execute PostgreSQL query
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async queryPostgres(
    pool: any,
    sql: string,
    params?: unknown[],
    limit?: number,
    offset?: number
  ): Promise<QueryResult> {
    // Add LIMIT/OFFSET for SELECT queries if not already present
    let modifiedSql = sql;
    const isSelect = sql.trim().toLowerCase().startsWith('select');

    if (isSelect && limit && !sql.toLowerCase().includes('limit')) {
      modifiedSql = `${sql} LIMIT ${limit}`;
      if (offset) {
        modifiedSql = `${modifiedSql} OFFSET ${offset}`;
      }
    }

    const result = await pool.query(modifiedSql, params);

    return {
      columns: result.fields?.map((f: { name: string }) => f.name) ?? [],
      columnTypes: result.fields?.map((f: { dataTypeID: number }) => String(f.dataTypeID)) ?? [],
      rows: result.rows ?? [],
      rowCount: result.rows?.length ?? 0,
      affectedRows: result.rowCount ?? undefined,
      executionTime: 0,
    };
  }

  /**
   * Execute MySQL query
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async queryMySQL(
    pool: any,
    sql: string,
    params?: unknown[],
    limit?: number,
    offset?: number
  ): Promise<QueryResult> {
    // Add LIMIT/OFFSET for SELECT queries if not already present
    let modifiedSql = sql;
    const isSelect = sql.trim().toLowerCase().startsWith('select');

    if (isSelect && limit && !sql.toLowerCase().includes('limit')) {
      modifiedSql = `${sql} LIMIT ${limit}`;
      if (offset) {
        modifiedSql = `${modifiedSql} OFFSET ${offset}`;
      }
    }

    const [rows, fields] = await pool.query(modifiedSql, params);

    // Handle INSERT/UPDATE/DELETE which return OkPacket
    if (!Array.isArray(rows)) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        affectedRows: rows.affectedRows,
        executionTime: 0,
      };
    }

    return {
      columns: fields?.map((f: { name: string }) => f.name) ?? [],
      columnTypes: fields?.map((f: { type: number }) => String(f.type)) ?? [],
      rows: rows as Record<string, unknown>[],
      rowCount: rows.length,
      executionTime: 0,
    };
  }

  /**
   * Execute SQLite query
   */
  private querySQLite(
    db: Database.Database,
    sql: string,
    params?: unknown[],
    limit?: number,
    offset?: number
  ): QueryResult {
    // Add LIMIT/OFFSET for SELECT queries if not already present
    let modifiedSql = sql;
    const isSelect = sql.trim().toLowerCase().startsWith('select');

    if (isSelect && limit && !sql.toLowerCase().includes('limit')) {
      modifiedSql = `${sql} LIMIT ${limit}`;
      if (offset) {
        modifiedSql = `${modifiedSql} OFFSET ${offset}`;
      }
    }

    const stmt = db.prepare(modifiedSql);

    // Check if this is a SELECT query
    if (isSelect) {
      const rows = params ? stmt.all(...params) : stmt.all();
      const columns = stmt.columns().map(c => c.name);
      const columnTypes = stmt.columns().map(c => c.type ?? 'unknown');

      return {
        columns,
        columnTypes,
        rows: rows as Record<string, unknown>[],
        rowCount: rows.length,
        executionTime: 0,
      };
    } else {
      // For INSERT/UPDATE/DELETE
      const info = params ? stmt.run(...params) : stmt.run();

      return {
        columns: [],
        rows: [],
        rowCount: 0,
        affectedRows: info.changes,
        executionTime: 0,
      };
    }
  }

  /**
   * Get database schema
   */
  async getSchema(sessionId: string, schemaName?: string): Promise<DatabaseSchema> {
    const managed = this.connections.get(sessionId);
    if (!managed) {
      throw new Error('Connection not found');
    }

    logger.debug({ sessionId, schemaName }, 'Getting database schema');

    switch (managed.config.engine) {
      case DatabaseEngine.POSTGRESQL:
        return this.getPostgresSchema(managed.pool, schemaName);

      case DatabaseEngine.MYSQL:
        return this.getMySQLSchema(managed.pool);

      case DatabaseEngine.SQLITE:
        return this.getSQLiteSchema(managed.pool as Database.Database);

      default:
        throw new Error(`Unsupported engine: ${managed.config.engine}`);
    }
  }

  /**
   * Get PostgreSQL schema
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async getPostgresSchema(pool: any, schemaName?: string): Promise<DatabaseSchema> {
    const schema = schemaName ?? 'public';

    // Get tables
    const tablesResult = await pool.query(`
      SELECT
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_schema = $1
      ORDER BY table_name
    `, [schema]);

    const tables: DatabaseTable[] = [];

    for (const row of tablesResult.rows) {
      const columns = await this.getPostgresColumns(pool, schema, row.table_name);
      tables.push({
        name: row.table_name,
        schema,
        columns,
        type: row.table_type === 'VIEW' ? 'view' : 'table',
      });
    }

    // Get available schemas
    const schemasResult = await pool.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schema_name
    `);

    return {
      tables,
      schemas: schemasResult.rows.map((r: { schema_name: string }) => r.schema_name),
    };
  }

  /**
   * Get PostgreSQL columns for a table
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async getPostgresColumns(pool: any, schema: string, tableName: string): Promise<DatabaseColumn[]> {
    const result = await pool.query(`
      SELECT
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name
        WHERE tc.table_schema = $1
          AND tc.table_name = $2
          AND tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.column_name = pk.column_name
      WHERE c.table_schema = $1 AND c.table_name = $2
      ORDER BY c.ordinal_position
    `, [schema, tableName]);

    return result.rows.map((row: {
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
      is_primary: boolean;
    }) => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
      primaryKey: row.is_primary,
      defaultValue: row.column_default ?? undefined,
    }));
  }

  /**
   * Get MySQL schema
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async getMySQLSchema(pool: any): Promise<DatabaseSchema> {
    // Get tables
    const [tablesRows] = await pool.query(`
      SELECT
        TABLE_NAME as table_name,
        TABLE_TYPE as table_type
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME
    `);

    const tables: DatabaseTable[] = [];

    for (const row of tablesRows as { table_name: string; table_type: string }[]) {
      const columns = await this.getMySQLColumns(pool, row.table_name);
      tables.push({
        name: row.table_name,
        columns,
        type: row.table_type === 'VIEW' ? 'view' : 'table',
      });
    }

    return { tables };
  }

  /**
   * Get MySQL columns for a table
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async getMySQLColumns(pool: any, tableName: string): Promise<DatabaseColumn[]> {
    const [rows] = await pool.query(`
      SELECT
        COLUMN_NAME as column_name,
        DATA_TYPE as data_type,
        IS_NULLABLE as is_nullable,
        COLUMN_DEFAULT as column_default,
        COLUMN_KEY as column_key,
        EXTRA as extra
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [tableName]);

    return (rows as {
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
      column_key: string;
      extra: string;
    }[]).map(row => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
      primaryKey: row.column_key === 'PRI',
      defaultValue: row.column_default ?? undefined,
      autoIncrement: row.extra.includes('auto_increment'),
    }));
  }

  /**
   * Get SQLite schema
   */
  private getSQLiteSchema(db: Database.Database): DatabaseSchema {
    // Get tables and views
    const tablesStmt = db.prepare(`
      SELECT name, type
      FROM sqlite_master
      WHERE type IN ('table', 'view')
        AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);

    const tablesRows = tablesStmt.all() as { name: string; type: string }[];
    const tables: DatabaseTable[] = [];

    for (const row of tablesRows) {
      const columns = this.getSQLiteColumns(db, row.name);
      tables.push({
        name: row.name,
        columns,
        type: row.type === 'view' ? 'view' : 'table',
      });
    }

    return { tables };
  }

  /**
   * Get SQLite columns for a table
   */
  private getSQLiteColumns(db: Database.Database, tableName: string): DatabaseColumn[] {
    const stmt = db.prepare(`PRAGMA table_info("${tableName}")`);
    const rows = stmt.all() as {
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
      pk: number;
    }[];

    return rows.map(row => ({
      name: row.name,
      type: row.type,
      nullable: row.notnull === 0,
      primaryKey: row.pk > 0,
      defaultValue: row.dflt_value ?? undefined,
    }));
  }

  /**
   * Test a database connection without persisting it
   */
  async testConnection(config: DatabaseConfig): Promise<{ success: boolean; error?: string; version?: string }> {
    logger.debug({ engine: config.engine, host: config.host }, 'Testing database connection');

    try {
      let version: string | undefined;

      switch (config.engine) {
        case DatabaseEngine.POSTGRESQL: {
          if (!pgModule) {
            pgModule = await import('pg');
          }
          const { Client } = pgModule;
          const client = new Client({
            host: config.host,
            port: config.port ?? DEFAULT_DATABASE_PORTS[DatabaseEngine.POSTGRESQL],
            user: config.username,
            password: config.password,
            database: config.database,
            connectionTimeoutMillis: config.connectionTimeout ?? DATABASE_QUERY_LIMITS.DEFAULT_CONNECTION_TIMEOUT,
            ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
          });
          await client.connect();
          const result = await client.query('SELECT version()');
          version = result.rows[0]?.version;
          await client.end();
          break;
        }

        case DatabaseEngine.MYSQL: {
          if (!mysqlModule) {
            mysqlModule = await import('mysql2/promise');
          }
          const connection = await mysqlModule.createConnection({
            host: config.host,
            port: config.port ?? DEFAULT_DATABASE_PORTS[DatabaseEngine.MYSQL],
            user: config.username,
            password: config.password,
            database: config.database,
            connectTimeout: config.connectionTimeout ?? DATABASE_QUERY_LIMITS.DEFAULT_CONNECTION_TIMEOUT,
          });
          const [rows] = await connection.query('SELECT VERSION() as version');
          version = (rows as { version: string }[])[0]?.version;
          await connection.end();
          break;
        }

        case DatabaseEngine.SQLITE: {
          const db = new Database(config.database, {
            readonly: true,
            fileMustExist: config.database !== ':memory:',
          });
          const result = db.prepare('SELECT sqlite_version() as version').get() as { version: string };
          version = result?.version;
          db.close();
          break;
        }

        default:
          throw new Error(`Unsupported database engine: ${config.engine}`);
      }

      return { success: true, version };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection test failed';
      logger.debug({ error: message }, 'Connection test failed');
      return { success: false, error: message };
    }
  }

  /**
   * Get session info
   */
  getSession(sessionId: string): DatabaseSession | undefined {
    return this.connections.get(sessionId)?.session;
  }

  /**
   * Get all active sessions
   */
  getSessions(): DatabaseSession[] {
    return Array.from(this.connections.values()).map(m => m.session);
  }

  /**
   * Disconnect all connections
   */
  async disconnectAll(): Promise<void> {
    logger.info({ count: this.connections.size }, 'Disconnecting all database connections');

    const disconnectPromises = Array.from(this.connections.keys()).map(sessionId =>
      this.disconnect(sessionId).catch(error => {
        logger.error({ sessionId, error }, 'Error disconnecting database');
      })
    );

    await Promise.all(disconnectPromises);
  }

  /**
   * Cleanup and destroy manager
   */
  async destroy(): Promise<void> {
    await this.disconnectAll();
    this.removeAllListeners();
    logger.info('Database manager destroyed');
  }
}
