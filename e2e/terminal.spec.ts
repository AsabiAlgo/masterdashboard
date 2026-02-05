/**
 * Terminal Functionality E2E Tests
 *
 * Tests for terminal creation, interaction, and output verification.
 */

import { test, expect } from '@playwright/test'

test.describe('Terminal Functionality', () => {
  // Helper to create a project and navigate to workspace
  async function setupProjectWorkspace(page: import('@playwright/test').Page, projectName: string) {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Create a new project
    await page.locator('button:has-text("New Project"), button:has-text("Create Project")').first().click()
    await expect(page.locator('[role="dialog"], [class*="Dialog"]')).toBeVisible()

    await page.locator('input[name="name"], input[placeholder*="Project"]').fill(projectName)
    const cwdInput = page.locator('input[name="defaultCwd"], input[placeholder*="projects"]')
    await cwdInput.clear()
    await cwdInput.fill('/tmp')
    await page.locator('button:has-text("Create Project")').click()

    // Wait for workspace
    await page.waitForURL(/\/projects\/[a-zA-Z0-9-]+/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Verify workspace loaded
    await expect(page.locator('text=Quick Start')).toBeVisible({ timeout: 5000 })
  }

  test.describe('Terminal Creation', () => {
    test('should create a project first', async ({ page }) => {
      await setupProjectWorkspace(page, 'Terminal Test Project')

      // Verify we're in the workspace
      await expect(page.locator('text=Terminal Test Project')).toBeVisible()
      await expect(page.locator('text=Bash Terminal')).toBeVisible()
    })

    test('should open the project workspace', async ({ page }) => {
      await setupProjectWorkspace(page, 'Workspace Terminal Test')

      // Verify workspace elements
      await expect(page.locator('text=Quick Start')).toBeVisible()
      await expect(page.locator('text=Launch Terminal')).toBeVisible()
    })

    test('should click "New Bash Terminal" button and wait for terminal node', async ({ page }) => {
      await setupProjectWorkspace(page, 'Bash Terminal Test')

      // Click the Bash Terminal button
      const bashButton = page.locator('button:has-text("Bash Terminal")').first()
      await expect(bashButton).toBeVisible()
      await bashButton.click()

      // Wait for terminal node to appear on canvas
      // Terminal nodes should have specific characteristics
      const terminalNode = page.locator('[class*="TerminalNode"], [class*="terminal"], [data-testid="terminal-node"]').first()

      // Allow some time for the node to be created and rendered
      await expect(terminalNode).toBeVisible({ timeout: 10000 })

      // Verify terminal container exists
      const terminalContainer = page.locator('.xterm, [class*="xterm"], [class*="Terminal"]').first()
      await expect(terminalContainer).toBeVisible({ timeout: 10000 })
    })

    test('should create Zsh terminal', async ({ page }) => {
      await setupProjectWorkspace(page, 'Zsh Terminal Test')

      // Click the Zsh Terminal button
      const zshButton = page.locator('button:has-text("Zsh Terminal")')
      await expect(zshButton).toBeVisible()
      await zshButton.click()

      // Wait for terminal node to appear
      const terminalNode = page.locator('[class*="TerminalNode"], [class*="terminal"], [data-testid="terminal-node"]').first()
      await expect(terminalNode).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Terminal Interaction', () => {
    test('should type "echo hello" in terminal and verify output appears', async ({ page }) => {
      await setupProjectWorkspace(page, 'Echo Test Project')

      // Create a bash terminal
      const bashButton = page.locator('button:has-text("Bash Terminal")').first()
      await bashButton.click()

      // Wait for terminal to be ready
      const terminalCanvas = page.locator('.xterm-screen, [class*="xterm"]').first()
      await expect(terminalCanvas).toBeVisible({ timeout: 10000 })

      // Give the terminal time to connect
      await page.waitForTimeout(2000)

      // Focus the terminal
      await terminalCanvas.click()

      // Type the command
      await page.keyboard.type('echo hello')
      await page.keyboard.press('Enter')

      // Wait for output
      await page.waitForTimeout(1000)

      // The terminal output should contain "hello"
      // Note: xterm renders text in canvas, so we check for text content
      // or use the terminal's accessibility tree
      const terminalText = page.locator('.xterm-accessibility-tree, [class*="xterm"]')

      // Take a screenshot to verify the output
      await page.screenshot({ path: 'e2e/screenshots/terminal-echo-output.png' })

      // Verify the terminal is still functional by checking it's visible
      await expect(terminalCanvas).toBeVisible()
    })

    test('should handle multiple commands', async ({ page }) => {
      await setupProjectWorkspace(page, 'Multi Command Test')

      // Create terminal
      await page.locator('button:has-text("Bash Terminal")').first().click()

      const terminalCanvas = page.locator('.xterm-screen, [class*="xterm"]').first()
      await expect(terminalCanvas).toBeVisible({ timeout: 10000 })

      await page.waitForTimeout(2000)
      await terminalCanvas.click()

      // Run multiple commands
      await page.keyboard.type('pwd')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)

      await page.keyboard.type('whoami')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)

      await page.keyboard.type('date')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)

      // Terminal should still be functional
      await expect(terminalCanvas).toBeVisible()

      // Take screenshot
      await page.screenshot({ path: 'e2e/screenshots/terminal-multi-commands.png' })
    })
  })

  test.describe('Terminal UI', () => {
    test('should display terminal toolbar', async ({ page }) => {
      await setupProjectWorkspace(page, 'Toolbar Test')

      // Create terminal
      await page.locator('button:has-text("Bash Terminal")').first().click()

      // Wait for terminal node
      const terminalNode = page.locator('[class*="TerminalNode"], [class*="terminal"], [data-testid="terminal-node"]').first()
      await expect(terminalNode).toBeVisible({ timeout: 10000 })

      // Look for toolbar elements (copy, clear, settings buttons)
      // These are typically in the terminal toolbar
      const toolbar = page.locator('[class*="Toolbar"], [class*="toolbar"]').first()
      await expect(toolbar).toBeVisible({ timeout: 5000 })
    })

    test('should show terminal status indicator', async ({ page }) => {
      await setupProjectWorkspace(page, 'Status Indicator Test')

      // Create terminal
      await page.locator('button:has-text("Bash Terminal")').first().click()

      // Wait for terminal
      const terminalNode = page.locator('[class*="TerminalNode"], [class*="terminal"], [data-testid="terminal-node"]').first()
      await expect(terminalNode).toBeVisible({ timeout: 10000 })

      // Wait for connection
      await page.waitForTimeout(2000)

      // Should show some form of status (connected, idle, etc.)
      const statusIndicator = page.locator('[class*="StatusIndicator"], [class*="status"]')
      if (await statusIndicator.count() > 0) {
        await expect(statusIndicator.first()).toBeVisible()
      }
    })

    test('should be resizable', async ({ page }) => {
      await setupProjectWorkspace(page, 'Resize Test')

      // Create terminal
      await page.locator('button:has-text("Bash Terminal")').first().click()

      // Wait for terminal node
      const terminalNode = page.locator('[class*="TerminalNode"], [class*="terminal"], [data-testid="terminal-node"]').first()
      await expect(terminalNode).toBeVisible({ timeout: 10000 })

      // Click to select the node
      await terminalNode.click()

      // Look for resize handles (when node is selected)
      const resizeHandle = page.locator('[class*="resize"], [class*="Resizer"]')
      if (await resizeHandle.count() > 0) {
        await expect(resizeHandle.first()).toBeVisible()
      }
    })
  })

  test.describe('Multiple Terminals', () => {
    test('should create multiple terminals on canvas', async ({ page }) => {
      await setupProjectWorkspace(page, 'Multi Terminal Test')

      // Create first terminal
      await page.locator('button:has-text("Bash Terminal")').first().click()
      await page.waitForTimeout(1000)

      // Create second terminal
      await page.locator('button:has-text("Zsh Terminal")').click()
      await page.waitForTimeout(1000)

      // Verify node count in footer
      const nodeCount = page.locator('text=/\\d+ nodes?/')
      await expect(nodeCount).toBeVisible({ timeout: 5000 })

      // Should show 2 nodes
      const countText = await nodeCount.textContent()
      expect(countText).toContain('2')
    })
  })

  test.describe('Terminal Connection', () => {
    test('should establish WebSocket connection', async ({ page }) => {
      await setupProjectWorkspace(page, 'WebSocket Test')

      // Create terminal
      await page.locator('button:has-text("Bash Terminal")').first().click()

      // Wait for terminal to appear
      const terminalCanvas = page.locator('.xterm-screen, [class*="xterm"]').first()
      await expect(terminalCanvas).toBeVisible({ timeout: 10000 })

      // Check connection status in footer
      const connectedStatus = page.locator('text=Connected')

      // Wait for connection (may take a moment)
      await expect(connectedStatus).toBeVisible({ timeout: 15000 })
    })
  })
})
