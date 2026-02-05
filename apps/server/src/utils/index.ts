/**
 * Utility exports
 */

export { logger, createChildLogger } from './logger.js';
export {
  ErrorCode,
  AppError,
  SessionNotFoundError,
  SessionTerminatedError,
  ProjectNotFoundError,
  PTYSpawnError,
  ValidationError,
  WebSocketError,
  isAppError,
  wrapError,
  type ErrorDetails,
} from './errors.js';
