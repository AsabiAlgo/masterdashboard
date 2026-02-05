/**
 * Logger Utility for Next.js
 *
 * Configures Pino logger for structured logging (server-side only).
 * Client-side code should use console.log as browsers cannot write to files.
 *
 * Usage:
 *   import { logger, createChildLogger } from '@/utils/logger'
 *   const log = createChildLogger('my-module')
 *   log.info('Something happened')
 */

import pino from 'pino'
import path from 'path'
import fs from 'fs'

const isDevelopment = process.env.NODE_ENV === 'development'
const logLevel = process.env.LOG_LEVEL || 'error'

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

const logFilePath = path.join(logsDir, 'web.log')
const errorLogFilePath = path.join(logsDir, 'error.log')

// Quiet mode: LOG_LEVEL=error means no console output (file only)
const quietMode = logLevel === 'error' || logLevel === 'fatal'

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
]

// Only add console when NOT in quiet mode and in development
if (!quietMode && isDevelopment) {
  targets.unshift({
    target: 'pino-pretty',
    level: logLevel,
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  })
}

// In quiet mode: only log errors (no console output, minimal file logging)
// In verbose mode: log debug+ to files, LOG_LEVEL+ to console
export const logger = pino({
  level: quietMode ? 'error' : 'debug',
  transport: { targets },
  base: {
    env: process.env.NODE_ENV,
    app: 'web',
  },
})

export function createChildLogger(name: string) {
  return logger.child({ module: name })
}

/**
 * Client-safe logger that uses console on client, pino on server
 * Use this in code that runs on both client and server
 */
export const clientLogger = {
  debug: (...args: unknown[]) => {
    if (typeof window === 'undefined') {
      logger.debug(args[0] as string, ...args.slice(1))
    } else if (isDevelopment) {
      console.debug(...args)
    }
  },
  info: (...args: unknown[]) => {
    if (typeof window === 'undefined') {
      logger.info(args[0] as string, ...args.slice(1))
    } else if (isDevelopment) {
      console.info(...args)
    }
  },
  warn: (...args: unknown[]) => {
    if (typeof window === 'undefined') {
      logger.warn(args[0] as string, ...args.slice(1))
    } else {
      console.warn(...args)
    }
  },
  error: (...args: unknown[]) => {
    if (typeof window === 'undefined') {
      logger.error(args[0] as string, ...args.slice(1))
    } else {
      console.error(...args)
    }
  },
}
