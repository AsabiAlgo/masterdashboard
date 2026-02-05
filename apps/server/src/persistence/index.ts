/**
 * Persistence layer exports
 */

export {
  initDatabase,
  getDatabase,
  closeDatabase,
  // Project repository
  insertProject,
  getProjectById,
  getAllProjects,
  updateProject,
  deleteProject,
  type ProjectRow,
  // Session repository
  insertSession,
  getSessionById,
  getSessionsByProjectId,
  updateSessionStatus,
  updateSessionLastActive,
  deleteSession,
  type SessionRow,
  // Buffer repository
  insertOrUpdateBuffer,
  getBufferBySessionId,
  deleteBuffer,
  type BufferRow,
  // Notes repository
  insertNote,
  getNoteById,
  getNotesByProjectId,
  updateNote,
  deleteNote,
  deleteNotesByProjectId,
  type NoteRow,
} from './database.js';
