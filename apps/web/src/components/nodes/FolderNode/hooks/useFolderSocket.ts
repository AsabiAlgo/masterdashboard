/**
 * Folder Socket Hook
 *
 * Manages WebSocket communication for folder viewer operations.
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
  WS_EVENTS,
  FileAction,
  type FileEntry,
  type FileTreeNode,
  type SortField,
  type FileCreateResponsePayload,
  type FileCreateFolderResponsePayload,
  type FileRenameResponsePayload,
  type FileDeleteResponsePayload,
  type FileCopyResponsePayload,
  type FileMoveResponsePayload,
} from '@masterdashboard/shared';

interface DirectoryListing {
  path: string;
  parentPath: string | null;
  entries: FileEntry[];
  totalCount: number;
  hasMore: boolean;
}

interface FileSearchResult {
  query: string;
  results: FileEntry[];
  totalMatches: number;
  truncated: boolean;
}

interface ClipboardState {
  paths: string[];
  operation: 'copy' | 'cut';
}

interface UseFolderSocketOptions {
  projectId: string;
  onError?: (error: string) => void;
  onLaunched?: (sessionId: string | undefined, nodeType: string | undefined, filePath?: string) => void;
  onFileCreated?: (entry: FileEntry) => void;
  onFolderCreated?: (entry: FileEntry) => void;
  onRenamed?: (oldPath: string, newPath: string, entry: FileEntry) => void;
  onDeleted?: (paths: string[]) => void;
  onCopied?: (copiedPaths: Array<{ source: string; destination: string }>) => void;
  onMoved?: (movedPaths: Array<{ source: string; destination: string }>) => void;
}

interface UseFolderSocketReturn {
  connected: boolean;
  loading: boolean;
  listing: DirectoryListing | null;
  tree: FileTreeNode | null;
  searchResults: FileEntry[] | null;
  clipboard: ClipboardState | null;
  listDirectory: (path: string, options?: ListOptions) => void;
  getFileTree: (path: string, depth?: number, showHidden?: boolean) => void;
  searchFiles: (rootPath: string, query: string) => void;
  launchFile: (path: string, action: FileAction) => void;
  refresh: () => void;
  createFile: (parentPath: string, name: string, content?: string) => void;
  createFolder: (parentPath: string, name: string) => void;
  renameItem: (path: string, newName: string) => void;
  deleteItems: (paths: string[]) => void;
  copyToClipboard: (paths: string[]) => void;
  cutToClipboard: (paths: string[]) => void;
  pasteItems: (destinationPath: string) => void;
  moveItems: (sourcePaths: string[], destinationPath: string) => void;
  clearClipboard: () => void;
}

interface ListOptions {
  showHidden?: boolean;
  sortBy?: SortField;
  sortDirection?: 'asc' | 'desc';
}

let requestIdCounter = 0;
function generateRequestId(): string {
  return `file_req_${Date.now()}_${++requestIdCounter}`;
}

export function useFolderSocket({
  projectId,
  onError,
  onLaunched,
  onFileCreated,
  onFolderCreated,
  onRenamed,
  onDeleted,
  onCopied,
  onMoved,
}: UseFolderSocketOptions): UseFolderSocketReturn {
  const { emit, on, connected: socketConnected } = useWebSocket();
  const [loading, setLoading] = useState(false);
  const [listing, setListing] = useState<DirectoryListing | null>(null);
  const [tree, setTree] = useState<FileTreeNode | null>(null);
  const [searchResults, setSearchResults] = useState<FileEntry[] | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const currentPathRef = useRef<string>('');
  const currentOptionsRef = useRef<ListOptions>({});
  const requestIdRef = useRef<string | null>(null);

  // Set up event listeners
  useEffect(() => {
    const handleListResponse = (payload: DirectoryListing & { correlationId?: string }) => {
      if (requestIdRef.current && payload.correlationId === requestIdRef.current) {
        setListing({
          path: payload.path,
          parentPath: payload.parentPath,
          entries: payload.entries,
          totalCount: payload.totalCount,
          hasMore: payload.hasMore,
        });
        setLoading(false);
        requestIdRef.current = null;
      }
    };

    const handleTreeResponse = (payload: { tree: FileTreeNode; correlationId?: string }) => {
      if (requestIdRef.current && payload.correlationId === requestIdRef.current) {
        setTree(payload.tree);
        setLoading(false);
        requestIdRef.current = null;
      }
    };

    const handleSearchResponse = (payload: FileSearchResult & { correlationId?: string }) => {
      if (requestIdRef.current && payload.correlationId === requestIdRef.current) {
        setSearchResults(payload.results);
        setLoading(false);
        requestIdRef.current = null;
      }
    };

    const handleError = (payload: { path: string; error: string; code?: string }) => {
      setLoading(false);
      onError?.(payload.error);
    };

    const handleLaunchResponse = (payload: {
      success: boolean;
      sessionId?: string;
      nodeType?: string;
      filePath?: string;
      error?: string;
    }) => {
      if (payload.success) {
        onLaunched?.(payload.sessionId, payload.nodeType, payload.filePath);
      } else {
        onError?.(payload.error ?? 'Launch failed');
      }
    };

    const handleCreateResponse = (payload: FileCreateResponsePayload) => {
      setLoading(false);
      if (payload.success && payload.entry) {
        onFileCreated?.(payload.entry);
      } else {
        onError?.(payload.error ?? 'Failed to create file');
      }
    };

    const handleCreateFolderResponse = (payload: FileCreateFolderResponsePayload) => {
      setLoading(false);
      if (payload.success && payload.entry) {
        onFolderCreated?.(payload.entry);
      } else {
        onError?.(payload.error ?? 'Failed to create folder');
      }
    };

    const handleRenameResponse = (payload: FileRenameResponsePayload) => {
      setLoading(false);
      if (payload.success && payload.oldPath && payload.newPath && payload.entry) {
        onRenamed?.(payload.oldPath, payload.newPath, payload.entry);
      } else {
        onError?.(payload.error ?? 'Failed to rename');
      }
    };

    const handleDeleteResponse = (payload: FileDeleteResponsePayload) => {
      setLoading(false);
      if (payload.success && payload.deletedPaths) {
        onDeleted?.(payload.deletedPaths);
      } else if (payload.failedPaths && payload.failedPaths.length > 0) {
        const errorMsg = payload.failedPaths.map((f: { path: string; error: string }) => `${f.path}: ${f.error}`).join(', ');
        onError?.(`Some items failed to delete: ${errorMsg}`);
        // Still notify about successfully deleted paths
        if (payload.deletedPaths && payload.deletedPaths.length > 0) {
          onDeleted?.(payload.deletedPaths);
        }
      } else {
        onError?.(payload.error ?? 'Failed to delete');
      }
    };

    const handleCopyResponse = (payload: FileCopyResponsePayload) => {
      setLoading(false);
      if (payload.success && payload.copiedPaths) {
        onCopied?.(payload.copiedPaths);
      } else if (payload.failedPaths && payload.failedPaths.length > 0) {
        const errorMsg = payload.failedPaths.map((f: { path: string; error: string }) => `${f.path}: ${f.error}`).join(', ');
        onError?.(`Some items failed to copy: ${errorMsg}`);
        if (payload.copiedPaths && payload.copiedPaths.length > 0) {
          onCopied?.(payload.copiedPaths);
        }
      } else {
        onError?.(payload.error ?? 'Failed to copy');
      }
    };

    const handleMoveResponse = (payload: FileMoveResponsePayload) => {
      setLoading(false);
      if (payload.success && payload.movedPaths) {
        onMoved?.(payload.movedPaths);
      } else if (payload.failedPaths && payload.failedPaths.length > 0) {
        const errorMsg = payload.failedPaths.map((f: { path: string; error: string }) => `${f.path}: ${f.error}`).join(', ');
        onError?.(`Some items failed to move: ${errorMsg}`);
        if (payload.movedPaths && payload.movedPaths.length > 0) {
          onMoved?.(payload.movedPaths);
        }
      } else {
        onError?.(payload.error ?? 'Failed to move');
      }
    };

    const unsubList = on(WS_EVENTS.FILE_LIST_RESPONSE, handleListResponse);
    const unsubTree = on(WS_EVENTS.FILE_TREE_RESPONSE, handleTreeResponse);
    const unsubSearch = on(WS_EVENTS.FILE_SEARCH_RESPONSE, handleSearchResponse);
    const unsubError = on(WS_EVENTS.FILE_ERROR, handleError);
    const unsubLaunch = on(WS_EVENTS.FILE_LAUNCH_RESPONSE, handleLaunchResponse);
    const unsubCreate = on(WS_EVENTS.FILE_CREATE_RESPONSE, handleCreateResponse);
    const unsubCreateFolder = on(WS_EVENTS.FILE_CREATE_FOLDER_RESPONSE, handleCreateFolderResponse);
    const unsubRename = on(WS_EVENTS.FILE_RENAME_RESPONSE, handleRenameResponse);
    const unsubDelete = on(WS_EVENTS.FILE_DELETE_RESPONSE, handleDeleteResponse);
    const unsubCopy = on(WS_EVENTS.FILE_COPY_RESPONSE, handleCopyResponse);
    const unsubMove = on(WS_EVENTS.FILE_MOVE_RESPONSE, handleMoveResponse);

    return () => {
      unsubList();
      unsubTree();
      unsubSearch();
      unsubError();
      unsubLaunch();
      unsubCreate();
      unsubCreateFolder();
      unsubRename();
      unsubDelete();
      unsubCopy();
      unsubMove();
    };
  }, [on, onError, onLaunched, onFileCreated, onFolderCreated, onRenamed, onDeleted, onCopied, onMoved]);

  const listDirectory = useCallback(
    (path: string, options: ListOptions = {}) => {
      if (!socketConnected) {
        onError?.('WebSocket not connected');
        return;
      }

      const reqId = generateRequestId();
      requestIdRef.current = reqId;
      currentPathRef.current = path;
      currentOptionsRef.current = options;

      setLoading(true);
      emit(WS_EVENTS.FILE_LIST, {
        path,
        projectId,
        showHidden: options.showHidden ?? false,
        sortBy: options.sortBy ?? 'name',
        sortDirection: options.sortDirection ?? 'asc',
      }, reqId);
    },
    [emit, socketConnected, projectId, onError]
  );

  const getFileTree = useCallback(
    (path: string, depth: number = 1, showHidden: boolean = false) => {
      if (!socketConnected) {
        onError?.('WebSocket not connected');
        return;
      }

      const reqId = generateRequestId();
      requestIdRef.current = reqId;
      currentPathRef.current = path;

      setLoading(true);
      emit(WS_EVENTS.FILE_TREE, {
        path,
        projectId,
        depth,
        showHidden,
      }, reqId);
    },
    [emit, socketConnected, projectId, onError]
  );

  const searchFiles = useCallback(
    (rootPath: string, query: string) => {
      if (!socketConnected) {
        onError?.('WebSocket not connected');
        return;
      }

      if (!query.trim()) {
        setSearchResults(null);
        return;
      }

      const reqId = generateRequestId();
      requestIdRef.current = reqId;

      setLoading(true);
      emit(WS_EVENTS.FILE_SEARCH, {
        rootPath,
        projectId,
        query,
        maxResults: 50,
      }, reqId);
    },
    [emit, socketConnected, projectId, onError]
  );

  const launchFile = useCallback(
    (path: string, action: FileAction) => {
      if (!socketConnected) {
        onError?.('WebSocket not connected');
        return;
      }

      emit(WS_EVENTS.FILE_LAUNCH, {
        path,
        projectId,
        action,
      });
    },
    [emit, socketConnected, projectId, onError]
  );

  const refresh = useCallback(() => {
    if (currentPathRef.current) {
      listDirectory(currentPathRef.current, currentOptionsRef.current);
    }
  }, [listDirectory]);

  const createFile = useCallback(
    (parentPath: string, name: string, content: string = '') => {
      if (!socketConnected) {
        onError?.('WebSocket not connected');
        return;
      }

      setLoading(true);
      emit(WS_EVENTS.FILE_CREATE, {
        parentPath,
        projectId,
        name,
        content,
      });
    },
    [emit, socketConnected, projectId, onError]
  );

  const createFolder = useCallback(
    (parentPath: string, name: string) => {
      if (!socketConnected) {
        onError?.('WebSocket not connected');
        return;
      }

      setLoading(true);
      emit(WS_EVENTS.FILE_CREATE_FOLDER, {
        parentPath,
        projectId,
        name,
      });
    },
    [emit, socketConnected, projectId, onError]
  );

  const renameItem = useCallback(
    (path: string, newName: string) => {
      if (!socketConnected) {
        onError?.('WebSocket not connected');
        return;
      }

      setLoading(true);
      emit(WS_EVENTS.FILE_RENAME, {
        path,
        projectId,
        newName,
      });
    },
    [emit, socketConnected, projectId, onError]
  );

  const deleteItems = useCallback(
    (paths: string[]) => {
      if (!socketConnected) {
        onError?.('WebSocket not connected');
        return;
      }

      if (paths.length === 0) return;

      setLoading(true);
      emit(WS_EVENTS.FILE_DELETE, {
        paths,
        projectId,
      });
    },
    [emit, socketConnected, projectId, onError]
  );

  const copyToClipboard = useCallback((paths: string[]) => {
    if (paths.length === 0) return;
    setClipboard({ paths, operation: 'copy' });
  }, []);

  const cutToClipboard = useCallback((paths: string[]) => {
    if (paths.length === 0) return;
    setClipboard({ paths, operation: 'cut' });
  }, []);

  const pasteItems = useCallback(
    (destinationPath: string) => {
      if (!socketConnected) {
        onError?.('WebSocket not connected');
        return;
      }

      if (!clipboard || clipboard.paths.length === 0) {
        onError?.('Nothing to paste');
        return;
      }

      setLoading(true);

      if (clipboard.operation === 'copy') {
        emit(WS_EVENTS.FILE_COPY, {
          sourcePaths: clipboard.paths,
          destinationPath,
          projectId,
        });
      } else {
        emit(WS_EVENTS.FILE_MOVE, {
          sourcePaths: clipboard.paths,
          destinationPath,
          projectId,
        });
        // Clear clipboard after cut operation
        setClipboard(null);
      }
    },
    [emit, socketConnected, projectId, clipboard, onError]
  );

  const moveItems = useCallback(
    (sourcePaths: string[], destinationPath: string) => {
      if (!socketConnected) {
        onError?.('WebSocket not connected');
        return;
      }

      if (sourcePaths.length === 0) return;

      setLoading(true);
      emit(WS_EVENTS.FILE_MOVE, {
        sourcePaths,
        destinationPath,
        projectId,
      });
    },
    [emit, socketConnected, projectId, onError]
  );

  const clearClipboard = useCallback(() => {
    setClipboard(null);
  }, []);

  return {
    connected: socketConnected,
    loading,
    listing,
    tree,
    searchResults,
    clipboard,
    listDirectory,
    getFileTree,
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
    clearClipboard,
  };
}
