/**
 * Push/Pull Controls Component
 *
 * Push and pull buttons with ahead/behind counts.
 */

'use client';

import { memo } from 'react';
import type { GitStatus } from '@masterdashboard/shared';

interface PushPullControlsProps {
  status: GitStatus | null;
  loading: boolean;
  onPush: () => void;
  onPull: () => void;
}

export const PushPullControls = memo(function PushPullControls({
  status,
  loading,
  onPush,
  onPull,
}: PushPullControlsProps) {
  const ahead = status?.ahead ?? 0;
  const behind = status?.behind ?? 0;
  const hasTracking = !!status?.tracking;

  if (!hasTracking) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 border-t border-slate-700 bg-slate-800/30">
      {/* Pull button */}
      <button
        onClick={onPull}
        disabled={loading || behind === 0}
        className={`
          flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded transition-colors
          ${loading || behind === 0
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
          }
        `}
        title={behind > 0 ? `Pull ${behind} commit(s) from remote` : 'Up to date'}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
        Pull
        {behind > 0 && (
          <span className="px-1 py-0.5 bg-blue-500/30 rounded text-[10px]">{behind}</span>
        )}
      </button>

      {/* Push button */}
      <button
        onClick={onPush}
        disabled={loading || ahead === 0}
        className={`
          flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded transition-colors
          ${loading || ahead === 0
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
          }
        `}
        title={ahead > 0 ? `Push ${ahead} commit(s) to remote` : 'Nothing to push'}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
        Push
        {ahead > 0 && (
          <span className="px-1 py-0.5 bg-green-500/30 rounded text-[10px]">{ahead}</span>
        )}
      </button>
    </div>
  );
});
