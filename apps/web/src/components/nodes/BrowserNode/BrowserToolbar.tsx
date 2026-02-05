/**
 * Browser Toolbar Component
 *
 * Navigation controls and URL bar for the browser node.
 */

'use client';

import { memo, useCallback, useState, useRef } from 'react';

interface BrowserToolbarProps {
  /** Current URL */
  url: string;
  /** URL change handler */
  onUrlChange: (url: string) => void;
  /** Navigate to URL handler */
  onNavigate: () => void;
  /** Go back in history */
  onBack: () => void;
  /** Go forward in history */
  onForward: () => void;
  /** Reload page */
  onReload: () => void;
  /** Take screenshot */
  onScreenshot: () => void;
  /** Open settings */
  onSettings: () => void;
  /** Whether currently loading */
  loading?: boolean;
  /** Whether connected */
  connected?: boolean;
}

export const BrowserToolbar = memo(function BrowserToolbar({
  url,
  onUrlChange,
  onNavigate,
  onBack,
  onForward,
  onReload,
  onScreenshot,
  onSettings,
  loading = false,
  connected = false,
}: BrowserToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  // Handle Enter key in URL input
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        inputRef.current?.blur();
        onNavigate();
      }
    },
    [onNavigate]
  );

  // Select all on focus
  const handleFocus = useCallback(() => {
    setFocused(true);
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  }, []);

  const handleBlur = useCallback(() => {
    setFocused(false);
  }, []);

  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-800 border-b border-gray-700">
      {/* Navigation buttons */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          onClick={onBack}
          title="Go back"
          disabled={!connected}
        >
          <ArrowLeftIcon />
        </ToolbarButton>

        <ToolbarButton
          onClick={onForward}
          title="Go forward"
          disabled={!connected}
        >
          <ArrowRightIcon />
        </ToolbarButton>

        <ToolbarButton
          onClick={onReload}
          title={loading ? 'Stop' : 'Reload'}
          disabled={!connected}
        >
          {loading ? <StopIcon /> : <ReloadIcon />}
        </ToolbarButton>
      </div>

      {/* URL bar */}
      <div
        className={`
          flex-1 flex items-center gap-1.5 bg-gray-700 rounded px-2 py-1
          ${focused ? 'ring-1 ring-blue-500' : ''}
          ${!connected ? 'opacity-50' : ''}
        `}
      >
        <LockIcon secure={url.startsWith('https://')} />

        <input
          ref={inputRef}
          type="text"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={!connected}
          className="flex-1 bg-transparent text-xs text-gray-200 outline-none placeholder-gray-500 min-w-0"
          placeholder="Enter URL..."
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
        />

        <ToolbarButton
          onClick={onNavigate}
          title="Navigate"
          disabled={!connected}
          small
        >
          <GoIcon />
        </ToolbarButton>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          onClick={onScreenshot}
          title="Screenshot"
          disabled={!connected}
        >
          <CameraIcon />
        </ToolbarButton>

        <ToolbarButton onClick={onSettings} title="Settings">
          <SettingsIcon />
        </ToolbarButton>
      </div>
    </div>
  );
});

/**
 * Toolbar button component
 */
interface ToolbarButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  small?: boolean;
}

function ToolbarButton({
  children,
  onClick,
  title,
  disabled = false,
  small = false,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        ${small ? 'p-0.5' : 'p-1'}
        hover:bg-gray-600 rounded
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent
        transition-colors
      `}
    >
      {children}
    </button>
  );
}

// Icon components

function ArrowLeftIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ReloadIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function LockIcon({ secure }: { secure: boolean }) {
  if (secure) {
    return (
      <svg className="w-3 h-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  return (
    <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
    </svg>
  );
}

function GoIcon() {
  return (
    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
