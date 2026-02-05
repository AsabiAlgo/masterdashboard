/**
 * Browser Manager
 *
 * Manages browser instances using Playwright with CDP screencast streaming.
 * Provides real-time browser automation and interactive control.
 */

import { EventEmitter } from 'events';
import type { Browser, BrowserContext, Page, CDPSession } from 'playwright';
import { chromium, firefox, webkit } from 'playwright';
import {
  BrowserEngine,
  SessionType,
  SessionStatus,
  type BrowserConfig,
  type BrowserSession,
  type BrowserViewport,
  type BrowserInputPayload,
  type ScreencastFrame,
  type BrowserNavigateResult,
  type BrowserConsoleMessage,
  DEFAULT_BROWSER_VIEWPORT,
} from '@masterdashboard/shared';
import { createChildLogger } from '../utils/logger.js';
import { AppError, ErrorCode } from '../utils/errors.js';

const logger = createChildLogger('browser-manager');

/**
 * Internal browser instance state
 */
interface ManagedBrowser {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  cdpSession: CDPSession | null;
  sessionId: string;
  projectId: string;
  engine: BrowserEngine;
  viewport: BrowserViewport;
  isStreaming: boolean;
  isInteractive: boolean;
  url: string;
  createdAt: Date;
  lastActiveAt: Date;
}

/**
 * CDP Page.screencastFrame params type
 */
interface ScreencastFrameParams {
  data: string;
  sessionId: number;
  metadata?: {
    deviceWidth?: number;
    deviceHeight?: number;
    scrollOffsetX?: number;
    scrollOffsetY?: number;
    timestamp?: number;
  };
}

/**
 * Browser launch error
 */
export class BrowserLaunchError extends AppError {
  constructor(engine: string, errorMessage: string) {
    super(
      {
        code: ErrorCode.INTERNAL_ERROR,
        message: `Failed to launch ${engine} browser: ${errorMessage}`,
        details: { engine },
      },
      500
    );
    this.name = 'BrowserLaunchError';
  }
}

/**
 * Browser session not found error
 */
export class BrowserNotFoundError extends AppError {
  constructor(sessionId: string) {
    super(
      {
        code: ErrorCode.SESSION_NOT_FOUND,
        message: `Browser session not found: ${sessionId}`,
        details: { sessionId },
      },
      404
    );
    this.name = 'BrowserNotFoundError';
  }
}

/**
 * Screencast configuration
 */
interface ScreencastConfig {
  format: 'jpeg' | 'png';
  quality: number;
  maxWidth: number;
  maxHeight: number;
  everyNthFrame: number;
}

const DEFAULT_SCREENCAST_CONFIG: ScreencastConfig = {
  format: 'jpeg',
  quality: 80,
  maxWidth: 1280,
  maxHeight: 720,
  everyNthFrame: 1,
};

export class BrowserManager extends EventEmitter {
  private instances = new Map<string, ManagedBrowser>();
  private screencastConfig: ScreencastConfig;

  constructor(screencastConfig?: Partial<ScreencastConfig>) {
    super();
    this.screencastConfig = {
      ...DEFAULT_SCREENCAST_CONFIG,
      ...screencastConfig,
    };
    logger.info('Browser manager initialized');
  }

