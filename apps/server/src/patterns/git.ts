/**
 * Git Patterns
 *
 * Status detection patterns for git operations.
 * Detects commit editors, merge conflicts, rebase prompts, etc.
 */

import {
  TerminalActivityStatus,
  type StatusPattern,
} from '@masterdashboard/shared';

/**
 * Git specific patterns
 *
 * Detects:
 * - Commit message editors
 * - Merge conflicts
 * - Interactive rebase
 * - Git prompts
 * - Cherry-pick conflicts
 */
export const GIT_PATTERNS: StatusPattern[] = [
  // Commit message editor (vim)
  {
    id: 'git-commit-vim',
    name: 'Git Commit Editor',
    shell: 'all',
    pattern: '# Please enter the commit message',
    status: TerminalActivityStatus.WAITING,
    priority: 75,
    enabled: true,
  },
  // Commit message editor (initial comment)
  {
    id: 'git-commit-changes',
    name: 'Git Commit Changes to be committed',
    shell: 'all',
    pattern: '# Changes to be committed:',
    status: TerminalActivityStatus.WAITING,
    priority: 74,
    enabled: true,
  },
  // Merge conflict
  {
    id: 'git-merge-conflict',
    name: 'Git Merge Conflict',
    shell: 'all',
    pattern: 'CONFLICT \\(|Merge conflict in|Automatic merge failed',
    status: TerminalActivityStatus.ERROR,
    priority: 70,
    enabled: true,
  },
  // Interactive rebase - edit mode
  {
    id: 'git-rebase-edit',
    name: 'Git Rebase Edit',
    shell: 'all',
    pattern: 'You can amend the commit now|Stopped at',
    status: TerminalActivityStatus.WAITING,
    priority: 73,
    enabled: true,
  },
  // Interactive rebase - commands
  {
    id: 'git-rebase-interactive',
    name: 'Git Interactive Rebase',
    shell: 'all',
    pattern: '# Rebase .* onto|pick [a-f0-9]+ ',
    status: TerminalActivityStatus.WAITING,
    priority: 72,
    enabled: true,
  },
  // Rebase continue prompt
  {
    id: 'git-rebase-continue',
    name: 'Git Rebase Waiting',
    shell: 'all',
    pattern: 'git rebase --continue|git rebase --abort|git rebase --skip',
    status: TerminalActivityStatus.WAITING,
    priority: 71,
    enabled: true,
  },
  // Cherry-pick conflict
  {
    id: 'git-cherry-pick-conflict',
    name: 'Git Cherry-pick Conflict',
    shell: 'all',
    pattern: 'error: could not apply|after resolving the conflicts',
    status: TerminalActivityStatus.ERROR,
    priority: 69,
    enabled: true,
  },
  // Stash pop conflict
  {
    id: 'git-stash-conflict',
    name: 'Git Stash Conflict',
    shell: 'all',
    pattern: 'stash@{\\d+} was applied with conflicts',
    status: TerminalActivityStatus.ERROR,
    priority: 68,
    enabled: true,
  },
  // Bisect
  {
    id: 'git-bisect',
    name: 'Git Bisect',
    shell: 'all',
    pattern: 'Bisecting:|git bisect (good|bad|reset)',
    status: TerminalActivityStatus.WAITING,
    priority: 67,
    enabled: true,
  },
  // Git pull/push in progress
  {
    id: 'git-remote-operation',
    name: 'Git Remote Operation',
    shell: 'all',
    pattern: '(Fetching|Pushing|Pulling|Counting objects|Compressing|Writing objects)',
    status: TerminalActivityStatus.WORKING,
    priority: 30,
    enabled: true,
  },
  // Git clone in progress
  {
    id: 'git-clone',
    name: 'Git Clone',
    shell: 'all',
    pattern: 'Cloning into|Receiving objects|Resolving deltas',
    status: TerminalActivityStatus.WORKING,
    priority: 30,
    enabled: true,
  },
  // Pre-commit hook failure
  {
    id: 'git-hook-failed',
    name: 'Git Hook Failed',
    shell: 'all',
    pattern: 'pre-commit hook|hook failed|husky - ',
    status: TerminalActivityStatus.ERROR,
    priority: 65,
    enabled: true,
  },
  // Detached HEAD warning
  {
    id: 'git-detached-head',
    name: 'Git Detached HEAD',
    shell: 'all',
    pattern: 'You are in .detached HEAD. state',
    status: TerminalActivityStatus.WAITING,
    priority: 40,
    enabled: true,
  },
];

export default GIT_PATTERNS;
