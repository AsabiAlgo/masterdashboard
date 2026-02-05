/**
 * Tooltip Component
 *
 * Simple tooltip component using CSS-only approach.
 */

'use client';

import { type ReactNode } from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  /** Element to wrap with tooltip */
  children: ReactNode;
  /** Tooltip content */
  content: string;
  /** Tooltip position */
  position?: TooltipPosition;
  /** Additional CSS classes */
  className?: string;
}

const positionClasses: Record<TooltipPosition, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const arrowClasses: Record<TooltipPosition, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-700 border-x-transparent border-b-transparent',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-700 border-x-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-700 border-y-transparent border-r-transparent',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-700 border-y-transparent border-l-transparent',
};

export function Tooltip({
  children,
  content,
  position = 'top',
  className = '',
}: TooltipProps) {
  return (
    <div className={`relative group inline-block ${className}`}>
      {children}
      <div
        className={`
          absolute z-50
          ${positionClasses[position]}
          px-2 py-1
          bg-slate-800 text-slate-200
          text-xs font-medium
          rounded shadow-lg
          border border-slate-700
          whitespace-nowrap
          opacity-0 invisible
          group-hover:opacity-100 group-hover:visible
          transition-all duration-150
          pointer-events-none
        `}
      >
        {content}
        {/* Arrow */}
        <span
          className={`
            absolute
            ${arrowClasses[position]}
            border-4
          `}
        />
      </div>
    </div>
  );
}
