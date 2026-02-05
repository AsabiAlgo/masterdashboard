/**
 * Terminal State Hook
 *
 * Manages terminal configuration and local state.
 */

import { useState, useCallback } from 'react';
import type { TerminalThemeName } from '../utils/themes';
import { ShellType } from '@masterdashboard/shared';

interface TerminalSettings {
  theme: TerminalThemeName;
  fontSize: number;
  fontFamily: string;
  cursorBlink: boolean;
  cursorStyle: 'block' | 'underline' | 'bar';
  scrollback: number;
  bellStyle: 'none' | 'visual' | 'sound' | 'both';
}

interface UseTerminalOptions {
  initialTheme?: TerminalThemeName;
  initialFontSize?: number;
  initialFontFamily?: string;
}

interface UseTerminalReturn {
  settings: TerminalSettings;
  updateSettings: (updates: Partial<TerminalSettings>) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: TerminalSettings = {
  theme: 'dracula',
  fontSize: 14,
  fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
  cursorBlink: true,
  cursorStyle: 'block',
  scrollback: 10000,
  bellStyle: 'visual',
};

export function useTerminal(options: UseTerminalOptions = {}): UseTerminalReturn {
  const [settings, setSettings] = useState<TerminalSettings>({
    ...DEFAULT_SETTINGS,
    theme: options.initialTheme ?? DEFAULT_SETTINGS.theme,
    fontSize: options.initialFontSize ?? DEFAULT_SETTINGS.fontSize,
    fontFamily: options.initialFontFamily ?? DEFAULT_SETTINGS.fontFamily,
  });

  const updateSettings = useCallback((updates: Partial<TerminalSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}

/**
 * Get display name for shell type
 */
export function getShellDisplayName(shell: ShellType): string {
  const displayNames: Record<ShellType, string> = {
    [ShellType.BASH]: 'Bash',
    [ShellType.ZSH]: 'Zsh',
    [ShellType.FISH]: 'Fish',
    [ShellType.POWERSHELL]: 'PowerShell',
    [ShellType.CMD]: 'Command Prompt',
    [ShellType.SH]: 'Shell',
    [ShellType.CLAUDE_CODE]: 'Claude Code',
    [ShellType.CLAUDE_CODE_SKIP_PERMISSIONS]: 'Claude Code (Auto)',
  };
  return displayNames[shell];
}

/**
 * Get shell icon color
 */
export function getShellColor(shell: ShellType): string {
  const colors: Record<ShellType, string> = {
    [ShellType.BASH]: '#4EAA25',
    [ShellType.ZSH]: '#F15A24',
    [ShellType.FISH]: '#00BFFF',
    [ShellType.POWERSHELL]: '#5391FE',
    [ShellType.CMD]: '#000000',
    [ShellType.SH]: '#89E051',
    [ShellType.CLAUDE_CODE]: '#DA7756',
    [ShellType.CLAUDE_CODE_SKIP_PERMISSIONS]: '#F97316', // Orange
  };
  return colors[shell];
}

/**
 * Available shells for selection
 */
export const AVAILABLE_SHELLS: ShellType[] = [
  ShellType.BASH,
  ShellType.ZSH,
  ShellType.FISH,
  ShellType.SH,
  ShellType.POWERSHELL,
  ShellType.CMD,
  ShellType.CLAUDE_CODE,
];
