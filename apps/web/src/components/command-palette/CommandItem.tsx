/**
 * CommandItem Component
 *
 * Renders a single command in the command palette with icon, title, and shortcut.
 */

'use client';

import type { Command } from '@/hooks/useCommands';
import { fuzzyMatch, highlightMatches } from '@/utils/fuzzy-search';

interface CommandItemProps {
  command: Command;
  isSelected: boolean;
  query: string;
  onClick: () => void;
}

export function CommandItem({
  command,
  isSelected,
  query,
  onClick,
}: CommandItemProps) {
  // Get match indices for highlighting
  const titleMatch = fuzzyMatch(query, command.title);
  const titleParts = highlightMatches(command.title, titleMatch.indices);

  return (
    <button
      data-testid="command-item"
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
        className={`flex-shrink-0 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`}
      >
        {command.icon}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title with highlighting */}
        <div className="text-sm font-medium">
          {titleParts.map((part, i) => (
            <span
              key={i}
              className={part.highlighted ? 'text-blue-400 font-semibold' : ''}
            >
              {part.text}
            </span>
          ))}
        </div>

        {/* Description */}
        {command.description && (
          <div className="text-xs text-slate-500 truncate">{command.description}</div>
        )}
      </div>

      {/* Shortcut */}
      {command.shortcut && (
        <kbd
          className={`
            flex-shrink-0 px-1.5 py-0.5 text-[10px] font-mono rounded
            ${
              isSelected
                ? 'bg-blue-500/30 text-blue-300'
                : 'bg-slate-700 text-slate-400'
            }
          `}
        >
          {command.shortcut}
        </kbd>
      )}

      {/* Category badge */}
      {command.category && (
        <span
          className={`
            flex-shrink-0 px-1.5 py-0.5 text-[10px] rounded
            ${
              isSelected
                ? 'bg-slate-600/50 text-slate-300'
                : 'bg-slate-800 text-slate-500'
            }
          `}
        >
          {command.category}
        </span>
      )}
    </button>
  );
}
