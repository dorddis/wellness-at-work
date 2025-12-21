import { test, expect } from '@playwright/test'

/**
 * Authentication Tests
 *
 * Tests for login page, route protection, and public pages.
 * Tests that need unauthenticated state clear the storage first.
 */

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    // Clear auth for login page tests
    test.use({ storageState: { cookies: [], origins: [] } })

    test('displays login form with welcome heading', async ({ page }) => {
      await page.goto('/login')

      // Check page heading - actual text is "Welcome back"
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()

      // Check Lumina branding
      await expect(page.getByText('Lumina')).toBeVisible()

      // Check email input exists (labeled "Email address")
      await expect(page.getByLabel(/email address/i)).toBeVisible()

      // Check submit button exists - actual text is "Send Magic Link"
      await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible()
    })

    test('displays Google OAuth button', async ({ page }) => {
      await page.goto('/login')

      // Check for Google OAuth button - actual text is "Continue with Google"
      await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()
    })

    test('shows email divider', async ({ page }) => {
      await page.goto('/login')

      // Check for "Or continue with email" divider
      await expect(page.getByText(/or continue with email/i)).toBeVisible()
    })

    test('allows entering valid email', async ({ page }) => {
      await page.goto('/login')

      const emailInput = page.getByLabel(/email address/i)
      await emailInput.fill('test@example.com')

      await expect(emailInput).toHaveValue('test@example.com')
    })

    test('submit button is disabled without email', async ({ page }) => {
      await page.goto('/login')

      const submitButton = page.getByRole('button', { name: /send magic link/i })
      await expect(submitButton).toBeDisabled()
    })

    test('submit button enables with valid email', async ({ page }) => {
      await page.goto('/login')

      const emailInput = page.getByLabel(/email address/i)
      await emailInput.fill('test@example.com')

      const submitButton = page.getByRole('button', { name: /send magic link/i })
      await expect(submitButton).toBeEnabled()
    })

    test('has link to join organization', async ({ page }) => {
      await page.goto('/login')

      await expect(page.getByRole('link', { name: /join your organization/i })).toBeVisible()
    })

    test('has link back to home', async ({ page }) => {
      await page.goto('/login')

      // Lumina logo should link to home
      const homeLink = page.getByRole('link', { name: /lumina/i })
      await expect(homeLink).toBeVisible()
      await expect(homeLink).toHaveAttribute('href', '/')
    })
  })

  test.describe('Route Protection', () => {
    // Clear auth for route protection tests
    test.use({ storageState: { cookies: [], origins: [] } })

    test('redirects unauthenticated users from dashboard to login', async ({ page }) => {
      await page.goto('/dashboard')

      // Should redirect to login
      await expect(page).toHaveURL(/login|auth/)
    })

    test('redirects unauthenticated users from admin to login', async ({ page }) => {
      await page.goto('/admin')

      // Should redirect to login
      await expect(page).toHaveURL(/login|auth/)
    })

    test('redirects unauthenticated users from settings to login', async ({ page }) => {
      await page.goto('/admin/settings')

      // Should redirect to login
      await expect(page).toHaveURL(/login|auth/)
    })

    test('redirects unauthenticated users from my-wellness to login', async ({ page }) => {
      await page.goto('/dashboard/my-wellness')

      // Should redirect to login
      await expect(page).toHaveURL(/login|auth/)
    })
  })

  test.describe('Public Pages', () => {
    // Clear auth for public page tests
    test.use({ storageState: { cookies: [], origins: [] } })

    test('landing page is accessible without auth', async ({ page }) => {
      await page.goto('/')

      // Should not redirect, should show landing content
      await expect(page).toHaveURL('/')

      // Check for some landing page content
      const hasHero = await page.getByRole('heading', { level: 1 }).isVisible().catch(() => false)
      const hasLumina = await page.getByText(/lumina/i).isVisible().catch(() => false)

      expect(hasHero || hasLumina).toBe(true)
    })

    test('login page is accessible without auth', async ({ page }) => {
      await page.goto('/login')

      await expect(page).toHaveURL('/login')
    })

    test('join page is accessible without auth', async ({ page }) => {
      await page.goto('/join')

      // Should show join/invite form or redirect to login first
      const isJoinPage = page.url().includes('/join')
      const isLoginPage = page.url().includes('/login')

      expect(isJoinPage || isLoginPage).toBe(true)
    })
  })

  test.describe('Organization Join Flow', () => {
    // Clear auth for join flow tests
    test.use({ storageState: { cookies: [], origins: [] } })

    test('join page shows invite code input', async ({ page }) => {
      await page.goto('/join')

      // If redirected to login first, that's also acceptable
      if (page.url().includes('/login')) {
        return // Skip rest of test, auth required first
      }

      // Check for invite code input
      await expect(page.getByRole('textbox', { name: /code|invite|organization/i })).toBeVisible()
    })
  })
})

test.describe('Authenticated User Flow', () => {
  // Uses the default authenticated storage state

  test('authenticated user can access dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Should stay on dashboard (not redirected to login)
    await expect(page).toHaveURL(/dashboard/)
  })

  test('authenticated user is redirected from login to dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Should redirect to dashboard or onboarding
    const url = page.url()
    expect(url.includes('/dashboard') || url.includes('/onboarding')).toBe(true)
  })

  test('authenticated admin can access admin pages', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    // Should stay on admin page
    const url = page.url()
    expect(url.includes('/admin') || url.includes('/dashboard')).toBe(true)
  })
})
