/**
 * Viewer Toolbar Component
 *
 * Toolbar with copy, word wrap, and line numbers controls.
 */

'use client';

import { memo, useCallback, useState } from 'react';
import type { ViewerContentType } from '@masterdashboard/shared';

interface ViewerToolbarProps {
  contentType: ViewerContentType;
  wordWrap: boolean;
  showLineNumbers: boolean;
  showMinimap: boolean;
  onToggleWordWrap: () => void;
  onToggleLineNumbers: () => void;
  onToggleMinimap: () => void;
  onCopy: () => void;
  onReload: () => void;
  loading: boolean;
  editMode: boolean;
  isDirty: boolean;
  saving: boolean;
  onToggleEditMode: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
  /** File extension for future language display feature */
  extension?: string;
}

// Icons
const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

const WrapIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 6h16M4 12h11m-7 6h7a2 2 0 002-2v-2a2 2 0 00-2-2h-3"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 16l-3 3 3 3"
    />
  </svg>
);

const LineNumbersIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
    />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);

const SaveIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
    />
  </svg>
);

const CancelIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const MinimapIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
    />
  </svg>
);

export const ViewerToolbar = memo(function ViewerToolbar({
  contentType,
  wordWrap,
  showLineNumbers,
  showMinimap,
  onToggleWordWrap,
  onToggleLineNumbers,
  onToggleMinimap,
  onCopy,
  onReload,
  loading,
  editMode,
  isDirty,
  saving,
  onToggleEditMode,
  onSave,
  onCancelEdit,
  extension: _extension,
}: ViewerToolbarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [onCopy]);

  const showCodeControls = contentType === 'code' || contentType === 'text';
  const canEdit = contentType !== 'image';

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-800 border-b border-slate-700">
      {/* Edit mode controls */}
      {editMode ? (
        <>
          {/* Save button */}
          <button
            onClick={onSave}
            disabled={saving || !isDirty}
            className={`p-1.5 rounded transition-colors ${
              saving || !isDirty
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-green-400 hover:text-green-300 hover:bg-green-500/20'
            }`}
            title={saving ? 'Saving...' : isDirty ? 'Save (Ctrl+S)' : 'No changes'}
          >
            <SaveIcon />
          </button>

          {/* Cancel button */}
          <button
            onClick={onCancelEdit}
            disabled={saving}
            className={`p-1.5 rounded transition-colors ${
              saving
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-red-400 hover:text-red-300 hover:bg-red-500/20'
            }`}
            title="Cancel editing"
          >
            <CancelIcon />
          </button>

          {/* Divider */}
          <div className="w-px h-4 bg-slate-700 mx-1" />
        </>
      ) : (
        <>
          {/* Reload */}
          <button
            onClick={onReload}
            disabled={loading}
            className={`p-1.5 rounded transition-colors ${
              loading
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
            title="Reload file"
          >
            <RefreshIcon />
          </button>

          {/* Edit button */}
          {canEdit && (
            <button
              onClick={onToggleEditMode}
              className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
              title="Edit file"
            >
              <EditIcon />
            </button>
          )}

          {/* Divider */}
          <div className="w-px h-4 bg-slate-700 mx-1" />
        </>
      )}

      {/* Copy */}
      {contentType !== 'image' && !editMode && (
        <button
          onClick={handleCopy}
          className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
          title="Copy to clipboard"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      )}

      {/* Code-specific controls */}
      {showCodeControls && (
        <>
          {/* Word Wrap */}
          <button
            onClick={onToggleWordWrap}
            className={`p-1.5 rounded transition-colors ${
              wordWrap
                ? 'text-blue-400 bg-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
            title={wordWrap ? 'Disable word wrap' : 'Enable word wrap'}
          >
            <WrapIcon />
          </button>

          {/* Line Numbers */}
          <button
            onClick={onToggleLineNumbers}
            className={`p-1.5 rounded transition-colors ${
              showLineNumbers
                ? 'text-blue-400 bg-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
            title={showLineNumbers ? 'Hide line numbers' : 'Show line numbers'}
          >
            <LineNumbersIcon />
          </button>

          {/* Minimap - only show in edit mode */}
          {editMode && (
            <button
              onClick={onToggleMinimap}
              data-testid="minimap-toggle"
              className={`p-1.5 rounded transition-colors ${
                showMinimap
                  ? 'text-blue-400 bg-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
              title={showMinimap ? 'Hide minimap' : 'Show minimap'}
            >
              <MinimapIcon />
            </button>
          )}
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Dirty indicator */}
      {isDirty && (
        <span className="flex items-center gap-1 text-xs text-amber-400 px-2">
          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
          Unsaved
        </span>
      )}

      {/* Saving indicator */}
      {saving && (
        <span className="flex items-center gap-1 text-xs text-slate-400 px-2">
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Saving...
        </span>
      )}

      {/* Content type indicator */}
      <span className="text-xs text-slate-500 px-2">
        {editMode ? 'Editing' : ''}
        {contentType === 'markdown' && ' Markdown'}
        {contentType === 'code' && ' Code'}
        {contentType === 'image' && ' Image'}
        {contentType === 'text' && ' Text'}
      </span>
    </div>
  );
});
