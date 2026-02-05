/**
 * WebSocket Types
 *
 * Types for WebSocket communication between frontend and backend.
 * Includes event names and message payloads.
 */

import type { SessionType, SessionStatus } from './session.js';
import type { TerminalConfig, TerminalActivityStatus } from './terminal.js';
import type { BrowserConfig } from './browser.js';
import type { SSHConfig } from './ssh.js';
import type { SerializedBufferSnapshot } from './buffer.js';
import type { StatusPattern } from './status.js';

/**
 * WebSocket event names as const object for type safety
 */
export const WS_EVENTS = {
  // Connection lifecycle
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  RECONNECT: 'reconnect',
  ERROR: 'error',
  PING: 'ping',
  PONG: 'pong',

  // Session management
  SESSION_CREATE: 'session:create',
  SESSION_CREATED: 'session:created',
  SESSION_TERMINATE: 'session:terminate',
  SESSION_TERMINATED: 'session:terminated',
  SESSION_DISCONNECTED: 'session:disconnected',
  SESSION_ERROR: 'session:error',
  SESSION_LIST: 'session:list',
  SESSION_LIST_RESPONSE: 'session:list:response',

  // Terminal events
  TERMINAL_INPUT: 'terminal:input',
  TERMINAL_OUTPUT: 'terminal:output',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_RECONNECT: 'terminal:reconnect',
  TERMINAL_RECONNECT_RESPONSE: 'terminal:reconnect:response',
  TERMINAL_BUFFER: 'terminal:buffer',
  TERMINAL_CLEAR: 'terminal:clear',

  // Status events
  STATUS_CHANGE: 'status:change',
  STATUS_PATTERN_ADD: 'status:pattern:add',
  STATUS_PATTERN_REMOVE: 'status:pattern:remove',
  STATUS_PATTERNS_LIST: 'status:patterns:list',

  // Project events
  PROJECT_CREATE: 'project:create',
  PROJECT_CREATED: 'project:created',
  PROJECT_UPDATE: 'project:update',
  PROJECT_UPDATED: 'project:updated',
  PROJECT_DELETE: 'project:delete',
  PROJECT_DELETED: 'project:deleted',
  PROJECT_LIST: 'project:list',
  PROJECT_LIST_RESPONSE: 'project:list:response',

  // Layout events
  LAYOUT_SAVE: 'layout:save',
  LAYOUT_SAVED: 'layout:saved',
  LAYOUT_LOAD: 'layout:load',
  LAYOUT_LOADED: 'layout:loaded',
  LAYOUT_DELETE: 'layout:delete',
  LAYOUT_DELETED: 'layout:deleted',

  // Browser events (V2)
  BROWSER_FRAME: 'browser:frame',
  BROWSER_INPUT: 'browser:input',
  BROWSER_NAVIGATE: 'browser:navigate',
  BROWSER_NAVIGATE_RESULT: 'browser:navigate:result',
  BROWSER_CONSOLE: 'browser:console',

  // SSH events
  SSH_CONNECT: 'ssh:connect',
  SSH_CONNECTED: 'ssh:connected',
  SSH_INPUT: 'ssh:input',
  SSH_OUTPUT: 'ssh:output',
  SSH_ERROR: 'ssh:error',
  SSH_CLOSE: 'ssh:close',

  // File/Folder events
  FILE_LIST: 'file:list',
  FILE_LIST_RESPONSE: 'file:list:response',
  FILE_TREE: 'file:tree',
  FILE_TREE_RESPONSE: 'file:tree:response',
  FILE_INFO: 'file:info',
  FILE_INFO_RESPONSE: 'file:info:response',
  FILE_SEARCH: 'file:search',
  FILE_SEARCH_RESPONSE: 'file:search:response',
  FILE_LAUNCH: 'file:launch',
  FILE_LAUNCH_RESPONSE: 'file:launch:response',
  FILE_WATCH: 'file:watch',
  FILE_WATCH_RESPONSE: 'file:watch:response',
  FILE_CHANGED: 'file:changed',
  FILE_READ: 'file:read',
  FILE_READ_RESPONSE: 'file:read:response',
  FILE_READ_IMAGE: 'file:read:image',
  FILE_READ_IMAGE_RESPONSE: 'file:read:image:response',
  FILE_WRITE: 'file:write',
  FILE_WRITE_RESPONSE: 'file:write:response',
  FILE_CREATE: 'file:create',
  FILE_CREATE_RESPONSE: 'file:create:response',
  FILE_CREATE_FOLDER: 'file:create:folder',
  FILE_CREATE_FOLDER_RESPONSE: 'file:create:folder:response',
  FILE_RENAME: 'file:rename',
  FILE_RENAME_RESPONSE: 'file:rename:response',
  FILE_DELETE: 'file:delete',
  FILE_DELETE_RESPONSE: 'file:delete:response',
  FILE_COPY: 'file:copy',
  FILE_COPY_RESPONSE: 'file:copy:response',
  FILE_MOVE: 'file:move',
  FILE_MOVE_RESPONSE: 'file:move:response',
  FILE_ERROR: 'file:error',

  // Notes events
  NOTE_CREATE: 'note:create',
  NOTE_CREATED: 'note:created',
  NOTE_UPDATE: 'note:update',
  NOTE_UPDATED: 'note:updated',
  NOTE_DELETE: 'note:delete',
  NOTE_DELETED: 'note:deleted',
  NOTE_LIST: 'note:list',
  NOTE_LIST_RESPONSE: 'note:list:response',

  // Database events
  DATABASE_CONNECT: 'database:connect',
  DATABASE_CONNECTED: 'database:connected',
  DATABASE_DISCONNECT: 'database:disconnect',
  DATABASE_DISCONNECTED: 'database:disconnected',
  DATABASE_QUERY: 'database:query',
  DATABASE_QUERY_RESULT: 'database:query:result',
  DATABASE_QUERY_ERROR: 'database:query:error',
  DATABASE_SCHEMA: 'database:schema',
  DATABASE_SCHEMA_RESPONSE: 'database:schema:response',
  DATABASE_TABLES: 'database:tables',
  DATABASE_TABLES_RESPONSE: 'database:tables:response',
  DATABASE_ERROR: 'database:error',
  DATABASE_TEST_CONNECTION: 'database:test:connection',
  DATABASE_TEST_CONNECTION_RESPONSE: 'database:test:connection:response',

  // Git events
  GIT_STATUS: 'git:status',
  GIT_STATUS_RESPONSE: 'git:status:response',
  GIT_LOG: 'git:log',
  GIT_LOG_RESPONSE: 'git:log:response',
  GIT_BRANCHES: 'git:branches',
  GIT_BRANCHES_RESPONSE: 'git:branches:response',
  GIT_CHECKOUT: 'git:checkout',
  GIT_CHECKOUT_RESPONSE: 'git:checkout:response',
  GIT_STAGE: 'git:stage',
  GIT_STAGE_RESPONSE: 'git:stage:response',
  GIT_UNSTAGE: 'git:unstage',
  GIT_UNSTAGE_RESPONSE: 'git:unstage:response',
  GIT_COMMIT: 'git:commit',
  GIT_COMMIT_RESPONSE: 'git:commit:response',
  GIT_PUSH: 'git:push',
  GIT_PUSH_RESPONSE: 'git:push:response',
  GIT_PULL: 'git:pull',
  GIT_PULL_RESPONSE: 'git:pull:response',
  GIT_DISCARD: 'git:discard',
  GIT_DISCARD_RESPONSE: 'git:discard:response',
  GIT_ERROR: 'git:error',
} as const;

