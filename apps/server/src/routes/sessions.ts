/**
 * Session Routes
 *
 * REST API for managing terminal sessions.
 */

import type { FastifyInstance, FastifyPluginCallback } from 'fastify';
import { SessionManager } from '../managers/session-manager.js';
import { createChildLogger } from '../utils/logger.js';
import { isAppError } from '../utils/errors.js';

const logger = createChildLogger('routes-sessions');

interface SessionListQuery {
  projectId?: string;
}

interface SessionParams {
  sessionId: string;
}

export const sessionRoutes: FastifyPluginCallback = (
  fastify: FastifyInstance,
  _options,
  done
) => {
  const sessionManager = fastify.sessionManager as SessionManager;

  /**
   * List sessions
   * GET /api/sessions?projectId=xxx
   */
  fastify.get<{ Querystring: SessionListQuery }>('/', async (request, reply) => {
    const { projectId } = request.query;

    let sessions;
    if (projectId) {
      sessions = sessionManager.getSessionsByProject(projectId);
    } else {
      // Return all active sessions
      const activeIds = sessionManager.getActiveSessionIds();
      sessions = activeIds
        .map((id) => sessionManager.getSession(id))
        .filter(Boolean);
    }

    return reply.send({
      success: true,
      data: sessions.map((s) => ({
        id: s!.id,
        type: s!.type,
        status: s!.status,
        projectId: s!.projectId,
        createdAt: s!.createdAt.toISOString(),
        updatedAt: s!.updatedAt.toISOString(),
        lastActiveAt: s!.lastActiveAt.toISOString(),
      })),
      meta: {
        total: sessions.length,
      },
    });
  });

  /**
   * Get session by ID
   * GET /api/sessions/:sessionId
   */
  fastify.get<{ Params: SessionParams }>('/:sessionId', async (request, reply) => {
    const { sessionId } = request.params;

    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return reply.status(404).send({
        success: false,
        error: 'Session not found',
      });
    }

    return reply.send({
      success: true,
      data: {
        id: session.id,
        type: session.type,
        status: session.status,
        projectId: session.projectId,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        lastActiveAt: session.lastActiveAt.toISOString(),
        metadata: session.metadata,
      },
    });
  });

  /**
   * Terminate session
   * DELETE /api/sessions/:sessionId
   */
  fastify.delete<{ Params: SessionParams }>('/:sessionId', async (request, reply) => {
    const { sessionId } = request.params;

    try {
      await sessionManager.terminateSession(sessionId);
      return reply.send({
        success: true,
        message: 'Session terminated',
      });
    } catch (error) {
      logger.error({ sessionId, error }, 'Failed to terminate session');
      const message = isAppError(error) ? error.message : 'Failed to terminate session';
      return reply.status(500).send({
        success: false,
        error: message,
      });
    }
  });

  /**
   * Get buffer stats for a session
   * GET /api/sessions/:sessionId/buffer
   */
  fastify.get<{ Params: SessionParams }>('/:sessionId/buffer', async (request, reply) => {
    const { sessionId } = request.params;
    const bufferManager = fastify.bufferManager;

    const stats = bufferManager.getBufferStats(sessionId);
    if (!stats) {
      return reply.status(404).send({
        success: false,
        error: 'Buffer not found',
      });
    }

    return reply.send({
      success: true,
      data: stats,
    });
  });

  done();
};
