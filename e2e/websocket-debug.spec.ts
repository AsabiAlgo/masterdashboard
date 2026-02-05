/**
 * WebSocket Debug Test
 *
 * Direct test of WebSocket SESSION_CREATE flow
 */

import { test, expect } from '@playwright/test';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:4050';

test.describe('WebSocket Debug', () => {
  test('Direct Socket.IO SESSION_CREATE', async () => {
    // Create a direct Socket.IO connection
    const socket = io(API_URL, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 5000,
    });

    const events: { event: string; data: unknown }[] = [];

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);

      socket.on('connect', () => {
        console.log('Socket connected, id:', socket.id);
        clearTimeout(timeout);
        resolve();
      });

      socket.on('connect_error', (err) => {
        console.log('Connection error:', err.message);
        clearTimeout(timeout);
        reject(err);
      });
    });

    expect(socket.connected).toBe(true);
    console.log('Socket is connected');

    // Listen for 'connected' acknowledgment
    socket.on('connected', (data) => {
      console.log('Received connected event:', data);
      events.push({ event: 'connected', data });
    });

    // Listen for SESSION_CREATED
    socket.on('session:created', (data) => {
      console.log('Received session:created:', data);
      events.push({ event: 'session:created', data });
    });

    // Listen for SESSION_ERROR
    socket.on('session:error', (data) => {
      console.log('Received session:error:', data);
      events.push({ event: 'session:error', data });
    });

    // Listen for generic error (sendError uses 'error' event)
    socket.on('error', (data) => {
      console.log('Received error:', data);
      events.push({ event: 'error', data });
    });

    // Listen for all events to debug
    socket.onAny((event, ...args) => {
      console.log('Received event:', event, JSON.stringify(args).slice(0, 200));
    });

    // Wait a moment for connected event
    await new Promise((r) => setTimeout(r, 500));

    // Send SESSION_CREATE
    console.log('Sending session:create');
    socket.emit('session:create', {
      type: 'terminal',
      projectId: 'default',
      config: {
        shell: 'bash',
        projectId: 'default',
        cols: 80,
        rows: 24,
      },
    });

    // Wait for session:created response
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (events.some((e) => e.event === 'session:created')) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 5000);
    });

    // Get the session ID
    const createdEvent = events.find((e) => e.event === 'session:created');
    const sessionId = (createdEvent?.data as { sessionId?: string })?.sessionId;
    console.log('Session ID:', sessionId);

    if (sessionId) {
      // Clear events to track only interaction events
      const interactionEvents: string[] = [];

      socket.on('terminal:output', (data: { sessionId: string; data: string }) => {
        if (data.sessionId === sessionId) {
          interactionEvents.push(data.data);
          console.log('Terminal output:', JSON.stringify(data.data).slice(0, 100));
        }
      });

      // Send a command to the terminal
      console.log('Sending input: echo HELLO_E2E_TEST');
      socket.emit('terminal:input', {
        sessionId,
        data: 'echo HELLO_E2E_TEST\n',
      });

      // Wait for output
      await new Promise((r) => setTimeout(r, 2000));

      // Check if we received the expected output
      const allOutput = interactionEvents.join('');
      console.log('All terminal output:', allOutput);

      const hasEchoCommand = allOutput.includes('echo HELLO_E2E_TEST');
      const hasEchoResult = allOutput.includes('HELLO_E2E_TEST');

      console.log('Has echo command in output:', hasEchoCommand);
      console.log('Has echo result in output:', hasEchoResult);

      // Terminate the session
      socket.emit('session:terminate', { sessionId });
      await new Promise((r) => setTimeout(r, 500));

      // Verify terminal interaction worked
      expect(hasEchoResult).toBe(true);
    }

    console.log('Events received:', events);

    // Check if we received a response
    const hasCreated = events.some((e) => e.event === 'session:created');
    const hasError = events.some((e) => e.event === 'session:error' || e.event === 'error');

    if (!hasCreated && !hasError) {
      console.log('No session:created or error received!');
      console.log('All events:', JSON.stringify(events, null, 2));
    }

    // Clean up
    socket.disconnect();

    // At least expect we got the connected acknowledgment
    const hasConnected = events.some((e) => e.event === 'connected');
    expect(hasConnected).toBe(true);

    // Expect session creation response
    expect(hasCreated || hasError).toBe(true);
  });
});
