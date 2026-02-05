/**
 * Tmux Manager
 *
 * Manages tmux sessions for terminal persistence across server restarts.
 * Users interact with normal shells - tmux is completely transparent.
 */

import { EventEmitter } from 'events';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { createChildLogger } from '../utils/logger.js';
import {
  getSessionByTmuxName,
  sessionExists as dbSessionExists,
} from '../persistence/database.js';

const execFileAsync = promisify(execFile);
const logger = createChildLogger('tmux-manager');

/** Tmux session prefix for Master Dashboard sessions */
const TMUX_SESSION_PREFIX = 'mdb_';

/** Default tmux configuration */
const TMUX_CONFIG = `
# Master Dashboard tmux configuration
# This file is auto-generated - changes will be overwritten

# Disable status bar completely (transparent UX)
set-option -g status off

# Enable mouse support
set-option -g mouse on

# Don't rename windows automatically
set-option -g allow-rename off

# Increase scrollback buffer
set-option -g history-limit 10000

# Set default terminal - use xterm-256color for best compatibility with xterm.js
set-option -g default-terminal "xterm-256color"

# Enable true color (RGB) support
set-option -ga terminal-overrides ",xterm-256color:Tc"

# Faster escape sequences
set-option -sg escape-time 10

# Focus events for proper terminal behavior
set-option -g focus-events on

# Ensure colors work properly - force-set window options
set-window-option -g xterm-keys on
`.trim();

export interface TmuxConfig {
  /** Path to tmux config file */
  configPath?: string;
  /** Path to tmux socket (for isolated sessions) */
  socketPath?: string;
  /** Default shell to use */
  defaultShell?: string;
  /** Enable mouse support */
  mouseEnabled?: boolean;
}

export interface TmuxSession {
  /** Our internal session ID */
  sessionId: string;
  /** Tmux session name (prefix + sessionId) */
  tmuxName: string;
  /** When the session was created */
  createdAt: Date;
  /** Last activity timestamp */
  lastActiveAt: Date;
  /** Whether a PTY is currently attached */
  attached: boolean;
}

const DEFAULT_CONFIG: Required<TmuxConfig> = {
  configPath: join(
    process.env.HOME ?? '/tmp',
    '.config',
    'masterdashboard',
    'tmux.conf'
  ),
  socketPath: join(
    process.env.HOME ?? '/tmp',
    '.config',
    'masterdashboard',
    'tmux.sock'
  ),
  defaultShell: process.env.SHELL ?? '/bin/bash',
  mouseEnabled: true,
};

export class TmuxManager extends EventEmitter {
  private config: Required<TmuxConfig>;
  private sessions = new Map<string, TmuxSession>();
  private available = false;
  private tmuxVersion: string | null = null;