/**
 * Type for WebSocket event names
 */
export type WSEventName = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];

// ============================================================================
// Session Payloads
// ============================================================================

/**
 * Payload for creating a new session
 */
export interface SessionCreatePayload {
  type: SessionType;
  projectId: string;
  config: TerminalConfig | BrowserConfig | SSHConfig;
}

/**
 * Response when session is created
 */
export interface SessionCreatedPayload {
  sessionId: string;
  type: SessionType;
  projectId: string;
  status: SessionStatus;
}

/**
 * Payload for terminating a session
 */
export interface SessionTerminatePayload {
  sessionId: string;
}

/**
 * Response when session is terminated
 */
export interface SessionTerminatedPayload {
  sessionId: string;
  exitCode?: number;
}

/**
 * Payload when session is disconnected (PTY died but tmux alive)
 */
export interface SessionDisconnectedPayload {
  sessionId: string;
}

/**
 * Session error payload
 */
export interface SessionErrorPayload {
  sessionId: string;
  error: string;
  code?: string;
}

/**
 * Payload for listing sessions
 */
export interface SessionListPayload {
  projectId: string;
}

// ============================================================================
// Terminal Payloads
// ============================================================================

/**
 * Payload for terminal input (keyboard data)
 */
export interface TerminalInputPayload {
  sessionId: string;
  data: string;
}

