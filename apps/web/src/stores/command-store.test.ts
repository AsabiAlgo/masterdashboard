/**
 * Command Store Tests
 *
 * Unit tests for command palette store.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCommandStore } from './command-store';

describe('CommandStore', () => {
  beforeEach(() => {
    // Reset store state
    useCommandStore.setState({
      isOpen: false,
      mode: 'commands',
      query: '',
      selectedIndex: 0,
      recentCommands: [],
      recentFiles: [],
    });
  });

  describe('open', () => {
    it('should open in commands mode by default', () => {
      const { open } = useCommandStore.getState();
      open();

      const state = useCommandStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.mode).toBe('commands');
    });

    it('should open in files mode when specified', () => {
      const { open } = useCommandStore.getState();
      open('files');

      const state = useCommandStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.mode).toBe('files');
    });

    it('should reset query and selection on open', () => {
      useCommandStore.setState({ query: 'old', selectedIndex: 5 });
      const { open } = useCommandStore.getState();
      open();

      const state = useCommandStore.getState();
      expect(state.query).toBe('');
      expect(state.selectedIndex).toBe(0);
    });
  });

  describe('close', () => {
    it('should close the palette', () => {
      useCommandStore.setState({ isOpen: true });
      const { close } = useCommandStore.getState();
      close();

      expect(useCommandStore.getState().isOpen).toBe(false);
    });

    it('should reset query and selection on close', () => {
      useCommandStore.setState({ isOpen: true, query: 'test', selectedIndex: 3 });
      const { close } = useCommandStore.getState();
      close();

      const state = useCommandStore.getState();
      expect(state.query).toBe('');
      expect(state.selectedIndex).toBe(0);
    });
  });

  describe('toggle', () => {
    it('should open when closed', () => {
      const { toggle } = useCommandStore.getState();
      toggle();

      expect(useCommandStore.getState().isOpen).toBe(true);
    });

    it('should close when open in same mode', () => {
      useCommandStore.setState({ isOpen: true, mode: 'commands' });
      const { toggle } = useCommandStore.getState();
      toggle('commands');

      expect(useCommandStore.getState().isOpen).toBe(false);
    });

    it('should switch mode when open in different mode', () => {
      useCommandStore.setState({ isOpen: true, mode: 'commands' });
      const { toggle } = useCommandStore.getState();
      toggle('files');

      const state = useCommandStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.mode).toBe('files');
    });
  });

  describe('setQuery', () => {
    it('should update query and reset selection', () => {
      useCommandStore.setState({ selectedIndex: 5 });
      const { setQuery } = useCommandStore.getState();
      setQuery('new query');

      const state = useCommandStore.getState();
      expect(state.query).toBe('new query');
      expect(state.selectedIndex).toBe(0);
    });
  });

  describe('setSelectedIndex', () => {
    it('should update selected index', () => {
      const { setSelectedIndex } = useCommandStore.getState();
      setSelectedIndex(3);

      expect(useCommandStore.getState().selectedIndex).toBe(3);
    });

    it('should not allow negative index', () => {
      const { setSelectedIndex } = useCommandStore.getState();
      setSelectedIndex(-1);

      expect(useCommandStore.getState().selectedIndex).toBe(0);
    });
  });

  describe('moveSelection', () => {
    it('should move selection down', () => {
      const { moveSelection } = useCommandStore.getState();
      moveSelection(1, 10);

      expect(useCommandStore.getState().selectedIndex).toBe(1);
    });

    it('should move selection up', () => {
      useCommandStore.setState({ selectedIndex: 5 });
      const { moveSelection } = useCommandStore.getState();
      moveSelection(-1, 10);

      expect(useCommandStore.getState().selectedIndex).toBe(4);
    });

    it('should not exceed max index', () => {
      useCommandStore.setState({ selectedIndex: 9 });
      const { moveSelection } = useCommandStore.getState();
      moveSelection(1, 9);

      expect(useCommandStore.getState().selectedIndex).toBe(9);
    });

    it('should not go below 0', () => {
      useCommandStore.setState({ selectedIndex: 0 });
      const { moveSelection } = useCommandStore.getState();
      moveSelection(-1, 10);

      expect(useCommandStore.getState().selectedIndex).toBe(0);
    });
  });

  describe('addRecentCommand', () => {
    it('should add command to recent list', () => {
      const { addRecentCommand } = useCommandStore.getState();
      addRecentCommand('new-terminal');

      expect(useCommandStore.getState().recentCommands).toContain('new-terminal');
    });

    it('should move existing command to front', () => {
      useCommandStore.setState({ recentCommands: ['cmd1', 'cmd2', 'cmd3'] });
      const { addRecentCommand } = useCommandStore.getState();
      addRecentCommand('cmd2');

      expect(useCommandStore.getState().recentCommands[0]).toBe('cmd2');
    });

    it('should limit recent commands to 10', () => {
      const { addRecentCommand } = useCommandStore.getState();
      for (let i = 0; i < 15; i++) {
        addRecentCommand(`cmd-${i}`);
      }

      expect(useCommandStore.getState().recentCommands.length).toBeLessThanOrEqual(10);
    });

    it('should not have duplicates', () => {
      const { addRecentCommand } = useCommandStore.getState();
      addRecentCommand('cmd1');
      addRecentCommand('cmd2');
      addRecentCommand('cmd1');

      const recentCommands = useCommandStore.getState().recentCommands;
      expect(recentCommands.filter((c) => c === 'cmd1').length).toBe(1);
    });
  });

  describe('addRecentFile', () => {
    it('should add file to recent list', () => {
      const { addRecentFile } = useCommandStore.getState();
      addRecentFile('/path/to/file.ts');

      expect(useCommandStore.getState().recentFiles).toContain('/path/to/file.ts');
    });

    it('should move existing file to front', () => {
      useCommandStore.setState({
        recentFiles: ['/file1.ts', '/file2.ts', '/file3.ts'],
      });
      const { addRecentFile } = useCommandStore.getState();
      addRecentFile('/file2.ts');

      expect(useCommandStore.getState().recentFiles[0]).toBe('/file2.ts');
    });
  });

  describe('clearRecent', () => {
    it('should clear all recent items', () => {
      useCommandStore.setState({
        recentCommands: ['cmd1', 'cmd2'],
        recentFiles: ['/file1.ts', '/file2.ts'],
      });
      const { clearRecent } = useCommandStore.getState();
      clearRecent();

      const state = useCommandStore.getState();
      expect(state.recentCommands).toHaveLength(0);
      expect(state.recentFiles).toHaveLength(0);
    });
  });
});
