/**
 * Git WebSocket Handlers
 *
 * Handles git operation events for the GitNode component.
 */

import { Socket } from 'socket.io';
import { WS_EVENTS } from '@masterdashboard/shared';
import { z } from 'zod';
import { GitManager } from '../managers/git-manager.js';
import { createChildLogger } from '../utils/logger.js';
import { sendMessage, sendError } from './middleware.js';

const logger = createChildLogger('git-handlers');

// Validation schemas
const gitStatusPayloadSchema = z.object({
  repoPath: z.string().min(1),
  projectId: z.string().min(1),
});

const gitLogPayloadSchema = z.object({
  repoPath: z.string().min(1),
  projectId: z.string().min(1),
  limit: z.number().int().min(1).max(500).optional().default(50),
  skip: z.number().int().min(0).optional().default(0),
});

const gitBranchesPayloadSchema = z.object({
  repoPath: z.string().min(1),
  projectId: z.string().min(1),
  includeRemote: z.boolean().optional().default(false),
});

const gitCheckoutPayloadSchema = z.object({
  repoPath: z.string().min(1),
  projectId: z.string().min(1),
  branch: z.string().min(1),
  create: z.boolean().optional().default(false),
});

const gitStagePayloadSchema = z.object({
  repoPath: z.string().min(1),
  projectId: z.string().min(1),
  files: z.array(z.string()),
});

const gitUnstagePayloadSchema = z.object({
  repoPath: z.string().min(1),
  projectId: z.string().min(1),
  files: z.array(z.string()),
});

const gitCommitPayloadSchema = z.object({
  repoPath: z.string().min(1),
  projectId: z.string().min(1),
  message: z.string().min(1),
});

const gitPushPayloadSchema = z.object({
  repoPath: z.string().min(1),
  projectId: z.string().min(1),
  force: z.boolean().optional().default(false),
});

const gitPullPayloadSchema = z.object({
  repoPath: z.string().min(1),
  projectId: z.string().min(1),
  rebase: z.boolean().optional().default(false),
});

const gitDiscardPayloadSchema = z.object({
  repoPath: z.string().min(1),
  projectId: z.string().min(1),
  files: z.array(z.string()),
});

type GitEventHandler = (
  socket: Socket,
  payload: unknown,
  correlationId: string | undefined,
  gitManager: GitManager
) => Promise<void> | void;

/**
 * Map of git event names to handlers
 */
