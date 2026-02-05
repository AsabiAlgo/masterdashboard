/**
 * CommandPalette Component Tests
 *
 * Integration tests for the command palette UI component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from './CommandPalette';
import { useCommandStore } from '@/stores/command-store';
import { useProjectStore } from '@/stores/project-store';
import { useCanvasStore } from '@/stores/canvas-store';
import React from 'react';

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock stores
vi.mock('@/stores/command-store', () => ({
  useCommandStore: vi.fn(),
}));

vi.mock('@/stores/project-store', () => ({
  useProjectStore: vi.fn(),
}));

vi.mock('@/stores/canvas-store', () => ({
  useCanvasStore: vi.fn(),
}));

// Create mock command action
const mockCommandAction = vi.fn();

// Mock hooks with proper React element
vi.mock('@/hooks/useCommands', () => ({
  useCommands: () => [
    {
      id: 'new-terminal',
      title: 'New Terminal',
      description: 'Create a new terminal node',
      category: 'Create',
      action: mockCommandAction,
      keywords: ['terminal', 'shell'],
      icon: React.createElement('span', { 'data-testid': 'terminal-icon' }, 'T'),
    },
    {
      id: 'toggle-theme',
      title: 'Toggle Theme',
      description: 'Switch between light and dark mode',
      category: 'Settings',
      action: vi.fn(),
      keywords: ['theme', 'dark', 'light'],
      icon: React.createElement('span', { 'data-testid': 'theme-icon' }, 'L'),
    },
  ],
}));

vi.mock('@/hooks/useQuickOpen', () => ({
  useQuickOpen: () => ({
    results: [
      { path: '/src/index.ts', name: 'index.ts', type: 'file', extension: 'ts' },
      { path: '/src/App.tsx', name: 'App.tsx', type: 'file', extension: 'tsx' },
    ],
    loading: false,
    error: null,
    search: vi.fn(),
    clearResults: vi.fn(),
  }),
}));

describe('CommandPalette', () => {
  const mockSetQuery = vi.fn();
  const mockSetSelectedIndex = vi.fn();
  const mockSetMode = vi.fn();
  const mockClose = vi.fn();
  const mockAddRecentCommand = vi.fn();
  const mockAddRecentFile = vi.fn();
  const mockAddNode = vi.fn();

  const defaultCommandStoreState = {
    isOpen: true,
    mode: 'commands' as const,
    query: '',
    selectedIndex: 0,
    setQuery: mockSetQuery,
    setSelectedIndex: mockSetSelectedIndex,
    setMode: mockSetMode,
    close: mockClose,
    addRecentCommand: mockAddRecentCommand,
    addRecentFile: mockAddRecentFile,
    recentCommands: [],
    recentFiles: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useCommandStore).mockReturnValue(defaultCommandStoreState);

    vi.mocked(useProjectStore).mockReturnValue({
      currentProject: {
        id: 'test-project',
        name: 'Test Project',
        defaultCwd: '/home/user/project',
      },
    } as ReturnType<typeof useProjectStore>);

    vi.mocked(useCanvasStore).mockReturnValue({
      addNode: mockAddNode,
    } as unknown as ReturnType<typeof useCanvasStore>);
  });

  describe('rendering', () => {
    it('should render when open', () => {
      render(<CommandPalette />);
      expect(screen.getByTestId('command-palette')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      vi.mocked(useCommandStore).mockReturnValue({
        ...defaultCommandStoreState,
        isOpen: false,
      });

      render(<CommandPalette />);
      expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<CommandPalette />);
      expect(screen.getByTestId('command-input')).toBeInTheDocument();
    });

    it('should render mode tabs', () => {
      render(<CommandPalette />);
      expect(screen.getByText('Commands')).toBeInTheDocument();
      expect(screen.getByText('Files')).toBeInTheDocument();
    });

    it('should render keyboard hints in footer', () => {
      render(<CommandPalette />);
      expect(screen.getByText('Navigate')).toBeInTheDocument();
      expect(screen.getByText('Select')).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });

  describe('search input', () => {
    it('should update query when typing', async () => {
      const user = userEvent.setup();
      render(<CommandPalette />);

      const input = screen.getByTestId('command-input');
      await user.type(input, 't');

      expect(mockSetQuery).toHaveBeenCalled();
    });

    it('should have correct placeholder for commands mode', () => {
      render(<CommandPalette />);
      const input = screen.getByTestId('command-input');
      expect(input).toHaveAttribute('placeholder', 'Type a command or search...');
    });

    it('should have correct placeholder for files mode', () => {
      vi.mocked(useCommandStore).mockReturnValue({
        ...defaultCommandStoreState,
        mode: 'files',
      });

      render(<CommandPalette />);
      const input = screen.getByTestId('command-input');
      expect(input).toHaveAttribute('placeholder', 'Search files by name...');
    });
  });

  describe('keyboard navigation', () => {
    it('should close on Escape', async () => {
      render(<CommandPalette />);

      fireEvent.keyDown(window, { key: 'Escape' });

      await waitFor(() => {
        expect(mockClose).toHaveBeenCalled();
      });
    });

    it('should navigate down with ArrowDown', async () => {
      render(<CommandPalette />);

      fireEvent.keyDown(window, { key: 'ArrowDown' });

      expect(mockSetSelectedIndex).toHaveBeenCalled();
    });

    it('should navigate up with ArrowUp', async () => {
      vi.mocked(useCommandStore).mockReturnValue({
        ...defaultCommandStoreState,
        selectedIndex: 1,
      });

      render(<CommandPalette />);

      fireEvent.keyDown(window, { key: 'ArrowUp' });

      expect(mockSetSelectedIndex).toHaveBeenCalled();
    });

    it('should switch mode with Tab', async () => {
      render(<CommandPalette />);

      fireEvent.keyDown(window, { key: 'Tab' });

      expect(mockSetMode).toHaveBeenCalledWith('files');
    });
  });

  describe('mode switching', () => {
    it('should switch to files mode when Files tab clicked', async () => {
      const user = userEvent.setup();
      render(<CommandPalette />);

      await user.click(screen.getByText('Files'));

      expect(mockSetMode).toHaveBeenCalledWith('files');
    });

    it('should switch to commands mode when Commands tab clicked', async () => {
      vi.mocked(useCommandStore).mockReturnValue({
        ...defaultCommandStoreState,
        mode: 'files',
      });

      const user = userEvent.setup();
      render(<CommandPalette />);

      await user.click(screen.getByText('Commands'));

      expect(mockSetMode).toHaveBeenCalledWith('commands');
    });
  });

  describe('backdrop', () => {
    it('should close on backdrop click', async () => {
      const user = userEvent.setup();
      render(<CommandPalette />);

      const backdrop = screen.getByTestId('command-palette-backdrop');
      await user.click(backdrop);

      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('input attributes', () => {
    it('should have proper input attributes', () => {
      render(<CommandPalette />);

      const input = screen.getByTestId('command-input');
      expect(input).toHaveAttribute('type', 'text');
      expect(input).toHaveAttribute('spellcheck', 'false');
      expect(input).toHaveAttribute('autocomplete', 'off');
    });
  });
});
