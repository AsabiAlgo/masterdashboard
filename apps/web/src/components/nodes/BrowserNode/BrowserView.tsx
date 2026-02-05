/**
 * Browser View Component
 *
 * Displays screencast frames from the browser and handles user input.
 * Maps mouse and keyboard events to browser coordinates.
 */

'use client';

import { useRef, useCallback, memo, useEffect } from 'react';
import type { BrowserInputPayload, BrowserInputType } from '@masterdashboard/shared';

interface BrowserViewProps {
  /** Current screencast frame (data URL) */
  frame: string | null;
  /** Handler for input events */
  onInput: (input: Omit<BrowserInputPayload, 'sessionId'>) => void;
  /** Whether interactive mode is enabled */
  isInteractive: boolean;
  /** Whether the node is selected (needed for scroll handling) */
  selected?: boolean;
  /** Browser viewport width */
  viewportWidth?: number;
  /** Browser viewport height */
  viewportHeight?: number;
}

export const BrowserView = memo(function BrowserView({
  frame,
  onInput,
  isInteractive,
  selected = false,
  viewportWidth = 1280,
  viewportHeight = 720,
}: BrowserViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);  // Track if actual drag movement occurred
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  // Convert container coordinates to viewport coordinates
  const getCoordinates = useCallback(
    (e: React.MouseEvent): { x: number; y: number } => {
      const imgRect = imageRef.current?.getBoundingClientRect();
      if (!imgRect) return { x: 0, y: 0 };

      // Get mouse position relative to the image element
      const relativeX = e.clientX - imgRect.left;
      const relativeY = e.clientY - imgRect.top;

      // Calculate scale from actual rendered image size
      const scale = imgRect.width / viewportWidth;

      // Convert to viewport coordinates
      return {
        x: Math.round(Math.max(0, Math.min(viewportWidth, relativeX / scale))),
        y: Math.round(Math.max(0, Math.min(viewportHeight, relativeY / scale))),
      };
    },
    [viewportWidth, viewportHeight]
  );

  // Get modifier keys from event
  const getModifiers = useCallback((e: React.KeyboardEvent | React.MouseEvent) => {
    return {
      ctrl: e.ctrlKey,
      alt: e.altKey,
      shift: e.shiftKey,
      meta: e.metaKey,
    };
  }, []);

  // Handle mouse click - only for simple clicks, not drags
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isInteractive) return;

      // Skip if this was a drag operation (movement occurred)
      if (hasDraggedRef.current) {
        hasDraggedRef.current = false;
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const { x, y } = getCoordinates(e);
      const type: BrowserInputType = e.detail === 2 ? 'dblclick' : 'click';

      onInput({
        type,
        x,
        y,
        modifiers: getModifiers(e),
      });
    },
    [isInteractive, getCoordinates, getModifiers, onInput]
  );

  // Handle mouse down - start potential drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isInteractive) return;
      e.stopPropagation();

      // Focus the container for keyboard events
      containerRef.current?.focus();

      // Track that we're potentially starting a drag
      isDraggingRef.current = true;
      hasDraggedRef.current = false;
      const { x, y } = getCoordinates(e);
      mouseDownPosRef.current = { x, y };
    },
    [isInteractive, getCoordinates]
  );

  // Handle mouse up - end drag
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!isInteractive) return;
      e.stopPropagation();

      // Only send mouseup if we actually dragged
      if (hasDraggedRef.current) {
        const { x, y } = getCoordinates(e);
        onInput({
          type: 'mouseup',
          x,
          y,
          modifiers: getModifiers(e),
        });
      }

      isDraggingRef.current = false;
      mouseDownPosRef.current = null;
    },
    [isInteractive, getCoordinates, getModifiers, onInput]
  );

  // Handle context menu (right-click)
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!isInteractive) return;
      e.preventDefault();
      e.stopPropagation();

      const { x, y } = getCoordinates(e);
      onInput({
        type: 'rightclick',
        x,
        y,
        modifiers: getModifiers(e),
      });
    },
    [isInteractive, getCoordinates, getModifiers, onInput]
  );

  // Handle mouse wheel scroll - only when selected to prevent canvas zoom
  // Using React synthetic event as fallback
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!isInteractive || !selected) return;
      e.preventDefault();
      e.stopPropagation();

      const { x, y } = getCoordinates(e);
      onInput({
        type: 'scroll',
        x,
        y,
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        modifiers: getModifiers(e),
      });
    },
    [isInteractive, selected, getCoordinates, getModifiers, onInput]
  );

  // Attach native wheel event listener with passive: false
  // This is needed because React's synthetic events are passive by default
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      if (!isInteractive || !selected) return;

      // Prevent canvas zoom and default scroll behavior
      e.preventDefault();
      e.stopPropagation();

      const imgRect = imageRef.current?.getBoundingClientRect();
      if (!imgRect) return;

      const relativeX = e.clientX - imgRect.left;
      const relativeY = e.clientY - imgRect.top;
      const scale = imgRect.width / viewportWidth;

      const x = Math.round(Math.max(0, Math.min(viewportWidth, relativeX / scale)));
      const y = Math.round(Math.max(0, Math.min(viewportHeight, relativeY / scale)));

      onInput({
        type: 'scroll',
        x,
        y,
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        modifiers: {
          ctrl: e.ctrlKey,
          alt: e.altKey,
          shift: e.shiftKey,
          meta: e.metaKey,
        },
      });
    };

    container.addEventListener('wheel', handleNativeWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleNativeWheel);
    };
  }, [isInteractive, selected, viewportWidth, viewportHeight, onInput]);

  // Handle mouse move - for dragging operations
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isInteractive || !isDraggingRef.current) return;

      const { x, y } = getCoordinates(e);

      // Check if we've moved enough to consider this a drag (5px threshold)
      if (!hasDraggedRef.current && mouseDownPosRef.current) {
        const dx = Math.abs(x - mouseDownPosRef.current.x);
        const dy = Math.abs(y - mouseDownPosRef.current.y);
        if (dx > 5 || dy > 5) {
          // This is a drag - send mousedown at original position first
          hasDraggedRef.current = true;
          e.stopPropagation();
          onInput({
            type: 'mousedown',
            x: mouseDownPosRef.current.x,
            y: mouseDownPosRef.current.y,
            modifiers: getModifiers(e),
          });
        }
      }

      // Send mousemove if we're actively dragging
      if (hasDraggedRef.current) {
        e.stopPropagation();
        onInput({
          type: 'mousemove',
          x,
          y,
          modifiers: getModifiers(e),
        });
      }
    },
    [isInteractive, getCoordinates, getModifiers, onInput]
  );

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isInteractive) return;
      e.preventDefault();

      const modifiers = getModifiers(e);
      const key = e.key;

      // Handle typing for single characters
      if (key.length === 1 && !modifiers.ctrl && !modifiers.meta) {
        onInput({
          type: 'type',
          text: key,
          modifiers,
        });
      } else {
        // Handle special keys
        onInput({
          type: 'keypress',
          key: mapKey(key),
          modifiers,
        });
      }
    },
    [isInteractive, getModifiers, onInput]
  );

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-gray-900 flex items-center justify-center overflow-hidden outline-none"
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onKeyDown={handleKeyDown}
      tabIndex={isInteractive ? 0 : -1}
      style={{
        cursor: isInteractive ? 'default' : 'not-allowed',
      }}
    >
      {frame ? (
        <img
          ref={imageRef}
          src={frame}
          alt="Browser viewport"
          className="pointer-events-none select-none max-w-full max-h-full"
          style={{
            objectFit: 'contain',
            imageRendering: 'auto',
          }}
          draggable={false}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-gray-500">
          <LoadingSpinner />
          <span className="mt-2 text-sm">Loading browser...</span>
        </div>
      )}
    </div>
  );
});

/**
 * Map key names to Playwright-compatible key names
 */
function mapKey(key: string): string {
  const keyMap: Record<string, string> = {
    Enter: 'Enter',
    Backspace: 'Backspace',
    Delete: 'Delete',
    Tab: 'Tab',
    Escape: 'Escape',
    ArrowUp: 'ArrowUp',
    ArrowDown: 'ArrowDown',
    ArrowLeft: 'ArrowLeft',
    ArrowRight: 'ArrowRight',
    Home: 'Home',
    End: 'End',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
    Insert: 'Insert',
    F1: 'F1',
    F2: 'F2',
    F3: 'F3',
    F4: 'F4',
    F5: 'F5',
    F6: 'F6',
    F7: 'F7',
    F8: 'F8',
    F9: 'F9',
    F10: 'F10',
    F11: 'F11',
    F12: 'F12',
    ' ': 'Space',
  };

  return keyMap[key] || key;
}

/**
 * Loading spinner component
 */
function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-8 w-8 text-gray-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
