/**
 * Folder Toolbar Component
 *
 * Navigation controls for the folder viewer.
 */

'use client';

import { memo } from 'react';

interface FolderToolbarProps {
  canNavigateUp: boolean;
  onNavigateUp: () => void;
  onRefresh: () => void;
  onToggleHidden: () => void;
  onToggleSearch: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  showHidden: boolean;
  isSearchVisible: boolean;
  loading: boolean;
}

const ChevronUpIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const RefreshIcon = ({ spinning }: { spinning?: boolean }) => (
  <svg
    className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const EyeIcon = ({ hidden }: { hidden?: boolean }) => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {hidden ? (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      </>
    ) : (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </>
    )}
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const NewFileIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const NewFolderIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m-3-3h6m-9 7h12a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

export const FolderToolbar = memo(function FolderToolbar({
  canNavigateUp,
  onNavigateUp,
  onRefresh,
  onToggleHidden,
  onToggleSearch,
  onNewFile,
  onNewFolder,
  showHidden,
  isSearchVisible,
  loading,
}: FolderToolbarProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-800 border-b border-slate-700">
      <button
        className="p-1.5 hover:bg-slate-700 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        onClick={onNavigateUp}
        disabled={!canNavigateUp}
        title="Go up (Backspace)"
      >
        <ChevronUpIcon />
      </button>

      <button
        className="p-1.5 hover:bg-slate-700 rounded transition-colors"
        onClick={onRefresh}
        title="Refresh (Ctrl+R)"
      >
        <RefreshIcon spinning={loading} />
      </button>

      <button
        className={`p-1.5 hover:bg-slate-700 rounded transition-colors ${showHidden ? 'bg-slate-700 text-blue-400' : ''}`}
        onClick={onToggleHidden}
        title="Show hidden files (Ctrl+H)"
      >
        <EyeIcon hidden={!showHidden} />
      </button>

      <div className="w-px h-4 bg-slate-700 mx-1" />

      <button
        className="p-1.5 hover:bg-slate-700 rounded transition-colors"
        onClick={onNewFile}
        title="New File (Ctrl+N)"
      >
        <NewFileIcon />
      </button>

      <button
        className="p-1.5 hover:bg-slate-700 rounded transition-colors"
        onClick={onNewFolder}
        title="New Folder (Ctrl+Shift+N)"
      >
        <NewFolderIcon />
      </button>

      <div className="flex-1" />

      <button
        className={`p-1.5 hover:bg-slate-700 rounded transition-colors ${isSearchVisible ? 'bg-slate-700 text-blue-400' : ''}`}
        onClick={onToggleSearch}
        title="Search files (Ctrl+F)"
      >
        <SearchIcon />
      </button>
    </div>
  );
});
