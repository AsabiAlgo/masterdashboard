/**
 * Git Node Component
 *
 * A React Flow node that provides visual Git operations:
 * branch management, file staging, commit history, and push/pull controls.
 */

'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import { type NodeProps, NodeResizer } from '@xyflow/react';
import type { GitNodeData, GitViewMode } from '@masterdashboard/shared';

import { BaseNode } from '../BaseNode';
import { GitToolbar } from './GitToolbar';
import { StatusView } from './StatusView';
import { HistoryView } from './HistoryView';
import { BranchView } from './BranchView';
import { CommitPanel } from './CommitPanel';
import { PushPullControls } from './PushPullControls';
import { useGitSocket } from './hooks/useGitSocket';
import { useCanvasStore } from '@/stores/canvas-store';

/**
 * Git icon component
 */
function GitIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M21.62 11.108l-8.731-8.729a1.292 1.292 0 0 0-1.823 0L9.257 4.19l2.299 2.3a1.532 1.532 0 0 1 1.939 1.95l2.214 2.217a1.532 1.532 0 0 1 1.583 2.531c-.599.6-1.566.6-2.166 0a1.536 1.536 0 0 1-.337-1.662l-2.074-2.063V14.7a1.534 1.534 0 0 1 .404 2.468 1.534 1.534 0 0 1-2.166 0 1.536 1.536 0 0 1 0-2.164c.135-.135.291-.238.459-.314V9.467a1.525 1.525 0 0 1-.459-.314 1.536 1.536 0 0 1-.336-1.662l-2.27-2.27-5.987 5.982a1.292 1.292 0 0 0 0 1.822l8.731 8.729a1.29 1.29 0 0 0 1.822 0l8.692-8.689a1.292 1.292 0 0 0 .003-1.826z"/>
    </svg>
  );
}

interface GitNodeProps extends NodeProps {
  data: GitNodeData;
}

