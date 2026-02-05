/**
 * Settings Store
 *
 * Zustand store for managing application settings including theme,
 * terminal colors, fonts, keyboard shortcuts, and editor preferences.
 * Settings persist to localStorage.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * Theme mode options
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Terminal color scheme options
 */
export type TerminalTheme =
  | 'default'
  | 'dracula'
  | 'monokai'
  | 'solarized-dark'
  | 'solarized-light'
  | 'nord'
  | 'one-dark'
  | 'github-dark';

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  id: string;
  name: string;
  keys: string;
  action: string;
}

/**
 * Settings store state
 */
export interface SettingsState {
  // UI State (not persisted)
  isSettingsPanelOpen: boolean;

  // Appearance
  theme: ThemeMode;
  terminalTheme: TerminalTheme;
  fontSize: number;
  fontFamily: string;
  showMinimap: boolean;
  animationsEnabled: boolean;

  // Editor
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  autoSave: boolean;
  autoSaveInterval: number;

  // Keyboard shortcuts
  shortcuts: KeyboardShortcut[];

  // Actions - UI
  openSettingsPanel: () => void;
  closeSettingsPanel: () => void;

  // Actions - Appearance
  setTheme: (theme: ThemeMode) => void;
  setTerminalTheme: (theme: TerminalTheme) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setShowMinimap: (show: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => void;

  // Actions - Editor
  setTabSize: (size: number) => void;
  setWordWrap: (wrap: boolean) => void;
  setLineNumbers: (show: boolean) => void;
  setAutoSave: (enabled: boolean) => void;
  setAutoSaveInterval: (interval: number) => void;

  // Actions - Shortcuts
  updateShortcut: (id: string, keys: string) => void;

  // Actions - Settings management
  resetToDefaults: () => void;
  exportSettings: () => string;
  importSettings: (json: string) => void;
}

/**
 * Default keyboard shortcuts
 */
const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    id: 'new-terminal',
    name: 'New Terminal',
    keys: 'Ctrl+Shift+T',
    action: 'createTerminal',
  },
  {
    id: 'command-palette',
    name: 'Command Palette',
    keys: 'Ctrl+K',
    action: 'openCommandPalette',
  },
  {
    id: 'quick-open',
    name: 'Quick Open',
    keys: 'Ctrl+P',
    action: 'openQuickOpen',
  },
  {
    id: 'save',
    name: 'Save',
    keys: 'Ctrl+S',
    action: 'save',
  },
  {
    id: 'toggle-sidebar',
    name: 'Toggle Sidebar',
    keys: 'Ctrl+B',
    action: 'toggleSidebar',
  },
  {
    id: 'fit-view',
    name: 'Fit View',
    keys: 'Ctrl+0',
    action: 'fitView',
  },
  {
    id: 'zoom-in',
    name: 'Zoom In',
    keys: 'Ctrl+=',
    action: 'zoomIn',
  },
  {
    id: 'zoom-out',
    name: 'Zoom Out',
    keys: 'Ctrl+-',
    action: 'zoomOut',
  },
  {
    id: 'settings',
    name: 'Settings',
    keys: 'Ctrl+,',
    action: 'openSettings',
  },
  {
    id: 'close-node',
    name: 'Close Node',
    keys: 'Ctrl+W',
    action: 'closeNode',
  },
];

/**
 * Default settings values
 */
const DEFAULT_SETTINGS: Omit<
  SettingsState,
  | 'isSettingsPanelOpen'
  | 'openSettingsPanel'
  | 'closeSettingsPanel'
  | 'setTheme'
  | 'setTerminalTheme'
  | 'setFontSize'
  | 'setFontFamily'
  | 'setShowMinimap'
  | 'setAnimationsEnabled'
  | 'setTabSize'
  | 'setWordWrap'
  | 'setLineNumbers'
  | 'setAutoSave'
  | 'setAutoSaveInterval'
  | 'updateShortcut'
  | 'resetToDefaults'
  | 'exportSettings'
  | 'importSettings'
> = {
  theme: 'dark',
  terminalTheme: 'default',
  fontSize: 14,
  fontFamily: 'JetBrains Mono, monospace',
  showMinimap: true,
  animationsEnabled: true,
  tabSize: 2,
  wordWrap: false,
  lineNumbers: true,
  autoSave: true,
  autoSaveInterval: 30000,
  shortcuts: DEFAULT_SHORTCUTS,
};

