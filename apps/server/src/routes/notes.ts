/**
 * Notes Routes
 *
 * REST API for managing sticky notes.
 */

import type { FastifyInstance, FastifyPluginCallback } from 'fastify';
import { createNodeId } from '@masterdashboard/shared';
import type { NoteColor, NoteMode } from '@masterdashboard/shared';
import { createChildLogger } from '../utils/logger.js';
import {
  insertNote,
  getNoteById,
  getNotesByProjectId,
  updateNote as updateNoteInDb,
  deleteNote as deleteNoteFromDb,
  getProjectById,
  type NoteRow,
} from '../persistence/database.js';

const logger = createChildLogger('routes-notes');

interface NoteParams {
  noteId: string;
}

interface ProjectNoteParams {
  projectId: string;
}

interface CreateNoteBody {
  projectId: string;
  content?: string;
  color?: NoteColor;
  mode?: NoteMode;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
}

interface UpdateNoteBody {
  content?: string;
  color?: NoteColor;
  mode?: NoteMode;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
}

/**
 * Convert database row to Note response object
 */
function rowToNote(row: NoteRow) {
  return {
    id: row.id,
    projectId: row.project_id,
    content: row.content,
    color: row.color as NoteColor,
    mode: row.mode as NoteMode,
    positionX: row.position_x,
    positionY: row.position_y,
    width: row.width,
    height: row.height,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const noteRoutes: FastifyPluginCallback = (
  fastify: FastifyInstance,
  _options,
  done
) => {
  /**
   * List all notes for a project
   * GET /api/notes/project/:projectId
   */
  fastify.get<{ Params: ProjectNoteParams }>(
    '/project/:projectId',
    async (request, reply) => {
      const { projectId } = request.params;

      try {
        // Verify project exists
        const project = getProjectById(projectId);
        if (!project) {
          return reply.status(404).send({
            success: false,
            error: 'Project not found',
          });
        }

        const rows = getNotesByProjectId(projectId);
        const notes = rows.map(rowToNote);

        return reply.send({
          success: true,
          data: notes,
          meta: {
            total: notes.length,
          },
        });
      } catch (error) {
        logger.error({ projectId, error }, 'Failed to list notes');
        return reply.status(500).send({
          success: false,
          error: 'Failed to list notes',
        });
      }
    }
  );

  /**
   * Create a new note
   * POST /api/notes
   */
  fastify.post<{ Body: CreateNoteBody }>('/', async (request, reply) => {
    const {
      projectId,
      content = '',
      color = 'yellow',
      mode = 'edit',
      positionX = 100,
      positionY = 100,
      width = 300,
      height = 200,
    } = request.body;

    if (!projectId) {
      return reply.status(400).send({
        success: false,
        error: 'projectId is required',
      });
    }

    // Validate color
    const validColors = ['yellow', 'blue', 'pink', 'green', 'purple'];
    if (!validColors.includes(color)) {
      return reply.status(400).send({
        success: false,
        error: `Invalid color. Must be one of: ${validColors.join(', ')}`,
      });
    }

    // Validate mode
    const validModes = ['edit', 'preview'];
    if (!validModes.includes(mode)) {
      return reply.status(400).send({
        success: false,
        error: `Invalid mode. Must be one of: ${validModes.join(', ')}`,
      });
    }

    try {
      // Verify project exists
      const project = getProjectById(projectId);
      if (!project) {
        return reply.status(404).send({
          success: false,
          error: 'Project not found',
        });
      }

      const noteId = createNodeId();
      const now = new Date().toISOString();

      insertNote({
        id: noteId,
        project_id: projectId,
        content,
        color,
        mode,
        position_x: positionX,
        position_y: positionY,
        width,
        height,
        created_at: now,
        updated_at: now,
      });

      const note = {
        id: noteId,
        projectId,
        content,
        color: color as NoteColor,
        mode: mode as NoteMode,
        positionX,
        positionY,
        width,
        height,
        createdAt: now,
        updatedAt: now,
      };

      logger.info({ noteId, projectId }, 'Note created');

      return reply.status(201).send({
        success: true,
        data: note,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to create note');
      return reply.status(500).send({
        success: false,
        error: 'Failed to create note',
      });
    }
  });

  /**
   * Get note by ID
   * GET /api/notes/:noteId
   */
  fastify.get<{ Params: NoteParams }>('/:noteId', async (request, reply) => {
    const { noteId } = request.params;

    try {
      const row = getNoteById(noteId);
      if (!row) {
        return reply.status(404).send({
          success: false,
          error: 'Note not found',
        });
      }

      return reply.send({
        success: true,
        data: rowToNote(row),
      });
    } catch (error) {
      logger.error({ noteId, error }, 'Failed to get note');
      return reply.status(500).send({
        success: false,
        error: 'Failed to get note',
      });
    }
  });

  /**
   * Update note
   * PATCH /api/notes/:noteId
   */
  fastify.patch<{ Params: NoteParams; Body: UpdateNoteBody }>(
    '/:noteId',
    async (request, reply) => {
      const { noteId } = request.params;
      const updates = request.body;

      try {
        const existing = getNoteById(noteId);
        if (!existing) {
          return reply.status(404).send({
            success: false,
            error: 'Note not found',
          });
        }

        // Validate color if provided
        if (updates.color) {
          const validColors = ['yellow', 'blue', 'pink', 'green', 'purple'];
          if (!validColors.includes(updates.color)) {
            return reply.status(400).send({
              success: false,
              error: `Invalid color. Must be one of: ${validColors.join(', ')}`,
            });
          }
        }

        // Validate mode if provided
        if (updates.mode) {
          const validModes = ['edit', 'preview'];
          if (!validModes.includes(updates.mode)) {
            return reply.status(400).send({
              success: false,
              error: `Invalid mode. Must be one of: ${validModes.join(', ')}`,
            });
          }
        }

        const dbUpdates: Partial<NoteRow> = {};

        if (updates.content !== undefined) {
          dbUpdates.content = updates.content;
        }
        if (updates.color !== undefined) {
          dbUpdates.color = updates.color;
        }
        if (updates.mode !== undefined) {
          dbUpdates.mode = updates.mode;
        }
        if (updates.positionX !== undefined) {
          dbUpdates.position_x = updates.positionX;
        }
        if (updates.positionY !== undefined) {
          dbUpdates.position_y = updates.positionY;
        }
        if (updates.width !== undefined) {
          dbUpdates.width = updates.width;
        }
        if (updates.height !== undefined) {
          dbUpdates.height = updates.height;
        }

        updateNoteInDb(noteId, dbUpdates);

        // Fetch updated note
        const updatedRow = getNoteById(noteId);
        if (!updatedRow) {
          throw new Error('Note not found after update');
        }

        logger.info({ noteId }, 'Note updated');

        return reply.send({
          success: true,
          data: rowToNote(updatedRow),
        });
      } catch (error) {
        logger.error({ noteId, error }, 'Failed to update note');
        return reply.status(500).send({
          success: false,
          error: 'Failed to update note',
        });
      }
    }
  );

  /**
   * Delete note
   * DELETE /api/notes/:noteId
   */
  fastify.delete<{ Params: NoteParams }>('/:noteId', async (request, reply) => {
    const { noteId } = request.params;

    try {
      const existing = getNoteById(noteId);
      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: 'Note not found',
        });
      }

      deleteNoteFromDb(noteId);

      logger.info({ noteId }, 'Note deleted');

      return reply.send({
        success: true,
        message: 'Note deleted',
      });
    } catch (error) {
      logger.error({ noteId, error }, 'Failed to delete note');
      return reply.status(500).send({
        success: false,
        error: 'Failed to delete note',
      });
    }
  });

  done();
};
