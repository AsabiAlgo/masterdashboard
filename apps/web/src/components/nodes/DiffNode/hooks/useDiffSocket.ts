/**
 * Diff Socket Hook
 *
 * Manages WebSocket communication for loading two files to diff.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { WS_EVENTS } from '@masterdashboard/shared';

interface UseDiffSocketOptions {
  projectId: string;
  leftFilePath: string;
  rightFilePath: string;
  onError?: (error: string) => void;
}

interface UseDiffSocketReturn {
  connected: boolean;
  loading: boolean;
  leftContent: string | null;
  rightContent: string | null;
  error: string | null;
  reload: () => void;
}

export function useDiffSocket({
  projectId,
  leftFilePath,
  rightFilePath,
  onError,
}: UseDiffSocketOptions): UseDiffSocketReturn {
  const { socket, connected } = useWebSocket();
  const [loading, setLoading] = useState(false);
  const [leftContent, setLeftContent] = useState<string | null>(null);
  const [rightContent, setRightContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track which files we're waiting for
  const [pendingLeft, setPendingLeft] = useState(false);
  const [pendingRight, setPendingRight] = useState(false);

  // Load both files
  const loadFiles = useCallback(() => {
    if (!socket || !connected) return;

    // Reset state
    setLoading(true);
    setError(null);
    setLeftContent(null);
    setRightContent(null);
    setPendingLeft(!!leftFilePath);
    setPendingRight(!!rightFilePath);

    // Load left file if path exists
    if (leftFilePath) {
      socket.emit(WS_EVENTS.FILE_READ, {
        projectId,
        path: leftFilePath,
        encoding: 'utf-8',
      });
    }

    // Load right file if path exists
    if (rightFilePath) {
      socket.emit(WS_EVENTS.FILE_READ, {
        projectId,
        path: rightFilePath,
        encoding: 'utf-8',
      });
    }

    // If neither path is set, we're done loading
    if (!leftFilePath && !rightFilePath) {
      setLoading(false);
    }
  }, [socket, connected, projectId, leftFilePath, rightFilePath]);

  // Set up event listeners
  useEffect(() => {
    if (!socket) return;

    const handleReadResponse = (response: {
      path: string;
      content: string;
      encoding: string;
      size: number;
    }) => {
      if (response.path === leftFilePath) {
        setLeftContent(response.content);
        setPendingLeft(false);
      }
      if (response.path === rightFilePath) {
        setRightContent(response.content);
        setPendingRight(false);
      }
    };

    const handleError = (errorResponse: { path?: string; error: string }) => {
      if (errorResponse.path === leftFilePath || errorResponse.path === rightFilePath) {
        setError(errorResponse.error);
        onError?.(errorResponse.error);
      }
      // Clear pending status for the failed file
      if (errorResponse.path === leftFilePath) {
        setPendingLeft(false);
      }
      if (errorResponse.path === rightFilePath) {
        setPendingRight(false);
      }
    };

    socket.on(WS_EVENTS.FILE_READ_RESPONSE, handleReadResponse);
    socket.on(WS_EVENTS.FILE_ERROR, handleError);

    return () => {
      socket.off(WS_EVENTS.FILE_READ_RESPONSE, handleReadResponse);
      socket.off(WS_EVENTS.FILE_ERROR, handleError);
    };
  }, [socket, leftFilePath, rightFilePath, onError]);

  // Update loading state when both files are loaded
  useEffect(() => {
    if (!pendingLeft && !pendingRight) {
      setLoading(false);
    }
  }, [pendingLeft, pendingRight]);

  // Load files when connected or paths change
  useEffect(() => {
    if (connected && (leftFilePath || rightFilePath)) {
      loadFiles();
    }
  }, [connected, leftFilePath, rightFilePath, loadFiles]);

  return {
    connected,
    loading,
    leftContent,
    rightContent,
    error,
    reload: loadFiles,
  };
}