/**
 * Apply theme to document
 */
export function applyTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

/**
 * Settings store
 */
export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        ...DEFAULT_SETTINGS,

        // UI State (not persisted)
        isSettingsPanelOpen: false,

        // UI Actions
        openSettingsPanel: () => set({ isSettingsPanelOpen: true }),
        closeSettingsPanel: () => set({ isSettingsPanelOpen: false }),

        // Appearance actions
        setTheme: (theme) => {
          set({ theme });
          applyTheme(theme);
        },

        setTerminalTheme: (terminalTheme) => set({ terminalTheme }),

        setFontSize: (fontSize) => set({ fontSize }),

        setFontFamily: (fontFamily) => set({ fontFamily }),

        setShowMinimap: (showMinimap) => set({ showMinimap }),

        setAnimationsEnabled: (animationsEnabled) => set({ animationsEnabled }),

        // Editor actions
        setTabSize: (tabSize) => set({ tabSize }),

        setWordWrap: (wordWrap) => set({ wordWrap }),

        setLineNumbers: (lineNumbers) => set({ lineNumbers }),

        setAutoSave: (autoSave) => set({ autoSave }),

        setAutoSaveInterval: (autoSaveInterval) => set({ autoSaveInterval }),

        // Shortcuts actions
        updateShortcut: (id, keys) => {
          const shortcuts = get().shortcuts.map((s) =>
            s.id === id ? { ...s, keys } : s
          );
          set({ shortcuts });
        },

        // Settings management
        resetToDefaults: () => {
          set({ ...DEFAULT_SETTINGS });
          applyTheme(DEFAULT_SETTINGS.theme);
        },

        exportSettings: () => {
          const state = get();
          const exportData = {
            theme: state.theme,
            terminalTheme: state.terminalTheme,
            fontSize: state.fontSize,
            fontFamily: state.fontFamily,
            showMinimap: state.showMinimap,
            animationsEnabled: state.animationsEnabled,
            tabSize: state.tabSize,
            wordWrap: state.wordWrap,
            lineNumbers: state.lineNumbers,
            autoSave: state.autoSave,
            autoSaveInterval: state.autoSaveInterval,
            shortcuts: state.shortcuts,
          };
          return JSON.stringify(exportData, null, 2);
        },

        importSettings: (json) => {
          try {
            const settings = JSON.parse(json);
            set(settings);
            if (settings.theme) {
              applyTheme(settings.theme);
            }
          } catch {
            // Invalid JSON - ignore silently
          }
        },
      }),
      {
        name: 'masterdashboard-settings',
        partialize: (state) => ({
          theme: state.theme,
          terminalTheme: state.terminalTheme,
          fontSize: state.fontSize,
          fontFamily: state.fontFamily,
          showMinimap: state.showMinimap,
          animationsEnabled: state.animationsEnabled,
          tabSize: state.tabSize,
          wordWrap: state.wordWrap,
          lineNumbers: state.lineNumbers,
          autoSave: state.autoSave,
          autoSaveInterval: state.autoSaveInterval,
          shortcuts: state.shortcuts,
        }),
      }
    ),
    { name: 'SettingsStore' }
  )
);

// Selector hooks for optimized renders
export const useTheme = () => useSettingsStore((state) => state.theme);
export const useTerminalTheme = () =>
  useSettingsStore((state) => state.terminalTheme);
export const useFontSize = () => useSettingsStore((state) => state.fontSize);
export const useFontFamily = () => useSettingsStore((state) => state.fontFamily);
export const useShortcuts = () => useSettingsStore((state) => state.shortcuts);
export const useAnimationsEnabled = () =>
  useSettingsStore((state) => state.animationsEnabled);
export const useIsSettingsPanelOpen = () =>
  useSettingsStore((state) => state.isSettingsPanelOpen);
export const useOpenSettingsPanel = () =>
  useSettingsStore((state) => state.openSettingsPanel);
export const useCloseSettingsPanel = () =>
  useSettingsStore((state) => state.closeSettingsPanel);
