/**
 * Fuzzy Search Utilities
 *
 * Provides fuzzy matching for command palette and quick open functionality.
 */

export interface FuzzyMatchResult {
  matches: boolean;
  score: number;
  indices: number[];
}

/**
 * Performs fuzzy matching of a query against text.
 * Returns whether it matches, a relevance score, and the matched character indices.
 */
export function fuzzyMatch(query: string, text: string): FuzzyMatchResult {
  if (!query) {
    return { matches: true, score: 0, indices: [] };
  }

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Check for exact substring match first (highest score)
  const exactIndex = textLower.indexOf(queryLower);
  if (exactIndex !== -1) {
    const indices = Array.from(
      { length: query.length },
      (_, i) => exactIndex + i
    );
    // Score: boost for match at start, penalize for longer text
    const startBonus = exactIndex === 0 ? 100 : 0;
    const score = 1000 + startBonus - exactIndex * 2 - text.length;
    return { matches: true, score, indices };
  }

  // Fuzzy match: find characters in order
  const indices: number[] = [];
  let queryIndex = 0;
  let score = 0;
  let lastMatchIndex = -1;
  let consecutiveBonus = 0;

  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    const textChar = textLower[i];
    const queryChar = queryLower[queryIndex];
    const originalChar = text[i];
    const prevChar = i > 0 ? textLower[i - 1] : '';

    if (textChar === queryChar) {
      indices.push(i);

      // Consecutive match bonus
      if (lastMatchIndex === i - 1) {
        consecutiveBonus += 5;
      } else {
        consecutiveBonus = 0;
      }

      // Position bonus: earlier matches score higher
      const positionScore = Math.max(0, 50 - i);

      // Word boundary bonus
      const isWordStart =
        i === 0 ||
        prevChar === ' ' ||
        prevChar === '/' ||
        prevChar === '-' ||
        prevChar === '_';
      const wordBonus = isWordStart ? 20 : 0;

      // Capital letter bonus (camelCase matching)
      const isCapital = originalChar !== undefined &&
        originalChar === originalChar.toUpperCase() &&
        originalChar !== originalChar.toLowerCase();
      const capitalBonus = isCapital ? 15 : 0;

      score += positionScore + wordBonus + capitalBonus + consecutiveBonus + 10;

      lastMatchIndex = i;
      queryIndex++;
    }
  }

  // All query characters must be found
  if (queryIndex !== queryLower.length) {
    return { matches: false, score: 0, indices: [] };
  }

  // Penalize for text length (prefer shorter matches)
  score -= text.length * 0.5;

  // Bonus for shorter gap between first and last match
  const firstIndex = indices[0] ?? 0;
  const lastIndex = indices[indices.length - 1] ?? 0;
  const matchSpan = indices.length > 1 ? lastIndex - firstIndex : 0;
  score -= matchSpan * 0.5;

  return { matches: true, score: Math.max(0, score), indices };
}

/**
 * Sorts items by fuzzy match score, filtering out non-matches.
 */
export function sortByScore<T>(
  items: T[],
  query: string,
  getText: (item: T) => string
): T[] {
  if (!query) {
    return items;
  }

  return items
    .map((item) => ({
      item,
      ...fuzzyMatch(query, getText(item)),
    }))
    .filter((r) => r.matches)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.item);
}

/**
 * Highlights matched characters in text with wrapper elements.
 */
export function highlightMatches(
  text: string,
  indices: number[]
): { text: string; highlighted: boolean }[] {
  if (indices.length === 0) {
    return [{ text, highlighted: false }];
  }

  const result: { text: string; highlighted: boolean }[] = [];
  const indexSet = new Set(indices);
  let currentSegment = '';
  let currentHighlighted = false;

  for (let i = 0; i < text.length; i++) {
    const isHighlighted = indexSet.has(i);

    if (isHighlighted !== currentHighlighted && currentSegment) {
      result.push({ text: currentSegment, highlighted: currentHighlighted });
      currentSegment = '';
    }

    currentSegment += text[i];
    currentHighlighted = isHighlighted;
  }

  if (currentSegment) {
    result.push({ text: currentSegment, highlighted: currentHighlighted });
  }

  return result;
}
