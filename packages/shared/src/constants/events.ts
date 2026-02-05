/**
 * Event Constants
 *
 * WebSocket event names and related constants.
 */

import { WS_EVENTS } from '../types/websocket.js';

// Re-export WS_EVENTS for convenience
export { WS_EVENTS };

/**
 * Event categories for organization
 */
export const EVENT_CATEGORIES = {
  CONNECTION: 'connection',
  SESSION: 'session',
  TERMINAL: 'terminal',
  STATUS: 'status',
  PROJECT: 'project',
  LAYOUT: 'layout',
  BROWSER: 'browser',
  SSH: 'ssh',
} as const;

/**
 * Events by category
 */
export const EVENTS_BY_CATEGORY: Readonly<Record<string, readonly string[]>> = {
  [EVENT_CATEGORIES.CONNECTION]: [
    WS_EVENTS.CONNECT,
    WS_EVENTS.DISCONNECT,
    WS_EVENTS.RECONNECT,
    WS_EVENTS.ERROR,
    WS_EVENTS.PING,
    WS_EVENTS.PONG,
  ],
  [EVENT_CATEGORIES.SESSION]: [
    WS_EVENTS.SESSION_CREATE,
    WS_EVENTS.SESSION_CREATED,
    WS_EVENTS.SESSION_TERMINATE,
    WS_EVENTS.SESSION_TERMINATED,
    WS_EVENTS.SESSION_ERROR,
    WS_EVENTS.SESSION_LIST,
    WS_EVENTS.SESSION_LIST_RESPONSE,
  ],
  [EVENT_CATEGORIES.TERMINAL]: [
    WS_EVENTS.TERMINAL_INPUT,
    WS_EVENTS.TERMINAL_OUTPUT,
    WS_EVENTS.TERMINAL_RESIZE,
    WS_EVENTS.TERMINAL_RECONNECT,
    WS_EVENTS.TERMINAL_RECONNECT_RESPONSE,
    WS_EVENTS.TERMINAL_BUFFER,
    WS_EVENTS.TERMINAL_CLEAR,
  ],
  [EVENT_CATEGORIES.STATUS]: [
    WS_EVENTS.STATUS_CHANGE,
    WS_EVENTS.STATUS_PATTERN_ADD,
    WS_EVENTS.STATUS_PATTERN_REMOVE,
    WS_EVENTS.STATUS_PATTERNS_LIST,
  ],
  [EVENT_CATEGORIES.PROJECT]: [
    WS_EVENTS.PROJECT_CREATE,
    WS_EVENTS.PROJECT_CREATED,
    WS_EVENTS.PROJECT_UPDATE,
    WS_EVENTS.PROJECT_UPDATED,
    WS_EVENTS.PROJECT_DELETE,
    WS_EVENTS.PROJECT_DELETED,
    WS_EVENTS.PROJECT_LIST,
    WS_EVENTS.PROJECT_LIST_RESPONSE,
  ],
  [EVENT_CATEGORIES.LAYOUT]: [
    WS_EVENTS.LAYOUT_SAVE,
    WS_EVENTS.LAYOUT_SAVED,
    WS_EVENTS.LAYOUT_LOAD,
    WS_EVENTS.LAYOUT_LOADED,
    WS_EVENTS.LAYOUT_DELETE,
    WS_EVENTS.LAYOUT_DELETED,
  ],
  [EVENT_CATEGORIES.BROWSER]: [
    WS_EVENTS.BROWSER_FRAME,
    WS_EVENTS.BROWSER_INPUT,
    WS_EVENTS.BROWSER_NAVIGATE,
    WS_EVENTS.BROWSER_NAVIGATE_RESULT,
    WS_EVENTS.BROWSER_CONSOLE,
  ],
  [EVENT_CATEGORIES.SSH]: [
    WS_EVENTS.SSH_CONNECT,
    WS_EVENTS.SSH_CONNECTED,
    WS_EVENTS.SSH_INPUT,
    WS_EVENTS.SSH_OUTPUT,
    WS_EVENTS.SSH_ERROR,
    WS_EVENTS.SSH_CLOSE,
  ],
} as const;

/**
 * Events that require authentication
 */
export const AUTHENTICATED_EVENTS: readonly string[] = [
  WS_EVENTS.SESSION_CREATE,
  WS_EVENTS.SESSION_TERMINATE,
  WS_EVENTS.PROJECT_CREATE,
  WS_EVENTS.PROJECT_UPDATE,
  WS_EVENTS.PROJECT_DELETE,
  WS_EVENTS.LAYOUT_SAVE,
  WS_EVENTS.LAYOUT_DELETE,
] as const;

/**
 * Events that should be rate-limited
 */
export const RATE_LIMITED_EVENTS: Readonly<Record<string, number>> = {
  [WS_EVENTS.TERMINAL_INPUT]: 1000, // Max 1000/sec
  [WS_EVENTS.TERMINAL_RESIZE]: 10,  // Max 10/sec
  [WS_EVENTS.BROWSER_INPUT]: 100,   // Max 100/sec
} as const;

/**
 * Default timeout for request/response events (ms)
 */
export const EVENT_TIMEOUT_MS = 30000;

/**
 * Heartbeat interval (ms)
 */
export const HEARTBEAT_INTERVAL_MS = 30000;

/**
 * Reconnection settings
 */
export const RECONNECT_CONFIG = {
  /** Initial delay before first reconnect attempt */
  initialDelayMs: 1000,
  /** Maximum delay between reconnect attempts */
  maxDelayMs: 30000,
  /** Multiplier for exponential backoff */
  backoffMultiplier: 2,
  /** Maximum number of reconnect attempts */
  maxAttempts: 10,
} as const;
