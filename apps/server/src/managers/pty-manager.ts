/**
 * PTY Manager
 *
 * Manages pseudo-terminal processes for terminal sessions.
 * Integrates with TmuxManager for session persistence across server restarts.
 */

import { EventEmitter } from 'events';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import type { IPty } from 'node-pty';
import * as pty from 'node-pty';
import {
  ShellType,
  SHELL_BINARY_PATHS,
  SHELL_STARTUP_ARGS,
  SHELL_ENV_DEFAULTS,
  type TerminalConfig,
} from '@masterdashboard/shared';
import { createChildLogger } from '../utils/logger.js';
import { PTYSpawnError } from '../utils/errors.js';
import type { PTYProcess } from './types.js';
import type { TmuxManager } from './tmux-manager.js';

const logger = createChildLogger('pty-manager');

interface ManagedPTY {
  pty: IPty;
  sessionId: string;
  shell: ShellType;
  createdAt: Date;
  /** Whether this PTY is attached to a tmux session */
  tmuxBacked: boolean;
}

export class PTYManager extends EventEmitter {
  private processes = new Map<string, ManagedPTY>();
  private tmuxManager: TmuxManager | null = null;

  constructor(tmuxManager?: TmuxManager) {
    super();
    this.tmuxManager = tmuxManager ?? null;
    logger.info(
      { tmuxEnabled: !!tmuxManager },
      'PTY manager initialized'
    );
  }

  /**
   * Set the tmux manager (for deferred initialization)
   */
  setTmuxManager(tmuxManager: TmuxManager): void {
    this.tmuxManager = tmuxManager;
    logger.info('TmuxManager set on PTYManager');
  }

  /**
   * Create a new PTY process
   * If tmux is available, creates a tmux session and attaches to it
   */
  async create(sessionId: string, config: TerminalConfig): Promise<IPty> {
    if (this.processes.has(sessionId)) {
      const existing = this.processes.get(sessionId)!;
      logger.warn({ sessionId }, 'PTY already exists, returning existing instance');
      return existing.pty;
    }

    // Try tmux-backed session if available
    if (this.tmuxManager?.isAvailable()) {
      try {
        return await this.createTmuxBacked(sessionId, config);
      } catch (error) {
        logger.warn(
          { sessionId, error },
          'Failed to create tmux-backed session, falling back to direct PTY'
        );
      }
    }

    // Fallback to direct PTY (no persistence)
    return this.createDirect(sessionId, config);
  }

  /**
   * Reconnect to an existing tmux session
   * Returns true if reconnection succeeded
   */
  async reconnect(sessionId: string, config: TerminalConfig): Promise<boolean> {
    if (!this.tmuxManager?.isAvailable()) {
      logger.warn({ sessionId }, 'Cannot reconnect without tmux');
      return false;
    }

    // Check if tmux session still exists
    const exists = await this.tmuxManager.sessionExists(sessionId);
    if (!exists) {
      logger.warn({ sessionId }, 'Tmux session no longer exists');
      return false;
    }

    // Kill existing PTY if any
    if (this.processes.has(sessionId)) {
      this.kill(sessionId);
    }

    // Spawn new PTY attached to tmux
    try {
      await this.spawnAttachedPty(sessionId, config);
      logger.info({ sessionId }, 'Reconnected to tmux session');
      return true;
    } catch (error) {
      logger.error({ sessionId, error }, 'Failed to reconnect to tmux session');
      return false;
    }
  }

  /**
   * Create a tmux-backed PTY session
   */
  private async createTmuxBacked(
    sessionId: string,
    config: TerminalConfig
  ): Promise<IPty> {
    const shell = this.getShellPath(config.shell);
    const shellArgs = this.getShellArgs(config.shell);
    const cwd = config.cwd ?? process.env.HOME ?? '/';

    // Check if tmux session already exists (server restart case)
    const existingSession = await this.tmuxManager!.sessionExists(sessionId);

    if (existingSession) {
      logger.info({ sessionId }, 'Reattaching to existing tmux session');
    } else {
      // Create new tmux session with shell args (e.g., --dangerously-skip-permissions)
      await this.tmuxManager!.createSession(sessionId, shell, cwd, shellArgs);
      logger.info({ sessionId, shell, shellArgs }, 'Created new tmux session');
    }

    // Spawn PTY attached to tmux
    return this.spawnAttachedPty(sessionId, config);
  }

