/**
 * SessionStats Component
 *
 * Displays tmux session statistics and cleanup controls for a project.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

interface TmuxStats {
  active: number;
  disconnected: number;
  total: number;
  orphaned: number;
  projectSessions: number;
}

interface SessionStatsProps {
  projectId: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function SessionStats({ projectId }: SessionStatsProps) {
  const [stats, setStats] = useState<TmuxStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/tmux/stats?projectId=${projectId}`);
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
        setError(null);
      } else {
        setError(data.error ?? 'Failed to fetch stats');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const handleKillAll = useCallback(async () => {
    if (!confirm('Kill all sessions for this project? This cannot be undone.')) {
      return;
    }

    setActionLoading('kill-all');
    try {
      const response = await fetch(`${API_URL}/api/tmux/kill-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const data = await response.json();

      if (data.success) {
        await fetchStats();
      } else {
        setError(data.error ?? 'Failed to kill sessions');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setActionLoading(null);
    }
  }, [projectId, fetchStats]);

  const handleCleanupOrphans = useCallback(async () => {
    setActionLoading('cleanup');
    try {
      const response = await fetch(`${API_URL}/api/tmux/cleanup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();

      if (data.success) {
        await fetchStats();
      } else {
        setError(data.error ?? 'Failed to cleanup');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setActionLoading(null);
    }
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <div className="w-4 h-4 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin" />
          Loading stats...
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          Session Stats
        </h3>
        <button
          onClick={fetchStats}
          className="text-slate-500 hover:text-slate-300 transition-colors"
          title="Refresh"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
          {error}
        </div>
      )}

      {stats && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between bg-slate-800/50 px-2.5 py-1.5 rounded">
              <span className="text-slate-400">Active</span>
              <span className="font-mono text-green-400">{stats.active}</span>
            </div>
            <div className="flex items-center justify-between bg-slate-800/50 px-2.5 py-1.5 rounded">
              <span className="text-slate-400">Disconnected</span>
              <span className="font-mono text-yellow-400">{stats.disconnected}</span>
            </div>
            <div className="flex items-center justify-between bg-slate-800/50 px-2.5 py-1.5 rounded">
              <span className="text-slate-400">Total tmux</span>
              <span className="font-mono text-slate-300">{stats.total}</span>
            </div>
            <div className="flex items-center justify-between bg-slate-800/50 px-2.5 py-1.5 rounded">
              <span className="text-slate-400">Orphaned</span>
              <span className={`font-mono ${stats.orphaned > 0 ? 'text-orange-400' : 'text-slate-500'}`}>
                {stats.orphaned}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <button
              onClick={handleKillAll}
              disabled={actionLoading !== null || stats.projectSessions === 0}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs
                bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300
                border border-red-500/30 hover:border-red-500/50 rounded
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === 'kill-all' ? (
                <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
              Kill All Sessions
            </button>

            {stats.orphaned > 0 && (
              <button
                onClick={handleCleanupOrphans}
                disabled={actionLoading !== null}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs
                  bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 hover:text-orange-300
                  border border-orange-500/30 hover:border-orange-500/50 rounded
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === 'cleanup' ? (
                  <div className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                )}
                Cleanup Orphans ({stats.orphaned})
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

