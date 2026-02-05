/**
 * FileItem Component
 *
 * Renders a single file result in the command palette quick open mode.
 */

'use client';

import type { FileResult } from '@/hooks/useQuickOpen';
import { fuzzyMatch, highlightMatches } from '@/utils/fuzzy-search';

interface FileItemProps {
  file: FileResult;
  isSelected: boolean;
  query: string;
  onClick: () => void;
}

// File extension to icon mapping
function getFileIcon(extension: string, isDirectory: boolean): React.ReactNode {
  if (isDirectory) {
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
        />
      </svg>
    );
  }

  // Color based on file type
  const colors: Record<string, string> = {
    ts: 'text-blue-400',
    tsx: 'text-blue-400',
    js: 'text-yellow-400',
    jsx: 'text-yellow-400',
    json: 'text-yellow-500',
    md: 'text-slate-400',
    css: 'text-pink-400',
    scss: 'text-pink-400',
    html: 'text-orange-400',
    py: 'text-green-400',
    go: 'text-cyan-400',
    rs: 'text-orange-500',
    sh: 'text-green-500',
    yaml: 'text-red-400',
    yml: 'text-red-400',
    sql: 'text-blue-300',
    env: 'text-yellow-600',
    gitignore: 'text-orange-600',
  };

  const colorClass = colors[extension.toLowerCase()] || 'text-slate-500';

  return (
    <svg
      className={`w-4 h-4 ${colorClass}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileItem({ file, isSelected, query, onClick }: FileItemProps) {
  // Get match indices for highlighting on the file name
  const nameMatch = fuzzyMatch(query, file.name);
  const nameParts = highlightMatches(file.name, nameMatch.indices);

  // Extract directory path
  const dirPath = file.path.slice(0, file.path.length - file.name.length - 1);
  const shortPath = dirPath.startsWith('/')
    ? dirPath
    : `/${dirPath}`;

  return (
    <button
      data-testid="file-item"
      data-selected={isSelected}
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-2.5 text-left
        transition-colors duration-75
        ${
          isSelected
            ? 'bg-blue-500/20 text-slate-100'
            : 'text-slate-300 hover:bg-slate-700/50'
        }
      `}
    >
      {/* Icon */}
      <span
        className={`flex-shrink-0 ${isSelected ? 'text-blue-400' : ''}`}
      >
        {getFileIcon(file.extension, file.type === 'directory')}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* File name with highlighting */}
        <div className="text-sm font-medium flex items-center gap-2">
          <span>
            {nameParts.map((part, i) => (
              <span
                key={i}
                className={part.highlighted ? 'text-blue-400 font-semibold' : ''}
              >
                {part.text}
              </span>
            ))}
          </span>
        </div>

        {/* Path */}
        <div className="text-xs text-slate-500 truncate">{shortPath}</div>
      </div>

      {/* File size */}
      {file.size !== undefined && file.type === 'file' && (
        <span
          className={`
            flex-shrink-0 text-[10px] font-mono
            ${isSelected ? 'text-slate-400' : 'text-slate-600'}
          `}
        >
          {formatFileSize(file.size)}
        </span>
      )}

      {/* Extension badge */}
      {file.extension && (
        <span
          className={`
            flex-shrink-0 px-1.5 py-0.5 text-[10px] rounded uppercase
            ${
              isSelected
                ? 'bg-slate-600/50 text-slate-300'
                : 'bg-slate-800 text-slate-500'
            }
          `}
        >
          {file.extension}
        </span>
      )}
    </button>
  );
}
