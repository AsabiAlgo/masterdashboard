/**
 * Sidebar File Browser Component
 *
 * A compact file browser for the sidebar with directory navigation.
 */

'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import { FileType, NodeType, type FileEntry, type ViewerContentType, type ViewerNodeData } from '@masterdashboard/shared';
import { useFolderSocket } from '../nodes/FolderNode/hooks/useFolderSocket';
import { FileIconComponent } from '../nodes/FolderNode/FileIcon';
import { useCanvasStore } from '@/stores/canvas-store';

interface SidebarFileBrowserProps {
  rootPath: string;
  projectId: string;
}

// Content type detection for viewer
const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.mdx']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp']);
const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.scala',
  '.c', '.cpp', '.h', '.hpp', '.cs',
  '.php', '.swift', '.sh', '.bash', '.zsh',
  '.sql', '.graphql', '.gql',
  '.html', '.htm', '.css', '.scss', '.sass', '.less',
  '.xml', '.yaml', '.yml', '.toml', '.json', '.jsonc',
  '.vue', '.svelte', '.astro',
]);

function detectContentType(fileName: string, extension: string): ViewerContentType {
  const ext = extension.toLowerCase();
  const name = fileName.toLowerCase();

  if (['dockerfile', 'makefile', 'jenkinsfile', 'vagrantfile'].includes(name)) return 'code';
  if (MARKDOWN_EXTENSIONS.has(ext)) return 'markdown';
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (CODE_EXTENSIONS.has(ext)) return 'code';
  if (name.startsWith('.') || ext === '.env') return 'code';

  return 'text';
}

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-8">
    <svg className="w-5 h-5 animate-spin text-slate-500" fill="none" viewBox="0 0 24 24">
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
  <div className="flex flex-col items-center justify-center py-8 text-slate-500 text-xs">
    <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  onDoubleClick: (entry: FileEntry) => void;
}

const FileRow = memo(function FileRow({ entry, onDoubleClick }: FileRowProps) {
  return (
    <button
      className={`
        w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs rounded
        hover:bg-slate-800 transition-colors
        ${entry.isHidden ? 'opacity-60' : ''}
      `}
      onDoubleClick={() => onDoubleClick(entry)}
      onClick={() => {
        if (entry.type === FileType.DIRECTORY) {
          onDoubleClick(entry);
        }
      }}
      title={entry.name}
    >
      <FileIconComponent entry={entry} size={14} />
      <span
        className={`
          truncate flex-1
          ${entry.type === FileType.DIRECTORY ? 'text-yellow-400' : 'text-slate-300'}
        `}
      >
        {entry.name}
      </span>
    </button>
  );
});

export const SidebarFileBrowser = memo(function SidebarFileBrowser({
  rootPath,
  projectId,
}: SidebarFileBrowserProps) {
  const { addNodeAtViewportCenter, updateNodeData } = useCanvasStore();
  const [currentPath, setCurrentPath] = useState(rootPath);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((errorMsg: string) => {
    setError(errorMsg);
    setTimeout(() => setError(null), 3000);
  }, []);

  const handleLaunched = useCallback(
    (sessionId: string | undefined, nodeType: string | undefined) => {
      if (nodeType === NodeType.TERMINAL && sessionId) {
        const nodeId = addNodeAtViewportCenter(NodeType.TERMINAL);
        setTimeout(() => {
          updateNodeData(nodeId, { sessionId, connected: true });
        }, 100);
      }
    },
    [addNodeAtViewportCenter, updateNodeData]
  );

  const {
    connected,
    loading,
    listing,
    listDirectory,
    refresh,
  } = useFolderSocket({
    projectId,
    onError: handleError,
    onLaunched: handleLaunched,
  });

  // Load directory when path changes
  useEffect(() => {
    if (connected && currentPath) {
      listDirectory(currentPath, { showHidden: false, sortBy: 'name', sortDirection: 'asc' });
    }
  }, [connected, currentPath, listDirectory]);

  // Handle file double-click
  const handleFileDoubleClick = useCallback(
    (entry: FileEntry) => {
      if (entry.type === FileType.DIRECTORY) {
        setCurrentPath(entry.path);
      } else {
        // Open in viewer node at viewport center
        const contentType = detectContentType(entry.name, entry.extension);
        const nodeId = addNodeAtViewportCenter(NodeType.VIEWER);
        setTimeout(() => {
          updateNodeData<ViewerNodeData>(nodeId, {
            filePath: entry.path,
            fileName: entry.name,
            extension: entry.extension,
            contentType,
            loading: true,
            editMode: false,
            isDirty: false,
            editContent: null,
          });
        }, 50);
      }
    },
    [addNodeAtViewportCenter, updateNodeData]
  );

  // Navigate up
  const handleNavigateUp = useCallback(() => {
    if (listing?.parentPath) {
      setCurrentPath(listing.parentPath);
    }
  }, [listing?.parentPath]);

  // Navigate to root
  const handleNavigateHome = useCallback(() => {
    setCurrentPath(rootPath);
  }, [rootPath]);

  // Get current folder name
  const currentFolderName = currentPath.split('/').pop() || 'Root';

  return (
    <div className="flex flex-col h-full">
      {/* Header with navigation */}
      <div className="flex items-center gap-1 px-2 py-2 border-b border-slate-800">
        {/* Home button */}
        <button
          onClick={handleNavigateHome}
          className="p-1 hover:bg-slate-700 rounded transition-colors"
          title="Go to root"
          disabled={currentPath === rootPath}
        >
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>

        {/* Up button */}
        <button
          onClick={handleNavigateUp}
          className="p-1 hover:bg-slate-700 rounded transition-colors"
          title="Go up"
          disabled={!listing?.parentPath}
        >
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>

        {/* Current path */}
        <span className="flex-1 text-xs text-slate-400 truncate px-1" title={currentPath}>
          {currentFolderName}
        </span>

        {/* Refresh button */}
        <button
          onClick={refresh}
          className="p-1 hover:bg-slate-700 rounded transition-colors"
          title="Refresh"
          disabled={loading}
        >
          <svg
            className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-2 py-1 bg-red-500/20 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Connection status */}
      {!connected && (
        <div className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs">
          Connecting...
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {loading && (!listing || listing.entries.length === 0) ? (
          <LoadingSpinner />
        ) : listing?.entries.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-0.5">
            {listing?.entries.map((entry) => (
              <FileRow
                key={entry.path}
                entry={entry}
                onDoubleClick={handleFileDoubleClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="px-2 py-1 border-t border-slate-800 text-xs text-slate-500">
        {listing?.entries.length ?? 0} items
      </div>
    </div>
  );
});
