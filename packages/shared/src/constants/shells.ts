/**
 * Shell Constants
 *
 * Default shell configurations and detection patterns.
 */

import { ShellType } from '../types/terminal.js';

/**
 * Default shell by platform
 */
export const DEFAULT_SHELL_BY_PLATFORM: Readonly<Record<string, ShellType>> = {
  darwin: ShellType.ZSH,
  linux: ShellType.BASH,
  win32: ShellType.POWERSHELL,
} as const;

/**
 * Shell binary paths by type
 */
export const SHELL_BINARY_PATHS: Readonly<Record<ShellType, string[]>> = {
  [ShellType.BASH]: ['/bin/bash', '/usr/bin/bash', '/usr/local/bin/bash'],
  [ShellType.ZSH]: ['/bin/zsh', '/usr/bin/zsh', '/usr/local/bin/zsh'],
  [ShellType.FISH]: ['/usr/bin/fish', '/usr/local/bin/fish', '/opt/homebrew/bin/fish'],
  [ShellType.POWERSHELL]: [
    'powershell.exe',
    'pwsh.exe',
    '/usr/bin/pwsh',
    '/usr/local/bin/pwsh',
  ],
  [ShellType.CMD]: ['cmd.exe'],
  [ShellType.SH]: ['/bin/sh', '/usr/bin/sh'],
  [ShellType.CLAUDE_CODE]: ['claude'], // Claude Code CLI
  [ShellType.CLAUDE_CODE_SKIP_PERMISSIONS]: ['claude'], // Claude Code CLI (skip permissions)
} as const;

/**
 * Shell display names
 */
export const SHELL_DISPLAY_NAMES: Readonly<Record<ShellType, string>> = {
  [ShellType.BASH]: 'Bash',
  [ShellType.ZSH]: 'Zsh',
  [ShellType.FISH]: 'Fish',
  [ShellType.POWERSHELL]: 'PowerShell',
  [ShellType.CMD]: 'Command Prompt',
  [ShellType.SH]: 'POSIX Shell',
  [ShellType.CLAUDE_CODE]: 'Claude Code',
  [ShellType.CLAUDE_CODE_SKIP_PERMISSIONS]: 'Claude Code (Skip Permissions)',
} as const;

/**
 * Shell icons (for UI)
 */
export const SHELL_ICONS: Readonly<Record<ShellType, string>> = {
  [ShellType.BASH]: 'terminal',
  [ShellType.ZSH]: 'terminal',
  [ShellType.FISH]: 'fish',
  [ShellType.POWERSHELL]: 'powershell',
  [ShellType.CMD]: 'windows',
  [ShellType.SH]: 'terminal',
  [ShellType.CLAUDE_CODE]: 'brain',
  [ShellType.CLAUDE_CODE_SKIP_PERMISSIONS]: 'brain',
} as const;

/**
 * Startup arguments for each shell
 */
export const SHELL_STARTUP_ARGS: Readonly<Record<ShellType, readonly string[]>> = {
  [ShellType.BASH]: ['--login'],
  [ShellType.ZSH]: ['--login'],
  [ShellType.FISH]: ['--login'],
  [ShellType.POWERSHELL]: ['-NoLogo'],
  [ShellType.CMD]: [],
  [ShellType.SH]: [],
  [ShellType.CLAUDE_CODE]: [],
  [ShellType.CLAUDE_CODE_SKIP_PERMISSIONS]: ['--dangerously-skip-permissions'],
} as const;

/**
 * Environment variables to set for shells
 */
export const SHELL_ENV_DEFAULTS: Readonly<Record<string, string>> = {
  TERM: 'xterm-256color',
  COLORTERM: 'truecolor',
  LANG: 'en_US.UTF-8',
} as const;

/**
 * Check if a shell type supports login mode
 */
export function supportsLoginMode(shell: ShellType): boolean {
  return [ShellType.BASH, ShellType.ZSH, ShellType.FISH].includes(shell);
}

/**
 * Check if shell is Windows-specific
 */
export function isWindowsShell(shell: ShellType): boolean {
  return shell === ShellType.POWERSHELL || shell === ShellType.CMD;
}

/**
 * Get the default shell for the current platform
 */
export function getDefaultShell(): ShellType {
  const platform = typeof process !== 'undefined' ? process.platform : 'linux';
  return DEFAULT_SHELL_BY_PLATFORM[platform] ?? ShellType.BASH;
}
