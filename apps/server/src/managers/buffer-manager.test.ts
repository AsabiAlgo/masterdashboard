/**
 * Unit tests for BufferManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BufferManager } from './buffer-manager.js';

// Mock the persistence module
vi.mock('../persistence/database.js', () => ({
  insertOrUpdateBuffer: vi.fn(),
  getBufferBySessionId: vi.fn(),
  deleteBuffer: vi.fn(),
}));

// Mock the logger
vi.mock('../utils/logger.js', () => ({
  createChildLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('BufferManager', () => {
  let bufferManager: BufferManager;

  beforeEach(() => {
    vi.clearAllMocks();
    bufferManager = new BufferManager({
      maxLines: 100,
      persistToDisk: false,
    });
  });

  afterEach(() => {
    bufferManager.destroy();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const manager = new BufferManager();
      expect(manager).toBeDefined();
      manager.destroy();
    });

    it('should initialize with custom config', () => {
      const manager = new BufferManager({
        maxLines: 500,
        persistToDisk: true,
        flushIntervalMs: 5000,
      });
      expect(manager).toBeDefined();
      manager.destroy();
    });
  });

  describe('createBuffer', () => {
    it('should create a new buffer for a session', () => {
      bufferManager.createBuffer('sess_123');

      expect(bufferManager.hasBuffer('sess_123')).toBe(true);
    });

    it('should not recreate existing buffer', () => {
      bufferManager.createBuffer('sess_123');
      bufferManager.appendOutput('sess_123', 'some data');

      // Try to create again
      bufferManager.createBuffer('sess_123');

      // Original data should still be there
      expect(bufferManager.getFullBuffer('sess_123')).toBe('some data');
    });
  });

  describe('hasBuffer', () => {
    it('should return true for existing buffer', () => {
      bufferManager.createBuffer('sess_123');
      expect(bufferManager.hasBuffer('sess_123')).toBe(true);
    });

    it('should return false for non-existing buffer', () => {
      expect(bufferManager.hasBuffer('nonexistent')).toBe(false);
    });
  });

  describe('appendOutput', () => {
    it('should append data to buffer', () => {
      bufferManager.createBuffer('sess_123');
      bufferManager.appendOutput('sess_123', 'Hello');
      bufferManager.appendOutput('sess_123', ' World');

      // Buffer splits on newlines, so separate appends create separate lines
      expect(bufferManager.getFullBuffer('sess_123')).toBe('Hello\n World');
    });

    it('should handle multiline data', () => {
      bufferManager.createBuffer('sess_123');
      bufferManager.appendOutput('sess_123', 'line1\nline2\nline3');

      const buffer = bufferManager.getFullBuffer('sess_123');
      expect(buffer).toBe('line1\nline2\nline3');
    });

    it('should emit output event', () => {
      const handler = vi.fn();
      bufferManager.on('output', handler);

      bufferManager.createBuffer('sess_123');
      bufferManager.appendOutput('sess_123', 'test data');

      expect(handler).toHaveBeenCalledWith({
        sessionId: 'sess_123',
        data: 'test data',
      });
    });

    it('should not append to non-existent buffer', () => {
      // Should not throw, just log warning
      expect(() => {
        bufferManager.appendOutput('nonexistent', 'data');
      }).not.toThrow();
    });

    it('should trim buffer when exceeding maxLines', () => {
      const smallManager = new BufferManager({
        maxLines: 5,
        persistToDisk: false,
      });

      smallManager.createBuffer('sess_123');

      // Add 10 lines
      for (let i = 0; i < 10; i++) {
        smallManager.appendOutput('sess_123', `line${i}\n`);
      }

      const stats = smallManager.getBufferStats('sess_123');
      expect(stats).not.toBeNull();
      // Should be trimmed to maxLines (5)
      expect(stats!.currentLines).toBeLessThanOrEqual(5);

      smallManager.destroy();
    });
  });

  describe('getFullBuffer', () => {
    it('should return full buffer content', () => {
      bufferManager.createBuffer('sess_123');
      bufferManager.appendOutput('sess_123', 'line1\nline2\nline3');

      expect(bufferManager.getFullBuffer('sess_123')).toBe('line1\nline2\nline3');
    });

    it('should return empty string for non-existent buffer', () => {
      expect(bufferManager.getFullBuffer('nonexistent')).toBe('');
    });

    it('should return empty string for empty buffer', () => {
      bufferManager.createBuffer('sess_123');
      expect(bufferManager.getFullBuffer('sess_123')).toBe('');
    });
  });

  describe('getLastLines', () => {
    it('should return last N lines', () => {
      bufferManager.createBuffer('sess_123');
      bufferManager.appendOutput('sess_123', 'line1\nline2\nline3\nline4\nline5');

      expect(bufferManager.getLastLines('sess_123', 2)).toBe('line4\nline5');
    });

    it('should return all lines if count exceeds buffer', () => {
      bufferManager.createBuffer('sess_123');
      bufferManager.appendOutput('sess_123', 'line1\nline2');

      expect(bufferManager.getLastLines('sess_123', 10)).toBe('line1\nline2');
    });

    it('should return empty string for non-existent buffer', () => {
      expect(bufferManager.getLastLines('nonexistent', 5)).toBe('');
    });
  });

  describe('markDisconnect / clearDisconnect', () => {
    it('should mark disconnect position', () => {
      bufferManager.createBuffer('sess_123');
      bufferManager.appendOutput('sess_123', 'before\n');
      bufferManager.markDisconnect('sess_123');
      bufferManager.appendOutput('sess_123', 'after\n');

      const snapshot = bufferManager.getBufferSnapshot('sess_123');
      expect(snapshot).not.toBeNull();
      expect(snapshot!.outputSinceDisconnect).toContain('after');
    });

    it('should clear disconnect marker', () => {
      bufferManager.createBuffer('sess_123');
      bufferManager.markDisconnect('sess_123');
      bufferManager.clearDisconnect('sess_123');

      const snapshot = bufferManager.getBufferSnapshot('sess_123');
      expect(snapshot).not.toBeNull();
    });

    it('should handle disconnect on non-existent buffer', () => {
      expect(() => {
        bufferManager.markDisconnect('nonexistent');
      }).not.toThrow();
    });
  });

  describe('getBufferSnapshot', () => {
    it('should return snapshot with output since disconnect', () => {
      bufferManager.createBuffer('sess_123');
      bufferManager.appendOutput('sess_123', 'before disconnect\n');
      bufferManager.markDisconnect('sess_123');
      bufferManager.appendOutput('sess_123', 'after disconnect\n');

      const snapshot = bufferManager.getBufferSnapshot('sess_123');

      expect(snapshot).not.toBeNull();
      expect(snapshot!.sessionId).toBe('sess_123');
      expect(snapshot!.outputSinceDisconnect).toContain('after disconnect');
      expect(snapshot!.disconnectTime).toBeInstanceOf(Date);
      expect(snapshot!.reconnectTime).toBeInstanceOf(Date);
    });

    it('should return null for non-existent buffer', () => {
      const snapshot = bufferManager.getBufferSnapshot('nonexistent');
      expect(snapshot).toBeNull();
    });

    it('should return all output if no disconnect marked', () => {
      bufferManager.createBuffer('sess_123');
      bufferManager.appendOutput('sess_123', 'all content');

      const snapshot = bufferManager.getBufferSnapshot('sess_123');
      expect(snapshot?.outputSinceDisconnect).toBe('all content');
    });
  });

  describe('getBufferStats', () => {
    it('should return buffer statistics', () => {
      bufferManager.createBuffer('sess_123');
      bufferManager.appendOutput('sess_123', 'line1\nline2\nline3');

      const stats = bufferManager.getBufferStats('sess_123');

      expect(stats).not.toBeNull();
      expect(stats!.sessionId).toBe('sess_123');
      expect(stats!.currentLines).toBe(3);
      expect(stats!.maxLines).toBe(100);
      expect(stats!.usagePercent).toBe(3);
      expect(stats!.totalLinesWritten).toBe(3);
      expect(stats!.memoryBytes).toBeGreaterThan(0);
    });

    it('should return null for non-existent buffer', () => {
      const stats = bufferManager.getBufferStats('nonexistent');
      expect(stats).toBeNull();
    });

    it('should calculate usage percentage correctly', () => {
      const smallManager = new BufferManager({
        maxLines: 10,
        persistToDisk: false,
      });

      smallManager.createBuffer('sess_123');
      smallManager.appendOutput('sess_123', 'line1\nline2\nline3\nline4\nline5');

      const stats = smallManager.getBufferStats('sess_123');
      expect(stats!.usagePercent).toBe(50);

      smallManager.destroy();
    });
  });

  describe('deleteBuffer', () => {
    it('should delete buffer and disconnect timestamp', () => {
      bufferManager.createBuffer('sess_123');
      bufferManager.appendOutput('sess_123', 'some data');
      bufferManager.markDisconnect('sess_123');

      bufferManager.deleteBuffer('sess_123');

      expect(bufferManager.hasBuffer('sess_123')).toBe(false);
      expect(bufferManager.getFullBuffer('sess_123')).toBe('');
    });

    it('should handle deleting non-existent buffer', () => {
      expect(() => {
        bufferManager.deleteBuffer('nonexistent');
      }).not.toThrow();
    });
  });

  describe('loadBuffer', () => {
    it('should load buffer from database', async () => {
      const { getBufferBySessionId } = await import('../persistence/database.js');
      vi.mocked(getBufferBySessionId).mockReturnValue({
        id: 1,
        session_id: 'sess_123',
        content: 'persisted\ndata',
        total_lines: 2,
        last_flush_at: new Date().toISOString(),
      });

      const loaded = await bufferManager.loadBuffer('sess_123');

      expect(loaded).toBe(true);
      expect(bufferManager.hasBuffer('sess_123')).toBe(true);
      expect(bufferManager.getFullBuffer('sess_123')).toBe('persisted\ndata');
    });

    it('should return false if buffer not in database', async () => {
      const { getBufferBySessionId } = await import('../persistence/database.js');
      vi.mocked(getBufferBySessionId).mockReturnValue(null);

      const loaded = await bufferManager.loadBuffer('nonexistent');

      expect(loaded).toBe(false);
      expect(bufferManager.hasBuffer('nonexistent')).toBe(false);
    });
  });

  describe('flush', () => {
    it('should flush all buffers to disk', async () => {
      const manager = new BufferManager({
        maxLines: 100,
        persistToDisk: true,
        flushIntervalMs: 60000, // Long interval so auto-flush doesn't interfere
      });

      manager.createBuffer('sess_123');
      manager.appendOutput('sess_123', 'test data');

      await manager.flush();

      const { insertOrUpdateBuffer } = await import('../persistence/database.js');
      expect(insertOrUpdateBuffer).toHaveBeenCalled();

      manager.destroy();
    });
  });

  describe('destroy', () => {
    it('should clean up all resources', () => {
      bufferManager.createBuffer('sess_123');
      bufferManager.createBuffer('sess_456');

      bufferManager.destroy();

      expect(bufferManager.hasBuffer('sess_123')).toBe(false);
      expect(bufferManager.hasBuffer('sess_456')).toBe(false);
    });

    it('should clear flush interval', () => {
      const manager = new BufferManager({
        persistToDisk: true,
        flushIntervalMs: 1000,
      });

      // Destroy should clear the interval
      expect(() => {
        manager.destroy();
      }).not.toThrow();
    });
  });

  describe('circular buffer behavior', () => {
    it('should maintain max lines limit', () => {
      const smallManager = new BufferManager({
        maxLines: 3,
        persistToDisk: false,
      });

      smallManager.createBuffer('sess_123');
      smallManager.appendOutput('sess_123', 'line1\n');
      smallManager.appendOutput('sess_123', 'line2\n');
      smallManager.appendOutput('sess_123', 'line3\n');
      smallManager.appendOutput('sess_123', 'line4\n');
      smallManager.appendOutput('sess_123', 'line5\n');

      const stats = smallManager.getBufferStats('sess_123');
      expect(stats!.currentLines).toBeLessThanOrEqual(3);
      expect(stats!.totalLinesWritten).toBe(10); // Each append creates 2 lines due to trailing \n

      smallManager.destroy();
    });

    it('should adjust disconnect index when trimming', () => {
      const smallManager = new BufferManager({
        maxLines: 3,
        persistToDisk: false,
      });

      smallManager.createBuffer('sess_123');
      smallManager.appendOutput('sess_123', 'line1\n');
      smallManager.markDisconnect('sess_123');
      smallManager.appendOutput('sess_123', 'line2\n');
      smallManager.appendOutput('sess_123', 'line3\n');
      smallManager.appendOutput('sess_123', 'line4\n');
      smallManager.appendOutput('sess_123', 'line5\n');

      // Should still be able to get snapshot without error
      const snapshot = smallManager.getBufferSnapshot('sess_123');
      expect(snapshot).not.toBeNull();

      smallManager.destroy();
    });
  });
});
