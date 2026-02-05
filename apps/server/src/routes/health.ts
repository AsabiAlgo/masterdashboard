/**
 * Health Check Routes
 *
 * Provides server health status endpoints.
 */

import type { FastifyInstance, FastifyPluginCallback } from 'fastify';
import { getConnectedClientCount } from '../websocket/middleware.js';

interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  version: string;
  connections: {
    websocket: number;
  };
}

interface ReadinessResponse {
  ready: boolean;
  checks: {
    database: boolean;
    websocket: boolean;
  };
}

export const healthRoutes: FastifyPluginCallback = (
  fastify: FastifyInstance,
  _options,
  done
) => {
  /**
   * Basic health check
   * GET /api/health
   */
  fastify.get('/', async (_request, reply) => {
    const response: HealthResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version ?? '0.1.0',
      connections: {
        websocket: getConnectedClientCount(),
      },
    };

    return reply.send(response);
  });

  /**
   * Liveness probe (for Kubernetes)
   * GET /api/health/live
   */
  fastify.get('/live', async (_request, reply) => {
    return reply.send({ alive: true });
  });

  /**
   * Readiness probe (for Kubernetes)
   * GET /api/health/ready
   */
  fastify.get('/ready', async (_request, reply) => {
    // Check database connection
    let dbReady = false;
    try {
      const { getDatabase } = await import('../persistence/database.js');
      const db = getDatabase();
      db.prepare('SELECT 1').get();
      dbReady = true;
    } catch {
      dbReady = false;
    }

    const response: ReadinessResponse = {
      ready: dbReady,
      checks: {
        database: dbReady,
        websocket: true, // WebSocket is always ready if server is up
      },
    };

    const statusCode = response.ready ? 200 : 503;
    return reply.status(statusCode).send(response);
  });

  done();
};
