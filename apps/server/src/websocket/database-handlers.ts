/**
 * Database WebSocket Handlers
 *
 * Handles database operation events for the DatabaseNode.
 */

import { Socket } from 'socket.io';
import {
  WS_EVENTS,
  DatabaseEngine,
  DATABASE_QUERY_LIMITS,
} from '@masterdashboard/shared';
import { z } from 'zod';
import { DatabaseManager } from '../managers/database-manager.js';
import { createChildLogger } from '../utils/logger.js';
import { sendMessage, sendError } from './middleware.js';

const logger = createChildLogger('database-handlers');

// Validation schemas
const databaseConnectPayloadSchema = z.object({
  engine: z.nativeEnum(DatabaseEngine),
  name: z.string().min(1).max(100),
  host: z.string().min(1).max(255).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  username: z.string().max(255).optional(),
  password: z.string().max(1000).optional(),
  database: z.string().min(1).max(1000),
  projectId: z.string().min(1),
  ssl: z.boolean().optional().default(false),
});

const databaseDisconnectPayloadSchema = z.object({
  sessionId: z.string().min(1),
});

const databaseQueryPayloadSchema = z.object({
  sessionId: z.string().min(1),
  query: z.string().min(1).max(100000), // Max 100KB query
  params: z.array(z.unknown()).optional(),
  limit: z.number().int().min(1).max(DATABASE_QUERY_LIMITS.MAX_ROWS).optional(),
  offset: z.number().int().min(0).optional(),
});

const databaseSchemaPayloadSchema = z.object({
  sessionId: z.string().min(1),
  schema: z.string().optional(),
});

const databaseTablesPayloadSchema = z.object({
  sessionId: z.string().min(1),
  schema: z.string().optional(),
});

const databaseTestConnectionPayloadSchema = z.object({
  engine: z.nativeEnum(DatabaseEngine),
  host: z.string().max(255).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  username: z.string().max(255).optional(),
  password: z.string().max(1000).optional(),
  database: z.string().min(1).max(1000),
  ssl: z.boolean().optional().default(false),
});

type DatabaseEventHandler = (
  socket: Socket,
  payload: unknown,
  correlationId: string | undefined,
  databaseManager: DatabaseManager
) => Promise<void> | void;

/**
 * Map of database event names to handlers
 */
