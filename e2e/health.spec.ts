/**
 * Health Check E2E Tests
 *
 * Basic health checks for the Master Dashboard application.
 * Tests homepage accessibility and API health endpoints.
 */

import { test, expect } from '@playwright/test'

const API_URL = process.env.API_URL || 'http://localhost:4050'

test.describe('Health Checks', () => {
  test.describe('Homepage', () => {
    test('should load the homepage successfully', async ({ page }) => {
      // Navigate to homepage
      await page.goto('/')

      // Wait for page to load
      await page.waitForLoadState('networkidle')

      // Verify page title contains Master Dashboard
      await expect(page).toHaveTitle(/Master Dashboard/i)

      // Verify main header is visible
      const header = page.locator('h1:has-text("Master Dashboard")')
      await expect(header).toBeVisible()

      // Verify New Project button is present
      const newProjectButton = page.locator('button:has-text("New Project")')
      await expect(newProjectButton).toBeVisible()
    })

    test('should display version badge', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Check for version badge
      const versionBadge = page.locator('span:has-text("v0.1.0")')
      await expect(versionBadge).toBeVisible()
    })
  })

  test.describe('API Health Endpoints', () => {
    test('should respond to basic health check', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/health`)

      expect(response.ok()).toBeTruthy()
      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body.status).toBe('ok')
      expect(body.timestamp).toBeDefined()
      expect(body.uptime).toBeGreaterThan(0)
      expect(body.version).toBeDefined()
      expect(body.connections).toBeDefined()
      expect(body.connections.websocket).toBeGreaterThanOrEqual(0)
    })

    test('should respond to liveness probe', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/health/live`)

      expect(response.ok()).toBeTruthy()
      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body.alive).toBe(true)
    })

    test('should respond to readiness probe', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/health/ready`)

      // May return 200 or 503 depending on database status
      expect([200, 503]).toContain(response.status())

      const body = await response.json()
      expect(body.ready).toBeDefined()
      expect(body.checks).toBeDefined()
      expect(body.checks.database).toBeDefined()
      expect(body.checks.websocket).toBeDefined()
    })
  })

  test.describe('Page Load Performance', () => {
    test('homepage should load within acceptable time', async ({ page }) => {
      const startTime = Date.now()

      await page.goto('/')
      await page.waitForLoadState('networkidle')

      const loadTime = Date.now() - startTime

      // Page should load within 5 seconds
      expect(loadTime).toBeLessThan(5000)
    })
  })
})
