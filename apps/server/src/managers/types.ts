/**
 * Manager Types
 *
 * Internal types used by the manager layer.
 */

import type {
  BaseSession,
  TerminalSession,
  TerminalActivityStatus,
  BufferSnapshot,
  SessionStatus,
} from '@masterdashboard/shared';

/**
 * Internal buffer state with disconnect tracking
 */
export interface InternalBuffer {
  sessionId: string;
  lines: string[];
  totalLines: number;
  lastFlushAt: Date;
  /** Line index when client disconnected */
  disconnectLineIndex?: number;
}

/**
 * Result of client reconnection
 */
export interface ReconnectResult {
  activeSessions: string[];
  terminatedSessions: string[];
  buffers: BufferSnapshot[];
  statusChanges: Array<{
    sessionId: string;
    status: SessionStatus;
    activityStatus?: TerminalActivityStatus;
  }>;
}

/**
 * Session event types emitted by SessionManager
 */
export type SessionEvent =
  | { type: 'created'; session: BaseSession }
  | { type: 'terminated'; sessionId: string; exitCode?: number }
  | { type: 'paused'; sessionId: string }
  | { type: 'reconnected'; sessionId: string; clientId: string }
  | { type: 'error'; sessionId: string; error: Error };

/**
 * Terminal output event
 */
export interface TerminalOutputEvent {
  sessionId: string;
  data: string;
  timestamp: number;
}

/**
 * Status change event from detector
 */
export interface StatusChangeEventInternal {
  sessionId: string;
  previousStatus: TerminalActivityStatus;
  newStatus: TerminalActivityStatus;
  matchedPattern?: string;
  timestamp: Date;
}

/**
 * PTY process info
 */
export interface PTYProcess {
  sessionId: string;
  shell: string;
  pid: number;
  cols: number;
  rows: number;
}

/**
 * Manager options
 */
export interface ManagerOptions {
  /** Maximum scrollback lines per terminal */
  maxScrollbackLines: number;
  /** Interval for persisting buffers to disk */
  bufferFlushIntervalMs: number;
  /** How often to check for stale sessions */
  sessionCleanupIntervalMs: number;
  /** How long before a paused session is considered stale */
  pausedSessionTimeoutMs: number;
}
