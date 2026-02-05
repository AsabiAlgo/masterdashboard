/**
 * Node Palette Component
 *
 * Sidebar panel for creating new nodes - matches Quick Start menu items.
 */

'use client';

import { useState, useCallback } from 'react';
import { NodeType, ShellType, type TerminalNodeData } from '@masterdashboard/shared';
import { Panel } from '@/components/ui/Panel';
import { useCanvasStore } from '@/stores/canvas-store';

interface PaletteItemConfig {
  id: string;
  type: NodeType;
  shell?: ShellType;
  label: string;
  description: string;
  icon: React.ReactNode;
  borderColor: string;
  iconBg: string;
  iconColor: string;
  section?: 'terminals' | 'tools';
}

const TerminalIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const ClaudeIcon = (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

const BrowserIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
    />
  </svg>
);

const SSHIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
    />
  </svg>
);

const GitIcon = (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M21.62 11.108l-8.731-8.729a1.292 1.292 0 0 0-1.823 0L9.257 4.19l2.299 2.3a1.532 1.532 0 0 1 1.939 1.95l2.214 2.217a1.532 1.532 0 0 1 1.583 2.531c-.599.6-1.566.6-2.166 0a1.536 1.536 0 0 1-.337-1.662l-2.074-2.063V14.7a1.534 1.534 0 0 1 .404 2.468 1.534 1.534 0 0 1-2.166 0 1.536 1.536 0 0 1 0-2.164c.135-.135.291-.238.459-.314V9.467a1.525 1.525 0 0 1-.459-.314 1.536 1.536 0 0 1-.336-1.662l-2.27-2.27-5.987 5.982a1.292 1.292 0 0 0 0 1.822l8.731 8.729a1.29 1.29 0 0 0 1.822 0l8.692-8.689a1.292 1.292 0 0 0 .003-1.826z"/>
  </svg>
);

const StickyNoteIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15.5 3H5a2 2 0 00-2 2v14c0 1.1.9 2 2 2h14a2 2 0 002-2V8.5L15.5 3z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 3v6h6"
    />
  </svg>
);

const FolderIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
    />
  </svg>
);

const DatabaseIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <ellipse cx="12" cy="5" rx="9" ry="3" strokeWidth={2} />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"
    />
  </svg>
);

const paletteItems: PaletteItemConfig[] = [
  // Terminals Section
  {
    id: 'bash',
    type: NodeType.TERMINAL,
    shell: ShellType.BASH,
    label: 'Bash Terminal',
    description: 'Standard bash shell',
    icon: TerminalIcon,
    borderColor: 'border-green-500/30 hover:border-green-500/50',
    iconBg: 'bg-green-500/20',
    iconColor: 'text-green-400',
    section: 'terminals',
  },
  {
    id: 'claude',
    type: NodeType.TERMINAL,
    shell: ShellType.CLAUDE_CODE,
    label: 'Claude Code',
    description: 'AI-powered coding',
    icon: ClaudeIcon,
    borderColor: 'border-purple-500/30 hover:border-purple-500/50',
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
    section: 'terminals',
  },
  {
    id: 'claude-auto',
    type: NodeType.TERMINAL,
    shell: ShellType.CLAUDE_CODE_SKIP_PERMISSIONS,
    label: 'Claude Code (Auto)',
    description: 'Skip permission prompts',
    icon: ClaudeIcon,
    borderColor: 'border-orange-500/30 hover:border-orange-500/50',
    iconBg: 'bg-orange-500/20',
    iconColor: 'text-orange-400',
    section: 'terminals',
  },
  {
    id: 'zsh',
    type: NodeType.TERMINAL,
    shell: ShellType.ZSH,
    label: 'Zsh Terminal',
    description: 'Z shell with plugins',
    icon: TerminalIcon,
    borderColor: 'border-blue-500/30 hover:border-blue-500/50',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    section: 'terminals',
  },
  {
    id: 'browser',
    type: NodeType.BROWSER,
    label: 'Browser',
    description: 'Playwright browser',
    icon: BrowserIcon,
    borderColor: 'border-cyan-500/30 hover:border-cyan-500/50',
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-400',
    section: 'terminals',
  },
  {
    id: 'ssh',
    type: NodeType.SSH,
    label: 'SSH Connection',
    description: 'Remote server access',
    icon: SSHIcon,
    borderColor: 'border-amber-500/30 hover:border-amber-500/50',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    section: 'terminals',
  },
  {
    id: 'git',
    type: NodeType.GIT,
    label: 'Git',
    description: 'Version control',
    icon: GitIcon,
    borderColor: 'border-orange-500/30 hover:border-orange-500/50',
    iconBg: 'bg-orange-500/20',
    iconColor: 'text-orange-400',
    section: 'terminals',
  },
  // Tools Section
  {
    id: 'sticky-note',
    type: NodeType.NOTES,
    label: 'Sticky Note',
    description: 'Quick notes with markdown',
    icon: StickyNoteIcon,
    borderColor: 'border-yellow-500/30 hover:border-yellow-500/50',
    iconBg: 'bg-yellow-500/20',
    iconColor: 'text-yellow-400',
    section: 'tools',
  },
  {
    id: 'file-browser',
    type: NodeType.FOLDER,
    label: 'File Browser',
    description: 'Browse and launch files',
    icon: FolderIcon,
    borderColor: 'border-yellow-500/30 hover:border-yellow-500/50',
    iconBg: 'bg-yellow-500/20',
    iconColor: 'text-yellow-400',
    section: 'tools',
  },
  {
    id: 'database',
    type: NodeType.DATABASE,
    label: 'Database',
    description: 'SQL database browser',
    icon: DatabaseIcon,
    borderColor: 'border-emerald-500/30 hover:border-emerald-500/50',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    section: 'tools',
  },
];

