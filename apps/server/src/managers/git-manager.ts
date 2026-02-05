/**
 * Git Manager
 *
 * Manages Git operations for the GitNode component.
 * Uses simple-git library for Git operations.
 */

import { EventEmitter } from 'events';
import * as path from 'path';
import simpleGit, { type SimpleGit, type StatusResult, type LogResult, type BranchSummary } from 'simple-git';
import {
  GitFileStatus,
  type GitStatus,
  type GitFileEntry,
  type GitCommit,
  type GitBranch,
  type GitOperationResult,
} from '@masterdashboard/shared';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('git-manager');

interface GitManagerOptions {
  /** Allowed root paths (cannot operate outside these) */
  allowedRoots?: string[];
}

export class GitManager extends EventEmitter {
  private allowedRoots: Set<string>;
  private gitInstances = new Map<string, SimpleGit>();

  constructor(options: GitManagerOptions = {}) {
    super();
    this.allowedRoots = new Set(
      (options.allowedRoots ?? [process.env.HOME ?? '/']).map(p => path.resolve(p))
    );

    logger.info(
      { allowedRoots: Array.from(this.allowedRoots) },
      'Git manager initialized'
    );
  }

  /**
   * Add an allowed root path
   */
  addAllowedRoot(rootPath: string): void {
    const normalized = path.resolve(rootPath);
    this.allowedRoots.add(normalized);
    logger.info({ rootPath: normalized }, 'Added allowed root');
  }

