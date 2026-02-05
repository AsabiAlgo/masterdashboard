/**
 * Unit tests for error classes and utilities
 */

import { describe, it, expect } from 'vitest';
import {
  ErrorCode,
  AppError,
  SessionNotFoundError,
  SessionTerminatedError,
  ProjectNotFoundError,
  PTYSpawnError,
  SSHConnectionError,
  SSHAuthError,
  SSHNotFoundError,
  SSHChannelError,
  SSHTimeoutError,
  ValidationError,
  WebSocketError,
  isAppError,
  wrapError,
} from './errors.js';

describe('AppError', () => {
  it('should create an error with all properties', () => {
    const error = new AppError(
      {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Test error',
        details: { foo: 'bar' },
      },
      500
    );

    expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
    expect(error.message).toBe('Test error');
    expect(error.details).toEqual({ foo: 'bar' });
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe('AppError');
  });

  it('should default statusCode to 500', () => {
    const error = new AppError({
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Test error',
    });

    expect(error.statusCode).toBe(500);
  });

  it('should preserve cause error', () => {
    const cause = new Error('Original error');
    const error = new AppError({
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Wrapped error',
      cause,
    });

    expect(error.cause).toBe(cause);
  });

  it('should serialize to JSON correctly', () => {
    const error = new AppError({
      code: ErrorCode.SESSION_NOT_FOUND,
      message: 'Session missing',
      details: { sessionId: 'test-123' },
    });

    const json = error.toJSON();

    expect(json).toEqual({
      code: ErrorCode.SESSION_NOT_FOUND,
      message: 'Session missing',
      details: { sessionId: 'test-123' },
    });
  });

  it('should have a stack trace', () => {
    const error = new AppError({
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Test',
    });

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('AppError');
  });
});

describe('SessionNotFoundError', () => {
  it('should create with correct properties', () => {
    const error = new SessionNotFoundError('sess_123');

    expect(error.code).toBe(ErrorCode.SESSION_NOT_FOUND);
    expect(error.message).toBe('Session not found: sess_123');
    expect(error.details).toEqual({ sessionId: 'sess_123' });
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe('SessionNotFoundError');
  });
});

describe('SessionTerminatedError', () => {
  it('should create with correct properties', () => {
    const error = new SessionTerminatedError('sess_456');

    expect(error.code).toBe(ErrorCode.SESSION_TERMINATED);
    expect(error.message).toBe('Session has been terminated: sess_456');
    expect(error.details).toEqual({ sessionId: 'sess_456' });
    expect(error.statusCode).toBe(410);
    expect(error.name).toBe('SessionTerminatedError');
  });
});

describe('ProjectNotFoundError', () => {
  it('should create with correct properties', () => {
    const error = new ProjectNotFoundError('proj_789');

    expect(error.code).toBe(ErrorCode.PROJECT_NOT_FOUND);
    expect(error.message).toBe('Project not found: proj_789');
    expect(error.details).toEqual({ projectId: 'proj_789' });
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe('ProjectNotFoundError');
  });
});

describe('PTYSpawnError', () => {
  it('should create with correct properties', () => {
    const error = new PTYSpawnError('/bin/zsh', 'Permission denied');

    expect(error.code).toBe(ErrorCode.PTY_SPAWN_FAILED);
    expect(error.message).toBe('Failed to spawn PTY: Permission denied');
    expect(error.details).toEqual({ shell: '/bin/zsh' });
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe('PTYSpawnError');
  });
});

describe('SSHConnectionError', () => {
  it('should create with correct properties', () => {
    const error = new SSHConnectionError('example.com', 'Connection refused');

    expect(error.code).toBe(ErrorCode.SSH_CONNECTION_FAILED);
    expect(error.message).toBe('SSH connection failed to example.com: Connection refused');
    expect(error.details).toEqual({ host: 'example.com' });
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe('SSHConnectionError');
  });
});

describe('SSHAuthError', () => {
  it('should create with correct properties', () => {
    const error = new SSHAuthError('server.com', 'admin', 'password');

    expect(error.code).toBe(ErrorCode.SSH_AUTH_FAILED);
    expect(error.message).toBe('SSH authentication failed for admin@server.com using password');
    expect(error.details).toEqual({
      host: 'server.com',
      username: 'admin',
      method: 'password',
    });
    expect(error.statusCode).toBe(401);
    expect(error.name).toBe('SSHAuthError');
  });
});

describe('SSHNotFoundError', () => {
  it('should create with correct properties', () => {
    const error = new SSHNotFoundError('ssh_abc');

    expect(error.code).toBe(ErrorCode.SSH_NOT_FOUND);
    expect(error.message).toBe('SSH session not found: ssh_abc');
    expect(error.details).toEqual({ sessionId: 'ssh_abc' });
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe('SSHNotFoundError');
  });
});

describe('SSHChannelError', () => {
  it('should create with correct properties', () => {
    const error = new SSHChannelError('ssh_def', 'Channel closed');

    expect(error.code).toBe(ErrorCode.SSH_CHANNEL_FAILED);
    expect(error.message).toBe('SSH channel failed for session ssh_def: Channel closed');
    expect(error.details).toEqual({ sessionId: 'ssh_def' });
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe('SSHChannelError');
  });
});

