/**
 * Custom Error Classes
 *
 * Defines application-specific error types for better error handling.
 */

export enum ErrorCode {
  // Session errors
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_ALREADY_EXISTS = 'SESSION_ALREADY_EXISTS',
  SESSION_TERMINATED = 'SESSION_TERMINATED',
  SESSION_INVALID_STATE = 'SESSION_INVALID_STATE',

  // Project errors
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  PROJECT_ALREADY_EXISTS = 'PROJECT_ALREADY_EXISTS',

  // PTY errors
  PTY_SPAWN_FAILED = 'PTY_SPAWN_FAILED',
  PTY_NOT_FOUND = 'PTY_NOT_FOUND',
  PTY_WRITE_FAILED = 'PTY_WRITE_FAILED',

  // SSH errors
  SSH_CONNECTION_FAILED = 'SSH_CONNECTION_FAILED',
  SSH_AUTH_FAILED = 'SSH_AUTH_FAILED',
  SSH_NOT_FOUND = 'SSH_NOT_FOUND',
  SSH_CHANNEL_FAILED = 'SSH_CHANNEL_FAILED',
  SSH_TIMEOUT = 'SSH_TIMEOUT',

  // Buffer errors
  BUFFER_NOT_FOUND = 'BUFFER_NOT_FOUND',
  BUFFER_OVERFLOW = 'BUFFER_OVERFLOW',

  // WebSocket errors
  WS_INVALID_MESSAGE = 'WS_INVALID_MESSAGE',
  WS_UNAUTHORIZED = 'WS_UNAUTHORIZED',
  WS_RATE_LIMITED = 'WS_RATE_LIMITED',

  // Database errors
  DB_CONNECTION_FAILED = 'DB_CONNECTION_FAILED',
  DB_QUERY_FAILED = 'DB_QUERY_FAILED',

  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',

  // File errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_ACCESS_DENIED = 'FILE_ACCESS_DENIED',
  FILE_OPERATION_FAILED = 'FILE_OPERATION_FAILED',

  // Generic errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  cause?: Error;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly cause?: Error;
  public readonly statusCode: number;

  constructor(errorDetails: ErrorDetails, statusCode: number = 500) {
    super(errorDetails.message);
    this.name = 'AppError';
    this.code = errorDetails.code;
    this.details = errorDetails.details;
    this.cause = errorDetails.cause;
    this.statusCode = statusCode;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

export class SessionNotFoundError extends AppError {
  constructor(sessionId: string) {
    super(
      {
        code: ErrorCode.SESSION_NOT_FOUND,
        message: `Session not found: ${sessionId}`,
        details: { sessionId },
      },
      404
    );
    this.name = 'SessionNotFoundError';
  }
}

export class SessionTerminatedError extends AppError {
  constructor(sessionId: string) {
    super(
      {
        code: ErrorCode.SESSION_TERMINATED,
        message: `Session has been terminated: ${sessionId}`,
        details: { sessionId },
      },
      410
    );
    this.name = 'SessionTerminatedError';
  }
}

export class ProjectNotFoundError extends AppError {
  constructor(projectId: string) {
    super(
      {
        code: ErrorCode.PROJECT_NOT_FOUND,
        message: `Project not found: ${projectId}`,
        details: { projectId },
      },
      404
    );
    this.name = 'ProjectNotFoundError';
  }
}

export class PTYSpawnError extends AppError {
  constructor(shell: string, errorMessage: string) {
    super(
      {
        code: ErrorCode.PTY_SPAWN_FAILED,
        message: `Failed to spawn PTY: ${errorMessage}`,
        details: { shell },
      },
      500
    );
    this.name = 'PTYSpawnError';
  }
}

export class PTYNotFoundError extends AppError {
  constructor(sessionId: string, reason?: string) {
    super(
      {
        code: ErrorCode.PTY_NOT_FOUND,
        message: reason
          ? `PTY not found for session ${sessionId}: ${reason}`
          : `PTY not found for session ${sessionId}`,
        details: { sessionId, reason },
      },
      404
    );
    this.name = 'PTYNotFoundError';
  }
}

export class SSHConnectionError extends AppError {
  constructor(host: string, errorMessage: string) {
    super(
      {
        code: ErrorCode.SSH_CONNECTION_FAILED,
        message: `SSH connection failed to ${host}: ${errorMessage}`,
        details: { host },
      },
      500
    );
    this.name = 'SSHConnectionError';
  }
}

export class SSHAuthError extends AppError {
  constructor(host: string, username: string, method: string) {
    super(
      {
        code: ErrorCode.SSH_AUTH_FAILED,
        message: `SSH authentication failed for ${username}@${host} using ${method}`,
        details: { host, username, method },
      },
      401
    );
    this.name = 'SSHAuthError';
  }
}

export class SSHNotFoundError extends AppError {
  constructor(sessionId: string) {
    super(
      {
        code: ErrorCode.SSH_NOT_FOUND,
        message: `SSH session not found: ${sessionId}`,
        details: { sessionId },
      },
      404
    );
    this.name = 'SSHNotFoundError';
  }
}

export class SSHChannelError extends AppError {
  constructor(sessionId: string, errorMessage: string) {
    super(
      {
        code: ErrorCode.SSH_CHANNEL_FAILED,
        message: `SSH channel failed for session ${sessionId}: ${errorMessage}`,
        details: { sessionId },
      },
      500
    );
    this.name = 'SSHChannelError';
  }
}

export class SSHTimeoutError extends AppError {
  constructor(host: string, timeoutMs: number) {
    super(
      {
        code: ErrorCode.SSH_TIMEOUT,
        message: `SSH connection to ${host} timed out after ${timeoutMs}ms`,
        details: { host, timeoutMs },
      },
      408
    );
    this.name = 'SSHTimeoutError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      {
        code: ErrorCode.VALIDATION_FAILED,
        message,
        details,
      },
      400
    );
    this.name = 'ValidationError';
  }
}

export class WebSocketError extends AppError {
  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(
      {
        code,
        message,
        details,
      },
      400
    );
    this.name = 'WebSocketError';
  }
}

export class FileNotFoundError extends AppError {
  constructor(filePath: string) {
    super(
      {
        code: ErrorCode.FILE_NOT_FOUND,
        message: `File not found: ${filePath}`,
        details: { path: filePath },
      },
      404
    );
    this.name = 'FileNotFoundError';
  }
}

export class FileAccessDeniedError extends AppError {
  constructor(filePath: string, reason: string) {
    super(
      {
        code: ErrorCode.FILE_ACCESS_DENIED,
        message: `Access denied to ${filePath}: ${reason}`,
        details: { path: filePath, reason },
      },
      403
    );
    this.name = 'FileAccessDeniedError';
  }
}

export class FileOperationError extends AppError {
  constructor(operation: string, filePath: string, errorMessage: string) {
    super(
      {
        code: ErrorCode.FILE_OPERATION_FAILED,
        message: `File operation '${operation}' failed on ${filePath}: ${errorMessage}`,
        details: { operation, path: filePath },
      },
      500
    );
    this.name = 'FileOperationError';
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Wrap an error in an AppError if it isn't already
 */
export function wrapError(error: unknown, defaultMessage: string = 'An error occurred'): AppError {
  if (isAppError(error)) {
    return error;
  }

  const message = error instanceof Error ? error.message : defaultMessage;
  const cause = error instanceof Error ? error : undefined;

  return new AppError(
    {
      code: ErrorCode.INTERNAL_ERROR,
      message,
      cause,
    },
    500
  );
}