  /**
   * Check if a path is within allowed roots
   */
  private isPathAllowed(targetPath: string): boolean {
    const normalized = path.resolve(targetPath);
    for (const root of this.allowedRoots) {
      if (normalized === root || normalized.startsWith(root + path.sep)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Validate and resolve a repository path
   */
  private validateRepoPath(repoPath: string): string {
    const resolved = path.resolve(repoPath);

    if (!this.isPathAllowed(resolved)) {
      throw new Error('Repository path is outside allowed directories');
    }

    // Check for path traversal attempts
    if (repoPath.includes('..')) {
      throw new Error('Path traversal detected');
    }

    return resolved;
  }

  /**
   * Get or create a git instance for a repository
   */
  private getGit(repoPath: string): SimpleGit {
    const validatedPath = this.validateRepoPath(repoPath);

    if (!this.gitInstances.has(validatedPath)) {
      this.gitInstances.set(validatedPath, simpleGit(validatedPath));
    }

    return this.gitInstances.get(validatedPath)!;
  }

  /**
   * Convert simple-git status to our GitStatus format
   */
  private convertStatus(result: StatusResult): GitStatus {
    const files: GitFileEntry[] = result.files.map(file => {
      const indexStatus = this.parseStatusCode(file.index);
      const workingStatus = this.parseStatusCode(file.working_dir);

      return {
        path: file.path,
        indexStatus,
        workingStatus,
        originalPath: file.from,
        isStaged: indexStatus !== GitFileStatus.UNMODIFIED && indexStatus !== GitFileStatus.UNTRACKED,
        isUnstaged: workingStatus !== GitFileStatus.UNMODIFIED && workingStatus !== GitFileStatus.UNTRACKED,
        isUntracked: indexStatus === GitFileStatus.UNTRACKED || workingStatus === GitFileStatus.UNTRACKED,
        hasConflict: indexStatus === GitFileStatus.UNMERGED || workingStatus === GitFileStatus.UNMERGED,
      };
    });

    return {
      branch: result.current ?? '',
      tracking: result.tracking ?? undefined,
      ahead: result.ahead,
      behind: result.behind,
      hasStaged: result.staged.length > 0,
      hasUnstaged: result.modified.length > 0 || result.deleted.length > 0,
      hasUntracked: result.not_added.length > 0,
      hasConflicts: result.conflicted.length > 0,
      detached: result.detached,
      files,
    };
  }

  /**
   * Parse a status code character to GitFileStatus
   */
  private parseStatusCode(code: string): GitFileStatus {
    switch (code) {
      case ' ': return GitFileStatus.UNMODIFIED;
      case 'M': return GitFileStatus.MODIFIED;
      case 'A': return GitFileStatus.ADDED;
      case 'D': return GitFileStatus.DELETED;
      case 'R': return GitFileStatus.RENAMED;
      case 'C': return GitFileStatus.COPIED;
      case 'U': return GitFileStatus.UNMERGED;
      case '?': return GitFileStatus.UNTRACKED;
      case '!': return GitFileStatus.IGNORED;
      default: return GitFileStatus.UNMODIFIED;
    }
  }

  /**
   * Convert simple-git log to our GitCommit format
   */
  private convertLog(result: LogResult): GitCommit[] {
    return result.all.map(commit => ({
      hash: commit.hash,
      hashShort: commit.hash.substring(0, 7),
      author: commit.author_name,
      authorEmail: commit.author_email,
      date: commit.date,
      message: commit.message.split('\n')[0],
      body: commit.body || undefined,
      refs: commit.refs ? commit.refs.split(', ').filter(r => r) : [],
    }));
  }

  /**
   * Convert simple-git branches to our GitBranch format
   */
  private convertBranches(result: BranchSummary): GitBranch[] {
    return Object.entries(result.branches).map(([name, branch]) => ({
      name,
      current: branch.current,
      isRemote: name.includes('/'),
      tracking: branch.linkedWorkTree || undefined,
      lastCommit: branch.commit,
      lastCommitMessage: branch.label,
    }));
  }

  /**
   * Get repository status
   */
  async getStatus(repoPath: string): Promise<GitStatus> {
    const git = this.getGit(repoPath);

    try {
      const status = await git.status();
      logger.debug({ repoPath, branch: status.current }, 'Got git status');
      return this.convertStatus(status);
    } catch (error) {
      logger.error({ repoPath, error }, 'Failed to get git status');
      throw error;
    }
  }

  /**
   * Get commit log
   */
  async getLog(
    repoPath: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<{ commits: GitCommit[]; hasMore: boolean }> {
    const git = this.getGit(repoPath);

    try {
      // Fetch one extra to check if there are more
      const result = await git.log({
        maxCount: limit + 1,
        '--skip': skip,
      });

      const commits = this.convertLog(result);
      const hasMore = commits.length > limit;

      logger.debug({ repoPath, count: commits.length, skip }, 'Got git log');

      return {
        commits: commits.slice(0, limit),
        hasMore,
      };
    } catch (error) {
      logger.error({ repoPath, error }, 'Failed to get git log');
      throw error;
    }
  }

  /**
   * Get branch list
   */
  async getBranches(
    repoPath: string,
    includeRemote: boolean = false
  ): Promise<{ branches: GitBranch[]; current: string }> {
    const git = this.getGit(repoPath);

    try {
      const result = includeRemote
        ? await git.branch(['-a'])
        : await git.branch();

      logger.debug({ repoPath, count: Object.keys(result.branches).length }, 'Got git branches');

      return {
        branches: this.convertBranches(result),
        current: result.current,
      };
    } catch (error) {
      logger.error({ repoPath, error }, 'Failed to get git branches');
      throw error;
    }
  }

  /**
   * Checkout a branch
   */
  async checkout(
    repoPath: string,
    branch: string,
    create: boolean = false
  ): Promise<GitOperationResult> {
    const git = this.getGit(repoPath);

    try {
      if (create) {
        await git.checkoutBranch(branch, 'HEAD');
      } else {
        await git.checkout(branch);
      }

      logger.info({ repoPath, branch, create }, 'Checked out branch');

      return {
        success: true,
        message: create ? `Created and switched to branch '${branch}'` : `Switched to branch '${branch}'`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Checkout failed';
      logger.error({ repoPath, branch, error }, 'Failed to checkout branch');
      return { success: false, error: message };
    }
  }

  /**
   * Stage files
   */
  async stage(repoPath: string, files: string[]): Promise<GitOperationResult> {
    const git = this.getGit(repoPath);

    try {
      if (files.length === 0) {
        await git.add('.');
      } else {
        await git.add(files);
      }

      logger.info({ repoPath, files: files.length || 'all' }, 'Staged files');

      return {
        success: true,
        message: files.length === 0 ? 'Staged all changes' : `Staged ${files.length} file(s)`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Stage failed';
      logger.error({ repoPath, files, error }, 'Failed to stage files');
      return { success: false, error: message };
    }
  }

  /**
   * Unstage files
   */
  async unstage(repoPath: string, files: string[]): Promise<GitOperationResult> {
    const git = this.getGit(repoPath);

    try {
      if (files.length === 0) {
        await git.reset();
      } else {
        await git.reset(['HEAD', '--', ...files]);
      }

      logger.info({ repoPath, files: files.length || 'all' }, 'Unstaged files');

      return {
        success: true,
        message: files.length === 0 ? 'Unstaged all changes' : `Unstaged ${files.length} file(s)`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unstage failed';
      logger.error({ repoPath, files, error }, 'Failed to unstage files');
      return { success: false, error: message };
    }
  }

  /**
   * Commit staged changes
   */
  async commit(repoPath: string, message: string): Promise<GitOperationResult & { commitHash?: string }> {
    const git = this.getGit(repoPath);

    try {
      const result = await git.commit(message);

      logger.info({ repoPath, commit: result.commit }, 'Committed changes');

      return {
        success: true,
        message: `Created commit ${result.commit}`,
        commitHash: result.commit,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Commit failed';
      logger.error({ repoPath, error }, 'Failed to commit');
      return { success: false, error: message };
    }
  }

  /**
   * Push to remote
   */
  async push(repoPath: string, force: boolean = false): Promise<GitOperationResult> {
    const git = this.getGit(repoPath);

    try {
      const options = force ? ['--force'] : [];
      await git.push(options);

      logger.info({ repoPath, force }, 'Pushed to remote');

      return {
        success: true,
        message: 'Pushed to remote',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Push failed';
      logger.error({ repoPath, error }, 'Failed to push');
      return { success: false, error: message };
    }
  }

  /**
   * Pull from remote
   */
  async pull(repoPath: string, rebase: boolean = false): Promise<GitOperationResult> {
    const git = this.getGit(repoPath);

    try {
      if (rebase) {
        await git.pull({ '--rebase': 'true' });
      } else {
        await git.pull();
      }

      logger.info({ repoPath, rebase }, 'Pulled from remote');

      return {
        success: true,
        message: rebase ? 'Rebased onto remote' : 'Merged from remote',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Pull failed';
      logger.error({ repoPath, error }, 'Failed to pull');
      return { success: false, error: message };
    }
  }

  /**
   * Discard changes
   */
  async discard(repoPath: string, files: string[]): Promise<GitOperationResult> {
    const git = this.getGit(repoPath);

    try {
      if (files.length === 0) {
        // Discard all changes
        await git.checkout(['--', '.']);
        // Also clean untracked files
        await git.clean('f', ['-d']);
      } else {
        await git.checkout(['--', ...files]);
      }

      logger.info({ repoPath, files: files.length || 'all' }, 'Discarded changes');

      return {
        success: true,
        message: files.length === 0 ? 'Discarded all changes' : `Discarded changes in ${files.length} file(s)`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Discard failed';
      logger.error({ repoPath, files, error }, 'Failed to discard changes');
      return { success: false, error: message };
    }
  }

  /**
   * Check if a path is a git repository
   */
  async isGitRepo(repoPath: string): Promise<boolean> {
    const git = this.getGit(repoPath);

    try {
      await git.revparse(['--git-dir']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.gitInstances.clear();
    this.removeAllListeners();
    logger.info('Git manager destroyed');
  }
}