const databaseHandlers: Record<string, DatabaseEventHandler> = {
  /**
   * Connect to a database
   */
  [WS_EVENTS.DATABASE_CONNECT]: async (socket, payload, correlationId, databaseManager) => {
    const result = databaseConnectPayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const session = await databaseManager.connect(result.data);

      sendMessage(socket, WS_EVENTS.DATABASE_CONNECTED, {
        sessionId: session.id,
        engine: session.engine,
        name: session.name,
        host: session.host,
        port: session.port,
        database: session.database,
        username: session.username,
      }, correlationId);
    } catch (error) {
      logger.error({ error }, 'Database connection failed');
      const message = error instanceof Error ? error.message : 'Connection failed';
      sendMessage(socket, WS_EVENTS.DATABASE_ERROR, {
        error: message,
        code: 'CONNECTION_FAILED',
      }, correlationId);
    }
  },

  /**
   * Disconnect from a database
   */
  [WS_EVENTS.DATABASE_DISCONNECT]: async (socket, payload, correlationId, databaseManager) => {
    const result = databaseDisconnectPayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      await databaseManager.disconnect(result.data.sessionId);

      sendMessage(socket, WS_EVENTS.DATABASE_DISCONNECTED, {
        sessionId: result.data.sessionId,
      }, correlationId);
    } catch (error) {
      logger.error({ error, sessionId: result.data.sessionId }, 'Database disconnect failed');
      const message = error instanceof Error ? error.message : 'Disconnect failed';
      sendMessage(socket, WS_EVENTS.DATABASE_ERROR, {
        sessionId: result.data.sessionId,
        error: message,
        code: 'DISCONNECT_FAILED',
      }, correlationId);
    }
  },

  /**
   * Execute a database query
   */
  [WS_EVENTS.DATABASE_QUERY]: async (socket, payload, correlationId, databaseManager) => {
    const result = databaseQueryPayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const queryResult = await databaseManager.query(
        result.data.sessionId,
        result.data.query,
        result.data.params,
        {
          limit: result.data.limit,
          offset: result.data.offset,
        }
      );

      sendMessage(socket, WS_EVENTS.DATABASE_QUERY_RESULT, {
        sessionId: result.data.sessionId,
        result: queryResult,
      }, correlationId);
    } catch (error) {
      logger.error({ error, sessionId: result.data.sessionId }, 'Database query failed');
      const message = error instanceof Error ? error.message : 'Query failed';
      sendMessage(socket, WS_EVENTS.DATABASE_QUERY_ERROR, {
        sessionId: result.data.sessionId,
        error: message,
        query: result.data.query.substring(0, 200), // Truncate for safety
      }, correlationId);
    }
  },

  /**
   * Get database schema
   */
  [WS_EVENTS.DATABASE_SCHEMA]: async (socket, payload, correlationId, databaseManager) => {
    const result = databaseSchemaPayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const schema = await databaseManager.getSchema(result.data.sessionId, result.data.schema);

      sendMessage(socket, WS_EVENTS.DATABASE_SCHEMA_RESPONSE, {
        sessionId: result.data.sessionId,
        schema,
      }, correlationId);
    } catch (error) {
      logger.error({ error, sessionId: result.data.sessionId }, 'Failed to get database schema');
      const message = error instanceof Error ? error.message : 'Failed to get schema';
      sendMessage(socket, WS_EVENTS.DATABASE_ERROR, {
        sessionId: result.data.sessionId,
        error: message,
        code: 'SCHEMA_FAILED',
      }, correlationId);
    }
  },

  /**
   * Get database tables (simplified schema)
   */
  [WS_EVENTS.DATABASE_TABLES]: async (socket, payload, correlationId, databaseManager) => {
    const result = databaseTablesPayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const schema = await databaseManager.getSchema(result.data.sessionId, result.data.schema);

      sendMessage(socket, WS_EVENTS.DATABASE_TABLES_RESPONSE, {
        sessionId: result.data.sessionId,
        tables: schema.tables,
      }, correlationId);
    } catch (error) {
      logger.error({ error, sessionId: result.data.sessionId }, 'Failed to get database tables');
      const message = error instanceof Error ? error.message : 'Failed to get tables';
      sendMessage(socket, WS_EVENTS.DATABASE_ERROR, {
        sessionId: result.data.sessionId,
        error: message,
        code: 'TABLES_FAILED',
      }, correlationId);
    }
  },

  /**
   * Test database connection
   */
  [WS_EVENTS.DATABASE_TEST_CONNECTION]: async (socket, payload, correlationId, databaseManager) => {
    const result = databaseTestConnectionPayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const testResult = await databaseManager.testConnection({
        ...result.data,
        name: 'Connection Test',
        projectId: 'test',
      });

      sendMessage(socket, WS_EVENTS.DATABASE_TEST_CONNECTION_RESPONSE, testResult, correlationId);
    } catch (error) {
      logger.error({ error }, 'Connection test failed');
      const message = error instanceof Error ? error.message : 'Connection test failed';
      sendMessage(socket, WS_EVENTS.DATABASE_TEST_CONNECTION_RESPONSE, {
        success: false,
        error: message,
      }, correlationId);
    }
  },
};

/**
 * Check if an event is a database event
 */
export function isDatabaseEvent(event: string): boolean {
  return event.startsWith('database:');
}

/**
 * Get the handler for a database event
 */
export function getDatabaseHandler(event: string): DatabaseEventHandler | undefined {
  return databaseHandlers[event];
}

/**
 * Get all handled database events
 */
export function getDatabaseHandledEvents(): string[] {
  return Object.keys(databaseHandlers);
}
