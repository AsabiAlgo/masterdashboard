/**
 * Pattern Registry
 *
 * Combines and exports all status detection patterns.
 * Patterns are sorted by priority (higher first) for efficient matching.
 */

import { type StatusPattern, TerminalActivityStatus, ShellType } from '@masterdashboard/shared';
import { CLAUDE_CODE_PATTERNS } from './claude-code.js';
import { BASH_PATTERNS } from './bash.js';
import { SSH_PATTERNS } from './ssh.js';
import { GIT_PATTERNS } from './git.js';
import { EDITOR_PATTERNS } from './editors.js';

/**
 * Package manager patterns
 */
const PACKAGE_MANAGER_PATTERNS: StatusPattern[] = [
  // NPM prompts
  {
    id: 'npm-prompt',
    name: 'NPM Prompt',
    shell: 'all',
    pattern: 'npm notice|npm WARN',
    status: TerminalActivityStatus.WORKING,
    priority: 25,
    enabled: true,
  },
  // NPM audit fix prompt
  {
    id: 'npm-audit-fix',
    name: 'NPM Audit Fix',
    shell: 'all',
    pattern: 'Run .npm audit fix. to fix|found \\d+ vulnerabilities',
    status: TerminalActivityStatus.WAITING,
    priority: 45,
    enabled: true,
  },
  // NPM error
  {
    id: 'npm-error',
    name: 'NPM Error',
    shell: 'all',
    pattern: 'npm ERR!|npm error',
    status: TerminalActivityStatus.ERROR,
    priority: 60,
    enabled: true,
  },
  // Yarn prompts
  {
    id: 'yarn-prompt',
    name: 'Yarn Prompt',
    shell: 'all',
    pattern: 'yarn install|yarn add|\\[\\d+/\\d+\\] ',
    status: TerminalActivityStatus.WORKING,
    priority: 25,
    enabled: true,
  },
  // Pnpm prompts
  {
    id: 'pnpm-prompt',
    name: 'Pnpm Prompt',
    shell: 'all',
    pattern: 'pnpm i|Progress:',
    status: TerminalActivityStatus.WORKING,
    priority: 25,
    enabled: true,
  },
  // Pip prompts
  {
    id: 'pip-install',
    name: 'Pip Install',
    shell: 'all',
    pattern: 'Collecting|Installing collected packages|Successfully installed',
    status: TerminalActivityStatus.WORKING,
    priority: 25,
    enabled: true,
  },
  // Cargo prompts
  {
    id: 'cargo-compile',
    name: 'Cargo Compile',
    shell: 'all',
    pattern: 'Compiling|Downloading|Updating crates.io index',
    status: TerminalActivityStatus.WORKING,
    priority: 25,
    enabled: true,
  },
  // Go module prompts
  {
    id: 'go-mod',
    name: 'Go Module',
    shell: 'all',
    pattern: 'go: downloading|go: finding',
    status: TerminalActivityStatus.WORKING,
    priority: 25,
    enabled: true,
  },
];

/**
 * Interactive program patterns
 */
const INTERACTIVE_PATTERNS: StatusPattern[] = [
  // Sudo password prompt
  {
    id: 'sudo-password',
    name: 'Sudo Password Prompt',
    shell: 'all',
    pattern: '\\[sudo\\].*password|Password:',
    status: TerminalActivityStatus.WAITING,
    priority: 75,
    enabled: true,
  },
  // Generic yes/no prompt
  {
    id: 'yes-no-prompt',
    name: 'Yes/No Prompt',
    shell: 'all',
    pattern: '\\[y/n\\]|\\[Y/n\\]|\\[y/N\\]|\\(y/n\\)',
    status: TerminalActivityStatus.WAITING,
    priority: 55,
    enabled: true,
  },
  // Continue prompt
  {
    id: 'continue-prompt',
    name: 'Continue Prompt',
    shell: 'all',
    pattern: '(Continue|Proceed)\\?|Press .* to continue',
    status: TerminalActivityStatus.WAITING,
    priority: 54,
    enabled: true,
  },
  // Confirmation prompt
  {
    id: 'confirmation-prompt',
    name: 'Confirmation Prompt',
    shell: 'all',
    pattern: 'Are you sure\\?|Confirm\\?|Do you want to',
    status: TerminalActivityStatus.WAITING,
    priority: 53,
    enabled: true,
  },
  // Input prompt (ends with colon)
  {
    id: 'input-prompt',
    name: 'Input Prompt',
    shell: 'all',
    pattern: 'Enter .*:$|Type .*:$|Input:$',
    status: TerminalActivityStatus.WAITING,
    priority: 50,
    enabled: true,
  },
  // Press any key
  {
    id: 'press-any-key',
    name: 'Press Any Key',
    shell: 'all',
    pattern: 'Press any key|Hit enter|Press Enter|Press RETURN',
    status: TerminalActivityStatus.WAITING,
    priority: 52,
    enabled: true,
  },
];

/**
 * Build/Test patterns
 */
