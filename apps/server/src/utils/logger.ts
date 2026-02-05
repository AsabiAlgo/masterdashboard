/**
 * Logger Utility
 *
 * Configures Pino logger for structured logging.
 * Development: file-only logging for clean console (startup banner via console.log)
 * Production: file logging with configurable level
 *
 * Set LOG_LEVEL=info and add console target for verbose debugging when needed.
 */

import pino from 'pino';
import { getEnv, isDevelopment } from '../config/env.js';
import path from 'path';
import fs from 'fs';

const env = getEnv();

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFilePath = path.join(logsDir, 'server.log');
const errorLogFilePath = path.join(logsDir, 'error.log');

// Quiet mode: LOG_LEVEL=error means no console output (file only)
// Verbose mode: LOG_LEVEL=info/debug enables pino-pretty console
const quietMode = env.LOG_LEVEL === 'error' || env.LOG_LEVEL === 'fatal';

// Create transports - file only in quiet mode
const targets: pino.TransportTargetOptions[] = [
  // File: capture debug+ for troubleshooting
  {
    target: 'pino/file',
    level: 'debug',
    options: {
      destination: logFilePath,
      mkdir: true,
    },
  },
  // Separate file for errors
  {
    target: 'pino/file',
    level: 'error',
    options: {
      destination: errorLogFilePath,
      mkdir: true,
    },
  },
];

// Only add console when NOT in quiet mode and in development
if (!quietMode && isDevelopment()) {
  targets.unshift({
    target: 'pino-pretty',
    level: env.LOG_LEVEL,
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  });
}

// In quiet mode: only log errors (no console output, minimal file logging)
// In verbose mode: log debug+ to files, LOG_LEVEL+ to console
export const logger = pino({
  level: quietMode ? 'error' : 'debug',
  transport: { targets },
  base: {
    env: env.NODE_ENV,
  },
});

export function createChildLogger(name: string) {
  return logger.child({ module: name });
}
