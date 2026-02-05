/**
 * File List Component
 *
 * Displays directory entries in a scrollable list.
 */

'use client';

import { memo, useCallback, useState } from 'react';
import { FileType, type FileEntry } from '@masterdashboard/shared';
import { FileIconComponent } from './FileIcon';
import { RenameInput } from './RenameInput';

interface FileListProps {
  entries: FileEntry[];
  loading: boolean;
  selectedPaths: Set<string>;
  focusedPath: string | null;
  renamingPath?: string | null;
  onSelect: (entry: FileEntry, event: React.MouseEvent) => void;
  onDoubleClick: (entry: FileEntry) => void;
  onContextMenu: (entry: FileEntry, event: React.MouseEvent) => void;
  onRename?: (entry: FileEntry, newName: string) => void;
  onRenameCancel?: () => void;
  onDrop?: (sourcePaths: string[], destinationPath: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  } else if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } else {
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
}

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-full">
    <svg className="w-6 h-6 animate-spin text-slate-500" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
    <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
    <span>Empty folder</span>
  </div>
);

interface FileRowProps {
  entry: FileEntry;
  isSelected: boolean;
  isFocused: boolean;
  isRenaming: boolean;
  isDragOver?: boolean;
  onSelect: (entry: FileEntry, event: React.MouseEvent) => void;
  onDoubleClick: (entry: FileEntry) => void;
  onContextMenu: (entry: FileEntry, event: React.MouseEvent) => void;
  onRename?: (newName: string) => void;
  onRenameCancel?: () => void;
  onDragStart?: (entry: FileEntry) => void;
  onDragOver?: (entry: FileEntry, e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (entry: FileEntry) => void;
}

const FileRow = memo(function FileRow({
  entry,
  isSelected,
  isFocused,
  isRenaming,
  isDragOver,
  onSelect,
  onDoubleClick,
  onContextMenu,
  onRename,
  onRenameCancel,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: FileRowProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isRenaming) {
        onSelect(entry, e);
      }
    },
    [entry, onSelect, isRenaming]
  );

  const handleDoubleClick = useCallback(() => {
    if (!isRenaming) {
      onDoubleClick(entry);
    }
  }, [entry, onDoubleClick, isRenaming]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onContextMenu(entry, e);
    },
    [entry, onContextMenu]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', entry.path);
      onDragStart?.(entry);
    },
    [entry, onDragStart]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (entry.type === FileType.DIRECTORY) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver?.(entry, e);
      }
    },
    [entry, onDragOver]
  );

  const handleDragLeave = useCallback(() => {
    onDragLeave?.();
  }, [onDragLeave]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (entry.type === FileType.DIRECTORY) {
        onDrop?.(entry);
      }
    },
    [entry, onDrop]
  );

  return (
    <div
      className={`
        flex items-center px-3 py-1 cursor-pointer select-none
        ${isSelected ? 'bg-blue-600/30' : 'hover:bg-slate-800'}
        ${isFocused ? 'ring-1 ring-inset ring-blue-500' : ''}
        ${entry.isHidden ? 'opacity-60' : ''}
        ${!entry.isReadable ? 'opacity-40' : ''}
        ${isDragOver && entry.type === FileType.DIRECTORY ? 'bg-blue-500/20 ring-1 ring-blue-500' : ''}
      `}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      draggable={!isRenaming}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="option"
      aria-selected={isSelected}
      tabIndex={isFocused ? 0 : -1}
    >
      {/* Icon */}
      <FileIconComponent entry={entry} size={16} />

      {/* Name */}
      {isRenaming ? (
        <div className="ml-2 flex-1 min-w-0">
          <RenameInput
            entry={entry}
            onRename={(newName) => onRename?.(newName)}
            onCancel={() => onRenameCancel?.()}
          />
        </div>
      ) : (
        <span
          className={`
            ml-2 truncate text-sm flex-1 min-w-0
            ${entry.type === FileType.DIRECTORY ? 'text-yellow-400' : 'text-slate-200'}
          `}
          title={entry.name}
        >
          {entry.name}
        </span>
      )}

      {/* Size */}
      <span className="text-xs text-slate-500 w-16 text-right flex-shrink-0 ml-2">
        {formatSize(entry.size)}
      </span>

      {/* Modified date */}
      <span className="text-xs text-slate-500 w-20 text-right flex-shrink-0 ml-2 hidden sm:block">
        {formatDate(entry.modifiedAt)}
      </span>
    </div>
  );
});

export const FileList = memo(function FileList({
  entries,
  loading,
  selectedPaths,
  focusedPath,
  renamingPath,
  onSelect,
  onDoubleClick,
  onContextMenu,
  onRename,
  onRenameCancel,
  onDrop,
}: FileListProps) {
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const [draggedPaths, setDraggedPaths] = useState<string[]>([]);

  const handleDragStart = useCallback((entry: FileEntry) => {
    // If dragging a selected item, drag all selected items
    if (selectedPaths.has(entry.path)) {
      setDraggedPaths(Array.from(selectedPaths));
    } else {
      setDraggedPaths([entry.path]);
    }
  }, [selectedPaths]);

  const handleDragOver = useCallback((entry: FileEntry) => {
    setDragOverPath(entry.path);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverPath(null);
  }, []);

  const handleDrop = useCallback((entry: FileEntry) => {
    if (draggedPaths.length > 0 && entry.type === FileType.DIRECTORY) {
      // Don't drop onto itself
      if (!draggedPaths.includes(entry.path)) {
        onDrop?.(draggedPaths, entry.path);
      }
    }
    setDragOverPath(null);
    setDraggedPaths([]);
  }, [draggedPaths, onDrop]);

  if (loading && entries.length === 0) {
    return <LoadingSpinner />;
  }

  if (entries.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-900" role="listbox">
      {entries.map((entry) => (
        <FileRow
          key={entry.path}
          entry={entry}
          isSelected={selectedPaths.has(entry.path)}
          isFocused={focusedPath === entry.path}
          isRenaming={renamingPath === entry.path}
          isDragOver={dragOverPath === entry.path}
          onSelect={onSelect}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
          onRename={(newName) => onRename?.(entry, newName)}
          onRenameCancel={onRenameCancel}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
});
