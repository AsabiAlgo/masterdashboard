/**
 * Notes Node Component
 *
 * Sticky note node for taking and displaying notes on the canvas.
 * Supports plain text editing and markdown preview modes.
 *
 * Features:
 * - Folded corner effect
 * - Smooth transitions between modes
 * - Auto-title from first line or # heading
 * - Checkbox support for todo lists
 * - Double-click to enter edit mode
 * - Copy content button
 * - Timestamps ("Updated X min ago")
 * - Pin/lock to prevent accidental moves
 */

'use client';

import { memo, useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { type NodeProps, NodeResizer } from '@xyflow/react';
import { type NotesNodeData, type NoteColor } from '@masterdashboard/shared';
import { useCanvasStore, useProjectId } from '@/stores/canvas-store';
import { NOTE_COLORS, NOTE_COLOR_OPTIONS } from './NoteColors';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useNotes } from '@/hooks/useNotes';

/**
 * Extract title from content - first line or first # heading
 */
function extractTitle(content: string): string | null {
  if (!content.trim()) return null;

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for markdown heading
    const headingMatch = trimmed.match(/^#+\s+(.+)$/);
    if (headingMatch && headingMatch[1]) {
      const headingText = headingMatch[1];
      return headingText.slice(0, 30) + (headingText.length > 30 ? '...' : '');
    }

    // Use first non-empty line
    return trimmed.slice(0, 30) + (trimmed.length > 30 ? '...' : '');
  }

  return null;
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string | undefined): string | null {
  if (!dateString) return null;

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Sticky note icon
 */
function StickyNoteIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" />
      <path d="M15 3v6h6" />
    </svg>
  );
}

/**
 * Edit icon
 */
function EditIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

/**
 * Eye icon for preview mode
 */
function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/**
 * Copy icon
 */
function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

/**
 * Lock icon
 */