export function NodePalette() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { addNodeAtViewportCenter, updateNodeData } = useCanvasStore();

  const handleCreate = useCallback(
    (item: PaletteItemConfig) => {
      // Add node at the center of the current viewport
      const nodeId = addNodeAtViewportCenter(item.type);

      // If it's a terminal with a specific shell, update the shell type
      if (item.type === NodeType.TERMINAL && item.shell) {
        updateNodeData<TerminalNodeData>(nodeId, { shell: item.shell });
      }
    },
    [addNodeAtViewportCenter, updateNodeData]
  );

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
        title="Show node palette"
      >
        <svg
          className="w-5 h-5 text-slate-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </button>
    );
  }

  return (
    <Panel className="w-64">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Add Node
        </h3>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 hover:bg-slate-700 rounded transition-colors"
          title="Collapse palette"
        >
          <svg
            className="w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* Terminals Section */}
      <div className="space-y-2">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
          Terminals
        </p>
        {paletteItems
          .filter((item) => item.section === 'terminals')
          .map((item) => (
            <button
              key={item.id}
              onClick={() => handleCreate(item)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm rounded-md
                bg-slate-800 hover:bg-slate-700 border ${item.borderColor}
                transition-colors group
              `}
            >
              <div className={`w-8 h-8 flex items-center justify-center rounded ${item.iconBg} ${item.iconColor}`}>
                {item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-slate-200 group-hover:text-white font-medium truncate">
                  {item.label}
                </div>
                <div className="text-xs text-slate-500 truncate">{item.description}</div>
              </div>
            </button>
          ))}
      </div>

      {/* Tools Section */}
      <div className="space-y-2 mt-4">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
          Tools
        </p>
        {paletteItems
          .filter((item) => item.section === 'tools')
          .map((item) => (
            <button
              key={item.id}
              onClick={() => handleCreate(item)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm rounded-md
                bg-slate-800 hover:bg-slate-700 border ${item.borderColor}
                transition-colors group
              `}
            >
              <div className={`w-8 h-8 flex items-center justify-center rounded ${item.iconBg} ${item.iconColor}`}>
                {item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-slate-200 group-hover:text-white font-medium truncate">
                  {item.label}
                </div>
                <div className="text-xs text-slate-500 truncate">{item.description}</div>
              </div>
            </button>
          ))}
      </div>

      {/* Help Text */}
      <p className="mt-3 text-xs text-slate-500 text-center">
        Click to add to canvas
      </p>
    </Panel>
  );
}