const BUILD_PATTERNS: StatusPattern[] = [
  // Test running
  {
    id: 'test-running',
    name: 'Test Running',
    shell: 'all',
    pattern: 'PASS|FAIL|\\d+ passing|\\d+ failing|Tests:.*\\d+ passed',
    status: TerminalActivityStatus.WORKING,
    priority: 35,
    enabled: true,
  },
  // Build in progress
  {
    id: 'build-progress',
    name: 'Build Progress',
    shell: 'all',
    pattern: 'Building|Bundling|Compiling \\d+ of \\d+|webpack|vite|esbuild',
    status: TerminalActivityStatus.WORKING,
    priority: 30,
    enabled: true,
  },
  // TypeScript type checking
  {
    id: 'typescript-check',
    name: 'TypeScript Check',
    shell: 'all',
    pattern: 'Type checking|tsc -|Found \\d+ error',
    status: TerminalActivityStatus.WORKING,
    priority: 30,
    enabled: true,
  },
  // Linter running
  {
    id: 'linter-running',
    name: 'Linter Running',
    shell: 'all',
    pattern: 'Linting|eslint|prettier|Running lint',
    status: TerminalActivityStatus.WORKING,
    priority: 28,
    enabled: true,
  },
];

/**
 * Docker patterns
 */
const DOCKER_PATTERNS: StatusPattern[] = [
  // Docker build
  {
    id: 'docker-build',
    name: 'Docker Build',
    shell: 'all',
    pattern: 'Step \\d+/\\d+|Building \\d+\\.\\d+s|Downloading|Extracting',
    status: TerminalActivityStatus.WORKING,
    priority: 30,
    enabled: true,
  },
  // Docker pull
  {
    id: 'docker-pull',
    name: 'Docker Pull',
    shell: 'all',
    pattern: 'Pulling from|Pull complete|Digest:',
    status: TerminalActivityStatus.WORKING,
    priority: 30,
    enabled: true,
  },
  // Docker compose
  {
    id: 'docker-compose',
    name: 'Docker Compose',
    shell: 'all',
    pattern: 'Creating |Starting |Stopping |Container .* Started|Attaching to',
    status: TerminalActivityStatus.WORKING,
    priority: 30,
    enabled: true,
  },
];

/**
 * All patterns combined, sorted by priority (higher first)
 */
export const ALL_PATTERNS: StatusPattern[] = [
  ...CLAUDE_CODE_PATTERNS,
  ...SSH_PATTERNS,
  ...GIT_PATTERNS,
  ...INTERACTIVE_PATTERNS,
  ...EDITOR_PATTERNS,
  ...BASH_PATTERNS,
  ...PACKAGE_MANAGER_PATTERNS,
  ...BUILD_PATTERNS,
  ...DOCKER_PATTERNS,
].sort((a, b) => b.priority - a.priority);

// Export individual pattern sets for customization
export {
  CLAUDE_CODE_PATTERNS,
  BASH_PATTERNS,
  SSH_PATTERNS,
  GIT_PATTERNS,
  EDITOR_PATTERNS,
  PACKAGE_MANAGER_PATTERNS,
  INTERACTIVE_PATTERNS,
  BUILD_PATTERNS,
  DOCKER_PATTERNS,
};

/**
 * Get patterns for a specific shell
 */
export function getPatternsForShell(shell: string): StatusPattern[] {
  // Treat CLAUDE_CODE_SKIP_PERMISSIONS as alias for CLAUDE_CODE
  // Both shells use the same status detection patterns
  const effectiveShell = shell === ShellType.CLAUDE_CODE_SKIP_PERMISSIONS
    ? ShellType.CLAUDE_CODE
    : shell;

  return ALL_PATTERNS.filter(
    (pattern) => pattern.shell === effectiveShell || pattern.shell === 'all'
  );
}

/**
 * Get patterns by category
 */
export function getPatternsByCategory(category: string): StatusPattern[] {
  switch (category) {
    case 'claude-code':
      return CLAUDE_CODE_PATTERNS;
    case 'bash':
    case 'shell':
      return BASH_PATTERNS;
    case 'ssh':
      return SSH_PATTERNS;
    case 'git':
      return GIT_PATTERNS;
    case 'editor':
    case 'editors':
      return EDITOR_PATTERNS;
    case 'package-manager':
    case 'npm':
    case 'yarn':
    case 'pnpm':
      return PACKAGE_MANAGER_PATTERNS;
    case 'interactive':
      return INTERACTIVE_PATTERNS;
    case 'build':
    case 'test':
      return BUILD_PATTERNS;
    case 'docker':
      return DOCKER_PATTERNS;
    default:
      return ALL_PATTERNS;
  }
}

/**
 * Pattern count statistics
 */
export const PATTERN_STATS = {
  total: ALL_PATTERNS.length,
  byCategory: {
    claudeCode: CLAUDE_CODE_PATTERNS.length,
    bash: BASH_PATTERNS.length,
    ssh: SSH_PATTERNS.length,
    git: GIT_PATTERNS.length,
    editors: EDITOR_PATTERNS.length,
    packageManager: PACKAGE_MANAGER_PATTERNS.length,
    interactive: INTERACTIVE_PATTERNS.length,
    build: BUILD_PATTERNS.length,
    docker: DOCKER_PATTERNS.length,
  },
} as const;
