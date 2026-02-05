/**
 * Claude Code Patterns
 *
 * Status detection patterns specific to Claude Code sessions.
 * These patterns have high priority as Claude Code has distinct output patterns.
 */

import {
  ShellType,
  TerminalActivityStatus,
  type StatusPattern,
} from '@masterdashboard/shared';

/**
 * Claude Code specific patterns
 *
 * Claude Code has specific output patterns when:
 * - Awaiting user input (shows prompt with ?)
 * - Thinking/processing (shows spinner or "Thinking...")
 * - Error occurred (shows error message)
 * - Completed successfully (shows success message)
 * - Using tools (shows tool usage)
 * - Rate limited (API errors)
 */
export const CLAUDE_CODE_PATTERNS: StatusPattern[] = [
  // Waiting for user input - question prompt
  {
    id: 'claude-question',
    name: 'Claude Code Question',
    shell: ShellType.CLAUDE_CODE,
    pattern: '\\?\\s*$',
    status: TerminalActivityStatus.WAITING,
    priority: 100,
    enabled: true,
  },
  // Waiting for user input - > prompt
  {
    id: 'claude-prompt',
    name: 'Claude Code Prompt',
    shell: ShellType.CLAUDE_CODE,
    pattern: '^>\\s*$',
    status: TerminalActivityStatus.WAITING,
    priority: 95,
    enabled: true,
  },
  // Waiting for user input - awaiting response
  {
    id: 'claude-awaiting',
    name: 'Claude Code Awaiting Response',
    shell: ShellType.CLAUDE_CODE,
    pattern: 'Awaiting (user )?response',
    status: TerminalActivityStatus.WAITING,
    priority: 98,
    enabled: true,
  },
  // Thinking/processing indicator - spinner characters
  {
    id: 'claude-spinner',
    name: 'Claude Code Spinner',
    shell: ShellType.CLAUDE_CODE,
    pattern: '[\\u2800-\\u28FF]|[\u2801\u2802\u2804\u2840\u2880\u2820\u2810\u2808]',
    status: TerminalActivityStatus.WORKING,
    priority: 92,
    enabled: true,
  },
  // Thinking/processing indicator - text
  {
    id: 'claude-thinking',
    name: 'Claude Code Thinking',
    shell: ShellType.CLAUDE_CODE,
    pattern: '(Thinking|Processing|Analyzing|Loading|Reading|Writing)\\.\\.\\.',
    status: TerminalActivityStatus.WORKING,
    priority: 90,
    enabled: true,
  },
  // Tool usage indicator
  {
    id: 'claude-tool-use',
    name: 'Claude Code Tool Use',
    shell: ShellType.CLAUDE_CODE,
    pattern: '(Using tool:|Running |Executing |Calling )',
    status: TerminalActivityStatus.WORKING,
    priority: 88,
    enabled: true,
  },
  // Error messages
  {
    id: 'claude-error',
    name: 'Claude Code Error',
    shell: ShellType.CLAUDE_CODE,
    pattern: '(Error|error|ERROR|Failed|failed|FAILED):',
    status: TerminalActivityStatus.ERROR,
    priority: 85,
    enabled: true,
  },
  // Rate limit / API error
  {
    id: 'claude-rate-limit',
    name: 'Claude Code Rate Limited',
    shell: ShellType.CLAUDE_CODE,
    pattern: '(rate.?limit|too.?many.?requests|429|API.?error|quota)',
    status: TerminalActivityStatus.ERROR,
    priority: 84,
    enabled: true,
  },
  // Connection error
  {
    id: 'claude-connection-error',
    name: 'Claude Code Connection Error',
    shell: ShellType.CLAUDE_CODE,
    pattern: '(connection.?failed|network.?error|timeout|ECONNREFUSED)',
    status: TerminalActivityStatus.ERROR,
    priority: 83,
    enabled: true,
  },
  // Success completion
  {
    id: 'claude-success',
    name: 'Claude Code Success',
    shell: ShellType.CLAUDE_CODE,
    pattern: '(\\u2713|\\u2714|Done|Completed|Success|Finished)',
    status: TerminalActivityStatus.IDLE,
    priority: 50,
    enabled: true,
  },
  // Task completion - cost display (indicates task is done)
  {
    id: 'claude-cost',
    name: 'Claude Code Cost Display',
    shell: ShellType.CLAUDE_CODE,
    pattern: 'Cost:.*\\$',
    status: TerminalActivityStatus.IDLE,
    priority: 48,
    enabled: true,
  },
];

export default CLAUDE_CODE_PATTERNS;
