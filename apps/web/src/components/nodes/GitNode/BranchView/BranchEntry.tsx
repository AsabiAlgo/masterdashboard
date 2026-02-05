/**
 * Branch Entry Component
 *
 * Displays a single branch with checkout button.
 */

'use client';

import { memo } from 'react';
import { type GitBranch } from '@masterdashboard/shared';

interface BranchEntryProps {
  branch: GitBranch;
  onCheckout: (branch: string) => void;
}

export const BranchEntry = memo(function BranchEntry({
  branch,
  onCheckout,
}: BranchEntryProps) {
  const isRemote = branch.isRemote;
  const displayName = isRemote
    ? branch.name.replace('remotes/', '').replace('origin/', '')
    : branch.name;

  return (
    <div
      className={`
        group flex items-center gap-2 px-2 py-1.5 text-xs
        ${branch.current ? 'bg-orange-500/10' : 'hover:bg-slate-700/50'}
      `}
    >
      {/* Current branch indicator */}
      <span className={`w-4 text-center ${branch.current ? 'text-orange-400' : 'text-transparent'}`}>
        {branch.current ? '*' : ''}
      </span>

      {/* Branch icon */}
      <svg
        className={`w-3.5 h-3.5 ${isRemote ? 'text-blue-400' : 'text-green-400'}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
        />
      </svg>

      {/* Branch name */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className={`truncate ${branch.current ? 'text-orange-300 font-medium' : 'text-slate-200'}`}>
          {displayName}
        </span>
        {isRemote && (
          <span className="text-[10px] px-1 py-0.5 bg-blue-500/20 text-blue-300 rounded">
            remote
          </span>
        )}
      </div>

      {/* Ahead/behind indicator */}
      {(branch.ahead !== undefined || branch.behind !== undefined) && (
        <div className="flex items-center gap-1 text-[10px]">
          {branch.ahead !== undefined && branch.ahead > 0 && (
            <span className="text-green-400">+{branch.ahead}</span>
          )}
          {branch.behind !== undefined && branch.behind > 0 && (
            <span className="text-red-400">-{branch.behind}</span>
          )}
        </div>
      )}

      {/* Checkout button */}
      {!branch.current && !isRemote && (
        <button
          onClick={() => onCheckout(branch.name)}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-slate-200 transition-opacity"
          title="Checkout branch"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </button>
      )}
    </div>
  );
});
