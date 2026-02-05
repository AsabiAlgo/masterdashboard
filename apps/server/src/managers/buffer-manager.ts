/**
 * Buffer Manager
 *
 * Manages scrollback buffers for terminal sessions.
 * Buffers persist across browser disconnects and can be replayed on reconnect.
 */

import { EventEmitter } from 'events';
import type { BufferConfig, BufferSnapshot, BufferStats } from '@masterdashboard/shared';
import { DEFAULT_BUFFER_CONFIG } from '@masterdashboard/shared';
import { createChildLogger } from '../utils/logger.js';
import { insertOrUpdateBuffer, getBufferBySessionId, deleteBuffer, sessionExists } from '../persistence/database.js';
import type { InternalBuffer } from './types.js';

const logger = createChildLogger('buffer-manager');

/**
 * Filter out terminal device attribute responses from buffer content.
 * These are responses to DA1 (ESC[c) and DA2 (ESC[>c) queries from tmux.
 * If not filtered, they appear as visible text like "[?1;2c[>0;276;0c"
 */
function filterDeviceAttributeResponses(content: string): string {
  // ESC [ ? Ps c - Primary Device Attributes response
  // ESC [ > Ps ; Ps ; Ps c - Secondary Device Attributes response
  // These can appear with or without the ESC character if partially captured
  return content
    .replace(/\x1b\[\?[\d;]*c/g, '')  // Primary DA with ESC
    .replace(/\x1b\[>[\d;]*c/g, '')   // Secondary DA with ESC
    .replace(/\[\?[\d;]*c/g, '')      // Primary DA without ESC (partial capture)
    .replace(/\[>[\d;]*c/g, '');      // Secondary DA without ESC (partial capture)
}

export interface BufferManagerConfig extends Partial<BufferConfig> {
  /** Enable disk persistence */
  persistToDisk?: boolean;
}

export class BufferManager extends EventEmitter {
  private buffers = new Map<string, InternalBuffer>();
  private disconnectTimestamps = new Map<string, Date>();
  private config: BufferConfig;
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: BufferManagerConfig = {}) {
    super();
    this.config = {
      maxLines: config.maxLines ?? DEFAULT_BUFFER_CONFIG.maxLines,
      persistToDisk: config.persistToDisk ?? DEFAULT_BUFFER_CONFIG.persistToDisk,
      flushIntervalMs: config.flushIntervalMs ?? DEFAULT_BUFFER_CONFIG.flushIntervalMs,
    };

    // Start periodic flush to disk
    if (this.config.persistToDisk) {
      this.flushInterval = setInterval(
        () => this.flushAllToDisk(),
        this.config.flushIntervalMs
      );
    }

    logger.info({ config: this.config }, 'Buffer manager initialized');
  }

  /**
   * Create a new buffer for a session
   */
  createBuffer(sessionId: string): void {
    if (this.buffers.has(sessionId)) {
      logger.warn({ sessionId }, 'Buffer already exists, skipping creation');
      return;
    }

    const buffer: InternalBuffer = {
      sessionId,
      lines: [],
      totalLines: 0,
      lastFlushAt: new Date(),
    };

    this.buffers.set(sessionId, buffer);
    logger.debug({ sessionId }, 'Created buffer');
  }

  /**
   * Load buffer from disk if it exists
   */
  async loadBuffer(sessionId: string): Promise<boolean> {
    const row = getBufferBySessionId(sessionId);
    if (!row) {
      return false;
    }

    // Store as single chunk - raw content from disk
    const buffer: InternalBuffer = {
      sessionId,
      lines: row.content ? [row.content] : [],
      totalLines: row.total_lines,
      lastFlushAt: new Date(row.last_flush_at),
    };

    this.buffers.set(sessionId, buffer);
    logger.debug({ sessionId, chunks: buffer.lines.length }, 'Loaded buffer from disk');
    return true;
  }

  /**
   * Append output to buffer (called on every PTY output)
   */
  appendOutput(sessionId: string, data: string): void {
    const buffer = this.buffers.get(sessionId);
    if (!buffer) {
      logger.warn({ sessionId }, 'Attempted to append to non-existent buffer');
      return;
    }

    // Store raw chunks to preserve escape sequences and \r characters
    // Each "line" is actually a raw output chunk
    buffer.lines.push(data);
    buffer.totalLines += 1;

    // Trim old chunks (keep last maxLines chunks)
    if (buffer.lines.length > this.config.maxLines) {
      const trimCount = buffer.lines.length - this.config.maxLines;
      buffer.lines.splice(0, trimCount);

      // Adjust disconnect index if it exists
      if (buffer.disconnectLineIndex !== undefined) {
        buffer.disconnectLineIndex = Math.max(0, buffer.disconnectLineIndex - trimCount);
      }
    }

    this.emit('output', { sessionId, data });
  }

  /**
   * Mark when a client disconnects (for replay calculation)
   */
  markDisconnect(sessionId: string): void {
    this.disconnectTimestamps.set(sessionId, new Date());

    const buffer = this.buffers.get(sessionId);
    if (buffer) {
      buffer.disconnectLineIndex = buffer.lines.length;
      logger.debug(
        { sessionId, disconnectLineIndex: buffer.disconnectLineIndex },
        'Marked disconnect'
      );
    }
  }

  /**
   * Get buffered output since disconnect for replay
   * @param includeFullBuffer - If true, returns full buffer instead of just output since disconnect
   */
  getBufferSnapshot(sessionId: string, includeFullBuffer = false): BufferSnapshot | null {
    const buffer = this.buffers.get(sessionId);
    const disconnectTime = this.disconnectTimestamps.get(sessionId);

    if (!buffer) {
      logger.warn({ sessionId }, 'Buffer not found for snapshot');
      return null;
    }

    // For full buffer (browser refresh), return all chunks concatenated
    // For incremental (short disconnect), return only output since disconnect
    // Join without separator to preserve raw terminal output
    let outputSinceDisconnect: string;
    if (includeFullBuffer) {
      outputSinceDisconnect = buffer.lines.join('');
    } else {
      const disconnectLineIndex = buffer.disconnectLineIndex ?? 0;
      outputSinceDisconnect = buffer.lines.slice(disconnectLineIndex).join('');
    }

    // Filter out terminal device attribute responses that would appear as garbage text
    outputSinceDisconnect = filterDeviceAttributeResponses(outputSinceDisconnect);

    logger.debug({ sessionId, contentLength: outputSinceDisconnect.length }, 'Returning buffer for replay');

    return {
      sessionId,
      outputSinceDisconnect,
      disconnectTime: disconnectTime ?? new Date(),
      reconnectTime: new Date(),
    };
  }

  /**
   * Clear disconnect marker on successful reconnect
   */
  clearDisconnect(sessionId: string): void {
    this.disconnectTimestamps.delete(sessionId);

    const buffer = this.buffers.get(sessionId);
    if (buffer) {
      delete buffer.disconnectLineIndex;
      logger.debug({ sessionId }, 'Cleared disconnect marker');
    }
  }

  /**
   * Get full scrollback for a session
   */
  getFullBuffer(sessionId: string): string {
    const buffer = this.buffers.get(sessionId);
    return buffer ? buffer.lines.join('') : '';
  }

  /**
   * Get the last N chunks from a buffer
   */
  getLastLines(sessionId: string, count: number): string {
    const buffer = this.buffers.get(sessionId);
    if (!buffer) {
      return '';
    }
    return buffer.lines.slice(-count).join('');
  }

  /**
   * Get buffer statistics
   */
  getBufferStats(sessionId: string): BufferStats | null {
    const buffer = this.buffers.get(sessionId);
    if (!buffer) {
      return null;
    }

    const content = buffer.lines.join('');
    const memoryBytes = Buffer.byteLength(content, 'utf8');

    return {
      sessionId,
      currentLines: buffer.lines.length, // Actually chunk count now
      maxLines: this.config.maxLines,
      usagePercent: (buffer.lines.length / this.config.maxLines) * 100,
      totalLinesWritten: buffer.totalLines,
      memoryBytes,
    };
  }

  /**
   * Check if a session has a buffer
   */
  hasBuffer(sessionId: string): boolean {
    return this.buffers.has(sessionId);
  }

  /**
   * Cleanup buffer when session terminates
   */
  deleteBuffer(sessionId: string): void {
    this.buffers.delete(sessionId);
    this.disconnectTimestamps.delete(sessionId);

    // Also delete from disk
    if (this.config.persistToDisk) {
      try {
        deleteBuffer(sessionId);
      } catch (error) {
        logger.error({ sessionId, error }, 'Failed to delete buffer from disk');
      }
    }

    logger.debug({ sessionId }, 'Deleted buffer');
  }

  /**
   * Persist a single buffer to disk
   */
  private persistBuffer(sessionId: string, buffer: InternalBuffer): void {
    try {
      // Check if session exists in database before persisting
      // This avoids foreign key constraint errors for orphaned buffers
      if (!sessionExists(sessionId)) {
        // Silently skip - session no longer exists (e.g., after server restart)
        return;
      }

      insertOrUpdateBuffer({
        session_id: sessionId,
        content: buffer.lines.join(''),
        total_lines: buffer.totalLines,
        last_flush_at: new Date().toISOString(),
      });
      buffer.lastFlushAt = new Date();
    } catch (error) {
      logger.error({ sessionId, error }, 'Failed to persist buffer');
    }
  }

  /**
   * Persist all buffers to disk
   */
  private flushAllToDisk(): void {
    for (const [sessionId, buffer] of this.buffers) {
      this.persistBuffer(sessionId, buffer);
    }
    logger.debug({ count: this.buffers.size }, 'Flushed all buffers to disk');
  }

  /**
   * Force flush all buffers (for graceful shutdown)
   */
  async flush(): Promise<void> {
    this.flushAllToDisk();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Final flush
    this.flushAllToDisk();

    this.buffers.clear();
    this.disconnectTimestamps.clear();
    this.removeAllListeners();

    logger.info('Buffer manager destroyed');
  }
}
