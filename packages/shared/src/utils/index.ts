/**
 * Utility Exports
 *
 * Re-exports all utilities from the utils directory.
 */

// ID generation utilities
export {
  DEFAULT_ID_LENGTH,
  SHORT_ID_LENGTH,
  ID_PREFIXES,
  type IdPrefix,
  createSessionId,
  createTerminalId,
  createBrowserId,
  createSSHId,
  createProjectId,
  createLayoutId,
  createNodeId,
  createPatternId,
  createBufferId,
  createId,
  createShortId,
  createPinCode,
  createSlugId,
  createCorrelationId,
  getIdPrefix,
  hasIdPrefix,
  isValidId,
  isValidPrefixedId,
} from './id.js';

// Validation utilities
export {
  // Base schemas
  idSchema,
  prefixedIdSchema,
  // Session schemas
  sessionTypeSchema,
  sessionStatusSchema,
  // Terminal schemas
  shellTypeSchema,
  terminalActivityStatusSchema,
  terminalDimensionsSchema,
  terminalConfigSchema,
  type ValidatedTerminalConfig,
  // Project schemas
  projectSettingsSchema,
  createProjectConfigSchema,
  type ValidatedCreateProjectConfig,
  // Browser schemas
  browserEngineSchema,
  browserViewportSchema,
  browserConfigSchema,
  type ValidatedBrowserConfig,
  // SSH schemas
  sshAuthMethodSchema,
  sshConfigSchema,
  type ValidatedSSHConfig,
  // Canvas schemas
  nodeTypeSchema,
  nodePositionSchema,
  nodeDimensionsSchema,
  canvasViewportSchema,
  // Status pattern schemas
  statusPatternSchema,
  type ValidatedStatusPattern,
  // Buffer schemas
  bufferConfigSchema,
  type ValidatedBufferConfig,
  // WebSocket payload schemas
  terminalInputPayloadSchema,
  terminalResizePayloadSchema,
  sessionCreatePayloadSchema,
  // Validation helpers
  validate,
  safeValidate,
  partial,
  formatZodErrors,
} from './validation.js';
