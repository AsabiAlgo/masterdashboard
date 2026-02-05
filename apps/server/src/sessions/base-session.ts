/**
 * Base Session Class
 *
 * Abstract base class for all session types.
 */

import { EventEmitter } from 'events';
import {
  SessionType,
  SessionStatus,
  type BaseSession as BaseSessionInterface,
} from '@masterdashboard/shared';

export abstract class BaseSession extends EventEmitter implements BaseSessionInterface {
  public readonly id: string;
  public readonly type: SessionType;
  public status: SessionStatus;
  public readonly projectId: string;
  public readonly createdAt: Date;
  public updatedAt: Date;
  public lastActiveAt: Date;
  public metadata?: Record<string, unknown>;

  constructor(
    id: string,
    type: SessionType,
    projectId: string,
    metadata?: Record<string, unknown>
  ) {
    super();
    this.id = id;
    this.type = type;
    this.status = SessionStatus.CREATING;
    this.projectId = projectId;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.lastActiveAt = new Date();
    this.metadata = metadata;
  }

  /**
   * Update the last active timestamp
   */
  touch(): void {
    this.lastActiveAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Set session status
   */
  setStatus(status: SessionStatus): void {
    const previousStatus = this.status;
    this.status = status;
    this.updatedAt = new Date();
    this.emit('status:change', { previousStatus, newStatus: status });
  }

  /**
   * Check if session is active
   */
  isActive(): boolean {
    return this.status === SessionStatus.ACTIVE;
  }

  /**
   * Check if session is paused
   */
  isPaused(): boolean {
    return this.status === SessionStatus.PAUSED;
  }

  /**
   * Check if session is terminated
   */
  isTerminated(): boolean {
    return this.status === SessionStatus.TERMINATED;
  }

  /**
   * Serialize to plain object
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      type: this.type,
      status: this.status,
      projectId: this.projectId,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      lastActiveAt: this.lastActiveAt.toISOString(),
      metadata: this.metadata,
    };
  }

  /**
   * Abstract method to destroy the session
   */
  abstract destroy(): Promise<void>;
}
