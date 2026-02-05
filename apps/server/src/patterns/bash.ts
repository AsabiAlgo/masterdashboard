/**
 * Bash/Shell Patterns
 *
 * Status detection patterns for bash, zsh, fish, and other shell prompts.
 * These patterns detect when shells are waiting for input or running commands.
 */

import {
  ShellType,
  TerminalActivityStatus,
  type StatusPattern,
} from '@masterdashboard/shared';

/**
 * Shell prompt patterns
 *
 * Detects various shell prompt styles:
 * - Bash: $ or # (root)
 * - Zsh: % or custom prompts with ❯, ➜
 * - Fish: >
 * - PowerShell: PS>
 */
export const BASH_PATTERNS: StatusPattern[] = [
  // Standard bash user prompt
  {
    id: 'bash-prompt-dollar',
    name: 'Bash User Prompt',
    shell: ShellType.BASH,
    pattern: '\\$\\s*$',
    status: TerminalActivityStatus.WAITING,
    priority: 20,
    enabled: true,
  },
  // Bash root prompt
  {
    id: 'bash-prompt-hash',
    name: 'Bash Root Prompt',
    shell: ShellType.BASH,
    pattern: '#\\s*$',
    status: TerminalActivityStatus.WAITING,
    priority: 20,
    enabled: true,
  },
  // Zsh prompt
  {
    id: 'zsh-prompt',
    name: 'Zsh Prompt',
    shell: ShellType.ZSH,
    pattern: '(%|❯|➜)\\s*$',
    status: TerminalActivityStatus.WAITING,
    priority: 20,
    enabled: true,
  },
  // Fish prompt
  {
    id: 'fish-prompt',
    name: 'Fish Prompt',
    shell: ShellType.FISH,
    pattern: '>\\s*$',
    status: TerminalActivityStatus.WAITING,
    priority: 20,
    enabled: true,
  },
  // PowerShell prompt
  {
    id: 'powershell-prompt',
    name: 'PowerShell Prompt',
    shell: ShellType.POWERSHELL,
    pattern: 'PS.*>\\s*$',
    status: TerminalActivityStatus.WAITING,
    priority: 20,
    enabled: true,
  },
  // CMD prompt
  {
    id: 'cmd-prompt',
    name: 'CMD Prompt',
    shell: ShellType.CMD,
    pattern: '[A-Z]:\\\\.*>\\s*$',
    status: TerminalActivityStatus.WAITING,
    priority: 20,
    enabled: true,
  },
  // Generic shell prompt (fallback)
  {
    id: 'generic-prompt',
    name: 'Generic Shell Prompt',
    shell: 'all',
    pattern: '[$#>%❯➜→]\\s*$',
    status: TerminalActivityStatus.WAITING,
    priority: 10,
    enabled: true,
  },
  // Command running indicator
  {
    id: 'command-running',
    name: 'Command Running',
    shell: 'all',
    pattern: '\\[running\\]|\\[\\d+\\]\\+',
    status: TerminalActivityStatus.WORKING,
    priority: 15,
    enabled: true,
  },
  // Background job notification
  {
    id: 'background-job',
    name: 'Background Job',
    shell: 'all',
    pattern: '\\[\\d+\\]\\s+\\d+',
    status: TerminalActivityStatus.WORKING,
    priority: 14,
    enabled: true,
  },
  // Permission denied error
  {
    id: 'permission-denied',
    name: 'Permission Denied',
    shell: 'all',
    pattern: '(Permission|Access) denied|EACCES',
    status: TerminalActivityStatus.ERROR,
    priority: 70,
    enabled: true,
  },
  // Command not found
  {
    id: 'command-not-found',
    name: 'Command Not Found',
    shell: 'all',
    pattern: 'command not found|not recognized|not found in PATH',
    status: TerminalActivityStatus.ERROR,
    priority: 65,
    enabled: true,
  },
  // No such file or directory
  {
    id: 'file-not-found',
    name: 'File Not Found',
    shell: 'all',
    pattern: 'No such file or directory|cannot find|does not exist',
    status: TerminalActivityStatus.ERROR,
    priority: 64,
    enabled: true,
  },
  // Syntax error
  {
    id: 'syntax-error',
    name: 'Syntax Error',
    shell: 'all',
    pattern: 'syntax error|unexpected token',
    status: TerminalActivityStatus.ERROR,
    priority: 63,
    enabled: true,
  },
];

export default BASH_PATTERNS;