  /**
   * Create a new browser session
   */
  async create(sessionId: string, config: BrowserConfig): Promise<BrowserSession> {
    if (this.instances.has(sessionId)) {
      logger.warn({ sessionId }, 'Browser session already exists');
      throw new AppError({
        code: ErrorCode.SESSION_ALREADY_EXISTS,
        message: `Browser session already exists: ${sessionId}`,
        details: { sessionId },
      });
    }

    const engine = config.engine ?? BrowserEngine.CHROMIUM;
    const viewport = config.viewport ?? { ...DEFAULT_BROWSER_VIEWPORT };
    const isInteractive = config.isInteractive !== false;
    const headless = config.headless !== false;

    logger.debug(
      { sessionId, engine, viewport, headless },
      'Creating browser session'
    );

    let browser: Browser;
    try {
      browser = await this.launchBrowser(engine, headless);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ sessionId, engine, error }, 'Failed to launch browser');
      throw new BrowserLaunchError(engine, errorMessage);
    }

    const context = await browser.newContext({
      viewport,
      userAgent: this.getUserAgent(engine),
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();

    // Navigate to initial URL if provided
    if (config.url) {
      try {
        await page.goto(config.url, { waitUntil: 'domcontentloaded' });
      } catch (error) {
        logger.warn({ sessionId, url: config.url, error }, 'Initial navigation failed');
      }
    }

    // Setup CDP session for screencast (Chromium only)
    let cdpSession: CDPSession | null = null;
    if (engine === BrowserEngine.CHROMIUM) {
      try {
        cdpSession = await context.newCDPSession(page);
      } catch (error) {
        logger.warn({ sessionId, error }, 'Failed to create CDP session');
      }
    }

    const now = new Date();
    const managed: ManagedBrowser = {
      browser,
      context,
      page,
      cdpSession,
      sessionId,
      projectId: config.projectId,
      engine,
      viewport,
      isStreaming: false,
      isInteractive,
      url: page.url(),
      createdAt: now,
      lastActiveAt: now,
    };

    this.instances.set(sessionId, managed);

    // Setup page event listeners
    this.setupPageListeners(sessionId, page);

    // Start screencast if interactive
    if (isInteractive && cdpSession) {
      await this.startScreencast(sessionId);
    }

    logger.info({ sessionId, engine, url: page.url() }, 'Browser session created');

    return {
      id: sessionId,
      type: SessionType.BROWSER,
      status: SessionStatus.ACTIVE,
      projectId: config.projectId,
      engine,
      url: page.url(),
      viewport,
      isInteractive,
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
    };
  }

  /**
   * Start CDP screencast streaming
   */
  async startScreencast(sessionId: string): Promise<void> {
    const instance = this.instances.get(sessionId);
    if (!instance) {
      throw new BrowserNotFoundError(sessionId);
    }

    if (instance.isStreaming || !instance.cdpSession) {
      return;
    }

    const { cdpSession, viewport } = instance;

    // Handle screencast frames
    cdpSession.on('Page.screencastFrame', async (params: ScreencastFrameParams) => {
      const frame: ScreencastFrame = {
        sessionId,
        data: `data:image/${this.screencastConfig.format};base64,${params.data}`,
        timestamp: Date.now(),
        width: params.metadata?.deviceWidth ?? viewport.width,
        height: params.metadata?.deviceHeight ?? viewport.height,
        format: this.screencastConfig.format,
      };

      this.emit('frame', frame);

      // Acknowledge frame to continue receiving
      try {
        await cdpSession.send('Page.screencastFrameAck', {
          sessionId: params.sessionId,
        });
      } catch (error) {
        logger.debug({ sessionId, error }, 'Failed to acknowledge frame');
      }
    });

    // Start screencast
    try {
      await cdpSession.send('Page.startScreencast', {
        format: this.screencastConfig.format,
        quality: this.screencastConfig.quality,
        maxWidth: Math.min(this.screencastConfig.maxWidth, viewport.width),
        maxHeight: Math.min(this.screencastConfig.maxHeight, viewport.height),
        everyNthFrame: this.screencastConfig.everyNthFrame,
      });

      instance.isStreaming = true;
      logger.debug({ sessionId }, 'Started screencast');
    } catch (error) {
      logger.error({ sessionId, error }, 'Failed to start screencast');
    }
  }

  /**
   * Stop CDP screencast streaming
   */
  async stopScreencast(sessionId: string): Promise<void> {
    const instance = this.instances.get(sessionId);
    if (!instance || !instance.isStreaming || !instance.cdpSession) {
      return;
    }

    try {
      await instance.cdpSession.send('Page.stopScreencast');
      instance.isStreaming = false;
      logger.debug({ sessionId }, 'Stopped screencast');
    } catch (error) {
      logger.warn({ sessionId, error }, 'Failed to stop screencast');
    }
  }

  /**
   * Handle user input (mouse, keyboard, scroll)
   */
  async handleInput(sessionId: string, input: BrowserInputPayload): Promise<void> {
    const instance = this.instances.get(sessionId);
    if (!instance) {
      throw new BrowserNotFoundError(sessionId);
    }

    if (!instance.isInteractive) {
      logger.warn({ sessionId }, 'Input ignored - session not interactive');
      return;
    }

    const { page } = instance;

    try {
      switch (input.type) {
        case 'click':
          if (input.x !== undefined && input.y !== undefined) {
            await page.mouse.click(input.x, input.y, {
              button: 'left',
              clickCount: 1,
            });
          }
          break;

        case 'dblclick':
          if (input.x !== undefined && input.y !== undefined) {
            await page.mouse.dblclick(input.x, input.y);
          }
          break;

        case 'rightclick':
          if (input.x !== undefined && input.y !== undefined) {
            await page.mouse.click(input.x, input.y, { button: 'right' });
          }
          break;

        case 'type':
          if (input.text) {
            await page.keyboard.type(input.text);
          }
          break;

        case 'keypress':
        case 'keydown':
          if (input.key) {
            const modifiers: string[] = [];
            if (input.modifiers?.ctrl) modifiers.push('Control');
            if (input.modifiers?.alt) modifiers.push('Alt');
            if (input.modifiers?.shift) modifiers.push('Shift');
            if (input.modifiers?.meta) modifiers.push('Meta');

            const keyCombo = [...modifiers, input.key].join('+');
            await page.keyboard.press(keyCombo);
          }
          break;

        case 'keyup':
          if (input.key) {
            await page.keyboard.up(input.key);
          }
          break;

        case 'scroll':
          if (input.x !== undefined && input.y !== undefined) {
            await page.mouse.move(input.x, input.y);
            await page.mouse.wheel(input.deltaX ?? 0, input.deltaY ?? 0);
          }
          break;

        case 'mousemove':
          if (input.x !== undefined && input.y !== undefined) {
            await page.mouse.move(input.x, input.y);
          }
          break;

        case 'mousedown':
          if (input.x !== undefined && input.y !== undefined) {
            await page.mouse.move(input.x, input.y);
            await page.mouse.down();
          }
          break;

        case 'mouseup':
          if (input.x !== undefined && input.y !== undefined) {
            await page.mouse.move(input.x, input.y);
            await page.mouse.up();
          }
          break;

        default:
          logger.warn({ sessionId, inputType: input.type }, 'Unknown input type');
      }
    } catch (error) {
      logger.error({ sessionId, input, error }, 'Failed to handle input');
    }
  }

  /**
   * Navigate to a URL
   */
  async navigate(sessionId: string, url: string): Promise<BrowserNavigateResult> {
    const instance = this.instances.get(sessionId);
    if (!instance) {
      throw new BrowserNotFoundError(sessionId);
    }

    const { page } = instance;

    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
      const finalUrl = page.url();
      const title = await page.title();

      instance.url = finalUrl;

      const result: BrowserNavigateResult = {
        success: true,
        url: finalUrl,
        title,
        statusCode: response?.status(),
      };

      this.emit('navigated', { sessionId, url: finalUrl, title });
      logger.debug({ sessionId, url: finalUrl }, 'Navigation completed');

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ sessionId, url, error }, 'Navigation failed');

      return {
        success: false,
        url,
        error: errorMessage,
      };
    }
  }

  /**
   * Go back in browser history
   */
  async goBack(sessionId: string): Promise<BrowserNavigateResult> {
    const instance = this.instances.get(sessionId);
    if (!instance) {
      throw new BrowserNotFoundError(sessionId);
    }

    try {
      await instance.page.goBack();
      const url = instance.page.url();
      const title = await instance.page.title();
      instance.url = url;

      this.emit('navigated', { sessionId, url, title });

      return { success: true, url, title };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, url: instance.url, error: errorMessage };
    }
  }

  /**
   * Go forward in browser history
   */
  async goForward(sessionId: string): Promise<BrowserNavigateResult> {
    const instance = this.instances.get(sessionId);
    if (!instance) {
      throw new BrowserNotFoundError(sessionId);
    }

    try {
      await instance.page.goForward();
      const url = instance.page.url();
      const title = await instance.page.title();
      instance.url = url;

      this.emit('navigated', { sessionId, url, title });

      return { success: true, url, title };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, url: instance.url, error: errorMessage };
    }
  }

  /**
   * Reload the page
   */
  async reload(sessionId: string): Promise<BrowserNavigateResult> {
    const instance = this.instances.get(sessionId);
    if (!instance) {
      throw new BrowserNotFoundError(sessionId);
    }

    try {
      await instance.page.reload();
      const url = instance.page.url();
      const title = await instance.page.title();

      this.emit('navigated', { sessionId, url, title });

      return { success: true, url, title };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, url: instance.url, error: errorMessage };
    }
  }

  /**
   * Take a screenshot
   */
  async screenshot(sessionId: string, options?: { fullPage?: boolean }): Promise<string> {
    const instance = this.instances.get(sessionId);
    if (!instance) {
      throw new BrowserNotFoundError(sessionId);
    }

    const buffer = await instance.page.screenshot({
      type: 'png',
      fullPage: options?.fullPage ?? false,
    });

    return `data:image/png;base64,${buffer.toString('base64')}`;
  }

  /**
   * Resize browser viewport
   */
  async resize(sessionId: string, width: number, height: number): Promise<void> {
    const instance = this.instances.get(sessionId);
    if (!instance) {
      throw new BrowserNotFoundError(sessionId);
    }

    const newViewport = { width, height };
    await instance.page.setViewportSize(newViewport);
    instance.viewport = newViewport;

    // Restart screencast with new dimensions
    if (instance.isStreaming) {
      await this.stopScreencast(sessionId);
      await this.startScreencast(sessionId);
    }

    logger.debug({ sessionId, viewport: newViewport }, 'Resized viewport');
  }

  /**
   * Get session info
   */
  getSession(sessionId: string): BrowserSession | null {
    const instance = this.instances.get(sessionId);
    if (!instance) {
      return null;
    }

    return {
      id: sessionId,
      type: SessionType.BROWSER,
      status: SessionStatus.ACTIVE,
      projectId: instance.projectId,
      engine: instance.engine,
      url: instance.url,
      viewport: instance.viewport,
      isInteractive: instance.isInteractive,
      createdAt: instance.createdAt,
      updatedAt: new Date(),
      lastActiveAt: instance.lastActiveAt,
    };
  }

  /**
   * Check if session exists
   */
  hasSession(sessionId: string): boolean {
    return this.instances.has(sessionId);
  }

  /**
   * Get all active session IDs
   */
  getActiveSessionIds(): string[] {
    return Array.from(this.instances.keys());
  }

  /**
   * Terminate a browser session
   */
  async terminate(sessionId: string): Promise<void> {
    const instance = this.instances.get(sessionId);
    if (!instance) {
      logger.warn({ sessionId }, 'Attempted to terminate non-existent browser session');
      return;
    }

    await this.stopScreencast(sessionId);

    try {
      await instance.browser.close();
    } catch (error) {
      logger.warn({ sessionId, error }, 'Error closing browser');
    }

    this.instances.delete(sessionId);
    this.emit('terminated', { sessionId });

    logger.info({ sessionId }, 'Browser session terminated');
  }

  /**
   * Terminate all browser sessions
   */
  async terminateAll(): Promise<void> {
    const sessionIds = Array.from(this.instances.keys());
    await Promise.all(sessionIds.map((id) => this.terminate(id)));
    logger.info({ count: sessionIds.length }, 'Terminated all browser sessions');
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    await this.terminateAll();
    this.removeAllListeners();
    logger.info('Browser manager destroyed');
  }

  /**
   * Launch browser based on engine
   */
  private async launchBrowser(engine: BrowserEngine, headless: boolean): Promise<Browser> {
    const launchOptions = {
      headless,
    };

    switch (engine) {
      case BrowserEngine.FIREFOX:
        return firefox.launch(launchOptions);
      case BrowserEngine.WEBKIT:
        return webkit.launch(launchOptions);
      case BrowserEngine.CHROMIUM:
      default:
        return chromium.launch(launchOptions);
    }
  }

  /**
   * Get user agent based on engine
   */
  private getUserAgent(engine: BrowserEngine): string {
    const base = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)';

    switch (engine) {
      case BrowserEngine.FIREFOX:
        return `${base} Gecko/20100101 Firefox/121.0`;
      case BrowserEngine.WEBKIT:
        return `${base} AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15`;
      case BrowserEngine.CHROMIUM:
      default:
        return `${base} AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`;
    }
  }

  /**
   * Setup page event listeners
   */
  private setupPageListeners(sessionId: string, page: Page): void {
    page.on('load', async () => {
      const url = page.url();
      const title = await page.title();

      const instance = this.instances.get(sessionId);
      if (instance) {
        instance.url = url;
        instance.lastActiveAt = new Date();
      }

      this.emit('loaded', { sessionId, url, title });
    });

    page.on('console', (msg: { type: () => string; text: () => string; location: () => { url?: string; lineNumber?: number } | undefined }) => {
      const consoleMessage: BrowserConsoleMessage = {
        sessionId,
        type: msg.type() as BrowserConsoleMessage['type'],
        text: msg.text(),
        url: msg.location()?.url,
        lineNumber: msg.location()?.lineNumber,
        timestamp: Date.now(),
      };

      this.emit('console', consoleMessage);
    });

    page.on('pageerror', (error: Error) => {
      this.emit('error', {
        sessionId,
        message: error.message,
        stack: error.stack,
      });
    });

    page.on('close', () => {
      this.emit('closed', { sessionId });
      this.instances.delete(sessionId);
    });

    page.on('crash', () => {
      logger.error({ sessionId }, 'Page crashed');
      this.emit('crashed', { sessionId });
    });
  }
}
