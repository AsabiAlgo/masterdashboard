/**
 * Browser WebSocket Event Handlers
 *
 * Handles all WebSocket events for browser sessions using Playwright.
 */

import { Socket } from 'socket.io';
import { z } from 'zod';
import {
  WS_EVENTS,
  SessionType,
  browserConfigSchema,
  type BrowserConfig,
  type BrowserInputPayload,
} from '@masterdashboard/shared';
import { BrowserManager } from '../managers/browser-manager.js';
import { createChildLogger } from '../utils/logger.js';
import { isAppError } from '../utils/errors.js';
import { sendMessage, sendError, checkRateLimit } from './middleware.js';

const logger = createChildLogger('browser-handlers');

type BrowserEventHandler = (
  socket: Socket,
  payload: unknown,
  correlationId: string | undefined,
  browserManager: BrowserManager
) => Promise<void> | void;

/**
 * Schema for browser input payload validation
 */
const browserInputPayloadSchema = z.object({
  sessionId: z.string().min(6),
  type: z.enum([
    'click',
    'dblclick',
    'rightclick',
    'type',
    'scroll',
    'keypress',
    'keydown',
    'keyup',
    'mousemove',
    'mousedown',
    'mouseup',
  ]),
  x: z.number().optional(),
  y: z.number().optional(),
  text: z.string().optional(),
  key: z.string().optional(),
  deltaX: z.number().optional(),
  deltaY: z.number().optional(),
  modifiers: z
    .object({
      ctrl: z.boolean().optional(),
      alt: z.boolean().optional(),
      shift: z.boolean().optional(),
      meta: z.boolean().optional(),
    })
    .optional(),
});

/**
 * Schema for browser navigation payload validation
 */
const browserNavigatePayloadSchema = z.object({
  sessionId: z.string().min(6),
  url: z.string().min(1),
});

/**
 * Map of Browser event names to handlers
 */
export const browserHandlers: Record<string, BrowserEventHandler> = {
  /**
   * Handle browser input events
   */
  [WS_EVENTS.BROWSER_INPUT]: async (socket, payload, correlationId, browserManager) => {
    // Rate limit check
    if (!checkRateLimit(socket, WS_EVENTS.BROWSER_INPUT)) {
      sendError(socket, 'RATE_LIMITED', 'Too many input events', correlationId);
      return;
    }

    const result = browserInputPayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    try {
      await browserManager.handleInput(result.data.sessionId, result.data as BrowserInputPayload);
    } catch (error) {
      const message = isAppError(error) ? error.message : 'Failed to handle browser input';
      sendError(socket, 'BROWSER_INPUT_FAILED', message, correlationId);
    }
  },

  /**
   * Handle browser navigation
   */
  [WS_EVENTS.BROWSER_NAVIGATE]: async (socket, payload, correlationId, browserManager) => {
    const result = browserNavigatePayloadSchema.safeParse(payload);
    if (!result.success) {
      sendError(socket, 'VALIDATION_FAILED', result.error.message, correlationId);
      return;
    }

    logger.debug({ sessionId: result.data.sessionId, url: result.data.url }, 'Browser navigation requested');

    try {
      const navResult = await browserManager.navigate(result.data.sessionId, result.data.url);

      sendMessage(
        socket,
        WS_EVENTS.BROWSER_NAVIGATE_RESULT,
        {
          sessionId: result.data.sessionId,
          ...navResult,
        },
        correlationId
      );
    } catch (error) {
      const message = isAppError(error) ? error.message : 'Navigation failed';
      sendError(socket, 'BROWSER_NAVIGATE_FAILED', message, correlationId);
    }
  },

  /**
   * Handle browser go back
   */
  'browser:back': async (socket, payload, correlationId, browserManager) => {
    const data = payload as { sessionId?: string };

    if (!data.sessionId) {
      sendError(socket, 'VALIDATION_FAILED', 'sessionId is required', correlationId);
      return;
    }

    try {
      const result = await browserManager.goBack(data.sessionId);
      sendMessage(
        socket,
        WS_EVENTS.BROWSER_NAVIGATE_RESULT,
        { sessionId: data.sessionId, ...result },
        correlationId
      );
    } catch (error) {
      const message = isAppError(error) ? error.message : 'Go back failed';
      sendError(socket, 'BROWSER_BACK_FAILED', message, correlationId);
    }
  },

  /**
   * Handle browser go forward
   */
  'browser:forward': async (socket, payload, correlationId, browserManager) => {
    const data = payload as { sessionId?: string };

    if (!data.sessionId) {
      sendError(socket, 'VALIDATION_FAILED', 'sessionId is required', correlationId);
      return;
    }

    try {
      const result = await browserManager.goForward(data.sessionId);
      sendMessage(
        socket,
        WS_EVENTS.BROWSER_NAVIGATE_RESULT,
        { sessionId: data.sessionId, ...result },
        correlationId
      );
    } catch (error) {
      const message = isAppError(error) ? error.message : 'Go forward failed';
      sendError(socket, 'BROWSER_FORWARD_FAILED', message, correlationId);
    }
  },

  /**
   * Handle browser reload
   */
  'browser:reload': async (socket, payload, correlationId, browserManager) => {
    const data = payload as { sessionId?: string };

    if (!data.sessionId) {
      sendError(socket, 'VALIDATION_FAILED', 'sessionId is required', correlationId);
      return;
    }

    try {
      const result = await browserManager.reload(data.sessionId);
      sendMessage(
        socket,
        WS_EVENTS.BROWSER_NAVIGATE_RESULT,
        { sessionId: data.sessionId, ...result },
        correlationId
      );
    } catch (error) {
      const message = isAppError(error) ? error.message : 'Reload failed';
      sendError(socket, 'BROWSER_RELOAD_FAILED', message, correlationId);
    }
  },

  /**
   * Handle browser screenshot request
   */
  'browser:screenshot': async (socket, payload, correlationId, browserManager) => {
    const data = payload as { sessionId?: string; fullPage?: boolean };

    if (!data.sessionId) {
      sendError(socket, 'VALIDATION_FAILED', 'sessionId is required', correlationId);
      return;
    }

    try {
      const screenshot = await browserManager.screenshot(data.sessionId, {
        fullPage: data.fullPage,
      });

      sendMessage(
        socket,
        'browser:screenshot:response',
        { sessionId: data.sessionId, data: screenshot },
        correlationId
      );
    } catch (error) {
      const message = isAppError(error) ? error.message : 'Screenshot failed';
      sendError(socket, 'BROWSER_SCREENSHOT_FAILED', message, correlationId);
    }
  },

  /**
   * Handle browser resize
   */
  'browser:resize': async (socket, payload, correlationId, browserManager) => {
    const data = payload as { sessionId?: string; width?: number; height?: number };

    if (!data.sessionId || typeof data.width !== 'number' || typeof data.height !== 'number') {
      sendError(
        socket,
        'VALIDATION_FAILED',
        'sessionId, width, and height are required',
        correlationId
      );
      return;
    }

    try {
      await browserManager.resize(data.sessionId, data.width, data.height);
    } catch (error) {
      const message = isAppError(error) ? error.message : 'Resize failed';
      sendError(socket, 'BROWSER_RESIZE_FAILED', message, correlationId);
    }
  },
};