export const GitNode = memo(function GitNode({
  id,
  data,
  selected,
}: GitNodeProps) {
  const { updateNodeData } = useCanvasStore();
  const [error, setError] = useState<string | null>(null);
  const [includeRemoteBranches, setIncludeRemoteBranches] = useState(false);
  const [commitSkip, setCommitSkip] = useState(0);

  // Handle errors
  const handleError = useCallback((errorMsg: string) => {
    setError(errorMsg);
    updateNodeData<GitNodeData>(id, { error: errorMsg });
    setTimeout(() => {
      setError(null);
      updateNodeData<GitNodeData>(id, { error: null });
    }, 5000);
  }, [id, updateNodeData]);

  // Git socket hook
  const {
    connected,
    loading,
    status,
    commits,
    branches,
    hasMoreCommits,
    getStatus,
    getLog,
    getBranches,
    checkout,
    stage,
    unstage,
    commit,
    push,
    pull,
    discard,
  } = useGitSocket({
    projectId: data.projectId,
    repoPath: data.repoPath,
    onError: handleError,
  });

  // Update connected state
  useEffect(() => {
    if (data.connected !== connected) {
      updateNodeData<GitNodeData>(id, { connected });
    }
  }, [id, data.connected, connected, updateNodeData]);

  // Load initial data when connected
  useEffect(() => {
    if (connected && data.repoPath) {
      getStatus();
    }
  }, [connected, data.repoPath, getStatus]);

  // Load data based on view mode
  useEffect(() => {
    if (!connected || !data.repoPath) return;

    if (data.viewMode === 'history' && commits.length === 0) {
      getLog(data.commitLimit);
    } else if (data.viewMode === 'branches' && branches.length === 0) {
      getBranches(includeRemoteBranches);
    }
  }, [connected, data.repoPath, data.viewMode, data.commitLimit, commits.length, branches.length, includeRemoteBranches, getLog, getBranches]);

  // Handle view mode change
  const handleViewModeChange = useCallback((mode: GitViewMode) => {
    updateNodeData<GitNodeData>(id, { viewMode: mode });
  }, [id, updateNodeData]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    if (data.viewMode === 'status') {
      getStatus();
    } else if (data.viewMode === 'history') {
      setCommitSkip(0);
      getLog(data.commitLimit);
    } else if (data.viewMode === 'branches') {
      getBranches(includeRemoteBranches);
    }
  }, [data.viewMode, data.commitLimit, includeRemoteBranches, getStatus, getLog, getBranches]);

  // Handle file selection
  const handleSelectFile = useCallback((path: string) => {
    const newSelected = data.selectedFiles.includes(path)
      ? data.selectedFiles.filter(p => p !== path)
      : [...data.selectedFiles, path];
    updateNodeData<GitNodeData>(id, { selectedFiles: newSelected });
  }, [id, data.selectedFiles, updateNodeData]);

  // Handle stage
  const handleStage = useCallback((files: string[]) => {
    stage(files);
    // Refresh status after operation
    setTimeout(() => getStatus(), 500);
  }, [stage, getStatus]);

  // Handle unstage
  const handleUnstage = useCallback((files: string[]) => {
    unstage(files);
    setTimeout(() => getStatus(), 500);
  }, [unstage, getStatus]);

  // Handle discard
  const handleDiscard = useCallback((files: string[]) => {
    discard(files);
    setTimeout(() => getStatus(), 500);
  }, [discard, getStatus]);

  // Handle commit
  const handleCommit = useCallback((message: string) => {
    commit(message);
    setTimeout(() => getStatus(), 500);
  }, [commit, getStatus]);

  // Handle push
  const handlePush = useCallback(() => {
    push();
    setTimeout(() => getStatus(), 1000);
  }, [push, getStatus]);

  // Handle pull
  const handlePull = useCallback(() => {
    pull();
    setTimeout(() => getStatus(), 1000);
  }, [pull, getStatus]);

  // Handle checkout
  const handleCheckout = useCallback((branch: string) => {
    checkout(branch);
    setTimeout(() => {
      getStatus();
      getBranches(includeRemoteBranches);
    }, 500);
  }, [checkout, getStatus, getBranches, includeRemoteBranches]);

  // Handle create branch
  const handleCreateBranch = useCallback((name: string) => {
    checkout(name, true);
    setTimeout(() => {
      getStatus();
      getBranches(includeRemoteBranches);
    }, 500);
  }, [checkout, getStatus, getBranches, includeRemoteBranches]);

  // Handle toggle remote branches
  const handleToggleRemote = useCallback(() => {
    const newValue = !includeRemoteBranches;
    setIncludeRemoteBranches(newValue);
    getBranches(newValue);
  }, [includeRemoteBranches, getBranches]);

  // Handle load more commits
  const handleLoadMoreCommits = useCallback(() => {
    const newSkip = commitSkip + data.commitLimit;
    setCommitSkip(newSkip);
    getLog(data.commitLimit, newSkip);
  }, [commitSkip, data.commitLimit, getLog]);

  const repoName = data.repoPath.split('/').pop() ?? 'Git';

  return (
    <>
      <NodeResizer
        minWidth={350}
        minHeight={400}
        isVisible={selected}
        lineClassName="!border-orange-500"
        handleClassName="!w-3 !h-3 !bg-orange-500 !border-orange-600"
      />

      <BaseNode
        id={id}
        title={repoName}
        icon={<GitIcon className="w-4 h-4" />}
        headerColor="bg-orange-600"
        connected={connected}
        selected={selected}
      >
        <div className="flex flex-col h-full w-full">
          {/* Toolbar */}
          <GitToolbar
            viewMode={data.viewMode}
            onViewModeChange={handleViewModeChange}
            onRefresh={handleRefresh}
            loading={loading}
            status={status}
          />

          {/* Error message */}
          {error && (
            <div className="px-2 py-1.5 bg-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Main content area */}
          <div className="flex-1 overflow-hidden min-h-0">
            {data.viewMode === 'status' && (
              <StatusView
                status={status}
                selectedFiles={data.selectedFiles}
                loading={loading}
                onSelectFile={handleSelectFile}
                onStage={handleStage}
                onUnstage={handleUnstage}
                onDiscard={handleDiscard}
              />
            )}

            {data.viewMode === 'history' && (
              <HistoryView
                commits={commits}
                loading={loading}
                hasMore={hasMoreCommits}
                onLoadMore={handleLoadMoreCommits}
              />
            )}

            {data.viewMode === 'branches' && (
              <BranchView
                branches={branches}
                loading={loading}
                includeRemote={includeRemoteBranches}
                onToggleRemote={handleToggleRemote}
                onCheckout={handleCheckout}
                onCreateBranch={handleCreateBranch}
              />
            )}
          </div>

          {/* Status view specific controls */}
          {data.viewMode === 'status' && (
            <>
              <CommitPanel
                status={status}
                loading={loading}
                onCommit={handleCommit}
              />
              <PushPullControls
                status={status}
                loading={loading}
                onPush={handlePush}
                onPull={handlePull}
              />
            </>
          )}
        </div>
      </BaseNode>
    </>
  );
});
