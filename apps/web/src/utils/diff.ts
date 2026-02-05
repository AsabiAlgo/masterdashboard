/**
 * Diff Utility
 *
 * Computes line-by-line differences between two text contents
 * for display in split or unified diff views.
 */

import { diffLines, type Change } from 'diff';

/**
 * Type of a diff line
 */
export type DiffLineType = 'unchanged' | 'added' | 'removed';

/**
 * Represents a single line in a diff
 */
export interface DiffLine {
  /** Type of change */
  type: DiffLineType;
  /** Line number in the left (original) file */
  leftLineNumber?: number;
  /** Line number in the right (modified) file */
  rightLineNumber?: number;
  /** Content from the left file */
  leftContent?: string;
  /** Content from the right file */
  rightContent?: string;
}

/**
 * Statistics about the diff
 */
export interface DiffStats {
  /** Number of added lines */
  additions: number;
  /** Number of deleted lines */
  deletions: number;
}

/**
 * Result of a diff computation
 */
export interface DiffResult {
  /** Array of diff lines */
  lines: DiffLine[];
  /** Statistics about changes */
  stats: DiffStats;
}

/**
 * Split a change value into individual lines, handling trailing newlines
 */
function splitIntoLines(value: string): string[] {
  if (!value) return [];

  // Split by newline and filter empty strings at the end
  const lines = value.split('\n');

  // Remove trailing empty string if the content ended with a newline
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines;
}

/**
 * Compute the diff between two text contents
 *
 * @param leftContent - Original content (left side)
 * @param rightContent - Modified content (right side)
 * @returns DiffResult with lines and stats
 */
export function computeDiff(leftContent: string, rightContent: string): DiffResult {
  const changes: Change[] = diffLines(leftContent, rightContent);
  const lines: DiffLine[] = [];
  let leftLineNumber = 1;
  let rightLineNumber = 1;
  let additions = 0;
  let deletions = 0;

  for (const change of changes) {
    const lineContents = splitIntoLines(change.value);

    for (const content of lineContents) {
      if (change.added) {
        lines.push({
          type: 'added',
          rightLineNumber: rightLineNumber++,
          rightContent: content,
        });
        additions++;
      } else if (change.removed) {
        lines.push({
          type: 'removed',
          leftLineNumber: leftLineNumber++,
          leftContent: content,
        });
        deletions++;
      } else {
        lines.push({
          type: 'unchanged',
          leftLineNumber: leftLineNumber++,
          rightLineNumber: rightLineNumber++,
          leftContent: content,
          rightContent: content,
        });
      }
    }
  }

  return {
    lines,
    stats: {
      additions,
      deletions,
    },
  };
}

/**
 * Get the change index positions for navigation
 * Returns indices of lines that are additions or deletions
 */
export function getChangeIndices(lines: DiffLine[]): number[] {
  return lines
    .map((line, index) => (line.type !== 'unchanged' ? index : -1))
    .filter((index) => index !== -1);
}

/**
 * Find the next change index from a given position
 */
export function findNextChange(lines: DiffLine[], currentIndex: number): number {
  const changeIndices = getChangeIndices(lines);

  for (const index of changeIndices) {
    if (index > currentIndex) {
      return index;
    }
  }

  // Wrap to beginning if no change found after current position
  const firstIndex = changeIndices[0];
  return firstIndex !== undefined ? firstIndex : -1;
}

/**
 * Find the previous change index from a given position
 */
export function findPreviousChange(lines: DiffLine[], currentIndex: number): number {
  const changeIndices = getChangeIndices(lines);

  for (let i = changeIndices.length - 1; i >= 0; i--) {
    const idx = changeIndices[i];
    if (idx !== undefined && idx < currentIndex) {
      return idx;
    }
  }

  // Wrap to end if no change found before current position
  const lastIndex = changeIndices[changeIndices.length - 1];
  return lastIndex !== undefined ? lastIndex : -1;
}

/**
 * Collapse unchanged sections, keeping only context lines around changes
 */
export function collapseUnchanged(lines: DiffLine[], contextLines: number = 3): DiffLine[] {
  if (contextLines < 0) return lines;

  const changeIndices = new Set(getChangeIndices(lines));
  const visibleIndices = new Set<number>();

  // Mark context lines around each change
  for (const changeIndex of changeIndices) {
    for (let i = Math.max(0, changeIndex - contextLines); i <= Math.min(lines.length - 1, changeIndex + contextLines); i++) {
      visibleIndices.add(i);
    }
  }

  // If all lines are visible, return original
  if (visibleIndices.size === lines.length) {
    return lines;
  }

  return lines.filter((_, index) => visibleIndices.has(index));
}
