/**
 * Project Types
 *
 * Types for project/workspace organization including project settings,
 * layouts, and summaries.
 */

import type { ShellType } from './terminal.js';
import type { DashboardNode, DashboardEdge } from './canvas.js';

/**
 * Default scrollback buffer size (lines)
 */
export const DEFAULT_SCROLLBACK_LINES = 20000;

/**
 * Project settings configuration
 */
export interface ProjectSettings {
  /** Whether to auto-save layout changes */
  autoSaveLayout: boolean;
  /** Default shell for new terminals in this project */
  defaultShell: ShellType;
  /** Number of lines to keep in scrollback buffer */
  scrollbackLines: number;
  /** Enable sound notifications for status changes */
  enableSoundNotifications: boolean;
  /** Theme override for this project */
  theme?: string;
}

/**
 * Project entity representing a workspace
 */
export interface Project {
  /** Unique project identifier */
  readonly id: string;
  /** Project display name */
  name: string;
  /** Optional project description */
  description?: string;
  /** Default working directory for new terminals */
  defaultCwd: string;
  /** When the project was created */
  readonly createdAt: Date;
  /** When the project was last updated */
  updatedAt: Date;
  /** Project-specific settings */
  settings: ProjectSettings;
}

/**
 * Serializable version of Project for storage/transport
 */
export interface SerializedProject {
  readonly id: string;
  name: string;
  description?: string;
  defaultCwd: string;
  readonly createdAt: string;
  updatedAt: string;
  settings: ProjectSettings;
}

/**
 * Saved layout for a project
 */
export interface ProjectLayout {
  /** Unique layout identifier */
  readonly id: string;
  /** Project this layout belongs to */
  readonly projectId: string;
  /** Layout display name */
  name: string;
  /** React Flow nodes */
  nodes: DashboardNode[];
  /** React Flow edges */
  edges: DashboardEdge[];
  /** Viewport position and zoom */
  viewport: Readonly<{
    x: number;
    y: number;
    zoom: number;
  }>;
  /** When the layout was created */
  readonly createdAt: Date;
  /** When the layout was last updated */
  updatedAt: Date;
}

/**
 * Serializable version of ProjectLayout
 */
export interface SerializedProjectLayout {
  readonly id: string;
  readonly projectId: string;
  name: string;
  nodes: DashboardNode[];
  edges: DashboardEdge[];
  viewport: Readonly<{
    x: number;
    y: number;
    zoom: number;
  }>;
  readonly createdAt: string;
  updatedAt: string;
}

/**
 * Summary view of a project for lists/sidebar
 */
export interface ProjectSummary {
  /** Unique project identifier */
  readonly id: string;
  /** Project display name */
  name: string;
  /** Number of active terminals */
  activeTerminals: number;
  /** Number of terminals awaiting input */
  waitingTerminals: number;
  /** When the project was last active */
  lastActiveAt: Date;
}

/**
 * Configuration for creating a new project
 */
export interface CreateProjectConfig {
  /** Project display name */
  name: string;
  /** Optional project description */
  description?: string;
  /** Default working directory */
  defaultCwd: string;
  /** Optional settings overrides */
  settings?: Partial<ProjectSettings>;
}

/**
 * Default project settings
 */
export const DEFAULT_PROJECT_SETTINGS: Readonly<Omit<ProjectSettings, 'theme'>> & { theme?: string } = {
  autoSaveLayout: true,
  defaultShell: 'zsh' as ShellType,
  scrollbackLines: DEFAULT_SCROLLBACK_LINES,
  enableSoundNotifications: true,
} as const;
