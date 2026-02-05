/**
 * Project Header
 *
 * Header component for project workspace with navigation and actions.
 */

'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { SettingsPanel } from '@/components/settings';
import { useProjectStore } from '@/stores/project-store';
import {
  useIsSettingsPanelOpen,
  useOpenSettingsPanel,
  useCloseSettingsPanel,
} from '@/stores/settings-store';

interface ProjectHeaderProps {
  /** Project ID */
  projectId: string;
  /** Project name */
  name: string;
  /** Default working directory */
  defaultCwd: string;
  /** Number of active terminals */
  terminalCount: number;
}

export function ProjectHeader({
  projectId,
  name,
  defaultCwd,
  terminalCount,
}: ProjectHeaderProps) {
  const router = useRouter();
  const { deleteProject, killAllTerminals, isLoading } = useProjectStore();
  const isSettingsOpen = useIsSettingsPanelOpen();
  const openSettings = useOpenSettingsPanel();
  const closeSettings = useCloseSettingsPanel();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [isKilling, setIsKilling] = useState(false);

  const handleDelete = useCallback(async () => {
    const success = await deleteProject(projectId);
    if (success) {
      router.push('/');
    }
  }, [projectId, deleteProject, router]);

  const handleKillAll = useCallback(async () => {
    setIsKilling(true);
    await killAllTerminals(projectId);
    setIsKilling(false);
  }, [projectId, killAllTerminals]);

  return (
    <>
      <header className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Back button */}
          <Link
            href="/"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            aria-label="Back to projects"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>

          {/* Project info */}
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-slate-100">{name}</h1>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              <span className="truncate max-w-[200px]">{defaultCwd}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Terminal count */}
          <span className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 px-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            {terminalCount} terminal{terminalCount !== 1 ? 's' : ''}
          </span>

          {/* Kill All Terminals */}
          {terminalCount > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleKillAll}
              loading={isKilling}
              disabled={isKilling}
            >
              Kill All
            </Button>
          )}

          {/* Actions Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="px-2"
              aria-label="Project actions"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </Button>

            {showActionsMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowActionsMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-48 py-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-20">
                  <button
                    className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    onClick={() => {
                      setShowActionsMenu(false);
                      openSettings();
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Settings
                    </span>
                  </button>
                  <div className="border-t border-slate-700 my-1" />
                  <button
                    className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-slate-700 hover:text-red-300 transition-colors"
                    onClick={() => {
                      setShowActionsMenu(false);
                      setShowDeleteDialog(true);
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Delete Project
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="Delete Project"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={isLoading}
              disabled={isLoading}
            >
              Delete Project
            </Button>
          </>
        }
      >
        <p className="text-slate-300">
          Are you sure you want to delete <strong className="text-slate-100">{name}</strong>?
        </p>
        <p className="mt-2 text-sm text-slate-400">
          This will terminate all {terminalCount} terminal{terminalCount !== 1 ? 's' : ''} and
          permanently delete the project. This action cannot be undone.
        </p>
      </Dialog>

      {/* Settings Panel */}
      <SettingsPanel isOpen={isSettingsOpen} onClose={closeSettings} />
    </>
  );
}
