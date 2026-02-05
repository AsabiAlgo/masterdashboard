/**
 * SSH WebSocket Event Handlers
 *
 * Handles all WebSocket events for SSH sessions.
 */

import { Socket } from 'socket.io';
import {
  WS_EVENTS,
  sshConfigSchema,
  type SSHConfig,
} from '@masterdashboard/shared';
import { SSHManager } from '../managers/ssh-manager.js';
import { createChildLogger } from '../utils/logger.js';
import { isAppError } from '../utils/errors.js';
import { sendMessage, sendError, getClientId, checkRateLimit } from './middleware.js';

const logger = createChildLogger('ssh-handlers');

type SSHEventHandler = (
  socket: Socket,
  payload: unknown,
  correlationId: string | undefined,
  sshManager: SSHManager
) => Promise<void> | void;

/**
 * Map of SSH event names to handlers
 */
export const sshHandlers: Record<string, SSHEventHandler> = {
  /**
   * Handle SSH connection request
   */
  [WS_EVENTS.SSH_CONNECT]: async (socket, payload, correlationId, sshManager) => {
    const clientId = getClientId(socket);
    if (!clientId) {
      sendError(socket, 'UNAUTHORIZED', 'Client not registered', correlationId);
      return;
    }

    // Validate SSH config
    const configResult = sshConfigSchema.safeParse(payload);
    if (!configResult.success) {
      sendError(
        socket,
        'VALIDATION_FAILED',
        `Invalid SSH config: ${configResult.error.message}`,
        correlationId
      );
      return;
    }

    const config = configResult.data as SSHConfig;

    logger.info(
      { clientId, host: config.host, username: config.username },
      'SSH connection requested'
    );

    try {
      const session = await sshManager.connect(config);

      sendMessage(
        socket,
        WS_EVENTS.SSH_CONNECTED,
        {
          sessionId: session.id,
          host: session.host,
          port: session.port,
          username: session.username,
        },
        correlationId
      );
    } catch (error) {
      logger.error({ error, host: config.host }, 'SSH connection failed');
      const message = isAppError(error) ? error.message : 'SSH connection failed';
      sendError(socket, 'SSH_CONNECTION_FAILED', message, correlationId);
    }
  },

  /**
   * Handle SSH input (keyboard data)
   */
  [WS_EVENTS.SSH_INPUT]: (socket, payload, correlationId, sshManager) => {
    // Rate limit check
    if (!checkRateLimit(socket, WS_EVENTS.SSH_INPUT)) {
      sendError(socket, 'RATE_LIMITED', 'Too many input events', correlationId);
      return;
    }

    const data = payload as { sessionId?: string; data?: string };

    if (!data.sessionId || typeof data.data !== 'string') {
      sendError(socket, 'VALIDATION_FAILED', 'sessionId and data are required', correlationId);
      return;
    }

    const success = sshManager.write(data.sessionId, data.data);
    if (!success) {
      sendError(socket, 'SSH_NOT_FOUND', `SSH session not found: ${data.sessionId}`, correlationId);
    }
  },

  /**
   * Handle SSH close request
   */
  [WS_EVENTS.SSH_CLOSE]: (socket, payload, correlationId, sshManager) => {
    const data = payload as { sessionId?: string };

    if (!data.sessionId) {
      sendError(socket, 'VALIDATION_FAILED', 'sessionId is required', correlationId);
      return;
    }

    sshManager.disconnect(data.sessionId);

    sendMessage(
      socket,
      'ssh:closed',
      { sessionId: data.sessionId },
      correlationId
    );
  },

  /**
   * Handle SSH resize
   */
  'ssh:resize': (socket, payload, correlationId, sshManager) => {
    // Rate limit check - use TERMINAL_RESIZE rate limit for SSH resize
    if (!checkRateLimit(socket, WS_EVENTS.TERMINAL_RESIZE)) {
      return; // Silently ignore resize events when rate limited
    }

    const data = payload as { sessionId?: string; cols?: number; rows?: number };

    if (!data.sessionId || typeof data.cols !== 'number' || typeof data.rows !== 'number') {
      sendError(
        socket,
        'VALIDATION_FAILED',
        'sessionId, cols, and rows are required',
        correlationId
      );
      return;
    }

    const success = sshManager.resize(data.sessionId, data.cols, data.rows);
    if (!success) {
      sendError(socket, 'SSH_NOT_FOUND', `SSH session not found: ${data.sessionId}`, correlationId);
    }
  },

  /**
   * Handle keyboard-interactive response
   */
  'ssh:keyboard-interactive-response': (socket, payload, correlationId, sshManager) => {
    const data = payload as { sessionId?: string; responses?: string[] };

    if (!data.sessionId || !Array.isArray(data.responses)) {
      sendError(
        socket,
        'VALIDATION_FAILED',
        'sessionId and responses are required',
        correlationId
      );
      return;
    }

    const success = sshManager.respondKeyboardInteractive(data.sessionId, data.responses);
    if (!success) {
      sendError(
        socket,
        'SSH_NOT_FOUND',
        'No keyboard-interactive callback pending',
        correlationId
      );
    }
  },
};

/**
 * Get the handler for an SSH event
 */
export function getSSHHandler(event: string): SSHEventHandler | undefined {
  return sshHandlers[event];
}

/**
 * Check if an event is an SSH event
 */
export function isSSHEvent(event: string): boolean {
  return event in sshHandlers;
}

/**
 * Get all registered SSH event names
 */
export function getSSHHandledEvents(): string[] {
  return Object.keys(sshHandlers);
}
