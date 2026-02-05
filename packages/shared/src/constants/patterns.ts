/**
 * Pattern Constants
 *
 * Regular expression patterns for status detection and prompt parsing.
 */

import { TerminalActivityStatus } from '../types/terminal.js';
import type { StatusPattern } from '../types/status.js';

/**
 * ANSI escape sequence pattern for stripping terminal codes
 */
export const ANSI_ESCAPE_PATTERN = /\x1b\[[0-9;]*[a-zA-Z]/g;

/**
 * Pattern to strip all control sequences
 */
export const CONTROL_SEQUENCE_PATTERN = /[\x00-\x1f\x7f]/g;

/**
 * Pattern to detect cursor position sequences
 */
export const CURSOR_POSITION_PATTERN = /\x1b\[\d+;\d+H/g;

/**
 * Pattern to detect title change sequences
 */
export const TITLE_CHANGE_PATTERN = /\x1b\]0;([^\x07]*)\x07/;

/**
 * Pattern to detect working directory updates (OSC 7)
 */
export const CWD_UPDATE_PATTERN = /\x1b\]7;file:\/\/[^\/]*([^\x07]*)\x07/;

/**
 * Common prompt ending characters
 */
export const PROMPT_ENDINGS = ['$', '#', '>', '%', '❯', '➜', '→'] as const;

/**
 * Pattern to detect common shell prompts
 */
export const SHELL_PROMPT_PATTERN = /[$#>%❯➜→]\s*$/;

/**
 * Pattern to detect command execution (line starts with common prefixes)
 */
export const COMMAND_PREFIX_PATTERNS: readonly RegExp[] = [
  /^\s*\$\s+\S/,      // $ command
  /^\s*>\s+\S/,       // > command
  /^\s*#\s+\S/,       // # command (root)
  /^\s*%\s+\S/,       // % command (csh)
] as const;

/**
 * Patterns for detecting running processes
 */
export const RUNNING_PROCESS_PATTERNS: Readonly<Record<string, RegExp>> = {
  npm: /npm\s+(run|start|test|build|install)/,
  yarn: /yarn\s+(run|start|test|build|install)?/,
  pnpm: /pnpm\s+(run|start|test|build|install)/,
  node: /node\s+\S+/,
  python: /python3?\s+\S+/,
  go: /go\s+(run|build|test)/,
  cargo: /cargo\s+(run|build|test)/,
  make: /make(\s+\S+)?/,
  docker: /docker\s+(run|build|compose)/,
  git: /git\s+(clone|pull|push|fetch)/,
} as const;

/**
 * Patterns for detecting errors
 */
export const ERROR_PATTERNS: readonly RegExp[] = [
  /\bError\b/i,
  /\bERROR\b/,
  /\bFailed\b/i,
  /\bFAILED\b/,
  /\bException\b/i,
  /\bPanic\b/i,
  /\bfatal\b/i,
  /\bFATAL\b/,
  /command not found/i,
  /permission denied/i,
  /no such file or directory/i,
  /cannot find/i,
  /npm ERR!/,
  /error\[E\d+\]/,  // Rust errors
  /SyntaxError:/,
  /TypeError:/,
  /ReferenceError:/,
] as const;

/**
 * Patterns for detecting warnings
 */
export const WARNING_PATTERNS: readonly RegExp[] = [
  /\bWarning\b/i,
  /\bWARNING\b/,
  /\bWarn\b/i,
  /\bWARN\b/,
  /\bDeprecated\b/i,
  /\bDEPRECATED\b/,
] as const;

/**
 * Patterns for detecting waiting states (user input needed)
 */
export const WAITING_PATTERNS: readonly RegExp[] = [
  /\?\s*$/,                          // Ends with ?
  /\[y\/n\]/i,                       // Yes/no prompt
  /\[Y\/n\]/,                        // Yes/no prompt (default yes)
  /\[y\/N\]/,                        // Yes/no prompt (default no)
  /continue\?/i,                     // Continue prompt
  /proceed\?/i,                      // Proceed prompt
  /password:?\s*$/i,                 // Password prompt
  /passphrase:?\s*$/i,               // Passphrase prompt
  /enter\s+.*:?\s*$/i,               // Enter something prompt
  /press\s+.*to\s+continue/i,        // Press key to continue
  /hit\s+enter/i,                    // Hit enter prompt
  /\(y\/n\)/i,                       // Alternative yes/no format
] as const;

/**
 * Patterns for Claude Code specific states
 */
export const CLAUDE_CODE_PATTERNS: Readonly<Record<string, RegExp>> = {
  thinking: /(?:Thinking|Processing|Analyzing|Reading|Writing)\.\.\./,
  question: /\?\s*$/,
  error: /(?:Error|ERROR|Failed|FAILED):/,
  success: /(?:Done|Complete|Success|Finished)\.?$/i,
  toolUse: /Using tool:/,
  waiting: /Waiting for/,
} as const;

/**
 * Create a compiled status pattern
 */
export function compileStatusPattern(pattern: StatusPattern): StatusPattern & { regex: RegExp } {
  return {
    ...pattern,
    regex: new RegExp(pattern.pattern, 'm'),
  };
}

/**
 * Strip ANSI codes from text
 */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_ESCAPE_PATTERN, '');
}

/**
 * Strip all control sequences from text
 */
export function stripControlSequences(text: string): string {
  return text.replace(CONTROL_SEQUENCE_PATTERN, '');
}

/**
 * Extract title from terminal output
 */
export function extractTitle(text: string): string | null {
  const match = TITLE_CHANGE_PATTERN.exec(text);
  return match?.[1] ?? null;
}

/**
 * Extract working directory from terminal output
 */
export function extractCwd(text: string): string | null {
  const match = CWD_UPDATE_PATTERN.exec(text);
  return match?.[1] ?? null;
}

/**
 * Check if text likely indicates an error
 */
export function hasErrorIndicator(text: string): boolean {
  const stripped = stripAnsi(text);
  return ERROR_PATTERNS.some((pattern) => pattern.test(stripped));
}

/**
 * Check if text likely indicates waiting for input
 */
export function hasWaitingIndicator(text: string): boolean {
  const stripped = stripAnsi(text);
  return WAITING_PATTERNS.some((pattern) => pattern.test(stripped));
}

/**
 * Detect activity status from terminal output
 */
export function detectActivityStatus(
  text: string,
  currentStatus: TerminalActivityStatus
): TerminalActivityStatus {
  const stripped = stripAnsi(text);
  const lastLine = stripped.split('\n').pop()?.trim() ?? '';

  // Check for errors first (highest priority)
  if (hasErrorIndicator(lastLine)) {
    return TerminalActivityStatus.ERROR;
  }

  // Check for waiting prompts
  if (hasWaitingIndicator(lastLine)) {
    return TerminalActivityStatus.WAITING;
  }

  // Check for shell prompt (indicates waiting)
  if (SHELL_PROMPT_PATTERN.test(lastLine)) {
    return TerminalActivityStatus.WAITING;
  }

  // If we have output that's not a prompt, likely still working
  if (lastLine.length > 0) {
    return TerminalActivityStatus.WORKING;
  }

  // Default to current status
  return currentStatus;
}
