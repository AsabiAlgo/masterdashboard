/**
 * File Entry Component
 *
 * Displays a single file in the git status view with stage/unstage/discard buttons.
 */

'use client';

import { memo } from 'react';
import { GitFileStatus, type GitFileEntry } from '@masterdashboard/shared';

interface FileEntryProps {
  file: GitFileEntry;
  selected: boolean;
  onSelect: (path: string) => void;
  onStage: (path: string) => void;
  onUnstage: (path: string) => void;
  onDiscard: (path: string) => void;
}

function getStatusColor(status: GitFileStatus): string {
  switch (status) {
    case GitFileStatus.ADDED:
      return 'text-green-400';
    case GitFileStatus.MODIFIED:
      return 'text-yellow-400';
    case GitFileStatus.DELETED:
      return 'text-red-400';
    case GitFileStatus.RENAMED:
    case GitFileStatus.COPIED:
      return 'text-blue-400';
    case GitFileStatus.UNTRACKED:
      return 'text-gray-400';
    case GitFileStatus.UNMERGED:
      return 'text-orange-400';
    default:
      return 'text-slate-400';
  }
}

function getStatusIcon(file: GitFileEntry): string {
  if (file.hasConflict) return '!';
  if (file.isStaged) {
    if (file.indexStatus === GitFileStatus.ADDED) return 'A';
    if (file.indexStatus === GitFileStatus.DELETED) return 'D';
    if (file.indexStatus === GitFileStatus.RENAMED) return 'R';
    return 'M';
  }
  if (file.isUntracked) return '?';
  if (file.workingStatus === GitFileStatus.DELETED) return 'D';
  return 'M';
}

export const FileEntry = memo(function FileEntry({
  file,
  selected,
  onSelect,
  onStage,
  onUnstage,
  onDiscard,
}: FileEntryProps) {
  const statusColor = file.isStaged
    ? getStatusColor(file.indexStatus)
    : getStatusColor(file.workingStatus);

  const statusIcon = getStatusIcon(file);
  const fileName = file.path.split('/').pop() ?? file.path;
  const dirPath = file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : '';

  return (
    <div
      className={`
        group flex items-center gap-2 px-2 py-1 text-xs cursor-pointer
        ${selected ? 'bg-orange-500/20' : 'hover:bg-slate-700/50'}
      `}
      onClick={() => onSelect(file.path)}
    >
      {/* Status indicator */}
      <span className={`w-4 text-center font-mono ${statusColor}`}>
        {statusIcon}
      </span>

      {/* File name */}
      <div className="flex-1 min-w-0 flex items-center gap-1">
        <span className="truncate text-slate-200">{fileName}</span>
        {dirPath && (
          <span className="text-slate-500 truncate text-[10px]">{dirPath}</span>
        )}
      </div>

      {/* Action buttons - shown on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {file.isStaged ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUnstage(file.path);
            }}
            className="p-1 hover:bg-slate-600 rounded text-yellow-400"
            title="Unstage file"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
        ) : (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStage(file.path);
              }}
              className="p-1 hover:bg-slate-600 rounded text-green-400"
              title="Stage file"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            {!file.isUntracked && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDiscard(file.path);
                }}
                className="p-1 hover:bg-slate-600 rounded text-red-400"
                title="Discard changes"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
});
