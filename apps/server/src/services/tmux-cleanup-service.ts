/**
 * Tmux Cleanup Service
 *
 * Manages tmux session lifecycle to prevent runaway sessions:
 * - Cleans up orphaned sessions on startup
 * - Enforces idle timeout (kills inactive sessions)
 * - Enforces maximum session limit
 */

import { EventEmitter } from 'events';
import { createChildLogger } from '../utils/logger.js';
import type { TmuxManager } from '../managers/tmux-manager.js';
import type { SessionManager } from '../managers/session-manager.js';
import { cleanupStaleDisconnectedSessions } from '../persistence/database.js';

const logger = createChildLogger('tmux-cleanup');

export interface CleanupConfig {
  /** Idle timeout before killing session (default: 48 hours) */
  idleTimeoutMs: number;
  /** Maximum number of concurrent sessions (default: 400) */
  maxSessions: number;
  /** Cleanup check interval (default: 5 minutes) */
  checkIntervalMs: number;
  /** Kill orphaned sessions on startup (default: true) */
  cleanOrphansOnStartup: boolean;
}

const DEFAULT_CLEANUP_CONFIG: CleanupConfig = {
  idleTimeoutMs: 48 * 60 * 60 * 1000, // 48 hours
  maxSessions: 400,
  checkIntervalMs: 5 * 60 * 1000, // 5 minutes
  cleanOrphansOnStartup: true,
};

export interface CleanupStats {
  orphansCleaned: number;
  idleCleaned: number;
  maxSessionsCleaned: number;
  lastCleanupAt: Date | null;
}

export class TmuxCleanupService extends EventEmitter {
  private config: CleanupConfig;
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private stats: CleanupStats = {
    orphansCleaned: 0,
    idleCleaned: 0,
    maxSessionsCleaned: 0,
    lastCleanupAt: null,
  };

  constructor(
    private tmuxManager: TmuxManager,
    private sessionManager: SessionManager,
    config: Partial<CleanupConfig> = {}
  ) {
    super();
    this.config = { ...DEFAULT_CLEANUP_CONFIG, ...config };
  }

  /**
   * Start the cleanup service
   */
  async start(): Promise<void> {
    if (!this.tmuxManager.isAvailable()) {
      logger.info('Tmux not available, cleanup service disabled');
      return;
    }

    // Clean orphans on startup
    if (this.config.cleanOrphansOnStartup) {
      await this.cleanOrphanedSessions();
    }

    // Start periodic cleanup
    this.checkInterval = setInterval(
      () => this.runCleanup(),
      this.config.checkIntervalMs
    );

    logger.info(
      {
        idleTimeoutMs: this.config.idleTimeoutMs,
        maxSessions: this.config.maxSessions,
        checkIntervalMs: this.config.checkIntervalMs,
      },
      'Cleanup service started'
    );
  }

  /**
   * Stop the cleanup service
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    logger.info('Cleanup service stopped');
  }

  /**
   * Get cleanup statistics
   */
  getStats(): CleanupStats {
    return { ...this.stats };
  }

  /**
   * Check if a new session can be created (under max limit)
   */
  async canCreateSession(): Promise<boolean> {
    const sessions = await this.tmuxManager.listSessions();
    return sessions.length < this.config.maxSessions;
  }

  /**
   * Get current session count
   */
  async getSessionCount(): Promise<number> {
    const sessions = await this.tmuxManager.listSessions();
    return sessions.length;
  }

  /**
   * Update activity for a session (call when session receives input)
   */
  updateSessionActivity(sessionId: string): void {
    this.tmuxManager.updateLastActive(sessionId);
  }

  /**
   * Run a full cleanup cycle
   */
  private async runCleanup(): Promise<void> {
    try {
      logger.info('🧹 CLEANUP_CYCLE_START: Starting cleanup cycle');

      await this.cleanIdleSessions();
      await this.enforceMaxSessions();

      // Also clean stale sessions from database
      const dbCleaned = cleanupStaleDisconnectedSessions(this.config.idleTimeoutMs);
      if (dbCleaned > 0) {
        logger.info({ count: dbCleaned }, '🧹 CLEANUP_DB: Cleaned stale sessions from database');
      }

      this.stats.lastCleanupAt = new Date();
      logger.info('🧹 CLEANUP_CYCLE_END: Cleanup cycle complete');
    } catch (error) {
      logger.error({ error }, '🔴 CLEANUP_CYCLE_ERROR: Cleanup cycle failed');
    }
  }

