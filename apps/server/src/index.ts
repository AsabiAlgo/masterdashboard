/**
 * Master Dashboard Server
 *
 * Entry point for the backend service.
 * Handles terminal orchestration with session persistence.
 */

import 'dotenv/config';
import { startServer } from './server.js';
import { logger } from './utils/logger.js';

const isDev = process.env.NODE_ENV !== 'production';

// Start server
startServer()
  .then((fastify) => {
    let isShuttingDown = false;
    let shutdownAttempts = 0;

    // Handle graceful shutdown with aggressive timeouts for dev
    const shutdown = async (signal: string) => {
      shutdownAttempts++;

      // On second signal, force exit immediately
      if (shutdownAttempts > 1 || isShuttingDown) {
        logger.warn({ signal, attempts: shutdownAttempts }, 'Forcing immediate exit');
        process.exit(1);
      }
      isShuttingDown = true;

      logger.info({ signal }, 'Received shutdown signal');

      // In development, use very short timeout (1s) for fast hot-reload
      // In production, allow more time (5s) for graceful cleanup
      const timeoutMs = isDev ? 1000 : 5000;

      const forceExitTimeout = setTimeout(() => {
        logger.warn({ timeoutMs }, 'Graceful shutdown timed out, forcing exit');
        process.exit(1);
      }, timeoutMs);

      // Prevent timeout from keeping process alive
      forceExitTimeout.unref();

      try {
        await fastify.close();
        clearTimeout(forceExitTimeout);
        logger.info('Server closed successfully');
        process.exit(0);
      } catch (error) {
        clearTimeout(forceExitTimeout);
        logger.error({ error }, 'Error during shutdown');
        process.exit(1);
      }
    };

    // Register signal handlers
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGHUP', () => shutdown('SIGHUP'));

    // Handle uncaught exceptions - exit immediately in dev for fast restart
    process.on('uncaughtException', (error) => {
      logger.error({ error }, 'Uncaught exception');
      if (isDev) {
        process.exit(1);
      } else {
        shutdown('uncaughtException');
      }
    });

    process.on('unhandledRejection', (reason) => {
      logger.error({ reason }, 'Unhandled rejection');
      // Don't exit on unhandled rejection, just log it
    });
  })
  .catch((error) => {
    logger.error({
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        code: (error as NodeJS.ErrnoException).code,
      } : error
    }, 'Failed to start server');
    process.exit(1);
  });
