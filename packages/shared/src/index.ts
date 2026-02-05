/**
 * @masterdashboard/shared
 *
 * Shared TypeScript types and utilities for Master Dashboard.
 * This package is used by both the frontend (Next.js) and backend (Node.js).
 *
 * @example
 * ```typescript
 * import {
 *   SessionType,
 *   ShellType,
 *   TerminalActivityStatus,
 *   createSessionId,
 *   terminalConfigSchema,
 * } from '@masterdashboard/shared';
 *
 * // Create a terminal config
 * const config = terminalConfigSchema.parse({
 *   shell: ShellType.ZSH,
 *   projectId: createProjectId(),
 * });
 * ```
 */

// ============================================================================
// Types
// ============================================================================

// Session types
export {
  SessionType,
  SessionStatus,
  type BaseSession,
  type SerializedBaseSession,
} from './types/session.js';

// Terminal types
export {
  ShellType,
  TerminalActivityStatus,
  type TerminalSession,
  type SerializedTerminalSession,
  type TerminalConfig,
  type TerminalReconnectPayload,
  type TerminalDimensions,
  DEFAULT_TERMINAL_DIMENSIONS,
} from './types/terminal.js';

// Project types
export {
  DEFAULT_SCROLLBACK_LINES,
  type ProjectSettings,
  type Project,
  type SerializedProject,
  type ProjectLayout,
  type SerializedProjectLayout,
  type ProjectSummary,
  type CreateProjectConfig,
  DEFAULT_PROJECT_SETTINGS,
} from './types/project.js';

// Status detection types
export {
  type StatusPattern,
  type CompiledStatusPattern,
  type StatusChangeEvent,
  type SerializedStatusChangeEvent,
  DEFAULT_STATUS_PATTERNS,
  type StatusDetectorConfig,
  DEFAULT_STATUS_DETECTOR_CONFIG,
} from './types/status.js';

// Buffer types
export {
  DEFAULT_BUFFER_CONFIG,
  type BufferConfig,
  type TerminalBuffer,
  type SerializedTerminalBuffer,
  type BufferSnapshot,
  type SerializedBufferSnapshot,
  type BufferStats,
  type BufferWriteOptions,
  type BufferReadOptions,
  type BufferSearchOptions,
  type BufferSearchResult,
} from './types/buffer.js';

// Browser types (V2)
export {
  BrowserEngine,
  type BrowserViewport,
  DEFAULT_BROWSER_VIEWPORT,
  type BrowserSession,
  type SerializedBrowserSession,
  type BrowserConfig,
  type ScreencastFrame,
  type BrowserInputType,
  type BrowserInputPayload,
  type BrowserNavigatePayload,
  type BrowserNavigateResult,
  type BrowserConsoleMessage,
  type BrowserScreenshotOptions,
} from './types/browser.js';

// Canvas types
export {
  NodeType,
  type BaseNodeData,
  type TerminalNodeData,
  type BrowserNodeData,
  type SSHNodeData,
  type FolderViewerNodeData,
  type NotesNodeData,
  type NoteColor,
  type NoteMode,
  type ViewerNodeData,
  type ViewerContentType,
  type DiffViewMode,
  type DiffStats,
  type DiffNodeData,
  type DatabaseNodeData,
  type GitNodeData,
  type DashboardNodeData,
  type DashboardNode,
  type TerminalNode,
  type BrowserNode,
  type SSHNode,
  type FolderNode,
  type NotesNode,
  type ViewerNode,
  type DiffNode,
  type DatabaseNode,
  type GitNode,
  type DashboardEdge,
  type CanvasViewport,
  type CanvasLayout,
  type SerializedCanvasLayout,
  type NodePosition,
  type NodeDimensions,
  DEFAULT_NODE_DIMENSIONS,
  type CreateNodeOptions,
  type LayoutPreset,
  type LayoutPresetConfig,
  DEFAULT_LAYOUT_CONFIG,
  DEFAULT_VIEWPORT,
} from './types/canvas.js';

