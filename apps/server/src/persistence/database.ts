/**
 * SQLite Database
 *
 * Handles database initialization and provides a connection pool.
 */

import Database from 'better-sqlite3';
import { dirname } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { getEnv } from '../config/env.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('database');

let db: Database.Database | null = null;

/**
 * Initialize the database connection and schema
 */
export async function initDatabase(): Promise<Database.Database> {
  if (db) {
    return db;
  }

  const env = getEnv();
  const dbPath = env.DATABASE_URL;

  // Ensure data directory exists
  const dbDir = dirname(dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
    logger.info({ path: dbDir }, 'Created database directory');
  }

  db = new Database(dbPath);

  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');

  // Create schema
  createSchema(db);

  // Run migrations
  migrateSchema(db);

  logger.info({ path: dbPath }, 'Database initialized');
  return db;
}

/**
 * Get the database instance
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}

/**
 * Create the database schema
 */
function createSchema(database: Database.Database): void {
  // Projects table
  database.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      default_cwd TEXT NOT NULL,
      settings TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Sessions table
  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('terminal', 'browser', 'ssh')),
      status TEXT NOT NULL DEFAULT 'active',
      project_id TEXT NOT NULL,
      config TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_active_at TEXT NOT NULL DEFAULT (datetime('now')),
      metadata TEXT DEFAULT '{}',
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  // Create index for session lookups
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
  `);

  // Buffers table (for persisted scrollback)
  database.exec(`
    CREATE TABLE IF NOT EXISTS buffers (
      session_id TEXT PRIMARY KEY,
      content TEXT NOT NULL DEFAULT '',
      total_lines INTEGER NOT NULL DEFAULT 0,
      last_flush_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
  `);

  // Layouts table
  database.exec(`
    CREATE TABLE IF NOT EXISTS layouts (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      nodes TEXT NOT NULL DEFAULT '[]',
      edges TEXT NOT NULL DEFAULT '[]',
      viewport TEXT NOT NULL DEFAULT '{"x":0,"y":0,"zoom":1}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  // Create index for layout lookups
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_layouts_project_id ON layouts(project_id);
  `);

  // Notes table
  database.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT 'yellow' CHECK (color IN ('yellow', 'blue', 'pink', 'green', 'purple')),
      mode TEXT NOT NULL DEFAULT 'edit' CHECK (mode IN ('edit', 'preview')),
      position_x REAL NOT NULL DEFAULT 100,
      position_y REAL NOT NULL DEFAULT 100,
      width REAL NOT NULL DEFAULT 300,
      height REAL NOT NULL DEFAULT 200,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  // Create index for notes lookups
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_notes_project_id ON notes(project_id);
  `);

  logger.debug('Database schema created/verified');
}

/**
 * Run database migrations
 */
function migrateSchema(database: Database.Database): void {
  const version = database.pragma('user_version', { simple: true }) as number;

  if (version < 1) {
    migrateTmuxSupport(database);
    database.pragma('user_version = 1');
  }
}

/**
 * Migration 1: Add tmux session support
 */
function migrateTmuxSupport(database: Database.Database): void {
  const columns = database
    .prepare('PRAGMA table_info(sessions)')
    .all() as { name: string }[];

  const hasColumn = columns.some((c) => c.name === 'tmux_session_name');

  if (!hasColumn) {
    database.exec(`
      ALTER TABLE sessions ADD COLUMN tmux_session_name TEXT;
      CREATE INDEX IF NOT EXISTS idx_sessions_tmux_name ON sessions(tmux_session_name);
    `);
    logger.info('Migration: Added tmux_session_name column to sessions table');
  }
}

// ============================================================================
// Project Repository Functions
// ============================================================================

export interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  default_cwd: string;
  settings: string;
  created_at: string;
  updated_at: string;
}

