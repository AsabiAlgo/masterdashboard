/**
 * File WebSocket Handlers
 *
 * Handles file system operation events for the FolderViewer node.
 */

import { Socket } from 'socket.io';
import * as path from 'path';
import {
  WS_EVENTS,
  FileAction,
  NodeType,
  ShellType,
  type FileInfoPayload,
  type FileWatchPayload,
} from '@masterdashboard/shared';
import { z } from 'zod';
import { FileManager } from '../managers/file-manager.js';
import { SessionManager } from '../managers/session-manager.js';
import { createChildLogger } from '../utils/logger.js';
import { isAppError } from '../utils/errors.js';
import { sendMessage, sendError, getClientId } from './middleware.js';

const logger = createChildLogger('file-handlers');

// Validation schemas
const fileListPayloadSchema = z.object({
  path: z.string().min(1),
  projectId: z.string().min(1),
  showHidden: z.boolean().optional().default(false),
  sortBy: z.enum(['name', 'size', 'modified', 'type']).optional().default('name'),
  sortDirection: z.enum(['asc', 'desc']).optional().default('asc'),
  limit: z.number().int().min(1).max(1000).optional().default(100),
  offset: z.number().int().min(0).optional().default(0),
});

const fileTreePayloadSchema = z.object({
  path: z.string().min(1),
  projectId: z.string().min(1),
  depth: z.number().int().min(1).max(10).optional().default(1),
  showHidden: z.boolean().optional().default(false),
});

const fileSearchPayloadSchema = z.object({
  rootPath: z.string().min(1),
  projectId: z.string().min(1),
  query: z.string().min(1),
  maxResults: z.number().int().min(1).max(500).optional().default(100),
  includeHidden: z.boolean().optional().default(false),
  fileTypes: z.array(z.string()).optional(),
});

const fileLaunchPayloadSchema = z.object({
  path: z.string().min(1),
  projectId: z.string().min(1),
  action: z.nativeEnum(FileAction),
  cwd: z.string().optional(),
  args: z.array(z.string()).optional(),
});

const fileReadPayloadSchema = z.object({
  path: z.string().min(1),
  projectId: z.string().min(1),
  startLine: z.number().int().min(0).optional(),
  endLine: z.number().int().min(0).optional(),
  maxBytes: z.number().int().min(1).max(10 * 1024 * 1024).optional(), // Max 10MB
});

const fileReadImagePayloadSchema = z.object({
  path: z.string().min(1),
  projectId: z.string().min(1),
  maxBytes: z.number().int().min(1).max(20 * 1024 * 1024).optional(), // Max 20MB for images
});

const fileWritePayloadSchema = z.object({
  path: z.string().min(1),
  projectId: z.string().min(1),
  content: z.string(),
  createDirectories: z.boolean().optional().default(false),
});

// File operation schemas
const fileCreatePayloadSchema = z.object({
  parentPath: z.string().min(1),
  projectId: z.string().min(1),
  name: z.string().min(1).max(255),
  content: z.string().optional().default(''),
});

const fileCreateFolderPayloadSchema = z.object({
  parentPath: z.string().min(1),
  projectId: z.string().min(1),
  name: z.string().min(1).max(255),
});

const fileRenamePayloadSchema = z.object({
  path: z.string().min(1),
  projectId: z.string().min(1),
  newName: z.string().min(1).max(255),
});

const fileDeletePayloadSchema = z.object({
  paths: z.array(z.string().min(1)).min(1).max(100),
  projectId: z.string().min(1),
});

const fileCopyPayloadSchema = z.object({
  sourcePaths: z.array(z.string().min(1)).min(1).max(100),
  destinationPath: z.string().min(1),
  projectId: z.string().min(1),
});

const fileMovePayloadSchema = z.object({
  sourcePaths: z.array(z.string().min(1)).min(1).max(100),
  destinationPath: z.string().min(1),
  projectId: z.string().min(1),
});

type FileEventHandler = (
  socket: Socket,
  payload: unknown,
  correlationId: string | undefined,
  fileManager: FileManager,
  sessionManager?: SessionManager
) => Promise<void> | void;

/**
 * Map of file event names to handlers
 */