// Git types
export {
  GitFileStatus,
  type GitFileEntry,
  type GitStatus,
  type GitCommit,
  type GitBranch,
  type GitOperationResult,
  type GitViewMode,
} from './types/git.js';

// Database types
export {
  DatabaseEngine,
  DatabaseConnectionStatus,
  type DatabaseConfig,
  type DatabaseSession,
  type SerializedDatabaseSession,
  type DatabaseColumn,
  type DatabaseTable,
  type DatabaseIndex,
  type DatabaseSchema,
  type QueryResult,
  type QueryHistoryEntry,
  type DatabaseViewport,
  DEFAULT_DATABASE_VIEWPORT,
  DEFAULT_DATABASE_PORTS,
  DATABASE_QUERY_LIMITS,
} from './types/database.js';

// WebSocket types
export {
  WS_EVENTS,
  type WSEventName,
  type SessionCreatePayload,
  type SessionCreatedPayload,
  type SessionTerminatePayload,
  type SessionTerminatedPayload,
  type SessionDisconnectedPayload,
  type SessionErrorPayload,
  type SessionListPayload,
  type TerminalInputPayload,
  type TerminalOutputPayload,
  type TerminalResizePayload,
  type TerminalReconnectRequest,
  type TerminalReconnectResponse,
  type StatusChangePayload,
  type StatusPatternAddPayload,
  type StatusPatternRemovePayload,
  type ClientReconnectPayload,
  type ClientReconnectResponse,
  type ProjectCreatePayload,
  type ProjectUpdatePayload,
  type ProjectDeletePayload,
  // File payloads
  type FileListPayload,
  type FileListResponsePayload,
  type FileTreePayload,
  type FileTreeResponsePayload,
  type FileInfoPayload,
  type FileInfoResponsePayload,
  type FileSearchPayload,
  type FileSearchResponsePayload,
  type FileLaunchPayload,
  type FileLaunchResponsePayload,
  type FileWatchPayload,
  type FileWatchResponsePayload,
  type FileChangedPayload,
  type FileReadPayload,
  type FileReadResponsePayload,
  type FileErrorPayload,
  // File operation payloads
  type FileCreatePayload,
  type FileCreateResponsePayload,
  type FileCreateFolderPayload,
  type FileCreateFolderResponsePayload,
  type FileRenamePayload,
  type FileRenameResponsePayload,
  type FileDeletePayload,
  type FileDeleteResponsePayload,
  type FileCopyPayload,
  type FileCopyResponsePayload,
  type FileMovePayload,
  type FileMoveResponsePayload,
  // Note payloads
  type NoteCreatePayload,
  type NoteCreatedPayload,
  type NoteUpdatePayload,
  type NoteUpdatedPayload,
  type NoteDeletePayload,
  type NoteDeletedPayload,
  type NoteListPayload,
  type NoteListResponsePayload,
  type WSMessage,
  type WSErrorResponse,
  type WSAckResponse,
  // Git payloads
  type GitStatusPayload,
  type GitStatusResponsePayload,
  type GitLogPayload,
  type GitLogResponsePayload,
  type GitBranchesPayload,
  type GitBranchesResponsePayload,
  type GitCheckoutPayload,
  type GitCheckoutResponsePayload,
  type GitStagePayload,
  type GitStageResponsePayload,
  type GitUnstagePayload,
  type GitUnstageResponsePayload,
  type GitCommitPayload,
  type GitCommitResponsePayload,
  type GitPushPayload,
  type GitPushResponsePayload,
  type GitPullPayload,
  type GitPullResponsePayload,
  type GitDiscardPayload,
  type GitDiscardResponsePayload,
  type GitErrorPayload,
  // Database payloads
  type DatabaseConnectPayload,
  type DatabaseConnectedPayload,
  type DatabaseDisconnectPayload,
  type DatabaseDisconnectedPayload,
  type DatabaseQueryPayload,
  type DatabaseQueryResultPayload,
  type DatabaseQueryErrorPayload,
  type DatabaseSchemaPayload,
  type DatabaseSchemaResponsePayload,
  type DatabaseTablesPayload,
  type DatabaseTablesResponsePayload,
  type DatabaseErrorPayload,
  type DatabaseTestConnectionPayload,
  type DatabaseTestConnectionResponsePayload,
} from './types/websocket.js';

