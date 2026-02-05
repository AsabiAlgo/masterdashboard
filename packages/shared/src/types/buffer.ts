/**
 * Buffer Types
 *
 * Types for terminal scrollback buffer management.
 * Supports 20,000 lines of scrollback per terminal.
 */

/**
 * Default scrollback buffer configuration
 */
export const DEFAULT_BUFFER_CONFIG = {
  maxLines: 20000,
  persistToDisk: true,
  flushIntervalMs: 5000,
} as const;

/**
 * Scrollback buffer configuration
 */
export interface BufferConfig {
  /** Maximum lines to keep in buffer (default: 20000) */
  maxLines: number;
  /** Whether to persist buffer to disk */
  persistToDisk: boolean;
  /** How often to persist to disk (ms) */
  flushIntervalMs: number;
}

/**
 * Buffer state for a terminal session
 */
export interface TerminalBuffer {
  /** Session this buffer belongs to */
  readonly sessionId: string;
  /** Circular buffer of output lines */
  lines: string[];
  /** Total lines ever written (may exceed maxLines) */
  totalLines: number;
  /** When the buffer was last flushed to disk */
  lastFlushAt: Date;
}

/**
 * Serializable version of TerminalBuffer
 */
export interface SerializedTerminalBuffer {
  readonly sessionId: string;
  lines: string[];
  totalLines: number;
  lastFlushAt: string;
}

/**
 * Buffer snapshot for reconnection
 */
export interface BufferSnapshot {
  /** Session this snapshot is for */
  sessionId: string;
  /** All output since browser disconnected */
  outputSinceDisconnect: string;
  /** When the browser disconnected */
  disconnectTime: Date;
  /** When the browser reconnected */
  reconnectTime: Date;
}

/**
 * Serializable version of BufferSnapshot
 */
export interface SerializedBufferSnapshot {
  sessionId: string;
  outputSinceDisconnect: string;
  disconnectTime: string;
  reconnectTime: string;
}

/**
 * Buffer statistics for monitoring
 */
export interface BufferStats {
  /** Session this stat is for */
  sessionId: string;
  /** Current number of lines in buffer */
  currentLines: number;
  /** Maximum lines allowed */
  maxLines: number;
  /** Percentage of buffer used */
  usagePercent: number;
  /** Total lines ever written */
  totalLinesWritten: number;
  /** Approximate memory usage in bytes */
  memoryBytes: number;
}

/**
 * Buffer write options
 */
export interface BufferWriteOptions {
  /** Force immediate flush to disk */
  forceFlush?: boolean;
  /** Timestamp for the write */
  timestamp?: Date;
}

/**
 * Buffer read options
 */
export interface BufferReadOptions {
  /** Starting line index (0-based) */
  startLine?: number;
  /** Number of lines to read */
  lineCount?: number;
  /** Read from end of buffer */
  fromEnd?: boolean;
  /** Include line numbers in output */
  includeLineNumbers?: boolean;
}

/**
 * Buffer search options
 */
export interface BufferSearchOptions {
  /** Search pattern (string or regex) */
  pattern: string | RegExp;
  /** Case sensitive search */
  caseSensitive?: boolean;
  /** Maximum results to return */
  maxResults?: number;
  /** Search direction */
  direction?: 'forward' | 'backward';
}

/**
 * Buffer search result
 */
export interface BufferSearchResult {
  /** Line number where match was found */
  lineNumber: number;
  /** The matched line content */
  lineContent: string;
  /** Start index of match within line */
  matchStart: number;
  /** End index of match within line */
  matchEnd: number;
}