/**
 * Payload for terminal output
 */
export interface TerminalOutputPayload {
  sessionId: string;
  data: string;
  timestamp?: number;
}

/**
 * Payload for terminal resize
 */
export interface TerminalResizePayload {
  sessionId: string;
  cols: number;
  rows: number;
}

/**
 * Request to reconnect to a terminal session
 */
export interface TerminalReconnectRequest {
  sessionId: string;
  /** Timestamp of last received output for replay */
  lastReceivedTimestamp?: number;
}

/**
 * Response to terminal reconnect request
 */
export interface TerminalReconnectResponse {
  sessionId: string;
  success: boolean;
  /** Buffered output since disconnect */
  bufferedOutput?: string;
  /** Current terminal status */
  currentStatus?: TerminalActivityStatus;
  /** Error message if reconnect failed */
  error?: string;
}

// ============================================================================
// Status Payloads
// ============================================================================

/**
 * Payload for status change notification
 */
export interface StatusChangePayload {
  sessionId: string;
  previousStatus: TerminalActivityStatus;
  status: TerminalActivityStatus;
  matchedPattern?: string;
  timestamp: string;
}

/**
 * Payload for adding a status pattern
 */
export interface StatusPatternAddPayload {
  pattern: StatusPattern;
}

/**
 * Payload for removing a status pattern
 */
export interface StatusPatternRemovePayload {
  patternId: string;
}

// ============================================================================
// Client Reconnection
// ============================================================================

/**
 * Client reconnection request (when browser reconnects)
 */
export interface ClientReconnectPayload {
  /** Project the client was working with */
  projectId: string;
  /** Sessions the client thinks are active */
  sessionIds: string[];
  /** Last known timestamps for each session */
  lastTimestamps?: Record<string, number>;
}

/**
 * Server response to client reconnection
 */
export interface ClientReconnectResponse {
  /** Sessions that are still running */
  activeSessions: string[];
  /** Sessions that have ended */
  terminatedSessions: string[];
  /** Sessions with different status than expected */
  statusChanges: Array<{
    sessionId: string;
    status: SessionStatus;
    activityStatus?: TerminalActivityStatus;
  }>;
  /** Buffer snapshots for replay */
  buffers: SerializedBufferSnapshot[];
}

// ============================================================================
// Project Payloads
// ============================================================================

/**
 * Payload for creating a project
 */
export interface ProjectCreatePayload {
  name: string;
  description?: string;
  defaultCwd: string;
  settings?: Record<string, unknown>;
}

/**
 * Payload for updating a project
 */
export interface ProjectUpdatePayload {
  projectId: string;
  name?: string;
  description?: string;
  defaultCwd?: string;
  settings?: Record<string, unknown>;
}