  /**
   * Clean orphaned tmux sessions (no corresponding database entry)
   * IMPORTANT: Check DATABASE, not just memory - sessions may not be loaded into memory
   */
  private async cleanOrphanedSessions(): Promise<void> {
    const tmuxSessions = await this.tmuxManager.listSessions();
    logger.info({ count: tmuxSessions.length }, '🧹 CLEANUP_ORPHAN_CHECK: Checking for orphaned tmux sessions');

    for (const session of tmuxSessions) {
      // Check MEMORY first
      const memorySession = this.sessionManager.getSession(session.sessionId);

      if (!memorySession) {
        // Not in memory - but might be in database! Check DB before killing
        // The session manager should have loaded all active sessions on startup
        // If it's not in memory, it's either orphaned OR there's a bug in session recovery
        logger.warn(
          {
            sessionId: session.sessionId,
            tmuxName: session.tmuxName,
            createdAt: session.createdAt,
            lastActiveAt: session.lastActiveAt,
          },
          '⚠️ CLEANUP_ORPHAN_FOUND: Tmux session not found in memory - checking if truly orphaned'
        );

        // Give the session manager a chance to have it (might be loading)
        // Don't kill immediately - log for debugging
        logger.info(
          { sessionId: session.sessionId },
          '🧹 CLEANUP_ORPHAN_KILL: Killing orphaned tmux session (no memory entry)'
        );
        await this.tmuxManager.killSession(session.sessionId);
        this.stats.orphansCleaned++;
        this.emit('orphanCleaned', { sessionId: session.sessionId });
      }
    }

    if (this.stats.orphansCleaned > 0) {
      logger.info(
        { count: this.stats.orphansCleaned },
        '🧹 CLEANUP_ORPHAN_DONE: Cleaned orphaned sessions'
      );
    }
  }

  /**
   * Clean idle sessions that exceed the timeout
   */
  private async cleanIdleSessions(): Promise<void> {
    const now = Date.now();
    const tmuxSessions = await this.tmuxManager.listSessions();

    logger.debug({ count: tmuxSessions.length, idleTimeoutMs: this.config.idleTimeoutMs }, '🧹 CLEANUP_IDLE_CHECK: Checking for idle sessions');

    for (const session of tmuxSessions) {
      const idleTime = now - session.lastActiveAt.getTime();

      if (idleTime > this.config.idleTimeoutMs) {
        logger.info(
          {
            sessionId: session.sessionId,
            idleMinutes: Math.floor(idleTime / 60000),
            idleHours: Math.floor(idleTime / 3600000),
            idleTimeoutHours: Math.floor(this.config.idleTimeoutMs / 3600000),
          },
          '🧹 CLEANUP_IDLE_KILL: Killing idle session (exceeded timeout)'
        );

        // Terminate through session manager to clean up everything
        await this.sessionManager.terminateSession(session.sessionId);
        this.stats.idleCleaned++;
        this.emit('idleCleaned', { sessionId: session.sessionId });
      } else {
        logger.debug({
          sessionId: session.sessionId,
          idleMinutes: Math.floor(idleTime / 60000),
        }, '🧹 CLEANUP_IDLE_OK: Session still within idle timeout');
      }
    }
  }

  /**
   * Enforce maximum session limit by killing oldest sessions
   */
  private async enforceMaxSessions(): Promise<void> {
    const tmuxSessions = await this.tmuxManager.listSessions();

    if (tmuxSessions.length <= this.config.maxSessions) {
      return;
    }

    // Sort by last active time (oldest first)
    const sorted = [...tmuxSessions].sort(
      (a, b) => a.lastActiveAt.getTime() - b.lastActiveAt.getTime()
    );

    // Kill oldest sessions until under limit
    const toKill = sorted.slice(0, tmuxSessions.length - this.config.maxSessions);

    for (const session of toKill) {
      logger.info(
        { sessionId: session.sessionId },
        'Killing session (max sessions exceeded)'
      );
      await this.sessionManager.terminateSession(session.sessionId);
      this.stats.maxSessionsCleaned++;
      this.emit('maxSessionsCleaned', { sessionId: session.sessionId });
    }

    if (toKill.length > 0) {
      logger.info(
        { count: toKill.length, maxSessions: this.config.maxSessions },
        'Enforced max sessions limit'
      );
    }
  }
}
