/**
 * Canvas Controls Component
 *
 * Control panel for canvas operations like fit view, arrange, and clear.
 */

'use client';

import { useCallback } from 'react';
import { useReactFlow, useViewport } from '@xyflow/react';
import { useCanvasStore, useConnectionStatus } from '@/stores/canvas-store';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';

export function CanvasControls() {
  const { fitView, zoomTo } = useReactFlow();
  const viewport = useViewport();
  const { clearCanvas, saveLayout, nodes, edges } = useCanvasStore();
  const connectionStatus = useConnectionStatus();

  // Fit view to all nodes
  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 300 });
  }, [fitView]);

  // Arrange nodes in a grid
  const handleArrange = useCallback(() => {
    if (nodes.length === 0) return;

    const gap = 40;
    const maxPerRow = 3;
    const startX = 50;
    const startY = 50;

    // Calculate max dimensions for each column and row
    const colWidths: number[] = [];
    const rowHeights: number[] = [];

    // First pass: determine max width for each column and max height for each row
    nodes.forEach((node, index) => {
      const col = index % maxPerRow;
      const row = Math.floor(index / maxPerRow);

      // Use actual measured dimensions, then style, then defaults
      const width = node.measured?.width ?? node.width ?? (node.style?.width as number) ?? 400;
      const height = node.measured?.height ?? node.height ?? (node.style?.height as number) ?? 300;

      // Track max width per column
      if (colWidths[col] === undefined || width > colWidths[col]) {
        colWidths[col] = width;
      }

      // Track max height per row
      if (rowHeights[row] === undefined || height > rowHeights[row]) {
        rowHeights[row] = height;
      }
    });

    // Second pass: position nodes using column/row max dimensions
    const arrangedNodes = nodes.map((node, index) => {
      const col = index % maxPerRow;
      const row = Math.floor(index / maxPerRow);

      // Calculate X position based on cumulative column widths
      let xPos = startX;
      for (let c = 0; c < col; c++) {
        xPos += (colWidths[c] ?? 400) + gap;
      }

      // Calculate Y position based on cumulative row heights
      let yPos = startY;
      for (let r = 0; r < row; r++) {
        yPos += (rowHeights[r] ?? 300) + gap;
      }

      return {
        ...node,
        position: {
          x: xPos,
          y: yPos,
        },
      };
    });

    useCanvasStore.getState().loadLayout({
      nodes: arrangedNodes,
      edges,
    });

    setTimeout(() => {
      fitView({ padding: 0.2, duration: 300 });
    }, 50);
  }, [nodes, edges, fitView]);

  // Clear all nodes
  const handleClear = useCallback(() => {
    if (nodes.length === 0) return;

    const confirmed = window.confirm(
      'Are you sure you want to clear all nodes? This cannot be undone.'
    );
    if (confirmed) {
      clearCanvas();
    }
  }, [nodes.length, clearCanvas]);

  // Export layout
  const handleExport = useCallback(() => {
    const layout = saveLayout();
    const blob = new Blob([JSON.stringify(layout, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `layout-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [saveLayout]);

  // Reset zoom to 100%
  const handleResetZoom = useCallback(() => {
    zoomTo(1, { duration: 300 });
  }, [zoomTo]);

  // Calculate zoom percentage
  const zoomPercent = Math.round(viewport.zoom * 100);

  // Connection status indicator
  const statusColor = {
    connected: 'bg-green-500',
    disconnected: 'bg-red-500',
    connecting: 'bg-yellow-500',
  }[connectionStatus];

  const statusText = {
    connected: 'Connected',
    disconnected: 'Disconnected',
    connecting: 'Connecting...',
  }[connectionStatus];

  return (
    <Panel className="flex flex-col gap-3">
      {/* Connection Status */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg">
        <span className={`w-2 h-2 rounded-full ${statusColor}`} />
        <span className="text-xs text-slate-400">{statusText}</span>
      </div>

      {/* Node Count */}
      <div className="px-3 py-2 bg-slate-800/50 rounded-lg">
        <div className="text-xs text-slate-400">
          {nodes.length} node{nodes.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Zoom Indicator */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg">
        <svg
          className="w-4 h-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
          />
        </svg>
        <span className={`text-xs font-medium ${zoomPercent === 100 ? 'text-green-400' : 'text-slate-400'}`}>
          {zoomPercent}%
        </span>
        {zoomPercent !== 100 && (
          <button
            onClick={handleResetZoom}
            className="ml-auto text-xs text-blue-400 hover:text-blue-300 transition-colors"
            title="Reset zoom to 100%"
          >
            Reset
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleFitView}
          disabled={nodes.length === 0}
          title="Fit all nodes in view"
        >
          <svg
            className="w-4 h-4 mr-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
          Fit View
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleArrange}
          disabled={nodes.length === 0}
          title="Arrange nodes in a grid"
        >
          <svg
            className="w-4 h-4 mr-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
          Arrange
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleExport}
          disabled={nodes.length === 0}
          title="Export layout as JSON"
        >
          <svg
            className="w-4 h-4 mr-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Export
        </Button>

        <Button
          variant="danger"
          size="sm"
          onClick={handleClear}
          disabled={nodes.length === 0}
          title="Clear all nodes"
        >
          <svg
            className="w-4 h-4 mr-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Clear
        </Button>
      </div>
    </Panel>
  );
}
