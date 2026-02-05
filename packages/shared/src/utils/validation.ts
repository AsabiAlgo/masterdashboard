/**
 * Validation Utilities
 *
 * Zod schemas for runtime validation of configurations and payloads.
 */

import { z } from 'zod';
import { SessionType, SessionStatus } from '../types/session.js';
import { ShellType, TerminalActivityStatus } from '../types/terminal.js';
import { BrowserEngine } from '../types/browser.js';
import { NodeType } from '../types/canvas.js';
import { SSH_DEFAULTS } from '../types/ssh.js';
import { DEFAULT_SCROLLBACK_LINES } from '../types/project.js';

// ============================================================================
// Base Schemas
// ============================================================================

/**
 * ID validation schema
 */
export const idSchema = z.string().min(6).max(50).regex(/^[a-zA-Z0-9_-]+$/);

/**
 * Prefixed ID schema factory
 */
export function prefixedIdSchema(prefix: string) {
  return z.string().startsWith(prefix).min(prefix.length + 6);
}

// ============================================================================
// Session Schemas
// ============================================================================

/**
 * Session type schema
 */
export const sessionTypeSchema = z.nativeEnum(SessionType);

/**
 * Session status schema
 */
export const sessionStatusSchema = z.nativeEnum(SessionStatus);

// ============================================================================
// Terminal Schemas
// ============================================================================

/**
 * Shell type schema
 */
export const shellTypeSchema = z.nativeEnum(ShellType);

/**
 * Terminal activity status schema
 */
export const terminalActivityStatusSchema = z.nativeEnum(TerminalActivityStatus);

/**
 * Terminal dimensions schema
 */
export const terminalDimensionsSchema = z.object({
  cols: z.number().int().min(1).max(500).default(100),
  rows: z.number().int().min(1).max(200).default(30),
});

/**
 * Terminal configuration schema
 */
export const terminalConfigSchema = z.object({
  shell: shellTypeSchema,
  cwd: z.string().optional(),
  env: z.record(z.string()).optional(),
  cols: z.number().int().min(1).max(500).default(100),
  rows: z.number().int().min(1).max(200).default(30),
  projectId: idSchema,
  title: z.string().max(100).optional(),
});

/**
 * Type inferred from terminal config schema
 */
export type ValidatedTerminalConfig = z.infer<typeof terminalConfigSchema>;

// ============================================================================
// Project Schemas
// ============================================================================

/**
 * Project settings schema
 */
export const projectSettingsSchema = z.object({
  autoSaveLayout: z.boolean().default(true),
  defaultShell: shellTypeSchema.default(ShellType.ZSH),
  scrollbackLines: z.number().int().min(100).max(100000).default(DEFAULT_SCROLLBACK_LINES),
  enableSoundNotifications: z.boolean().default(true),
  theme: z.string().optional(),
});

/**
 * Create project configuration schema
 */
export const createProjectConfigSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  defaultCwd: z.string().min(1),
  settings: projectSettingsSchema.partial().optional(),
});

/**
 * Type inferred from create project config schema
 */
export type ValidatedCreateProjectConfig = z.infer<typeof createProjectConfigSchema>;

// ============================================================================
// Browser Schemas
// ============================================================================

/**
 * Browser engine schema
 */
export const browserEngineSchema = z.nativeEnum(BrowserEngine);

/**
 * Browser viewport schema
 */
export const browserViewportSchema = z.object({
  width: z.number().int().min(100).max(4096).default(1280),
  height: z.number().int().min(100).max(4096).default(720),
});

/**
 * Browser configuration schema
 */
export const browserConfigSchema = z.object({
  engine: browserEngineSchema.default(BrowserEngine.CHROMIUM),
  url: z.string().url().optional(),
  viewport: browserViewportSchema.optional(),
  headless: z.boolean().default(false),
  isInteractive: z.boolean().default(true),
  projectId: idSchema,
});

/**
 * Type inferred from browser config schema
 */
export type ValidatedBrowserConfig = z.infer<typeof browserConfigSchema>;

// ============================================================================
// SSH Schemas
// ============================================================================

