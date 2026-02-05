/**
 * Git Socket Hook
 *
 * Manages WebSocket communication for git operations.
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
  WS_EVENTS,
  type GitStatus,
  type GitCommit,
  type GitBranch,
  type GitOperationResult,
} from '@masterdashboard/shared';

interface UseGitSocketOptions {
  projectId: string;
  repoPath: string;
  onError?: (error: string) => void;
}

interface UseGitSocketReturn {
  connected: boolean;
  loading: boolean;
  status: GitStatus | null;
  commits: GitCommit[];
  branches: GitBranch[];
  currentBranch: string;
  hasMoreCommits: boolean;
  getStatus: () => void;
  getLog: (limit?: number, skip?: number) => void;
  getBranches: (includeRemote?: boolean) => void;
  checkout: (branch: string, create?: boolean) => void;
  stage: (files: string[]) => void;
  unstage: (files: string[]) => void;
  commit: (message: string) => void;
  push: (force?: boolean) => void;
  pull: (rebase?: boolean) => void;
  discard: (files: string[]) => void;
  refresh: () => void;
}

let requestIdCounter = 0;
function generateRequestId(): string {
  return `git_req_${Date.now()}_${++requestIdCounter}`;
}

export function useGitSocket({
  projectId,
  repoPath,
  onError,
}: UseGitSocketOptions): UseGitSocketReturn {
  const { emit, on, connected: socketConnected } = useWebSocket();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('');
  const [hasMoreCommits, setHasMoreCommits] = useState(false);
  const requestIdRef = useRef<string | null>(null);

  // Set up event listeners
  useEffect(() => {
    const handleStatusResponse = (payload: { repoPath: string; status: GitStatus; correlationId?: string }) => {
      if (payload.repoPath === repoPath) {
        setStatus(payload.status);
        setLoading(false);
      }
    };

    const handleLogResponse = (payload: { repoPath: string; commits: GitCommit[]; hasMore: boolean; correlationId?: string }) => {
      if (payload.repoPath === repoPath) {
        setCommits(payload.commits);
        setHasMoreCommits(payload.hasMore);
        setLoading(false);
      }
    };

    const handleBranchesResponse = (payload: { repoPath: string; branches: GitBranch[]; current: string; correlationId?: string }) => {
      if (payload.repoPath === repoPath) {
        setBranches(payload.branches);
        setCurrentBranch(payload.current);
        setLoading(false);
      }
    };

    const handleCheckoutResponse = (payload: { repoPath: string; result: GitOperationResult; branch?: string; correlationId?: string }) => {
      if (payload.repoPath === repoPath) {
        if (payload.result.success && payload.branch) {
          setCurrentBranch(payload.branch);
        } else if (payload.result.error) {
          onError?.(payload.result.error);
        }
        setLoading(false);
      }
    };

    const handleOperationResponse = (payload: { repoPath: string; result: GitOperationResult; correlationId?: string }) => {
      if (payload.repoPath === repoPath) {
        if (!payload.result.success && payload.result.error) {
          onError?.(payload.result.error);
        }
        setLoading(false);
      }
    };

    const handleCommitResponse = (payload: { repoPath: string; result: GitOperationResult; commitHash?: string; correlationId?: string }) => {
      if (payload.repoPath === repoPath) {
        if (!payload.result.success && payload.result.error) {
          onError?.(payload.result.error);
        }
        setLoading(false);
      }
    };

    const handleError = (payload: { repoPath: string; error: string; code?: string }) => {
      if (payload.repoPath === repoPath) {
        setLoading(false);
        onError?.(payload.error);
      }
    };

    const unsubStatus = on(WS_EVENTS.GIT_STATUS_RESPONSE, handleStatusResponse);
    const unsubLog = on(WS_EVENTS.GIT_LOG_RESPONSE, handleLogResponse);
    const unsubBranches = on(WS_EVENTS.GIT_BRANCHES_RESPONSE, handleBranchesResponse);
    const unsubCheckout = on(WS_EVENTS.GIT_CHECKOUT_RESPONSE, handleCheckoutResponse);
    const unsubStage = on(WS_EVENTS.GIT_STAGE_RESPONSE, handleOperationResponse);
    const unsubUnstage = on(WS_EVENTS.GIT_UNSTAGE_RESPONSE, handleOperationResponse);
    const unsubCommit = on(WS_EVENTS.GIT_COMMIT_RESPONSE, handleCommitResponse);
    const unsubPush = on(WS_EVENTS.GIT_PUSH_RESPONSE, handleOperationResponse);
    const unsubPull = on(WS_EVENTS.GIT_PULL_RESPONSE, handleOperationResponse);
    const unsubDiscard = on(WS_EVENTS.GIT_DISCARD_RESPONSE, handleOperationResponse);
    const unsubError = on(WS_EVENTS.GIT_ERROR, handleError);

    return () => {
      unsubStatus();
      unsubLog();
      unsubBranches();
      unsubCheckout();
      unsubStage();
      unsubUnstage();
      unsubCommit();
      unsubPush();
      unsubPull();
      unsubDiscard();
      unsubError();
    };
  }, [on, repoPath, onError]);

  const getStatus = useCallback(() => {
    if (!socketConnected || !repoPath) {
      onError?.('WebSocket not connected or repo path not set');
      return;
    }

    const reqId = generateRequestId();
    requestIdRef.current = reqId;

    setLoading(true);
    emit(WS_EVENTS.GIT_STATUS, {
      repoPath,
      projectId,
    }, reqId);
  }, [emit, socketConnected, repoPath, projectId, onError]);

  const getLog = useCallback((limit: number = 50, skip: number = 0) => {
    if (!socketConnected || !repoPath) {
      onError?.('WebSocket not connected or repo path not set');
      return;
    }

    const reqId = generateRequestId();
    requestIdRef.current = reqId;

    setLoading(true);
    emit(WS_EVENTS.GIT_LOG, {
      repoPath,
      projectId,
      limit,
      skip,
    }, reqId);
  }, [emit, socketConnected, repoPath, projectId, onError]);

  const getBranches = useCallback((includeRemote: boolean = false) => {
    if (!socketConnected || !repoPath) {
      onError?.('WebSocket not connected or repo path not set');
      return;
    }

    const reqId = generateRequestId();
    requestIdRef.current = reqId;

    setLoading(true);
    emit(WS_EVENTS.GIT_BRANCHES, {
      repoPath,
      projectId,
      includeRemote,
    }, reqId);
  }, [emit, socketConnected, repoPath, projectId, onError]);

  const checkout = useCallback((branch: string, create: boolean = false) => {
    if (!socketConnected || !repoPath) {
      onError?.('WebSocket not connected or repo path not set');
      return;
    }

    setLoading(true);
    emit(WS_EVENTS.GIT_CHECKOUT, {
      repoPath,
      projectId,
      branch,
      create,
    });
  }, [emit, socketConnected, repoPath, projectId, onError]);

  const stage = useCallback((files: string[]) => {
    if (!socketConnected || !repoPath) {
      onError?.('WebSocket not connected or repo path not set');
      return;
    }

    setLoading(true);
    emit(WS_EVENTS.GIT_STAGE, {
      repoPath,
      projectId,
      files,
    });
  }, [emit, socketConnected, repoPath, projectId, onError]);

  const unstage = useCallback((files: string[]) => {
    if (!socketConnected || !repoPath) {
      onError?.('WebSocket not connected or repo path not set');
      return;
    }

    setLoading(true);
    emit(WS_EVENTS.GIT_UNSTAGE, {
      repoPath,
      projectId,
      files,
    });
  }, [emit, socketConnected, repoPath, projectId, onError]);

  const commit = useCallback((message: string) => {
    if (!socketConnected || !repoPath) {
      onError?.('WebSocket not connected or repo path not set');
      return;
    }

    setLoading(true);
    emit(WS_EVENTS.GIT_COMMIT, {
      repoPath,
      projectId,
      message,
    });
  }, [emit, socketConnected, repoPath, projectId, onError]);

  const push = useCallback((force: boolean = false) => {
    if (!socketConnected || !repoPath) {
      onError?.('WebSocket not connected or repo path not set');
      return;
    }

    setLoading(true);
    emit(WS_EVENTS.GIT_PUSH, {
      repoPath,
      projectId,
      force,
    });
  }, [emit, socketConnected, repoPath, projectId, onError]);

  const pull = useCallback((rebase: boolean = false) => {
    if (!socketConnected || !repoPath) {
      onError?.('WebSocket not connected or repo path not set');
      return;
    }

    setLoading(true);
    emit(WS_EVENTS.GIT_PULL, {
      repoPath,
      projectId,
      rebase,
    });
  }, [emit, socketConnected, repoPath, projectId, onError]);

  const discard = useCallback((files: string[]) => {
    if (!socketConnected || !repoPath) {
      onError?.('WebSocket not connected or repo path not set');
      return;
    }

    setLoading(true);
    emit(WS_EVENTS.GIT_DISCARD, {
      repoPath,
      projectId,
      files,
    });
  }, [emit, socketConnected, repoPath, projectId, onError]);

  const refresh = useCallback(() => {
    getStatus();
  }, [getStatus]);

  return {
    connected: socketConnected,
    loading,
    status,
    commits,
    branches,
    currentBranch,
    hasMoreCommits,
    getStatus,
    getLog,
    getBranches,
    checkout,
    stage,
    unstage,
    commit,
    push,
    pull,
    discard,
    refresh,
  };
}
