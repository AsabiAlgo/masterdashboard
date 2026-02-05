/**
 * Editor Patterns
 *
 * Status detection patterns for terminal-based editors.
 * Detects vim, nano, emacs, and other editor states.
 */

import {
  TerminalActivityStatus,
  type StatusPattern,
} from '@masterdashboard/shared';

/**
 * Editor specific patterns
 *
 * Detects:
 * - Vim command/insert/visual modes
 * - Nano prompts
 * - Emacs prompts
 * - Less/more pagers
 * - Man pages
 */
export const EDITOR_PATTERNS: StatusPattern[] = [
  // Vim command mode
  {
    id: 'vim-command-mode',
    name: 'Vim Command Mode',
    shell: 'all',
    pattern: '^:\\s*$',
    status: TerminalActivityStatus.WAITING,
    priority: 60,
    enabled: true,
  },
  // Vim command with partial input
  {
    id: 'vim-command-input',
    name: 'Vim Command Input',
    shell: 'all',
    pattern: '^:.+$',
    status: TerminalActivityStatus.WAITING,
    priority: 59,
    enabled: true,
  },
  // Vim insert mode indicator
  {
    id: 'vim-insert-mode',
    name: 'Vim Insert Mode',
    shell: 'all',
    pattern: '-- INSERT --|-- REPLACE --|-- VISUAL --',
    status: TerminalActivityStatus.WORKING,
    priority: 55,
    enabled: true,
  },
  // Vim normal mode (bottom line empty or showing file info)
  {
    id: 'vim-normal-mode',
    name: 'Vim Normal Mode',
    shell: 'all',
    pattern: '"[^"]+".*(\\d+L|\\d+ lines)',
    status: TerminalActivityStatus.WAITING,
    priority: 54,
    enabled: true,
  },
  // Vim search prompt
  {
    id: 'vim-search',
    name: 'Vim Search',
    shell: 'all',
    pattern: '^[/?].*$',
    status: TerminalActivityStatus.WAITING,
    priority: 58,
    enabled: true,
  },
  // Vim save confirmation
  {
    id: 'vim-save-prompt',
    name: 'Vim Save Prompt',
    shell: 'all',
    pattern: 'Save changes\\?|E37:|E162:',
    status: TerminalActivityStatus.WAITING,
    priority: 62,
    enabled: true,
  },
  // Nano prompts
  {
    id: 'nano-prompt',
    name: 'Nano Prompt',
    shell: 'all',
    pattern: '\\^G Get Help|\\^X Exit',
    status: TerminalActivityStatus.WAITING,
    priority: 50,
    enabled: true,
  },
  // Nano save prompt
  {
    id: 'nano-save',
    name: 'Nano Save',
    shell: 'all',
    pattern: 'Save modified buffer\\?|File Name to Write:',
    status: TerminalActivityStatus.WAITING,
    priority: 52,
    enabled: true,
  },
  // Less/more pager
  {
    id: 'pager-prompt',
    name: 'Pager Prompt',
    shell: 'all',
    pattern: ':\\s*$|--More--|\\(END\\)|lines \\d+-\\d+',
    status: TerminalActivityStatus.WAITING,
    priority: 45,
    enabled: true,
  },
  // Man page
  {
    id: 'man-page',
    name: 'Man Page',
    shell: 'all',
    pattern: 'Manual page .*line \\d+',
    status: TerminalActivityStatus.WAITING,
    priority: 44,
    enabled: true,
  },
  // Emacs minibuffer
  {
    id: 'emacs-minibuffer',
    name: 'Emacs Minibuffer',
    shell: 'all',
    pattern: 'M-x|C-x|Find file:|Switch to buffer:',
    status: TerminalActivityStatus.WAITING,
    priority: 48,
    enabled: true,
  },
  // Tmux command mode
  {
    id: 'tmux-command',
    name: 'Tmux Command',
    shell: 'all',
    pattern: '\\(tmux\\)|\\[\\d+/\\d+\\]',
    status: TerminalActivityStatus.WAITING,
    priority: 42,
    enabled: true,
  },
  // Screen command mode
  {
    id: 'screen-command',
    name: 'Screen Command',
    shell: 'all',
    pattern: 'screen \\d+:',
    status: TerminalActivityStatus.WAITING,
    priority: 41,
    enabled: true,
  },
];

export default EDITOR_PATTERNS;
