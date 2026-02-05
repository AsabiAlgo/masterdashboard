/**
 * Canvas Types
 *
 * Types for React Flow canvas including nodes, edges, and layouts.
 */

import type { Node, Edge } from '@xyflow/react';
import type { ShellType, TerminalActivityStatus } from './terminal.js';
import type { BrowserEngine } from './browser.js';
import type {
  DatabaseEngine,
  DatabaseConnectionStatus,
  DatabaseSchema,
  QueryResult,
  QueryHistoryEntry,
} from './database.js';
import type { GitViewMode } from './git.js';

/**
 * Node types supported in the dashboard
 */
export enum NodeType {
  TERMINAL = 'terminal',
  BROWSER = 'browser',
  SSH = 'ssh',
  FOLDER = 'folder',
  NOTES = 'notes',
  VIEWER = 'viewer',
  DIFF = 'diff',
  DATABASE = 'database',
  GIT = 'git',
}

/**
 * Base data interface for all node types
 */
export interface BaseNodeData extends Record<string, unknown> {
  /** Associated session ID */
  readonly sessionId: string;
  /** Display label for the node */
  label: string;
  /** Project this node belongs to */
  projectId: string;
}

/**
 * Data specific to terminal nodes
 */
export interface TerminalNodeData extends BaseNodeData {
  /** Shell type */
  shell: ShellType;
  /** Whether connected to backend */
  connected: boolean;
  /** Current activity status for visual indicator */
  activityStatus: TerminalActivityStatus;
  /** Current working directory */
  cwd: string;
  /** Custom title */
  title?: string;
}

/**
 * Data specific to browser nodes
 */
export interface BrowserNodeData extends BaseNodeData {
  /** Current URL */
  url: string;
  /** Browser engine */
  engine: BrowserEngine;
  /** Whether connected to backend */
  connected: boolean;
}

/**
 * Data specific to SSH nodes
 */
export interface SSHNodeData extends BaseNodeData {
  /** Remote host */
  host: string;
  /** Remote port */
  port: number;
  /** Username */
  username: string;
  /** Whether connected */
  connected: boolean;
  /** Current activity status */
  activityStatus: TerminalActivityStatus;
}

/**
 * Note colors for sticky notes
 */
export type NoteColor = 'yellow' | 'blue' | 'pink' | 'green' | 'purple';

/**
 * Note mode (edit or preview)
 */
export type NoteMode = 'edit' | 'preview';

/**
 * Data specific to notes nodes
 */
export interface NotesNodeData extends BaseNodeData {
  /** Note text content */
  content: string;
  /** Note color theme */
  color: NoteColor;
  /** Current mode (edit or preview) */
  mode: NoteMode;
  /** Whether the note is locked/pinned (prevents dragging) */
  locked?: boolean;
  /** Last update timestamp from backend */
  updatedAt?: string;
}

/**
 * Data specific to folder viewer nodes
 */
export interface FolderViewerNodeData extends BaseNodeData {
  /** Current directory path */
  currentPath: string;
  /** Root path (cannot navigate above this) */
  rootPath: string;
  /** Whether connected to backend */
  connected: boolean;
  /** Expanded folder paths */
  expandedPaths: string[];
  /** Selected file/folder paths */
  selectedPaths: string[];
  /** Currently focused path */
  focusedPath: string | null;
  /** View mode */
  viewMode: 'tree' | 'list';
  /** Show hidden files */
  showHidden: boolean;
  /** Sort field */
  sortBy: 'name' | 'size' | 'modified' | 'type';
  /** Sort direction */
  sortDirection: 'asc' | 'desc';
  /** Search query */
  searchQuery: string;
}

/**
 * Content type for viewer node
 */
export type ViewerContentType = 'markdown' | 'code' | 'image' | 'text' | 'unknown';

/**
 * Data specific to file viewer nodes
 */