const fileHandlers: Record<string, FileEventHandler> = {
  /**
   * List directory contents
   */
  [WS_EVENTS.FILE_LIST]: async (socket, payload, correlationId, fileManager) => {
    const result = fileListPayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const listing = await fileManager.listDirectory(result.data.path, {
        showHidden: result.data.showHidden,
        sortBy: result.data.sortBy,
        sortDirection: result.data.sortDirection,
        limit: result.data.limit,
        offset: result.data.offset,
      });

      sendMessage(socket, WS_EVENTS.FILE_LIST_RESPONSE, listing, correlationId);
    } catch (error) {
      logger.error({ error, path: result.data.path }, 'Failed to list directory');
      const message = isAppError(error) ? error.message : 'Failed to list directory';
      sendMessage(socket, WS_EVENTS.FILE_ERROR, {
        path: result.data.path,
        error: message,
        code: isAppError(error) ? error.code : 'INTERNAL_ERROR',
      }, correlationId);
    }
  },

  /**
   * Get file tree (hierarchical)
   */
  [WS_EVENTS.FILE_TREE]: async (socket, payload, correlationId, fileManager) => {
    const result = fileTreePayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const tree = await fileManager.getFileTree(
        result.data.path,
        result.data.depth,
        result.data.showHidden
      );

      sendMessage(socket, WS_EVENTS.FILE_TREE_RESPONSE, { tree }, correlationId);
    } catch (error) {
      logger.error({ error, path: result.data.path }, 'Failed to get file tree');
      const message = isAppError(error) ? error.message : 'Failed to get file tree';
      sendMessage(socket, WS_EVENTS.FILE_ERROR, {
        path: result.data.path,
        error: message,
        code: isAppError(error) ? error.code : 'INTERNAL_ERROR',
      }, correlationId);
    }
  },

  /**
   * Get single file info
   */
  [WS_EVENTS.FILE_INFO]: async (socket, payload, correlationId, fileManager) => {
    const data = payload as FileInfoPayload;

    if (!data.path) {
      sendError(socket, 'VALIDATION_FAILED', 'path is required', correlationId);
      return;
    }

    try {
      const entry = await fileManager.getFileInfo(data.path);
      sendMessage(socket, WS_EVENTS.FILE_INFO_RESPONSE, { entry }, correlationId);
    } catch (error) {
      logger.error({ error, path: data.path }, 'Failed to get file info');
      const message = isAppError(error) ? error.message : 'Failed to get file info';
      sendMessage(socket, WS_EVENTS.FILE_ERROR, {
        path: data.path,
        error: message,
        code: isAppError(error) ? error.code : 'INTERNAL_ERROR',
      }, correlationId);
    }
  },

  /**
   * Search files by name
   */
  [WS_EVENTS.FILE_SEARCH]: async (socket, payload, correlationId, fileManager) => {
    const result = fileSearchPayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const searchResult = await fileManager.searchFiles(result.data.rootPath, result.data.query, {
        maxResults: result.data.maxResults,
        includeHidden: result.data.includeHidden,
        fileTypes: result.data.fileTypes,
      });

      sendMessage(socket, WS_EVENTS.FILE_SEARCH_RESPONSE, {
        query: result.data.query,
        ...searchResult,
      }, correlationId);
    } catch (error) {
      logger.error({ error, rootPath: result.data.rootPath, query: result.data.query }, 'Failed to search files');
      const message = isAppError(error) ? error.message : 'Failed to search files';
      sendMessage(socket, WS_EVENTS.FILE_ERROR, {
        path: result.data.rootPath,
        error: message,
        code: isAppError(error) ? error.code : 'INTERNAL_ERROR',
      }, correlationId);
    }
  },

  /**
   * Launch file (execute or open)
   */
  [WS_EVENTS.FILE_LAUNCH]: async (socket, payload, correlationId, fileManager, sessionManager) => {
    const clientId = getClientId(socket);
    if (!clientId) {
      sendError(socket, 'UNAUTHORIZED', 'Client not registered', correlationId);
      return;
    }

    const result = fileLaunchPayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    const { path: filePath, projectId, action, cwd, args } = result.data;

    try {
      // Validate file exists and is accessible
      const entry = await fileManager.getFileInfo(filePath);

      switch (action) {
        case FileAction.EXECUTE:
        case FileAction.OPEN_IN_TERMINAL: {
          // Execute in terminal - create new terminal session
          if (!sessionManager) {
            sendMessage(socket, WS_EVENTS.FILE_LAUNCH_RESPONSE, {
              success: false,
              error: 'Session manager not available',
            }, correlationId);
            return;
          }

          const session = await sessionManager.createTerminalSession(clientId, {
            shell: ShellType.BASH,
            cwd: cwd ?? path.dirname(filePath),
            projectId,
            title: action === FileAction.EXECUTE
              ? `Running ${entry.name}`
              : path.dirname(filePath),
          });

          if (action === FileAction.EXECUTE) {
            // Send the execution command
            const argsStr = args?.length ? ' ' + args.join(' ') : '';
            sessionManager.writeToTerminal(session.id, `${filePath}${argsStr}\n`);
          }

          sendMessage(socket, WS_EVENTS.FILE_LAUNCH_RESPONSE, {
            success: true,
            sessionId: session.id,
            nodeType: NodeType.TERMINAL,
          }, correlationId);
          break;
        }

        case FileAction.QUICK_VIEW: {
          // Signal frontend to create Quick Reader node
          sendMessage(socket, WS_EVENTS.FILE_LAUNCH_RESPONSE, {
            success: true,
            nodeType: NodeType.FOLDER, // For now, will change to QUICK_READER when implemented
            filePath,
          }, correlationId);
          break;
        }

        case FileAction.COPY_PATH: {
          // Just return the path for frontend to copy
          sendMessage(socket, WS_EVENTS.FILE_LAUNCH_RESPONSE, {
            success: true,
            filePath,
          }, correlationId);
          break;
        }

        case FileAction.REVEAL:
        case FileAction.OPEN:
        default: {
          // Signal to frontend to handle appropriately
          sendMessage(socket, WS_EVENTS.FILE_LAUNCH_RESPONSE, {
            success: true,
            nodeType: NodeType.FOLDER,
            filePath,
          }, correlationId);
        }
      }
    } catch (error) {
      logger.error({ error, path: filePath, action }, 'Failed to launch file');
      const message = isAppError(error) ? error.message : 'Failed to launch file';
      sendMessage(socket, WS_EVENTS.FILE_ERROR, {
        path: filePath,
        error: message,
        code: isAppError(error) ? error.code : 'INTERNAL_ERROR',
      }, correlationId);
    }
  },

  /**
   * Watch directory for changes
   */
  [WS_EVENTS.FILE_WATCH]: async (socket, payload, correlationId, fileManager) => {
    const data = payload as FileWatchPayload;

    if (!data.path) {
      sendError(socket, 'VALIDATION_FAILED', 'path is required', correlationId);
      return;
    }

    try {
      const unwatch = fileManager.watchDirectory(data.path, (change) => {
        socket.emit(WS_EVENTS.FILE_CHANGED, change);
      });

      // Store unwatch function for cleanup on disconnect
      socket.on('disconnect', unwatch);

      sendMessage(socket, WS_EVENTS.FILE_WATCH_RESPONSE, {
        success: true,
        path: data.path,
      }, correlationId);
    } catch (error) {
      logger.error({ error, path: data.path }, 'Failed to watch directory');
      const message = isAppError(error) ? error.message : 'Failed to watch directory';
      sendMessage(socket, WS_EVENTS.FILE_ERROR, {
        path: data.path,
        error: message,
        code: isAppError(error) ? error.code : 'INTERNAL_ERROR',
      }, correlationId);
    }
  },

  /**
   * Read file content (for Quick Reader)
   */
  [WS_EVENTS.FILE_READ]: async (socket, payload, correlationId, fileManager) => {
    const result = fileReadPayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const content = await fileManager.readFileContent(result.data.path, {
        startLine: result.data.startLine,
        endLine: result.data.endLine,
        maxBytes: result.data.maxBytes,
      });

      const language = fileManager.detectLanguage(result.data.path);

      sendMessage(socket, WS_EVENTS.FILE_READ_RESPONSE, {
        path: result.data.path,
        language,
        ...content,
      }, correlationId);
    } catch (error) {
      logger.error({ error, path: result.data.path }, 'Failed to read file');
      const message = isAppError(error) ? error.message : 'Failed to read file';
      sendMessage(socket, WS_EVENTS.FILE_ERROR, {
        path: result.data.path,
        error: message,
        code: isAppError(error) ? error.code : 'INTERNAL_ERROR',
      }, correlationId);
    }
  },

  /**
   * Read image file as base64
   */
  [WS_EVENTS.FILE_READ_IMAGE]: async (socket, payload, correlationId, fileManager) => {
    const result = fileReadImagePayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const imageData = await fileManager.readFileAsBase64(result.data.path, result.data.maxBytes);

      sendMessage(socket, WS_EVENTS.FILE_READ_IMAGE_RESPONSE, {
        path: result.data.path,
        ...imageData,
      }, correlationId);
    } catch (error) {
      logger.error({ error, path: result.data.path }, 'Failed to read image');
      const message = isAppError(error) ? error.message : 'Failed to read image';
      sendMessage(socket, WS_EVENTS.FILE_ERROR, {
        path: result.data.path,
        error: message,
        code: isAppError(error) ? error.code : 'INTERNAL_ERROR',
      }, correlationId);
    }
  },

  /**
   * Write file content
   */
  [WS_EVENTS.FILE_WRITE]: async (socket, payload, correlationId, fileManager) => {
    const result = fileWritePayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const writeResult = await fileManager.writeFileContent(result.data.path, result.data.content, {
        createDirectories: result.data.createDirectories,
      });

      sendMessage(socket, WS_EVENTS.FILE_WRITE_RESPONSE, {
        path: result.data.path,
        ...writeResult,
      }, correlationId);

      logger.info({ path: result.data.path }, 'File written successfully');
    } catch (error) {
      logger.error({ error, path: result.data.path }, 'Failed to write file');
      const message = isAppError(error) ? error.message : 'Failed to write file';
      sendMessage(socket, WS_EVENTS.FILE_ERROR, {
        path: result.data.path,
        error: message,
        code: isAppError(error) ? error.code : 'INTERNAL_ERROR',
      }, correlationId);
    }
  },

  /**
   * Create a new file
   */
  [WS_EVENTS.FILE_CREATE]: async (socket, payload, correlationId, fileManager) => {
    const result = fileCreatePayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const createResult = await fileManager.createFile(
        result.data.parentPath,
        result.data.name,
        result.data.content
      );

      sendMessage(socket, WS_EVENTS.FILE_CREATE_RESPONSE, {
        success: true,
        path: createResult.path,
        entry: createResult.entry,
      }, correlationId);

      logger.info({ path: createResult.path }, 'File created successfully');
    } catch (error) {
      logger.error({ error, parentPath: result.data.parentPath, name: result.data.name }, 'Failed to create file');
      const message = isAppError(error) ? error.message : 'Failed to create file';
      sendMessage(socket, WS_EVENTS.FILE_CREATE_RESPONSE, {
        success: false,
        error: message,
      }, correlationId);
    }
  },

  /**
   * Create a new folder
   */
  [WS_EVENTS.FILE_CREATE_FOLDER]: async (socket, payload, correlationId, fileManager) => {
    const result = fileCreateFolderPayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const createResult = await fileManager.createFolder(
        result.data.parentPath,
        result.data.name
      );

      sendMessage(socket, WS_EVENTS.FILE_CREATE_FOLDER_RESPONSE, {
        success: true,
        path: createResult.path,
        entry: createResult.entry,
      }, correlationId);

      logger.info({ path: createResult.path }, 'Folder created successfully');
    } catch (error) {
      logger.error({ error, parentPath: result.data.parentPath, name: result.data.name }, 'Failed to create folder');
      const message = isAppError(error) ? error.message : 'Failed to create folder';
      sendMessage(socket, WS_EVENTS.FILE_CREATE_FOLDER_RESPONSE, {
        success: false,
        error: message,
      }, correlationId);
    }
  },

  /**
   * Rename a file or folder
   */
  [WS_EVENTS.FILE_RENAME]: async (socket, payload, correlationId, fileManager) => {
    const result = fileRenamePayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const renameResult = await fileManager.rename(
        result.data.path,
        result.data.newName
      );

      sendMessage(socket, WS_EVENTS.FILE_RENAME_RESPONSE, {
        success: true,
        oldPath: renameResult.oldPath,
        newPath: renameResult.newPath,
        entry: renameResult.entry,
      }, correlationId);

      logger.info({ oldPath: renameResult.oldPath, newPath: renameResult.newPath }, 'File/folder renamed successfully');
    } catch (error) {
      logger.error({ error, path: result.data.path, newName: result.data.newName }, 'Failed to rename file/folder');
      const message = isAppError(error) ? error.message : 'Failed to rename';
      sendMessage(socket, WS_EVENTS.FILE_RENAME_RESPONSE, {
        success: false,
        error: message,
      }, correlationId);
    }
  },

  /**
   * Delete files or folders
   */
  [WS_EVENTS.FILE_DELETE]: async (socket, payload, correlationId, fileManager) => {
    const result = fileDeletePayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const deleteResult = await fileManager.deleteItems(result.data.paths);

      sendMessage(socket, WS_EVENTS.FILE_DELETE_RESPONSE, {
        success: deleteResult.failedPaths.length === 0,
        deletedPaths: deleteResult.deletedPaths,
        failedPaths: deleteResult.failedPaths.length > 0 ? deleteResult.failedPaths : undefined,
      }, correlationId);

      logger.info({ deletedCount: deleteResult.deletedPaths.length }, 'Delete operation completed');
    } catch (error) {
      logger.error({ error, paths: result.data.paths }, 'Failed to delete files/folders');
      const message = isAppError(error) ? error.message : 'Failed to delete';
      sendMessage(socket, WS_EVENTS.FILE_DELETE_RESPONSE, {
        success: false,
        error: message,
      }, correlationId);
    }
  },

  /**
   * Copy files or folders
   */
  [WS_EVENTS.FILE_COPY]: async (socket, payload, correlationId, fileManager) => {
    const result = fileCopyPayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const copyResult = await fileManager.copyItems(
        result.data.sourcePaths,
        result.data.destinationPath
      );

      sendMessage(socket, WS_EVENTS.FILE_COPY_RESPONSE, {
        success: copyResult.failedPaths.length === 0,
        copiedPaths: copyResult.copiedPaths,
        failedPaths: copyResult.failedPaths.length > 0 ? copyResult.failedPaths : undefined,
      }, correlationId);

      logger.info({ copiedCount: copyResult.copiedPaths.length }, 'Copy operation completed');
    } catch (error) {
      logger.error({ error, sourcePaths: result.data.sourcePaths, destinationPath: result.data.destinationPath }, 'Failed to copy files/folders');
      const message = isAppError(error) ? error.message : 'Failed to copy';
      sendMessage(socket, WS_EVENTS.FILE_COPY_RESPONSE, {
        success: false,
        error: message,
      }, correlationId);
    }
  },

  /**
   * Move files or folders
   */
  [WS_EVENTS.FILE_MOVE]: async (socket, payload, correlationId, fileManager) => {
    const result = fileMovePayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const moveResult = await fileManager.moveItems(
        result.data.sourcePaths,
        result.data.destinationPath
      );

      sendMessage(socket, WS_EVENTS.FILE_MOVE_RESPONSE, {
        success: moveResult.failedPaths.length === 0,
        movedPaths: moveResult.movedPaths,
        failedPaths: moveResult.failedPaths.length > 0 ? moveResult.failedPaths : undefined,
      }, correlationId);

      logger.info({ movedCount: moveResult.movedPaths.length }, 'Move operation completed');
    } catch (error) {
      logger.error({ error, sourcePaths: result.data.sourcePaths, destinationPath: result.data.destinationPath }, 'Failed to move files/folders');
      const message = isAppError(error) ? error.message : 'Failed to move';
      sendMessage(socket, WS_EVENTS.FILE_MOVE_RESPONSE, {
        success: false,
        error: message,
      }, correlationId);
    }
  },
};

/**
 * Check if an event is a file event
 */
export function isFileEvent(event: string): boolean {
  return event.startsWith('file:');
}

/**
 * Get file event handler
 */
export function getFileHandler(event: string): FileEventHandler | undefined {
  return fileHandlers[event];
}

/**
 * Get list of handled file events
 */
export function getFileHandledEvents(): string[] {
  return Object.keys(fileHandlers);
}
