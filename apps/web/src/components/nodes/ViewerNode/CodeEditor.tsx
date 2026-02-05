/**
 * Code Editor Component
 *
 * A simple text editor with line numbers and monospace font.
 */

'use client';

import { memo, useCallback, useEffect, useRef } from 'react';

interface CodeEditorProps {
  content: string;
  onChange: (content: string) => void;
  showLineNumbers: boolean;
  wordWrap: boolean;
  onSave?: () => void;
}

export const CodeEditor = memo(function CodeEditor({
  content,
  onChange,
  showLineNumbers,
  wordWrap,
  onSave,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Calculate line numbers
  const lines = content.split('\n');
  const lineCount = lines.length;
  const lineNumberWidth = lineCount.toString().length;

  // Sync scroll between line numbers and textarea
  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // Handle content change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      onSave?.();
    }

    // Tab handling for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (e.shiftKey) {
        // Shift+Tab: Remove indentation
        const lineStart = content.lastIndexOf('\n', start - 1) + 1;
        const lineContent = content.substring(lineStart, start);
        const spaces = lineContent.match(/^(\t| {1,2})/);
        if (spaces) {
          const newContent = content.substring(0, lineStart) +
            content.substring(lineStart + spaces[0].length);
          onChange(newContent);
          // Adjust cursor position
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start - spaces[0].length;
          }, 0);
        }
      } else {
        // Tab: Add indentation (2 spaces)
        const newContent = content.substring(0, start) + '  ' + content.substring(end);
        onChange(newContent);
        // Move cursor after inserted spaces
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);
      }
    }
  }, [content, onChange, onSave]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <div className="h-full flex bg-slate-900 font-mono text-sm">
      {/* Line numbers */}
      {showLineNumbers && (
        <div
          ref={lineNumbersRef}
          className="flex-shrink-0 bg-slate-900 text-slate-500 select-none overflow-hidden border-r border-slate-800"
          style={{ minWidth: `${lineNumberWidth + 3}ch` }}
        >
          <div className="py-2">
            {Array.from({ length: lineCount }, (_, i) => (
              <div
                key={i + 1}
                className="px-3 text-right leading-6"
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editor textarea */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          className={`
            w-full h-full resize-none bg-transparent text-slate-200
            px-4 py-2 leading-6 outline-none
            ${wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-x-auto'}
          `}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          data-gramm="false"
        />
      </div>
    </div>
  );
});
