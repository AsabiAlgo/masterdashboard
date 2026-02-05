/**
 * Commit Entry Component
 *
 * Displays a single commit in the history view.
 */

'use client';

import { memo } from 'react';
import { type GitCommit } from '@masterdashboard/shared';

interface CommitEntryProps {
  commit: GitCommit;
  selected: boolean;
  onSelect: (hash: string) => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins <= 1 ? 'just now' : `${diffMins} mins ago`;
    }
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const CommitEntry = memo(function CommitEntry({
  commit,
  selected,
  onSelect,
}: CommitEntryProps) {
  const hasRefs = commit.refs.length > 0;

  return (
    <div
      className={`
        px-2 py-2 cursor-pointer border-b border-slate-700/50
        ${selected ? 'bg-orange-500/20' : 'hover:bg-slate-700/50'}
      `}
      onClick={() => onSelect(commit.hash)}
    >
      {/* Hash and refs */}
      <div className="flex items-center gap-2 mb-1">
        <span className="font-mono text-xs text-orange-400">{commit.hashShort}</span>
        {hasRefs && (
          <div className="flex items-center gap-1">
            {commit.refs.slice(0, 3).map((ref) => (
              <span
                key={ref}
                className={`
                  text-[10px] px-1.5 py-0.5 rounded
                  ${ref.startsWith('HEAD')
                    ? 'bg-purple-500/30 text-purple-300'
                    : ref.includes('origin/')
                      ? 'bg-blue-500/30 text-blue-300'
                      : 'bg-green-500/30 text-green-300'
                  }
                `}
              >
                {ref}
              </span>
            ))}
            {commit.refs.length > 3 && (
              <span className="text-[10px] text-slate-500">+{commit.refs.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Message */}
      <div className="text-xs text-slate-200 truncate mb-1">
        {commit.message}
      </div>

      {/* Author and date */}
      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span>{commit.author}</span>
        <span>{formatDate(commit.date)}</span>
      </div>
    </div>
  );
});
