/**
 * Browser Types (V2)
 *
 * Types for browser automation sessions using Playwright.
 * This is a V2 feature for web automation and testing.
 */

import type { BaseSession, SerializedBaseSession } from './session.js';
import { SessionType } from './session.js';

/**
 * Supported browser engines
 */
export enum BrowserEngine {
  CHROMIUM = 'chromium',
  FIREFOX = 'firefox',
  WEBKIT = 'webkit',
}

/**
 * Browser viewport dimensions
 */
export interface BrowserViewport {
  width: number;
  height: number;
}

/**
 * Default browser viewport
 */
export const DEFAULT_BROWSER_VIEWPORT: Readonly<BrowserViewport> = {
  width: 1280,
  height: 720,
} as const;

/**
 * Browser session extending base session
 */
export interface BrowserSession extends BaseSession {
  readonly type: SessionType.BROWSER;
  /** Browser engine being used */
  readonly engine: BrowserEngine;
  /** Current URL */
  url: string;
  /** Current viewport dimensions */
  viewport: BrowserViewport;
  /** Whether interactive mode is enabled */
  isInteractive: boolean;
}

/**
 * Serializable version of BrowserSession
 */
export interface SerializedBrowserSession extends SerializedBaseSession {
  readonly type: SessionType.BROWSER;
  readonly engine: BrowserEngine;
  url: string;
  viewport: BrowserViewport;
  isInteractive: boolean;
}

/**
 * Configuration for creating a new browser session
 */
export interface BrowserConfig {
  /** Browser engine to use */
  engine?: BrowserEngine;
  /** Initial URL to navigate to */
  url?: string;
  /** Viewport dimensions */
  viewport?: BrowserViewport;
  /** Run in headless mode */
  headless?: boolean;
  /** Enable interactive mode */
  isInteractive?: boolean;
  /** Project this browser belongs to */
  projectId: string;
}

/**
 * Screencast frame for streaming browser view
 */
export interface ScreencastFrame {
  /** Session this frame belongs to */
  sessionId: string;
  /** Base64 encoded image data */
  data: string;
  /** Frame timestamp */
  timestamp: number;
  /** Frame dimensions */
  width: number;
  /** Frame dimensions */
  height: number;
  /** Image format */
  format: 'jpeg' | 'png';
}

/**
 * Browser input event types
 */
export type BrowserInputType =
  | 'click'
  | 'dblclick'
  | 'rightclick'
  | 'type'
  | 'scroll'
  | 'keypress'
  | 'keydown'
  | 'keyup'
  | 'mousemove'
  | 'mousedown'
  | 'mouseup';

/**
 * Browser input payload for interactive control
 */
export interface BrowserInputPayload {
  /** Session to send input to */
  sessionId: string;
  /** Type of input event */
  type: BrowserInputType;
  /** X coordinate (for mouse events) */
  x?: number;
  /** Y coordinate (for mouse events) */
  y?: number;
  /** Text to type (for type events) */
  text?: string;
  /** Key to press (for key events) */
  key?: string;
  /** Scroll delta X (for scroll events) */
  deltaX?: number;
  /** Scroll delta Y (for scroll events) */
  deltaY?: number;
  /** Modifier keys held */
  modifiers?: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  };
}

/**
 * Browser navigation payload
 */
export interface BrowserNavigatePayload {
  /** Session to navigate */
  sessionId: string;
  /** URL to navigate to */
  url: string;
  /** Wait for specific state */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
}

/**
 * Browser navigation result
 */
export interface BrowserNavigateResult {
  /** Whether navigation succeeded */
  success: boolean;
  /** Final URL after navigation (may differ due to redirects) */
  url: string;
  /** Page title */
  title?: string;
  /** HTTP status code */
  statusCode?: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Browser console message
 */
export interface BrowserConsoleMessage {
  /** Session this message came from */
  sessionId: string;
  /** Message type */
  type: 'log' | 'warn' | 'error' | 'info' | 'debug';
  /** Message text */
  text: string;
  /** Source URL */
  url?: string;
  /** Line number */
  lineNumber?: number;
  /** Timestamp */
  timestamp: number;
}

/**
 * Browser screenshot options
 */
export interface BrowserScreenshotOptions {
  /** Screenshot format */
  format?: 'jpeg' | 'png';
  /** Quality (0-100, jpeg only) */
  quality?: number;
  /** Full page screenshot */
  fullPage?: boolean;
  /** Clip region */
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
