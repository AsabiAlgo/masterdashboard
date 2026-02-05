/**
 * WebSocket Event Handlers
 *
 * Handles all WebSocket events for terminal and browser sessions.
 */

import { Socket } from 'socket.io';
import {
  WS_EVENTS,
  SessionType,
  terminalConfigSchema,
  terminalInputPayloadSchema,
  terminalResizePayloadSchema,
} from '@masterdashboard/shared';
import { SessionManager } from '../managers/session-manager.js';
import { BrowserManager } from '../managers/browser-manager.js';
import { createChildLogger } from '../utils/logger.js';
import { isAppError } from '../utils/errors.js';
import { sendMessage, sendError, getClientId, checkRateLimit } from './middleware.js';
import { handleReconnect, handleTerminalReconnect } from './reconnect.js';
import { createBrowserSession, terminateBrowserSession } from './browser-handlers.js';

const logger = createChildLogger('ws-handlers');

/**
 * Filter out terminal device attribute responses from input.
 * When tmux queries terminal capabilities (ESC[c, ESC[>c), xterm.js responds
 * with sequences like ESC[?1;2c and ESC[>0;276;0c. These responses should be
 * consumed by tmux, but sometimes they get echoed as visible text.
 * Filter them to prevent garbage characters from appearing.
 */
