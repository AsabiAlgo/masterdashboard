/**
 * Status View Component
 *
 * Displays the git status with staged, modified, and untracked files.
 */

'use client';

import { memo, useMemo } from 'react';
import { type GitStatus, type GitFileEntry } from '@masterdashboard/shared';
import { FileEntry } from './FileEntry';

interface StatusViewProps {
  status: GitStatus | null;
  selectedFiles: string[];
  loading: boolean;
  onSelectFile: (path: string) => void;
  onStage: (files: string[]) => void;
  onUnstage: (files: string[]) => void;
  onDiscard: (files: string[]) => void;
}

function SectionHeader({
  title,
  count,
  color,
  onAction,
  actionLabel,
}: {
  title: string;
  count: number;
  color: string;
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className={`flex items-center justify-between px-2 py-1.5 text-xs font-medium ${color} bg-slate-800/50`}>
      <span>
        {title} ({count})
      </span>
      {onAction && actionLabel && count > 0 && (
        <button
          onClick={onAction}
          className="text-[10px] px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 rounded"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export const StatusView = memo(function StatusView({
  status,
  selectedFiles,
  loading,
  onSelectFile,
  onStage,
  onUnstage,
  onDiscard,
}: StatusViewProps) {
  // Group files by status
  const { staged, unstaged, untracked } = useMemo(() => {
    if (!status) {
      return { staged: [], unstaged: [], untracked: [] };
    }

    const staged: GitFileEntry[] = [];
    const unstaged: GitFileEntry[] = [];
    const untracked: GitFileEntry[] = [];

    for (const file of status.files) {
      if (file.isStaged) {
        staged.push(file);
      } else if (file.isUntracked) {
        untracked.push(file);
      } else if (file.isUnstaged) {
        unstaged.push(file);
      }
    }

    return { staged, unstaged, untracked };
  }, [status]);

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400 text-sm">Loading status...</div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400 text-sm">No status data</div>
      </div>
    );
  }

  const hasChanges = staged.length > 0 || unstaged.length > 0 || untracked.length > 0;

  if (!hasChanges) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-sm">Working tree clean</span>
      </div>
    );
  }

  const selectedSet = new Set(selectedFiles);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {/* Staged Changes */}
        {staged.length > 0 && (
          <div>
            <SectionHeader
              title="Staged Changes"
              count={staged.length}
              color="text-green-400"
              onAction={() => onUnstage(staged.map(f => f.path))}
              actionLabel="Unstage All"
            />
            {staged.map((file) => (
              <FileEntry
                key={`staged-${file.path}`}
                file={file}
                selected={selectedSet.has(file.path)}
                onSelect={onSelectFile}
                onStage={(path) => onStage([path])}
                onUnstage={(path) => onUnstage([path])}
                onDiscard={(path) => onDiscard([path])}
              />
            ))}
          </div>
        )}

        {/* Changes (not staged) */}
        {unstaged.length > 0 && (
          <div>
            <SectionHeader
              title="Changes"
              count={unstaged.length}
              color="text-yellow-400"
              onAction={() => onStage(unstaged.map(f => f.path))}
              actionLabel="Stage All"
            />
            {unstaged.map((file) => (
              <FileEntry
                key={`unstaged-${file.path}`}
                file={file}
                selected={selectedSet.has(file.path)}
                onSelect={onSelectFile}
                onStage={(path) => onStage([path])}
                onUnstage={(path) => onUnstage([path])}
                onDiscard={(path) => onDiscard([path])}
              />
            ))}
          </div>
        )}

        {/* Untracked Files */}
        {untracked.length > 0 && (
          <div>
            <SectionHeader
              title="Untracked Files"
              count={untracked.length}
              color="text-slate-400"
              onAction={() => onStage(untracked.map(f => f.path))}
              actionLabel="Stage All"
            />
            {untracked.map((file) => (
              <FileEntry
                key={`untracked-${file.path}`}
                file={file}
                selected={selectedSet.has(file.path)}
                onSelect={onSelectFile}
                onStage={(path) => onStage([path])}
                onUnstage={(path) => onUnstage([path])}
                onDiscard={(path) => onDiscard([path])}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default StatusView;
