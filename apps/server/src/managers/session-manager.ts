/**
 * Session Manager
 *
 * Orchestrates terminal sessions with persistence across browser disconnects
 * and server restarts (via tmux). Core component that coordinates PTY, Buffer,
 * Status, and Tmux managers.
 */

import { EventEmitter } from 'events';
import {
  SessionType,
  SessionStatus,
  TerminalActivityStatus,
  createTerminalId,
  type BaseSession,
  type TerminalSession,
  type TerminalConfig,
  type BufferSnapshot,
} from '@masterdashboard/shared';
import { createChildLogger } from '../utils/logger.js';
import {
  SessionNotFoundError,
  SessionTerminatedError,
  PTYNotFoundError,
} from '../utils/errors.js';
import {
  insertSession,
  updateSessionStatus,
  updateSessionLastActive,
  getSessionById,
  updateSessionTmuxName,
  getActiveSessions as getActiveSessionsFromDb,
} from '../persistence/database.js';
import { PTYManager } from './pty-manager.js';
import { BufferManager } from './buffer-manager.js';
import { StatusDetector } from './status-detector.js';
import { TmuxManager } from './tmux-manager.js';
import type { ReconnectResult, ManagerOptions } from './types.js';

const logger = createChildLogger('session-manager');

export class SessionManager extends EventEmitter {
  private sessions = new Map<string, BaseSession>();
  private clientSessions = new Map<string, Set<string>>(); // clientId -> sessionIds
  private sessionClients = new Map<string, string>(); // sessionId -> clientId (current)
  private ptyManager: PTYManager;
  private tmuxManager: TmuxManager;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private bufferManager: BufferManager,
    private statusDetector: StatusDetector,
    private options: Partial<ManagerOptions> = {}
  ) {
    super();

    // Initialize managers
    this.tmuxManager = new TmuxManager();
    this.ptyManager = new PTYManager(this.tmuxManager);

    this.setupPTYListeners();
    this.setupStatusListeners();
    this.setupTmuxListeners();

    // Start session cleanup interval
    const cleanupIntervalMs = options.sessionCleanupIntervalMs ?? 60000;
    this.cleanupInterval = setInterval(() => this.cleanupStaleSessions(), cleanupIntervalMs);

    logger.info({ options }, 'Session manager initialized');
  }

  /**
   * Initialize the session manager (including tmux recovery)
   */
  async initialize(): Promise<void> {
    // Initialize tmux manager
    await this.tmuxManager.initialize();

    // Recover sessions from database that might have tmux sessions
    await this.recoverSessions();

    logger.info('Session manager initialization complete');
  }

  /**
   * Get the tmux manager instance
   */
  getTmuxManager(): TmuxManager {
    return this.tmuxManager;
  }

  /**
   * Set up PTY event listeners
   */
  private setupPTYListeners(): void {
    // PTY output -> buffer + emit to client
    this.ptyManager.on('data', ({ sessionId, data }) => {
      // Always buffer (even if no client connected)
      this.bufferManager.appendOutput(sessionId, data);

      // Detect status changes
      const newStatus = this.statusDetector.detect(sessionId, data);
      if (newStatus) {
        this.updateSessionActivityStatus(sessionId, newStatus);
      }

      // Emit to connected client if any
      this.emit('terminal:output', { sessionId, data, timestamp: Date.now() });
    });

    this.ptyManager.on('exit', ({ sessionId, exitCode }) => {
      this.handlePtyExit(sessionId, exitCode);
    });
  }

  /**
   * Set up status detector listeners
   */
  private setupStatusListeners(): void {
    this.statusDetector.on('status:change', (event) => {
      this.emit('status:change', event);
    });
  }

  /**
   * Set up tmux event listeners
   */
  private setupTmuxListeners(): void {
    this.tmuxManager.on('session:recovered', (tmuxSession) => {
      logger.info({ sessionId: tmuxSession.sessionId }, 'Tmux session recovered event');
    });

    this.tmuxManager.on('session:killed', ({ sessionId }) => {
      // Tmux session killed externally - update our state
      const session = this.sessions.get(sessionId);
      if (session && session.status !== SessionStatus.TERMINATED) {
        session.status = SessionStatus.TERMINATED;
        session.updatedAt = new Date();
        this.emit('session:terminated', { sessionId });
      }
    });
  }

  /**
   * Recover sessions after server restart
   */
  private async recoverSessions(): Promise<void> {
    const dbSessions = getActiveSessionsFromDb();

    for (const dbSession of dbSessions) {
      const hasTmux = await this.tmuxManager.sessionExists(dbSession.id);

      if (hasTmux) {
        // Mark as disconnected (waiting for client reconnect)
        updateSessionStatus(dbSession.id, SessionStatus.DISCONNECTED);

        // Load session into memory
        const config = JSON.parse(dbSession.config);
        const session: TerminalSession = {
          id: dbSession.id,
          type: SessionType.TERMINAL,
          status: SessionStatus.DISCONNECTED,
          projectId: dbSession.project_id,
          shell: config.shell,
          cwd: config.cwd ?? process.env.HOME ?? '/',
          cols: config.cols ?? 100,
          rows: config.rows ?? 30,
          activityStatus: TerminalActivityStatus.IDLE,
          title: config.title,
          createdAt: new Date(dbSession.created_at),
          updatedAt: new Date(),
          lastActiveAt: new Date(dbSession.last_active_at),
        };

        this.sessions.set(dbSession.id, session);

        // Try to load buffer from disk
        await this.bufferManager.loadBuffer(dbSession.id);

        logger.info({ sessionId: dbSession.id }, 'Recovered session with tmux');
      } else {
        // No tmux session - mark as terminated
        updateSessionStatus(dbSession.id, SessionStatus.TERMINATED);
        logger.info({ sessionId: dbSession.id }, 'Session terminated (no tmux)');
      }
    }
  }

  /**
   * Create a new terminal session
   * Order: DB insert FIRST, then tmux creation (prevents orphans)
   */
  async createTerminalSession(
    clientId: string,
    config: TerminalConfig
  ): Promise<TerminalSession> {
    const sessionId = createTerminalId();
    const now = new Date();

    logger.info({
      sessionId,
      clientId,
      projectId: config.projectId,
      shell: config.shell,
      cwd: config.cwd,
    }, '🔵 SESSION_CREATE_START: Creating terminal session');

    // STEP 1: Insert into database FIRST (prevents orphaned tmux sessions)
    try {
      insertSession({
        id: sessionId,
        type: SessionType.TERMINAL,
        status: SessionStatus.ACTIVE,
        project_id: config.projectId,
        config: JSON.stringify({
          shell: config.shell,
          cwd: config.cwd ?? process.env.HOME ?? '/',
          cols: config.cols ?? 80,
          rows: config.rows ?? 24,
          title: config.title,
        }),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        last_active_at: now.toISOString(),
        metadata: '{}',
        tmux_session_name: null, // Will be updated after tmux creation
      });
      logger.info({ sessionId }, '🔵 SESSION_CREATE_DB: Database entry created');
    } catch (error) {
      logger.error({ sessionId, error }, '🔴 SESSION_CREATE_FAILED: Database insert failed - aborting session creation');
      throw error; // Don't continue if DB insert fails
    }

    // STEP 2: Create PTY process (will use tmux if available)
    try {
      await this.ptyManager.create(sessionId, config);
      logger.info({ sessionId }, '🔵 SESSION_CREATE_PTY: PTY/tmux created');
    } catch (error) {
      // Rollback: delete DB entry since PTY creation failed
      logger.error({ sessionId, error }, '🔴 SESSION_CREATE_FAILED: PTY creation failed - rolling back DB entry');
      try {
        updateSessionStatus(sessionId, SessionStatus.TERMINATED);
      } catch (dbError) {
        logger.error({ sessionId, dbError }, '🔴 SESSION_ROLLBACK_FAILED: Could not update DB status');
      }
      throw error;
    }

    // STEP 3: Update DB with tmux session name
    const tmuxSession = this.tmuxManager.getSession(sessionId);
    const tmuxName = tmuxSession?.tmuxName ?? null;
    if (tmuxName) {
      try {
        updateSessionTmuxName(sessionId, tmuxName);
        logger.info({ sessionId, tmuxName }, '🔵 SESSION_CREATE_TMUX: Tmux name recorded');
      } catch (error) {
        logger.warn({ sessionId, tmuxName, error }, '⚠️ SESSION_CREATE_WARN: Failed to update tmux name in DB');
      }
    }

    // STEP 4: Create buffer and in-memory session
    this.bufferManager.createBuffer(sessionId);

    const session: TerminalSession = {
      id: sessionId,
      type: SessionType.TERMINAL,
      status: SessionStatus.ACTIVE,
      projectId: config.projectId,
      shell: config.shell,
      cwd: config.cwd ?? process.env.HOME ?? '/',
      env: config.env,
      cols: config.cols ?? 80,
      rows: config.rows ?? 24,
      activityStatus: TerminalActivityStatus.IDLE,
      title: config.title,
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
    };

    this.sessions.set(sessionId, session);
    this.trackClientSession(clientId, sessionId);

    this.emit('session:created', session);
    logger.info({
      sessionId,
      shell: config.shell,
      tmuxBacked: !!tmuxName,
      projectId: config.projectId,
    }, '🟢 SESSION_CREATE_COMPLETE: Terminal session ready');

    return session;
  }

  /**
   * Get all sessions
   */
  getSessions(): BaseSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): BaseSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get a terminal session by ID
   */
  getTerminalSession(sessionId: string): TerminalSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session?.type === SessionType.TERMINAL) {
      return session as TerminalSession;
    }
    return undefined;
  }

  /**
   * Get all sessions for a project
   */
  getSessionsByProject(projectId: string): BaseSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.projectId === projectId && s.status !== SessionStatus.TERMINATED
    );
  }

  /**
   * Handle client disconnect (DON'T terminate session)
   */
  handleClientDisconnect(clientId: string): void {
    const sessionIds = this.clientSessions.get(clientId);
    if (!sessionIds) {
      return;
    }

    logger.info({ clientId, sessionCount: sessionIds.size }, 'Client disconnected');

    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session && session.status === SessionStatus.ACTIVE) {
        // Mark as disconnected (tmux keeps running)
        session.status = SessionStatus.DISCONNECTED;
        session.updatedAt = new Date();

        // Mark buffer for replay calculation
        this.bufferManager.markDisconnect(sessionId);

        // Update database
        try {
          updateSessionStatus(sessionId, SessionStatus.DISCONNECTED);
        } catch (error) {
          logger.error({ sessionId, error }, 'Failed to update session status in database');
        }

        this.emit('session:disconnected', { sessionId });
        logger.debug({ sessionId }, 'Session disconnected (tmux alive)');
      }

      // Clear session-to-client mapping
      this.sessionClients.delete(sessionId);
    }

    // Remove client mapping but keep sessions
    this.clientSessions.delete(clientId);
  }

  /**
   * Handle client reconnect - reattach to existing sessions
   */
  async handleClientReconnect(
    clientId: string,
    requestedSessionIds: string[]
  ): Promise<ReconnectResult> {
    logger.info({ clientId, requestedSessionIds }, 'Client reconnecting');

    const activeSessions: string[] = [];
    const terminatedSessions: string[] = [];
    const buffers: BufferSnapshot[] = [];
    const statusChanges: ReconnectResult['statusChanges'] = [];

    for (const sessionId of requestedSessionIds) {
      let session = this.sessions.get(sessionId);

      // Check if session exists in memory or database
      if (!session) {
        // Try to recover from database
        const dbSession = getSessionById(sessionId);

        if (dbSession && dbSession.status !== 'terminated') {
          // Check if tmux session exists
          const hasTmux = await this.tmuxManager.sessionExists(sessionId);
          if (!hasTmux) {
            terminatedSessions.push(sessionId);
            continue;
          }

          // Reconstruct session in memory
          const config = JSON.parse(dbSession.config);
          session = {
            id: sessionId,
            type: SessionType.TERMINAL,
            status: SessionStatus.DISCONNECTED,
            projectId: dbSession.project_id,
            shell: config.shell,
            cwd: config.cwd,
            cols: config.cols,
            rows: config.rows,
            activityStatus: TerminalActivityStatus.IDLE,
            title: config.title,
            createdAt: new Date(dbSession.created_at),
            updatedAt: new Date(),
            lastActiveAt: new Date(dbSession.last_active_at),
          } as TerminalSession;
          this.sessions.set(sessionId, session);
        } else {
          terminatedSessions.push(sessionId);
          continue;
        }
      }

      if (session.status === SessionStatus.TERMINATED) {
        terminatedSessions.push(sessionId);
        continue;
      }

      // Check if tmux session still exists
      const hasTmux = await this.tmuxManager.sessionExists(sessionId);
      if (!hasTmux) {
        // Tmux session was killed (user killed it, idle timeout, etc.)
        session.status = SessionStatus.TERMINATED;
        session.updatedAt = new Date();
        updateSessionStatus(sessionId, SessionStatus.TERMINATED);
        terminatedSessions.push(sessionId);
        continue;
      }

      // Reconnect PTY to tmux session
      const termSession = session as TerminalSession;
      const reconnected = await this.ptyManager.reconnect(sessionId, {
        shell: termSession.shell,
        cwd: termSession.cwd,
        cols: termSession.cols,
        rows: termSession.rows,
        projectId: termSession.projectId,
      });

      if (!reconnected) {
        terminatedSessions.push(sessionId);
        continue;
      }

      // Reactivate session
      session.status = SessionStatus.ACTIVE;
      session.updatedAt = new Date();
      session.lastActiveAt = new Date();

      // Create buffer if it doesn't exist
      if (!this.bufferManager.hasBuffer(sessionId)) {
        this.bufferManager.createBuffer(sessionId);
        // Try to load from disk
        await this.bufferManager.loadBuffer(sessionId);
      }

      // Get FULL buffer for replay (browser refresh creates new xterm.js instance)
      const buffer = this.bufferManager.getBufferSnapshot(sessionId, true);
      if (buffer && buffer.outputSinceDisconnect.length > 0) {
        buffers.push(buffer);
      }

      // Clear disconnect marker
      this.bufferManager.clearDisconnect(sessionId);

      // Track this client for this session
      this.trackClientSession(clientId, sessionId);

      // Update database
      try {
        updateSessionStatus(sessionId, SessionStatus.ACTIVE);
        updateSessionLastActive(sessionId);
      } catch (error) {
        logger.error({ sessionId, error }, 'Failed to update session in database');
      }

      // Include activity status in response
      statusChanges.push({
        sessionId,
        status: session.status,
        activityStatus: termSession.activityStatus,
      });

      activeSessions.push(sessionId);
      this.emit('session:reconnected', { sessionId, clientId });
      logger.debug({ sessionId, clientId }, 'Session reconnected');
    }

    logger.info(
      {
        clientId,
        activeSessions: activeSessions.length,
        terminatedSessions: terminatedSessions.length,
        buffersToReplay: buffers.length,
      },
      'Client reconnection complete'
    );

    return { activeSessions, terminatedSessions, buffers, statusChanges };
  }

  /**
   * Write to terminal
   */
  writeToTerminal(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }
    if (session.status === SessionStatus.TERMINATED) {
      throw new SessionTerminatedError(sessionId);
    }

    // Check if PTY exists and is running
    if (!this.ptyManager.isRunning(sessionId)) {
      // Session exists but PTY doesn't - likely server restarted
      // Mark session as disconnected so client knows to reconnect
      if (session.status === SessionStatus.ACTIVE) {
        session.status = SessionStatus.DISCONNECTED;
        session.updatedAt = new Date();
        this.emit('session:disconnected', { sessionId });
      }
      throw new PTYNotFoundError(sessionId, 'PTY not running - reconnect required');
    }

    const success = this.ptyManager.write(sessionId, data);
    if (!success) {
      throw new PTYNotFoundError(sessionId, 'Failed to write to PTY');
    }

    session.lastActiveAt = new Date();

    // Update tmux activity
    this.tmuxManager.updateLastActive(sessionId);
  }

  /**
   * Resize terminal
   */
  resizeTerminal(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId) as TerminalSession | undefined;
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }

    const resized = this.ptyManager.resize(sessionId, cols, rows);
    if (!resized) {
      // PTY doesn't exist - check if tmux session is still alive
      // If so, mark as disconnected so client can reconnect
      this.tmuxManager.sessionExists(sessionId).then((hasTmux) => {
        if (hasTmux && session.status !== SessionStatus.DISCONNECTED) {
          session.status = SessionStatus.DISCONNECTED;
          session.updatedAt = new Date();
          updateSessionStatus(sessionId, SessionStatus.DISCONNECTED);
          this.emit('session:disconnected', { sessionId });
        } else if (!hasTmux && session.status !== SessionStatus.TERMINATED) {
          session.status = SessionStatus.TERMINATED;
          session.updatedAt = new Date();
          updateSessionStatus(sessionId, SessionStatus.TERMINATED);
          this.emit('session:terminated', { sessionId });
        }
      });
      return;
    }

    session.cols = cols;
    session.rows = rows;
    session.updatedAt = new Date();
  }

  /**
   * Terminate session (user requested) - kills both PTY and tmux
   */
  async terminateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    logger.info({ sessionId }, 'Terminating session');

    // Terminate PTY and tmux session
    await this.ptyManager.terminate(sessionId);

    // Cleanup buffer
    this.bufferManager.deleteBuffer(sessionId);

    // Cleanup status detector
    this.statusDetector.clearSession(sessionId);

    // Update session
    session.status = SessionStatus.TERMINATED;
    session.updatedAt = new Date();

    // Update database
    try {
      updateSessionStatus(sessionId, SessionStatus.TERMINATED);
      updateSessionTmuxName(sessionId, null);
    } catch (error) {
      logger.error({ sessionId, error }, 'Failed to update session status in database');
    }

    // Cleanup client tracking
    const clientId = this.sessionClients.get(sessionId);
    if (clientId) {
      this.clientSessions.get(clientId)?.delete(sessionId);
      this.sessionClients.delete(sessionId);
    }

    this.emit('session:terminated', { sessionId });
  }

  /**
   * Terminate all sessions in a project
   */
  async terminateProjectSessions(projectId: string): Promise<void> {
    const sessions = this.getSessionsByProject(projectId);
    for (const session of sessions) {
      await this.terminateSession(session.id);
    }
    logger.info({ projectId, count: sessions.length }, 'Terminated all project sessions');
  }

  /**
   * Get all active session IDs
   */
  getActiveSessionIds(): string[] {
    return Array.from(this.sessions.values())
      .filter((s) => s.status !== SessionStatus.TERMINATED)
      .map((s) => s.id);
  }

  /**
   * Persist all sessions for graceful shutdown
   */
  async persistAllSessions(): Promise<void> {
    await this.bufferManager.flush();
    logger.info('Persisted all sessions');
  }

  /**
   * Update session activity status
   */
  private updateSessionActivityStatus(
    sessionId: string,
    status: TerminalActivityStatus
  ): void {
    const session = this.sessions.get(sessionId) as TerminalSession | undefined;
    if (session && session.activityStatus !== status) {
      session.activityStatus = status;
      session.updatedAt = new Date();
    }
  }

  /**
   * Handle PTY exit (not the same as session termination)
   * This is now properly async to ensure DB updates complete before returning
   */
  private async handlePtyExitAsync(sessionId: string, exitCode: number): Promise<void> {
    const session = this.sessions.get(sessionId) as TerminalSession | undefined;
    if (!session) {
      logger.warn({ sessionId, exitCode }, '⚠️ PTY_EXIT: Session not found in memory');
      return;
    }

    logger.info({
      sessionId,
      exitCode,
      previousStatus: session.status,
      tmuxBacked: this.ptyManager.isTmuxBacked(sessionId),
    }, '🔵 PTY_EXIT_START: PTY process exited');

    // If this is a tmux-backed session, the tmux session might still be alive
    // Only mark as terminated if tmux session is also gone
    try {
      const hasTmux = await this.tmuxManager.sessionExists(sessionId);

      if (!hasTmux) {
        logger.info({ sessionId, exitCode }, '🔴 PTY_EXIT_TERMINATED: Tmux session not found - marking as terminated');

        session.status = SessionStatus.TERMINATED;
        session.exitCode = exitCode;
        session.updatedAt = new Date();

        // Cleanup
        this.statusDetector.clearSession(sessionId);

        // Update database - ensure this completes
        try {
          updateSessionStatus(sessionId, SessionStatus.TERMINATED);
          logger.info({ sessionId }, '🔵 PTY_EXIT_DB: Database status updated to TERMINATED');
        } catch (error) {
          logger.error({ sessionId, error }, '🔴 PTY_EXIT_DB_FAILED: Failed to update session status in database');
        }

        this.emit('session:terminated', { sessionId, exitCode });
      } else {
        logger.info({ sessionId }, '🟡 PTY_EXIT_DISCONNECTED: Tmux still alive - marking as disconnected');

        // PTY exited but tmux is still alive - mark as disconnected
        session.status = SessionStatus.DISCONNECTED;
        session.updatedAt = new Date();

        try {
          updateSessionStatus(sessionId, SessionStatus.DISCONNECTED);
          logger.info({ sessionId }, '🔵 PTY_EXIT_DB: Database status updated to DISCONNECTED');
        } catch (error) {
          logger.error({ sessionId, error }, '🔴 PTY_EXIT_DB_FAILED: Failed to update session status in database');
        }

        this.emit('session:disconnected', { sessionId });
      }
    } catch (error) {
      logger.error({ sessionId, exitCode, error }, '🔴 PTY_EXIT_ERROR: Failed to check tmux status');
    }
  }

  /**
   * Handle PTY exit - wrapper that doesn't block the event loop
   */
  private handlePtyExit(sessionId: string, exitCode: number): void {
    // Run async handler but don't block - log any errors
    this.handlePtyExitAsync(sessionId, exitCode).catch((error) => {
      logger.error({ sessionId, exitCode, error }, '🔴 PTY_EXIT_UNHANDLED: Unhandled error in PTY exit handler');
    });
  }

  /**
   * Track client-session relationship
   */
  private trackClientSession(clientId: string, sessionId: string): void {
    if (!this.clientSessions.has(clientId)) {
      this.clientSessions.set(clientId, new Set());
    }
    this.clientSessions.get(clientId)!.add(sessionId);
    this.sessionClients.set(sessionId, clientId);
  }

  /**
   * Cleanup stale disconnected sessions
   */
  private cleanupStaleSessions(): void {
    const timeout = this.options.pausedSessionTimeoutMs ?? 3600000; // 1 hour default
    const now = Date.now();

    for (const [sessionId, session] of this.sessions) {
      if (session.status === SessionStatus.DISCONNECTED || session.status === SessionStatus.PAUSED) {
        const idleTime = now - session.updatedAt.getTime();
        if (idleTime > timeout) {
          logger.info(
            { sessionId, idleDurationMs: idleTime },
            'Cleaning up stale session'
          );
          this.terminateSession(sessionId);
        }
      }
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Kill PTYs but preserve tmux sessions
    this.ptyManager.destroy();
    this.bufferManager.destroy();
    this.statusDetector.destroy();
    await this.tmuxManager.shutdown();

    this.sessions.clear();
    this.clientSessions.clear();
    this.sessionClients.clear();
    this.removeAllListeners();

    logger.info('Session manager destroyed');
  }
}
