/**
 * Git Toolbar Component
 *
 * View toggle, refresh, and branch selector for GitNode.
 */

'use client';

import { memo } from 'react';
import type { GitViewMode, GitStatus } from '@masterdashboard/shared';

interface GitToolbarProps {
  viewMode: GitViewMode;
  onViewModeChange: (mode: GitViewMode) => void;
  onRefresh: () => void;
  loading: boolean;
  status: GitStatus | null;
}

const viewModes: { id: GitViewMode; label: string; icon: React.ReactNode }[] = [
  {
    id: 'status',
    label: 'Status',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'history',
    label: 'History',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'branches',
    label: 'Branches',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
];

export const GitToolbar = memo(function GitToolbar({
  viewMode,
  onViewModeChange,
  onRefresh,
  loading,
  status,
}: GitToolbarProps) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 bg-slate-800/50 border-b border-slate-700">
      {/* View mode tabs */}
      <div className="flex items-center gap-1">
        {viewModes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onViewModeChange(mode.id)}
            className={`
              flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors
              ${viewMode === mode.id
                ? 'bg-orange-500/20 text-orange-400'
                : 'hover:bg-slate-700 text-slate-400'
              }
            `}
            title={mode.label}
          >
            {mode.icon}
            <span className="hidden sm:inline">{mode.label}</span>
          </button>
        ))}
      </div>

      {/* Right side - branch and refresh */}
      <div className="flex items-center gap-2">
        {/* Current branch */}
        {status?.branch && (
          <div className="flex items-center gap-1 text-xs">
            <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <span className="text-slate-300 font-medium max-w-[100px] truncate">{status.branch}</span>
            {/* Ahead/behind */}
            {(status.ahead > 0 || status.behind > 0) && (
              <span className="flex items-center gap-0.5 text-[10px]">
                {status.ahead > 0 && <span className="text-green-400">{status.ahead}</span>}
                {status.behind > 0 && <span className="text-red-400">{status.behind}</span>}
              </span>
            )}
          </div>
        )}

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className={`
            p-1.5 rounded transition-colors
            ${loading ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}
          `}
          title="Refresh"
        >
          <svg
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  );
});