/**
 * Payload for deleting a project
 */
export interface ProjectDeletePayload {
  projectId: string;
}

// ============================================================================
// File/Folder Payloads
// ============================================================================

import type {
  FileEntry,
  FileTreeNode,
  FileAction,
  SortField,
} from './file.js';
import type { NodeType } from './canvas.js';

/**
 * Payload for listing directory contents
 */
export interface FileListPayload {
  path: string;
  projectId: string;
  showHidden?: boolean;
  sortBy?: SortField;
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Response for directory listing
 */
export interface FileListResponsePayload {
  path: string;
  parentPath: string | null;
  entries: FileEntry[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * Payload for getting file tree
 */
export interface FileTreePayload {
  path: string;
  projectId: string;
  depth?: number;
  showHidden?: boolean;
}

/**
 * Response for file tree
 */
export interface FileTreeResponsePayload {
  tree: FileTreeNode;
}

/**
 * Payload for getting file info
 */
export interface FileInfoPayload {
  path: string;
  projectId: string;
}

/**
 * Response for file info
 */
export interface FileInfoResponsePayload {
  entry: FileEntry;
}

/**
 * Payload for searching files
 */
export interface FileSearchPayload {
  rootPath: string;
  projectId: string;
  query: string;
  maxResults?: number;
  includeHidden?: boolean;
  fileTypes?: string[];
}

/**
 * Response for file search
 */
export interface FileSearchResponsePayload {
  query: string;
  results: FileEntry[];
  totalMatches: number;
  truncated: boolean;
}

/**
 * Payload for launching a file
 */
export interface FileLaunchPayload {
  path: string;
  projectId: string;
  action: FileAction;
  cwd?: string;
  args?: string[];
}

/**
 * Response for file launch
 */
export interface FileLaunchResponsePayload {
  success: boolean;
  sessionId?: string;
  nodeType?: NodeType;
  filePath?: string;
  error?: string;
}

/**
 * Payload for watching a directory
 */
export interface FileWatchPayload {
  path: string;
  projectId: string;
  recursive?: boolean;
}

/**
 * Response for file watch
 */
export interface FileWatchResponsePayload {
  success: boolean;
  path: string;
}

/**
 * Payload when file changed
 */
export interface FileChangedPayload {
  path: string;
  event: 'created' | 'modified' | 'deleted' | 'renamed';
  oldPath?: string;
}

/**
 * Payload for reading file content
 */
export interface FileReadPayload {
  path: string;
  projectId: string;
  startLine?: number;
  endLine?: number;
  maxBytes?: number;
}

/**
 * Response for file read
 */
export interface FileReadResponsePayload {
  path: string;
  content: string;
  language: string;
  totalLines: number;
  truncated: boolean;
  encoding: string;
}

/**
 * File error payload
 */
export interface FileErrorPayload {
  path: string;
  error: string;
  code?: string;
}

// ============================================================================
// File Operation Payloads (Create, Rename, Delete, Copy, Move)
// ============================================================================

/**
 * Payload for creating a new file
 */
export interface FileCreatePayload {
  parentPath: string;
  projectId: string;
  name: string;
  content?: string;
}

/**
 * Response for file creation
 */
export interface FileCreateResponsePayload {
  success: boolean;
  path?: string;
  entry?: FileEntry;
  error?: string;
}

/**
 * Payload for creating a new folder
 */
export interface FileCreateFolderPayload {
  parentPath: string;
  projectId: string;
  name: string;
}

/**
 * Response for folder creation
 */
export interface FileCreateFolderResponsePayload {
  success: boolean;
  path?: string;
  entry?: FileEntry;
  error?: string;
}

/**
 * Payload for renaming a file or folder
 */
export interface FileRenamePayload {
  path: string;
  projectId: string;
  newName: string;
}

/**
 * Response for file/folder rename
 */
export interface FileRenameResponsePayload {
  success: boolean;
  oldPath?: string;
  newPath?: string;
  entry?: FileEntry;
  error?: string;
}

/**
 * Payload for deleting files or folders
 */
export interface FileDeletePayload {
  paths: string[];
  projectId: string;
}

/**
 * Response for file/folder deletion
 */
export interface FileDeleteResponsePayload {
  success: boolean;
  deletedPaths?: string[];
  failedPaths?: Array<{ path: string; error: string }>;
  error?: string;
}

/**
 * Payload for copying files or folders
 */
export interface FileCopyPayload {
  sourcePaths: string[];
  destinationPath: string;
  projectId: string;
}

/**
 * Response for file/folder copy
 */
export interface FileCopyResponsePayload {
  success: boolean;
  copiedPaths?: Array<{ source: string; destination: string }>;
  failedPaths?: Array<{ path: string; error: string }>;
  error?: string;
}

/**
 * Payload for moving files or folders
 */
export interface FileMovePayload {
  sourcePaths: string[];
  destinationPath: string;
  projectId: string;
}

/**
 * Response for file/folder move
 */
export interface FileMoveResponsePayload {
  success: boolean;
  movedPaths?: Array<{ source: string; destination: string }>;
  failedPaths?: Array<{ path: string; error: string }>;
  error?: string;
}

// ============================================================================
// Notes Payloads
// ============================================================================

import type { NoteColor, NoteMode } from './canvas.js';

/**
 * Payload for creating a note
 */
export interface NoteCreatePayload {
  projectId: string;
  content?: string;
  color?: NoteColor;
  mode?: NoteMode;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
}

/**
 * Response when note is created
 */
export interface NoteCreatedPayload {
  id: string;
  projectId: string;
  content: string;
  color: NoteColor;
  mode: NoteMode;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload for updating a note
 */
export interface NoteUpdatePayload {
  noteId: string;
  content?: string;
  color?: NoteColor;
  mode?: NoteMode;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
}

/**
 * Response when note is updated
 */
export interface NoteUpdatedPayload {
  id: string;
  content?: string;
  color?: NoteColor;
  mode?: NoteMode;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  updatedAt: string;
}

/**
 * Payload for deleting a note
 */
export interface NoteDeletePayload {
  noteId: string;
}

/**
 * Response when note is deleted
 */
export interface NoteDeletedPayload {
  noteId: string;
}

/**
 * Payload for listing notes
 */
export interface NoteListPayload {
  projectId: string;
}

/**
 * Response for notes list
 */
export interface NoteListResponsePayload {
  notes: NoteCreatedPayload[];
}

// ============================================================================
// Database Payloads
// ============================================================================

import type {
  DatabaseEngine,
  DatabaseSchema,
  QueryResult,
  DatabaseTable,
} from './database.js';

/**
 * Payload for connecting to a database
 */
export interface DatabaseConnectPayload {
  /** Database engine type */
  engine: DatabaseEngine;
  /** Connection name for display */
  name: string;
  /** Host address (not used for SQLite) */
  host?: string;
  /** Port number (not used for SQLite) */
  port?: number;
  /** Username (not used for SQLite) */
  username?: string;
  /** Password (not used for SQLite) */
  password?: string;
  /** Database name or file path for SQLite */
  database: string;
  /** Project this connection belongs to */
  projectId: string;
  /** Use SSL/TLS */
  ssl?: boolean;
}

/**
 * Response when database is connected
 */
export interface DatabaseConnectedPayload {
  /** Session ID for this connection */
  sessionId: string;
  /** Database engine */
  engine: DatabaseEngine;
  /** Connection name */
  name: string;
  /** Host (without password) */
  host?: string;
  /** Port */
  port?: number;
  /** Database name/path */
  database: string;
  /** Username */
  username?: string;
}

/**
 * Payload for disconnecting from a database
 */
export interface DatabaseDisconnectPayload {
  /** Session ID to disconnect */
  sessionId: string;
}

/**
 * Response when database is disconnected
 */
export interface DatabaseDisconnectedPayload {
  /** Session ID that was disconnected */
  sessionId: string;
}

/**
 * Payload for executing a database query
 */
export interface DatabaseQueryPayload {
  /** Session ID */
  sessionId: string;
  /** SQL query to execute */
  query: string;
  /** Query parameters for parameterized queries */
  params?: unknown[];
  /** Maximum rows to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Response for query result
 */
export interface DatabaseQueryResultPayload {
  /** Session ID */
  sessionId: string;
  /** Query results */
  result: QueryResult;
}

/**
 * Payload for query error
 */
export interface DatabaseQueryErrorPayload {
  /** Session ID */
  sessionId: string;
  /** Error message */
  error: string;
  /** SQL error code if available */
  sqlErrorCode?: string;
  /** Original query that failed */
  query: string;
}

/**
 * Payload for requesting schema
 */
export interface DatabaseSchemaPayload {
  /** Session ID */
  sessionId: string;
  /** Schema name to filter (PostgreSQL) */
  schema?: string;
}

/**
 * Response for schema request
 */
export interface DatabaseSchemaResponsePayload {
  /** Session ID */
  sessionId: string;
  /** Database schema */
  schema: DatabaseSchema;
}

/**
 * Payload for requesting tables
 */
export interface DatabaseTablesPayload {
  /** Session ID */
  sessionId: string;
  /** Schema name to filter (PostgreSQL) */
  schema?: string;
}

/**
 * Response for tables request
 */
export interface DatabaseTablesResponsePayload {
  /** Session ID */
  sessionId: string;
  /** Tables in the database */
  tables: DatabaseTable[];
}

/**
 * Database error payload
 */
export interface DatabaseErrorPayload {
  /** Session ID if applicable */
  sessionId?: string;
  /** Error message */
  error: string;
  /** Error code */
  code?: string;
}

/**
 * Payload for testing connection
 */
export interface DatabaseTestConnectionPayload {
  /** Database engine type */
  engine: DatabaseEngine;
  /** Host address */
  host?: string;
  /** Port number */
  port?: number;
  /** Username */
  username?: string;
  /** Password */
  password?: string;
  /** Database name or file path */
  database: string;
  /** Use SSL/TLS */
  ssl?: boolean;
}

/**
 * Response for connection test
 */
export interface DatabaseTestConnectionResponsePayload {
  /** Whether connection succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Database version if available */
  version?: string;
}

// ============================================================================
// Git Payloads
// ============================================================================

import type { GitStatus, GitCommit, GitBranch, GitOperationResult } from './git.js';

/**
 * Payload for getting git status
 */
export interface GitStatusPayload {
  /** Repository path */
  repoPath: string;
  /** Project ID */
  projectId: string;
}

/**
 * Response for git status
 */
export interface GitStatusResponsePayload {
  /** Repository path */
  repoPath: string;
  /** Git status */
  status: GitStatus;
}

/**
 * Payload for getting git log
 */
export interface GitLogPayload {
  /** Repository path */
  repoPath: string;
  /** Project ID */
  projectId: string;
  /** Maximum number of commits to return */
  limit?: number;
  /** Number of commits to skip */
  skip?: number;
}

/**
 * Response for git log
 */
export interface GitLogResponsePayload {
  /** Repository path */
  repoPath: string;
  /** Commits */
  commits: GitCommit[];
  /** Whether there are more commits */
  hasMore: boolean;
}

/**
 * Payload for getting git branches
 */
export interface GitBranchesPayload {
  /** Repository path */
  repoPath: string;
  /** Project ID */
  projectId: string;
  /** Include remote branches */
  includeRemote?: boolean;
}

/**
 * Response for git branches
 */
export interface GitBranchesResponsePayload {
  /** Repository path */
  repoPath: string;
  /** Branches */
  branches: GitBranch[];
  /** Current branch name */
  current: string;
}

/**
 * Payload for git checkout
 */
export interface GitCheckoutPayload {
  /** Repository path */
  repoPath: string;
  /** Project ID */
  projectId: string;
  /** Branch name to checkout */
  branch: string;
  /** Create new branch */
  create?: boolean;
}

/**
 * Response for git checkout
 */
export interface GitCheckoutResponsePayload {
  /** Repository path */
  repoPath: string;
  /** Operation result */
  result: GitOperationResult;
  /** New current branch */
  branch?: string;
}

/**
 * Payload for staging files
 */
export interface GitStagePayload {
  /** Repository path */
  repoPath: string;
  /** Project ID */
  projectId: string;
  /** File paths to stage (empty for all) */
  files: string[];
}

/**
 * Response for staging files
 */
export interface GitStageResponsePayload {
  /** Repository path */
  repoPath: string;
  /** Operation result */
  result: GitOperationResult;
}

/**
 * Payload for unstaging files
 */
export interface GitUnstagePayload {
  /** Repository path */
  repoPath: string;
  /** Project ID */
  projectId: string;
  /** File paths to unstage (empty for all) */
  files: string[];
}

/**
 * Response for unstaging files
 */
export interface GitUnstageResponsePayload {
  /** Repository path */
  repoPath: string;
  /** Operation result */
  result: GitOperationResult;
}

/**
 * Payload for committing
 */
export interface GitCommitPayload {
  /** Repository path */
  repoPath: string;
  /** Project ID */
  projectId: string;
  /** Commit message */
  message: string;
}

/**
 * Response for committing
 */
export interface GitCommitResponsePayload {
  /** Repository path */
  repoPath: string;
  /** Operation result */
  result: GitOperationResult;
  /** New commit hash */
  commitHash?: string;
}

/**
 * Payload for pushing
 */
export interface GitPushPayload {
  /** Repository path */
  repoPath: string;
  /** Project ID */
  projectId: string;
  /** Force push */
  force?: boolean;
}

/**
 * Response for pushing
 */
export interface GitPushResponsePayload {
  /** Repository path */
  repoPath: string;
  /** Operation result */
  result: GitOperationResult;
}

/**
 * Payload for pulling
 */
export interface GitPullPayload {
  /** Repository path */
  repoPath: string;
  /** Project ID */
  projectId: string;
  /** Use rebase instead of merge */
  rebase?: boolean;
}

/**
 * Response for pulling
 */
export interface GitPullResponsePayload {
  /** Repository path */
  repoPath: string;
  /** Operation result */
  result: GitOperationResult;
}

/**
 * Payload for discarding changes
 */
export interface GitDiscardPayload {
  /** Repository path */
  repoPath: string;
  /** Project ID */
  projectId: string;
  /** File paths to discard (empty for all) */
  files: string[];
}

/**
 * Response for discarding changes
 */
export interface GitDiscardResponsePayload {
  /** Repository path */
  repoPath: string;
  /** Operation result */
  result: GitOperationResult;
}

/**
 * Git error payload
 */
export interface GitErrorPayload {
  /** Repository path */
  repoPath: string;
  /** Error message */
  error: string;
  /** Error code */
  code?: string;
}

// ============================================================================
// Generic Message Types
// ============================================================================

/**
 * Base WebSocket message structure
 */
export interface WSMessage<T = unknown> {
  /** Event type */
  event: WSEventName;
  /** Message payload */
  data: T;
  /** Optional correlation ID for request/response matching */
  correlationId?: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * Error response structure
 */
export interface WSErrorResponse {
  /** Error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: Record<string, unknown>;
}

/**
 * Acknowledgment response
 */
export interface WSAckResponse {
  success: boolean;
  error?: WSErrorResponse;
}