describe('SSHTimeoutError', () => {
  it('should create with correct properties', () => {
    const error = new SSHTimeoutError('slow-server.com', 30000);

    expect(error.code).toBe(ErrorCode.SSH_TIMEOUT);
    expect(error.message).toBe('SSH connection to slow-server.com timed out after 30000ms');
    expect(error.details).toEqual({ host: 'slow-server.com', timeoutMs: 30000 });
    expect(error.statusCode).toBe(408);
    expect(error.name).toBe('SSHTimeoutError');
  });
});

describe('ValidationError', () => {
  it('should create with message only', () => {
    const error = new ValidationError('Invalid input');

    expect(error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(error.message).toBe('Invalid input');
    expect(error.details).toBeUndefined();
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('ValidationError');
  });

  it('should create with details', () => {
    const error = new ValidationError('Invalid email', {
      field: 'email',
      value: 'not-an-email',
    });

    expect(error.details).toEqual({
      field: 'email',
      value: 'not-an-email',
    });
  });
});

describe('WebSocketError', () => {
  it('should create with correct properties', () => {
    const error = new WebSocketError(
      ErrorCode.WS_INVALID_MESSAGE,
      'Invalid message format',
      { received: 'garbage' }
    );

    expect(error.code).toBe(ErrorCode.WS_INVALID_MESSAGE);
    expect(error.message).toBe('Invalid message format');
    expect(error.details).toEqual({ received: 'garbage' });
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('WebSocketError');
  });
});

describe('isAppError', () => {
  it('should return true for AppError instances', () => {
    const error = new AppError({
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Test',
    });

    expect(isAppError(error)).toBe(true);
  });

  it('should return true for subclass instances', () => {
    const error = new SessionNotFoundError('test');

    expect(isAppError(error)).toBe(true);
  });

  it('should return false for regular Error', () => {
    const error = new Error('Test');

    expect(isAppError(error)).toBe(false);
  });

  it('should return false for non-errors', () => {
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
    expect(isAppError('string')).toBe(false);
    expect(isAppError({ message: 'object' })).toBe(false);
  });
});

describe('wrapError', () => {
  it('should return AppError unchanged', () => {
    const original = new SessionNotFoundError('test');
    const wrapped = wrapError(original);

    expect(wrapped).toBe(original);
  });

  it('should wrap regular Error', () => {
    const original = new Error('Original message');
    const wrapped = wrapError(original);

    expect(wrapped).toBeInstanceOf(AppError);
    expect(wrapped.code).toBe(ErrorCode.INTERNAL_ERROR);
    expect(wrapped.message).toBe('Original message');
    expect(wrapped.cause).toBe(original);
    expect(wrapped.statusCode).toBe(500);
  });

  it('should use default message for non-Error values', () => {
    const wrapped = wrapError('string error');

    expect(wrapped).toBeInstanceOf(AppError);
    expect(wrapped.message).toBe('An error occurred');
    expect(wrapped.cause).toBeUndefined();
  });

  it('should use custom default message', () => {
    const wrapped = wrapError(null, 'Custom default');

    expect(wrapped.message).toBe('Custom default');
  });

  it('should wrap objects without message', () => {
    const wrapped = wrapError({ foo: 'bar' });

    expect(wrapped).toBeInstanceOf(AppError);
    expect(wrapped.message).toBe('An error occurred');
  });
});

describe('ErrorCode enum', () => {
  it('should have all expected session error codes', () => {
    expect(ErrorCode.SESSION_NOT_FOUND).toBe('SESSION_NOT_FOUND');
    expect(ErrorCode.SESSION_ALREADY_EXISTS).toBe('SESSION_ALREADY_EXISTS');
    expect(ErrorCode.SESSION_TERMINATED).toBe('SESSION_TERMINATED');
    expect(ErrorCode.SESSION_INVALID_STATE).toBe('SESSION_INVALID_STATE');
  });

  it('should have all expected SSH error codes', () => {
    expect(ErrorCode.SSH_CONNECTION_FAILED).toBe('SSH_CONNECTION_FAILED');
    expect(ErrorCode.SSH_AUTH_FAILED).toBe('SSH_AUTH_FAILED');
    expect(ErrorCode.SSH_NOT_FOUND).toBe('SSH_NOT_FOUND');
    expect(ErrorCode.SSH_CHANNEL_FAILED).toBe('SSH_CHANNEL_FAILED');
    expect(ErrorCode.SSH_TIMEOUT).toBe('SSH_TIMEOUT');
  });

  it('should have all expected PTY error codes', () => {
    expect(ErrorCode.PTY_SPAWN_FAILED).toBe('PTY_SPAWN_FAILED');
    expect(ErrorCode.PTY_NOT_FOUND).toBe('PTY_NOT_FOUND');
    expect(ErrorCode.PTY_WRITE_FAILED).toBe('PTY_WRITE_FAILED');
  });
});
