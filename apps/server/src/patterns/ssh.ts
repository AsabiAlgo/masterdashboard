/**
 * SSH Patterns
 *
 * Status detection patterns for SSH connections.
 * Detects password prompts, host key confirmations, and connection errors.
 */

import {
  TerminalActivityStatus,
  type StatusPattern,
} from '@masterdashboard/shared';

/**
 * SSH specific patterns
 *
 * Detects:
 * - Password prompts
 * - Passphrase prompts (for SSH keys)
 * - Host key confirmations (yes/no)
 * - Connection errors
 * - Authentication failures
 */
export const SSH_PATTERNS: StatusPattern[] = [
  // Password prompt
  {
    id: 'ssh-password',
    name: 'SSH Password Prompt',
    shell: 'all',
    pattern: '[Pp]assword:?\\s*$',
    status: TerminalActivityStatus.WAITING,
    priority: 80,
    enabled: true,
  },
  // Passphrase prompt for SSH key
  {
    id: 'ssh-passphrase',
    name: 'SSH Passphrase Prompt',
    shell: 'all',
    pattern: '[Pp]assphrase( for .*)?:?\\s*$',
    status: TerminalActivityStatus.WAITING,
    priority: 80,
    enabled: true,
  },
  // Enter passphrase prompt
  {
    id: 'ssh-enter-passphrase',
    name: 'SSH Enter Passphrase',
    shell: 'all',
    pattern: 'Enter passphrase',
    status: TerminalActivityStatus.WAITING,
    priority: 79,
    enabled: true,
  },
  // Yes/no confirmation (host key)
  {
    id: 'ssh-yes-no',
    name: 'SSH Host Key Confirmation',
    shell: 'all',
    pattern: '\\(yes/no(/\\[fingerprint\\])?\\)\\??\\s*$',
    status: TerminalActivityStatus.WAITING,
    priority: 85,
    enabled: true,
  },
  // Continue connecting?
  {
    id: 'ssh-continue',
    name: 'SSH Continue Connecting',
    shell: 'all',
    pattern: 'Are you sure you want to continue connecting',
    status: TerminalActivityStatus.WAITING,
    priority: 84,
    enabled: true,
  },
  // MFA/2FA prompts
  {
    id: 'ssh-verification-code',
    name: 'SSH Verification Code',
    shell: 'all',
    pattern: '(Verification|verification) code:?\\s*$',
    status: TerminalActivityStatus.WAITING,
    priority: 82,
    enabled: true,
  },
  // OTP prompt
  {
    id: 'ssh-otp',
    name: 'SSH OTP Prompt',
    shell: 'all',
    pattern: '(OTP|One.?time password|TOTP):?\\s*$',
    status: TerminalActivityStatus.WAITING,
    priority: 81,
    enabled: true,
  },
  // Connection refused
  {
    id: 'ssh-refused',
    name: 'SSH Connection Refused',
    shell: 'all',
    pattern: 'Connection refused|Connection timed out',
    status: TerminalActivityStatus.ERROR,
    priority: 75,
    enabled: true,
  },
  // No route to host
  {
    id: 'ssh-no-route',
    name: 'SSH No Route',
    shell: 'all',
    pattern: 'No route to host|Network is unreachable',
    status: TerminalActivityStatus.ERROR,
    priority: 75,
    enabled: true,
  },
  // Host key changed
  {
    id: 'ssh-host-key-changed',
    name: 'SSH Host Key Changed',
    shell: 'all',
    pattern: 'REMOTE HOST IDENTIFICATION HAS CHANGED|WARNING: POSSIBLE DNS SPOOFING DETECTED',
    status: TerminalActivityStatus.ERROR,
    priority: 78,
    enabled: true,
  },
  // Authentication failed
  {
    id: 'ssh-auth-failed',
    name: 'SSH Auth Failed',
    shell: 'all',
    pattern: 'Permission denied \\(publickey|Authentication failed|Too many authentication failures',
    status: TerminalActivityStatus.ERROR,
    priority: 77,
    enabled: true,
  },
  // Connection closed
  {
    id: 'ssh-connection-closed',
    name: 'SSH Connection Closed',
    shell: 'all',
    pattern: 'Connection closed by|Connection reset by peer',
    status: TerminalActivityStatus.ERROR,
    priority: 72,
    enabled: true,
  },
  // Host not found
  {
    id: 'ssh-host-not-found',
    name: 'SSH Host Not Found',
    shell: 'all',
    pattern: 'Could not resolve hostname|Name or service not known',
    status: TerminalActivityStatus.ERROR,
    priority: 74,
    enabled: true,
  },
];

export default SSH_PATTERNS;
