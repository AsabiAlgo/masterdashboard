/**
 * Constants Exports
 *
 * Re-exports all constants from the constants directory.
 */

// Shell constants
export {
  DEFAULT_SHELL_BY_PLATFORM,
  SHELL_BINARY_PATHS,
  SHELL_DISPLAY_NAMES,
  SHELL_ICONS,
  SHELL_STARTUP_ARGS,
  SHELL_ENV_DEFAULTS,
  supportsLoginMode,
  isWindowsShell,
  getDefaultShell,
} from './shells.js';

// Event constants
export {
  WS_EVENTS,
  EVENT_CATEGORIES,
  EVENTS_BY_CATEGORY,
  AUTHENTICATED_EVENTS,
  RATE_LIMITED_EVENTS,
  EVENT_TIMEOUT_MS,
  HEARTBEAT_INTERVAL_MS,
  RECONNECT_CONFIG,
} from './events.js';

// Pattern constants
export {
  ANSI_ESCAPE_PATTERN,
  CONTROL_SEQUENCE_PATTERN,
  CURSOR_POSITION_PATTERN,
  TITLE_CHANGE_PATTERN,
  CWD_UPDATE_PATTERN,
  PROMPT_ENDINGS,
  SHELL_PROMPT_PATTERN,
  COMMAND_PREFIX_PATTERNS,
  RUNNING_PROCESS_PATTERNS,
  ERROR_PATTERNS,
  WARNING_PATTERNS,
  WAITING_PATTERNS,
  CLAUDE_CODE_PATTERNS,
  compileStatusPattern,
  stripAnsi,
  stripControlSequences,
  extractTitle,
  extractCwd,
  hasErrorIndicator,
  hasWaitingIndicator,
  detectActivityStatus,
} from './patterns.js';
