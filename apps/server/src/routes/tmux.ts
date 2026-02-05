/**
 * Tmux Routes
 *
 * REST API for tmux session management and statistics.
 */

import type { FastifyInstance, FastifyPluginCallback } from 'fastify';
import { SessionManager } from '../managers/session-manager.js';
import { TmuxCleanupService } from '../services/tmux-cleanup-service.js';
import { createChildLogger } from '../utils/logger.js';
import { isAppError } from '../utils/errors.js';

const logger = createChildLogger('routes-tmux');

interface TmuxStatsQuery {
  projectId?: string;
}

interface CleanupBody {
  projectId?: string;
}

export const tmuxRoutes: FastifyPluginCallback = (
  fastify: FastifyInstance,
  _options,
  done
) => {
  const sessionManager = fastify.sessionManager as SessionManager;
  const tmuxCleanupService = fastify.tmuxCleanupService as TmuxCleanupService;
  const tmuxManager = sessionManager.getTmuxManager();

  /**
   * Get tmux session statistics
   * GET /api/tmux/stats?projectId=xxx
   */
  fastify.get<{ Querystring: TmuxStatsQuery }>('/stats', async (request, reply) => {
    const { projectId } = request.query;

    try {
      const allTmuxSessions = await tmuxManager.listSessions();

      // Get sessions from database filtered by project
      const dbSessions = projectId
        ? sessionManager.getSessionsByProject(projectId)
        : sessionManager.getActiveSessionIds().map(id => sessionManager.getSession(id)).filter(Boolean);

      // Count active (attached) and disconnected sessions
      let activeCount = 0;
      let disconnectedCount = 0;

      for (const dbSession of dbSessions) {
        if (!dbSession) continue;

        const tmuxSession = allTmuxSessions.find(t => t.sessionId === dbSession.id);
        if (tmuxSession) {
          if (tmuxSession.attached) {
            activeCount++;
          } else {
            disconnectedCount++;
          }
        }
      }

      // Count orphaned sessions (tmux sessions without db entry)
      let orphanedCount = 0;
      for (const tmuxSession of allTmuxSessions) {
        const dbSession = sessionManager.getSession(tmuxSession.sessionId);
        if (!dbSession) {
          orphanedCount++;
        }
      }

      return reply.send({
        success: true,
        data: {
          active: activeCount,
          disconnected: disconnectedCount,
          total: allTmuxSessions.length,
          orphaned: orphanedCount,
          projectSessions: dbSessions.length,
          cleanupStats: tmuxCleanupService.getStats(),
        },
      });
    } catch (error) {
      logger.error({ error, projectId }, 'Failed to get tmux stats');
      const message = isAppError(error) ? error.message : 'Failed to get tmux stats';
      return reply.status(500).send({
        success: false,
        error: message,
      });
    }
  });

  /**
   * Get orphaned session count
   * GET /api/tmux/orphans
   */
  fastify.get('/orphans', async (_request, reply) => {
    try {
      const allTmuxSessions = await tmuxManager.listSessions();

      const orphanedSessions = allTmuxSessions.filter(tmuxSession => {
        const dbSession = sessionManager.getSession(tmuxSession.sessionId);
        return !dbSession;
      });

      return reply.send({
        success: true,
        data: {
          count: orphanedSessions.length,
          sessions: orphanedSessions.map(s => ({
            sessionId: s.sessionId,
            tmuxName: s.tmuxName,
            createdAt: s.createdAt.toISOString(),
            lastActiveAt: s.lastActiveAt.toISOString(),
          })),
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get orphaned sessions');
      const message = isAppError(error) ? error.message : 'Failed to get orphaned sessions';
      return reply.status(500).send({
        success: false,
        error: message,
      });
    }
  });

  /**
   * Cleanup orphaned tmux sessions
   * POST /api/tmux/cleanup
   */
  fastify.post<{ Body: CleanupBody }>('/cleanup', async (_request, reply) => {
    try {
      const allTmuxSessions = await tmuxManager.listSessions();
      let cleanedCount = 0;

      for (const tmuxSession of allTmuxSessions) {
        const dbSession = sessionManager.getSession(tmuxSession.sessionId);
        if (!dbSession) {
          await tmuxManager.killSession(tmuxSession.sessionId);
          cleanedCount++;
          logger.info({ sessionId: tmuxSession.sessionId }, 'Cleaned orphaned tmux session');
        }
      }

      return reply.send({
        success: true,
        data: {
          cleaned: cleanedCount,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to cleanup orphaned sessions');
      const message = isAppError(error) ? error.message : 'Failed to cleanup orphaned sessions';
      return reply.status(500).send({
        success: false,
        error: message,
      });
    }
  });

  /**
   * Kill all sessions for a project
   * POST /api/tmux/kill-all
   */
  fastify.post<{ Body: { projectId: string } }>('/kill-all', async (request, reply) => {
    const { projectId } = request.body;

    if (!projectId) {
      return reply.status(400).send({
        success: false,
        error: 'projectId is required',
      });
    }

    try {
      const projectSessions = sessionManager.getSessionsByProject(projectId);
      let killedCount = 0;

      for (const session of projectSessions) {
        try {
          await sessionManager.terminateSession(session.id);
          killedCount++;
        } catch (err) {
          logger.warn({ sessionId: session.id, error: err }, 'Failed to terminate session');
        }
      }

      logger.info({ projectId, killedCount }, 'Killed all project sessions');

      return reply.send({
        success: true,
        data: {
          killed: killedCount,
        },
      });
    } catch (error) {
      logger.error({ error, projectId }, 'Failed to kill project sessions');
      const message = isAppError(error) ? error.message : 'Failed to kill project sessions';
      return reply.status(500).send({
        success: false,
        error: message,
      });
    }
  });

  done();
};
