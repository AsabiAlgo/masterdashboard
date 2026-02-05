/**
 * Folder Node Component
 *
 * A React Flow node that provides a VS Code-style file browser.
 * Displays directory contents, supports navigation, and can launch files.
 */

'use client';

import { memo, useCallback, useEffect, useState, useRef } from 'react';
import { type NodeProps, NodeResizer } from '@xyflow/react';
import {
  NodeType,
  FileType,
  FileAction,
  type FolderViewerNodeData,
  type ViewerNodeData,
  type ViewerContentType,
  type FileEntry,
} from '@masterdashboard/shared';

import { BaseNode } from '../BaseNode';
import { FileList } from './FileList';
import { FolderToolbar } from './FolderToolbar';
import { Breadcrumbs } from './Breadcrumbs';
import { SearchBar } from './SearchBar';
import { ContextMenu, type ExtendedFileAction } from './ContextMenu';
import { CreateDialog } from './CreateDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { useFolderSocket } from './hooks/useFolderSocket';
import { useCanvasStore } from '@/stores/canvas-store';

/**
 * Folder icon component
 */
function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  );
}

interface FolderNodeProps extends NodeProps {
  data: FolderViewerNodeData;
}

interface ContextMenuState {
  entry: FileEntry;
  position: { x: number; y: number };
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

function isViewableFile(entry: FileEntry): boolean {
  const ext = entry.extension.toLowerCase();
  return (
    MARKDOWN_EXTENSIONS.has(ext) ||
    IMAGE_EXTENSIONS.has(ext) ||
    CODE_EXTENSIONS.has(ext) ||
    ext === '.txt' ||
    ext === '.log' ||
    ext === '.env' ||
    entry.name.toLowerCase().startsWith('.')
  );
}

export const FolderNode = memo(function FolderNode({
  id,
  data,
  selected,
}: FolderNodeProps) {
  const { addNodeAtViewportCenter, updateNodeData } = useCanvasStore();
  const [error, setError] = useState<string | null>(null);
  const [isSearchVisible, setSearchVisible] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // File operation dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogType, setCreateDialogType] = useState<'file' | 'folder'>('file');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<FileEntry[]>([]);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);

  // Handle errors
  const handleError = useCallback((errorMsg: string) => {
    setError(errorMsg);
    setTimeout(() => setError(null), 3000);
  }, []);

  // Handle file launched (e.g., terminal created)
  const handleLaunched = useCallback(
    (sessionId: string | undefined, nodeType: string | undefined, _filePath?: string) => {
      if (nodeType === NodeType.TERMINAL && sessionId) {
        // Create terminal node for the new session at viewport center
        const nodeId = addNodeAtViewportCenter(NodeType.TERMINAL);
        // We need to update the new node with the session ID
        // Note: The terminal node will auto-connect due to sessionId being set
        setTimeout(() => {
          updateNodeData(nodeId, { sessionId, connected: true });
        }, 100);
      }
    },
    [addNodeAtViewportCenter, updateNodeData]
  );

  // Use refs for callbacks that need to call refresh (which isn't available yet)
  const refreshRef = useRef<() => void>(() => {});

  // Handle file created
  const handleFileCreated = useCallback((_entry: FileEntry) => {
    refreshRef.current();
  }, []);

  // Handle folder created
  const handleFolderCreated = useCallback((_entry: FileEntry) => {
    refreshRef.current();
  }, []);

  // Handle renamed
  const handleRenamed = useCallback((_oldPath: string, _newPath: string, _entry: FileEntry) => {
    setRenamingPath(null);
    refreshRef.current();
  }, []);

  // Handle deleted
  const handleDeleted = useCallback((_paths: string[]) => {
    // Clear selection of deleted items
    const deletedSet = new Set(_paths);
    const newSelection = data.selectedPaths.filter(p => !deletedSet.has(p));
    updateNodeData<FolderViewerNodeData>(id, { selectedPaths: newSelection });
    refreshRef.current();
  }, [id, data.selectedPaths, updateNodeData]);

  // Handle copied
  const handleCopied = useCallback((_copiedPaths: Array<{ source: string; destination: string }>) => {
    refreshRef.current();
  }, []);

  // Handle moved
  const handleMoved = useCallback((_movedPaths: Array<{ source: string; destination: string }>) => {
    // Clear selection of moved items
    const movedSources = new Set(_movedPaths.map(p => p.source));
    const newSelection = data.selectedPaths.filter(p => !movedSources.has(p));
    updateNodeData<FolderViewerNodeData>(id, { selectedPaths: newSelection });
    refreshRef.current();
  }, [id, data.selectedPaths, updateNodeData]);

  // Socket hook
  const {
    connected,
    loading,
    listing,
    searchResults,
    clipboard,
    listDirectory,
    searchFiles,
    launchFile,
    refresh,
    createFile,
    createFolder,
    renameItem,
    deleteItems,
    copyToClipboard,
    cutToClipboard,
    pasteItems,
    moveItems,
  } = useFolderSocket({
    projectId: data.projectId,
    onError: handleError,
    onLaunched: handleLaunched,
    onFileCreated: handleFileCreated,
    onFolderCreated: handleFolderCreated,
    onRenamed: handleRenamed,
    onDeleted: handleDeleted,
    onCopied: handleCopied,
    onMoved: handleMoved,
  });

  // Keep refresh ref updated
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  // Load initial directory when connected
  useEffect(() => {
    if (connected && data.currentPath && !listing) {
      listDirectory(data.currentPath, {
        showHidden: data.showHidden,
        sortBy: data.sortBy,
        sortDirection: data.sortDirection,
      });
    }
  }, [connected, data.currentPath, data.showHidden, data.sortBy, data.sortDirection, listing, listDirectory]);

  // Handle file click (select)
  const handleFileSelect = useCallback(
    (entry: FileEntry, event: React.MouseEvent) => {
      const isCtrl = event.ctrlKey || event.metaKey;
      const isShift = event.shiftKey;

      if (isCtrl) {
        // Toggle selection
        const newSelected = new Set(data.selectedPaths);
        if (newSelected.has(entry.path)) {
          newSelected.delete(entry.path);
        } else {
          newSelected.add(entry.path);
        }
        updateNodeData<FolderViewerNodeData>(id, {
          selectedPaths: Array.from(newSelected),
          focusedPath: entry.path,
        });
      } else if (isShift && data.focusedPath) {
        // Range selection (simplified - just select between focused and clicked)
        const entries = listing?.entries ?? [];
        const focusedIndex = entries.findIndex(e => e.path === data.focusedPath);
        const clickedIndex = entries.findIndex(e => e.path === entry.path);

        if (focusedIndex !== -1 && clickedIndex !== -1) {
          const start = Math.min(focusedIndex, clickedIndex);
          const end = Math.max(focusedIndex, clickedIndex);
          const newSelected = entries.slice(start, end + 1).map(e => e.path);
          updateNodeData<FolderViewerNodeData>(id, {
            selectedPaths: newSelected,
          });
        }
      } else {
        // Single selection
        updateNodeData<FolderViewerNodeData>(id, {
          selectedPaths: [entry.path],
          focusedPath: entry.path,
        });
      }
    },
    [id, data.selectedPaths, data.focusedPath, listing?.entries, updateNodeData]
  );

  // Handle file double-click (open)
  const handleFileDoubleClick = useCallback(
    (entry: FileEntry) => {
      if (entry.type === FileType.DIRECTORY) {
        // Navigate into directory
        updateNodeData<FolderViewerNodeData>(id, {
          currentPath: entry.path,
          selectedPaths: [],
          focusedPath: null,
        });
        listDirectory(entry.path, {
          showHidden: data.showHidden,
          sortBy: data.sortBy,
          sortDirection: data.sortDirection,
        });
      } else if (entry.isExecutable) {
        // Execute script in terminal
        launchFile(entry.path, FileAction.EXECUTE);
      } else if (isViewableFile(entry)) {
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
      } else {
        // Fallback: try to open in viewer anyway
        const nodeId = addNodeAtViewportCenter(NodeType.VIEWER);
        setTimeout(() => {
          updateNodeData<ViewerNodeData>(nodeId, {
            filePath: entry.path,
            fileName: entry.name,
            extension: entry.extension,
            contentType: 'text',
            loading: true,
            editMode: false,
            isDirty: false,
            editContent: null,
          });
        }, 50);
      }
    },
    [id, data.showHidden, data.sortBy, data.sortDirection, listDirectory, launchFile, addNodeAtViewportCenter, updateNodeData]
  );

  // Handle context menu
  const handleContextMenu = useCallback((entry: FileEntry, event: React.MouseEvent) => {
    event.preventDefault();

    // Select the item if not already selected
    if (!data.selectedPaths.includes(entry.path)) {
      updateNodeData<FolderViewerNodeData>(id, {
        selectedPaths: [entry.path],
        focusedPath: entry.path,
      });
    }

    setContextMenu({
      entry,
      position: { x: event.clientX, y: event.clientY },
    });
  }, [id, data.selectedPaths, updateNodeData]);

  // Handle context menu action
  const handleContextAction = useCallback(
    (action: ExtendedFileAction) => {
      if (!contextMenu) return;
      const entry = contextMenu.entry;

      switch (action) {
        case 'rename':
          setRenamingPath(entry.path);
          break;
        case 'delete': {
          // Get all selected entries
          const selectedEntries = (listing?.entries ?? []).filter(e =>
            data.selectedPaths.includes(e.path)
          );
          // If clicked item not in selection, just delete that one
          if (!data.selectedPaths.includes(entry.path)) {
            setItemsToDelete([entry]);
          } else {
            setItemsToDelete(selectedEntries.length > 0 ? selectedEntries : [entry]);
          }
          setDeleteDialogOpen(true);
          break;
        }
        case 'cut':
          cutToClipboard(data.selectedPaths.length > 0 ? data.selectedPaths : [entry.path]);
          break;
        case 'copy':
          copyToClipboard(data.selectedPaths.length > 0 ? data.selectedPaths : [entry.path]);
          break;
        case 'paste':
          if (entry.type === FileType.DIRECTORY) {
            pasteItems(entry.path);
          }
          break;
        case FileAction.COPY_PATH:
          navigator.clipboard.writeText(entry.path);
          break;
        case FileAction.OPEN:
          handleFileDoubleClick(entry);
          break;
        case FileAction.QUICK_VIEW: {
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
          break;
        }
        case FileAction.EXECUTE:
        case FileAction.OPEN_IN_TERMINAL:
          launchFile(entry.path, action);
          break;
        case FileAction.REVEAL:
          // Could open in system file manager
          launchFile(entry.path, action);
          break;
      }
    },
    [contextMenu, data.selectedPaths, listing?.entries, handleFileDoubleClick, launchFile, addNodeAtViewportCenter, updateNodeData, copyToClipboard, cutToClipboard, pasteItems]
  );

  // Navigate up
  const handleNavigateUp = useCallback(() => {
    if (listing?.parentPath) {
      updateNodeData<FolderViewerNodeData>(id, {
        currentPath: listing.parentPath,
        selectedPaths: [],
        focusedPath: null,
      });
      listDirectory(listing.parentPath, {
        showHidden: data.showHidden,
        sortBy: data.sortBy,
        sortDirection: data.sortDirection,
      });
    }
  }, [id, listing?.parentPath, data.showHidden, data.sortBy, data.sortDirection, listDirectory, updateNodeData]);

  // Toggle hidden files
  const handleToggleHidden = useCallback(() => {
    const newShowHidden = !data.showHidden;
    updateNodeData<FolderViewerNodeData>(id, { showHidden: newShowHidden });
    listDirectory(data.currentPath, {
      showHidden: newShowHidden,
      sortBy: data.sortBy,
      sortDirection: data.sortDirection,
    });
  }, [id, data.showHidden, data.currentPath, data.sortBy, data.sortDirection, listDirectory, updateNodeData]);

  // Search handler
  const handleSearch = useCallback(
    (query: string) => {
      updateNodeData<FolderViewerNodeData>(id, { searchQuery: query });
      if (query) {
        searchFiles(data.rootPath, query);
      }
    },
    [id, data.rootPath, searchFiles, updateNodeData]
  );

  // Clear search
  const handleClearSearch = useCallback(() => {
    updateNodeData<FolderViewerNodeData>(id, { searchQuery: '' });
  }, [id, updateNodeData]);

  // Handle new file
  const handleNewFile = useCallback(() => {
    setCreateDialogType('file');
    setCreateDialogOpen(true);
  }, []);

  // Handle new folder
  const handleNewFolder = useCallback(() => {
    setCreateDialogType('folder');
    setCreateDialogOpen(true);
  }, []);

  // Handle create dialog submit
  const handleCreate = useCallback(
    (name: string) => {
      const currentPath = listing?.path ?? data.currentPath;
      if (createDialogType === 'file') {
        createFile(currentPath, name);
      } else {
        createFolder(currentPath, name);
      }
    },
    [createDialogType, listing?.path, data.currentPath, createFile, createFolder]
  );

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(() => {
    const paths = itemsToDelete.map(item => item.path);
    deleteItems(paths);
    setItemsToDelete([]);
  }, [itemsToDelete, deleteItems]);

  // Start delete operation
  const startDelete = useCallback(() => {
    const selectedEntries = (listing?.entries ?? []).filter(e =>
      data.selectedPaths.includes(e.path)
    );
    if (selectedEntries.length > 0) {
      setItemsToDelete(selectedEntries);
      setDeleteDialogOpen(true);
    }
  }, [listing?.entries, data.selectedPaths]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if this node is selected
      if (!selected) return;

      const entries = data.searchQuery && searchResults ? searchResults : (listing?.entries ?? []);
      const focusedIndex = entries.findIndex(entry => entry.path === data.focusedPath);

      switch (e.key) {
        case 'ArrowUp': {
          e.preventDefault();
          const prevFocused = focusedIndex > 0 ? entries[focusedIndex - 1] : null;
          if (prevFocused) {
            updateNodeData<FolderViewerNodeData>(id, {
              focusedPath: prevFocused.path,
              selectedPaths: e.shiftKey
                ? [...new Set([...data.selectedPaths, prevFocused.path])]
                : [prevFocused.path],
            });
          }
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          const nextFocused = focusedIndex < entries.length - 1 ? entries[focusedIndex + 1] : null;
          if (nextFocused) {
            updateNodeData<FolderViewerNodeData>(id, {
              focusedPath: nextFocused.path,
              selectedPaths: e.shiftKey
                ? [...new Set([...data.selectedPaths, nextFocused.path])]
                : [nextFocused.path],
            });
          }
          break;
        }
        case 'Enter': {
          e.preventDefault();
          const focused = entries.find(entry => entry.path === data.focusedPath);
          if (focused) {
            handleFileDoubleClick(focused);
          }
          break;
        }
        case 'Backspace': {
          e.preventDefault();
          handleNavigateUp();
          break;
        }
        case 'f': {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setSearchVisible(!isSearchVisible);
          }
          break;
        }
        case 'h': {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleToggleHidden();
          }
          break;
        }
        case 'r': {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            refresh();
          }
          break;
        }
        case 'Escape': {
          if (renamingPath) {
            setRenamingPath(null);
          } else if (isSearchVisible) {
            setSearchVisible(false);
            handleClearSearch();
          }
          break;
        }
        case 'Delete': {
          e.preventDefault();
          if (data.selectedPaths.length > 0) {
            startDelete();
          }
          break;
        }
        case 'F2': {
          e.preventDefault();
          if (data.focusedPath) {
            setRenamingPath(data.focusedPath);
          }
          break;
        }
        case 'c': {
          if ((e.ctrlKey || e.metaKey) && data.selectedPaths.length > 0) {
            e.preventDefault();
            copyToClipboard(data.selectedPaths);
          }
          break;
        }
        case 'x': {
          if ((e.ctrlKey || e.metaKey) && data.selectedPaths.length > 0) {
            e.preventDefault();
            cutToClipboard(data.selectedPaths);
          }
          break;
        }
        case 'v': {
          if ((e.ctrlKey || e.metaKey) && clipboard) {
            e.preventDefault();
            const currentPath = listing?.path ?? data.currentPath;
            pasteItems(currentPath);
          }
          break;
        }
        case 'n': {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) {
              handleNewFolder();
            } else {
              handleNewFile();
            }
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selected,
    id,
    data.focusedPath,
    data.selectedPaths,
    data.searchQuery,
    data.currentPath,
    listing?.entries,
    listing?.path,
    searchResults,
    isSearchVisible,
    renamingPath,
    clipboard,
    handleFileDoubleClick,
    handleNavigateUp,
    handleToggleHidden,
    handleClearSearch,
    handleNewFile,
    handleNewFolder,
    startDelete,
    copyToClipboard,
    cutToClipboard,
    pasteItems,
    refresh,
    updateNodeData,
  ]);

  // Determine which entries to display
  const displayEntries = data.searchQuery && searchResults ? searchResults : (listing?.entries ?? []);
  const title = listing?.path.split('/').pop() || data.currentPath.split('/').pop() || 'Files';

  return (
    <>
      <NodeResizer
        minWidth={280}
        minHeight={300}
        isVisible={selected}
        lineClassName="!border-yellow-500"
        handleClassName="!w-3 !h-3 !bg-yellow-500 !border-yellow-600"
      />

      <BaseNode
        id={id}
        title={title}
        icon={<FolderIcon className="w-4 h-4" />}
        headerColor="bg-yellow-600"
        connected={connected}
        selected={selected}
      >
        <div ref={containerRef} className="flex flex-col h-full w-full">
          {/* Toolbar */}
          <FolderToolbar
            canNavigateUp={!!listing?.parentPath}
            onNavigateUp={handleNavigateUp}
            onRefresh={refresh}
            onToggleHidden={handleToggleHidden}
            onToggleSearch={() => setSearchVisible(!isSearchVisible)}
            onNewFile={handleNewFile}
            onNewFolder={handleNewFolder}
            showHidden={data.showHidden}
            isSearchVisible={isSearchVisible}
            loading={loading}
          />

          {/* Breadcrumbs */}
          <Breadcrumbs
            path={listing?.path ?? data.currentPath}
            rootPath={data.rootPath}
            onNavigate={(path) => {
              updateNodeData<FolderViewerNodeData>(id, {
                currentPath: path,
                selectedPaths: [],
                focusedPath: null,
              });
              listDirectory(path, {
                showHidden: data.showHidden,
                sortBy: data.sortBy,
                sortDirection: data.sortDirection,
              });
            }}
          />

          {/* Search bar (collapsible) */}
          {isSearchVisible && (
            <SearchBar
              value={data.searchQuery}
              onChange={handleSearch}
              onClear={handleClearSearch}
              resultCount={searchResults?.length}
              isSearching={loading && !!data.searchQuery}
            />
          )}

          {/* Error message */}
          {error && (
            <div className="px-3 py-2 bg-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* File list */}
          <div className="flex-1 overflow-hidden nodrag nopan nowheel min-h-0">
            <FileList
              entries={displayEntries}
              loading={loading}
              selectedPaths={new Set(data.selectedPaths)}
              focusedPath={data.focusedPath}
              renamingPath={renamingPath}
              onSelect={handleFileSelect}
              onDoubleClick={handleFileDoubleClick}
              onContextMenu={handleContextMenu}
              onRename={(entry, newName) => renameItem(entry.path, newName)}
              onRenameCancel={() => setRenamingPath(null)}
              onDrop={(sourcePaths, destPath) => moveItems(sourcePaths, destPath)}
            />
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between px-3 py-1 bg-slate-800 border-t border-slate-700 text-xs text-slate-500">
            <span>
              {displayEntries.length} {displayEntries.length === 1 ? 'item' : 'items'}
            </span>
            {data.selectedPaths.length > 0 && (
              <span>{data.selectedPaths.length} selected</span>
            )}
          </div>
        </div>
      </BaseNode>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          entry={contextMenu.entry}
          position={contextMenu.position}
          hasClipboard={!!clipboard}
          onClose={() => setContextMenu(null)}
          onAction={handleContextAction}
        />
      )}

      {/* Create dialog */}
      <CreateDialog
        isOpen={createDialogOpen}
        type={createDialogType}
        currentPath={listing?.path ?? data.currentPath}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={handleCreate}
      />

      {/* Delete confirm dialog */}
      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        items={itemsToDelete}
        onClose={() => {
          setDeleteDialogOpen(false);
          setItemsToDelete([]);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
});
