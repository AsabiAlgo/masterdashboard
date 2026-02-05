/**
 * Diff Line Component
 *
 * Renders a single line in the diff view with appropriate styling.
 */

'use client';

import { memo } from 'react';
import type { DiffLineType } from '@/utils/diff';

interface DiffLineProps {
  /** Type of change */
  type: DiffLineType;
  /** Line number (left or right depending on context) */
  lineNumber?: number;
  /** Content to display */
  content?: string;
  /** Which side this line is on (for split view) */
  side: 'left' | 'right';
  /** Whether to show line numbers */
  showLineNumbers: boolean;
}

const bgColors: Record<DiffLineType, string> = {
  unchanged: 'bg-transparent',
  added: 'bg-green-900/30',
  removed: 'bg-red-900/30',
};

const textColors: Record<DiffLineType, string> = {
  unchanged: 'text-slate-300',
  added: 'text-green-300',
  removed: 'text-red-300',
};

const prefixes: Record<DiffLineType, string> = {
  unchanged: ' ',
  added: '+',
  removed: '-',
};

export const DiffLine = memo(function DiffLine({
  type,
  lineNumber,
  content,
  side,
  showLineNumbers,
}: DiffLineProps) {
  const bgColor = bgColors[type];
  const textColor = textColors[type];
  const prefix = prefixes[type];

  // In split view: left side shows placeholder for added, right shows placeholder for removed
  const isPlaceholder =
    (side === 'left' && type === 'added') || (side === 'right' && type === 'removed');

  if (isPlaceholder) {
    return (
      <div
        className={`flex h-6 ${bgColor} opacity-50`}
        data-testid={`diff-line-placeholder-${side}`}
      >
        {showLineNumbers && (
          <span className="w-12 px-2 text-right text-slate-600 select-none border-r border-slate-800" />
        )}
        <span className="w-4" />
        <span className="flex-1" />
      </div>
    );
  }

  return (
    <div
      className={`flex h-6 ${bgColor} font-mono text-sm`}
      data-testid={`diff-line-${type}`}
    >
      {showLineNumbers && (
        <span className="w-12 px-2 text-right text-slate-500 select-none border-r border-slate-800 flex-shrink-0">
          {lineNumber}
        </span>
      )}
      <span className={`w-4 text-center ${textColor} flex-shrink-0`}>{prefix}</span>
      <pre className={`flex-1 px-2 ${textColor} whitespace-pre overflow-hidden text-ellipsis`}>
        {content}
      </pre>
    </div>
  );
});
