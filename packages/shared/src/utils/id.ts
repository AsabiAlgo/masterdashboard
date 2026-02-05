/**
 * ID Generation Utilities
 *
 * Functions for generating unique identifiers using nanoid.
 * All IDs are URL-safe and suitable for use in paths and URLs.
 */

import { nanoid, customAlphabet } from 'nanoid';

/**
 * Default ID length
 */
export const DEFAULT_ID_LENGTH = 21;

/**
 * Short ID length for user-facing identifiers
 */
export const SHORT_ID_LENGTH = 12;

/**
 * Custom alphabet for more readable IDs (no similar looking chars)
 */
const READABLE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';

/**
 * Numeric-only alphabet for pin codes
 */
const NUMERIC_ALPHABET = '0123456789';

/**
 * Lowercase alphanumeric for slug-style IDs
 */
const SLUG_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

// Create custom generators
const readableId = customAlphabet(READABLE_ALPHABET, SHORT_ID_LENGTH);

/**
 * ID prefix types for better identification
 */
export const ID_PREFIXES = {
  session: 'ses_',
  terminal: 'term_',
  browser: 'brw_',
  ssh: 'ssh_',
  project: 'prj_',
  layout: 'lay_',
  node: 'node_',
  pattern: 'pat_',
  buffer: 'buf_',
} as const;

export type IdPrefix = (typeof ID_PREFIXES)[keyof typeof ID_PREFIXES];

/**
 * Generate a unique session ID
 */
export function createSessionId(): string {
  return `${ID_PREFIXES.session}${nanoid(DEFAULT_ID_LENGTH)}`;
}

/**
 * Generate a unique terminal session ID
 */
export function createTerminalId(): string {
  return `${ID_PREFIXES.terminal}${nanoid(DEFAULT_ID_LENGTH)}`;
}

/**
 * Generate a unique browser session ID
 */
export function createBrowserId(): string {
  return `${ID_PREFIXES.browser}${nanoid(DEFAULT_ID_LENGTH)}`;
}

/**
 * Generate a unique SSH session ID
 */
export function createSSHId(): string {
  return `${ID_PREFIXES.ssh}${nanoid(DEFAULT_ID_LENGTH)}`;
}

/**
 * Generate a unique project ID
 */
export function createProjectId(): string {
  return `${ID_PREFIXES.project}${nanoid(DEFAULT_ID_LENGTH)}`;
}

/**
 * Generate a unique layout ID
 */
export function createLayoutId(): string {
  return `${ID_PREFIXES.layout}${nanoid(DEFAULT_ID_LENGTH)}`;
}

/**
 * Generate a unique node ID for React Flow
 */
export function createNodeId(): string {
  return `${ID_PREFIXES.node}${readableId()}`;
}

/**
 * Generate a unique pattern ID
 */
export function createPatternId(): string {
  return `${ID_PREFIXES.pattern}${readableId()}`;
}

/**
 * Generate a unique buffer ID
 */
export function createBufferId(): string {
  return `${ID_PREFIXES.buffer}${nanoid(DEFAULT_ID_LENGTH)}`;
}

/**
 * Generate a generic unique ID (no prefix)
 */
export function createId(length: number = DEFAULT_ID_LENGTH): string {
  return nanoid(length);
}

/**
 * Generate a short, readable ID
 */
export function createShortId(): string {
  return readableId();
}

/**
 * Generate a numeric PIN code
 */
export function createPinCode(length: number = 6): string {
  return customAlphabet(NUMERIC_ALPHABET, length)();
}

/**
 * Generate a slug-style ID (lowercase alphanumeric)
 */
export function createSlugId(length: number = 8): string {
  return customAlphabet(SLUG_ALPHABET, length)();
}

/**
 * Generate a correlation ID for request/response matching
 */
export function createCorrelationId(): string {
  return `cor_${nanoid(16)}`;
}

/**
 * Extract the prefix from an ID
 */
export function getIdPrefix(id: string): string | null {
  const match = /^([a-z]+_)/.exec(id);
  return match?.[1] ?? null;
}

/**
 * Check if an ID has a specific prefix
 */
export function hasIdPrefix(id: string, prefix: IdPrefix): boolean {
  return id.startsWith(prefix);
}

/**
 * Validate that a string looks like a valid ID
 */
export function isValidId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  // Check for valid characters and reasonable length
  return /^[a-zA-Z0-9_-]{6,50}$/.test(id);
}

/**
 * Validate a prefixed ID
 */
export function isValidPrefixedId(id: string, prefix: IdPrefix): boolean {
  if (!id.startsWith(prefix)) {
    return false;
  }
  const idPart = id.slice(prefix.length);
  return /^[a-zA-Z0-9_-]{6,30}$/.test(idPart);
}
