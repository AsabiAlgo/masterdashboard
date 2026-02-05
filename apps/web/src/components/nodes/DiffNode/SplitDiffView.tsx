/**
 * Split Diff View Component
 *
 * Renders side-by-side diff view with synchronized scrolling.
 */

'use client';

import { memo, useRef, useCallback, useEffect } from 'react';
import { DiffLine } from './DiffLine';
import type { DiffLine as DiffLineType } from '@/utils/diff';

interface SplitDiffViewProps {
  /** Diff lines to display */
  lines: DiffLineType[];
  /** Whether to show line numbers */
  showLineNumbers: boolean;
}

export const SplitDiffView = memo(function SplitDiffView({
  lines,
  showLineNumbers,
}: SplitDiffViewProps) {
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);

  // Sync scroll between panes
  const handleScroll = useCallback((source: 'left' | 'right') => {
    if (isSyncingRef.current) return;

    isSyncingRef.current = true;

    const sourcePane = source === 'left' ? leftPaneRef.current : rightPaneRef.current;
    const targetPane = source === 'left' ? rightPaneRef.current : leftPaneRef.current;

    if (sourcePane && targetPane) {
      targetPane.scrollTop = sourcePane.scrollTop;
    }

    // Use requestAnimationFrame to reset the flag after the sync
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  }, []);

  // Set up scroll listeners
  useEffect(() => {
    const leftPane = leftPaneRef.current;
    const rightPane = rightPaneRef.current;

    const handleLeftScroll = () => handleScroll('left');
    const handleRightScroll = () => handleScroll('right');

    leftPane?.addEventListener('scroll', handleLeftScroll);
    rightPane?.addEventListener('scroll', handleRightScroll);

    return () => {
      leftPane?.removeEventListener('scroll', handleLeftScroll);
      rightPane?.removeEventListener('scroll', handleRightScroll);
    };
  }, [handleScroll]);

  return (
    <div className="flex h-full" data-testid="split-view">
      {/* Left side (original) */}
      <div
        ref={leftPaneRef}
        className="flex-1 overflow-auto border-r border-slate-700"
        data-testid="left-pane"
      >
        {lines.map((line, index) => (
          <DiffLine
            key={`left-${index}`}
            type={line.type}
            lineNumber={line.leftLineNumber}
            content={line.leftContent}
            side="left"
            showLineNumbers={showLineNumbers}
          />
        ))}
        {lines.length === 0 && (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            No content
          </div>
        )}
      </div>

      {/* Right side (modified) */}
      <div
        ref={rightPaneRef}
        className="flex-1 overflow-auto"
        data-testid="right-pane"
      >
        {lines.map((line, index) => (
          <DiffLine
            key={`right-${index}`}
            type={line.type}
            lineNumber={line.rightLineNumber}
            content={line.rightContent}
            side="right"
            showLineNumbers={showLineNumbers}
          />
        ))}
        {lines.length === 0 && (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            No content
          </div>
        )}
      </div>
    </div>
  );
});
