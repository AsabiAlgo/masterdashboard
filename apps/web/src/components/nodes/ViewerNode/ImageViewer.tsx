/**
 * Image Viewer Component
 *
 * Displays images loaded via WebSocket with zoom controls.
 */

'use client';

import { memo, useState, useCallback, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { WS_EVENTS } from '@masterdashboard/shared';

interface ImageViewerProps {
  filePath: string;
  fileName: string;
  projectId: string;
}

export const ImageViewer = memo(function ImageViewer({
  filePath,
  fileName,
  projectId,
}: ImageViewerProps) {
  const { socket, connected } = useWebSocket();
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z * 1.25, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z / 1.25, 0.1));
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
  }, []);

  // Load image via WebSocket
  useEffect(() => {
    if (!socket || !connected || !filePath) return;

    setLoading(true);
    setError(null);

    socket.emit(WS_EVENTS.FILE_READ_IMAGE, {
      path: filePath,
      projectId,
    });

    const handleImageResponse = (response: {
      path: string;
      data: string;
      mimeType: string;
      size: number;
      truncated: boolean;
    }) => {
      if (response.path === filePath) {
        setImageData(`data:${response.mimeType};base64,${response.data}`);
        setLoading(false);
      }
    };

    const handleError = (errorResponse: { path?: string; error: string }) => {
      if (errorResponse.path === filePath || !errorResponse.path) {
        setError(errorResponse.error);
        setLoading(false);
      }
    };

    socket.on(WS_EVENTS.FILE_READ_IMAGE_RESPONSE, handleImageResponse);
    socket.on(WS_EVENTS.FILE_ERROR, handleError);

    return () => {
      socket.off(WS_EVENTS.FILE_READ_IMAGE_RESPONSE, handleImageResponse);
      socket.off(WS_EVENTS.FILE_ERROR, handleError);
    };
  }, [socket, connected, filePath, projectId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900">
        <svg className="w-8 h-8 animate-spin text-slate-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (error || !imageData) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900 text-slate-400">
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm">{error || 'Failed to load image'}</p>
          <p className="text-xs text-slate-500 mt-1">{fileName}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Zoom controls */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 border-b border-slate-700">
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          title="Zoom out"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <span className="text-xs text-slate-400 min-w-[4ch] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          title="Zoom in"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button
          onClick={handleReset}
          className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors text-xs"
          title="Reset zoom"
        >
          Reset
        </button>
      </div>

      {/* Image container */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <div
          className="transition-transform duration-150"
          style={{ transform: `scale(${zoom})` }}
        >
          <img
            src={imageData}
            alt={fileName}
            className="max-w-full h-auto rounded border border-slate-700"
          />
        </div>
      </div>

      {/* File info */}
      <div className="px-3 py-1.5 bg-slate-800 border-t border-slate-700 text-xs text-slate-500">
        {fileName}
      </div>
    </div>
  );
});