function filterDeviceAttributeResponses(input: string): string {
  // ESC [ ? Ps c - Primary Device Attributes response
  // ESC [ > Ps ; Ps ; Ps c - Secondary Device Attributes response
  return input
    .replace(/\x1b\[\?[\d;]*c/g, '')  // Primary DA with ESC
    .replace(/\x1b\[>[\d;]*c/g, '');   // Secondary DA with ESC
}

type EventHandler = (
  socket: Socket,
  payload: unknown,
  correlationId: string | undefined,
  sessionManager: SessionManager,
  browserManager?: BrowserManager
) => Promise<void> | void;

/**
 * Map of event names to handlers
 */
const handlers: Record<string, EventHandler> = {
  /**
   * Handle session creation (terminal or browser)
   */
  [WS_EVENTS.SESSION_CREATE]: async (socket, payload, correlationId, sessionManager, browserManager) => {
    logger.info({ payload }, 'SESSION_CREATE received');

    const clientId = getClientId(socket);
    logger.info({ clientId }, 'Got client ID');

    if (!clientId) {
      sendError(socket, 'UNAUTHORIZED', 'Client not registered', correlationId);
      return;
    }

    const data = payload as { type?: string; config?: unknown };
    logger.info({ type: data.type, config: data.config }, 'Parsed payload');

    // Handle browser session creation
    if (data.type === SessionType.BROWSER) {
      if (!browserManager) {
        sendError(socket, 'NOT_AVAILABLE', 'Browser manager not initialized', correlationId);
        return;
      }
      await createBrowserSession(socket, clientId, data.config, correlationId, browserManager);
      return;
    }

    // Handle terminal session creation
    if (data.type !== SessionType.TERMINAL) {
      sendError(socket, 'NOT_IMPLEMENTED', 'Only terminal and browser sessions are supported', correlationId);
      return;
    }

    // Validate terminal config
    const configResult = terminalConfigSchema.safeParse(data.config);
    logger.info({ success: configResult.success, error: configResult.success ? null : configResult.error?.message }, 'Config validation');

    if (!configResult.success) {
      sendError(
        socket,
        'VALIDATION_FAILED',
        `Invalid config: ${configResult.error.message}`,
        correlationId
      );
      return;
    }

    try {
      const session = await sessionManager.createTerminalSession(clientId, configResult.data);

      sendMessage(
        socket,
        WS_EVENTS.SESSION_CREATED,
        {
          sessionId: session.id,
          type: session.type,
          projectId: session.projectId,
          status: session.status,
        },
        correlationId
      );
    } catch (error) {
      logger.error({ error, clientId }, 'Failed to create session');
      const message = isAppError(error) ? error.message : 'Failed to create session';
      sendError(socket, 'SESSION_CREATE_FAILED', message, correlationId);
    }
  },

  /**
   * Handle session termination (terminal or browser)
   */
  [WS_EVENTS.SESSION_TERMINATE]: async (socket, payload, correlationId, sessionManager, browserManager) => {
    const data = payload as { sessionId?: string };

    if (!data.sessionId) {
      sendError(socket, 'VALIDATION_FAILED', 'sessionId is required', correlationId);
      return;
    }

    try {
      // Check if it's a browser session (starts with 'browser_')
      if (data.sessionId.startsWith('browser_') && browserManager) {
        await terminateBrowserSession(data.sessionId, browserManager);
      } else {
        await sessionManager.terminateSession(data.sessionId);
      }
      sendMessage(
        socket,
        WS_EVENTS.SESSION_TERMINATED,
        { sessionId: data.sessionId },
        correlationId
      );
    } catch (error) {
      logger.error({ error, sessionId: data.sessionId }, 'Failed to terminate session');
      const message = isAppError(error) ? error.message : 'Failed to terminate session';
      sendError(socket, 'SESSION_TERMINATE_FAILED', message, correlationId);
    }
  },

  /**
   * Handle session list request
   */
  [WS_EVENTS.SESSION_LIST]: (socket, payload, correlationId, sessionManager) => {
    const data = payload as { projectId?: string };

    if (!data.projectId) {
      sendError(socket, 'VALIDATION_FAILED', 'projectId is required', correlationId);
      return;
    }

    const sessions = sessionManager.getSessionsByProject(data.projectId);

    sendMessage(
      socket,
      WS_EVENTS.SESSION_LIST_RESPONSE,
      {
        projectId: data.projectId,
        sessions: sessions.map((s) => ({
          id: s.id,
          type: s.type,
          status: s.status,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
        })),
      },
      correlationId
    );
  },

  /**
   * Handle terminal input
   */
  [WS_EVENTS.TERMINAL_INPUT]: (socket, payload, correlationId, sessionManager) => {
    // Rate limit check
    if (!checkRateLimit(socket, WS_EVENTS.TERMINAL_INPUT)) {
      sendError(socket, 'RATE_LIMITED', 'Too many input events', correlationId);
      return;
    }

    const result = terminalInputPayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    // Filter out device attribute responses that xterm.js sends back to tmux
    // These would otherwise appear as garbage text like "[?1;2c[>0;276;0c"
    const filteredData = filterDeviceAttributeResponses(result.data.data);

    // Skip if the entire input was device attribute responses
    if (!filteredData) {
      return;
    }

    try {
      sessionManager.writeToTerminal(result.data.sessionId, filteredData);
    } catch (error) {
      const message = isAppError(error) ? error.message : 'Failed to write to terminal';
      // Send SESSION_ERROR with sessionId so frontend can handle it
      sendMessage(socket, WS_EVENTS.SESSION_ERROR, {
        sessionId: result.data.sessionId,
        error: message,
        code: 'TERMINAL_WRITE_FAILED',
      }, correlationId);
    }
  },

  /**
   * Handle terminal resize
   */
  [WS_EVENTS.TERMINAL_RESIZE]: (socket, payload, correlationId, sessionManager) => {
    // Rate limit check
    if (!checkRateLimit(socket, WS_EVENTS.TERMINAL_RESIZE)) {
      return; // Silently ignore resize events when rate limited
    }

    const result = terminalResizePayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      sessionManager.resizeTerminal(result.data.sessionId, result.data.cols, result.data.rows);
    } catch (error) {
      const message = isAppError(error) ? error.message : 'Failed to resize terminal';
      sendError(socket, 'TERMINAL_RESIZE_FAILED', message, correlationId);
    }
  },

  /**
   * Handle terminal reconnect request
   */
  [WS_EVENTS.TERMINAL_RECONNECT]: async (socket, payload, correlationId, sessionManager) => {
    const clientId = getClientId(socket);
    if (!clientId) {
      sendError(socket, 'UNAUTHORIZED', 'Client not registered', correlationId);
      return;
    }

    const data = payload as { sessionId?: string };
    if (!data.sessionId) {
      sendError(socket, 'VALIDATION_FAILED', 'sessionId is required', correlationId);
      return;
    }

    await handleTerminalReconnect(socket, clientId, data.sessionId, sessionManager, correlationId);
  },

  /**
   * Handle client reconnect (reconnect all sessions)
   */
  [WS_EVENTS.RECONNECT]: async (socket, payload, correlationId, sessionManager) => {
    const clientId = getClientId(socket);
    if (!clientId) {
      sendError(socket, 'UNAUTHORIZED', 'Client not registered', correlationId);
      return;
    }

    const data = payload as { projectId?: string; sessionIds?: string[] };

    if (!data.projectId || !Array.isArray(data.sessionIds)) {
      sendError(socket, 'VALIDATION_FAILED', 'projectId and sessionIds are required', correlationId);
      return;
    }

    await handleReconnect(socket, clientId, data, sessionManager, correlationId);
  },

  /**
   * Handle ping
   */
  [WS_EVENTS.PING]: (socket, _payload, correlationId) => {
    sendMessage(socket, WS_EVENTS.PONG, { timestamp: Date.now() }, correlationId);
  },
};

/**
 * Get the handler for an event
 */
export function getHandler(event: string): EventHandler | undefined {
  return handlers[event];
}

/**
 * Check if an event has a handler
 */
export function hasHandler(event: string): boolean {
  return event in handlers;
}

/**
 * Get all registered event names
 */
export function getHandledEvents(): string[] {
  return Object.keys(handlers);
}
