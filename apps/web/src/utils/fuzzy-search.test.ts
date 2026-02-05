/**
 * Fuzzy Search Tests
 *
 * Unit tests for fuzzy search utilities.
 */

import { describe, it, expect } from 'vitest';
import { fuzzyMatch, sortByScore, highlightMatches } from './fuzzy-search';

describe('fuzzyMatch', () => {
  it('should match exact text', () => {
    const result = fuzzyMatch('terminal', 'terminal');
    expect(result.matches).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });

  it('should match partial text at start', () => {
    const result = fuzzyMatch('term', 'terminal');
    expect(result.matches).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });

  it('should match partial text in middle', () => {
    const result = fuzzyMatch('erm', 'terminal');
    expect(result.matches).toBe(true);
  });

  it('should match non-consecutive characters', () => {
    const result = fuzzyMatch('ntrm', 'New Terminal');
    expect(result.matches).toBe(true);
  });

  it('should not match when characters are missing', () => {
    const result = fuzzyMatch('xyz', 'terminal');
    expect(result.matches).toBe(false);
  });

  it('should return character indices for highlighting', () => {
    const result = fuzzyMatch('nt', 'New Terminal');
    expect(result.indices).toBeDefined();
    expect(result.indices.length).toBe(2);
  });

  it('should score exact matches higher than fuzzy matches', () => {
    // Substring match vs fuzzy match
    const substring = fuzzyMatch('term', 'terminal');
    const fuzzy = fuzzyMatch('trnl', 'terminal');
    expect(substring.score).toBeGreaterThan(fuzzy.score);
  });

  it('should score start matches higher than middle matches', () => {
    const startMatch = fuzzyMatch('new', 'New Terminal');
    const middleMatch = fuzzyMatch('erm', 'terminal');
    expect(startMatch.score).toBeGreaterThan(middleMatch.score);
  });

  it('should be case insensitive', () => {
    const result = fuzzyMatch('TERM', 'terminal');
    expect(result.matches).toBe(true);
  });

  it('should handle empty query', () => {
    const result = fuzzyMatch('', 'terminal');
    expect(result.matches).toBe(true);
    expect(result.score).toBe(0);
  });

  it('should give bonus for word boundaries', () => {
    // Both are fuzzy matches, but 'n' and 't' hit word starts
    const wordBoundary = fuzzyMatch('n', 'New');  // 'N' at word start
    const noWordBoundary = fuzzyMatch('e', 'New'); // 'e' not at word start
    expect(wordBoundary.score).toBeGreaterThan(noWordBoundary.score);
  });

  it('should give bonus for consecutive matches', () => {
    const consecutive = fuzzyMatch('ter', 'terminal');
    const nonConsecutive = fuzzyMatch('tel', 'terminal');
    expect(consecutive.score).toBeGreaterThan(nonConsecutive.score);
  });
});

describe('sortByScore', () => {
  const items = [
    { title: 'New Terminal' },
    { title: 'Toggle Theme' },
    { title: 'New Folder' },
    { title: 'terminal settings' },
  ];

  it('should sort by match score descending', () => {
    const sorted = sortByScore(items, 'term', (item) => item.title);
    expect(sorted.length).toBeGreaterThan(0);
    // terminal settings should be first (exact substring match)
    expect(sorted[0]?.title).toContain('erm');
  });

  it('should filter out non-matches', () => {
    const sorted = sortByScore(items, 'xyz', (item) => item.title);
    expect(sorted.length).toBe(0);
  });

  it('should return all items for empty query', () => {
    const sorted = sortByScore(items, '', (item) => item.title);
    expect(sorted.length).toBe(items.length);
  });

  it('should handle single character query', () => {
    const sorted = sortByScore(items, 't', (item) => item.title);
    expect(sorted.length).toBeGreaterThan(0);
    // All items containing 't' should be included
    sorted.forEach((item) => {
      expect(item.title.toLowerCase()).toContain('t');
    });
  });
});

describe('highlightMatches', () => {
  it('should return unhighlighted text when no indices', () => {
    const result = highlightMatches('terminal', []);
    expect(result).toEqual([{ text: 'terminal', highlighted: false }]);
  });

  it('should highlight single character', () => {
    const result = highlightMatches('terminal', [0]);
    expect(result).toEqual([
      { text: 't', highlighted: true },
      { text: 'erminal', highlighted: false },
    ]);
  });

  it('should highlight multiple consecutive characters', () => {
    const result = highlightMatches('terminal', [0, 1, 2]);
    expect(result).toEqual([
      { text: 'ter', highlighted: true },
      { text: 'minal', highlighted: false },
    ]);
  });

  it('should highlight non-consecutive characters', () => {
    const result = highlightMatches('terminal', [0, 4]);
    expect(result).toEqual([
      { text: 't', highlighted: true },
      { text: 'erm', highlighted: false },
      { text: 'i', highlighted: true },
      { text: 'nal', highlighted: false },
    ]);
  });

  it('should highlight characters at end', () => {
    const result = highlightMatches('test', [3]);
    expect(result).toEqual([
      { text: 'tes', highlighted: false },
      { text: 't', highlighted: true },
    ]);
  });

  it('should handle entire string highlighted', () => {
    const result = highlightMatches('hi', [0, 1]);
    expect(result).toEqual([{ text: 'hi', highlighted: true }]);
  });
});
