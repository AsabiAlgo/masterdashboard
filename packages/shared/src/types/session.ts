/**
 * Session Types
 *
 * Core session interfaces and enums for managing terminal, browser, and SSH sessions.
 * Sessions persist across browser disconnects (tmux-style).
 */

/**
 * Types of sessions supported by Master Dashboard
 */
export enum SessionType {
  /** Local terminal session */
  TERMINAL = 'terminal',
  /** Browser automation session (V2) */
  BROWSER = 'browser',
  /** SSH remote connection session */
  SSH = 'ssh',
}

/**
 * Session lifecycle states
 */
export enum SessionStatus {
  /** Session is being created */
  CREATING = 'creating',
  /** Session is active and connected */
  ACTIVE = 'active',
  /** Browser disconnected, PTY/process still running */
  PAUSED = 'paused',
  /** Browser disconnected, tmux session alive (can reconnect after server restart) */
  DISCONNECTED = 'disconnected',
  /** Browser is attempting to reconnect */
  RECONNECTING = 'reconnecting',
  /** Session has been terminated */
  TERMINATED = 'terminated',
  /** Session encountered an error */
  ERROR = 'error',
}

/**
 * Base interface for all session types
 */
export interface BaseSession {
  /** Unique session identifier */
  readonly id: string;
  /** Type of session (terminal, browser, ssh) */
  readonly type: SessionType;
  /** Current lifecycle status */
  status: SessionStatus;
  /** Project this session belongs to */
  readonly projectId: string;
  /** When the session was created */
  readonly createdAt: Date;
  /** When the session was last updated */
  updatedAt: Date;
  /** When the session was last active (for timeout tracking) */
  lastActiveAt: Date;
  /** Optional metadata for extensions */
  metadata?: Record<string, unknown>;
}

/**
 * Serializable version of BaseSession for WebSocket transport
 */
export interface SerializedBaseSession {
  readonly id: string;
  readonly type: SessionType;
  status: SessionStatus;
  readonly projectId: string;
  readonly createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
  metadata?: Record<string, unknown>;
}