  /**
   * Spawn a PTY that attaches to a tmux session
   */
  private async spawnAttachedPty(
    sessionId: string,
    config: TerminalConfig
  ): Promise<IPty> {
    const attachCmd = this.tmuxManager!.getAttachCommand(sessionId);
    const command = attachCmd[0] ?? 'tmux';
    const args = attachCmd.slice(1);

    logger.info(
      { sessionId, command, args: args.join(' '), cols: config.cols, rows: config.rows },
      'Spawning PTY attached to tmux'
    );

    let ptyProcess: IPty;
    try {
      ptyProcess = pty.spawn(command, args, {
        name: 'xterm-256color',
        cols: config.cols ?? 100,
        rows: config.rows ?? 30,
        cwd: process.env.HOME ?? '/',
        env: {
          ...process.env,
          ...SHELL_ENV_DEFAULTS,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ sessionId, command, error }, 'Failed to spawn tmux-attached PTY');
      throw new PTYSpawnError('tmux attach', errorMessage);
    }

    const managed: ManagedPTY = {
      pty: ptyProcess,
      sessionId,
      shell: config.shell,
      createdAt: new Date(),
      tmuxBacked: true,
    };

    this.processes.set(sessionId, managed);
    this.tmuxManager!.markAttached(sessionId);

    // Set up event listeners
    ptyProcess.onData((data) => {
      this.tmuxManager?.updateLastActive(sessionId);
      this.emit('data', { sessionId, data });
    });

    ptyProcess.onExit(({ exitCode }) => {
      // Only delete from processes if this is still the current PTY for this session
      // This prevents a race condition where an old PTY's onExit deletes a new PTY
      const currentManaged = this.processes.get(sessionId);
      if (currentManaged && currentManaged.pty === ptyProcess) {
        logger.warn({ sessionId, exitCode, pid: ptyProcess.pid }, 'PTY process exited (tmux attach failed or disconnected)');
        this.processes.delete(sessionId);
        this.tmuxManager?.markDetached(sessionId);
        this.emit('exit', { sessionId, exitCode });
      } else {
        logger.debug({ sessionId, exitCode, pid: ptyProcess.pid }, 'Old PTY exited (replaced by new PTY)');
      }
    });

    logger.info(
      { sessionId, pid: ptyProcess.pid, tmuxBacked: true },
      'PTY process created (tmux-backed)'
    );

    // Note: We don't send any reset sequences here as it can interfere with
    // tmux's capability queries and cause escape sequences to be displayed as text

    return ptyProcess;
  }

  /**
   * Create a direct PTY (no tmux persistence)
   */
  private createDirect(sessionId: string, config: TerminalConfig): IPty {
    const shell = this.getShellPath(config.shell);
    const args = this.getShellArgs(config.shell);

    const env = {
      ...process.env,
      ...SHELL_ENV_DEFAULTS,
      ...config.env,
    };

    const cwd = config.cwd ?? process.env.HOME ?? '/';

    logger.debug(
      { sessionId, shell, args, cwd, cols: config.cols, rows: config.rows },
      'Spawning direct PTY (no tmux)'
    );

    let ptyProcess: IPty;
    try {
      ptyProcess = pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols: config.cols ?? 100,
        rows: config.rows ?? 30,
        cwd,
        env,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ sessionId, shell, error }, 'Failed to spawn PTY');
      throw new PTYSpawnError(shell, errorMessage);
    }

    const managed: ManagedPTY = {
      pty: ptyProcess,
      sessionId,
      shell: config.shell,
      createdAt: new Date(),
      tmuxBacked: false,
    };

    this.processes.set(sessionId, managed);

    // Set up event listeners
    ptyProcess.onData((data) => {
      this.emit('data', { sessionId, data });
    });

    ptyProcess.onExit(({ exitCode }) => {
      // Only delete from processes if this is still the current PTY for this session
      // This prevents a race condition where an old PTY's onExit deletes a new PTY
      const currentManaged = this.processes.get(sessionId);
      if (currentManaged && currentManaged.pty === ptyProcess) {
        logger.info({ sessionId, exitCode }, 'PTY process exited');
        this.processes.delete(sessionId);
        this.emit('exit', { sessionId, exitCode });
      } else {
        logger.debug({ sessionId, exitCode }, 'Old PTY exited (replaced by new PTY, direct mode)');
      }
    });

    logger.info(
      { sessionId, shell, pid: ptyProcess.pid, tmuxBacked: false },
      'PTY process created (direct)'
    );