/**
 * Get the handler for a Browser event
 */
export function getBrowserHandler(event: string): BrowserEventHandler | undefined {
  return browserHandlers[event];
}

/**
 * Check if an event is a Browser event
 */
export function isBrowserEvent(event: string): boolean {
  return event in browserHandlers;
}

/**
 * Get all registered Browser event names
 */
export function getBrowserHandledEvents(): string[] {
  return Object.keys(browserHandlers);
}

/**
 * Create a browser session
 * This is called from the main handlers when session:create with type BROWSER is received
 */
export async function createBrowserSession(
  socket: Socket,
  clientId: string,
  config: unknown,
  correlationId: string | undefined,
  browserManager: BrowserManager
): Promise<void> {
  // Validate browser config
  const configResult = browserConfigSchema.safeParse(config);
  if (!configResult.success) {
    sendError(
      socket,
      'VALIDATION_FAILED',
      `Invalid browser config: ${configResult.error.message}`,
      correlationId
    );
    return;
  }

  const validatedConfig = configResult.data as BrowserConfig;

  logger.info(
    { clientId, engine: validatedConfig.engine, url: validatedConfig.url },
    'Browser session requested'
  );

  try {
    // Generate a session ID
    const sessionId = `browser_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const session = await browserManager.create(sessionId, validatedConfig);

    sendMessage(
      socket,
      WS_EVENTS.SESSION_CREATED,
      {
        sessionId: session.id,
        type: SessionType.BROWSER,
        projectId: session.projectId,
        status: session.status,
      },
      correlationId
    );
  } catch (error) {
    logger.error({ error, clientId }, 'Failed to create browser session');
    const message = isAppError(error) ? error.message : 'Failed to create browser session';
    sendError(socket, 'SESSION_CREATE_FAILED', message, correlationId);
  }
}

/**
 * Terminate a browser session
 */
export async function terminateBrowserSession(
  sessionId: string,
  browserManager: BrowserManager
): Promise<void> {
  await browserManager.terminate(sessionId);
}
