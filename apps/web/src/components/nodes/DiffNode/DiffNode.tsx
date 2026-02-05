/**
 * Diff Node Component
 *
 * A React Flow node for comparing two files with side-by-side or unified view.
 */

'use client';

import { memo, useCallback, useEffect, useMemo } from 'react';
import { type NodeProps, NodeResizer } from '@xyflow/react';
import type { DiffNodeData } from '@masterdashboard/shared';

import { BaseNode } from '../BaseNode';
import { DiffToolbar } from './DiffToolbar';
import { SplitDiffView } from './SplitDiffView';
import { UnifiedDiffView } from './UnifiedDiffView';
import { useDiffSocket } from './hooks/useDiffSocket';
import { useCanvasStore } from '@/stores/canvas-store';
import { computeDiff } from '@/utils/diff';

interface DiffNodeProps extends NodeProps {
  data: DiffNodeData;
}

// Diff icon
function DiffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  );
}

// Loading spinner
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full bg-slate-900">
      <svg className="w-8 h-8 animate-spin text-slate-500" fill="none" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}

// Error display
function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-red-400 p-4">
      <svg className="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <p className="text-sm text-center">{message}</p>
    </div>
  );
}

// Empty state
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-slate-500 p-4">
      <DiffIcon className="w-12 h-12 mb-4 opacity-50" />
      <p className="text-sm text-center">
        Select two files to compare
      </p>
      <p className="text-xs text-center mt-2 text-slate-600">
        Drag files from a folder node or enter paths manually
      </p>
    </div>
  );
}

export const DiffNode = memo(function DiffNode({
  id,
  data,
  selected,
}: DiffNodeProps) {
  const { updateNodeData } = useCanvasStore();

  // Socket hook for file loading
  const {
    connected,
    loading,
    leftContent,
    rightContent,
    error,
    reload,
  } = useDiffSocket({
    projectId: data.projectId,
    leftFilePath: data.leftFilePath,
    rightFilePath: data.rightFilePath,
    onError: (err) => {
      updateNodeData<DiffNodeData>(id, { error: err, loading: false });
    },
  });

  // Update node data when content is loaded
  useEffect(() => {
    if (leftContent !== null) {
      updateNodeData<DiffNodeData>(id, { leftContent });
    }
  }, [id, leftContent, updateNodeData]);

  useEffect(() => {
    if (rightContent !== null) {
      updateNodeData<DiffNodeData>(id, { rightContent });
    }
  }, [id, rightContent, updateNodeData]);

  // Update loading state
  useEffect(() => {
    if (loading !== data.loading) {
      updateNodeData<DiffNodeData>(id, { loading });
    }
  }, [id, loading, data.loading, updateNodeData]);

  // Compute diff when content changes
  const diffResult = useMemo(() => {
    if (!data.leftContent && !data.rightContent) return null;
    return computeDiff(data.leftContent || '', data.rightContent || '');
  }, [data.leftContent, data.rightContent]);

  // Toggle handlers
  const handleViewModeChange = useCallback((mode: 'split' | 'unified') => {
    updateNodeData<DiffNodeData>(id, { viewMode: mode });
  }, [id, updateNodeData]);

  const handleSwapFiles = useCallback(() => {
    updateNodeData<DiffNodeData>(id, {
      leftFilePath: data.rightFilePath,
      leftFileName: data.rightFileName,
      leftContent: data.rightContent,
      rightFilePath: data.leftFilePath,
      rightFileName: data.leftFileName,
      rightContent: data.leftContent,
    });
  }, [id, data, updateNodeData]);

  // Determine if we have content to show
  const hasContent = data.leftFilePath || data.rightFilePath;

  // Render content
  const renderContent = () => {
    if (data.loading || loading) {
      return <LoadingSpinner />;
    }

    if (data.error || error) {
      return <ErrorDisplay message={data.error || error || 'Failed to load files'} />;
    }

    if (!hasContent) {
      return <EmptyState />;
    }

    if (!diffResult) {
      return <LoadingSpinner />;
    }

    if (data.viewMode === 'split') {
      return (
        <SplitDiffView
          lines={diffResult.lines}
          showLineNumbers={data.showLineNumbers}
        />
      );
    }

    return (
      <UnifiedDiffView
        lines={diffResult.lines}
        showLineNumbers={data.showLineNumbers}
      />
    );
  };

  // Build title
  const title = data.leftFileName && data.rightFileName
    ? `${data.leftFileName} ↔ ${data.rightFileName}`
    : 'Diff';

  return (
    <>
      <NodeResizer
        minWidth={400}
        minHeight={300}
        isVisible={selected}
        lineClassName="!border-purple-500"
        handleClassName="!w-3 !h-3 !bg-purple-500 !border-purple-600"
      />

      <BaseNode
        id={id}
        title={title}
        icon={<DiffIcon className="w-4 h-4" />}
        headerColor="bg-purple-600"
        connected={connected}
        selected={selected}
      >
        <div className="flex flex-col h-full w-full" data-testid="diff-node">
          {/* Toolbar */}
          <DiffToolbar
            leftFileName={data.leftFileName}
            rightFileName={data.rightFileName}
            viewMode={data.viewMode}
            stats={diffResult?.stats}
            loading={loading || data.loading}
            onViewModeChange={handleViewModeChange}
            onSwapFiles={handleSwapFiles}
            onReload={reload}
          />

          {/* Content area */}
          <div className="flex-1 overflow-hidden min-h-0 nodrag nopan nowheel" data-testid="diff-content">
            {renderContent()}
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between px-3 py-1 bg-slate-800 border-t border-slate-700 text-xs text-slate-500">
            <span className="truncate">
              {hasContent
                ? `${diffResult?.lines.length ?? 0} lines`
                : 'No files selected'}
            </span>
            {diffResult && (
              <span className="flex-shrink-0 ml-2">
                <span className="text-green-400">+{diffResult.stats.additions}</span>
                {' '}
                <span className="text-red-400">-{diffResult.stats.deletions}</span>
              </span>
            )}
          </div>
        </div>
      </BaseNode>
    </>
  );
});
