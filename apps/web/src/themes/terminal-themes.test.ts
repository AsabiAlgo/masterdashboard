/**
 * Terminal Themes Tests
 *
 * Tests for terminal color scheme definitions.
 */

import { describe, it, expect } from 'vitest';
import {
  TERMINAL_THEMES,
  getTerminalTheme,
  type TerminalThemeColors,
} from './terminal-themes';

describe('Terminal Themes', () => {
  describe('TERMINAL_THEMES', () => {
    it('should have default theme', () => {
      expect(TERMINAL_THEMES.default).toBeDefined();
    });

    it('should have dracula theme', () => {
      expect(TERMINAL_THEMES.dracula).toBeDefined();
    });

    it('should have monokai theme', () => {
      expect(TERMINAL_THEMES.monokai).toBeDefined();
    });

    it('should have solarized-dark theme', () => {
      expect(TERMINAL_THEMES['solarized-dark']).toBeDefined();
    });

    it('should have solarized-light theme', () => {
      expect(TERMINAL_THEMES['solarized-light']).toBeDefined();
    });

    it('should have nord theme', () => {
      expect(TERMINAL_THEMES.nord).toBeDefined();
    });

    it('should have one-dark theme', () => {
      expect(TERMINAL_THEMES['one-dark']).toBeDefined();
    });

    it('should have github-dark theme', () => {
      expect(TERMINAL_THEMES['github-dark']).toBeDefined();
    });
  });

  describe('Theme structure', () => {
    const requiredKeys: (keyof TerminalThemeColors)[] = [
      'background',
      'foreground',
      'cursor',
      'cursorAccent',
      'selectionBackground',
      'black',
      'red',
      'green',
      'yellow',
      'blue',
      'magenta',
      'cyan',
      'white',
      'brightBlack',
      'brightRed',
      'brightGreen',
      'brightYellow',
      'brightBlue',
      'brightMagenta',
      'brightCyan',
      'brightWhite',
    ];

    Object.entries(TERMINAL_THEMES).forEach(([themeName, theme]) => {
      describe(`${themeName} theme`, () => {
        requiredKeys.forEach((key) => {
          it(`should have ${key} color`, () => {
            expect(theme[key]).toBeDefined();
            expect(typeof theme[key]).toBe('string');
            expect(theme[key]).toMatch(/^#[0-9a-fA-F]{6}$/);
          });
        });
      });
    });
  });

  describe('getTerminalTheme', () => {
    it('should return default theme when requested', () => {
      const theme = getTerminalTheme('default');
      expect(theme).toBe(TERMINAL_THEMES.default);
    });

    it('should return dracula theme when requested', () => {
      const theme = getTerminalTheme('dracula');
      expect(theme).toBe(TERMINAL_THEMES.dracula);
    });

    it('should return default theme for unknown theme name', () => {
      const theme = getTerminalTheme('unknown-theme' as never);
      expect(theme).toBe(TERMINAL_THEMES.default);
    });

    it('should return correct theme for each valid theme name', () => {
      const themeNames = Object.keys(TERMINAL_THEMES) as (keyof typeof TERMINAL_THEMES)[];
      themeNames.forEach((name) => {
        const theme = getTerminalTheme(name);
        expect(theme).toBe(TERMINAL_THEMES[name]);
      });
    });
  });

  describe('Color contrast', () => {
    it('default theme should have different background and foreground', () => {
      const theme = TERMINAL_THEMES.default;
      expect(theme.background).not.toBe(theme.foreground);
    });

    Object.entries(TERMINAL_THEMES).forEach(([themeName, theme]) => {
      it(`${themeName} should have distinct primary colors`, () => {
        const colors = [theme.red, theme.green, theme.blue, theme.yellow];
        const uniqueColors = new Set(colors);
        expect(uniqueColors.size).toBe(4);
      });
    });
  });
});
