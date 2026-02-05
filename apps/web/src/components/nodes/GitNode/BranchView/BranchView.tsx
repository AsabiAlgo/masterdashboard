/**
 * Branch View Component
 *
 * Displays the list of branches.
 */

'use client';

import { memo, useMemo, useState, useCallback } from 'react';
import { type GitBranch } from '@masterdashboard/shared';
import { BranchEntry } from './BranchEntry';

interface BranchViewProps {
  branches: GitBranch[];
  loading: boolean;
  includeRemote: boolean;
  onToggleRemote: () => void;
  onCheckout: (branch: string) => void;
  onCreateBranch: (name: string) => void;
}

export const BranchView = memo(function BranchView({
  branches,
  loading,
  includeRemote,
  onToggleRemote,
  onCheckout,
  onCreateBranch,
}: BranchViewProps) {
  const [newBranchName, setNewBranchName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Separate local and remote branches
  const { localBranches, remoteBranches } = useMemo(() => {
    const local: GitBranch[] = [];
    const remote: GitBranch[] = [];

    for (const branch of branches) {
      if (branch.isRemote) {
        remote.push(branch);
      } else {
        local.push(branch);
      }
    }

    // Sort: current branch first, then alphabetically
    local.sort((a, b) => {
      if (a.current) return -1;
      if (b.current) return 1;
      return a.name.localeCompare(b.name);
    });

    remote.sort((a, b) => a.name.localeCompare(b.name));

    return { localBranches: local, remoteBranches: remote };
  }, [branches]);

  const handleCreateBranch = useCallback(() => {
    if (newBranchName.trim()) {
      onCreateBranch(newBranchName.trim());
      setNewBranchName('');
      setShowCreateForm(false);
    }
  }, [newBranchName, onCreateBranch]);

  if (loading && branches.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400 text-sm">Loading branches...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header with actions */}
      <div className="flex items-center justify-between px-2 py-2 border-b border-slate-700">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="text-xs px-2 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded"
        >
          + New Branch
        </button>
        <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={includeRemote}
            onChange={onToggleRemote}
            className="w-3 h-3 rounded bg-slate-700 border-slate-600"
          />
          Show remote
        </label>
      </div>

      {/* Create branch form */}
      {showCreateForm && (
        <div className="flex items-center gap-2 px-2 py-2 border-b border-slate-700 bg-slate-800/50">
          <input
            type="text"
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            placeholder="Branch name"
            className="flex-1 px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded focus:outline-none focus:border-orange-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateBranch();
              if (e.key === 'Escape') setShowCreateForm(false);
            }}
            autoFocus
          />
          <button
            onClick={handleCreateBranch}
            disabled={!newBranchName.trim()}
            className="px-2 py-1 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded disabled:opacity-50"
          >
            Create
          </button>
          <button
            onClick={() => setShowCreateForm(false)}
            className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-400 rounded"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Local branches */}
        {localBranches.length > 0 && (
          <div>
            <div className="px-2 py-1.5 text-xs font-medium text-slate-400 bg-slate-800/50">
              Local ({localBranches.length})
            </div>
            {localBranches.map((branch) => (
              <BranchEntry
                key={branch.name}
                branch={branch}
                onCheckout={onCheckout}
              />
            ))}
          </div>
        )}

        {/* Remote branches */}
        {includeRemote && remoteBranches.length > 0 && (
          <div>
            <div className="px-2 py-1.5 text-xs font-medium text-slate-400 bg-slate-800/50">
              Remote ({remoteBranches.length})
            </div>
            {remoteBranches.map((branch) => (
              <BranchEntry
                key={branch.name}
                branch={branch}
                onCheckout={onCheckout}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default BranchView;
