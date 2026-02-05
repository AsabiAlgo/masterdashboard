/**
 * Commit Panel Component
 *
 * Message input and commit button for staged changes.
 */

'use client';

import { memo, useState, useCallback } from 'react';
import type { GitStatus } from '@masterdashboard/shared';

interface CommitPanelProps {
  status: GitStatus | null;
  loading: boolean;
  onCommit: (message: string) => void;
}

export const CommitPanel = memo(function CommitPanel({
  status,
  loading,
  onCommit,
}: CommitPanelProps) {
  const [message, setMessage] = useState('');

  const handleCommit = useCallback(() => {
    if (message.trim() && status?.hasStaged) {
      onCommit(message.trim());
      setMessage('');
    }
  }, [message, status?.hasStaged, onCommit]);

  const canCommit = message.trim().length > 0 && status?.hasStaged && !loading;
  const stagedCount = status?.files.filter(f => f.isStaged).length ?? 0;

  return (
    <div className="px-2 py-2 border-t border-slate-700 bg-slate-800/30">
      {/* Commit message input */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={status?.hasStaged ? 'Commit message...' : 'No staged changes'}
        disabled={!status?.hasStaged || loading}
        className={`
          w-full h-16 px-2 py-1.5 text-xs bg-slate-700 border border-slate-600 rounded resize-none
          focus:outline-none focus:border-orange-500 placeholder-slate-500
          ${!status?.hasStaged ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            handleCommit();
          }
        }}
      />

      {/* Commit button and info */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-slate-500">
          {stagedCount > 0 ? `${stagedCount} file(s) staged` : 'No staged changes'}
        </span>
        <button
          onClick={handleCommit}
          disabled={!canCommit}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 text-xs rounded font-medium transition-colors
            ${canCommit
              ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }
          `}
          title="Commit (Ctrl+Enter)"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Commit
        </button>
      </div>
    </div>
  );
});
