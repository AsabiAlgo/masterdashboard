/**
 * Server Setup
 *
 * Creates and configures the Fastify server with all plugins and routes.
 */

import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { getEnv, isDevelopment } from './config/env.js';
import { initDatabase, closeDatabase } from './persistence/database.js';
import { SessionManager } from './managers/session-manager.js';
import { BufferManager } from './managers/buffer-manager.js';
import { StatusDetector } from './managers/status-detector.js';
import { TmuxCleanupService } from './services/tmux-cleanup-service.js';
import { setupWebSocket } from './websocket/index.js';
import { healthRoutes, sessionRoutes, projectRoutes, tmuxRoutes, noteRoutes } from './routes/index.js';
import { createChildLogger } from './utils/logger.js';

const serverLogger = createChildLogger('server');

// Extend Fastify instance type
declare module 'fastify' {
  interface FastifyInstance {
    sessionManager: SessionManager;
    bufferManager: BufferManager;
    statusDetector: StatusDetector;
    tmuxCleanupService: TmuxCleanupService;
  }
}

export async function createServer(): Promise<FastifyInstance> {
  const env = getEnv();

  // In development: disable Fastify logger for clean console (use LOG_LEVEL=info to enable)
  // All logging goes to files via our custom logger
  const fastify = Fastify({
    logger: env.LOG_LEVEL === 'error' || env.LOG_LEVEL === 'fatal' ? false : {
      level: env.LOG_LEVEL,
      transport: isDevelopment() ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      } : undefined,
    },
    // Force close all connections on shutdown to speed up hot-reload
    forceCloseConnections: isDevelopment(),
  });

  // Initialize database
  await initDatabase();

  // Initialize managers
  const bufferManager = new BufferManager({
    maxLines: env.SCROLLBACK_LINES,
    persistToDisk: true,
    flushIntervalMs: env.BUFFER_PERSIST_INTERVAL_MS,
  });

  const statusDetector = new StatusDetector();

  const sessionManager = new SessionManager(bufferManager, statusDetector, {
    maxScrollbackLines: env.SCROLLBACK_LINES,
    bufferFlushIntervalMs: env.BUFFER_PERSIST_INTERVAL_MS,
    sessionCleanupIntervalMs: env.SESSION_CLEANUP_INTERVAL_MS,
    pausedSessionTimeoutMs: env.PAUSED_SESSION_TIMEOUT_MS,
  });

  // Initialize session manager (includes tmux recovery)
  await sessionManager.initialize();

  // Initialize tmux cleanup service
  const tmuxCleanupService = new TmuxCleanupService(
    sessionManager.getTmuxManager(),
    sessionManager,
    {
      idleTimeoutMs: env.TMUX_IDLE_TIMEOUT_MS ?? 48 * 60 * 60 * 1000, // 48 hours default
      maxSessions: env.TMUX_MAX_SESSIONS ?? 400,
      checkIntervalMs: env.TMUX_CLEANUP_INTERVAL_MS ?? 5 * 60 * 1000, // 5 minutes default
    }
  );
  await tmuxCleanupService.start();

  // Decorate fastify with managers
  fastify.decorate('sessionManager', sessionManager);
  fastify.decorate('bufferManager', bufferManager);
  fastify.decorate('statusDetector', statusDetector);
  fastify.decorate('tmuxCleanupService', tmuxCleanupService);

  // Register plugins
  await fastify.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Register routes
  await fastify.register(healthRoutes, { prefix: '/api/health' });
  await fastify.register(sessionRoutes, { prefix: '/api/sessions' });
  await fastify.register(projectRoutes, { prefix: '/api/projects' });
  await fastify.register(tmuxRoutes, { prefix: '/api/tmux' });
  await fastify.register(noteRoutes, { prefix: '/api/notes' });

  // Setup WebSocket
  setupWebSocket(fastify);

  // Error handler
  fastify.setErrorHandler((error, _request, reply) => {
    serverLogger.error({ error }, 'Unhandled error');
    reply.status(500).send({
      success: false,
      error: 'Internal server error',
    });
  });

  // Not found handler
  fastify.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({
      success: false,
      error: 'Not found',
    });
  });

  // Graceful shutdown hooks - optimized for fast restart in development
  fastify.addHook('onClose', async () => {
    // Stop cleanup service immediately (sync)
    tmuxCleanupService.stop();

    // In development, prioritize speed over completeness
    // Tmux sessions are preserved anyway, so data loss is minimal
    const timeoutMs = isDevelopment() ? 500 : 5000;

    // Create a hard timeout that will force cleanup
    const forceCleanup = () => {
      try {
        closeDatabase();
      } catch {
        // Ignore errors during forced cleanup
      }
    };

    const timeoutHandle = setTimeout(forceCleanup, timeoutMs);
    timeoutHandle.unref(); // Don't let this keep the process alive

    try {
      // In dev: skip persistence for faster restart (tmux preserves sessions)
      // In prod: persist everything
      if (!isDevelopment()) {
        await sessionManager.persistAllSessions();
      }

      // SessionManager.destroy() handles ptyManager, bufferManager, statusDetector
      await sessionManager.destroy();

      // Close database
      closeDatabase();

      clearTimeout(timeoutHandle);
    } catch (error) {
      clearTimeout(timeoutHandle);
      serverLogger.warn({ error }, 'Cleanup error');
      forceCleanup();
    }
  });

  return fastify;
}

/**
 * Sleep helper
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Start the server with retry logic for EADDRINUSE (handles hot-reload race condition)
 */
export async function startServer(): Promise<FastifyInstance> {
  const env = getEnv();
  const maxRetries = isDevelopment() ? 15 : 1;
  const retryDelayMs = 200; // Faster retries since shutdown is now faster

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const fastify = await createServer();

    try {
      await fastify.listen({
        port: env.PORT,
        host: env.HOST,
      });

      // Clean startup banner (always shown)
      const sessions = fastify.sessionManager.getSessions().length;
      console.log(`\n  🚀 Master Dashboard Server`);
      console.log(`     http://${env.HOST === '0.0.0.0' || env.HOST === '127.0.0.1' ? 'localhost' : env.HOST}:${env.PORT}`);
      console.log(`     ${sessions} session${sessions !== 1 ? 's' : ''} recovered\n`);

      return fastify;
    } catch (error) {
      lastError = error as Error;
      const errCode = (error as NodeJS.ErrnoException).code;

      if (errCode === 'EADDRINUSE' && attempt < maxRetries) {
        // Only log on first retry to reduce noise
        if (attempt === 1) {
          console.log(`  ⏳ Port ${env.PORT} in use, waiting...`);
        }
        await sleep(retryDelayMs);
        continue;
      }

      serverLogger.error({
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          code: (error as NodeJS.ErrnoException).code,
        } : error
      }, 'Failed to start server');
      throw error;
    }
  }

  throw lastError;
}
