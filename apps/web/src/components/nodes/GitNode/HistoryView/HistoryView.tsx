/**
 * History View Component
 *
 * Displays the commit history.
 */

'use client';

import { memo, useState, useCallback } from 'react';
import { type GitCommit } from '@masterdashboard/shared';
import { CommitEntry } from './CommitEntry';

interface HistoryViewProps {
  commits: GitCommit[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export const HistoryView = memo(function HistoryView({
  commits,
  loading,
  hasMore,
  onLoadMore,
}: HistoryViewProps) {
  const [selectedHash, setSelectedHash] = useState<string | null>(null);

  const handleSelect = useCallback((hash: string) => {
    setSelectedHash((prev) => (prev === hash ? null : hash));
  }, []);

  if (loading && commits.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400 text-sm">Loading history...</div>
      </div>
    );
  }

  if (commits.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400 text-sm">No commits found</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {commits.map((commit) => (
          <CommitEntry
            key={commit.hash}
            commit={commit}
            selected={selectedHash === commit.hash}
            onSelect={handleSelect}
          />
        ))}

        {hasMore && (
          <div className="p-2">
            <button
              onClick={onLoadMore}
              disabled={loading}
              className={`
                w-full py-2 text-xs rounded
                ${loading
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }
              `}
            >
              {loading ? 'Loading...' : 'Load more commits'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default HistoryView;
