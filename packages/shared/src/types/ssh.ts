/**
 * SSH Types
 *
 * Types for SSH remote connection sessions.
 */

import type { BaseSession, SerializedBaseSession } from './session.js';
import { SessionType } from './session.js';
import type { TerminalActivityStatus } from './terminal.js';

/**
 * SSH authentication methods
 */
export type SSHAuthMethod = 'password' | 'privateKey' | 'agent';

/**
 * SSH credentials for authentication
 */
export interface SSHCredentials {
  /** Remote host */
  host: string;
  /** SSH port (default: 22) */
  port: number;
  /** Username for authentication */
  username: string;
  /** Authentication method */
  authMethod: SSHAuthMethod;
  /** Password (for password auth) */
  password?: string;
  /** Private key content (for privateKey auth) */
  privateKey?: string;
  /** Passphrase for encrypted private key */
  passphrase?: string;
}

/**
 * SSH session extending base session
 */
export interface SSHSession extends BaseSession {
  readonly type: SessionType.SSH;
  /** Remote host */
  readonly host: string;
  /** Remote port */
  readonly port: number;
  /** Username */
  readonly username: string;
  /** Terminal columns */
  cols: number;
  /** Terminal rows */
  rows: number;
  /** Current activity status */
  activityStatus: TerminalActivityStatus;
  /** Connection fingerprint for verification */
  fingerprint?: string;
}

/**
 * Serializable version of SSHSession
 */
export interface SerializedSSHSession extends SerializedBaseSession {
  readonly type: SessionType.SSH;
  readonly host: string;
  readonly port: number;
  readonly username: string;
  cols: number;
  rows: number;
  activityStatus: TerminalActivityStatus;
  fingerprint?: string;
}

/**
 * Configuration for creating an SSH session
 */
export interface SSHConfig {
  /** Remote host */
  host: string;
  /** SSH port (default: 22) */
  port?: number;
  /** Username */
  username: string;
  /** Authentication method */
  authMethod: SSHAuthMethod;
  /** Password (for password auth) */
  password?: string;
  /** Private key content (for privateKey auth) */
  privateKey?: string;
  /** Passphrase for encrypted private key */
  passphrase?: string;
  /** Project this SSH session belongs to */
  projectId: string;
  /** Initial terminal columns */
  cols?: number;
  /** Initial terminal rows */
  rows?: number;
  /** Connection timeout in ms */
  timeout?: number;
  /** Keep-alive interval in ms */
  keepAliveInterval?: number;
}

/**
 * SSH connection result
 */
export interface SSHConnectResult {
  /** Whether connection succeeded */
  success: boolean;
  /** Session ID if successful */
  sessionId?: string;
  /** Server fingerprint */
  fingerprint?: string;
  /** Error message if failed */
  error?: string;
  /** Error code */
  errorCode?: SSHErrorCode;
}

/**
 * SSH error codes
 */
export enum SSHErrorCode {
  /** Connection refused by host */
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  /** Host not found */
  HOST_NOT_FOUND = 'HOST_NOT_FOUND',
  /** Connection timed out */
  TIMEOUT = 'TIMEOUT',
  /** Authentication failed */
  AUTH_FAILED = 'AUTH_FAILED',
  /** Invalid private key */
  INVALID_KEY = 'INVALID_KEY',
  /** Wrong passphrase for key */
  WRONG_PASSPHRASE = 'WRONG_PASSPHRASE',
  /** Host key verification failed */
  HOST_KEY_VERIFY_FAILED = 'HOST_KEY_VERIFY_FAILED',
  /** Connection closed by remote */
  REMOTE_CLOSED = 'REMOTE_CLOSED',
  /** Unknown error */
  UNKNOWN = 'UNKNOWN',
}

/**
 * SSH host key verification request
 */
export interface SSHHostKeyVerification {
  /** Host being connected to */
  host: string;
  /** Port */
  port: number;
  /** Key type (e.g., 'ssh-rsa', 'ssh-ed25519') */
  keyType: string;
  /** Key fingerprint */
  fingerprint: string;
  /** Whether this is a new or changed key */
  status: 'new' | 'changed';
}

/**
 * SSH host key verification response
 */
export interface SSHHostKeyVerificationResponse {
  /** Whether to accept the key */
  accept: boolean;
  /** Whether to remember this decision */
  remember?: boolean;
}

/**
 * SSH port forwarding configuration
 */
export interface SSHPortForward {
  /** Local port to listen on */
  localPort: number;
  /** Remote host to forward to */
  remoteHost: string;
  /** Remote port to forward to */
  remotePort: number;
  /** Direction of forwarding */
  direction: 'local' | 'remote';
}

/**
 * Saved SSH connection for quick access
 */
export interface SavedSSHConnection {
  /** Unique identifier */
  readonly id: string;
  /** Display name */
  name: string;
  /** Remote host */
  host: string;
  /** SSH port */
  port: number;
  /** Username */
  username: string;
  /** Authentication method */
  authMethod: SSHAuthMethod;
  /** Path to private key file (for privateKey auth) */
  privateKeyPath?: string;
  /** Use SSH agent */
  useAgent?: boolean;
  /** Project this connection belongs to */
  projectId?: string;
  /** When this was last used */
  lastUsedAt?: Date;
  /** Custom terminal settings */
  terminalSettings?: {
    cols?: number;
    rows?: number;
  };
}

/**
 * Default SSH configuration values
 */
export const SSH_DEFAULTS = {
  port: 22,
  cols: 100,
  rows: 30,
  timeout: 30000,
  keepAliveInterval: 10000,
} as const;
