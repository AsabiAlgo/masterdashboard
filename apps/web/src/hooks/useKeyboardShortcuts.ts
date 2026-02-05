/**
 * Keyboard Shortcuts Hook
 *
 * Global keyboard shortcuts for terminal navigation, canvas operations,
 * and command palette activation.
 */

import { useEffect, useCallback } from 'react';
import { useCanvasStore } from '@/stores/canvas-store';
import { useCommandStore } from '@/stores/command-store';
import { useSettingsStore } from '@/stores/settings-store';
import { NodeType } from '@masterdashboard/shared';

interface UseKeyboardShortcutsOptions {
  /** Callback to clear the selected terminal */
  onClearTerminal?: () => void;
  /** Callback to create a new note */
  onCreateNote?: () => void;
  /** Whether shortcuts are enabled */
  enabled?: boolean;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { onClearTerminal, onCreateNote, enabled = true } = options;
  const { nodes, selectedNodeId, setSelectedNode, addNode } = useCanvasStore();
  const { open: openCommandPalette, isOpen: isCommandPaletteOpen } = useCommandStore();
  const { openSettingsPanel, isSettingsPanelOpen } = useSettingsStore();

  // Get terminal nodes in order
  const getTerminalNodes = useCallback(() => {
    return nodes.filter((node) => node.type === NodeType.TERMINAL);
  }, [nodes]);

  // Select next terminal (Tab)
  const selectNextTerminal = useCallback(() => {
    const terminals = getTerminalNodes();
    if (terminals.length === 0) return;

    const currentIndex = selectedNodeId
      ? terminals.findIndex((t) => t.id === selectedNodeId)
      : -1;

    const nextIndex = (currentIndex + 1) % terminals.length;
    const nextTerminal = terminals[nextIndex];
    if (nextTerminal) {
      setSelectedNode(nextTerminal.id);
    }
  }, [getTerminalNodes, selectedNodeId, setSelectedNode]);

  // Select previous terminal (Shift+Tab)
  const selectPrevTerminal = useCallback(() => {
    const terminals = getTerminalNodes();
    if (terminals.length === 0) return;

    const currentIndex = selectedNodeId
      ? terminals.findIndex((t) => t.id === selectedNodeId)
      : 0;

    const prevIndex = currentIndex <= 0 ? terminals.length - 1 : currentIndex - 1;
    const prevTerminal = terminals[prevIndex];
    if (prevTerminal) {
      setSelectedNode(prevTerminal.id);
    }
  }, [getTerminalNodes, selectedNodeId, setSelectedNode]);

  // Select terminal by number (1-9)
  const selectTerminalByNumber = useCallback(
    (num: number) => {
      const terminals = getTerminalNodes();
      const index = num - 1;
      const terminal = terminals[index];

      if (terminal) {
        setSelectedNode(terminal.id);
      }
    },
    [getTerminalNodes, setSelectedNode]
  );

  // Deselect (Escape)
  const deselect = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  // Create a new note (N key when no input focused)
  const createNewNote = useCallback(() => {
    if (onCreateNote) {
      onCreateNote();
    } else {
      // Default: create note at center of viewport
      addNode(NodeType.NOTES, { x: 100, y: 100 });
    }
  }, [onCreateNote, addNode]);

  // Handle keyboard events
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle shortcuts if command palette or settings panel is open
      if (isCommandPaletteOpen || isSettingsPanelOpen) {
        return;
      }

      // Cmd/Ctrl+,: Open Settings
      if ((event.metaKey || event.ctrlKey) && event.key === ',') {
        event.preventDefault();
        event.stopPropagation();
        openSettingsPanel();
        return;
      }

      // Escape to deselect - but NOT when a terminal is focused
      // Terminals need Escape for vim, less, canceling commands, etc.
      if (event.key === 'Escape') {
        const selectedNode = nodes.find(n => n.id === selectedNodeId);
        const isTerminalSelected = selectedNode?.type === NodeType.TERMINAL;

        // Let Escape pass through to terminal
        if (isTerminalSelected) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        deselect();
        return;
      }

      // Cmd/Ctrl+P: Open Quick Open (file search)
      if ((event.metaKey || event.ctrlKey) && event.key === 'p') {
        event.preventDefault();
        event.stopPropagation();
        openCommandPalette('files');
        return;
      }

      // Cmd/Ctrl+K: Open Command Palette (or clear terminal if selected)
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        event.stopPropagation();
        // If a terminal is selected and clear callback exists, clear it
        // Otherwise, open command palette
        if (selectedNodeId && onClearTerminal) {
          onClearTerminal();
        } else {
          openCommandPalette('commands');
        }
        return;
      }

      // Cmd/Ctrl + Shift + Arrow: Cycle through terminals (works even when terminal focused)
      // Using arrows instead of [ ] for international keyboard compatibility
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        selectPrevTerminal();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        selectNextTerminal();
        return;
      }

      // Cmd/Ctrl + 1-9: Jump to terminal by number (works even when terminal focused)
      if ((event.metaKey || event.ctrlKey) && /^[1-9]$/.test(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        selectTerminalByNumber(parseInt(event.key, 10));
        return;
      }

      // N: Create new note (only when no input/textarea is focused)
      if (event.key === 'n' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const target = event.target as HTMLElement;
        const isInputFocused =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable;
        if (!isInputFocused) {
          event.preventDefault();
          event.stopPropagation();
          createNewNote();
        }
        return;
      }
    };

    // Use capture phase to intercept events BEFORE xterm.js captures them
    // This is necessary because xterm.js stops event propagation for keyboard events
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    enabled,
    isCommandPaletteOpen,
    isSettingsPanelOpen,
    openCommandPalette,
    openSettingsPanel,
    deselect,
    selectNextTerminal,
    selectPrevTerminal,
    selectTerminalByNumber,
    selectedNodeId,
    nodes,
    onClearTerminal,
    createNewNote,
  ]);

  return {
    selectNextTerminal,
    selectPrevTerminal,
    selectTerminalByNumber,
    deselect,
    createNewNote,
  };
}
