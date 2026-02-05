/**
 * Commands Hook
 *
 * Registry of all available commands for the command palette.
 */

'use client';

import { useMemo } from 'react';
import { useCanvasStore } from '@/stores/canvas-store';
import { useSettingsStore, type ThemeMode } from '@/stores/settings-store';
import { NodeType, ShellType, type TerminalNodeData } from '@masterdashboard/shared';

export interface Command {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  keywords?: string[];
  action: () => void | Promise<void>;
  category?: string;
}

// Icon components for commands
const TerminalIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const ClaudeIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

const FolderIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
    />
  </svg>
);

const NotesIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);

const ViewIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
    />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const ThemeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    />
  </svg>
);

const BrowserIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
    />
  </svg>
);

const SSHIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

const FileViewerIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
    />
  </svg>
);

const DiffIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
    />
  </svg>
);

const DatabaseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
    />
  </svg>
);

const GitIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
    />
  </svg>
);

const HomeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const SaveIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
    />
  </svg>
);

export function useCommands(): Command[] {
  const { addNodeAtViewportCenter, clearCanvas, nodes, setSelectedNode, selectedNodeId, removeNode, updateNodeData } =
    useCanvasStore();
  const { theme, setTheme } = useSettingsStore();

  return useMemo<Command[]>(() => {
    const commands: Command[] = [
      // Node creation commands
      {
        id: 'new-terminal',
        title: 'New Terminal',
        description: 'Create a new bash terminal',
        icon: <TerminalIcon />,
        shortcut: '⌘⇧T',
        keywords: ['terminal', 'shell', 'bash', 'console', 'cmd'],
        category: 'Create',
        action: () => {
          const nodeId = addNodeAtViewportCenter(NodeType.TERMINAL);
          updateNodeData<TerminalNodeData>(nodeId, { shell: ShellType.BASH });
        },
      },
      {
        id: 'new-claude',
        title: 'New Claude Code',
        description: 'AI-powered coding assistant',
        icon: <ClaudeIcon />,
        keywords: ['claude', 'ai', 'assistant', 'code', 'anthropic'],
        category: 'Create',
        action: () => {
          const nodeId = addNodeAtViewportCenter(NodeType.TERMINAL);
          updateNodeData<TerminalNodeData>(nodeId, { shell: ShellType.CLAUDE_CODE });
        },
      },
      {
        id: 'new-claude-auto',
        title: 'New Claude Code (Auto)',
        description: 'Claude with --dangerously-skip-permissions',
        icon: <ClaudeIcon />,
        keywords: ['claude', 'auto', 'skip', 'permissions', 'dangerous', 'ai'],
        category: 'Create',
        action: () => {
          const nodeId = addNodeAtViewportCenter(NodeType.TERMINAL);
          updateNodeData<TerminalNodeData>(nodeId, { shell: ShellType.CLAUDE_CODE_SKIP_PERMISSIONS });
        },
      },
      {
        id: 'new-zsh',
        title: 'New Zsh Terminal',
        description: 'Z shell with plugins',
        icon: <TerminalIcon />,
        keywords: ['zsh', 'terminal', 'shell', 'oh-my-zsh'],
        category: 'Create',
        action: () => {
          const nodeId = addNodeAtViewportCenter(NodeType.TERMINAL);
          updateNodeData<TerminalNodeData>(nodeId, { shell: ShellType.ZSH });
        },
      },
      {
        id: 'new-folder',
        title: 'New Folder Viewer',
        description: 'Create a new folder browser node',
        icon: <FolderIcon />,
        keywords: ['folder', 'files', 'browser', 'explorer', 'directory'],
        category: 'Create',
        action: () => addNodeAtViewportCenter(NodeType.FOLDER),
      },
      {
        id: 'new-notes',
        title: 'New Notes',
        description: 'Create a new sticky notes node',
        icon: <NotesIcon />,
        shortcut: 'N',
        keywords: ['notes', 'sticky', 'memo', 'text', 'markdown'],
        category: 'Create',
        action: () => addNodeAtViewportCenter(NodeType.NOTES),
      },
      {
        id: 'new-browser',
        title: 'New Browser',
        description: 'Create a new browser automation node',
        icon: <BrowserIcon />,
        keywords: ['browser', 'web', 'chrome', 'playwright', 'automation'],
        category: 'Create',
        action: () => addNodeAtViewportCenter(NodeType.BROWSER),
      },
      {
        id: 'new-ssh',
        title: 'New SSH Connection',
        description: 'Create a new SSH terminal node',
        icon: <SSHIcon />,
        keywords: ['ssh', 'remote', 'server', 'connection', 'secure'],
        category: 'Create',
        action: () => addNodeAtViewportCenter(NodeType.SSH),
      },
      {
        id: 'new-viewer',
        title: 'New File Viewer',
        description: 'Create an empty file viewer node',
        icon: <FileViewerIcon />,
        keywords: ['viewer', 'file', 'code', 'markdown', 'preview', 'read'],
        category: 'Create',
        action: () => addNodeAtViewportCenter(NodeType.VIEWER),
      },
      {
        id: 'new-diff',
        title: 'New Diff Viewer',
        description: 'Create a diff comparison node',
        icon: <DiffIcon />,
        keywords: ['diff', 'compare', 'changes', 'merge', 'side-by-side'],
        category: 'Create',
        action: () => addNodeAtViewportCenter(NodeType.DIFF),
      },
      {
        id: 'new-database',
        title: 'New Database Browser',
        description: 'Create a database connection node',
        icon: <DatabaseIcon />,
        keywords: ['database', 'db', 'sql', 'sqlite', 'postgres', 'mysql', 'query'],
        category: 'Create',
        action: () => addNodeAtViewportCenter(NodeType.DATABASE),
      },
      {
        id: 'new-git',
        title: 'New Git Panel',
        description: 'Create a git repository panel',
        icon: <GitIcon />,
        keywords: ['git', 'version', 'control', 'branch', 'commit', 'status', 'repo'],
        category: 'Create',
        action: () => addNodeAtViewportCenter(NodeType.GIT),
      },

      // View commands
      {
        id: 'fit-view',
        title: 'Fit View',
        description: 'Zoom to fit all nodes in view',
        icon: <ViewIcon />,
        shortcut: '⌘0',
        keywords: ['zoom', 'fit', 'view', 'reset', 'center'],
        category: 'View',
        action: () => {
          // Dispatch custom event for React Flow to handle
          window.dispatchEvent(new CustomEvent('canvas:fit-view'));
        },
      },

      // Canvas operations
      {
        id: 'clear-canvas',
        title: 'Clear Canvas',
        description: 'Remove all nodes from canvas',
        icon: <TrashIcon />,
        keywords: ['clear', 'reset', 'remove', 'delete', 'clean'],
        category: 'Canvas',
        action: () => {
          if (
            nodes.length > 0 &&
            window.confirm('Are you sure you want to clear all nodes?')
          ) {
            clearCanvas();
          }
        },
      },

      // Navigation
      {
        id: 'go-home',
        title: 'Go to Projects',
        description: 'Return to projects list',
        icon: <HomeIcon />,
        keywords: ['home', 'projects', 'back', 'list'],
        category: 'Navigation',
        action: () => {
          window.location.href = '/';
        },
      },

      // Selection
      {
        id: 'deselect-all',
        title: 'Deselect All',
        description: 'Clear node selection',
        icon: <RefreshIcon />,
        shortcut: 'Esc',
        keywords: ['deselect', 'clear', 'selection', 'unfocus'],
        category: 'Selection',
        action: () => setSelectedNode(null),
      },

      // Settings
      {
        id: 'toggle-theme',
        title: 'Toggle Theme',
        description: `Current: ${theme} → Switch to ${theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'}`,
        icon: <ThemeIcon />,
        keywords: ['theme', 'dark', 'light', 'mode', 'color', 'system'],
        category: 'Settings',
        action: () => {
          // Cycle through: dark → light → system → dark
          const nextTheme: ThemeMode =
            theme === 'dark' ? 'light' :
            theme === 'light' ? 'system' : 'dark';
          setTheme(nextTheme);
        },
      },

      // Layout
      {
        id: 'save-layout',
        title: 'Save Layout',
        description: 'Save current canvas layout',
        icon: <SaveIcon />,
        shortcut: '⌘S',
        keywords: ['save', 'layout', 'persist', 'store'],
        category: 'Layout',
        action: () => {
          // Layout is auto-saved via zustand persist, but trigger manual save event
          window.dispatchEvent(new CustomEvent('canvas:save-layout'));
        },
      },
    ];

    // Add delete selected node command if a node is selected
    if (selectedNodeId) {
      commands.push({
        id: 'delete-selected',
        title: 'Delete Selected Node',
        description: 'Remove the currently selected node',
        icon: <TrashIcon />,
        shortcut: '⌫',
        keywords: ['delete', 'remove', 'selected', 'node'],
        category: 'Edit',
        action: () => {
          if (window.confirm('Delete the selected node?')) {
            removeNode(selectedNodeId);
          }
        },
      });
    }

    // Terminal navigation commands
    const terminalNodes = nodes.filter((n) => n.type === NodeType.TERMINAL);
    if (terminalNodes.length > 0) {
      commands.push({
        id: 'next-terminal',
        title: 'Next Terminal',
        description: 'Focus the next terminal',
        icon: <TerminalIcon />,
        shortcut: '⌘⇧→',
        keywords: ['next', 'terminal', 'cycle', 'focus'],
        category: 'Navigation',
        action: () => {
          const currentIndex = selectedNodeId
            ? terminalNodes.findIndex((t) => t.id === selectedNodeId)
            : -1;
          const nextIndex = (currentIndex + 1) % terminalNodes.length;
          const nextTerminal = terminalNodes[nextIndex];
          if (nextTerminal) {
            setSelectedNode(nextTerminal.id);
          }
        },
      });

      commands.push({
        id: 'prev-terminal',
        title: 'Previous Terminal',
        description: 'Focus the previous terminal',
        icon: <TerminalIcon />,
        shortcut: '⌘⇧←',
        keywords: ['previous', 'terminal', 'cycle', 'focus'],
        category: 'Navigation',
        action: () => {
          const currentIndex = selectedNodeId
            ? terminalNodes.findIndex((t) => t.id === selectedNodeId)
            : 0;
          const prevIndex =
            currentIndex <= 0 ? terminalNodes.length - 1 : currentIndex - 1;
          const prevTerminal = terminalNodes[prevIndex];
          if (prevTerminal) {
            setSelectedNode(prevTerminal.id);
          }
        },
      });

      // Jump to terminal by number (1-9)
      terminalNodes.slice(0, 9).forEach((terminal, index) => {
        commands.push({
          id: `jump-terminal-${index + 1}`,
          title: `Jump to Terminal ${index + 1}`,
          description: terminal.data.label ?? `Terminal ${index + 1}`,
          icon: <TerminalIcon />,
          shortcut: `⌘${index + 1}`,
          keywords: ['jump', 'terminal', String(index + 1), 'focus'],
          category: 'Navigation',
          action: () => setSelectedNode(terminal.id),
        });
      });
    }

    return commands;
  }, [
    addNodeAtViewportCenter,
    updateNodeData,
    clearCanvas,
    nodes,
    setSelectedNode,
    selectedNodeId,
    removeNode,
    theme,
    setTheme,
  ]);
}
