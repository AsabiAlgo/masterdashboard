/**
 * Project CRUD E2E Tests
 *
 * Tests for creating, viewing, and managing projects in Master Dashboard.
 */

import { test, expect } from '@playwright/test'

test.describe('Project Management', () => {
  test.describe('Project List Page', () => {
    test('should navigate to homepage and display project list', async ({ page }) => {
      // Navigate to homepage
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Verify we're on the homepage
      await expect(page).toHaveTitle(/Master Dashboard/i)

      // Verify header is visible
      const header = page.locator('h1:has-text("Master Dashboard")')
      await expect(header).toBeVisible()

      // Verify New Project button exists
      const newProjectButton = page.locator('button:has-text("New Project")')
      await expect(newProjectButton).toBeVisible()
    })

    test('should show empty state when no projects exist', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // If no projects, should show empty state
      // Note: This test assumes a clean state or checks for the empty state UI
      const emptyState = page.locator('text=No projects yet')
      const projectCards = page.locator('[class*="ProjectCard"], [data-testid="project-card"]')

      // Either empty state is shown or projects exist
      const isEmpty = await emptyState.isVisible().catch(() => false)
      const hasProjects = (await projectCards.count()) > 0

      expect(isEmpty || hasProjects).toBeTruthy()
    })
  })

  test.describe('Create Project', () => {
    test('should open create project dialog', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Click New Project button
      const newProjectButton = page.locator('button:has-text("New Project")')
      await newProjectButton.click()

      // Verify dialog opens
      const dialog = page.locator('[role="dialog"], [class*="Dialog"]')
      await expect(dialog).toBeVisible()

      // Verify dialog title
      const dialogTitle = page.locator('text=Create New Project')
      await expect(dialogTitle).toBeVisible()

      // Verify form fields exist
      const nameInput = page.locator('input[name="name"], input[placeholder*="Project"]')
      await expect(nameInput).toBeVisible()

      const cwdInput = page.locator('input[name="defaultCwd"], input[placeholder*="projects"]')
      await expect(cwdInput).toBeVisible()

      // Verify buttons
      const cancelButton = page.locator('button:has-text("Cancel")')
      await expect(cancelButton).toBeVisible()

      const createButton = page.locator('button:has-text("Create Project")')
      await expect(createButton).toBeVisible()
    })

    test('should create a new project with name "Test Project" and working directory "/tmp"', async ({
      page,
    }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Click New Project button
      await page.locator('button:has-text("New Project")').click()

      // Wait for dialog
      await expect(page.locator('[role="dialog"], [class*="Dialog"]')).toBeVisible()

      // Fill in project name
      const nameInput = page.locator('input[name="name"], input[placeholder*="Project"]')
      await nameInput.fill('Test Project')

      // Fill in working directory
      const cwdInput = page.locator('input[name="defaultCwd"], input[placeholder*="projects"]')
      await cwdInput.clear()
      await cwdInput.fill('/tmp')

      // Submit form
      await page.locator('button:has-text("Create Project")').click()

      // Wait for navigation to project workspace
      await page.waitForURL(/\/projects\/[a-zA-Z0-9-]+/, { timeout: 10000 })

      // Verify we're on the project page
      const projectHeader = page.locator('text=Test Project')
      await expect(projectHeader).toBeVisible({ timeout: 5000 })
    })

    test('should validate required fields', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Open create dialog
      await page.locator('button:has-text("New Project")').click()
      await expect(page.locator('[role="dialog"], [class*="Dialog"]')).toBeVisible()

      // Clear the default working directory
      const cwdInput = page.locator('input[name="defaultCwd"], input[placeholder*="projects"]')
      await cwdInput.clear()

      // Try to submit with empty name
      await page.locator('button:has-text("Create Project")').click()

      // Should show validation error
      const nameError = page.locator('text=Project name is required')
      await expect(nameError).toBeVisible({ timeout: 3000 })
    })

    test('should close dialog on cancel', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Open dialog
      await page.locator('button:has-text("New Project")').click()
      const dialog = page.locator('[role="dialog"], [class*="Dialog"]')
      await expect(dialog).toBeVisible()

      // Click cancel
      await page.locator('button:has-text("Cancel")').click()

      // Dialog should close
      await expect(dialog).not.toBeVisible({ timeout: 3000 })
    })
  })

  test.describe('Project Navigation', () => {
    test('should verify project appears in list and can be clicked', async ({ page }) => {
      // First create a project
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Check if we need to create a project first
      const emptyState = page.locator('text=No projects yet')
      const isEmpty = await emptyState.isVisible().catch(() => false)

      if (isEmpty) {
        // Create a project
        await page.locator('button:has-text("New Project"), button:has-text("Create Project")').first().click()
        await expect(page.locator('[role="dialog"], [class*="Dialog"]')).toBeVisible()

        await page.locator('input[name="name"], input[placeholder*="Project"]').fill('Navigation Test Project')
        await page.locator('input[name="defaultCwd"], input[placeholder*="projects"]').clear()
        await page.locator('input[name="defaultCwd"], input[placeholder*="projects"]').fill('/tmp')
        await page.locator('button:has-text("Create Project")').click()

        // Wait for navigation
        await page.waitForURL(/\/projects\/[a-zA-Z0-9-]+/, { timeout: 10000 })

        // Go back to homepage
        await page.goto('/')
        await page.waitForLoadState('networkidle')
      }

      // Now verify project card exists
      const projectCards = page.locator('[class*="ProjectCard"], article, [class*="project"]')
      const cardCount = await projectCards.count()

      if (cardCount > 0) {
        // Click on first project card
        await projectCards.first().click()

        // Should navigate to project workspace
        await page.waitForURL(/\/projects\/[a-zA-Z0-9-]+/, { timeout: 10000 })

        // Verify workspace page loads
        await expect(page.locator('text=Quick Start')).toBeVisible({ timeout: 5000 })
      }
    })
  })

  test.describe('Project Workspace', () => {
    test('should load workspace page with all UI elements', async ({ page }) => {
      // First create a project and navigate to it
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Create project
      await page.locator('button:has-text("New Project"), button:has-text("Create Project")').first().click()
      await expect(page.locator('[role="dialog"], [class*="Dialog"]')).toBeVisible()

      await page.locator('input[name="name"], input[placeholder*="Project"]').fill('Workspace Test')
      const cwdInput = page.locator('input[name="defaultCwd"], input[placeholder*="projects"]')
      await cwdInput.clear()
      await cwdInput.fill('/tmp')
      await page.locator('button:has-text("Create Project")').click()

      // Wait for workspace to load
      await page.waitForURL(/\/projects\/[a-zA-Z0-9-]+/, { timeout: 10000 })
      await page.waitForLoadState('networkidle')

      // Verify workspace UI elements
      // Project header
      const projectName = page.locator('text=Workspace Test')
      await expect(projectName).toBeVisible({ timeout: 5000 })

      // Quick Start sidebar
      const quickStart = page.locator('text=Quick Start')
      await expect(quickStart).toBeVisible()

      // Working Directory input in sidebar
      const workingDirLabel = page.locator('text=Working Directory')
      await expect(workingDirLabel).toBeVisible()

      // Terminal launch buttons
      const bashButton = page.locator('text=Bash Terminal')
      await expect(bashButton).toBeVisible()

      const zshButton = page.locator('text=Zsh Terminal')
      await expect(zshButton).toBeVisible()

      // Connection status in footer
      const footer = page.locator('footer')
      await expect(footer).toBeVisible()
    })

    test('should show connection status indicator', async ({ page }) => {
      // Navigate to an existing project or create one
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Create project
      await page.locator('button:has-text("New Project"), button:has-text("Create Project")').first().click()
      await page.locator('input[name="name"], input[placeholder*="Project"]').fill('Connection Test')
      const cwdInput = page.locator('input[name="defaultCwd"], input[placeholder*="projects"]')
      await cwdInput.clear()
      await cwdInput.fill('/tmp')
      await page.locator('button:has-text("Create Project")').click()

      await page.waitForURL(/\/projects\/[a-zA-Z0-9-]+/, { timeout: 10000 })
      await page.waitForLoadState('networkidle')

      // Check for connection status
      const connectionStatus = page.locator('text=Connected, text=Connecting, text=Disconnected')
      await expect(connectionStatus.first()).toBeVisible({ timeout: 10000 })
    })
  })
})
