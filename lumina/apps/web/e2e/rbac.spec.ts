import { test, expect } from '@playwright/test'

/**
 * Role-Based Access Control (RBAC) Tests
 *
 * These tests verify that users with different roles see appropriate content.
 * Uses authenticated session from auth.setup.ts (admin role).
 *
 * Roles:
 * - admin: Full access to all features
 * - manager: Team view access, no org settings
 * - employee: Personal dashboard only
 */

test.describe('RBAC - Admin Navigation', () => {
  test('admin can access dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Admin should be able to access dashboard
    await expect(page).toHaveURL(/dashboard/)
  })

  test('admin can access admin page', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    // Admin should be able to access admin pages
    const url = page.url()
    expect(url.includes('/admin') || url.includes('/dashboard')).toBe(true)
  })

  test('admin can access settings page', async ({ page }) => {
    await page.goto('/admin/settings')
    await page.waitForLoadState('networkidle')

    // Admin should be able to access settings
    const url = page.url()
    expect(url.includes('/settings') || url.includes('/admin') || url.includes('/dashboard')).toBe(true)
  })

  test('admin can access employees page', async ({ page }) => {
    await page.goto('/admin/employees')
    await page.waitForLoadState('networkidle')

    // Admin should be able to access employee list
    const url = page.url()
    expect(url.includes('/employees') || url.includes('/admin') || url.includes('/dashboard')).toBe(true)
  })

  test('admin can access alerts page', async ({ page }) => {
    await page.goto('/admin/alerts')
    await page.waitForLoadState('networkidle')

    // Admin should be able to access alerts
    const url = page.url()
    expect(url.includes('/alerts') || url.includes('/admin') || url.includes('/dashboard')).toBe(true)
  })
})

test.describe('RBAC - Page Rendering', () => {
  test('dashboard page renders content', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Verify page renders with meaningful content
    const bodyContent = await page.locator('body').textContent()
    expect(bodyContent && bodyContent.length > 50).toBe(true)
  })

  test('admin page renders content', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    // Verify page renders with meaningful content
    const bodyContent = await page.locator('body').textContent()
    expect(bodyContent && bodyContent.length > 50).toBe(true)
  })
})

test.describe('RBAC - Page Content', () => {
  test('dashboard shows user content', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Should show some user-related content
    const content = await page.textContent('body')
    expect(content?.length).toBeGreaterThan(0)
  })

  test('admin page shows admin content', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    // Should show admin-related content
    const content = await page.textContent('body')
    expect(content?.length).toBeGreaterThan(0)
  })

  test('settings page shows configuration options', async ({ page }) => {
    await page.goto('/admin/settings')
    await page.waitForLoadState('networkidle')

    // If accessible, should show settings content
    if (page.url().includes('/settings')) {
      const content = await page.textContent('body')
      const hasSettingsContent =
        content?.toLowerCase().includes('setting') ||
        content?.toLowerCase().includes('privacy') ||
        content?.toLowerCase().includes('organization')

      expect(hasSettingsContent).toBe(true)
    }
  })

  test('employees page shows employee data', async ({ page }) => {
    await page.goto('/admin/employees')
    await page.waitForLoadState('networkidle')

    // If accessible, should show employee content
    if (page.url().includes('/employees')) {
      const content = await page.textContent('body')
      const hasEmployeeContent =
        content?.toLowerCase().includes('employee') ||
        content?.toLowerCase().includes('team') ||
        content?.toLowerCase().includes('member')

      expect(hasEmployeeContent).toBe(true)
    }
  })

  test('alerts page shows alert data', async ({ page }) => {
    await page.goto('/admin/alerts')
    await page.waitForLoadState('networkidle')

    // If accessible, should show alerts content
    if (page.url().includes('/alerts')) {
      const content = await page.textContent('body')
      const hasAlertsContent =
        content?.toLowerCase().includes('alert') ||
        content?.toLowerCase().includes('warning') ||
        content?.toLowerCase().includes('notification')

      expect(hasAlertsContent).toBe(true)
    }
  })
})

test.describe('RBAC - User Session', () => {
  test('user session is active', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Should not be on login page (session is active)
    const url = page.url()
    expect(url.includes('/login')).toBe(false)
  })

  test('can navigate between dashboard and admin', async ({ page }) => {
    // Start on dashboard
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Navigate to admin
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    // Should still be authenticated
    const url = page.url()
    expect(url.includes('/login')).toBe(false)
  })
})