export interface ViewerNodeData extends BaseNodeData {
  /** File path being viewed */
  filePath: string;
  /** File name */
  fileName: string;
  /** File content */
  content: string;
  /** Content type for rendering */
  contentType: ViewerContentType;
  /** File extension */
  extension: string;
  /** Whether content is loading */
  loading: boolean;
  /** Error message if load failed */
  error: string | null;
  /** Word wrap enabled */
  wordWrap: boolean;
  /** Show line numbers */
  showLineNumbers: boolean;
  /** Whether in edit mode */
  editMode: boolean;
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Edited content (separate from saved content) */
  editContent: string | null;
  /** Show minimap in Monaco editor */
  showMinimap: boolean;
  /** Font size for editor */
  fontSize: number;
}

/**
 * Diff view mode (split side-by-side or unified inline)
 */
export type DiffViewMode = 'split' | 'unified';

/**
 * Statistics about a diff
 */
export interface DiffStats {
  /** Number of added lines */
  additions: number;
  /** Number of deleted lines */
  deletions: number;
}

/**
 * Data specific to diff viewer nodes
 */
export interface DiffNodeData extends BaseNodeData {
  /** Left file path being compared */
  leftFilePath: string;
  /** Left file name */
  leftFileName: string;
  /** Left file content */
  leftContent: string;
  /** Right file path being compared */
  rightFilePath: string;
  /** Right file name */
  rightFileName: string;
  /** Right file content */
  rightContent: string;
  /** View mode (split or unified) */
  viewMode: DiffViewMode;
  /** Show line numbers */
  showLineNumbers: boolean;
  /** Collapse unchanged sections */
  collapseUnchanged: boolean;
  /** Number of context lines to show around changes when collapsed */
  contextLines: number;
  /** Whether content is loading */
  loading: boolean;
  /** Error message if load failed */
  error: string | null;
}

/**
 * Data specific to database nodes
 */
export interface DatabaseNodeData extends BaseNodeData {
  /** Database engine type */
  engine: DatabaseEngine;
  /** Connection name */
  connectionName: string;
  /** Host address */
  host: string;
  /** Port number */
  port: number;
  /** Database name or path */
  database: string;
  /** Username for connection */
  username: string;
  /** Whether connected to database */
  connected: boolean;
  /** Connection status */
  connectionStatus: DatabaseConnectionStatus;
  /** Current SQL query */
  query: string;
  /** Query results */
  results: QueryResult | null;
  /** Database schema */
  schema: DatabaseSchema | null;
  /** Query history */
  queryHistory: QueryHistoryEntry[];
  /** Whether schema explorer is visible */
  showSchema: boolean;
  /** Whether query is executing */
  loading: boolean;
  /** Error message if any */
  error: string | null;
}

/**
 * Data specific to git nodes
 */
export interface GitNodeData extends BaseNodeData {
  /** Repository path */
  repoPath: string;
  /** Whether connected to backend */
  connected: boolean;
  /** Current view mode */
  viewMode: GitViewMode;
  /** Selected file paths for staging/unstaging */
  selectedFiles: string[];
  /** Commit limit for log */
  commitLimit: number;
  /** Whether loading data */
  loading: boolean;
  /** Error message if any */
  error: string | null;
}

/**
 * Union type for all node data types
 */
export type DashboardNodeData =
  | TerminalNodeData
  | BrowserNodeData
  | SSHNodeData
  | FolderViewerNodeData
  | NotesNodeData
  | ViewerNodeData
  | DiffNodeData
  | DatabaseNodeData
  | GitNodeData;

/**
 * Dashboard node type (React Flow Node with our data)
 */
export type DashboardNode = Node<DashboardNodeData, NodeType>;

/**
 * Terminal-specific node type
 */
export type TerminalNode = Node<TerminalNodeData, NodeType.TERMINAL>;

/**
 * Browser-specific node type
 */
export type BrowserNode = Node<BrowserNodeData, NodeType.BROWSER>;

/**
 * SSH-specific node type
 */
