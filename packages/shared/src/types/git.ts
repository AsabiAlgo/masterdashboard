/**
 * Git Types
 *
 * Types for Git operations in the GitNode component.
 */

/**
 * Git file status codes
 */
export enum GitFileStatus {
  /** Unmodified */
  UNMODIFIED = ' ',
  /** Modified */
  MODIFIED = 'M',
  /** Added (staged) */
  ADDED = 'A',
  /** Deleted */
  DELETED = 'D',
  /** Renamed */
  RENAMED = 'R',
  /** Copied */
  COPIED = 'C',
  /** Unmerged (conflict) */
  UNMERGED = 'U',
  /** Untracked */
  UNTRACKED = '?',
  /** Ignored */
  IGNORED = '!',
}

/**
 * A file entry in git status
 */
export interface GitFileEntry {
  /** File path relative to repo root */
  path: string;
  /** Status in index (staging area) */
  indexStatus: GitFileStatus;
  /** Status in working tree */
  workingStatus: GitFileStatus;
  /** Original path if renamed/copied */
  originalPath?: string;
  /** Whether the file is staged */
  isStaged: boolean;
  /** Whether the file has unstaged changes */
  isUnstaged: boolean;
  /** Whether the file is untracked */
  isUntracked: boolean;
  /** Whether the file has a conflict */
  hasConflict: boolean;
}

/**
 * Git repository status
 */
export interface GitStatus {
  /** Current branch name */
  branch: string;
  /** Tracking remote branch (e.g., 'origin/main') */
  tracking?: string;
  /** Commits ahead of tracking branch */
  ahead: number;
  /** Commits behind tracking branch */
  behind: number;
  /** Whether there are staged changes */
  hasStaged: boolean;
  /** Whether there are unstaged changes */
  hasUnstaged: boolean;
  /** Whether there are untracked files */
  hasUntracked: boolean;
  /** Whether there are merge conflicts */
  hasConflicts: boolean;
  /** Whether the repository is in a detached HEAD state */
  detached: boolean;
  /** List of files with their status */
  files: GitFileEntry[];
}

/**
 * A git commit entry
 */
export interface GitCommit {
  /** Full commit hash */
  hash: string;
  /** Short commit hash (7 chars) */
  hashShort: string;
  /** Author name */
  author: string;
  /** Author email */
  authorEmail: string;
  /** Commit date (ISO string) */
  date: string;
  /** Commit message (first line) */
  message: string;
  /** Full commit message body */
  body?: string;
  /** Refs pointing to this commit (branches, tags) */
  refs: string[];
}

/**
 * A git branch entry
 */
export interface GitBranch {
  /** Branch name */
  name: string;
  /** Whether this is the current branch */
  current: boolean;
  /** Whether this is a remote branch */
  isRemote: boolean;
  /** Tracking remote branch */
  tracking?: string;
  /** Commits ahead of tracking */
  ahead?: number;
  /** Commits behind tracking */
  behind?: number;
  /** Last commit hash on this branch */
  lastCommit?: string;
  /** Last commit message */
  lastCommitMessage?: string;
}

/**
 * Result of a git operation
 */
export interface GitOperationResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Additional message/output */
  message?: string;
}

/**
 * View mode for GitNode
 */
export type GitViewMode = 'status' | 'history' | 'branches';