const gitHandlers: Record<string, GitEventHandler> = {
  /**
   * Get repository status
   */
  [WS_EVENTS.GIT_STATUS]: async (socket, payload, correlationId, gitManager) => {
    const result = gitStatusPayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const status = await gitManager.getStatus(result.data.repoPath);

      sendMessage(socket, WS_EVENTS.GIT_STATUS_RESPONSE, {
        repoPath: result.data.repoPath,
        status,
      }, correlationId);
    } catch (error) {
      logger.error({ error, repoPath: result.data.repoPath }, 'Failed to get git status');
      const message = error instanceof Error ? error.message : 'Failed to get git status';
      sendMessage(socket, WS_EVENTS.GIT_ERROR, {
        repoPath: result.data.repoPath,
        error: message,
        code: 'STATUS_FAILED',
      }, correlationId);
    }
  },

  /**
   * Get commit log
   */
  [WS_EVENTS.GIT_LOG]: async (socket, payload, correlationId, gitManager) => {
    const result = gitLogPayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const logResult = await gitManager.getLog(
        result.data.repoPath,
        result.data.limit,
        result.data.skip
      );

      sendMessage(socket, WS_EVENTS.GIT_LOG_RESPONSE, {
        repoPath: result.data.repoPath,
        ...logResult,
      }, correlationId);
    } catch (error) {
      logger.error({ error, repoPath: result.data.repoPath }, 'Failed to get git log');
      const message = error instanceof Error ? error.message : 'Failed to get git log';
      sendMessage(socket, WS_EVENTS.GIT_ERROR, {
        repoPath: result.data.repoPath,
        error: message,
        code: 'LOG_FAILED',
      }, correlationId);
    }
  },

  /**
   * Get branches
   */
  [WS_EVENTS.GIT_BRANCHES]: async (socket, payload, correlationId, gitManager) => {
    const result = gitBranchesPayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const branchesResult = await gitManager.getBranches(
        result.data.repoPath,
        result.data.includeRemote
      );

      sendMessage(socket, WS_EVENTS.GIT_BRANCHES_RESPONSE, {
        repoPath: result.data.repoPath,
        ...branchesResult,
      }, correlationId);
    } catch (error) {
      logger.error({ error, repoPath: result.data.repoPath }, 'Failed to get branches');
      const message = error instanceof Error ? error.message : 'Failed to get branches';
      sendMessage(socket, WS_EVENTS.GIT_ERROR, {
        repoPath: result.data.repoPath,
        error: message,
        code: 'BRANCHES_FAILED',
      }, correlationId);
    }
  },

  /**
   * Checkout branch
   */
  [WS_EVENTS.GIT_CHECKOUT]: async (socket, payload, correlationId, gitManager) => {
    const result = gitCheckoutPayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const checkoutResult = await gitManager.checkout(
        result.data.repoPath,
        result.data.branch,
        result.data.create
      );

      sendMessage(socket, WS_EVENTS.GIT_CHECKOUT_RESPONSE, {
        repoPath: result.data.repoPath,
        result: checkoutResult,
        branch: checkoutResult.success ? result.data.branch : undefined,
      }, correlationId);
    } catch (error) {
      logger.error({ error, repoPath: result.data.repoPath }, 'Failed to checkout');
      const message = error instanceof Error ? error.message : 'Failed to checkout';
      sendMessage(socket, WS_EVENTS.GIT_ERROR, {
        repoPath: result.data.repoPath,
        error: message,
        code: 'CHECKOUT_FAILED',
      }, correlationId);
    }
  },

  /**
   * Stage files
   */
  [WS_EVENTS.GIT_STAGE]: async (socket, payload, correlationId, gitManager) => {
    const result = gitStagePayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const stageResult = await gitManager.stage(result.data.repoPath, result.data.files);

      sendMessage(socket, WS_EVENTS.GIT_STAGE_RESPONSE, {
        repoPath: result.data.repoPath,
        result: stageResult,
      }, correlationId);
    } catch (error) {
      logger.error({ error, repoPath: result.data.repoPath }, 'Failed to stage files');
      const message = error instanceof Error ? error.message : 'Failed to stage files';
      sendMessage(socket, WS_EVENTS.GIT_ERROR, {
        repoPath: result.data.repoPath,
        error: message,
        code: 'STAGE_FAILED',
      }, correlationId);
    }
  },

  /**
   * Unstage files
   */
  [WS_EVENTS.GIT_UNSTAGE]: async (socket, payload, correlationId, gitManager) => {
    const result = gitUnstagePayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const unstageResult = await gitManager.unstage(result.data.repoPath, result.data.files);

      sendMessage(socket, WS_EVENTS.GIT_UNSTAGE_RESPONSE, {
        repoPath: result.data.repoPath,
        result: unstageResult,
      }, correlationId);
    } catch (error) {
      logger.error({ error, repoPath: result.data.repoPath }, 'Failed to unstage files');
      const message = error instanceof Error ? error.message : 'Failed to unstage files';
      sendMessage(socket, WS_EVENTS.GIT_ERROR, {
        repoPath: result.data.repoPath,
        error: message,
        code: 'UNSTAGE_FAILED',
      }, correlationId);
    }
  },

  /**
   * Commit changes
   */
  [WS_EVENTS.GIT_COMMIT]: async (socket, payload, correlationId, gitManager) => {
    const result = gitCommitPayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const commitResult = await gitManager.commit(result.data.repoPath, result.data.message);

      sendMessage(socket, WS_EVENTS.GIT_COMMIT_RESPONSE, {
        repoPath: result.data.repoPath,
        result: commitResult,
        commitHash: commitResult.commitHash,
      }, correlationId);
    } catch (error) {
      logger.error({ error, repoPath: result.data.repoPath }, 'Failed to commit');
      const message = error instanceof Error ? error.message : 'Failed to commit';
      sendMessage(socket, WS_EVENTS.GIT_ERROR, {
        repoPath: result.data.repoPath,
        error: message,
        code: 'COMMIT_FAILED',
      }, correlationId);
    }
  },

  /**
   * Push to remote
   */
  [WS_EVENTS.GIT_PUSH]: async (socket, payload, correlationId, gitManager) => {
    const result = gitPushPayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const pushResult = await gitManager.push(result.data.repoPath, result.data.force);

      sendMessage(socket, WS_EVENTS.GIT_PUSH_RESPONSE, {
        repoPath: result.data.repoPath,
        result: pushResult,
      }, correlationId);
    } catch (error) {
      logger.error({ error, repoPath: result.data.repoPath }, 'Failed to push');
      const message = error instanceof Error ? error.message : 'Failed to push';
      sendMessage(socket, WS_EVENTS.GIT_ERROR, {
        repoPath: result.data.repoPath,
        error: message,
        code: 'PUSH_FAILED',
      }, correlationId);
    }
  },

  /**
   * Pull from remote
   */
  [WS_EVENTS.GIT_PULL]: async (socket, payload, correlationId, gitManager) => {
    const result = gitPullPayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const pullResult = await gitManager.pull(result.data.repoPath, result.data.rebase);

      sendMessage(socket, WS_EVENTS.GIT_PULL_RESPONSE, {
        repoPath: result.data.repoPath,
        result: pullResult,
      }, correlationId);
    } catch (error) {
      logger.error({ error, repoPath: result.data.repoPath }, 'Failed to pull');
      const message = error instanceof Error ? error.message : 'Failed to pull';
      sendMessage(socket, WS_EVENTS.GIT_ERROR, {
        repoPath: result.data.repoPath,
        error: message,
        code: 'PULL_FAILED',
      }, correlationId);
    }
  },

  /**
   * Discard changes
   */
  [WS_EVENTS.GIT_DISCARD]: async (socket, payload, correlationId, gitManager) => {
    const result = gitDiscardPayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      const discardResult = await gitManager.discard(result.data.repoPath, result.data.files);

      sendMessage(socket, WS_EVENTS.GIT_DISCARD_RESPONSE, {
        repoPath: result.data.repoPath,
        result: discardResult,
      }, correlationId);
    } catch (error) {
      logger.error({ error, repoPath: result.data.repoPath }, 'Failed to discard changes');
      const message = error instanceof Error ? error.message : 'Failed to discard changes';
      sendMessage(socket, WS_EVENTS.GIT_ERROR, {
        repoPath: result.data.repoPath,
        error: message,
        code: 'DISCARD_FAILED',
      }, correlationId);
    }
  },
};

/**
 * Check if an event is a git event
 */
export function isGitEvent(event: string): boolean {
  return event.startsWith('git:');
}

/**
 * Get git event handler
 */
export function getGitHandler(event: string): GitEventHandler | undefined {
  return gitHandlers[event];
}

/**
 * Get list of handled git events
 */
export function getGitHandledEvents(): string[] {
  return Object.keys(gitHandlers);
}
