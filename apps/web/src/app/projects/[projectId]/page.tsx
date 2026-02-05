/**
 * Project Workspace Page
 *
 * Dynamic route for project workspace with header, quick start sidebar, and canvas.
 */

'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Canvas } from '@/components/canvas';
import { ProjectHeader, QuickStart } from '@/components/projects';
import { CommandPalette } from '@/components/command-palette';
import { useWebSocket, useKeyboardShortcuts } from '@/hooks';
import { useProjectStore, useCurrentProject, useProjectLoading } from '@/stores/project-store';
import { useCanvasStore, useConnectionStatus } from '@/stores/canvas-store';
import { NodeType } from '@masterdashboard/shared';

export default function ProjectWorkspace() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const { setCurrentProject, error } = useProjectStore();
  const currentProject = useCurrentProject();
  const isLoading = useProjectLoading();
  const connectionStatus = useConnectionStatus();
  const { nodes, setProjectId } = useCanvasStore();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    enabled: !!currentProject,
  });

  // Connect to WebSocket
  useWebSocket({
    autoConnect: true,
    onConnect: () => {
      // WebSocket connected
    },
    onDisconnect: () => {
      // WebSocket disconnected
    },
    onError: () => {
      // WebSocket error
    },
  });

  // Load project on mount
  useEffect(() => {
    if (projectId) {
      setCurrentProject(projectId);
    }
  }, [projectId, setCurrentProject]);

  // Set project ID in canvas store
  useEffect(() => {
    if (projectId && setProjectId) {
      setProjectId(projectId);
    }
  }, [projectId, setProjectId]);

  // Redirect if project not found
  useEffect(() => {
    if (error && !isLoading) {
      router.push('/');
    }
  }, [error, isLoading, router]);

  // Loading state
  if (isLoading && !currentProject) {
    return (
      <main className="h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">Loading project...</p>
        </div>
      </main>
    );
  }

  // No project found
  if (!currentProject) {
    return (
      <main className="h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Project not found</p>
          <button
            onClick={() => router.push('/')}
            className="text-blue-400 hover:text-blue-300"
          >
            Return to projects
          </button>
        </div>
      </main>
    );
  }

  // Count nodes
  const terminalCount = nodes.filter((n) => n.type === NodeType.TERMINAL).length;

  return (
    <main className="h-screen flex flex-col overflow-hidden">
      {/* Project Header */}
      <ProjectHeader
        projectId={currentProject.id}
        name={currentProject.name}
        defaultCwd={currentProject.defaultCwd}
        terminalCount={terminalCount}
      />

      {/* Main content */}
      <div className="flex-1 min-h-0 flex">
        {/* QuickStart Sidebar */}
        <QuickStart defaultCwd={currentProject.defaultCwd} projectId={currentProject.id} />

        {/* Canvas */}
        <div className="flex-1 min-w-0">
          <Canvas />
        </div>
      </div>

      {/* Footer Status */}
      <footer className="flex items-center justify-between px-4 py-1.5 text-xs text-slate-500 border-t border-slate-800 bg-slate-900 flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-green-500'
                  : connectionStatus === 'connecting'
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-red-500'
              }`}
            />
            {connectionStatus === 'connected'
              ? 'Connected'
              : connectionStatus === 'connecting'
                ? 'Connecting...'
                : 'Disconnected'}
          </span>
          <span>
            {nodes.length} node{nodes.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-slate-600">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono text-[10px]">⌘K</kbd>
            {' '}Commands
            <span className="mx-2">·</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono text-[10px]">⌘P</kbd>
            {' '}Files
            <span className="mx-2">·</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono text-[10px]">⇧⌘←→</kbd>
            {' '}Cycle
            <span className="mx-2">·</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono text-[10px]">Esc</kbd>
            {' '}Deselect
          </span>
        </div>
      </footer>

      {/* Command Palette */}
      <CommandPalette />
    </main>
  );
}
