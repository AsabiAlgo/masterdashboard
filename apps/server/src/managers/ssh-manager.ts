/**
 * SSH Manager
 *
 * Manages SSH connections to remote servers using the ssh2 library.
 * Similar to PTYManager but for SSH sessions instead of local PTY.
 */

import { EventEmitter } from 'events';
import {
  type SSHConfig,
  type SSHSession,
  SessionType,
  SessionStatus,
  TerminalActivityStatus,
  SSH_DEFAULTS,
  createSSHId,
} from '@masterdashboard/shared';
import { createChildLogger } from '../utils/logger.js';
import {
  SSHConnectionError,
  SSHChannelError,
  SSHNotFoundError,
} from '../utils/errors.js';

// Dynamic import for ssh2 to handle missing types gracefully
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ssh2Module: any;

// Type definitions for ssh2 (inline to avoid dependency on @types/ssh2)
interface KeyboardInteractivePrompt {
  prompt: string;
  echo: boolean;
}

type KeyboardInteractiveCallback = (responses: string[]) => void;

interface SSH2ConnectConfig {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  agent?: string;
  readyTimeout?: number;
  keepaliveInterval?: number;
  keepaliveCountMax?: number;
}

interface SSH2FileEntry {
  filename: string;
  attrs: {
    size: number;
    mtime: number;
    mode: number;
    isDirectory: () => boolean;
    isFile: () => boolean;
    isSymbolicLink: () => boolean;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SSH2Client = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SSH2Channel = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SSH2SFTPWrapper = any;

const logger = createChildLogger('ssh-manager');

interface SSHConnection {
  client: SSH2Client;
  stream: SSH2Channel | null;
  sessionId: string;
  config: SSHConfig;
  keyboardCallback?: KeyboardInteractiveCallback;
}

interface ManagedSSH {
  connection: SSHConnection;
  session: SSHSession;
  createdAt: Date;
}

export class SSHManager extends EventEmitter {
  private connections = new Map<string, ManagedSSH>();

  constructor() {
    super();
    logger.info('SSH manager initialized');
  }

  /**
   * Connect to an SSH server and create a session
   */
  async connect(config: SSHConfig): Promise<SSHSession> {
    // Dynamically import ssh2
    if (!ssh2Module) {
      ssh2Module = await import('ssh2');
    }
    const { Client } = ssh2Module;

    const sessionId = createSSHId();
    const client: SSH2Client = new Client();

    logger.info(
      { sessionId, host: config.host, port: config.port, username: config.username },
      'Connecting to SSH server'
    );

    return new Promise((resolve, reject) => {
      const connectConfig: SSH2ConnectConfig = {
        host: config.host,
        port: config.port ?? SSH_DEFAULTS.port,
        username: config.username,
        readyTimeout: config.timeout ?? SSH_DEFAULTS.timeout,
        keepaliveInterval: config.keepAliveInterval ?? SSH_DEFAULTS.keepAliveInterval,
        keepaliveCountMax: 3,
      };

      // Add authentication based on method
      if (config.authMethod === 'password' && config.password) {
        connectConfig.password = config.password;
      } else if (config.authMethod === 'privateKey' && config.privateKey) {
        connectConfig.privateKey = config.privateKey;
        if (config.passphrase) {
          connectConfig.passphrase = config.passphrase;
        }
      } else if (config.authMethod === 'agent') {
        connectConfig.agent = process.env.SSH_AUTH_SOCK;
      }

      client.on('ready', async () => {
        logger.info({ sessionId, host: config.host }, 'SSH connection ready');

        const now = new Date();
        const session: SSHSession = {
          id: sessionId,
          type: SessionType.SSH,
          status: SessionStatus.ACTIVE,
          projectId: config.projectId,
          host: config.host,
          port: config.port ?? SSH_DEFAULTS.port,
          username: config.username,
          cols: config.cols ?? SSH_DEFAULTS.cols,
          rows: config.rows ?? SSH_DEFAULTS.rows,
          activityStatus: TerminalActivityStatus.IDLE,
          createdAt: now,
          updatedAt: now,
          lastActiveAt: now,
        };

        const connection: SSHConnection = {
          client,
          stream: null,
          sessionId,
          config,
        };

        // Open shell
        try {
          const stream = await this.openShell(sessionId, client, session.cols, session.rows);
          connection.stream = stream;

          const managed: ManagedSSH = {
            connection,
            session,
            createdAt: now,
          };

          this.connections.set(sessionId, managed);
          this.emit('connected', { sessionId, host: config.host, username: config.username });
          resolve(session);
        } catch (error) {
          client.end();
          const errorMessage = error instanceof Error ? error.message : 'Failed to open shell';
          reject(new SSHChannelError(sessionId, errorMessage));
        }
      });

      client.on('error', (err: Error) => {
        logger.error({ sessionId, host: config.host, error: err.message }, 'SSH connection error');
        this.emit('error', { sessionId, error: err.message });
        this.cleanup(sessionId);
        reject(new SSHConnectionError(config.host, err.message));
      });

      client.on('end', () => {
        logger.info({ sessionId }, 'SSH connection ended');
        this.handleDisconnect(sessionId);
      });

      client.on('close', () => {
        logger.info({ sessionId }, 'SSH connection closed');
        this.handleDisconnect(sessionId);
      });

      client.on('keyboard-interactive', (
        name: string,
        instructions: string,
        _lang: string,
        prompts: KeyboardInteractivePrompt[],
        finish: KeyboardInteractiveCallback
      ) => {
        logger.debug({ sessionId, name, instructions }, 'SSH keyboard-interactive auth');

        const managed = this.connections.get(sessionId);
        if (managed) {
          managed.connection.keyboardCallback = finish;
        }

        this.emit('keyboard-interactive', {
          sessionId,
          name,
          instructions,
          prompts: prompts.map((p: KeyboardInteractivePrompt) => ({ prompt: p.prompt, echo: p.echo })),
        });
      });

      // Start connection
      client.connect(connectConfig);
    });
  }

  /**
   * Open a shell channel on the SSH connection
   */
  private openShell(
    sessionId: string,
    client: SSH2Client,
    cols: number,
    rows: number
  ): Promise<SSH2Channel> {
    return new Promise((resolve, reject) => {
      client.shell(
        {
          term: 'xterm-256color',
          cols,
          rows,
        },
        (err: Error | undefined, stream: SSH2Channel) => {
          if (err) {
            reject(err);
            return;
          }

          stream.on('data', (data: Buffer) => {
            this.emit('data', {
              sessionId,
              data: data.toString('utf8'),
            });
          });

          stream.on('close', () => {
            logger.info({ sessionId }, 'SSH stream closed');
            this.emit('closed', { sessionId });
            this.cleanup(sessionId);
          });

          stream.stderr.on('data', (data: Buffer) => {
            this.emit('data', {
              sessionId,
              data: data.toString('utf8'),
            });
          });

          resolve(stream);
        }
      );
    });
  }

  /**
   * Write data to an SSH session
   */
  write(sessionId: string, data: string): boolean {
    const managed = this.connections.get(sessionId);
    if (!managed?.connection.stream) {
      logger.warn({ sessionId }, 'Attempted to write to non-existent SSH session');
      return false;
    }

    managed.connection.stream.write(data);
    managed.session.lastActiveAt = new Date();
    return true;
  }

  /**
   * Resize the SSH terminal
   */
  resize(sessionId: string, cols: number, rows: number): boolean {
    const managed = this.connections.get(sessionId);
    if (!managed?.connection.stream) {
      logger.warn({ sessionId }, 'Attempted to resize non-existent SSH session');
      return false;
    }

    managed.connection.stream.setWindow(rows, cols, 0, 0);
    managed.session.cols = cols;
    managed.session.rows = rows;
    managed.session.updatedAt = new Date();
    logger.debug({ sessionId, cols, rows }, 'Resized SSH terminal');
    return true;
  }

  /**
   * Respond to keyboard-interactive authentication
   */
  respondKeyboardInteractive(sessionId: string, responses: string[]): boolean {
    const managed = this.connections.get(sessionId);
    if (!managed?.connection.keyboardCallback) {
      logger.warn({ sessionId }, 'No keyboard-interactive callback pending');
      return false;
    }

    managed.connection.keyboardCallback(responses);
    delete managed.connection.keyboardCallback;
    return true;
  }

  /**
   * Disconnect an SSH session
   */
  disconnect(sessionId: string): void {
    const managed = this.connections.get(sessionId);
    if (!managed) {
      return;
    }

    logger.info({ sessionId }, 'Disconnecting SSH session');

    if (managed.connection.stream) {
      managed.connection.stream.close();
    }
    managed.connection.client.end();

    managed.session.status = SessionStatus.TERMINATED;
    managed.session.updatedAt = new Date();

    this.connections.delete(sessionId);
    this.emit('disconnected', { sessionId });
  }

  /**
   * Check if a session is connected
   */
  isConnected(sessionId: string): boolean {
    const managed = this.connections.get(sessionId);
    return !!managed?.connection.stream;
  }

  /**
   * Get an SSH session
   */
  getSession(sessionId: string): SSHSession | undefined {
    return this.connections.get(sessionId)?.session;
  }

  /**
   * Get all running SSH session IDs
   */
  getRunningSessionIds(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Get the count of running SSH sessions
   */
  getRunningCount(): number {
    return this.connections.size;
  }

  /**
   * Handle disconnect event
   */
  private handleDisconnect(sessionId: string): void {
    const managed = this.connections.get(sessionId);
    if (managed && managed.session.status !== SessionStatus.TERMINATED) {
      managed.session.status = SessionStatus.TERMINATED;
      managed.session.updatedAt = new Date();
      this.connections.delete(sessionId);
      this.emit('disconnected', { sessionId });
    }
  }

  /**
   * Cleanup a session without emitting events
   */
  private cleanup(sessionId: string): void {
    const managed = this.connections.get(sessionId);
    if (managed) {
      if (managed.connection.stream) {
        try {
          managed.connection.stream.close();
        } catch {
          // Ignore close errors
        }
      }
      try {
        managed.connection.client.end();
      } catch {
        // Ignore end errors
      }
      this.connections.delete(sessionId);
    }
  }

  /**
   * SFTP Operations - List files in a directory
   */
  async listFiles(sessionId: string, path: string): Promise<Array<{
    name: string;
    type: 'file' | 'directory' | 'symlink' | 'unknown';
    size: number;
    modified: number;
    permissions: number;
  }>> {
    const managed = this.connections.get(sessionId);
    if (!managed) {
      throw new SSHNotFoundError(sessionId);
    }

    return new Promise((resolve, reject) => {
      managed.connection.client.sftp((err: Error | undefined, sftp: SSH2SFTPWrapper) => {
        if (err) {
          reject(new SSHChannelError(sessionId, `SFTP channel failed: ${err.message}`));
          return;
        }

        sftp.readdir(path, (readErr: Error | undefined, list: SSH2FileEntry[]) => {
          sftp.end();
          if (readErr) {
            reject(new SSHChannelError(sessionId, `Failed to read directory: ${readErr.message}`));
            return;
          }

          resolve(
            list.map((item: SSH2FileEntry) => {
              let fileType: 'file' | 'directory' | 'symlink' | 'unknown' = 'unknown';
              if (item.attrs.isDirectory()) {
                fileType = 'directory';
              } else if (item.attrs.isFile()) {
                fileType = 'file';
              } else if (item.attrs.isSymbolicLink()) {
                fileType = 'symlink';
              }

              return {
                name: item.filename,
                type: fileType,
                size: item.attrs.size,
                modified: item.attrs.mtime * 1000, // Convert to ms
                permissions: item.attrs.mode,
              };
            })
          );
        });
      });
    });
  }

  /**
   * SFTP Operations - Download a file
   */
  async downloadFile(sessionId: string, remotePath: string): Promise<Buffer> {
    const managed = this.connections.get(sessionId);
    if (!managed) {
      throw new SSHNotFoundError(sessionId);
    }

    return new Promise((resolve, reject) => {
      managed.connection.client.sftp((err: Error | undefined, sftp: SSH2SFTPWrapper) => {
        if (err) {
          reject(new SSHChannelError(sessionId, `SFTP channel failed: ${err.message}`));
          return;
        }

        const chunks: Buffer[] = [];
        const stream = sftp.createReadStream(remotePath);

        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => {
          sftp.end();
          resolve(Buffer.concat(chunks));
        });
        stream.on('error', (streamErr: Error) => {
          sftp.end();
          reject(new SSHChannelError(sessionId, `Failed to download file: ${streamErr.message}`));
        });
      });
    });
  }

  /**
   * SFTP Operations - Upload a file
   */
  async uploadFile(sessionId: string, remotePath: string, data: Buffer): Promise<void> {
    const managed = this.connections.get(sessionId);
    if (!managed) {
      throw new SSHNotFoundError(sessionId);
    }

    return new Promise((resolve, reject) => {
      managed.connection.client.sftp((err: Error | undefined, sftp: SSH2SFTPWrapper) => {
        if (err) {
          reject(new SSHChannelError(sessionId, `SFTP channel failed: ${err.message}`));
          return;
        }

        const stream = sftp.createWriteStream(remotePath);
        stream.on('close', () => {
          sftp.end();
          resolve();
        });
        stream.on('error', (streamErr: Error) => {
          sftp.end();
          reject(new SSHChannelError(sessionId, `Failed to upload file: ${streamErr.message}`));
        });
        stream.end(data);
      });
    });
  }

  /**
   * Disconnect all SSH sessions (for shutdown)
   */
  disconnectAll(): void {
    const sessionIds = Array.from(this.connections.keys());
    for (const sessionId of sessionIds) {
      this.disconnect(sessionId);
    }
    logger.info({ count: sessionIds.length }, 'Disconnected all SSH sessions');
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.disconnectAll();
    this.removeAllListeners();
    logger.info('SSH manager destroyed');
  }
}
