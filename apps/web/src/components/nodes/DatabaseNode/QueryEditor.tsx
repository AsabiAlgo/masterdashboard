/**
 * SQL Query Editor
 *
 * Monaco-based SQL editor with syntax highlighting and execution.
 */

'use client';

import { memo, useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import type { QueryHistoryEntry } from '@masterdashboard/shared';

// Dynamically import Monaco to avoid SSR issues
const MonacoEditor = dynamic(
  () => import('../ViewerNode/MonacoEditor').then((mod) => mod.MonacoEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-slate-900 min-h-[100px]">
        <svg className="w-5 h-5 animate-spin text-slate-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    ),
  }
);

interface QueryEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute: () => void;
  disabled?: boolean;
  executing?: boolean;
  history?: QueryHistoryEntry[];
  onSelectHistory?: (query: string) => void;
}

export const QueryEditor = memo(function QueryEditor({
  value,
  onChange,
  onExecute,
  disabled = false,
  executing = false,
  history = [],
  onSelectHistory,
}: QueryEditorProps) {
  const [showHistory, setShowHistory] = useState(false);

  const handleHistorySelect = useCallback(
    (query: string) => {
      onChange(query);
      onSelectHistory?.(query);
      setShowHistory(false);
    },
    [onChange, onSelectHistory]
  );

  // Handle Ctrl+Enter to execute
  const handleExecuteShortcut = useCallback(() => {
    if (!disabled && !executing && value.trim()) {
      onExecute();
    }
  }, [onExecute, disabled, executing, value]);

  return (
    <div className="flex flex-col border-b border-slate-700">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">SQL</span>
          <span className="text-xs text-slate-500">Ctrl+Enter to run</span>
        </div>
        <div className="flex items-center gap-2">
          {/* History Dropdown */}
          {history.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="px-2 py-1 text-xs text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                History
              </button>
              {showHistory && (
                <div className="absolute right-0 top-full mt-1 w-80 max-h-60 overflow-auto bg-slate-800 border border-slate-700 rounded shadow-xl z-10">
                  {history.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => handleHistorySelect(entry.query)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-700 border-b border-slate-700 last:border-0"
                    >
                      <div className="text-xs text-slate-400 mb-1">
                        {new Date(entry.executedAt).toLocaleString()}
                        {entry.success ? (
                          <span className="ml-2 text-green-400">{entry.rowCount} rows</span>
                        ) : (
                          <span className="ml-2 text-red-400">Failed</span>
                        )}
                      </div>
                      <div className="text-sm text-white font-mono truncate">
                        {entry.query}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Execute Button */}
          <button
            onClick={onExecute}
            disabled={disabled || executing || !value.trim()}
            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm rounded transition-colors flex items-center gap-1"
          >
            {executing ? (
              <>
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Running...
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Run
              </>
            )}
          </button>
        </div>
      </div>

      {/* Monaco SQL Editor */}
      <div className="h-[150px] nodrag nopan nowheel">
        <MonacoEditor
          value={value}
          onChange={onChange}
          language="sql"
          readOnly={disabled}
          showMinimap={false}
          wordWrap={true}
          fontSize={13}
          showLineNumbers={true}
          onExecute={handleExecuteShortcut}
        />
      </div>
    </div>
  );
});
