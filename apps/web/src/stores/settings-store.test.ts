/**
 * Settings Store Tests
 *
 * TDD tests for the settings store including theme, terminal theme,
 * fonts, keyboard shortcuts, and persistence.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia
const createMatchMedia = (matches: boolean) => {
  return vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

describe('SettingsStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
    document.documentElement.classList.remove('dark');
    window.matchMedia = createMatchMedia(false);
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should have dark theme as default', async () => {
      const { useSettingsStore } = await import('./settings-store');
      const state = useSettingsStore.getState();
      expect(state.theme).toBe('dark');
    });

    it('should have default terminal theme', async () => {
      const { useSettingsStore } = await import('./settings-store');
      const state = useSettingsStore.getState();
      expect(state.terminalTheme).toBe('default');
    });

    it('should have default font size of 14', async () => {
      const { useSettingsStore } = await import('./settings-store');
      const state = useSettingsStore.getState();
      expect(state.fontSize).toBe(14);
    });

    it('should have JetBrains Mono as default font family', async () => {
      const { useSettingsStore } = await import('./settings-store');
      const state = useSettingsStore.getState();
      expect(state.fontFamily).toBe('JetBrains Mono, monospace');
    });

    it('should have default keyboard shortcuts', async () => {
      const { useSettingsStore } = await import('./settings-store');
      const state = useSettingsStore.getState();
      expect(state.shortcuts.length).toBeGreaterThan(0);
      expect(state.shortcuts.some((s) => s.id === 'new-terminal')).toBe(true);
    });

    it('should have animations enabled by default', async () => {
      const { useSettingsStore } = await import('./settings-store');
      const state = useSettingsStore.getState();
      expect(state.animationsEnabled).toBe(true);
    });
  });

  describe('setTheme', () => {
    it('should update theme state to light', async () => {
      const { useSettingsStore } = await import('./settings-store');
      act(() => {
        useSettingsStore.getState().setTheme('light');
      });
      expect(useSettingsStore.getState().theme).toBe('light');
    });

    it('should update theme state to dark', async () => {
      const { useSettingsStore } = await import('./settings-store');
      act(() => {
        useSettingsStore.getState().setTheme('light');
        useSettingsStore.getState().setTheme('dark');
      });
      expect(useSettingsStore.getState().theme).toBe('dark');
    });

    it('should update theme state to system', async () => {
      const { useSettingsStore } = await import('./settings-store');
      act(() => {
        useSettingsStore.getState().setTheme('system');
      });
      expect(useSettingsStore.getState().theme).toBe('system');
    });

    it('should apply dark class to document for dark theme', async () => {
      const { useSettingsStore, applyTheme } = await import('./settings-store');
      act(() => {
        useSettingsStore.getState().setTheme('dark');
      });
      applyTheme('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class for light theme', async () => {
      const { useSettingsStore, applyTheme } = await import('./settings-store');
      document.documentElement.classList.add('dark');
      act(() => {
        useSettingsStore.getState().setTheme('light');
      });
      applyTheme('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should respect system preference for dark mode', async () => {
      window.matchMedia = createMatchMedia(true); // System prefers dark
      const { applyTheme } = await import('./settings-store');
      applyTheme('system');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should respect system preference for light mode', async () => {
      window.matchMedia = createMatchMedia(false); // System prefers light
      document.documentElement.classList.add('dark');
      const { applyTheme } = await import('./settings-store');
      applyTheme('system');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('setTerminalTheme', () => {
    it('should update terminal theme to dracula', async () => {
      const { useSettingsStore } = await import('./settings-store');
      act(() => {
        useSettingsStore.getState().setTerminalTheme('dracula');
      });
      expect(useSettingsStore.getState().terminalTheme).toBe('dracula');
    });

    it('should update terminal theme to monokai', async () => {
      const { useSettingsStore } = await import('./settings-store');
      act(() => {
        useSettingsStore.getState().setTerminalTheme('monokai');
      });
      expect(useSettingsStore.getState().terminalTheme).toBe('monokai');
    });
  });

  describe('setFontSize', () => {
    it('should update font size', async () => {
      const { useSettingsStore } = await import('./settings-store');
      act(() => {
        useSettingsStore.getState().setFontSize(16);
      });
      expect(useSettingsStore.getState().fontSize).toBe(16);
    });

    it('should accept different font sizes', async () => {
      const { useSettingsStore } = await import('./settings-store');
      act(() => {
        useSettingsStore.getState().setFontSize(12);
      });
      expect(useSettingsStore.getState().fontSize).toBe(12);
      act(() => {
        useSettingsStore.getState().setFontSize(20);
      });
      expect(useSettingsStore.getState().fontSize).toBe(20);
    });
  });

  describe('setFontFamily', () => {
    it('should update font family', async () => {
      const { useSettingsStore } = await import('./settings-store');
      act(() => {
        useSettingsStore.getState().setFontFamily('Fira Code, monospace');
      });
      expect(useSettingsStore.getState().fontFamily).toBe('Fira Code, monospace');
    });
  });

  describe('setAnimationsEnabled', () => {
    it('should disable animations', async () => {
      const { useSettingsStore } = await import('./settings-store');
      act(() => {
        useSettingsStore.getState().setAnimationsEnabled(false);
      });
      expect(useSettingsStore.getState().animationsEnabled).toBe(false);
    });

    it('should enable animations', async () => {
      const { useSettingsStore } = await import('./settings-store');
      act(() => {
        useSettingsStore.getState().setAnimationsEnabled(false);
        useSettingsStore.getState().setAnimationsEnabled(true);
      });
      expect(useSettingsStore.getState().animationsEnabled).toBe(true);
    });
  });

  describe('updateShortcut', () => {
    it('should update existing shortcut', async () => {
      const { useSettingsStore } = await import('./settings-store');
      act(() => {
        useSettingsStore.getState().updateShortcut('new-terminal', 'Ctrl+Alt+T');
      });
      const shortcut = useSettingsStore
        .getState()
        .shortcuts.find((s) => s.id === 'new-terminal');
      expect(shortcut?.keys).toBe('Ctrl+Alt+T');
    });

    it('should not modify other shortcuts', async () => {
      const { useSettingsStore } = await import('./settings-store');
      const originalSaveShortcut = useSettingsStore
        .getState()
        .shortcuts.find((s) => s.id === 'save');
      act(() => {
        useSettingsStore.getState().updateShortcut('new-terminal', 'Ctrl+Alt+T');
      });
      const saveShortcut = useSettingsStore
        .getState()
        .shortcuts.find((s) => s.id === 'save');
      expect(saveShortcut?.keys).toBe(originalSaveShortcut?.keys);
    });

    it('should not add shortcut if id does not exist', async () => {
      const { useSettingsStore } = await import('./settings-store');
      const originalLength = useSettingsStore.getState().shortcuts.length;
      act(() => {
        useSettingsStore.getState().updateShortcut('nonexistent', 'Ctrl+X');
      });
      expect(useSettingsStore.getState().shortcuts.length).toBe(originalLength);
    });
  });

  describe('resetToDefaults', () => {
    it('should reset theme to default', async () => {
      const { useSettingsStore } = await import('./settings-store');
      act(() => {
        useSettingsStore.getState().setTheme('light');
        useSettingsStore.getState().resetToDefaults();
      });
      expect(useSettingsStore.getState().theme).toBe('dark');
    });

    it('should reset font size to default', async () => {
      const { useSettingsStore } = await import('./settings-store');
      act(() => {
        useSettingsStore.getState().setFontSize(20);
        useSettingsStore.getState().resetToDefaults();
      });
      expect(useSettingsStore.getState().fontSize).toBe(14);
    });

    it('should reset terminal theme to default', async () => {
      const { useSettingsStore } = await import('./settings-store');
      act(() => {
        useSettingsStore.getState().setTerminalTheme('dracula');
        useSettingsStore.getState().resetToDefaults();
      });
      expect(useSettingsStore.getState().terminalTheme).toBe('default');
    });

    it('should reset all settings at once', async () => {
      const { useSettingsStore } = await import('./settings-store');
      act(() => {
        useSettingsStore.getState().setTheme('light');
        useSettingsStore.getState().setFontSize(20);
        useSettingsStore.getState().setFontFamily('Monaco, monospace');
        useSettingsStore.getState().setTerminalTheme('dracula');
        useSettingsStore.getState().setAnimationsEnabled(false);
        useSettingsStore.getState().resetToDefaults();
      });
      const state = useSettingsStore.getState();
      expect(state.theme).toBe('dark');
      expect(state.fontSize).toBe(14);
      expect(state.fontFamily).toBe('JetBrains Mono, monospace');
      expect(state.terminalTheme).toBe('default');
      expect(state.animationsEnabled).toBe(true);
    });
  });

  describe('exportSettings', () => {
    it('should export settings as valid JSON', async () => {
      const { useSettingsStore } = await import('./settings-store');
      act(() => {
        useSettingsStore.getState().setTheme('light');
        useSettingsStore.getState().setFontSize(16);
      });
      const exported = useSettingsStore.getState().exportSettings();
      expect(() => JSON.parse(exported)).not.toThrow();
    });

    it('should include theme in export', async () => {
      const { useSettingsStore } = await import('./settings-store');
      act(() => {
        useSettingsStore.getState().setTheme('light');
      });
      const exported = useSettingsStore.getState().exportSettings();
      const parsed = JSON.parse(exported);
      expect(parsed.theme).toBe('light');
    });

    it('should include font settings in export', async () => {
      const { useSettingsStore } = await import('./settings-store');
      act(() => {
        useSettingsStore.getState().setFontSize(18);
        useSettingsStore.getState().setFontFamily('Fira Code, monospace');
      });
      const exported = useSettingsStore.getState().exportSettings();
      const parsed = JSON.parse(exported);
      expect(parsed.fontSize).toBe(18);
      expect(parsed.fontFamily).toBe('Fira Code, monospace');
    });

    it('should include shortcuts in export', async () => {
      const { useSettingsStore } = await import('./settings-store');
      const exported = useSettingsStore.getState().exportSettings();
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed.shortcuts)).toBe(true);
    });
  });

  describe('importSettings', () => {
    it('should import theme from JSON', async () => {
      const { useSettingsStore } = await import('./settings-store');
      const settings = JSON.stringify({ theme: 'light' });
      act(() => {
        useSettingsStore.getState().importSettings(settings);
      });
      expect(useSettingsStore.getState().theme).toBe('light');
    });

    it('should import font size from JSON', async () => {
      const { useSettingsStore } = await import('./settings-store');
      const settings = JSON.stringify({ fontSize: 18 });
      act(() => {
        useSettingsStore.getState().importSettings(settings);
      });
      expect(useSettingsStore.getState().fontSize).toBe(18);
    });

    it('should import multiple settings', async () => {
      const { useSettingsStore } = await import('./settings-store');
      const settings = JSON.stringify({
        theme: 'light',
        fontSize: 16,
        fontFamily: 'Monaco, monospace',
        terminalTheme: 'dracula',
      });
      act(() => {
        useSettingsStore.getState().importSettings(settings);
      });
      const state = useSettingsStore.getState();
      expect(state.theme).toBe('light');
      expect(state.fontSize).toBe(16);
      expect(state.fontFamily).toBe('Monaco, monospace');
      expect(state.terminalTheme).toBe('dracula');
    });

    it('should handle invalid JSON gracefully', async () => {
      const { useSettingsStore } = await import('./settings-store');
      expect(() => {
        act(() => {
          useSettingsStore.getState().importSettings('invalid json');
        });
      }).not.toThrow();
    });

    it('should not crash on partial settings', async () => {
      const { useSettingsStore } = await import('./settings-store');
      const settings = JSON.stringify({ theme: 'light' }); // Only theme, no other settings
      expect(() => {
        act(() => {
          useSettingsStore.getState().importSettings(settings);
        });
      }).not.toThrow();
    });
  });

  describe('persistence', () => {
    it('should persist settings to localStorage', async () => {
      const { useSettingsStore } = await import('./settings-store');
      act(() => {
        useSettingsStore.getState().setTheme('light');
      });
      // Trigger persist
      await new Promise((resolve) => setTimeout(resolve, 0));
      const stored = localStorageMock.getItem('masterdashboard-settings');
      expect(stored).not.toBeNull();
      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.state.theme).toBe('light');
      }
    });
  });

  describe('editor settings', () => {
    it('should have default tab size of 2', async () => {
      const { useSettingsStore } = await import('./settings-store');
      expect(useSettingsStore.getState().tabSize).toBe(2);
    });

    it('should update tab size', async () => {
      const { useSettingsStore } = await import('./settings-store');
      act(() => {
        useSettingsStore.getState().setTabSize(4);
      });
      expect(useSettingsStore.getState().tabSize).toBe(4);
    });

    it('should have word wrap disabled by default', async () => {
      const { useSettingsStore } = await import('./settings-store');
      expect(useSettingsStore.getState().wordWrap).toBe(false);
    });

    it('should toggle word wrap', async () => {
      const { useSettingsStore } = await import('./settings-store');
      act(() => {
        useSettingsStore.getState().setWordWrap(true);
      });
      expect(useSettingsStore.getState().wordWrap).toBe(true);
    });

    it('should have line numbers enabled by default', async () => {
      const { useSettingsStore } = await import('./settings-store');
      expect(useSettingsStore.getState().lineNumbers).toBe(true);
    });
  });
});