/**
 * SSH auth method schema
 */
export const sshAuthMethodSchema = z.enum(['password', 'privateKey', 'agent']);

/**
 * SSH configuration schema
 */
export const sshConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(SSH_DEFAULTS.port),
  username: z.string().min(1),
  authMethod: sshAuthMethodSchema,
  password: z.string().optional(),
  privateKey: z.string().optional(),
  passphrase: z.string().optional(),
  projectId: idSchema,
  cols: z.number().int().min(1).max(500).default(SSH_DEFAULTS.cols),
  rows: z.number().int().min(1).max(200).default(SSH_DEFAULTS.rows),
  timeout: z.number().int().min(1000).max(120000).default(SSH_DEFAULTS.timeout),
  keepAliveInterval: z.number().int().min(1000).max(60000).default(SSH_DEFAULTS.keepAliveInterval),
}).refine((data) => {
  // Validate that required auth fields are present
  if (data.authMethod === 'password' && !data.password) {
    return false;
  }
  if (data.authMethod === 'privateKey' && !data.privateKey) {
    return false;
  }
  return true;
}, {
  message: 'Password required for password auth, privateKey required for privateKey auth',
});

/**
 * Type inferred from SSH config schema
 */
export type ValidatedSSHConfig = z.infer<typeof sshConfigSchema>;

// ============================================================================
// Canvas Schemas
// ============================================================================

/**
 * Node type schema
 */
export const nodeTypeSchema = z.nativeEnum(NodeType);

/**
 * Node position schema
 */
export const nodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

/**
 * Node dimensions schema
 */
export const nodeDimensionsSchema = z.object({
  width: z.number().int().min(100).max(2000),
  height: z.number().int().min(100).max(2000),
});

/**
 * Canvas viewport schema
 */
export const canvasViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().min(0.1).max(4),
});

// ============================================================================
// Status Pattern Schemas
// ============================================================================

/**
 * Status pattern schema
 */
export const statusPatternSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(100),
  shell: z.union([shellTypeSchema, z.literal('all')]),
  pattern: z.string().min(1),
  status: terminalActivityStatusSchema,
  priority: z.number().int().min(0).max(1000),
  enabled: z.boolean().default(true),
});

/**
 * Type inferred from status pattern schema
 */
export type ValidatedStatusPattern = z.infer<typeof statusPatternSchema>;

// ============================================================================
// Buffer Schemas
// ============================================================================

/**
 * Buffer configuration schema
 */
export const bufferConfigSchema = z.object({
  maxLines: z.number().int().min(100).max(100000).default(DEFAULT_SCROLLBACK_LINES),
  persistToDisk: z.boolean().default(true),
  flushIntervalMs: z.number().int().min(1000).max(60000).default(5000),
});

/**
 * Type inferred from buffer config schema
 */
export type ValidatedBufferConfig = z.infer<typeof bufferConfigSchema>;

// ============================================================================
// WebSocket Payload Schemas
// ============================================================================

/**
 * Terminal input payload schema
 */
export const terminalInputPayloadSchema = z.object({
  sessionId: idSchema,
  data: z.string(),
});

/**
 * Terminal resize payload schema
 */
export const terminalResizePayloadSchema = z.object({
  sessionId: idSchema,
  cols: z.number().int().min(1).max(500),
  rows: z.number().int().min(1).max(200),
});

/**
 * Session create payload schema
 */
export const sessionCreatePayloadSchema = z.object({
  type: sessionTypeSchema,
  projectId: idSchema,
  config: z.union([terminalConfigSchema, browserConfigSchema, sshConfigSchema]),
});

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate and parse data with a schema
 * @throws ZodError if validation fails
 */
export function validate<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  return schema.parse(data);
}

/**
 * Safely validate data, returning result object
 */
export function safeValidate<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Create a partial schema from an existing schema
 */
export function partial<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.partial();
}

/**
 * Format Zod errors into a human-readable string
 */
export function formatZodErrors(error: z.ZodError): string {
  return error.errors
    .map((e) => `${e.path.join('.')}: ${e.message}`)
    .join(', ');
}