  constructor(config: TmuxConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the tmux manager
   * Checks tmux availability and creates config
   */
  async initialize(): Promise<void> {
    try {
      const { stdout } = await this.exec(['-V']);
      this.tmuxVersion = stdout.trim();
      this.available = true;
      logger.info({ version: this.tmuxVersion }, 'Tmux available');
    } catch {
      logger.warn('Tmux not available, sessions will not persist across restarts');
      this.available = false;
      return;
    }

    await this.ensureConfig();
    await this.discoverExistingSessions();
  }

  /**
   * Check if tmux is available
   */
  isAvailable(): boolean {
    return this.available;
  }

  /**
   * Get tmux version
   */
  getVersion(): string | null {
    return this.tmuxVersion;
  }

  /**
   * Create a new tmux session
   */
  async createSession(
    sessionId: string,
    shell?: string,
    cwd?: string,
    shellArgs?: string[]
  ): Promise<TmuxSession> {
    if (!this.available) {
      throw new Error('Tmux is not available');
    }

    const tmuxName = this.getTmuxSessionName(sessionId);
    const shellPath = shell ?? this.config.defaultShell;
    const workingDir = cwd ?? process.env.HOME ?? '/';

    // Build the full shell command with arguments
    const shellCommand = shellArgs && shellArgs.length > 0
      ? `${shellPath} ${shellArgs.join(' ')}`
      : shellPath;

    logger.debug(
      { sessionId, tmuxName, shell: shellPath, args: shellArgs, cwd: workingDir },
      'Creating tmux session'
    );

    try {
      await this.exec([
        'new-session',
        '-d', // Detached
        '-s',
        tmuxName, // Session name
        '-c',
        workingDir, // Working directory
        '-x',
        '120', // Initial columns
        '-y',
        '30', // Initial rows
        '-e',
        'TERM=xterm-256color', // Set terminal type for colors
        '-e',
        'COLORTERM=truecolor', // Enable true color
        '-e',
        'LANG=en_US.UTF-8', // Set locale
        shellCommand, // Shell command with args
      ]);
    } catch (error) {
      logger.error({ sessionId, error }, 'Failed to create tmux session');
      throw error;
    }

    const session: TmuxSession = {
      sessionId,
      tmuxName,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      attached: false,
    };

    this.sessions.set(sessionId, session);
    this.emit('session:created', session);

    logger.info({ sessionId, tmuxName }, 'Tmux session created');
    return session;
  }

  /**
   * Get a tmux session by ID
   */
  getSession(sessionId: string): TmuxSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Check if a tmux session exists (both in memory and actually in tmux)
   * Includes retry logic to handle transient failures
   */
  async sessionExists(sessionId: string, retries = 2): Promise<boolean> {
    const tmuxName = this.getTmuxSessionName(sessionId);

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await this.exec(['has-session', '-t', tmuxName]);
        logger.debug({ sessionId, tmuxName }, 'Tmux session exists');
        return true;
      } catch (error) {
        if (attempt < retries) {
          // Wait a bit before retrying (50ms, 100ms)
          await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
          logger.debug({ sessionId, tmuxName, attempt: attempt + 1 }, 'Retrying tmux session check');
        } else {
          // All retries exhausted - session doesn't exist
          logger.info({ sessionId, tmuxName, error: String(error) }, 'Tmux session NOT found after retries');
          this.sessions.delete(sessionId);
          return false;
        }
      }
    }
    return false;
  }

  /**
   * List all managed tmux sessions
   */
  async listSessions(): Promise<TmuxSession[]> {
    if (!this.available) {
      return [];
    }

    try {
      const { stdout } = await this.exec([
        'list-sessions',
        '-F',
        '#{session_name}:#{session_created}:#{session_attached}',
      ]);

      const sessions: TmuxSession[] = [];
      const lines = stdout.trim().split('\n').filter(Boolean);

      for (const line of lines) {
        const parts = line.split(':');
        const name = parts[0];
        const created = parts[1];
        const attached = parts[2];

        if (name && name.startsWith(TMUX_SESSION_PREFIX)) {
          const sessionId = name.slice(TMUX_SESSION_PREFIX.length);

          // Get or create session entry
          const existing = this.sessions.get(sessionId);
          const session: TmuxSession = {
            sessionId,
            tmuxName: name,
            createdAt: existing?.createdAt ?? new Date(parseInt(created ?? '0') * 1000),
            lastActiveAt: existing?.lastActiveAt ?? new Date(),
            attached: attached === '1',
          };

          sessions.push(session);
          this.sessions.set(sessionId, session);
        }
      }

      return sessions;
    } catch {
      // No sessions exist
      return [];
    }
  }

  /**
   * Kill a tmux session
   */
  async killSession(sessionId: string): Promise<void> {
    const tmuxName = this.getTmuxSessionName(sessionId);

    try {
      await this.exec(['kill-session', '-t', tmuxName]);
      this.sessions.delete(sessionId);
      this.emit('session:killed', { sessionId });
      logger.info({ sessionId, tmuxName }, 'Tmux session killed');
    } catch (error) {
      // Session might already be dead
      this.sessions.delete(sessionId);
      logger.debug({ sessionId, error }, 'Tmux session kill (possibly already dead)');
    }
  }

  /**
   * Resize a tmux session window
   */
  async resize(sessionId: string, cols: number, rows: number): Promise<void> {
    const tmuxName = this.getTmuxSessionName(sessionId);

    try {
      // Resize the window in the tmux session
      await this.exec([
        'resize-window',
        '-t',
        tmuxName,
        '-x',
        cols.toString(),
        '-y',
        rows.toString(),
      ]);
    } catch (error) {
      // Resize might fail if session doesn't exist
      logger.debug({ sessionId, cols, rows, error }, 'Tmux resize failed');
    }
  }

  /**
   * Send keys to a tmux session (for testing/automation)
   */
  async sendKeys(sessionId: string, keys: string): Promise<void> {
    const tmuxName = this.getTmuxSessionName(sessionId);

    try {
      await this.exec(['send-keys', '-t', tmuxName, keys]);
    } catch (error) {
      logger.warn({ sessionId, error }, 'Failed to send keys to tmux session');
      throw error;
    }
  }

  /**
   * Capture the complete scrollback buffer from a tmux session
   * This captures ALL content including history, not just the visible screen
   * @param sessionId - The session ID to capture from
   * @param lines - Number of lines to capture (default: all with -S -)
   * @returns The captured scrollback content, or null if capture fails
   */
  async captureScrollback(sessionId: string, lines?: number): Promise<string | null> {
    const tmuxName = this.getTmuxSessionName(sessionId);

    try {
      // -p: output to stdout
      // -S -: start from the beginning of history (all lines)
      // -E -: end at the last line
      // -J: join wrapped lines
      const args = [
        'capture-pane',
        '-t', tmuxName,
        '-p',         // Print to stdout
        '-J',         // Join wrapped lines
        '-S', lines ? `-${lines}` : '-', // Start from beginning or N lines back
      ];

      const { stdout } = await this.exec(args);

      logger.debug(
        { sessionId, contentLength: stdout.length },
        'Captured tmux scrollback'
      );

      return stdout;
    } catch (error) {
      logger.warn({ sessionId, error }, 'Failed to capture tmux scrollback');
      return null;
    }
  }

  /**
   * Update last activity timestamp for a session
   */
  updateLastActive(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActiveAt = new Date();
    }
  }

  /**
   * Mark a session as attached (PTY is connected)
   */
  markAttached(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.attached = true;
      session.lastActiveAt = new Date();
    }
  }

  /**
   * Mark a session as detached (PTY disconnected)
   */
  markDetached(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.attached = false;
    }
  }

  /**
   * Get the tmux attach command for a session
   * Uses -d to detach other clients (ensures only one PTY is attached)
   */
  getAttachCommand(sessionId: string): string[] {
    const tmuxName = this.getTmuxSessionName(sessionId);
    return [
      'tmux',
      '-f',
      this.config.configPath,
      '-S',
      this.config.socketPath,
      'attach-session',
      '-d',  // Detach other clients first (prevents conflicts)
      '-t',
      tmuxName,
    ];
  }

  /**
   * Get the full tmux command with config and socket
   */
  getTmuxCommand(args: string[]): string[] {
    return [
      'tmux',
      '-f',
      this.config.configPath,
      '-S',
      this.config.socketPath,
      ...args,
    ];
  }

  /**
   * Shutdown - cleanup resources but keep tmux sessions running
   */
  async shutdown(): Promise<void> {
    // Don't kill tmux sessions - that's the point of persistence!
    this.sessions.clear();
    this.removeAllListeners();
    logger.info('Tmux manager shutdown (sessions preserved)');
  }

  /**
   * Get tmux session name from our session ID
   */
  private getTmuxSessionName(sessionId: string): string {
    return `${TMUX_SESSION_PREFIX}${sessionId}`;
  }

  /**
   * Extract our session ID from tmux session name
   */
  private getSessionIdFromTmuxName(tmuxName: string): string | null {
    if (tmuxName.startsWith(TMUX_SESSION_PREFIX)) {
      return tmuxName.slice(TMUX_SESSION_PREFIX.length);
    }
    return null;
  }

  /**
   * Execute a tmux command
   */
  private async exec(
    args: string[]
  ): Promise<{ stdout: string; stderr: string }> {
    const fullArgs = [
      '-f',
      this.config.configPath,
      '-S',
      this.config.socketPath,
      ...args,
    ];

    return execFileAsync('tmux', fullArgs, { timeout: 5000 });
  }

  /**
   * Ensure tmux config file exists
   */
  private async ensureConfig(): Promise<void> {
    const configDir = dirname(this.config.configPath);

    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
      logger.info({ path: configDir }, 'Created tmux config directory');
    }

    writeFileSync(this.config.configPath, TMUX_CONFIG);
    logger.debug({ path: this.config.configPath }, 'Tmux config written');
  }

  /**
   * Discover existing tmux sessions on startup (for recovery)
   */
  private async discoverExistingSessions(): Promise<void> {
    if (!this.available) {
      return;
    }

    try {
      const { stdout } = await this.exec([
        'list-sessions',
        '-F',
        '#{session_name}',
      ]);

      const tmuxNames = stdout.trim().split('\n').filter(Boolean);

      for (const tmuxName of tmuxNames) {
        if (!tmuxName.startsWith(TMUX_SESSION_PREFIX)) {
          continue;
        }

        const sessionId = this.getSessionIdFromTmuxName(tmuxName);
        if (!sessionId) {
          continue;
        }

        // Check if this session exists in our database
        const dbSession = getSessionByTmuxName(tmuxName);
        const exists = dbSession !== undefined || dbSessionExists(sessionId);

        if (exists) {
          const session: TmuxSession = {
            sessionId,
            tmuxName,
            createdAt: new Date(),
            lastActiveAt: new Date(),
            attached: false,
          };

          this.sessions.set(sessionId, session);
          this.emit('session:recovered', session);
          logger.info({ sessionId }, 'Recovered tmux session');
        } else {
          // Orphaned tmux session - kill it
          await this.killSession(sessionId);
          logger.info({ sessionId, tmuxName }, 'Killed orphaned tmux session');
        }
      }
    } catch {
      // No sessions exist, that's fine
      logger.debug('No existing tmux sessions found');
    }
  }
}
