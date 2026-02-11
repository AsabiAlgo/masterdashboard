/**
 * Base Node Component
 *
 * Wrapper component providing consistent styling and functionality
 * for all node types (Terminal, Browser, SSH).
 */

'use client';

import { memo, type ReactNode } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useCanvasStore } from '@/stores/canvas-store';

interface BaseNodeProps {
  /** Node ID */
  id: string;
  /** Content to render inside the node */
  children: ReactNode;
  /** Node title displayed in the header */
  title: string;
  /** Icon to display in the header */
  icon?: ReactNode;
  /** Header background color (CSS hex value) */
  headerColor?: string;
  /** Border color (CSS hex value) */
  borderColor?: string;
  /** Whether the node is connected to a session */
  connected?: boolean;
  /** Whether the node is selected */
  selected?: boolean;
  /** Show input handle on the left */
  showInputHandle?: boolean;
  /** Show output handle on the right */
  showOutputHandle?: boolean;
  /** Custom header actions */
  headerActions?: ReactNode;
  /** Custom status indicator (replaces default connection indicator) */
  statusIndicator?: ReactNode;
}

export const BaseNode = memo(function BaseNode({
  id,
  children,
  title,
  icon,
  headerColor = '#475569',
  borderColor = '#334155',
  connected = false,
  selected,
  showInputHandle = true,
  showOutputHandle = true,
  headerActions,
  statusIndicator,
}: BaseNodeProps) {
  const { removeNode } = useCanvasStore();

  // Default status indicator color (used if no custom statusIndicator provided)
  const statusColor = connected ? 'bg-green-500' : 'bg-slate-500';

  return (
    <div
      className="h-full flex flex-col rounded-lg overflow-hidden shadow-2xl bg-slate-900"
      style={{
        boxShadow: selected
          ? `0 0 0 2px ${borderColor}`
          : `0 0 0 1px ${borderColor}`,
      }}
    >
      {/* Header - Draggable area */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-move select-none"
        style={{ backgroundColor: headerColor }}
      >
        {/* Left side: Icon, Title, Status */}
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-white/80 flex-shrink-0">{icon}</span>}
          <span className="text-white font-medium text-sm truncate">
            {title}
          </span>
          {/* Custom status indicator or default connection indicator */}
          {statusIndicator || (
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor}`}
              title={connected ? 'Connected' : 'Disconnected'}
            />
          )}
        </div>

        {/* Right side: Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {headerActions}
          <button
            className="p-1 hover:bg-black/20 rounded transition-colors"
            onClick={() => removeNode(id)}
            title="Close"
          >
            <svg
              className="w-3.5 h-3.5 text-white/70"
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
      <div className="relative overflow-hidden flex-1">{children}</div>

      {/* Connection Handles */}
      {showInputHandle && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-slate-500 !border-2 !border-slate-400"
        />
      )}
      {showOutputHandle && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-slate-500 !border-2 !border-slate-400"
        />
      )}
    </div>
  );
});
