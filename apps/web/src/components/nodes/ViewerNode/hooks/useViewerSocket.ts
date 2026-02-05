/**
 * Viewer Socket Hook
 *
 * Manages WebSocket communication for file reading.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { WS_EVENTS, type ViewerContentType } from '@masterdashboard/shared';

interface UseViewerSocketOptions {
  projectId: string;
  filePath: string;
  onError?: (error: string) => void;
}

interface UseViewerSocketReturn {
  connected: boolean;
  loading: boolean;
  content: string | null;
  contentType: ViewerContentType;
  error: string | null;
  reload: () => void;
  saving: boolean;
  saveError: string | null;
  saveFile: (content: string) => void;
}

// Content type detection based on extension
const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.mdx']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp']);
const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.scala',
  '.c', '.cpp', '.h', '.hpp', '.cs',
  '.php', '.swift', '.m', '.mm',
  '.sh', '.bash', '.zsh', '.fish',
  '.sql', '.graphql', '.gql',
  '.html', '.htm', '.css', '.scss', '.sass', '.less',
  '.xml', '.yaml', '.yml', '.toml',
  '.vue', '.svelte', '.astro',
  '.dockerfile', '.containerfile',
]);

function detectContentType(filePath: string): ViewerContentType {
  const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  const fileName = filePath.split('/').pop()?.toLowerCase() ?? '';

  // Check for common config files without extensions
  if (['dockerfile', 'makefile', 'jenkinsfile', 'vagrantfile'].includes(fileName)) {
    return 'code';
  }

  if (MARKDOWN_EXTENSIONS.has(ext)) return 'markdown';
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (CODE_EXTENSIONS.has(ext)) return 'code';

  // JSON is common enough to highlight
  if (ext === '.json' || ext === '.jsonc') return 'code';

  // Config files
  if (ext === '.env' || fileName.startsWith('.env')) return 'code';
  if (fileName.startsWith('.') && !ext) return 'code'; // dotfiles like .gitignore

  return 'text';
}

export function useViewerSocket({
  projectId,
  filePath,
  onError,
}: UseViewerSocketOptions): UseViewerSocketReturn {
  const { socket, connected } = useWebSocket();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contentType, setContentType] = useState<ViewerContentType>('text');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load file content
  const loadFile = useCallback(() => {
    if (!socket || !connected || !filePath) return;

    setLoading(true);
    setError(null);

    // Detect content type
    const type = detectContentType(filePath);
    setContentType(type);

    // For images, we don't need to fetch content from server
    if (type === 'image') {
      setLoading(false);
      setContent(filePath); // Just use the path for images
      return;
    }

    socket.emit(WS_EVENTS.FILE_READ, {
      projectId,
      path: filePath,
      encoding: 'utf-8',
    });
  }, [socket, connected, projectId, filePath]);

  // Set up event listeners
  useEffect(() => {
    if (!socket) return;

    const handleReadResponse = (response: {
      path: string;
      content: string;
      encoding: string;
      size: number;
    }) => {
      if (response.path === filePath) {
        setContent(response.content);
        setLoading(false);
      }
    };

    const handleError = (errorResponse: { path?: string; error: string }) => {
      if (errorResponse.path === filePath || !errorResponse.path) {
        setError(errorResponse.error);
        setLoading(false);
        onError?.(errorResponse.error);
      }
    };

    socket.on(WS_EVENTS.FILE_READ_RESPONSE, handleReadResponse);
    socket.on(WS_EVENTS.FILE_ERROR, handleError);

    return () => {
      socket.off(WS_EVENTS.FILE_READ_RESPONSE, handleReadResponse);
      socket.off(WS_EVENTS.FILE_ERROR, handleError);
    };
  }, [socket, filePath, onError]);

  // Load file when connected or path changes
  useEffect(() => {
    if (connected && filePath) {
      loadFile();
    }
  }, [connected, filePath, loadFile]);

  // Save file content
  const saveFile = useCallback((newContent: string) => {
    if (!socket || !connected || !filePath) return;

    setSaving(true);
    setSaveError(null);

    socket.emit(WS_EVENTS.FILE_WRITE, {
      projectId,
      path: filePath,
      content: newContent,
      createDirectories: false,
    });
  }, [socket, connected, projectId, filePath]);

  // Set up save event listeners
  useEffect(() => {
    if (!socket) return;

    const handleWriteResponse = (response: {
      path: string;
      success: boolean;
      bytesWritten: number;
    }) => {
      if (response.path === filePath) {
        setSaving(false);
        if (response.success) {
          // Reload the file to get fresh content
          loadFile();
        }
      }
    };

    const handleWriteError = (errorResponse: { path?: string; error: string }) => {
      if (errorResponse.path === filePath || !errorResponse.path) {
        setSaving(false);
        setSaveError(errorResponse.error);
      }
    };

    socket.on(WS_EVENTS.FILE_WRITE_RESPONSE, handleWriteResponse);
    socket.on(WS_EVENTS.FILE_ERROR, handleWriteError);

    return () => {
      socket.off(WS_EVENTS.FILE_WRITE_RESPONSE, handleWriteResponse);
      socket.off(WS_EVENTS.FILE_ERROR, handleWriteError);
    };
  }, [socket, filePath, loadFile]);

  return {
    connected,
    loading,
    content,
    contentType,
    error,
    reload: loadFile,
    saving,
    saveError,
    saveFile,
  };
}
