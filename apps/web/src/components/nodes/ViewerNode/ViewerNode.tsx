/**
 * Viewer Node Component
 *
 * A React Flow node for viewing files (markdown, code, images, text).
 */

'use client';

import { memo, useCallback, useEffect, useRef } from 'react';
import { type NodeProps, NodeResizer } from '@xyflow/react';
import type { ViewerNodeData } from '@masterdashboard/shared';

import { BaseNode } from '../BaseNode';
import { CodeViewer } from './CodeViewer';
import { MonacoEditor } from './MonacoEditor';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ImageViewer } from './ImageViewer';
import { ViewerToolbar } from './ViewerToolbar';
import { useViewerSocket } from './hooks/useViewerSocket';
import { useCanvasStore } from '@/stores/canvas-store';
import { getLanguageFromExtension } from '@/utils/language-detection';

interface ViewerNodeProps extends NodeProps {
  data: ViewerNodeData;
}

// File icon
function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
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

export const ViewerNode = memo(function ViewerNode({
  id,
  data,
  selected,
}: ViewerNodeProps) {
  const { updateNodeData } = useCanvasStore();

  // Ref for container to capture keyboard events
  const containerRef = useRef<HTMLDivElement>(null);

  // Socket hook for file loading and saving
  const {
    connected,
    loading,
    content,
    contentType,
    error,
    reload,
    saving,
    saveError,
    saveFile,
  } = useViewerSocket({
    projectId: data.projectId,
    filePath: data.filePath,
    onError: (err) => {
      updateNodeData<ViewerNodeData>(id, { error: err, loading: false });
    },
  });

  // Update node data when content is loaded
  useEffect(() => {
    if (content !== null && !loading) {
      updateNodeData<ViewerNodeData>(id, {
        content,
        contentType,
        loading: false,
        error: null,
      });
    }
  }, [id, content, contentType, loading, updateNodeData]);

  // Update loading state
  useEffect(() => {
    if (loading !== data.loading) {
      updateNodeData<ViewerNodeData>(id, { loading });
    }
  }, [id, loading, data.loading, updateNodeData]);

  // Toggle handlers
  const handleToggleWordWrap = useCallback(() => {
    updateNodeData<ViewerNodeData>(id, { wordWrap: !data.wordWrap });
  }, [id, data.wordWrap, updateNodeData]);

  const handleToggleLineNumbers = useCallback(() => {
    updateNodeData<ViewerNodeData>(id, { showLineNumbers: !data.showLineNumbers });
  }, [id, data.showLineNumbers, updateNodeData]);

  // Toggle minimap
  const handleToggleMinimap = useCallback(() => {
    updateNodeData<ViewerNodeData>(id, { showMinimap: !data.showMinimap });
  }, [id, data.showMinimap, updateNodeData]);

  // Copy content to clipboard
  const handleCopy = useCallback(() => {
    if (data.content) {
      navigator.clipboard.writeText(data.content);
    }
  }, [data.content]);

  // Toggle edit mode
  const handleToggleEditMode = useCallback(() => {
    const newEditMode = !data.editMode;
    updateNodeData<ViewerNodeData>(id, {
      editMode: newEditMode,
      editContent: newEditMode ? data.content : null,
      isDirty: false,
    });
  }, [id, data.editMode, data.content, updateNodeData]);

  // Handle content change in editor
  const handleContentChange = useCallback((newContent: string) => {
    updateNodeData<ViewerNodeData>(id, {
      editContent: newContent,
      isDirty: newContent !== data.content,
    });
  }, [id, data.content, updateNodeData]);

  // Save file
  const handleSave = useCallback(() => {
    if (data.editContent !== null && data.isDirty) {
      saveFile(data.editContent);
      // Update content and exit edit mode on save
      updateNodeData<ViewerNodeData>(id, {
        content: data.editContent,
        editMode: false,
        editContent: null,
        isDirty: false,
      });
    }
  }, [id, data.editContent, data.isDirty, saveFile, updateNodeData]);

  // Cancel editing
  const handleCancelEdit = useCallback(() => {
    updateNodeData<ViewerNodeData>(id, {
      editMode: false,
      editContent: null,
      isDirty: false,
    });
  }, [id, updateNodeData]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && data.editMode && data.isDirty) {
        e.preventDefault();
        handleSave();
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      return () => container.removeEventListener('keydown', handleKeyDown);
    }
  }, [data.editMode, data.isDirty, handleSave]);

  // Determine header color based on content type
  const headerColor =
    data.contentType === 'markdown'
      ? 'bg-blue-600'
      : data.contentType === 'code'
        ? 'bg-emerald-600'
        : data.contentType === 'image'
          ? 'bg-pink-600'
          : 'bg-slate-600';

  // Render content based on type
  const renderContent = () => {
    if (data.loading || loading) {
      return <LoadingSpinner />;
    }

    if (data.error || error) {
      return <ErrorDisplay message={data.error || error || 'Failed to load file'} />;
    }

    if (!data.content && !content) {
      return <LoadingSpinner />;
    }

    const displayContent = data.content || content || '';

    // In edit mode, show Monaco editor
    if (data.editMode && data.contentType !== 'image') {
      const language = getLanguageFromExtension(data.extension);
      return (
        <MonacoEditor
          value={data.editContent ?? displayContent}
          onChange={handleContentChange}
          language={language}
          showLineNumbers={data.showLineNumbers}
          wordWrap={data.wordWrap}
          showMinimap={data.showMinimap}
          fontSize={data.fontSize}
          onSave={handleSave}
        />
      );
    }

    switch (data.contentType) {
      case 'markdown':
        return <MarkdownRenderer content={displayContent} />;
      case 'code':
      case 'text':
        return (
          <CodeViewer
            content={displayContent}
            extension={data.extension}
            showLineNumbers={data.showLineNumbers}
            wordWrap={data.wordWrap}
          />
        );
      case 'image':
        return (
          <ImageViewer
            filePath={data.filePath}
            fileName={data.fileName}
            projectId={data.projectId}
          />
        );
      default:
        return (
          <CodeViewer
            content={displayContent}
            extension={data.extension}
            showLineNumbers={data.showLineNumbers}
            wordWrap={data.wordWrap}
          />
        );
    }
  };

  return (
    <>
      <NodeResizer
        minWidth={300}
        minHeight={200}
        isVisible={selected}
        lineClassName="!border-blue-500"
        handleClassName="!w-3 !h-3 !bg-blue-500 !border-blue-600"
      />

      <BaseNode
        id={id}
        title={data.isDirty ? `${data.fileName} *` : data.fileName}
        icon={<FileIcon className="w-4 h-4" />}
        headerColor={data.editMode ? 'bg-amber-600' : headerColor}
        connected={connected}
        selected={selected}
      >
        <div ref={containerRef} className="flex flex-col h-full w-full">
          {/* Toolbar */}
          <ViewerToolbar
            contentType={data.contentType}
            wordWrap={data.wordWrap}
            showLineNumbers={data.showLineNumbers}
            showMinimap={data.showMinimap}
            onToggleWordWrap={handleToggleWordWrap}
            onToggleLineNumbers={handleToggleLineNumbers}
            onToggleMinimap={handleToggleMinimap}
            onCopy={handleCopy}
            onReload={reload}
            loading={loading || data.loading}
            editMode={data.editMode ?? false}
            isDirty={data.isDirty ?? false}
            saving={saving}
            onToggleEditMode={handleToggleEditMode}
            onSave={handleSave}
            onCancelEdit={handleCancelEdit}
            extension={data.extension}
          />

          {/* Content area */}
          <div className="flex-1 overflow-hidden min-h-0 nodrag nopan nowheel">
            {renderContent()}
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between px-3 py-1 bg-slate-800 border-t border-slate-700 text-xs text-slate-500">
            <span className="truncate" title={data.filePath}>
              {data.filePath}
            </span>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              {saveError && (
                <span className="text-red-400" title={saveError}>
                  Save failed
                </span>
              )}
              {(data.editMode ? data.editContent : data.content) && (
                <span>
                  {(data.editMode ? data.editContent : data.content)?.split('\n').length} lines
                </span>
              )}
              {data.editMode && (
                <span data-testid="language-indicator">
                  {getLanguageFromExtension(data.extension)}
                </span>
              )}
            </div>
          </div>
        </div>
      </BaseNode>
    </>
  );
});