    return ptyProcess;
  }

  /**
   * Write data to a PTY
   */
  write(sessionId: string, data: string): boolean {
    const managed = this.processes.get(sessionId);
    if (!managed) {
      logger.warn({ sessionId }, 'Attempted to write to non-existent PTY');
      return false;
    }

    managed.pty.write(data);
    return true;
  }

  /**
   * Resize a PTY
   */
  resize(sessionId: string, cols: number, rows: number): boolean {
    const managed = this.processes.get(sessionId);
    if (!managed) {
      logger.warn({ sessionId }, 'Attempted to resize non-existent PTY');
      return false;
    }

    managed.pty.resize(cols, rows);

    // Also resize tmux session if applicable
    if (managed.tmuxBacked && this.tmuxManager) {
      this.tmuxManager.resize(sessionId, cols, rows).catch((error) => {
        logger.debug({ sessionId, error }, 'Failed to resize tmux session');
      });
    }

    logger.debug({ sessionId, cols, rows }, 'Resized PTY');
    return true;
  }

  /**
   * Kill a PTY process (but NOT the tmux session - that survives)
   */
  kill(sessionId: string): boolean {
    const managed = this.processes.get(sessionId);
    if (!managed) {
      logger.warn({ sessionId }, 'Attempted to kill non-existent PTY');
      return false;
    }

    try {
      managed.pty.kill();
      this.processes.delete(sessionId);

      // Mark tmux session as detached (but don't kill it)
      if (managed.tmuxBacked && this.tmuxManager) {
        this.tmuxManager.markDetached(sessionId);
      }

      logger.info({ sessionId, tmuxBacked: managed.tmuxBacked }, 'Killed PTY process');
      return true;
    } catch (error) {
      logger.error({ sessionId, error }, 'Failed to kill PTY');
      return false;
    }
  }

  /**
   * Terminate a session completely (kills PTY AND tmux session)
   */
  async terminate(sessionId: string): Promise<boolean> {
    const managed = this.processes.get(sessionId);

    // Kill PTY
    if (managed) {
      try {
        managed.pty.kill();
        this.processes.delete(sessionId);
      } catch (error) {
        logger.error({ sessionId, error }, 'Failed to kill PTY');
      }
    }

    // Kill tmux session
    if (this.tmuxManager) {
      await this.tmuxManager.killSession(sessionId);
    }

    logger.info({ sessionId }, 'Terminated session completely');
    return true;
  }

  /**
   * Check if a PTY process is running
   */
  isRunning(sessionId: string): boolean {
    return this.processes.has(sessionId);
  }

  /**
   * Check if a session has a tmux session (even if PTY is not running)
   */
  async hasTmuxSession(sessionId: string): Promise<boolean> {
    if (!this.tmuxManager?.isAvailable()) {
      return false;
    }
    return this.tmuxManager.sessionExists(sessionId);
  }

  /**
   * Check if a session is tmux-backed
   */
  isTmuxBacked(sessionId: string): boolean {
    const managed = this.processes.get(sessionId);
    return managed?.tmuxBacked ?? false;
  }

  /**
   * Get PTY process info
   */
  getProcessInfo(sessionId: string): PTYProcess | null {
    const managed = this.processes.get(sessionId);
    if (!managed) {
      return null;
    }

    return {
      sessionId,
      shell: managed.shell,
      pid: managed.pty.pid,
      cols: managed.pty.cols,
      rows: managed.pty.rows,
    };
  }

  /**
   * Get all running PTY process IDs
   */
  getRunningSessionIds(): string[] {
    return Array.from(this.processes.keys());
  }

  /**
   * Get the count of running PTY processes
   */
  getRunningCount(): number {
    return this.processes.size;
  }

  /**
   * Get the shell binary path
   * Resolves the actual path using filesystem checks and `which` command
   */
  private getShellPath(shell: ShellType): string {
    const paths = SHELL_BINARY_PATHS[shell];

    // First, check if any of the configured paths exist
    for (const p of paths) {
      if (p.startsWith('/') && existsSync(p)) {
        return p;
      }
    }

    // If paths are just command names (like 'claude'), try to resolve using `which`
    const commandName = paths[0];
    if (commandName && !commandName.startsWith('/')) {
      try {
        const resolvedPath = execSync(`which ${commandName}`, { encoding: 'utf-8' }).trim();
        if (resolvedPath && existsSync(resolvedPath)) {
          logger.debug({ shell, commandName, resolvedPath }, 'Resolved shell path using which');
          return resolvedPath;
        }
      } catch {
        // `which` failed, continue to error
      }
    }

    // Fallback to first path (will likely fail but gives better error)
    const fallback = paths[0];
    if (!fallback) {
      throw new Error(`No binary path found for shell: ${shell}`);
    }
    return fallback;
  }

  /**
   * Get shell startup arguments
   */
  private getShellArgs(shell: ShellType): string[] {
    return [...SHELL_STARTUP_ARGS[shell]];
  }

  /**
   * Kill all PTY processes (but keep tmux sessions for persistence)
   */
  killAll(): void {
    const sessionIds = Array.from(this.processes.keys());
    for (const sessionId of sessionIds) {
      this.kill(sessionId);
    }
    logger.info({ count: sessionIds.length }, 'Killed all PTY processes');
  }

  /**
   * Terminate all sessions (kills PTY AND tmux sessions)
   */
  async terminateAll(): Promise<void> {
    const sessionIds = Array.from(this.processes.keys());
    for (const sessionId of sessionIds) {
      await this.terminate(sessionId);
    }
    logger.info({ count: sessionIds.length }, 'Terminated all sessions');
  }

  /**
   * Cleanup resources (kills PTYs but preserves tmux sessions)
   */
  destroy(): void {
    this.killAll();
    this.removeAllListeners();
    logger.info('PTY manager destroyed (tmux sessions preserved)');
  }
}
