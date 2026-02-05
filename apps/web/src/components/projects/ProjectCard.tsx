/**
 * Project Card
 *
 * Clickable card displaying project info with terminal counts.
 */

'use client';

import Link from 'next/link';

interface SessionCount {
  total: number;
  active: number;
  paused: number;
}

interface ProjectCardProps {
  /** Project ID */
  id: string;
  /** Project name */
  name: string;
  /** Default working directory */
  defaultCwd: string;
  /** Session counts */
  sessionCount: SessionCount;
  /** Last updated timestamp */
  updatedAt: string;
}

export function ProjectCard({
  id,
  name,
  defaultCwd,
  sessionCount,
  updatedAt,
}: ProjectCardProps) {
  const hasWaiting = sessionCount.paused > 0;
  const hasActive = sessionCount.active > 0;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Link
      href={`/projects/${id}`}
      className="block group"
    >
      <div
        className={`
          p-4 rounded-lg border transition-all
          bg-slate-900/80 hover:bg-slate-800/80
          ${hasWaiting ? 'border-yellow-500/50' : 'border-slate-700 hover:border-slate-600'}
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-base font-medium text-slate-100 group-hover:text-white truncate">
            {name}
          </h3>
          {hasWaiting && (
            <span className="flex-shrink-0 ml-2 px-1.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
              {sessionCount.paused} waiting
            </span>
          )}
        </div>

        {/* Working Directory */}
        <div className="flex items-center gap-1.5 text-sm text-slate-400 mb-3 truncate">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          <span className="truncate">{defaultCwd}</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            {/* Terminal count */}
            <span className="flex items-center gap-1">
              <span
                className={`w-2 h-2 rounded-full ${hasActive ? 'bg-green-500' : 'bg-slate-600'}`}
              />
              {sessionCount.active} terminal{sessionCount.active !== 1 ? 's' : ''}
            </span>
          </div>

          <span>{formatDate(updatedAt)}</span>
        </div>
      </div>
    </Link>
  );
}
