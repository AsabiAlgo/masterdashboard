/**
 * Environment Configuration
 *
 * Loads and validates environment variables for the server.
 */

import { z } from 'zod';

const envSchema = z.object({
  // Server
  PORT: z.string().default('4000').transform(Number),
  HOST: z.string().default('127.0.0.1'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Logging - default to 'error' for clean console (set LOG_LEVEL=info or debug for verbose)
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('error'),

  // Buffer
  SCROLLBACK_LINES: z.string().default('50000').transform(Number),
  BUFFER_PERSIST_INTERVAL_MS: z.string().default('5000').transform(Number),

  // Database
  DATABASE_URL: z.string().default('./data/masterdashboard.db'),

  // Session cleanup
  SESSION_CLEANUP_INTERVAL_MS: z.string().default('60000').transform(Number),
  PAUSED_SESSION_TIMEOUT_MS: z.string().default('3600000').transform(Number), // 1 hour

  // Tmux cleanup
  TMUX_IDLE_TIMEOUT_MS: z.string().default('172800000').transform(Number).optional(), // 48 hours
  TMUX_MAX_SESSIONS: z.string().default('400').transform(Number).optional(),
  TMUX_CLEANUP_INTERVAL_MS: z.string().default('300000').transform(Number).optional(), // 5 minutes
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.errors
      .map((e) => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${errors}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === 'development';
}

export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}

export function isTest(): boolean {
  return getEnv().NODE_ENV === 'test';
}
