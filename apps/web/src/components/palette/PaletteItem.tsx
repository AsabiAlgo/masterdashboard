/**
 * Palette Item Component
 *
 * Individual draggable item in the node palette.
 */

'use client';

import { NodeType } from '@masterdashboard/shared';

interface PaletteItemProps {
  type: NodeType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  onDragStart: (event: React.DragEvent) => void;
}

export function PaletteItem({
  label,
  description,
  icon,
  color,
  onDragStart,
}: PaletteItemProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-grab active:cursor-grabbing transition-colors border border-slate-700 hover:border-slate-600 group"
    >
      {/* Icon */}
      <div className={`p-2 rounded-lg ${color} text-white`}>{icon}</div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-100">{label}</p>
        <p className="text-xs text-slate-400 truncate">{description}</p>
      </div>

      {/* Drag Indicator */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <svg
          className="w-4 h-4 text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8h16M4 16h16"
          />
        </svg>
      </div>
    </div>
  );
}
