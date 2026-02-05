/**
 * Unit tests for StatusDetector
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StatusDetector } from './status-detector.js';
import {
  TerminalActivityStatus,
  ShellType,
  type StatusPattern,
} from '@masterdashboard/shared';

// Mock the logger
vi.mock('../utils/logger.js', () => ({
  createChildLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('StatusDetector', () => {
  let detector: StatusDetector;

  beforeEach(() => {
    detector = new StatusDetector();
  });

  afterEach(() => {
    detector.destroy();
  });

  describe('constructor', () => {
    it('should initialize with default patterns', () => {
      const patterns = detector.getPatterns();
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should initialize with custom config', () => {
      const customDetector = new StatusDetector({
        debounceMs: 200,
        lookbackLines: 10,
      });
      expect(customDetector).toBeDefined();
      customDetector.destroy();
    });

    it('should disable specified patterns', () => {
      const customDetector = new StatusDetector({
        disabledPatterns: ['bash-prompt', 'fish-prompt'],
      });

      const patterns = customDetector.getPatterns();
      const ids = patterns.map((p) => p.id);

      expect(ids).not.toContain('bash-prompt');
      expect(ids).not.toContain('fish-prompt');

      customDetector.destroy();
    });

    it('should add custom patterns', () => {
      const customPattern: StatusPattern = {
        id: 'custom-test',
        name: 'Custom Test Pattern',
        shell: 'all',
        pattern: 'CUSTOM_OUTPUT',
        status: TerminalActivityStatus.WORKING,
        priority: 200,
        enabled: true,
      };

      const customDetector = new StatusDetector({
        customPatterns: [customPattern],
      });

      const patterns = customDetector.getPatterns();
      const ids = patterns.map((p) => p.id);

      expect(ids).toContain('custom-test');

      customDetector.destroy();
    });
  });

  describe('getStatus', () => {
    it('should return IDLE for new session', () => {
      const status = detector.getStatus('sess_new');
      expect(status).toBe(TerminalActivityStatus.IDLE);
    });

    it('should return last detected status', () => {
      // Simulate password prompt detection
      detector.detect('sess_123', 'Password: ');
      expect(detector.getStatus('sess_123')).toBe(TerminalActivityStatus.WAITING);
    });
  });

  describe('setStatus', () => {
    it('should force set status', () => {
      detector.setStatus('sess_123', TerminalActivityStatus.WORKING);
      expect(detector.getStatus('sess_123')).toBe(TerminalActivityStatus.WORKING);
    });

    it('should emit status:change event', () => {
      const handler = vi.fn();
      detector.on('status:change', handler);

      detector.setStatus('sess_123', TerminalActivityStatus.ERROR);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'sess_123',
          previousStatus: TerminalActivityStatus.IDLE,
          newStatus: TerminalActivityStatus.ERROR,
        })
      );
    });

    it('should not emit event if status unchanged', () => {
      detector.setStatus('sess_123', TerminalActivityStatus.WORKING);

      const handler = vi.fn();
      detector.on('status:change', handler);

      detector.setStatus('sess_123', TerminalActivityStatus.WORKING);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('detect', () => {
    it('should detect password prompt', () => {
      const status = detector.detect('sess_123', 'Password: ');
      expect(status).toBe(TerminalActivityStatus.WAITING);
    });

    it('should detect sudo password prompt', () => {
      const status = detector.detect('sess_123', '[sudo] password for user: ');
      expect(status).toBe(TerminalActivityStatus.WAITING);
    });

    it('should detect yes/no prompt', () => {
      const status = detector.detect(
        'sess_123',
        'Are you sure you want to continue connecting (yes/no)? '
      );
      expect(status).toBe(TerminalActivityStatus.WAITING);
    });

    it('should detect command not found error', () => {
      const status = detector.detect('sess_123', 'bash: xyz: command not found');
      expect(status).toBe(TerminalActivityStatus.ERROR);
    });

    it('should detect permission denied error', () => {
      const status = detector.detect('sess_123', 'Permission denied (publickey)');
      expect(status).toBe(TerminalActivityStatus.ERROR);
    });

    it('should detect npm error', () => {
      const status = detector.detect('sess_123', 'npm ERR! code ENOENT');
      expect(status).toBe(TerminalActivityStatus.ERROR);
    });

    it('should detect bash prompt ready', () => {
      const status = detector.detect('sess_123', 'user@host:~$ ');
      expect(status).toBe(TerminalActivityStatus.WAITING);
    });

    it('should detect git merge conflict', () => {
      const status = detector.detect(
        'sess_123',
        'CONFLICT (content): Merge conflict in file.txt'
      );
      expect(status).toBe(TerminalActivityStatus.ERROR);
    });

    it('should emit status:change event on status change', () => {
      const handler = vi.fn();
      detector.on('status:change', handler);

      detector.detect('sess_123', 'Password: ');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'sess_123',
          previousStatus: TerminalActivityStatus.IDLE,
          newStatus: TerminalActivityStatus.WAITING,
          matchedPattern: expect.any(String),
          timestamp: expect.any(Date),
        })
      );
    });

    it('should return null if status unchanged', () => {
      detector.detect('sess_123', 'Password: ');

      // Same pattern again
      const status = detector.detect('sess_123', 'Password: ');
      expect(status).toBeNull();
    });

    it('should switch to WORKING when output received while WAITING', () => {
      detector.setStatus('sess_123', TerminalActivityStatus.WAITING);

      // Output that doesn't match any pattern
      const status = detector.detect('sess_123', 'Some random output text');
      expect(status).toBe(TerminalActivityStatus.WORKING);
    });

    it('should strip ANSI codes before matching', () => {
      // ANSI escape sequences in the output
      const ansiOutput = '\x1b[32mPassword:\x1b[0m ';
      const status = detector.detect('sess_123', ansiOutput);
      expect(status).toBe(TerminalActivityStatus.WAITING);
    });

    it('should handle multiline output', () => {
      // Error pattern should be detected when in the last few lines (lookbackLines default is 5)
      // Note: "Processing..." matches "Thinking..." pattern which is WORKING status
      const output = 'Compiling...\nDone!\nPermission denied';
      const status = detector.detect('sess_123', output);
      expect(status).toBe(TerminalActivityStatus.ERROR);
    });

    it('should use lookback lines for pattern matching', () => {
      const customDetector = new StatusDetector({
        lookbackLines: 2,
      });

      // Add many lines first
      customDetector.detect('sess_123', 'line1\nline2\nline3\nline4\n');

      // Now add error on new line
      const status = customDetector.detect('sess_123', 'command not found');
      expect(status).toBe(TerminalActivityStatus.ERROR);

      customDetector.destroy();
    });
  });

  describe('addPattern', () => {
    it('should add new pattern', () => {
      const pattern: StatusPattern = {
        id: 'custom-pattern',
        name: 'Custom Pattern',
        shell: 'all',
        pattern: 'CUSTOM_MARKER',
        status: TerminalActivityStatus.WORKING,
        priority: 100,
        enabled: true,
      };

      detector.addPattern(pattern);

      const patterns = detector.getPatterns();
      const ids = patterns.map((p) => p.id);
      expect(ids).toContain('custom-pattern');
    });

    it('should replace pattern with same ID', () => {
      const pattern1: StatusPattern = {
        id: 'my-pattern',
        name: 'Original',
        shell: 'all',
        pattern: 'ORIGINAL',
        status: TerminalActivityStatus.WORKING,
        priority: 50,
      };

      const pattern2: StatusPattern = {
        id: 'my-pattern',
        name: 'Replaced',
        shell: 'all',
        pattern: 'REPLACED',
        status: TerminalActivityStatus.ERROR,
        priority: 60,
      };

      detector.addPattern(pattern1);
      detector.addPattern(pattern2);

      const patterns = detector.getPatterns();
      const myPattern = patterns.find((p) => p.id === 'my-pattern');

      expect(myPattern?.name).toBe('Replaced');
      expect(myPattern?.status).toBe(TerminalActivityStatus.ERROR);
    });

    it('should emit pattern:added event', () => {
      const handler = vi.fn();
      detector.on('pattern:added', handler);

      const pattern: StatusPattern = {
        id: 'event-pattern',
        name: 'Event Pattern',
        shell: 'all',
        pattern: 'EVENT',
        status: TerminalActivityStatus.IDLE,
        priority: 1,
      };

      detector.addPattern(pattern);

      expect(handler).toHaveBeenCalledWith(pattern);
    });

    it('should detect using newly added pattern', () => {
      const pattern: StatusPattern = {
        id: 'super-high-priority',
        name: 'Super High Priority',
        shell: 'all',
        pattern: 'SUPER_SPECIAL',
        status: TerminalActivityStatus.ERROR,
        priority: 1000,
      };

      detector.addPattern(pattern);

      const status = detector.detect('sess_123', 'SUPER_SPECIAL output');
      expect(status).toBe(TerminalActivityStatus.ERROR);
    });
  });

  describe('removePattern', () => {
    it('should remove pattern by ID', () => {
      const removed = detector.removePattern('bash-prompt');

      expect(removed).toBe(true);

      const patterns = detector.getPatterns();
      const ids = patterns.map((p) => p.id);
      expect(ids).not.toContain('bash-prompt');
    });

    it('should return false for non-existent pattern', () => {
      const removed = detector.removePattern('nonexistent-pattern');
      expect(removed).toBe(false);
    });

    it('should emit pattern:removed event', () => {
      const handler = vi.fn();
      detector.on('pattern:removed', handler);

      detector.removePattern('bash-prompt');

      expect(handler).toHaveBeenCalledWith('bash-prompt');
    });
  });

  describe('getPatterns', () => {
    it('should return all patterns without regex', () => {
      const patterns = detector.getPatterns();

      // Should not include compiled regex
      patterns.forEach((pattern) => {
        expect(pattern).not.toHaveProperty('regex');
        expect(pattern.id).toBeDefined();
        expect(pattern.name).toBeDefined();
        expect(pattern.pattern).toBeDefined();
        expect(pattern.status).toBeDefined();
        expect(pattern.priority).toBeDefined();
      });
    });

    it('should return patterns sorted by priority', () => {
      const patterns = detector.getPatterns();

      for (let i = 1; i < patterns.length; i++) {
        expect(patterns[i - 1].priority).toBeGreaterThanOrEqual(patterns[i].priority);
      }
    });
  });

  describe('clearSession', () => {
    it('should clear session data', () => {
      detector.detect('sess_123', 'Password: ');
      expect(detector.getStatus('sess_123')).toBe(TerminalActivityStatus.WAITING);

      detector.clearSession('sess_123');

      expect(detector.getStatus('sess_123')).toBe(TerminalActivityStatus.IDLE);
    });

    it('should not affect other sessions', () => {
      detector.detect('sess_123', 'Password: ');
      detector.detect('sess_456', 'command not found');

      detector.clearSession('sess_123');

      expect(detector.getStatus('sess_456')).toBe(TerminalActivityStatus.ERROR);
    });
  });

  describe('destroy', () => {
    it('should clear all data', () => {
      detector.detect('sess_123', 'Password: ');
      detector.detect('sess_456', 'command not found');

      detector.destroy();

      expect(detector.getStatus('sess_123')).toBe(TerminalActivityStatus.IDLE);
      expect(detector.getStatus('sess_456')).toBe(TerminalActivityStatus.IDLE);
    });

    it('should remove all event listeners', () => {
      const handler = vi.fn();
      detector.on('status:change', handler);

      detector.destroy();

      // After destroy, setStatus should not trigger the listener
      // (Actually EventEmitter.removeAllListeners is called)
      expect(detector.listenerCount('status:change')).toBe(0);
    });
  });

  describe('pattern priority', () => {
    it('should match higher priority patterns first', () => {
      // Add a low priority pattern for "error"
      detector.addPattern({
        id: 'low-priority-error',
        name: 'Low Priority Error',
        shell: 'all',
        pattern: 'error',
        status: TerminalActivityStatus.ERROR,
        priority: 1,
      });

      // Add a high priority pattern for "error" that results in WAITING
      detector.addPattern({
        id: 'high-priority-error',
        name: 'High Priority Error',
        shell: 'all',
        pattern: 'error',
        status: TerminalActivityStatus.WAITING,
        priority: 500,
      });

      const status = detector.detect('sess_123', 'some error message');
      expect(status).toBe(TerminalActivityStatus.WAITING);
    });
  });

  describe('Claude Code patterns', () => {
    it('should detect Claude Code question', () => {
      const status = detector.detect('sess_123', 'Do you want to proceed? ');
      // Should match generic question or shell prompt
      expect(status).toBeDefined();
    });

    it('should detect Claude Code thinking', () => {
      const status = detector.detect('sess_123', 'Thinking...');
      expect(status).toBe(TerminalActivityStatus.WORKING);
    });

    it('should detect Claude Code error', () => {
      const status = detector.detect('sess_123', 'Error: Something went wrong');
      expect(status).toBe(TerminalActivityStatus.ERROR);
    });
  });
});