export type SSHNode = Node<SSHNodeData, NodeType.SSH>;

/**
 * Folder-specific node type
 */
export type FolderNode = Node<FolderViewerNodeData, NodeType.FOLDER>;

/**
 * Notes-specific node type
 */
export type NotesNode = Node<NotesNodeData, NodeType.NOTES>;

/**
 * Viewer-specific node type
 */
export type ViewerNode = Node<ViewerNodeData, NodeType.VIEWER>;

/**
 * Diff-specific node type
 */
export type DiffNode = Node<DiffNodeData, NodeType.DIFF>;

/**
 * Database-specific node type
 */
export type DatabaseNode = Node<DatabaseNodeData, NodeType.DATABASE>;

/**
 * Git-specific node type
 */
export type GitNode = Node<GitNodeData, NodeType.GIT>;

/**
 * Dashboard edge type
 */
export type DashboardEdge = Edge;

/**
 * Canvas viewport state
 */
export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

/**
 * Canvas layout definition
 */
export interface CanvasLayout {
  /** Unique layout identifier */
  readonly id: string;
  /** Layout display name */
  name: string;
  /** Nodes in this layout */
  nodes: DashboardNode[];
  /** Edges in this layout */
  edges: DashboardEdge[];
  /** Viewport position and zoom */
  viewport: CanvasViewport;
  /** When the layout was created */
  readonly createdAt: Date;
  /** When the layout was last updated */
  updatedAt: Date;
}

/**
 * Serializable version of CanvasLayout
 */
export interface SerializedCanvasLayout {
  readonly id: string;
  name: string;
  nodes: DashboardNode[];
  edges: DashboardEdge[];
  viewport: CanvasViewport;
  readonly createdAt: string;
  updatedAt: string;
}

/**
 * Node position for layout calculations
 */
export interface NodePosition {
  x: number;
  y: number;
}

/**
 * Node dimensions
 */
export interface NodeDimensions {
  width: number;
  height: number;
}

/**
 * Default node dimensions by type
 */
export const DEFAULT_NODE_DIMENSIONS: Readonly<Record<NodeType, NodeDimensions>> = {
  [NodeType.TERMINAL]: { width: 800, height: 500 },
  [NodeType.BROWSER]: { width: 900, height: 650 },
  [NodeType.SSH]: { width: 800, height: 500 },
  [NodeType.FOLDER]: { width: 320, height: 550 },
  [NodeType.NOTES]: { width: 300, height: 200 },
  [NodeType.VIEWER]: { width: 600, height: 500 },
  [NodeType.DIFF]: { width: 900, height: 600 },
  [NodeType.DATABASE]: { width: 900, height: 650 },
  [NodeType.GIT]: { width: 420, height: 550 },
} as const;

/**
 * Node creation options
 */
export interface CreateNodeOptions {
  /** Node type */
  type: NodeType;
  /** Initial position */
  position?: NodePosition;
  /** Node data */
  data: DashboardNodeData;
  /** Custom dimensions */
  dimensions?: NodeDimensions;
}

/**
 * Layout preset types
 */
export type LayoutPreset = 'grid' | 'horizontal' | 'vertical' | 'cascade' | 'custom';

/**
 * Layout preset configuration
 */
export interface LayoutPresetConfig {
  /** Preset type */
  preset: LayoutPreset;
  /** Gap between nodes */
  gap?: number;
  /** Maximum nodes per row (for grid) */
  maxPerRow?: number;
  /** Starting position */
  startPosition?: NodePosition;
}

/**
 * Default layout configuration
 */
export const DEFAULT_LAYOUT_CONFIG: Readonly<LayoutPresetConfig> = {
  preset: 'grid',
  gap: 20,
  maxPerRow: 3,
  startPosition: { x: 0, y: 0 },
} as const;

/**
 * Default viewport
 */
export const DEFAULT_VIEWPORT: Readonly<CanvasViewport> = {
  x: 0,
  y: 0,
  zoom: 1,
} as const;
