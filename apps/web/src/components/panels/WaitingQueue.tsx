/**
 * Waiting Queue Panel
 *
 * Shows all terminals that are awaiting user input.
 * Provides quick navigation and notification controls.
 */

'use client';

import { useMemo } from 'react';
import { ShellType } from '@masterdashboard/shared';
import { useStatusStore, useWaitingQueue } from '@/stores/status-store';
import { useCanvasStore } from '@/stores/canvas-store';

interface WaitingQueueProps {
  projectId?: string;
  className?: string;
}

/**
 * Bell icon component
 */
function BellIcon({ className }: { className?: string }) {
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
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

/**
 * Bell off icon component
 */
function BellOffIcon({ className }: { className?: string }) {
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
        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
      />
    </svg>
  );
}

/**
 * Focus/target icon component
 */
function FocusIcon({ className }: { className?: string }) {
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
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

/**
 * Terminal icon component
 */
function TerminalIcon({ className }: { className?: string }) {
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
        d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

/**
 * Sparkles icon for Claude Code
 */
function SparklesIcon({ className }: { className?: string }) {
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
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  );
}

export function WaitingQueue({ projectId, className = '' }: WaitingQueueProps) {
  const waitingQueue = useWaitingQueue();
  const { soundEnabled, autoFocusEnabled, toggleSound, toggleAutoFocus } =
    useStatusStore();
  const nodes = useCanvasStore((state) => state.nodes);

  // Get terminal info for waiting sessions
  const waitingTerminals = useMemo(() => {
    return waitingQueue
      .map((sessionId) => {
        const node = nodes.find((n) => n.data.sessionId === sessionId);
        if (!node) return null;
        if (projectId && node.data.projectId !== projectId) return null;

        return {
          sessionId,
          nodeId: node.id,
          label: node.data.label || 'Terminal',
          shell: node.data.shell as ShellType | undefined,
          cwd: node.data.cwd as string | undefined,
        };
      })
      .filter(Boolean) as Array<{
      sessionId: string;
      nodeId: string;
      label: string;
      shell?: ShellType;
      cwd?: string;
    }>;
  }, [waitingQueue, nodes, projectId]);

  // Focus on a terminal
  const handleFocus = (sessionId: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('focusTerminal', { detail: sessionId })
      );
    }
  };

  // Don't show panel if no waiting terminals and sound is off
  if (waitingTerminals.length === 0 && !soundEnabled) {
    return null;
  }

  return (
    <div
      className={`w-64 bg-gray-800 border-l border-gray-700 flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-300">Waiting for Input</h3>
          <div className="flex gap-1">
            <button
              onClick={toggleSound}
              className="p-1.5 rounded hover:bg-gray-700 transition-colors"
              title={soundEnabled ? 'Mute notifications' : 'Enable notifications'}
            >
              {soundEnabled ? (
                <BellIcon className="w-4 h-4 text-gray-300" />
              ) : (
                <BellOffIcon className="w-4 h-4 text-gray-500" />
              )}
            </button>
            <button
              onClick={toggleAutoFocus}
              className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${
                autoFocusEnabled ? 'text-blue-400' : 'text-gray-500'
              }`}
              title={
                autoFocusEnabled ? 'Auto-focus enabled' : 'Auto-focus disabled'
              }
            >
              <FocusIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        {waitingTerminals.length > 0 && (
          <span className="text-xs text-yellow-400">
            {waitingTerminals.length} terminal
            {waitingTerminals.length > 1 ? 's' : ''} waiting
          </span>
        )}
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {waitingTerminals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <TerminalIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No terminals waiting</p>
          </div>
        ) : (
          waitingTerminals.map((terminal) => (
            <button
              key={terminal.sessionId}
              onClick={() => handleFocus(terminal.sessionId)}
              className="w-full p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors text-left flex items-center gap-2 group"
            >
              {/* Pulsing indicator */}
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse flex-shrink-0" />

              {/* Icon */}
              {terminal.shell === ShellType.CLAUDE_CODE ? (
                <SparklesIcon className="w-4 h-4 text-purple-400 flex-shrink-0" />
              ) : (
                <TerminalIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white truncate">
                  {terminal.label}
                </div>
                {terminal.cwd && (
                  <div className="text-xs text-gray-400 truncate">
                    {terminal.cwd}
                  </div>
                )}
              </div>

              {/* Focus indicator on hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <FocusIcon className="w-4 h-4 text-blue-400" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Compact version of waiting queue for smaller spaces
 */
export function WaitingQueueCompact({ projectId }: { projectId?: string }) {
  const waitingQueue = useWaitingQueue();
  const nodes = useCanvasStore((state) => state.nodes);

  const waitingCount = useMemo(() => {
    return waitingQueue.filter((sessionId) => {
      const node = nodes.find((n) => n.data.sessionId === sessionId);
      if (!node) return false;
      if (projectId && node.data.projectId !== projectId) return false;
      return true;
    }).length;
  }, [waitingQueue, nodes, projectId]);

  if (waitingCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
      <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
      <span className="text-xs text-yellow-400 font-medium">
        {waitingCount} waiting
      </span>
    </div>
  );
}
