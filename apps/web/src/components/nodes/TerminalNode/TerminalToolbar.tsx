/**
 * Terminal Toolbar Component
 *
 * Provides terminal controls including search, copy, clear, and settings.
 */

'use client';

import { useState, useCallback, type KeyboardEvent } from 'react';
import { TerminalActivityStatus } from '@masterdashboard/shared';

/**
 * Search icon component
 */
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

/**
 * Copy icon component
 */
function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

/**
 * Clear/trash icon component
 */
function ClearIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

/**
 * Settings/cog icon component
 */
function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

/**
 * Reconnect icon component
 */
function ReconnectIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

/**
 * Close icon component
 */
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
  );
}

interface TerminalToolbarProps {
  /** Callback to copy selection or all content */
  onCopy: () => void;
  /** Callback to clear the terminal */
  onClear: () => void;
  /** Callback to open settings */
  onSettings: () => void;
  /** Callback to reconnect */
  onReconnect?: () => void;
  /** Whether connected to session */
  connected: boolean;
  /** Whether currently connecting */
  connecting?: boolean;
  /** Whether reconnecting to existing session */
  isReconnecting?: boolean;
  /** Current working directory */
  cwd?: string;
  /** Optional search functionality */
  enableSearch?: boolean;
  /** Search callback */
  onSearch?: (query: string, direction: 'next' | 'prev') => void;
  /** Current activity status */
  activityStatus?: TerminalActivityStatus;
}

/**
 * Activity status labels and colors
 */
const ACTIVITY_STATUS_CONFIG: Record<
  TerminalActivityStatus,
  { label: string; color: string; textColor: string }
> = {
  [TerminalActivityStatus.WORKING]: {
    label: 'Working',
    color: 'bg-green-500',
    textColor: 'text-green-400',
  },
  [TerminalActivityStatus.WAITING]: {
    label: 'Waiting',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-400',
  },
  [TerminalActivityStatus.ERROR]: {
    label: 'Error',
    color: 'bg-red-500',
    textColor: 'text-red-400',
  },
  [TerminalActivityStatus.IDLE]: {
    label: 'Idle',
    color: 'bg-slate-500',
    textColor: 'text-slate-400',
  },
};

export function TerminalToolbar({
  onCopy,
  onClear,
  onSettings,
  onReconnect,
  connected,
  connecting = false,
  isReconnecting = false,
  cwd,
  enableSearch = false,
  onSearch,
  activityStatus = TerminalActivityStatus.IDLE,
}: TerminalToolbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [onCopy]);

  const handleSearch = useCallback(() => {
    if (searchQuery && onSearch) {
      onSearch(searchQuery, 'next');
    }
  }, [searchQuery, onSearch]);

  const handleSearchKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSearch();
      } else if (e.key === 'Escape') {
        setShowSearch(false);
        setSearchQuery('');
      }
    },
    [handleSearch]
  );

  const handleToggleSearch = useCallback(() => {
    setShowSearch((prev) => !prev);
    if (!showSearch) {
      setSearchQuery('');
    }
  }, [showSearch]);

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-800/90 border-b border-slate-700">
      {/* Connection status + Activity Status + CWD */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {connecting ? (
          <span className="flex items-center gap-1.5 text-xs text-yellow-400">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            {isReconnecting ? 'Reconnecting...' : 'Connecting...'}
          </span>
        ) : !connected ? (
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            Disconnected
          </span>
        ) : (
          <>
            {/* Activity status when connected */}
            <span
              className={`flex items-center gap-1.5 text-xs ${
                ACTIVITY_STATUS_CONFIG[activityStatus].textColor
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  ACTIVITY_STATUS_CONFIG[activityStatus].color
                } ${
                  activityStatus === TerminalActivityStatus.WAITING
                    ? 'animate-pulse'
                    : ''
                }`}
              />
              {ACTIVITY_STATUS_CONFIG[activityStatus].label}
            </span>
          </>
        )}

        {cwd && (
          <>
            <span className="text-slate-600">|</span>
            <span className="text-xs text-slate-400 truncate" title={cwd}>
              {cwd}
            </span>
          </>
        )}
      </div>

      {/* Search bar (expandable) */}
      {enableSearch && showSearch && (
        <div className="flex items-center gap-1 bg-slate-700/50 rounded px-2 py-0.5">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search..."
            className="bg-transparent text-xs text-slate-300 outline-none w-24 placeholder:text-slate-600"
            autoFocus
          />
          <button
            onClick={handleSearch}
            className="p-0.5 hover:bg-slate-600 rounded"
            title="Find next"
          >
            <SearchIcon className="w-3 h-3 text-slate-400" />
          </button>
          <button
            onClick={() => setShowSearch(false)}
            className="p-0.5 hover:bg-slate-600 rounded"
            title="Close search"
          >
            <CloseIcon className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-0.5">
        {enableSearch && !showSearch && (
          <button
            onClick={handleToggleSearch}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
            title="Search (Ctrl+F)"
          >
            <SearchIcon className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}

        <button
          onClick={handleCopy}
          className="p-1.5 hover:bg-slate-700 rounded transition-colors"
          title={copied ? 'Copied!' : 'Copy selection'}
        >
          <CopyIcon
            className={`w-3.5 h-3.5 ${
              copied ? 'text-green-400' : 'text-slate-400'
            }`}
          />
        </button>

        <button
          onClick={onClear}
          className="p-1.5 hover:bg-slate-700 rounded transition-colors"
          title="Clear terminal"
        >
          <ClearIcon className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {onReconnect && !connected && !connecting && (
          <button
            onClick={onReconnect}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
            title="Reconnect"
          >
            <ReconnectIcon className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}

        <button
          onClick={onSettings}
          className="p-1.5 hover:bg-slate-700 rounded transition-colors"
          title="Settings"
        >
          <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    </div>
  );
}
