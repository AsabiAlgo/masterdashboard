/**
 * Project Routes
 *
 * REST API for managing projects.
 */

import type { FastifyInstance, FastifyPluginCallback } from 'fastify';
import {
  createProjectId,
  createProjectConfigSchema,
  DEFAULT_PROJECT_SETTINGS,
  type Project,
  type ProjectSettings,
  type CreateProjectConfig,
} from '@masterdashboard/shared';
import { createChildLogger } from '../utils/logger.js';
import {
  insertProject,
  getProjectById,
  getAllProjects,
  updateProject as updateProjectInDb,
  deleteProject as deleteProjectFromDb,
  type ProjectRow,
} from '../persistence/database.js';
import { SessionManager } from '../managers/session-manager.js';

const logger = createChildLogger('routes-projects');

interface ProjectParams {
  projectId: string;
}

interface CreateProjectBody {
  name: string;
  description?: string;
  defaultCwd: string;
  settings?: Partial<ProjectSettings>;
}

interface UpdateProjectBody {
  name?: string;
  description?: string;
  defaultCwd?: string;
  settings?: Partial<ProjectSettings>;
}

/**
 * Convert database row to Project object
 */
function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    defaultCwd: row.default_cwd,
    settings: JSON.parse(row.settings) as ProjectSettings,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export const projectRoutes: FastifyPluginCallback = (
  fastify: FastifyInstance,
  _options,
  done
) => {
  const sessionManager = fastify.sessionManager as SessionManager;

  /**
   * List all projects
   * GET /api/projects
   */
  fastify.get('/', async (_request, reply) => {
    try {
      const rows = getAllProjects();
      const projects = rows.map(rowToProject);

      // Add session counts to each project
      const projectsWithCounts = projects.map((project) => {
        const sessions = sessionManager.getSessionsByProject(project.id);
        const activeSessions = sessions.filter((s) => s.status === 'active').length;
        const pausedSessions = sessions.filter((s) => s.status === 'paused').length;

        return {
          ...project,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
          sessionCount: {
            total: sessions.length,
            active: activeSessions,
            paused: pausedSessions,
          },
        };
      });

      return reply.send({
        success: true,
        data: projectsWithCounts,
        meta: {
          total: projects.length,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to list projects');
      return reply.status(500).send({
        success: false,
        error: 'Failed to list projects',
      });
    }
  });

  /**
   * Create a new project
   * POST /api/projects
   */
  fastify.post<{ Body: CreateProjectBody }>('/', async (request, reply) => {
    const result = createProjectConfigSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: result.error.message,
      });
    }

    const config = result.data;
    const projectId = createProjectId();
    const now = new Date();

    const settings: ProjectSettings = {
      ...DEFAULT_PROJECT_SETTINGS,
      ...config.settings,
    };

    try {
      insertProject({
        id: projectId,
        name: config.name,
        description: config.description ?? null,
        default_cwd: config.defaultCwd,
        settings: JSON.stringify(settings),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

      const project: Project = {
        id: projectId,
        name: config.name,
        description: config.description,
        defaultCwd: config.defaultCwd,
        settings,
        createdAt: now,
        updatedAt: now,
      };

      logger.info({ projectId, name: config.name }, 'Project created');

      return reply.status(201).send({
        success: true,
        data: {
          ...project,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to create project');
      return reply.status(500).send({
        success: false,
        error: 'Failed to create project',
      });
    }
  });

  /**
   * Get project by ID
   * GET /api/projects/:projectId
   */
  fastify.get<{ Params: ProjectParams }>('/:projectId', async (request, reply) => {
    const { projectId } = request.params;

    try {
      const row = getProjectById(projectId);
      if (!row) {
        return reply.status(404).send({
          success: false,
          error: 'Project not found',
        });
      }

      const project = rowToProject(row);
      const sessions = sessionManager.getSessionsByProject(projectId);

      return reply.send({
        success: true,
        data: {
          ...project,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
          sessions: sessions.map((s) => ({
            id: s.id,
            type: s.type,
            status: s.status,
          })),
        },
      });
    } catch (error) {
      logger.error({ projectId, error }, 'Failed to get project');
      return reply.status(500).send({
        success: false,
        error: 'Failed to get project',
      });
    }
  });

  /**
   * Update project
   * PATCH /api/projects/:projectId
   */
  fastify.patch<{ Params: ProjectParams; Body: UpdateProjectBody }>(
    '/:projectId',
    async (request, reply) => {
      const { projectId } = request.params;
      const updates = request.body;

      try {
        const existing = getProjectById(projectId);
        if (!existing) {
          return reply.status(404).send({
            success: false,
            error: 'Project not found',
          });
        }

        const dbUpdates: Partial<ProjectRow> = {};

        if (updates.name !== undefined) {
          dbUpdates.name = updates.name;
        }
        if (updates.description !== undefined) {
          dbUpdates.description = updates.description;
        }
        if (updates.defaultCwd !== undefined) {
          dbUpdates.default_cwd = updates.defaultCwd;
        }
        if (updates.settings !== undefined) {
          const existingSettings = JSON.parse(existing.settings) as ProjectSettings;
          dbUpdates.settings = JSON.stringify({
            ...existingSettings,
            ...updates.settings,
          });
        }

        updateProjectInDb(projectId, dbUpdates);

        // Fetch updated project
        const updatedRow = getProjectById(projectId);
        if (!updatedRow) {
          throw new Error('Project not found after update');
        }

        const project = rowToProject(updatedRow);

        logger.info({ projectId }, 'Project updated');

        return reply.send({
          success: true,
          data: {
            ...project,
            createdAt: project.createdAt.toISOString(),
            updatedAt: project.updatedAt.toISOString(),
          },
        });
      } catch (error) {
        logger.error({ projectId, error }, 'Failed to update project');
        return reply.status(500).send({
          success: false,
          error: 'Failed to update project',
        });
      }
    }
  );

  /**
   * Delete project
   * DELETE /api/projects/:projectId
   */
  fastify.delete<{ Params: ProjectParams }>('/:projectId', async (request, reply) => {
    const { projectId } = request.params;

    try {
      const existing = getProjectById(projectId);
      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: 'Project not found',
        });
      }

      // Terminate all sessions in the project first
      await sessionManager.terminateProjectSessions(projectId);

      // Delete from database
      deleteProjectFromDb(projectId);

      logger.info({ projectId }, 'Project deleted');

      return reply.send({
        success: true,
        message: 'Project deleted',
      });
    } catch (error) {
      logger.error({ projectId, error }, 'Failed to delete project');
      return reply.status(500).send({
        success: false,
        error: 'Failed to delete project',
      });
    }
  });

  /**
   * Get sessions for a project
   * GET /api/projects/:projectId/sessions
   */
  fastify.get<{ Params: ProjectParams }>('/:projectId/sessions', async (request, reply) => {
    const { projectId } = request.params;

    try {
      const project = getProjectById(projectId);
      if (!project) {
        return reply.status(404).send({
          success: false,
          error: 'Project not found',
        });
      }

      const sessions = sessionManager.getSessionsByProject(projectId);

      return reply.send({
        success: true,
        data: sessions.map((s) => ({
          id: s.id,
          type: s.type,
          status: s.status,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
          lastActiveAt: s.lastActiveAt.toISOString(),
        })),
        meta: {
          total: sessions.length,
        },
      });
    } catch (error) {
      logger.error({ projectId, error }, 'Failed to get project sessions');
      return reply.status(500).send({
        success: false,
        error: 'Failed to get project sessions',
      });
    }
  });

  done();
};
