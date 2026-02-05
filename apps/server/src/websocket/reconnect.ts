/**
 * WebSocket Reconnection Handler
 *
 * Handles client reconnection and buffer replay.
 */

import { Socket } from 'socket.io';
import { WS_EVENTS, type ClientReconnectPayload } from '@masterdashboard/shared';
import { SessionManager } from '../managers/session-manager.js';
import { createChildLogger } from '../utils/logger.js';
import { sendMessage } from './middleware.js';

const logger = createChildLogger('ws-reconnect');

/**
 * Handle client reconnection
 */
export async function handleReconnect(
  socket: Socket,
  clientId: string,
  payload: unknown,
  sessionManager: SessionManager,
  correlationId?: string
): Promise<void> {
  const data = payload as Partial<ClientReconnectPayload>;

  if (!data.projectId || !Array.isArray(data.sessionIds)) {
    logger.warn({ clientId }, 'Invalid reconnect payload');
    sendMessage(
      socket,
      WS_EVENTS.RECONNECT,
      {
        error: 'Invalid payload: projectId and sessionIds required',
        activeSessions: [],
        terminatedSessions: [],
        statusChanges: [],
        buffers: [],
      },
      correlationId
    );
    return;
  }

  logger.info(
    { clientId, projectId: data.projectId, sessionIds: data.sessionIds },
    'Processing reconnection'
  );

  try {
    const result = await sessionManager.handleClientReconnect(clientId, data.sessionIds);

    // Send reconnection response
    sendMessage(
      socket,
      WS_EVENTS.RECONNECT,
      {
        activeSessions: result.activeSessions,
        terminatedSessions: result.terminatedSessions,
        statusChanges: result.statusChanges,
        buffers: result.buffers.map((b) => ({
          sessionId: b.sessionId,
          outputSinceDisconnect: b.outputSinceDisconnect,
          disconnectTime: b.disconnectTime.toISOString(),
          reconnectTime: b.reconnectTime.toISOString(),
        })),
      },
      correlationId
    );

    // Send buffered output for each active session as separate messages
    // This allows for progressive rendering on the client
    for (const buffer of result.buffers) {
      if (buffer.outputSinceDisconnect.length > 0) {
        sendMessage(socket, WS_EVENTS.TERMINAL_BUFFER, {
          sessionId: buffer.sessionId,
          data: buffer.outputSinceDisconnect,
          isReplay: true,
        });
      }
    }

    logger.info(
      {
        clientId,
        activeSessions: result.activeSessions.length,
        terminatedSessions: result.terminatedSessions.length,
        buffersReplayed: result.buffers.filter((b) => b.outputSinceDisconnect.length > 0).length,
      },
      'Reconnection complete'
    );
  } catch (error) {
    logger.error({ clientId, error }, 'Reconnection failed');
    sendMessage(
      socket,
      WS_EVENTS.RECONNECT,
      {
        error: 'Reconnection failed',
        activeSessions: [],
        terminatedSessions: data.sessionIds,
        statusChanges: [],
        buffers: [],
      },
      correlationId
    );
  }
}

/**
 * Handle single terminal reconnection
 */
export async function handleTerminalReconnect(
  socket: Socket,
  clientId: string,
  sessionId: string,
  sessionManager: SessionManager,
  correlationId?: string
): Promise<void> {
  logger.info({ clientId, sessionId }, 'Processing terminal reconnection');

  try {
    const result = await sessionManager.handleClientReconnect(clientId, [sessionId]);

    const isActive = result.activeSessions.includes(sessionId);
    const buffer = result.buffers.find((b) => b.sessionId === sessionId);
    const statusChange = result.statusChanges.find((s) => s.sessionId === sessionId);

    logger.info({
      sessionId,
      isActive,
      hasBuffer: !!buffer,
      bufferLength: buffer?.outputSinceDisconnect?.length ?? 0,
    }, 'Sending reconnect response');

    sendMessage(
      socket,
      WS_EVENTS.TERMINAL_RECONNECT_RESPONSE,
      {
        sessionId,
        success: isActive,
        bufferedOutput: buffer?.outputSinceDisconnect,
        currentStatus: statusChange?.activityStatus,
        error: isActive ? undefined : 'Session not found or terminated',
      },
      correlationId
    );

    if (isActive && buffer && buffer.outputSinceDisconnect.length > 0) {
      // Send buffer replay
      sendMessage(socket, WS_EVENTS.TERMINAL_BUFFER, {
        sessionId,
        data: buffer.outputSinceDisconnect,
        isReplay: true,
      });
    }
  } catch (error) {
    logger.error({ clientId, sessionId, error }, 'Terminal reconnection failed');
    sendMessage(
      socket,
      WS_EVENTS.TERMINAL_RECONNECT_RESPONSE,
      {
        sessionId,
        success: false,
        error: 'Reconnection failed',
      },
      correlationId
    );
  }
}
