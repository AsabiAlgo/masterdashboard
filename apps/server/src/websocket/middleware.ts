/**
 * WebSocket Middleware
 *
 * Validation and rate limiting for Socket.IO connections.
 */

import { Socket, Server as SocketIOServer } from 'socket.io';
import { RATE_LIMITED_EVENTS, type WSEventName } from '@masterdashboard/shared';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('ws-middleware');

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface ClientState {
  id: string;
  socket: Socket;
  rateLimits: Map<string, RateLimitEntry>;
  isAlive: boolean;
  lastPing: number;
}

const clients = new Map<string, ClientState>();
let ioInstance: SocketIOServer | null = null;

/**
 * Set the Socket.IO server instance for broadcasting
 */
export function setIO(io: SocketIOServer): void {
  ioInstance = io;
}

/**
 * Get the Socket.IO server instance
 */
export function getIO(): SocketIOServer | null {
  return ioInstance;
}

/**
 * Register a new client
 */
export function registerClient(socket: Socket): string {
  const clientId = socket.id;
  const state: ClientState = {
    id: clientId,
    socket,
    rateLimits: new Map(),
    isAlive: true,
    lastPing: Date.now(),
  };

  clients.set(clientId, state);
  logger.debug({ clientId }, 'Client registered');
  return clientId;
}

/**
 * Unregister a client
 */
export function unregisterClient(socket: Socket): string | null {
  const clientId = socket.id;
  const state = clients.get(clientId);
  if (state) {
    clients.delete(clientId);
    logger.debug({ clientId }, 'Client unregistered');
    return clientId;
  }
  return null;
}

/**
 * Get client state by socket
 */
export function getClientState(socket: Socket): ClientState | undefined {
  return clients.get(socket.id);
}

/**
 * Get client ID from socket
 */
export function getClientId(socket: Socket): string {
  return socket.id;
}

/**
 * Mark client as alive (ping/pong)
 */
export function markClientAlive(socket: Socket): void {
  const state = clients.get(socket.id);
  if (state) {
    state.isAlive = true;
    state.lastPing = Date.now();
  }
}

/**
 * Check rate limit for an event
 */
export function checkRateLimit(socket: Socket, event: WSEventName): boolean {
  const limit = RATE_LIMITED_EVENTS[event];
  if (!limit) {
    return true; // No rate limit for this event
  }

  const state = clients.get(socket.id);
  if (!state) {
    return false;
  }

  const now = Date.now();
  let entry = state.rateLimits.get(event);

  if (!entry || entry.resetAt <= now) {
    // Reset or create new entry
    entry = { count: 1, resetAt: now + 1000 }; // 1 second window
    state.rateLimits.set(event, entry);
    return true;
  }

  entry.count++;

  if (entry.count > limit) {
    logger.warn({ clientId: state.id, event, limit }, 'Rate limit exceeded');
    return false;
  }

  return true;
}

/**
 * Send a message to a client
 */
export function sendMessage(
  socket: Socket,
  event: string,
  payload: unknown,
  correlationId?: string
): boolean {
  try {
    socket.emit(event, {
      ...((typeof payload === 'object' && payload !== null) ? payload : { data: payload }),
      correlationId,
      timestamp: Date.now(),
    });
    return true;
  } catch (error) {
    logger.error({ event, error }, 'Failed to send message');
    return false;
  }
}

/**
 * Send an error message to a client
 */
export function sendError(
  socket: Socket,
  code: string,
  message: string,
  correlationId?: string
): void {
  socket.emit('error', {
    code,
    message,
    correlationId,
    timestamp: Date.now(),
  });
}

/**
 * Broadcast a message to all connected clients
 */
export function broadcast(event: string, payload: unknown): void {
  if (ioInstance) {
    ioInstance.emit(event, {
      ...((typeof payload === 'object' && payload !== null) ? payload : { data: payload }),
      timestamp: Date.now(),
    });
  }
}

/**
 * Broadcast to clients subscribed to a specific session
 */
export function broadcastToSession(
  sessionId: string,
  event: string,
  payload: unknown,
  sessionClientMap: Map<string, string>
): void {
  const clientId = sessionClientMap.get(sessionId);
  if (!clientId) {
    return;
  }

  const state = clients.get(clientId);
  if (state) {
    sendMessage(state.socket, event, payload);
  }
}

/**
 * Get socket by client ID
 */
export function getSocketByClientId(clientId: string): Socket | null {
  const state = clients.get(clientId);
  return state?.socket ?? null;
}

/**
 * Get all connected client IDs
 */
export function getConnectedClientIds(): string[] {
  return Array.from(clients.keys());
}

/**
 * Get connected client count
 */
export function getConnectedClientCount(): number {
  return clients.size;
}
