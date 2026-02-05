/**
 * Terminal Session Class
 *
 * Represents a terminal session with PTY process management.
 */

import {
  SessionType,
  SessionStatus,
  TerminalActivityStatus,
  type ShellType,
  type TerminalSession as TerminalSessionInterface,
  type TerminalConfig,
} from '@masterdashboard/shared';
import { BaseSession } from './base-session.js';

export class TerminalSession extends BaseSession implements TerminalSessionInterface {
  public readonly type = SessionType.TERMINAL;
  public readonly shell: ShellType;
  public readonly cwd: string;
  public readonly env?: Readonly<Record<string, string>>;
  public cols: number;
  public rows: number;
  public activityStatus: TerminalActivityStatus;
  public title?: string;
  public exitCode?: number;

  constructor(id: string, config: TerminalConfig) {
    super(id, SessionType.TERMINAL, config.projectId);

    this.shell = config.shell;
    this.cwd = config.cwd ?? process.env.HOME ?? '/';
    this.env = config.env ? Object.freeze({ ...config.env }) : undefined;
    this.cols = config.cols ?? 80;
    this.rows = config.rows ?? 24;
    this.activityStatus = TerminalActivityStatus.IDLE;
    this.title = config.title;
    this.status = SessionStatus.ACTIVE;
  }

  /**
   * Update terminal dimensions
   */
  resize(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.updatedAt = new Date();
    this.emit('resize', { cols, rows });
  }

  /**
   * Update activity status
   */
  setActivityStatus(status: TerminalActivityStatus): void {
    const previousStatus = this.activityStatus;
    this.activityStatus = status;
    this.updatedAt = new Date();
    this.emit('activity:change', { previousStatus, newStatus: status });
  }

  /**
   * Update terminal title
   */
  setTitle(title: string): void {
    this.title = title;
    this.updatedAt = new Date();
    this.emit('title:change', { title });
  }

  /**
   * Mark session as exited
   */
  setExited(exitCode: number): void {
    this.exitCode = exitCode;
    this.setStatus(SessionStatus.TERMINATED);
    this.emit('exit', { exitCode });
  }

  /**
   * Serialize to plain object
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      shell: this.shell,
      cwd: this.cwd,
      env: this.env,
      cols: this.cols,
      rows: this.rows,
      activityStatus: this.activityStatus,
      title: this.title,
      exitCode: this.exitCode,
    };
  }

  /**
   * Destroy the session
   */
  async destroy(): Promise<void> {
    this.setStatus(SessionStatus.TERMINATED);
    this.removeAllListeners();
  }
}
