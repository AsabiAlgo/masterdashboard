/**
 * Quick Open Hook
 *
 * Manages file search functionality for the command palette quick open mode.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { WS_EVENTS, FileType, type FileEntry } from '@masterdashboard/shared';

export interface FileResult {
  path: string;
  name: string;
  type: 'file' | 'directory';
  extension: string;
  size?: number;
  modified?: number;
}

interface UseQuickOpenOptions {
  /** Root path to search from */
  rootPath: string;
  /** Project ID for scoped search */
  projectId?: string;
  /** Maximum results to return */
  maxResults?: number;
  /** Debounce delay in ms */
  debounceMs?: number;
}

interface UseQuickOpenReturn {
  results: FileResult[];
  loading: boolean;
  error: string | null;
  search: (query: string) => void;
  clearResults: () => void;
}

let requestIdCounter = 0;
function generateRequestId(): string {
  return `quickopen_${Date.now()}_${++requestIdCounter}`;
}

function fileEntryToResult(entry: FileEntry): FileResult {
  const name = entry.name;
  const isDirectory = entry.type === FileType.DIRECTORY;
  const extension = isDirectory
    ? ''
    : name.includes('.')
      ? name.slice(name.lastIndexOf('.') + 1)
      : '';

  return {
    path: entry.path,
    name,
    type: isDirectory ? 'directory' : 'file',
    extension,
    size: entry.size,
    modified: Date.parse(entry.modifiedAt),
  };
}

export function useQuickOpen({
  rootPath,
  projectId = 'default',
  maxResults = 20,
  debounceMs = 150,
}: UseQuickOpenOptions): UseQuickOpenReturn {
  const { emit, on, connected } = useWebSocket();
  const [results, setResults] = useState<FileResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentRequestIdRef = useRef<string | null>(null);
  const lastQueryRef = useRef<string>('');

  // Set up event listeners
  useEffect(() => {
    const handleSearchResponse = (payload: {
      results: FileEntry[];
      correlationId?: string;
      query: string;
      totalMatches: number;
      truncated: boolean;
    }) => {
      // Only handle response for our current request
      if (
        currentRequestIdRef.current &&
        payload.correlationId === currentRequestIdRef.current
      ) {
        setResults(payload.results.map(fileEntryToResult));
        setLoading(false);
        setError(null);
        currentRequestIdRef.current = null;
      }
    };

    const handleError = (payload: { error: string; correlationId?: string }) => {
      if (
        currentRequestIdRef.current &&
        payload.correlationId === currentRequestIdRef.current
      ) {
        setError(payload.error);
        setLoading(false);
        currentRequestIdRef.current = null;
      }
    };

    const unsubSearch = on(WS_EVENTS.FILE_SEARCH_RESPONSE, handleSearchResponse);
    const unsubError = on(WS_EVENTS.FILE_ERROR, handleError);

    return () => {
      unsubSearch();
      unsubError();
    };
  }, [on]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const search = useCallback(
    (query: string) => {
      // Clear any pending debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      // Store the query
      lastQueryRef.current = query;

      // Clear results for empty query
      if (!query.trim()) {
        setResults([]);
        setLoading(false);
        setError(null);
        return;
      }

      // Check connection
      if (!connected) {
        setError('WebSocket not connected');
        return;
      }

      // Set loading state immediately
      setLoading(true);

      // Debounce the actual search
      debounceTimerRef.current = setTimeout(() => {
        // Double-check query hasn't changed during debounce
        if (query !== lastQueryRef.current) {
          return;
        }

        const requestId = generateRequestId();
        currentRequestIdRef.current = requestId;

        emit(
          WS_EVENTS.FILE_SEARCH,
          {
            rootPath,
            projectId,
            query,
            maxResults,
          },
          requestId
        );
      }, debounceMs);
    },
    [connected, emit, rootPath, projectId, maxResults, debounceMs]
  );

  const clearResults = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setResults([]);
    setLoading(false);
    setError(null);
    currentRequestIdRef.current = null;
    lastQueryRef.current = '';
  }, []);

  return {
    results,
    loading,
    error,
    search,
    clearResults,
  };
}
