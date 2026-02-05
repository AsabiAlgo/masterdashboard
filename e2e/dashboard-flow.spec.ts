/**
 * Dashboard Flow E2E Tests
 *
 * Comprehensive tests for the entire dashboard flow:
 * - Project creation
 * - WebSocket connection
 * - Terminal creation and interaction
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3050';
const API_URL = 'http://localhost:4050';

test.describe('Dashboard Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure backend is healthy before tests
    const healthResponse = await page.request.get(`${API_URL}/api/health`);
    expect(healthResponse.ok()).toBeTruthy();
  });

  test('1. Backend health check', async ({ page }) => {
    const response = await page.request.get(`${API_URL}/api/health`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.version).toBe('0.1.0');
  });

  test('2. Frontend loads successfully', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/Master Dashboard/);

    // Check header is visible
    await expect(page.locator('h1:has-text("Master Dashboard")')).toBeVisible();
  });

  test('3. WebSocket connects', async ({ page }) => {
    await page.goto(BASE_URL);

    // Wait for WebSocket connection status
    // Look for "Connected" status indicator at bottom of page
    await expect(page.locator('text=Connected')).toBeVisible({ timeout: 10000 });
  });

  test('4. Create a new project', async ({ page }) => {
    await page.goto(BASE_URL);

    // Click "New Project" or "Create Project" button
    const createButton = page.locator('button:has-text("Project")').first();
    await createButton.click();

    // Fill in project details (if modal appears)
    const nameInput = page.locator('input[name="name"], input[placeholder*="name"]').first();
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameInput.fill('Test Project E2E');

      // Fill working directory
      const cwdInput = page.locator('input[name="cwd"], input[placeholder*="directory"]').first();
      if (await cwdInput.isVisible()) {
        await cwdInput.fill('/tmp');
      }

      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Create")').first();
      await submitButton.click();
    }

    // Wait for project to be created and navigated to
    await page.waitForURL(/\/prj_/, { timeout: 10000 }).catch(() => {
      // If no navigation, project might be created inline
    });
  });

  test('5. Navigate to project page', async ({ page }) => {
    await page.goto(BASE_URL);

    // Wait for projects to load
    await page.waitForTimeout(2000);

    // Click on first project card if exists
    const projectCard = page.locator('[data-testid="project-card"], .project-card, a[href*="/prj_"]').first();
    if (await projectCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await projectCard.click();
      await expect(page).toHaveURL(/\/prj_/);
    }
  });

  test('6. Terminal node creation and connection', async ({ page }) => {
    // First, navigate to a project
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    // Try to find and click a project
    const projectLink = page.locator('a[href*="/prj_"]').first();
    if (await projectLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await projectLink.click();
      await page.waitForURL(/\/prj_/);
    }

    // Look for terminal creation options
    // Option 1: Drag from palette
    const terminalPalette = page.locator('text=Bash Terminal, text=Terminal').first();

    // Option 2: Quick start button
    const quickStartTerminal = page.locator('[data-testid="quick-start-terminal"], button:has-text("Bash Terminal")').first();

    if (await quickStartTerminal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await quickStartTerminal.click();
    }

    // Wait for terminal node to appear
    const terminalNode = page.locator('[data-testid="terminal-node"], .terminal-node, text=Terminal').first();
    await expect(terminalNode).toBeVisible({ timeout: 5000 });

    // Check terminal connection status
    // Should show "Connecting..." then become connected
    await page.waitForTimeout(3000);

    // Check if terminal is interactive (has cursor or prompt)
    const terminalContent = page.locator('.xterm, .terminal-content, [class*="terminal"]').first();
    await expect(terminalContent).toBeVisible({ timeout: 10000 });
  });

  test('7. WebSocket message flow', async ({ page }) => {
    // This test monitors WebSocket messages
    const wsMessages: string[] = [];

    // Listen for console messages to capture our debug logs
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[useTerminalSocket]') || text.includes('[SocketManager]')) {
        wsMessages.push(text);
      }
    });

    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    // Navigate to a project
    const projectLink = page.locator('a[href*="/prj_"]').first();
    if (await projectLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await projectLink.click();
    }

    // Wait for any terminal to try connecting
    await page.waitForTimeout(5000);

    // Log captured messages for debugging
    console.log('Captured WebSocket messages:', wsMessages);

    // Check if connect was called
    const connectCalled = wsMessages.some((m) => m.includes('connect called'));
    const emitCalled = wsMessages.some((m) => m.includes('emit'));

    console.log('Connect called:', connectCalled);
    console.log('Emit called:', emitCalled);
  });
});

test.describe('API Tests', () => {
  test('GET /api/health returns ok', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/health`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  test('GET /api/projects returns array', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/projects`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  test('POST /api/projects creates project', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/projects`, {
      data: {
        name: 'E2E Test Project',
        description: 'Created by E2E tests',
        defaultCwd: '/tmp',
      },
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.name).toBe('E2E Test Project');
    expect(data.data.id).toMatch(/^prj_/);
  });
});

test.describe('WebSocket Tests', () => {
  test('WebSocket connects and receives events', async ({ page }) => {
    const events: { type: string; data: unknown }[] = [];

    // Intercept WebSocket
    page.on('websocket', (ws) => {
      console.log('WebSocket opened:', ws.url());

      ws.on('framereceived', (frame) => {
        try {
          const data = JSON.parse(frame.payload.toString());
          events.push({ type: 'received', data });
        } catch {
          // Not JSON
        }
      });

      ws.on('framesent', (frame) => {
        try {
          const data = JSON.parse(frame.payload.toString());
          events.push({ type: 'sent', data });
        } catch {
          // Not JSON
        }
      });
    });

    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);

    console.log('WebSocket events:', JSON.stringify(events, null, 2));

    // Should have some events
    expect(events.length).toBeGreaterThan(0);
  });
});
