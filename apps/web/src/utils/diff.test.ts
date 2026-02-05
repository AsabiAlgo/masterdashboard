/**
 * Diff Utility Tests
 *
 * Tests for file diff computation.
 */

import { describe, it, expect } from 'vitest';
import { computeDiff } from './diff';

describe('computeDiff', () => {
  describe('identical content', () => {
    it('should detect no changes for identical content', () => {
      const result = computeDiff('line1\nline2', 'line1\nline2');

      expect(result.stats.additions).toBe(0);
      expect(result.stats.deletions).toBe(0);
      expect(result.lines.every((l) => l.type === 'unchanged')).toBe(true);
    });

    it('should return correct line numbers for identical content', () => {
      const result = computeDiff('a\nb\nc', 'a\nb\nc');

      expect(result.lines).toHaveLength(3);
      expect(result.lines[0]).toMatchObject({
        type: 'unchanged',
        leftLineNumber: 1,
        rightLineNumber: 1,
        leftContent: 'a',
        rightContent: 'a',
      });
      expect(result.lines[2]).toMatchObject({
        type: 'unchanged',
        leftLineNumber: 3,
        rightLineNumber: 3,
        leftContent: 'c',
        rightContent: 'c',
      });
    });
  });

  describe('additions', () => {
    it('should detect added lines', () => {
      // Use trailing newlines for consistent behavior
      const result = computeDiff('line1\n', 'line1\nline2\n');

      expect(result.stats.additions).toBe(1);
      expect(result.stats.deletions).toBe(0);
      expect(result.lines.some((l) => l.type === 'added' && l.rightContent === 'line2')).toBe(true);
    });

    it('should detect multiple added lines', () => {
      const result = computeDiff('a\n', 'a\nb\nc\n');

      expect(result.stats.additions).toBe(2);
    });

    it('should assign correct line numbers for additions', () => {
      const result = computeDiff('a\n', 'a\nb\n');

      const addedLine = result.lines.find((l) => l.type === 'added');
      expect(addedLine).toBeDefined();
      expect(addedLine?.rightLineNumber).toBe(2);
      expect(addedLine?.leftLineNumber).toBeUndefined();
    });
  });

  describe('deletions', () => {
    it('should detect removed lines', () => {
      // Use trailing newlines for consistent behavior
      const result = computeDiff('line1\nline2\n', 'line1\n');

      expect(result.stats.deletions).toBe(1);
      expect(result.stats.additions).toBe(0);
      expect(result.lines.some((l) => l.type === 'removed' && l.leftContent === 'line2')).toBe(true);
    });

    it('should detect multiple removed lines', () => {
      const result = computeDiff('a\nb\nc\n', 'a\n');

      expect(result.stats.deletions).toBe(2);
    });

    it('should assign correct line numbers for deletions', () => {
      const result = computeDiff('a\nb\n', 'a\n');

      const removedLine = result.lines.find((l) => l.type === 'removed');
      expect(removedLine).toBeDefined();
      expect(removedLine?.leftLineNumber).toBe(2);
      expect(removedLine?.rightLineNumber).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty left content', () => {
      const result = computeDiff('', 'new content');

      expect(result.stats.additions).toBeGreaterThan(0);
      expect(result.stats.deletions).toBe(0);
    });

    it('should handle empty right content', () => {
      const result = computeDiff('old content', '');

      expect(result.stats.deletions).toBeGreaterThan(0);
      expect(result.stats.additions).toBe(0);
    });

    it('should handle both empty', () => {
      const result = computeDiff('', '');

      expect(result.stats.additions).toBe(0);
      expect(result.stats.deletions).toBe(0);
      expect(result.lines).toHaveLength(0);
    });

    it('should handle single line without newline', () => {
      const result = computeDiff('hello', 'world');

      expect(result.stats.deletions).toBe(1);
      expect(result.stats.additions).toBe(1);
    });

    it('should handle trailing newlines', () => {
      const result = computeDiff('a\n', 'a\n');

      expect(result.stats.additions).toBe(0);
      expect(result.stats.deletions).toBe(0);
    });
  });

  describe('complex changes', () => {
    it('should handle interleaved changes', () => {
      const result = computeDiff('a\nb\nc', 'a\nx\nc');

      expect(result.stats.deletions).toBe(1);
      expect(result.stats.additions).toBe(1);
      expect(result.lines.find((l) => l.type === 'removed')?.leftContent).toBe('b');
      expect(result.lines.find((l) => l.type === 'added')?.rightContent).toBe('x');
    });

    it('should maintain correct line order', () => {
      const result = computeDiff('a\nb\nc', 'a\nx\ny\nc');

      const types = result.lines.map((l) => l.type);
      // Should have: unchanged (a), removed (b), added (x), added (y), unchanged (c)
      expect(types[0]).toBe('unchanged');
      expect(types[types.length - 1]).toBe('unchanged');
    });
  });

  describe('performance', () => {
    it('should handle moderately large files efficiently', () => {
      const lines = Array(1000).fill('line').map((l, i) => `${l}${i}`);
      const left = lines.join('\n');
      const right = [...lines.slice(0, 500), 'NEW LINE', ...lines.slice(500)].join('\n');

      const start = performance.now();
      const result = computeDiff(left, right);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(500); // Should complete in < 500ms
      expect(result.stats.additions).toBe(1);
    });
  });
});

describe('DiffLine type', () => {
  it('should have correct structure for unchanged lines', () => {
    const result = computeDiff('test', 'test');
    const line = result.lines[0];

    expect(line).toBeDefined();
    expect(line?.type).toBe('unchanged');
    expect(line?.leftLineNumber).toBeDefined();
    expect(line?.rightLineNumber).toBeDefined();
    expect(line?.leftContent).toBeDefined();
    expect(line?.rightContent).toBeDefined();
  });

  it('should have correct structure for added lines', () => {
    const result = computeDiff('', 'new');
    const line = result.lines.find((l) => l.type === 'added');

    expect(line?.type).toBe('added');
    expect(line?.rightLineNumber).toBeDefined();
    expect(line?.rightContent).toBeDefined();
  });

  it('should have correct structure for removed lines', () => {
    const result = computeDiff('old', '');
    const line = result.lines.find((l) => l.type === 'removed');

    expect(line?.type).toBe('removed');
    expect(line?.leftLineNumber).toBeDefined();
    expect(line?.leftContent).toBeDefined();
  });
});

describe('DiffResult stats', () => {
  it('should count additions correctly', () => {
    // Use trailing newlines for consistent behavior
    const result = computeDiff('a\n', 'a\nb\nc\nd\n');

    expect(result.stats.additions).toBe(3);
  });

  it('should count deletions correctly', () => {
    const result = computeDiff('a\nb\nc\nd\n', 'a\n');

    expect(result.stats.deletions).toBe(3);
  });

  it('should count both additions and deletions', () => {
    const result = computeDiff('a\nb\nc\n', 'x\ny\n');

    expect(result.stats.additions + result.stats.deletions).toBeGreaterThan(0);
  });
});