// SSH types
export {
  type SSHAuthMethod,
  type SSHCredentials,
  type SSHSession,
  type SerializedSSHSession,
  type SSHConfig,
  type SSHConnectResult,
  SSHErrorCode,
  type SSHHostKeyVerification,
  type SSHHostKeyVerificationResponse,
  type SSHPortForward,
  type SavedSSHConnection,
  SSH_DEFAULTS,
} from './types/ssh.js';

// File types
export {
  FileType,
  FileAction,
  FileCategory,
  type FileEntry,
  type DirectoryListing,
  type FileTreeNode,
  type SortField,
  type FolderViewerConfig,
  DEFAULT_FOLDER_VIEWER_CONFIG,
  FILE_CATEGORIES,
  TEXT_FILE_EXTENSIONS,
  EXECUTABLE_EXTENSIONS,
  FILE_VIEWER_SHORTCUTS,
  getFileCategory,
  isTextFile,
  isExecutableScript,
} from './types/file.js';

// ============================================================================
// Constants
// ============================================================================

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
} from './constants/shells.js';

// Event constants
export {
  EVENT_CATEGORIES,
  EVENTS_BY_CATEGORY,
  AUTHENTICATED_EVENTS,
  RATE_LIMITED_EVENTS,
  EVENT_TIMEOUT_MS,
  HEARTBEAT_INTERVAL_MS,
  RECONNECT_CONFIG,
} from './constants/events.js';

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
} from './constants/patterns.js';

// ============================================================================
// Utilities
// ============================================================================

// ID generation utilities
export {
  DEFAULT_ID_LENGTH,
  SHORT_ID_LENGTH,
  ID_PREFIXES,
  type IdPrefix,
  createSessionId,
  createTerminalId,
  createBrowserId,
  createSSHId,
  createProjectId,
  createLayoutId,
  createNodeId,
  createPatternId,
  createBufferId,
  createId,
  createShortId,
  createPinCode,
  createSlugId,
  createCorrelationId,
  getIdPrefix,
  hasIdPrefix,
  isValidId,
  isValidPrefixedId,
} from './utils/id.js';

// Validation utilities
export {
  // Base schemas
  idSchema,
  prefixedIdSchema,
  // Session schemas
  sessionTypeSchema,
  sessionStatusSchema,
  // Terminal schemas
  shellTypeSchema,
  terminalActivityStatusSchema,
  terminalDimensionsSchema,
  terminalConfigSchema,
  type ValidatedTerminalConfig,
  // Project schemas
  projectSettingsSchema,
  createProjectConfigSchema,
  type ValidatedCreateProjectConfig,
  // Browser schemas
  browserEngineSchema,
  browserViewportSchema,
  browserConfigSchema,
  type ValidatedBrowserConfig,
  // SSH schemas
  sshAuthMethodSchema,
  sshConfigSchema,
  type ValidatedSSHConfig,
  // Canvas schemas
  nodeTypeSchema,
  nodePositionSchema,
  nodeDimensionsSchema,
  canvasViewportSchema,
  // Status pattern schemas
  statusPatternSchema,
  type ValidatedStatusPattern,
  // Buffer schemas
  bufferConfigSchema,
  type ValidatedBufferConfig,
  // WebSocket payload schemas
  terminalInputPayloadSchema,
  terminalResizePayloadSchema,
  sessionCreatePayloadSchema,
  // Validation helpers
  validate,
  safeValidate,
  partial,
  formatZodErrors,
} from './utils/validation.js';