export function insertProject(project: ProjectRow): void {
  const stmt = getDatabase().prepare(`
    INSERT INTO projects (id, name, description, default_cwd, settings, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    project.id,
    project.name,
    project.description,
    project.default_cwd,
    project.settings,
    project.created_at,
    project.updated_at
  );
}

export function getProjectById(id: string): ProjectRow | undefined {
  const stmt = getDatabase().prepare('SELECT * FROM projects WHERE id = ?');
  return stmt.get(id) as ProjectRow | undefined;
}

export function getAllProjects(): ProjectRow[] {
  const stmt = getDatabase().prepare('SELECT * FROM projects ORDER BY updated_at DESC');
  return stmt.all() as ProjectRow[];
}

export function updateProject(id: string, updates: Partial<ProjectRow>): void {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  if (updates.default_cwd !== undefined) {
    fields.push('default_cwd = ?');
    values.push(updates.default_cwd);
  }
  if (updates.settings !== undefined) {
    fields.push('settings = ?');
    values.push(updates.settings);
  }

  fields.push("updated_at = datetime('now')");
  values.push(id);

  const stmt = getDatabase().prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);
}

export function deleteProject(id: string): void {
  const stmt = getDatabase().prepare('DELETE FROM projects WHERE id = ?');
  stmt.run(id);
}

// ============================================================================
// Session Repository Functions
// ============================================================================

export interface SessionRow {
  id: string;
  type: string;
  status: string;
  project_id: string;
  config: string;
  created_at: string;
  updated_at: string;
  last_active_at: string;
  metadata: string;
  tmux_session_name: string | null;
}

export function insertSession(session: SessionRow): void {
  const stmt = getDatabase().prepare(`
    INSERT INTO sessions (id, type, status, project_id, config, created_at, updated_at, last_active_at, metadata, tmux_session_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    session.id,
    session.type,
    session.status,
    session.project_id,
    session.config,
    session.created_at,
    session.updated_at,
    session.last_active_at,
    session.metadata,
    session.tmux_session_name
  );
}

export function getSessionById(id: string): SessionRow | undefined {
  const stmt = getDatabase().prepare('SELECT * FROM sessions WHERE id = ?');
  return stmt.get(id) as SessionRow | undefined;
}

export function sessionExists(id: string): boolean {
  const stmt = getDatabase().prepare('SELECT 1 FROM sessions WHERE id = ?');
  return stmt.get(id) !== undefined;
}

export function getSessionsByProjectId(projectId: string): SessionRow[] {
  const stmt = getDatabase().prepare(
    'SELECT * FROM sessions WHERE project_id = ? AND status != ? ORDER BY created_at DESC'
  );
  return stmt.all(projectId, 'terminated') as SessionRow[];
}

export function updateSessionStatus(id: string, status: string): void {
  const stmt = getDatabase().prepare(
    "UPDATE sessions SET status = ?, updated_at = datetime('now') WHERE id = ?"
  );
  stmt.run(status, id);
}

export function updateSessionLastActive(id: string): void {
  const stmt = getDatabase().prepare(
    "UPDATE sessions SET last_active_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
  );
  stmt.run(id);
}

export function deleteSession(id: string): void {
  const stmt = getDatabase().prepare('DELETE FROM sessions WHERE id = ?');
  stmt.run(id);
}

/**
 * Get sessions that might be recoverable (have tmux sessions)
 */
export function getRecoverableSessions(projectId?: string): SessionRow[] {
  let sql = `
    SELECT * FROM sessions
    WHERE status IN ('active', 'paused', 'disconnected')
    AND tmux_session_name IS NOT NULL
  `;

  if (projectId) {
    sql += ' AND project_id = ?';
    return getDatabase().prepare(sql).all(projectId) as SessionRow[];
  }

  return getDatabase().prepare(sql).all() as SessionRow[];
}

/**
 * Update tmux session name
 */
export function updateSessionTmuxName(id: string, tmuxName: string | null): void {
  const stmt = getDatabase().prepare(`
    UPDATE sessions
    SET tmux_session_name = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(tmuxName, id);
}

/**
 * Find session by tmux name (for orphan detection)
 */
export function getSessionByTmuxName(tmuxName: string): SessionRow | undefined {
  const stmt = getDatabase().prepare(
    'SELECT * FROM sessions WHERE tmux_session_name = ?'
  );
  return stmt.get(tmuxName) as SessionRow | undefined;
}

/**
 * Get all sessions with active/paused/disconnected status
 */
export function getActiveSessions(): SessionRow[] {
  const stmt = getDatabase().prepare(`
    SELECT * FROM sessions
    WHERE status IN ('active', 'paused', 'disconnected')
    ORDER BY last_active_at DESC
  `);
  return stmt.all() as SessionRow[];
}

/**
 * Mark old disconnected sessions as terminated
 */
export function cleanupStaleDisconnectedSessions(maxAgeMs: number): number {
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();

  const stmt = getDatabase().prepare(`
    UPDATE sessions
    SET status = 'terminated', updated_at = datetime('now')
    WHERE status = 'disconnected'
    AND last_active_at < ?
  `);

  const result = stmt.run(cutoff);
  return result.changes;
}

// ============================================================================
// Buffer Repository Functions
// ============================================================================

export interface BufferRow {
  session_id: string;
  content: string;
  total_lines: number;
  last_flush_at: string;
}

export function insertOrUpdateBuffer(buffer: BufferRow): void {
  const stmt = getDatabase().prepare(`
    INSERT INTO buffers (session_id, content, total_lines, last_flush_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET
      content = excluded.content,
      total_lines = excluded.total_lines,
      last_flush_at = excluded.last_flush_at
  `);
  stmt.run(buffer.session_id, buffer.content, buffer.total_lines, buffer.last_flush_at);
}

export function getBufferBySessionId(sessionId: string): BufferRow | undefined {
  const stmt = getDatabase().prepare('SELECT * FROM buffers WHERE session_id = ?');
  return stmt.get(sessionId) as BufferRow | undefined;
}

export function deleteBuffer(sessionId: string): void {
  const stmt = getDatabase().prepare('DELETE FROM buffers WHERE session_id = ?');
  stmt.run(sessionId);
}

// ============================================================================
// Notes Repository Functions
// ============================================================================

export interface NoteRow {
  id: string;
  project_id: string;
  content: string;
  color: string;
  mode: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  created_at: string;
  updated_at: string;
}

export function insertNote(note: NoteRow): void {
  const stmt = getDatabase().prepare(`
    INSERT INTO notes (id, project_id, content, color, mode, position_x, position_y, width, height, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    note.id,
    note.project_id,
    note.content,
    note.color,
    note.mode,
    note.position_x,
    note.position_y,
    note.width,
    note.height,
    note.created_at,
    note.updated_at
  );
}

export function getNoteById(id: string): NoteRow | undefined {
  const stmt = getDatabase().prepare('SELECT * FROM notes WHERE id = ?');
  return stmt.get(id) as NoteRow | undefined;
}

export function getNotesByProjectId(projectId: string): NoteRow[] {
  const stmt = getDatabase().prepare(
    'SELECT * FROM notes WHERE project_id = ? ORDER BY created_at ASC'
  );
  return stmt.all(projectId) as NoteRow[];
}

export function updateNote(id: string, updates: Partial<NoteRow>): void {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.content !== undefined) {
    fields.push('content = ?');
    values.push(updates.content);
  }
  if (updates.color !== undefined) {
    fields.push('color = ?');
    values.push(updates.color);
  }
  if (updates.mode !== undefined) {
    fields.push('mode = ?');
    values.push(updates.mode);
  }
  if (updates.position_x !== undefined) {
    fields.push('position_x = ?');
    values.push(updates.position_x);
  }
  if (updates.position_y !== undefined) {
    fields.push('position_y = ?');
    values.push(updates.position_y);
  }
  if (updates.width !== undefined) {
    fields.push('width = ?');
    values.push(updates.width);
  }
  if (updates.height !== undefined) {
    fields.push('height = ?');
    values.push(updates.height);
  }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(id);

  const stmt = getDatabase().prepare(`UPDATE notes SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);
}

export function deleteNote(id: string): void {
  const stmt = getDatabase().prepare('DELETE FROM notes WHERE id = ?');
  stmt.run(id);
}

export function deleteNotesByProjectId(projectId: string): void {
  const stmt = getDatabase().prepare('DELETE FROM notes WHERE project_id = ?');
  stmt.run(projectId);
}
