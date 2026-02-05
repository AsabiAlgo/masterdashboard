/**
 * Status Detector
 *
 * Detects terminal activity status from output patterns.
 * Emits status change events for UI updates.
 */

import { EventEmitter } from 'events';
import {
  TerminalActivityStatus,
  DEFAULT_STATUS_PATTERNS,
  DEFAULT_STATUS_DETECTOR_CONFIG,
  compileStatusPattern,
  stripAnsi,
  type StatusPattern,
  type CompiledStatusPattern,
  type StatusDetectorConfig,
} from '@masterdashboard/shared';
import { createChildLogger } from '../utils/logger.js';
import type { StatusChangeEventInternal } from './types.js';

const logger = createChildLogger('status-detector');

export class StatusDetector extends EventEmitter {
  private patterns: CompiledStatusPattern[];
  private sessionOutputBuffers = new Map<string, string>();
  private sessionStatuses = new Map<string, TerminalActivityStatus>();
  private config: Required<StatusDetectorConfig>;

  constructor(config: StatusDetectorConfig = {}) {
    super();

    this.config = {
      customPatterns: config.customPatterns ?? [],
      disabledPatterns: config.disabledPatterns ?? [],
      debounceMs: config.debounceMs ?? DEFAULT_STATUS_DETECTOR_CONFIG.debounceMs ?? 100,
      lookbackLines: config.lookbackLines ?? DEFAULT_STATUS_DETECTOR_CONFIG.lookbackLines ?? 5,
    };

    // Compile default patterns
    const defaultPatterns = DEFAULT_STATUS_PATTERNS.filter(
      (p) => p.enabled !== false && !this.config.disabledPatterns.includes(p.id)
    );

    // Compile and sort patterns by priority (higher first)
    this.patterns = [...defaultPatterns, ...this.config.customPatterns]
      .map(compileStatusPattern)
      .sort((a, b) => b.priority - a.priority);

    logger.info({ patternCount: this.patterns.length }, 'Status detector initialized');
  }

  /**
   * Add a custom pattern at runtime
   */
  addPattern(pattern: StatusPattern): void {
    const compiled = compileStatusPattern(pattern);

    // Remove existing pattern with same ID
    this.patterns = this.patterns.filter((p) => p.id !== pattern.id);

    // Add and re-sort
    this.patterns.push(compiled);
    this.patterns.sort((a, b) => b.priority - a.priority);

    logger.debug({ patternId: pattern.id, patternName: pattern.name }, 'Added pattern');
    this.emit('pattern:added', pattern);
  }

  /**
   * Remove a pattern by ID
   */
  removePattern(patternId: string): boolean {
    const initialLength = this.patterns.length;
    this.patterns = this.patterns.filter((p) => p.id !== patternId);

    const removed = this.patterns.length < initialLength;
    if (removed) {
      logger.debug({ patternId }, 'Removed pattern');
      this.emit('pattern:removed', patternId);
    }

    return removed;
  }

  /**
   * Detect status from terminal output
   * Returns new status if changed, null otherwise
   */
  detect(sessionId: string, output: string): TerminalActivityStatus | null {
    // Strip ANSI codes for pattern matching
    const cleanOutput = stripAnsi(output);

    // Append to recent output buffer (keep last N chars for pattern matching)
    const existing = this.sessionOutputBuffers.get(sessionId) ?? '';
    const bufferSize = 2000; // Keep last 2000 chars
    const combined = (existing + cleanOutput).slice(-bufferSize);
    this.sessionOutputBuffers.set(sessionId, combined);

    // Get last N lines for pattern matching
    const lastLines = combined.split('\n').slice(-this.config.lookbackLines).join('\n');

    // Check patterns in priority order
    for (const pattern of this.patterns) {
      if (pattern.regex.test(lastLines)) {
        const currentStatus = this.sessionStatuses.get(sessionId);

        if (currentStatus !== pattern.status) {
          const previousStatus = currentStatus ?? TerminalActivityStatus.IDLE;
          this.sessionStatuses.set(sessionId, pattern.status);

          const event: StatusChangeEventInternal = {
            sessionId,
            previousStatus,
            newStatus: pattern.status,
            matchedPattern: pattern.name,
            timestamp: new Date(),
          };

          logger.debug(
            {
              sessionId,
              previousStatus,
              newStatus: pattern.status,
              matchedPattern: pattern.name,
            },
            'Status change detected'
          );

          this.emit('status:change', event);
          return pattern.status;
        }

        return null; // Status unchanged, pattern matched
      }
    }

    // If we have output but no pattern matched, check for generic working state
    const currentStatus = this.sessionStatuses.get(sessionId);
    const trimmedOutput = cleanOutput.trim();

    // If there's output and we're currently waiting, switch to working
    if (trimmedOutput.length > 0 && currentStatus === TerminalActivityStatus.WAITING) {
      this.sessionStatuses.set(sessionId, TerminalActivityStatus.WORKING);

      const event: StatusChangeEventInternal = {
        sessionId,
        previousStatus: currentStatus,
        newStatus: TerminalActivityStatus.WORKING,
        timestamp: new Date(),
      };

      this.emit('status:change', event);
      return TerminalActivityStatus.WORKING;
    }

    return null;
  }

  /**
   * Force set status for a session (used for explicit state changes)
   */
  setStatus(sessionId: string, status: TerminalActivityStatus): void {
    const previousStatus = this.sessionStatuses.get(sessionId) ?? TerminalActivityStatus.IDLE;

    if (previousStatus === status) {
      return;
    }

    this.sessionStatuses.set(sessionId, status);

    const event: StatusChangeEventInternal = {
      sessionId,
      previousStatus,
      newStatus: status,
      timestamp: new Date(),
    };

    this.emit('status:change', event);
  }

  /**
   * Get current status for a session
   */
  getStatus(sessionId: string): TerminalActivityStatus {
    return this.sessionStatuses.get(sessionId) ?? TerminalActivityStatus.IDLE;
  }

  /**
   * Get all registered patterns
   */
  getPatterns(): StatusPattern[] {
    return this.patterns.map(({ regex, ...pattern }) => pattern);
  }

  /**
   * Clear session data (when session terminates)
   */
  clearSession(sessionId: string): void {
    this.sessionOutputBuffers.delete(sessionId);
    this.sessionStatuses.delete(sessionId);
    logger.debug({ sessionId }, 'Cleared session data');
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.sessionOutputBuffers.clear();
    this.sessionStatuses.clear();
    this.removeAllListeners();
    logger.info('Status detector destroyed');
  }
}
