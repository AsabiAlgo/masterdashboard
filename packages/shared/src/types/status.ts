/**
 * Status Detection Types
 *
 * Types for detecting terminal activity status based on output patterns.
 * Includes predefined patterns for common shells and Claude Code.
 */

import { ShellType, TerminalActivityStatus } from './terminal.js';

/**
 * Pattern for detecting terminal status from output
 */
export interface StatusPattern {
  /** Unique pattern identifier */
  readonly id: string;
  /** Human-readable pattern name */
  name: string;
  /** Shell this pattern applies to, or 'all' for universal */
  shell: ShellType | 'all';
  /** Regex pattern to match against terminal output */
  pattern: string;
  /** Status to assign when pattern matches */
  status: TerminalActivityStatus;
  /** Priority (higher = checked first) */
  priority: number;
  /** Whether this pattern is enabled */
  enabled?: boolean;
}

/**
 * Compiled status pattern for efficient matching
 */
export interface CompiledStatusPattern extends StatusPattern {
  /** Compiled regex for the pattern */
  readonly regex: RegExp;
}

/**
 * Status change event emitted when terminal status changes
 */
export interface StatusChangeEvent {
  /** Session that changed */
  sessionId: string;
  /** Previous status */
  previousStatus: TerminalActivityStatus;
  /** New status */
  newStatus: TerminalActivityStatus;
  /** Pattern that triggered the change (if any) */
  matchedPattern?: string;
  /** When the change occurred */
  timestamp: Date;
}

/**
 * Serializable version of StatusChangeEvent
 */
export interface SerializedStatusChangeEvent {
  sessionId: string;
  previousStatus: TerminalActivityStatus;
  newStatus: TerminalActivityStatus;
  matchedPattern?: string;
  timestamp: string;
}

/**
 * Predefined status patterns for common scenarios
 */
export const DEFAULT_STATUS_PATTERNS: readonly StatusPattern[] = [
  // Claude Code patterns (high priority)
  {
    id: 'claude-code-waiting-question',
    name: 'Claude Code Question',
    shell: ShellType.CLAUDE_CODE,
    pattern: '\\?\\s*$',
    status: TerminalActivityStatus.WAITING,
    priority: 100,
    enabled: true,
  },
  {
    id: 'claude-code-error',
    name: 'Claude Code Error',
    shell: ShellType.CLAUDE_CODE,
    pattern: '(Error|error|ERROR|Failed|failed|FAILED):',
    status: TerminalActivityStatus.ERROR,
    priority: 95,
    enabled: true,
  },
  {
    id: 'claude-code-thinking',
    name: 'Claude Code Thinking',
    shell: ShellType.CLAUDE_CODE,
    pattern: '(Thinking|Processing|Analyzing|Reading|Writing)\\.\\.\\.',
    status: TerminalActivityStatus.WORKING,
    priority: 90,
    enabled: true,
  },

  // SSH patterns (medium-high priority)
  {
    id: 'ssh-password-prompt',
    name: 'SSH Password Prompt',
    shell: 'all',
    pattern: '[Pp]assword:?\\s*$',
    status: TerminalActivityStatus.WAITING,
    priority: 80,
    enabled: true,
  },
  {
    id: 'ssh-passphrase-prompt',
    name: 'SSH Passphrase Prompt',
    shell: 'all',
    pattern: 'Enter passphrase',
    status: TerminalActivityStatus.WAITING,
    priority: 79,
    enabled: true,
  },
  {
    id: 'ssh-yes-no-prompt',
    name: 'SSH Host Key Confirmation',
    shell: 'all',
    pattern: 'yes/no.*\\?\\s*$',
    status: TerminalActivityStatus.WAITING,
    priority: 78,
    enabled: true,
  },

  // Git patterns (medium priority)
  {
    id: 'git-commit-vim',
    name: 'Git Commit Message Editor',
    shell: 'all',
    pattern: '# Please enter the commit message',
    status: TerminalActivityStatus.WAITING,
    priority: 70,
    enabled: true,
  },
  {
    id: 'git-rebase-interactive',
    name: 'Git Interactive Rebase',
    shell: 'all',
    pattern: '# Rebase .* onto',
    status: TerminalActivityStatus.WAITING,
    priority: 69,
    enabled: true,
  },
  {
    id: 'git-merge-conflict',
    name: 'Git Merge Conflict',
    shell: 'all',
    pattern: 'CONFLICT.*Merge conflict',
    status: TerminalActivityStatus.ERROR,
    priority: 68,
    enabled: true,
  },

  // Sudo prompt (medium priority)
  {
    id: 'sudo-password',
    name: 'Sudo Password Prompt',
    shell: 'all',
    pattern: '\\[sudo\\].*password',
    status: TerminalActivityStatus.WAITING,
    priority: 75,
    enabled: true,
  },

  // Interactive prompts (medium priority)
  {
    id: 'continue-prompt',
    name: 'Continue Prompt',
    shell: 'all',
    pattern: '(Continue|Proceed)\\?.*\\[y/n\\]',
    status: TerminalActivityStatus.WAITING,
    priority: 60,
    enabled: true,
  },
  {
    id: 'confirmation-prompt',
    name: 'Confirmation Prompt',
    shell: 'all',
    pattern: 'Are you sure\\?',
    status: TerminalActivityStatus.WAITING,
    priority: 59,
    enabled: true,
  },

  // Error patterns (medium priority)
  {
    id: 'command-not-found',
    name: 'Command Not Found',
    shell: 'all',
    pattern: 'command not found',
    status: TerminalActivityStatus.ERROR,
    priority: 50,
    enabled: true,
  },
  {
    id: 'permission-denied',
    name: 'Permission Denied',
    shell: 'all',
    pattern: '[Pp]ermission denied',
    status: TerminalActivityStatus.ERROR,
    priority: 49,
    enabled: true,
  },
  {
    id: 'npm-error',
    name: 'NPM Error',
    shell: 'all',
    pattern: 'npm ERR!',
    status: TerminalActivityStatus.ERROR,
    priority: 48,
    enabled: true,
  },

  // Standard shell prompts (low priority - fallback)
  {
    id: 'bash-prompt',
    name: 'Bash/Zsh Prompt Ready',
    shell: 'all',
    pattern: '[$#>%]\\s*$',
    status: TerminalActivityStatus.WAITING,
    priority: 10,
    enabled: true,
  },
  {
    id: 'fish-prompt',
    name: 'Fish Prompt Ready',
    shell: ShellType.FISH,
    pattern: '>\\s*$',
    status: TerminalActivityStatus.WAITING,
    priority: 11,
    enabled: true,
  },
  {
    id: 'powershell-prompt',
    name: 'PowerShell Prompt Ready',
    shell: ShellType.POWERSHELL,
    pattern: 'PS.*>\\s*$',
    status: TerminalActivityStatus.WAITING,
    priority: 12,
    enabled: true,
  },
] as const;

/**
 * Configuration for the status detector
 */
export interface StatusDetectorConfig {
  /** Custom patterns to add */
  customPatterns?: StatusPattern[];
  /** Patterns to disable by ID */
  disabledPatterns?: string[];
  /** Debounce time in ms before status change */
  debounceMs?: number;
  /** Number of lines to check for patterns */
  lookbackLines?: number;
}

/**
 * Default status detector configuration
 */
export const DEFAULT_STATUS_DETECTOR_CONFIG: Readonly<StatusDetectorConfig> = {
  debounceMs: 100,
  lookbackLines: 5,
} as const;
