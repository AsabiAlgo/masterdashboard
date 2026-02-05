/**
 * Reconnection E2E Test
 *
 * Tests terminal session reconnection and buffer replay
 */

import { test, expect } from '@playwright/test';
import { io, Socket } from 'socket.io-client';

const API_URL = 'http://localhost:4050';

test.describe('Terminal Reconnection', () => {
  test('Buffer is replayed on reconnection', async () => {
    // First connection - create session and send command
    const socket1 = io(API_URL, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 5000,
    });

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection 1 timeout')), 5000);
      socket1.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });
      socket1.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    // Wait for connected event
    const clientId1 = await new Promise<string>((resolve) => {
      socket1.on('connected', (data: { clientId: string }) => {
        resolve(data.clientId);
      });
    });

    console.log('First client connected:', clientId1);

    // Create session
    socket1.emit('session:create', {
      type: 'terminal',
      projectId: 'default',
      config: {
        shell: 'bash',
        projectId: 'default',
        cols: 80,
        rows: 24,
      },
    });

    // Wait for session:created
    const sessionId = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Session create timeout')), 5000);
      socket1.on('session:created', (data: { sessionId: string; type: string }) => {
        if (data.type === 'terminal') {
          clearTimeout(timeout);
          resolve(data.sessionId);
        }
      });
    });

    console.log('Session created:', sessionId);

    // Collect terminal output
    const outputs: string[] = [];
    socket1.on('terminal:output', (data: { sessionId: string; data: string }) => {
      if (data.sessionId === sessionId) {
        outputs.push(data.data);
      }
    });

    // Wait for prompt
    await new Promise((r) => setTimeout(r, 500));

    // Send a unique command
    const uniqueMarker = `TEST_MARKER_${Date.now()}`;
    socket1.emit('terminal:input', {
      sessionId,
      data: `echo ${uniqueMarker}\n`,
    });

    // Wait for command output
    await new Promise((r) => setTimeout(r, 1000));

    // Verify we received the output
    const allOutput = outputs.join('');
    console.log('Output from first connection:', allOutput.slice(0, 200));
    expect(allOutput).toContain(uniqueMarker);

    // Disconnect first client (simulating browser refresh)
    console.log('Disconnecting first client...');
    socket1.disconnect();

    // Wait a bit to ensure disconnect is processed
    await new Promise((r) => setTimeout(r, 500));

    // Create second connection (simulating new browser session)
    const socket2 = io(API_URL, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 5000,
    });

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection 2 timeout')), 5000);
      socket2.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });
      socket2.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    // Wait for connected event
    await new Promise<string>((resolve) => {
      socket2.on('connected', (data: { clientId: string }) => {
        console.log('Second client connected:', data.clientId);
        resolve(data.clientId);
      });
    });

    // Attempt to reconnect to the same session
    socket2.emit('terminal:reconnect', {
      sessionId,
    });

    // Wait for reconnect response
    const reconnectResponse = await new Promise<{
      sessionId: string;
      success: boolean;
      bufferedOutput?: string;
      error?: string;
    }>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Reconnect timeout')), 5000);
      socket2.on('terminal:reconnect:response', (data) => {
        console.log('Reconnect response received:', {
          sessionId: data.sessionId,
          success: data.success,
          hasBuffer: !!data.bufferedOutput,
          bufferLength: data.bufferedOutput?.length ?? 0,
        });
        clearTimeout(timeout);
        resolve(data);
      });
    });

    // Verify reconnection succeeded
    expect(reconnectResponse.success).toBe(true);
    expect(reconnectResponse.sessionId).toBe(sessionId);

    // Verify buffer contains the unique marker (full buffer replay)
    expect(reconnectResponse.bufferedOutput).toBeDefined();
    expect(reconnectResponse.bufferedOutput).toContain(uniqueMarker);

    console.log('Buffer replay verified - contains marker:', uniqueMarker);

    // Clean up
    socket2.emit('session:terminate', { sessionId });
    await new Promise((r) => setTimeout(r, 500));
    socket2.disconnect();

    console.log('Test completed successfully');
  });
});
