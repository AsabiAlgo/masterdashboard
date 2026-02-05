/**
 * WebSocket Server Setup
 *
 * Sets up Socket.IO handling with Fastify.
 */

import type { FastifyInstance } from 'fastify';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { WS_EVENTS } from '@masterdashboard/shared';
import { createChildLogger } from '../utils/logger.js';
import { SessionManager } from '../managers/session-manager.js';
import { SSHManager } from '../managers/ssh-manager.js';
import { BrowserManager } from '../managers/browser-manager.js';
import { getEnv } from '../config/env.js';
import {
  registerClient,
  unregisterClient,
  setIO,
} from './middleware.js';
import { getHandler, hasHandler } from './handlers.js';
import { getSSHHandler, isSSHEvent } from './ssh-handlers.js';
import { getBrowserHandler, isBrowserEvent } from './browser-handlers.js';
import { getFileHandler, isFileEvent } from './file-handlers.js';
import { getDatabaseHandler, isDatabaseEvent } from './database-handlers.js';
import { getGitHandler, isGitEvent } from './git-handlers.js';
import { FileManager } from '../managers/file-manager.js';
import { DatabaseManager } from '../managers/database-manager.js';
import { GitManager } from '../managers/git-manager.js';

const logger = createChildLogger('websocket');

