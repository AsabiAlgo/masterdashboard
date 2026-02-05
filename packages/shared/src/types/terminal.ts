/**
 * Terminal Types
 *
 * Types for terminal sessions including shell types, activity status,
 * and terminal-specific configuration.
 */

import type { BaseSession, SerializedBaseSession } from './session.js';
import { SessionType } from './session.js';

/**
 * Supported shell types
 */
export enum ShellType {
  BASH = 'bash',
  ZSH = 'zsh',
  FISH = 'fish',
  POWERSHELL = 'powershell',
  CMD = 'cmd',
  SH = 'sh',
  /** Claude Code CLI */
  CLAUDE_CODE = 'claude-code',
  /** Claude Code CLI with --dangerously-skip-permissions flag */
  CLAUDE_CODE_SKIP_PERMISSIONS = 'claude-code-skip-permissions',
}

/**
 * Terminal activity status for visual indicators (status glow)
 */
export enum TerminalActivityStatus {
  /** Command is executing (green glow) */
  WORKING = 'working',
  /** Awaiting user input (yellow glow) */
  WAITING = 'waiting',
  /** Error occurred (red glow) */
  ERROR = 'error',
  /** No recent activity (gray/no glow) */
  IDLE = 'idle',
}

/**
 * Terminal session extending base session
 */
export interface TerminalSession extends BaseSession {
  readonly type: SessionType.TERMINAL;
  /** Shell being used */
  readonly shell: ShellType;
  /** Current working directory */
  readonly cwd: string;
  /** Environment variables */
  readonly env?: Readonly<Record<string, string>>;
  /** Terminal columns */
  cols: number;
  /** Terminal rows */
  rows: number;
  /** Current activity status for UI indicators */
  activityStatus: TerminalActivityStatus;
  /** Custom or auto-detected terminal title */
  title?: string;
  /** Exit code if session terminated */
  exitCode?: number;
}

/**
 * Serializable version of TerminalSession for WebSocket transport
 */
export interface SerializedTerminalSession extends SerializedBaseSession {
  readonly type: SessionType.TERMINAL;
  readonly shell: ShellType;
  readonly cwd: string;
  readonly env?: Readonly<Record<string, string>>;
  cols: number;
  rows: number;
  activityStatus: TerminalActivityStatus;
  title?: string;
  exitCode?: number;
}

/**
 * Configuration for creating a new terminal session
 */
export interface TerminalConfig {
  /** Shell to use */
  shell: ShellType;
  /** Initial working directory */
  cwd?: string;
  /** Environment variables to set */
  env?: Record<string, string>;
  /** Initial terminal columns */
  cols?: number;
  /** Initial terminal rows */
  rows?: number;
  /** Project this terminal belongs to */
  projectId: string;
  /** Optional custom title */
  title?: string;
}

/**
 * Payload for terminal reconnection
 */
export interface TerminalReconnectPayload {
  /** Session to reconnect to */
  sessionId: string;
  /** Output buffered since disconnect */
  bufferedOutput: string;
  /** Current status of the terminal */
  currentStatus: TerminalActivityStatus;
}

/**
 * Terminal dimensions for resize events
 */
export interface TerminalDimensions {
  cols: number;
  rows: number;
}

/**
 * Default terminal dimensions
 */
export const DEFAULT_TERMINAL_DIMENSIONS: Readonly<TerminalDimensions> = {
  cols: 100,
  rows: 30,
} as const;
