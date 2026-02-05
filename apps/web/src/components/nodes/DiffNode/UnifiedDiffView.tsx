/**
 * Unified Diff View Component
 *
 * Renders inline/unified diff view.
 */

'use client';

import { memo } from 'react';
import type { DiffLine as DiffLineType, DiffLineType as DiffLineTypeEnum } from '@/utils/diff';

interface UnifiedDiffViewProps {
  /** Diff lines to display */
  lines: DiffLineType[];
  /** Whether to show line numbers */
  showLineNumbers: boolean;
}

const bgColors: Record<DiffLineTypeEnum, string> = {
  unchanged: 'bg-transparent',
  added: 'bg-green-900/30',
  removed: 'bg-red-900/30',
};

const textColors: Record<DiffLineTypeEnum, string> = {
  unchanged: 'text-slate-300',
  added: 'text-green-300',
  removed: 'text-red-300',
};

const prefixes: Record<DiffLineTypeEnum, string> = {
  unchanged: ' ',
  added: '+',
  removed: '-',
};

export const UnifiedDiffView = memo(function UnifiedDiffView({
  lines,
  showLineNumbers,
}: UnifiedDiffViewProps) {
  return (
    <div className="h-full overflow-auto" data-testid="unified-view">
      {lines.map((line, index) => {
        const bgColor = bgColors[line.type];
        const textColor = textColors[line.type];
        const prefix = prefixes[line.type];

        // Get content and line numbers based on type
        const content = line.type === 'removed' ? line.leftContent : line.rightContent ?? line.leftContent;
        const leftNum = line.leftLineNumber;
        const rightNum = line.rightLineNumber;

        return (
          <div
            key={index}
            className={`flex h-6 ${bgColor} font-mono text-sm`}
            data-testid={`unified-line-${line.type}`}
          >
            {showLineNumbers && (
              <>
                <span className="w-10 px-1 text-right text-slate-500 select-none border-r border-slate-800 flex-shrink-0">
                  {leftNum ?? ''}
                </span>
                <span className="w-10 px-1 text-right text-slate-500 select-none border-r border-slate-800 flex-shrink-0">
                  {rightNum ?? ''}
                </span>
              </>
            )}
            <span className={`w-4 text-center ${textColor} flex-shrink-0`}>{prefix}</span>
            <pre className={`flex-1 px-2 ${textColor} whitespace-pre overflow-hidden text-ellipsis`}>
              {content}
            </pre>
          </div>
        );
      })}
      {lines.length === 0 && (
        <div className="flex items-center justify-center h-full text-slate-500 text-sm">
          No changes to display
        </div>
      )}
    </div>
  );
});