export function setupWebSocket(fastify: FastifyInstance): void {
  const env = getEnv();
  const sessionManager = fastify.sessionManager as SessionManager;
  const sshManager = new SSHManager();
  const browserManager = new BrowserManager();
  const fileManager = new FileManager({
    allowedRoots: [process.env.HOME ?? '/'],
  });
  const databaseManager = new DatabaseManager();
  const gitManager = new GitManager({
    allowedRoots: [process.env.HOME ?? '/'],
  });

  // Store managers on fastify instance for access elsewhere
  (fastify as unknown as { sshManager: SSHManager }).sshManager = sshManager;
  (fastify as unknown as { browserManager: BrowserManager }).browserManager = browserManager;
  (fastify as unknown as { fileManager: FileManager }).fileManager = fileManager;
  (fastify as unknown as { databaseManager: DatabaseManager }).databaseManager = databaseManager;
  (fastify as unknown as { gitManager: GitManager }).gitManager = gitManager;

  // Create Socket.IO server
  const io = new SocketIOServer(fastify.server, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  // Store io instance for broadcasting
  setIO(io);

  // Set up session manager event forwarding
  setupSessionManagerEvents(sessionManager, io);

  // Set up SSH manager event forwarding
  setupSSHManagerEvents(sshManager, io);

  // Set up Browser manager event forwarding
  setupBrowserManagerEvents(browserManager, io);

  // Set up Database manager event forwarding
  setupDatabaseManagerEvents(databaseManager, io);

  // Handle connections
  io.on('connection', (socket: Socket) => {
    handleConnection(socket, sessionManager, sshManager, browserManager, fileManager, databaseManager, gitManager);
  });

  // Cleanup on server close - Socket.IO first for fast port release
  fastify.addHook('onClose', async () => {
    // Disconnect all clients immediately to release connections
    io.disconnectSockets(true);

    // Close Socket.IO server (releases the port)
    io.close();

    // Then cleanup managers in parallel
    await Promise.all([
      Promise.resolve(sshManager.destroy()),
      browserManager.destroy().catch(() => {}),
      Promise.resolve(fileManager.destroy()),
      databaseManager.destroy().catch(() => {}),
      Promise.resolve(gitManager.destroy()),
    ]);
  });

  logger.info('WebSocket server configured');
}

/**
 * Handle a new Socket.IO connection
 */
function handleConnection(
  socket: Socket,
  sessionManager: SessionManager,
  sshManager: SSHManager,
  browserManager: BrowserManager,
  fileManager: FileManager,
  databaseManager: DatabaseManager,
  gitManager: GitManager
): void {
  const clientId = registerClient(socket);
  logger.info({ clientId }, 'Client connected');

  // Send connection acknowledgment (use 'connected' instead of reserved 'connect')
  socket.emit('connected', {
    clientId,
    timestamp: Date.now(),
  });

  // Handle all events dynamically
  socket.onAny(async (event: string, payload: unknown, callback?: (response: unknown) => void) => {
    await handleMessage(socket, event, payload, sessionManager, sshManager, browserManager, fileManager, databaseManager, gitManager, callback);
  });

  // Handle disconnect
  socket.on('disconnect', (reason: string) => {
    handleClose(socket, reason, sessionManager);
  });

  // Handle errors
  socket.on('error', (error: Error) => {
    logger.error({ clientId, error }, 'Socket error');
  });
}

/**
 * Handle an incoming Socket.IO message
 */
async function handleMessage(
  socket: Socket,
  event: string,
  payload: unknown,
  sessionManager: SessionManager,
  sshManager: SSHManager,
  browserManager: BrowserManager,
  fileManager: FileManager,
  databaseManager: DatabaseManager,
  gitManager: GitManager,
  callback?: (response: unknown) => void
): Promise<void> {
  const clientId = socket.id;

  // Log the event (excluding high-frequency events)
  if (
    event !== WS_EVENTS.PING &&
    event !== WS_EVENTS.TERMINAL_INPUT &&
    event !== WS_EVENTS.SSH_INPUT &&
    event !== WS_EVENTS.BROWSER_INPUT &&
    event !== WS_EVENTS.DATABASE_QUERY // Queries can be frequent and contain sensitive data
  ) {
    logger.info({ clientId, event, payload }, 'Received event');
  }

  // Check for SSH events first
  if (isSSHEvent(event)) {
    const sshHandler = getSSHHandler(event);
    if (sshHandler) {
      try {
        const result = await sshHandler(socket, payload, undefined, sshManager);
        if (callback) callback({ success: true, data: result });
      } catch (error) {
        logger.error({ clientId, event, error }, 'SSH handler error');
        if (callback) callback({ success: false, error: 'Internal handler error' });
      }
    }
    return;
  }

  // Check for Browser events
  if (isBrowserEvent(event)) {
    const browserHandler = getBrowserHandler(event);
    if (browserHandler) {
      try {
        const result = await browserHandler(socket, payload, undefined, browserManager);
        if (callback) callback({ success: true, data: result });
      } catch (error) {
        logger.error({ clientId, event, error }, 'Browser handler error');
        if (callback) callback({ success: false, error: 'Internal handler error' });
      }
    }
    return;
  }

  // Check for File events
  if (isFileEvent(event)) {
    const fileHandler = getFileHandler(event);
    if (fileHandler) {
      try {
        // Extract correlation ID from payload if present
        let correlationId: string | undefined;
        if (typeof payload === 'object' && payload !== null && '_correlationId' in payload) {
          correlationId = (payload as { _correlationId?: string })._correlationId;
        }
        const result = await fileHandler(socket, payload, correlationId, fileManager, sessionManager);
        if (callback) callback({ success: true, data: result });
      } catch (error) {
        logger.error({ clientId, event, error }, 'File handler error');
        if (callback) callback({ success: false, error: 'Internal handler error' });
      }
    }
    return;
  }

  // Check for Database events
  if (isDatabaseEvent(event)) {
    const databaseHandler = getDatabaseHandler(event);
    if (databaseHandler) {
      try {
        // Extract correlation ID from payload if present
        let correlationId: string | undefined;
        if (typeof payload === 'object' && payload !== null && '_correlationId' in payload) {
          correlationId = (payload as { _correlationId?: string })._correlationId;
        }
        const result = await databaseHandler(socket, payload, correlationId, databaseManager);
        if (callback) callback({ success: true, data: result });
      } catch (error) {
        logger.error({ clientId, event, error }, 'Database handler error');
        if (callback) callback({ success: false, error: 'Internal handler error' });
      }
    }
    return;
  }

  // Check for Git events
  if (isGitEvent(event)) {
    const gitHandler = getGitHandler(event);
    if (gitHandler) {
      try {
        // Extract correlation ID from payload if present
        let correlationId: string | undefined;
        if (typeof payload === 'object' && payload !== null && '_correlationId' in payload) {
          correlationId = (payload as { _correlationId?: string })._correlationId;
        }
        const result = await gitHandler(socket, payload, correlationId, gitManager);
        if (callback) callback({ success: true, data: result });
      } catch (error) {
        logger.error({ clientId, event, error }, 'Git handler error');
        if (callback) callback({ success: false, error: 'Internal handler error' });
      }
    }
    return;
  }

  // Check if we have a handler for this event
  if (!hasHandler(event)) {
    logger.warn({ clientId, event }, 'Unknown event');
    if (callback) callback({ success: false, error: `Unknown event: ${event}` });
    return;
  }

  // Extract correlation ID from payload if present
  let correlationId: string | undefined;
  if (typeof payload === 'object' && payload !== null && '_correlationId' in payload) {
    correlationId = (payload as { _correlationId?: string })._correlationId;
  }

  // Get and execute the handler
  const handler = getHandler(event);
  if (handler) {
    try {
      const result = await handler(socket, payload, correlationId, sessionManager, browserManager);
      if (callback) callback({ success: true, data: result });
    } catch (error) {
      logger.error({ clientId, event, error }, 'Handler error');
      if (callback) callback({ success: false, error: 'Internal handler error' });
    }
  }
}

/**
 * Handle Socket.IO close
 */
function handleClose(
  socket: Socket,
  reason: string,
  sessionManager: SessionManager
): void {
  const clientId = unregisterClient(socket);
  if (clientId) {
    // Notify session manager of disconnect
    sessionManager.handleClientDisconnect(clientId);
    logger.info({ clientId, reason }, 'Client disconnected');
  }
}

/**
 * Set up event forwarding from SessionManager to Socket.IO clients
 */
function setupSessionManagerEvents(sessionManager: SessionManager, io: SocketIOServer): void {
  // Forward terminal output to clients
  sessionManager.on('terminal:output', ({ sessionId, data, timestamp }) => {
    io.emit(WS_EVENTS.TERMINAL_OUTPUT, { sessionId, data, timestamp });
  });

  // Forward status changes to clients
  sessionManager.on('status:change', (event) => {
    logger.debug({ event }, 'Status change event');
    io.emit(WS_EVENTS.STATUS_CHANGE, event);
  });

  // Log session events
  sessionManager.on('session:created', (session) => {
    logger.info({ sessionId: session.id }, 'Session created');
  });

  sessionManager.on('session:terminated', ({ sessionId, exitCode }) => {
    logger.info({ sessionId, exitCode }, 'Session terminated');
    io.emit(WS_EVENTS.SESSION_TERMINATED, { sessionId, exitCode });
  });

  sessionManager.on('session:paused', ({ sessionId }) => {
    logger.info({ sessionId }, 'Session paused');
  });

  sessionManager.on('session:disconnected', ({ sessionId }) => {
    logger.info({ sessionId }, 'Session disconnected (PTY died, tmux alive)');
    io.emit(WS_EVENTS.SESSION_DISCONNECTED, { sessionId });
  });

  sessionManager.on('session:reconnected', ({ sessionId, clientId }) => {
    logger.info({ sessionId, clientId }, 'Session reconnected');
  });
}

/**
 * Set up event forwarding from SSHManager to Socket.IO clients
 */
function setupSSHManagerEvents(sshManager: SSHManager, io: SocketIOServer): void {
  // Forward SSH output to clients
  sshManager.on('data', ({ sessionId, data }) => {
    io.emit(WS_EVENTS.SSH_OUTPUT, { sessionId, data, timestamp: Date.now() });
  });

  // Forward connection events
  sshManager.on('connected', ({ sessionId, host, username }) => {
    logger.info({ sessionId, host, username }, 'SSH connected');
    io.emit(WS_EVENTS.SSH_CONNECTED, { sessionId, host, username });
  });

  // Forward disconnect events
  sshManager.on('disconnected', ({ sessionId }) => {
    logger.info({ sessionId }, 'SSH disconnected');
    io.emit('ssh:disconnected', { sessionId });
  });

  // Forward error events
  sshManager.on('error', ({ sessionId, error }) => {
    logger.error({ sessionId, error }, 'SSH error');
    io.emit(WS_EVENTS.SSH_ERROR, { sessionId, error });
  });

  // Forward keyboard-interactive events
  sshManager.on('keyboard-interactive', (event) => {
    logger.debug({ sessionId: event.sessionId }, 'SSH keyboard-interactive');
    io.emit('ssh:keyboard-interactive', event);
  });
}

/**
 * Set up event forwarding from BrowserManager to Socket.IO clients
 */
function setupBrowserManagerEvents(browserManager: BrowserManager, io: SocketIOServer): void {
  // Forward screencast frames to clients
  browserManager.on('frame', (frame) => {
    io.emit(WS_EVENTS.BROWSER_FRAME, frame);
  });

  // Forward navigation events
  browserManager.on('navigated', ({ sessionId, url, title }) => {
    logger.debug({ sessionId, url }, 'Browser navigated');
    io.emit('browser:loaded', { sessionId, url, title });
  });

  // Forward page load events
  browserManager.on('loaded', ({ sessionId, url, title }) => {
    logger.debug({ sessionId, url }, 'Browser page loaded');
    io.emit('browser:loaded', { sessionId, url, title });
  });

  // Forward console messages
  browserManager.on('console', (message) => {
    io.emit(WS_EVENTS.BROWSER_CONSOLE, message);
  });

  // Forward error events
  browserManager.on('error', ({ sessionId, message, stack }) => {
    logger.error({ sessionId, message }, 'Browser page error');
    io.emit('browser:error', { sessionId, error: message, stack });
  });

  // Forward termination events
  browserManager.on('terminated', ({ sessionId }) => {
    logger.info({ sessionId }, 'Browser session terminated');
    io.emit(WS_EVENTS.SESSION_TERMINATED, { sessionId });
  });

  // Forward crash events
  browserManager.on('crashed', ({ sessionId }) => {
    logger.error({ sessionId }, 'Browser page crashed');
    io.emit('browser:crashed', { sessionId });
  });

  // Forward close events
  browserManager.on('closed', ({ sessionId }) => {
    logger.info({ sessionId }, 'Browser page closed');
    io.emit(WS_EVENTS.SESSION_TERMINATED, { sessionId });
  });
}

/**
 * Set up event forwarding from DatabaseManager to Socket.IO clients
 */
function setupDatabaseManagerEvents(databaseManager: DatabaseManager, io: SocketIOServer): void {
  // Forward connection events
  databaseManager.on('connected', ({ sessionId, engine, database }) => {
    logger.info({ sessionId, engine, database }, 'Database connected');
    io.emit(WS_EVENTS.DATABASE_CONNECTED, { sessionId, engine, database });
  });

  // Forward disconnect events
  databaseManager.on('disconnected', ({ sessionId }) => {
    logger.info({ sessionId }, 'Database disconnected');
    io.emit(WS_EVENTS.DATABASE_DISCONNECTED, { sessionId });
  });

  // Forward error events
  databaseManager.on('error', ({ sessionId, error, code }) => {
    logger.error({ sessionId, error, code }, 'Database error');
    io.emit(WS_EVENTS.DATABASE_ERROR, { sessionId, error, code });
  });

  // Forward query result events
  databaseManager.on('queryResult', ({ sessionId, result }) => {
    logger.debug({ sessionId, rowCount: result.rowCount }, 'Query result');
    io.emit(WS_EVENTS.DATABASE_QUERY_RESULT, { sessionId, result });
  });

  // Forward query error events
  databaseManager.on('queryError', ({ sessionId, error, query }) => {
    logger.error({ sessionId, error }, 'Query error');
    io.emit(WS_EVENTS.DATABASE_QUERY_ERROR, { sessionId, error, query });
  });
}

// Re-export middleware functions for use elsewhere
export {
  registerClient,
  unregisterClient,
  sendMessage,
  sendError,
  broadcast,
  getConnectedClientCount,
} from './middleware.js';

export { getHandler, hasHandler, getHandledEvents } from './handlers.js';
export { handleReconnect, handleTerminalReconnect } from './reconnect.js';
export { getBrowserHandler, isBrowserEvent, getBrowserHandledEvents } from './browser-handlers.js';
export { getFileHandler, isFileEvent, getFileHandledEvents } from './file-handlers.js';
export { getDatabaseHandler, isDatabaseEvent, getDatabaseHandledEvents } from './database-handlers.js';
export { getGitHandler, isGitEvent, getGitHandledEvents } from './git-handlers.js';