function LockIcon({ className, locked }: { className?: string; locked?: boolean }) {
  return locked ? (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ) : (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}

/**
 * Check icon for copy feedback
 */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

interface NotesNodeProps extends NodeProps {
  data: NotesNodeData;
}

export const NotesNode = memo(function NotesNode({
  id,
  data,
  selected,
}: NotesNodeProps) {
  const { updateNodeData, removeNode, getNode } = useCanvasStore();
  const projectId = useProjectId();
  const { syncNote, deleteNote, createNote } = useNotes(projectId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const colorConfig = NOTE_COLORS[data.color] || NOTE_COLORS.yellow;
  const title = useMemo(() => extractTitle(data.content), [data.content]);
  const relativeTime = useMemo(() => formatRelativeTime(data.updatedAt), [data.updatedAt]);

  // Create note in backend when first mounted and has no sessionId
  useEffect(() => {
    if (!data.sessionId && projectId) {
      const node = getNode(id);
      if (node) {
        const width = (node.style?.width as number) || 300;
        const height = (node.style?.height as number) || 200;
        createNote(id, {
          content: data.content || '',
          color: data.color || 'yellow',
          mode: data.mode || 'edit',
          positionX: node.position.x,
          positionY: node.position.y,
          width,
          height,
        });
      }
    }
  }, [id, projectId]);

  // Sync note to backend when data changes (debounced)
  useEffect(() => {
    if (!data.sessionId || !projectId) return;

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      const node = getNode(id);
      if (node && data.sessionId) {
        const width = (node.style?.width as number) || 300;
        const height = (node.style?.height as number) || 200;
        syncNote(data.sessionId, data, node.position, { width, height });
      }
    }, 500);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [id, data, projectId, getNode, syncNote]);

  // Auto-switch mode based on selection (only if not locked)
  useEffect(() => {
    if (data.locked) return;

    if (selected && data.mode !== 'edit') {
      updateNodeData<NotesNodeData>(id, { mode: 'edit' });
    } else if (!selected && data.mode !== 'preview') {
      updateNodeData<NotesNodeData>(id, { mode: 'preview' });
    }
  }, [selected, id, data.mode, data.locked, updateNodeData]);

  // Focus textarea when entering edit mode and selected
  useEffect(() => {
    if (selected && data.mode === 'edit' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [selected, data.mode]);

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData<NotesNodeData>(id, { content: e.target.value });
    },
    [id, updateNodeData]
  );

  const toggleMode = useCallback(() => {
    updateNodeData<NotesNodeData>(id, {
      mode: data.mode === 'edit' ? 'preview' : 'edit',
    });
  }, [id, data.mode, updateNodeData]);

  const handleColorChange = useCallback(
    (color: NoteColor) => {
      updateNodeData<NotesNodeData>(id, { color });
      setShowColorPicker(false);
    },
    [id, updateNodeData]
  );

  const handleClose = useCallback(() => {
    if (data.sessionId) {
      deleteNote(data.sessionId);
    }
    removeNode(id);
  }, [id, data.sessionId, removeNode, deleteNote]);

  const handleCopy = useCallback(async () => {
    if (!data.content) return;
    try {
      await navigator.clipboard.writeText(data.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API might not be available
    }
  }, [data.content]);

  const handleToggleLock = useCallback(() => {
    updateNodeData<NotesNodeData>(id, { locked: !data.locked });
  }, [id, data.locked, updateNodeData]);

  const handleDoubleClick = useCallback(() => {
    if (data.mode === 'preview') {
      updateNodeData<NotesNodeData>(id, { mode: 'edit' });
    }
  }, [id, data.mode, updateNodeData]);

  // Handle checkbox toggle in preview mode
  const handleCheckboxToggle = useCallback(
    (lineIndex: number, checked: boolean) => {
      const lines = data.content.split('\n');
      const line = lines[lineIndex];
      if (!line) return;

      // Toggle the checkbox
      let newLine: string;
      if (checked) {
        newLine = line.replace(/\[\s*\]/, '[x]');
      } else {
        newLine = line.replace(/\[x\]/i, '[ ]');
      }

      const newLines = [...lines];
      newLines[lineIndex] = newLine;
      updateNodeData<NotesNodeData>(id, { content: newLines.join('\n') });
    },
    [id, data.content, updateNodeData]
  );

  return (
    <>
      {/* Resizer - disabled when locked */}
      <NodeResizer
        minWidth={200}
        minHeight={150}
        isVisible={selected && !data.locked}
        lineClassName={`!border-2 ${colorConfig.border}`}
        handleClassName={`!w-3 !h-3 ${colorConfig.bg} ${colorConfig.border}`}
      />

      <div
        className={`
          h-full flex flex-col
          rounded-lg overflow-hidden shadow-lg
          transition-all duration-200 ease-in-out
          ${selected ? 'ring-2 ring-blue-500' : `ring-1 ${colorConfig.border}`}
          ${colorConfig.bg}
          ${data.locked ? 'cursor-default' : ''}
        `}
        style={{ position: 'relative' }}
      >
        {/* Folded corner effect */}
        <div
          className="absolute top-0 right-0 w-6 h-6 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, transparent 50%, ${colorConfig.fold} 50%)`,
            boxShadow: `inset -1px 1px 1px ${colorConfig.foldShadow}`,
          }}
        />

        {/* Header */}
        <div
          className={`
            flex items-center justify-between px-3 py-2
            ${colorConfig.header}
            ${data.locked ? 'cursor-default' : 'cursor-move'}
            select-none
          `}
        >
          {/* Left side: Icon and Title */}
          <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
            <StickyNoteIcon className={`w-4 h-4 flex-shrink-0 ${colorConfig.text}`} />
            <span className={`font-medium text-sm truncate ${colorConfig.text}`}>
              {title || 'Note'}
            </span>
            {relativeTime && (
              <span className={`text-xs opacity-60 flex-shrink-0 ${colorConfig.text}`}>
                · {relativeTime}
              </span>
            )}
          </div>

          {/* Right side: Actions */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Lock/Pin button */}
            <button
              className={`p-1 hover:bg-black/10 rounded transition-colors ${colorConfig.text} ${data.locked ? 'bg-black/10' : ''}`}
              onClick={handleToggleLock}
              title={data.locked ? 'Unlock note' : 'Lock note'}
            >
              <LockIcon className="w-3.5 h-3.5" locked={data.locked} />
            </button>

            {/* Copy button */}
            <button
              className={`p-1 hover:bg-black/10 rounded transition-colors ${colorConfig.text}`}
              onClick={handleCopy}
              title="Copy content"
            >
              {copied ? (
                <CheckIcon className="w-3.5 h-3.5" />
              ) : (
                <CopyIcon className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Color Picker */}
            <div className="relative">
              <button
                className={`p-1 hover:bg-black/10 rounded transition-colors ${colorConfig.text}`}
                onClick={() => setShowColorPicker(!showColorPicker)}
                title="Change color"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="8" />
                </svg>
              </button>

              {showColorPicker && (
                <div className="absolute top-full right-0 mt-1 p-2 bg-white rounded-lg shadow-xl border border-gray-200 flex gap-1 z-50">
                  {NOTE_COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded-full ${NOTE_COLORS[color].bg} ${NOTE_COLORS[color].border} border-2 hover:scale-110 transition-transform ${
                        data.color === color ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                      }`}
                      onClick={() => handleColorChange(color)}
                      title={color.charAt(0).toUpperCase() + color.slice(1)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Mode Toggle */}
            <button
              className={`p-1 hover:bg-black/10 rounded transition-colors ${colorConfig.text}`}
              onClick={toggleMode}
              title={data.mode === 'edit' ? 'Preview' : 'Edit'}
            >
              {data.mode === 'edit' ? (
                <EyeIcon className="w-3.5 h-3.5" />
              ) : (
                <EditIcon className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Close button */}
            <button
              className={`p-1 hover:bg-black/10 rounded transition-colors ${colorConfig.text}`}
              onClick={handleClose}
              title="Close"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-hidden p-3 transition-opacity duration-200"
          onDoubleClick={handleDoubleClick}
        >
          {data.mode === 'edit' ? (
            <textarea
              ref={textareaRef}
              value={data.content || ''}
              onChange={handleContentChange}
              placeholder="Write your note here...

Supports markdown:
- **bold** and *italic*
- # Headers
- Lists
- `code`
- [ ] Checkboxes"
              className={`
                w-full h-full resize-none outline-none
                bg-transparent text-sm
                ${colorConfig.text}
                placeholder:${colorConfig.text} placeholder:opacity-50
                transition-opacity duration-200
              `}
              style={{ fontFamily: 'inherit' }}
            />
          ) : (
            <div className="h-full overflow-auto transition-opacity duration-200">
              <MarkdownRenderer
                content={data.content || ''}
                textColor={colorConfig.text}
                onCheckboxToggle={handleCheckboxToggle}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
});
