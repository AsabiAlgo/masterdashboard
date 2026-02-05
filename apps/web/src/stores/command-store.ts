/**
 * Command Store
 *
 * Zustand store for managing command palette state including
 * open/close state, mode selection, query, and recent items.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type CommandMode = 'commands' | 'files';

interface CommandState {
  // State
  isOpen: boolean;
  mode: CommandMode;
  query: string;
  selectedIndex: number;
  recentCommands: string[];
  recentFiles: string[];

  // Actions
  open: (mode?: CommandMode) => void;
  close: () => void;
  toggle: (mode?: CommandMode) => void;
  setMode: (mode: CommandMode) => void;
  setQuery: (query: string) => void;
  setSelectedIndex: (index: number) => void;
  moveSelection: (delta: number, maxIndex: number) => void;
  addRecentCommand: (id: string) => void;
  addRecentFile: (path: string) => void;
  clearRecent: () => void;
}

const MAX_RECENT_ITEMS = 10;

export const useCommandStore = create<CommandState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        isOpen: false,
        mode: 'commands',
        query: '',
        selectedIndex: 0,
        recentCommands: [],
        recentFiles: [],

        // Actions
        open: (mode = 'commands') => {
          set({
            isOpen: true,
            mode,
            query: '',
            selectedIndex: 0,
          });
        },

        close: () => {
          set({
            isOpen: false,
            query: '',
            selectedIndex: 0,
          });
        },

        toggle: (mode) => {
          const state = get();
          if (state.isOpen && (!mode || state.mode === mode)) {
            get().close();
          } else {
            get().open(mode);
          }
        },

        setMode: (mode) => {
          set({
            mode,
            query: '',
            selectedIndex: 0,
          });
        },

        setQuery: (query) => {
          set({
            query,
            selectedIndex: 0,
          });
        },

        setSelectedIndex: (index) => {
          set({ selectedIndex: Math.max(0, index) });
        },

        moveSelection: (delta, maxIndex) => {
          const state = get();
          const newIndex = state.selectedIndex + delta;
          set({
            selectedIndex: Math.max(0, Math.min(newIndex, maxIndex)),
          });
        },

        addRecentCommand: (id) => {
          const state = get();
          const filtered = state.recentCommands.filter((c) => c !== id);
          set({
            recentCommands: [id, ...filtered].slice(0, MAX_RECENT_ITEMS),
          });
        },

        addRecentFile: (path) => {
          const state = get();
          const filtered = state.recentFiles.filter((f) => f !== path);
          set({
            recentFiles: [path, ...filtered].slice(0, MAX_RECENT_ITEMS),
          });
        },

        clearRecent: () => {
          set({
            recentCommands: [],
            recentFiles: [],
          });
        },
      }),
      {
        name: 'masterdashboard-command-palette',
        partialize: (state) => ({
          recentCommands: state.recentCommands,
          recentFiles: state.recentFiles,
        }),
      }
    ),
    { name: 'CommandStore' }
  )
);

// Selector hooks for optimized renders
export const useCommandPaletteOpen = () => useCommandStore((state) => state.isOpen);
export const useCommandPaletteMode = () => useCommandStore((state) => state.mode);
export const useCommandPaletteQuery = () => useCommandStore((state) => state.query);
export const useCommandPaletteSelectedIndex = () =>
  useCommandStore((state) => state.selectedIndex);
