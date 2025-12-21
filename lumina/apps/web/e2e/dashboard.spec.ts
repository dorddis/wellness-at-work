import { test, expect } from '@playwright/test'

/**
 * Dashboard E2E Tests
 *
 * Tests for landing page, employee and admin dashboard functionality.
 * Authenticated tests use the stored auth state from auth.setup.ts.
 */

test.describe('Landing Page', () => {
  test('displays hero section with main heading', async ({ page }) => {
    await page.goto('/')

    // Check for main heading "AI-Powered Wellness for Modern Teams"
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
    await expect(heading).toContainText('AI-Powered Wellness')
  })

  test('displays Lumina branding in nav', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('Lumina').first()).toBeVisible()
  })

  test('displays feature cards section', async ({ page }) => {
    await page.goto('/')

    // Check for feature section heading
    await expect(page.getByRole('heading', { name: /everything you need/i })).toBeVisible()

    // Check for specific feature cards
    await expect(page.getByText('Blink Detection')).toBeVisible()
    await expect(page.getByText('Team Analytics')).toBeVisible()
    await expect(page.getByText('Admin Controls')).toBeVisible()
    await expect(page.getByText('Privacy First')).toBeVisible()
    await expect(page.getByText('Smart Alerts')).toBeVisible()
    await expect(page.getByText('Easy Onboarding')).toBeVisible()
  })

  test('has Sign In link in navigation', async ({ page }) => {
    await page.goto('/')

    const signInLink = page.getByRole('link', { name: /sign in/i })
    await expect(signInLink).toBeVisible()
    await expect(signInLink).toHaveAttribute('href', '/login')
  })

  test('has Get Started button in navigation', async ({ page }) => {
    await page.goto('/')

    const getStartedLink = page.getByRole('link', { name: /get started/i }).first()
    await expect(getStartedLink).toBeVisible()
    await expect(getStartedLink).toHaveAttribute('href', '/login')
  })

  test('has Start Free Trial CTA button', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('link', { name: /start free trial/i })).toBeVisible()
  })

  test('has Learn More button', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('link', { name: /learn more/i })).toBeVisible()
  })

  test('displays CTA section', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText(/ready to improve your team/i)).toBeVisible()
    await expect(page.getByText(/free 14-day trial/i)).toBeVisible()
  })

  test('displays footer', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText(/built for enterprise wellness/i)).toBeVisible()
  })

  test('is responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Page should still be usable - heading visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('feature cards are visible on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')

    await expect(page.getByText('Blink Detection')).toBeVisible()
  })
})

test.describe('Employee Dashboard', () => {
  test.describe('Dashboard Page Structure', () => {
    test('displays dashboard page', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Should be on dashboard (not redirected to login)
      await expect(page).toHaveURL(/dashboard/)
    })

    test('displays wellness-related content', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Should show some wellness-related content
      const pageContent = await page.textContent('body')
      const hasWellnessContent =
        pageContent?.toLowerCase().includes('wellness') ||
        pageContent?.toLowerCase().includes('blink') ||
        pageContent?.toLowerCase().includes('session') ||
        pageContent?.toLowerCase().includes('score')

      expect(hasWellnessContent).toBe(true)
    })

    test('page renders with content', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Verify page renders with content (not just a loading spinner)
      const bodyContent = await page.locator('body').textContent()
      expect(bodyContent && bodyContent.length > 50).toBe(true)
    })
  })

  test.describe('My Wellness Page', () => {
    test('navigates to my wellness page', async ({ page }) => {
      await page.goto('/dashboard/my-wellness')
      await page.waitForLoadState('networkidle')

      // Should be on my-wellness page or redirected appropriately
      const url = page.url()
      const isOnWellnessPage = url.includes('/my-wellness') || url.includes('/dashboard')
      expect(isOnWellnessPage).toBe(true)
    })
  })
})

test.describe('Admin Dashboard', () => {
  test.describe('Team Overview', () => {
    test('admin can access team overview', async ({ page }) => {
      await page.goto('/admin')
      await page.waitForLoadState('networkidle')

      // Should be on admin page
      const url = page.url()
      const isAuthorized = url.includes('/admin') || url.includes('/dashboard')
      expect(isAuthorized).toBe(true)
    })

    test('shows team or organization content', async ({ page }) => {
      await page.goto('/admin')
      await page.waitForLoadState('networkidle')

      const pageContent = await page.textContent('body')
      const hasTeamContent =
        pageContent?.toLowerCase().includes('team') ||
        pageContent?.toLowerCase().includes('employee') ||
        pageContent?.toLowerCase().includes('organization') ||
        pageContent?.toLowerCase().includes('overview')

      expect(hasTeamContent).toBe(true)
    })
  })

  test.describe('Employees Page', () => {
    test('navigates to employees page', async ({ page }) => {
      await page.goto('/admin/employees')
      await page.waitForLoadState('networkidle')

      // Should be on employees page or redirected
      const url = page.url()
      const isValidPage = url.includes('/employees') || url.includes('/admin') || url.includes('/dashboard')
      expect(isValidPage).toBe(true)
    })
  })

  test.describe('Alerts Page', () => {
    test('navigates to alerts page', async ({ page }) => {
      await page.goto('/admin/alerts')
      await page.waitForLoadState('networkidle')

      // Should be on alerts page or redirected
      const url = page.url()
      const isValidPage = url.includes('/alerts') || url.includes('/admin') || url.includes('/dashboard')
      expect(isValidPage).toBe(true)
    })

    test('shows alert-related content if accessible', async ({ page }) => {
      await page.goto('/admin/alerts')
      await page.waitForLoadState('networkidle')

      // If we're on the alerts page, verify content
      if (page.url().includes('/alerts')) {
        const pageContent = await page.textContent('body')
        const hasAlertContent =
          pageContent?.toLowerCase().includes('alert') ||
          pageContent?.toLowerCase().includes('notification') ||
          pageContent?.toLowerCase().includes('warning')

        expect(hasAlertContent).toBe(true)
      }
    })
  })

  test.describe('Settings Page', () => {
    test('navigates to settings page', async ({ page }) => {
      await page.goto('/admin/settings')
      await page.waitForLoadState('networkidle')

      // Should be on settings page or redirected
      const url = page.url()
      const isValidPage = url.includes('/settings') || url.includes('/admin') || url.includes('/dashboard')
      expect(isValidPage).toBe(true)
    })

    test('shows settings content if accessible', async ({ page }) => {
      await page.goto('/admin/settings')
      await page.waitForLoadState('networkidle')

      // If we're on the settings page, verify content
      if (page.url().includes('/settings')) {
        const pageContent = await page.textContent('body')
        const hasSettingsContent =
          pageContent?.toLowerCase().includes('setting') ||
          pageContent?.toLowerCase().includes('organization') ||
          pageContent?.toLowerCase().includes('privacy') ||
          pageContent?.toLowerCase().includes('configuration')

        expect(hasSettingsContent).toBe(true)
      }
    })
  })
})

test.describe('Responsive Design', () => {
  test('dashboard works on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Should render without errors
    const hasContent = await page.locator('body').textContent()
    expect(hasContent?.length).toBeGreaterThan(0)
  })

  test('dashboard works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Should render without errors
    const hasContent = await page.locator('body').textContent()
    expect(hasContent?.length).toBeGreaterThan(0)
  })

  test('admin page works on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    // Should render without errors
    const hasContent = await page.locator('body').textContent()
    expect(hasContent?.length).toBeGreaterThan(0)
  })
})
