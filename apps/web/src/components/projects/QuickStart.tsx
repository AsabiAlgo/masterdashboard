/**
 * QuickStart Sidebar
 *
 * Sidebar panel with tabs for launching terminals and browsing files.
 */

'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/Input';
import { useCanvasStore } from '@/stores/canvas-store';
import { NodeType, ShellType } from '@masterdashboard/shared';
import { SessionStats } from './SessionStats';
import { SidebarFileBrowser } from './SidebarFileBrowser';

interface QuickStartProps {
  /** Default working directory */
  defaultCwd: string;
  /** Project ID for session stats */
  projectId?: string;
}

type TabType = 'launch' | 'browse';

export function QuickStart({ defaultCwd, projectId }: QuickStartProps) {
  const [cwd, setCwd] = useState(defaultCwd);
  const [activeTab, setActiveTab] = useState<TabType>('browse');
  const { addNode, updateNodeData } = useCanvasStore();

  const createTerminal = useCallback(
    (shell: ShellType) => {
      const nodeId = addNode(NodeType.TERMINAL, { x: 100, y: 100 });
      updateNodeData(nodeId, { shell, cwd });
    },
    [addNode, updateNodeData, cwd]
  );

  const createSSH = useCallback(() => {
    addNode(NodeType.SSH, { x: 100, y: 100 });
  }, [addNode]);

  const createNote = useCallback(() => {
    addNode(NodeType.NOTES, { x: 100, y: 100 });
  }, [addNode]);

  const createFolderViewer = useCallback(() => {
    addNode(NodeType.FOLDER, { x: 100, y: 100 });
  }, [addNode]);

  const createDatabase = useCallback(() => {
    addNode(NodeType.DATABASE, { x: 100, y: 100 });
  }, [addNode]);

  return (
    <div className="w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800">
        <h2 className="text-sm font-semibold text-slate-200">Quick Start</h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('browse')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'browse'
              ? 'text-white bg-slate-800 border-b-2 border-blue-500'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Browse
          </span>
        </button>
        <button
          onClick={() => setActiveTab('launch')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'launch'
              ? 'text-white bg-slate-800 border-b-2 border-blue-500'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Launch
          </span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'launch' ? (
        <>
          {/* Working Directory */}
          <div className="px-4 py-3 border-b border-slate-800">
            <Input
              label="Working Directory"
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              placeholder="~/projects"
              leftElement={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
              }
            />
          </div>

          {/* Launch Buttons */}
          <div className="px-4 py-3 space-y-2 overflow-y-auto flex-1">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
              Launch Terminal
            </p>

            {/* Bash Terminal */}
            <button
              onClick={() => createTerminal(ShellType.BASH)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm rounded-md
                bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600
                transition-colors group"
            >
              <div className="w-8 h-8 flex items-center justify-center rounded bg-green-500/20 text-green-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <div className="text-slate-200 group-hover:text-white font-medium">
                  Bash Terminal
                </div>
                <div className="text-xs text-slate-500">Standard bash shell</div>
              </div>
            </button>

            {/* Claude Code */}
            <button
              onClick={() => createTerminal(ShellType.CLAUDE_CODE)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm rounded-md
                bg-slate-800 hover:bg-slate-700 border border-purple-500/30 hover:border-purple-500/50
                transition-colors group"
            >
              <div className="w-8 h-8 flex items-center justify-center rounded bg-purple-500/20 text-purple-400">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <div className="text-slate-200 group-hover:text-white font-medium">
                  Claude Code
                </div>
                <div className="text-xs text-slate-500">AI-powered coding</div>
              </div>
            </button>

            {/* Claude Code (Skip Permissions) */}
            <button
              onClick={() => createTerminal(ShellType.CLAUDE_CODE_SKIP_PERMISSIONS)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm rounded-md
                bg-slate-800 hover:bg-slate-700 border border-orange-500/30 hover:border-orange-500/50
                transition-colors group"
            >
              <div className="w-8 h-8 flex items-center justify-center rounded bg-orange-500/20 text-orange-400">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <div className="text-slate-200 group-hover:text-white font-medium">
                  Claude Code (Auto)
                </div>
                <div className="text-xs text-slate-500">Skip permission prompts</div>
              </div>
            </button>

            {/* Zsh Terminal */}
            <button
              onClick={() => createTerminal(ShellType.ZSH)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm rounded-md
                bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600
                transition-colors group"
            >
              <div className="w-8 h-8 flex items-center justify-center rounded bg-blue-500/20 text-blue-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <div className="text-slate-200 group-hover:text-white font-medium">
                  Zsh Terminal
                </div>
                <div className="text-xs text-slate-500">Z shell with plugins</div>
              </div>
            </button>

            {/* SSH Connection */}
            <button
              onClick={createSSH}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm rounded-md
                bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600
                transition-colors group"
            >
              <div className="w-8 h-8 flex items-center justify-center rounded bg-amber-500/20 text-amber-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
              </div>
              <div>
                <div className="text-slate-200 group-hover:text-white font-medium">
                  SSH Connection
                </div>
                <div className="text-xs text-slate-500">Remote server access</div>
              </div>
            </button>

            {/* Tools Section */}
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 mt-4">
              Tools
            </p>

            {/* Sticky Note */}
            <button
              onClick={createNote}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm rounded-md
                bg-slate-800 hover:bg-slate-700 border border-yellow-500/30 hover:border-yellow-500/50
                transition-colors group"
            >
              <div className="w-8 h-8 flex items-center justify-center rounded bg-yellow-500/20 text-yellow-400">
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
              </div>
              <div>
                <div className="text-slate-200 group-hover:text-white font-medium">
                  Sticky Note
                </div>
                <div className="text-xs text-slate-500">Quick notes with markdown</div>
              </div>
            </button>

            {/* Folder Viewer */}
            <button
              onClick={createFolderViewer}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm rounded-md
                bg-slate-800 hover:bg-slate-700 border border-yellow-500/30 hover:border-yellow-500/50
                transition-colors group"
            >
              <div className="w-8 h-8 flex items-center justify-center rounded bg-yellow-500/20 text-yellow-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
              </div>
              <div>
                <div className="text-slate-200 group-hover:text-white font-medium">
                  File Browser
                </div>
                <div className="text-xs text-slate-500">Browse and launch files</div>
              </div>
            </button>

            {/* Database */}
            <button
              onClick={createDatabase}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm rounded-md
                bg-slate-800 hover:bg-slate-700 border border-emerald-500/30 hover:border-emerald-500/50
                transition-colors group"
            >
              <div className="w-8 h-8 flex items-center justify-center rounded bg-emerald-500/20 text-emerald-400">
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
              </div>
              <div>
                <div className="text-slate-200 group-hover:text-white font-medium">
                  Database
                </div>
                <div className="text-xs text-slate-500">SQL database browser</div>
              </div>
            </button>
          </div>
        </>
      ) : (
        /* Browse Tab - File Browser */
        <div className="flex-1 overflow-hidden">
          <SidebarFileBrowser
            rootPath={cwd}
            projectId={projectId ?? 'default'}
          />
        </div>
      )}

      {/* Session Stats */}
      {projectId && activeTab === 'launch' && (
        <div className="border-t border-slate-800">
          <SessionStats projectId={projectId} />
        </div>
      )}

      {/* Help text */}
      {activeTab === 'launch' && (
        <div className="px-4 py-3 border-t border-slate-800">
          <p className="text-xs text-slate-500">
            Or drag nodes from the palette onto the canvas.
          </p>
        </div>
      )}
    </div>
  );
}
