/**
 * Diff Toolbar Component
 *
 * Toolbar with view mode toggle, file names, and actions.
 */

'use client';

import { memo } from 'react';
import type { DiffViewMode } from '@masterdashboard/shared';
import type { DiffStats } from '@/utils/diff';

interface DiffToolbarProps {
  /** Left file name */
  leftFileName: string;
  /** Right file name */
  rightFileName: string;
  /** Current view mode */
  viewMode: DiffViewMode;
  /** Diff statistics */
  stats?: DiffStats | null;
  /** Whether loading */
  loading: boolean;
  /** View mode change handler */
  onViewModeChange: (mode: DiffViewMode) => void;
  /** Swap files handler */
  onSwapFiles: () => void;
  /** Reload handler */
  onReload: () => void;
}

// Icons
function SplitIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
      />
    </svg>
  );
}

function UnifiedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  );
}

function SwapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
      />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

export const DiffToolbar = memo(function DiffToolbar({
  leftFileName,
  rightFileName,
  viewMode,
  stats,
  loading,
  onViewModeChange,
  onSwapFiles,
  onReload,
}: DiffToolbarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
      {/* File names */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span
          className="text-xs text-slate-400 truncate max-w-[200px]"
          title={leftFileName}
          data-testid="left-filename"
        >
          {leftFileName || 'No file selected'}
        </span>
        <button
          onClick={onSwapFiles}
          className="p-1 hover:bg-slate-700 rounded transition-colors flex-shrink-0"
          title="Swap files"
          data-testid="swap-files-button"
        >
          <SwapIcon className="w-3.5 h-3.5 text-slate-400" />
        </button>
        <span
          className="text-xs text-slate-400 truncate max-w-[200px]"
          title={rightFileName}
          data-testid="right-filename"
        >
          {rightFileName || 'No file selected'}
        </span>
      </div>

      {/* Stats */}
      {stats && (
        <div className="flex items-center gap-2 mx-4" data-testid="diff-stats">
          <span className="text-xs text-green-400">+{stats.additions}</span>
          <span className="text-xs text-red-400">-{stats.deletions}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* View mode toggle */}
        <div className="flex items-center rounded overflow-hidden border border-slate-600">
          <button
            onClick={() => onViewModeChange('split')}
            className={`p-1.5 transition-colors ${
              viewMode === 'split'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
            title="Split view"
            data-testid="view-mode-split"
          >
            <SplitIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onViewModeChange('unified')}
            className={`p-1.5 transition-colors ${
              viewMode === 'unified'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
            title="Unified view"
            data-testid="view-mode-unified"
          >
            <UnifiedIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Reload */}
        <button
          onClick={onReload}
          disabled={loading}
          className={`p-1.5 rounded transition-colors ${
            loading
              ? 'text-slate-600 cursor-not-allowed'
              : 'hover:bg-slate-700 text-slate-400'
          }`}
          title="Reload files"
        >
          <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
});
