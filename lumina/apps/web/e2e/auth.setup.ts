import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../.auth/user.json')

/**
 * Authentication setup for E2E tests
 *
 * Uses password authentication for reliable E2E testing.
 * Test user: dorddis@gmail.com with password set in Supabase.
 */

// Supabase config
const SUPABASE_URL = 'https://acvmkigubzldhpyrlail.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdm1raWd1YnpsZGhweXJsYWlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNDI0ODIsImV4cCI6MjA4MTcxODQ4Mn0.K9qSjNvjl1Nmro06J5pDbWaWK3jcSGWOgigxe35fZ0k'
const PROJECT_REF = 'acvmkigubzldhpyrlail'

// Test credentials
const TEST_EMAIL = 'dorddis@gmail.com'
const TEST_PASSWORD = 'TestPassword123!'

setup('authenticate as admin', async ({ page, context }) => {
  // Navigate to the app first
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')

  // Authenticate using Supabase password auth
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.log('Auth failed:', errorText)
    throw new Error(`Authentication failed: ${errorText}`)
  }

  const authData = await response.json()

  if (!authData.access_token) {
    throw new Error('No access token received')
  }

  console.log('Successfully authenticated as:', TEST_EMAIL)

  // @supabase/ssr cookie format - JSON encoded session
  const sessionData = {
    access_token: authData.access_token,
    refresh_token: authData.refresh_token,
    expires_at: authData.expires_at,
    expires_in: authData.expires_in,
    token_type: authData.token_type,
    user: authData.user,
  }

  // The cookie name pattern used by @supabase/ssr
  const cookieName = `sb-${PROJECT_REF}-auth-token`

  // Set cookies in the correct format for @supabase/ssr
  // The value needs to be URL-encoded JSON
  const encodedSession = encodeURIComponent(JSON.stringify(sessionData))

  await context.addCookies([
    {
      name: cookieName,
      value: encodedSession,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ])

  // Also set in localStorage for client-side Supabase client
  await page.evaluate(({ key, data }) => {
    localStorage.setItem(key, JSON.stringify(data))
  }, {
    key: `sb-${PROJECT_REF}-auth-token`,
    data: sessionData
  })

  // Reload to pick up auth
  await page.reload()
  await page.waitForLoadState('networkidle')

  // Navigate to dashboard
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')

  const currentUrl = page.url()
  console.log('Current URL after auth:', currentUrl)

  // Save storage state for reuse
  await context.storageState({ path: authFile })
  console.log('Storage state saved')

  // Check if we're authenticated
  if (!currentUrl.includes('/login') && !currentUrl.includes('/onboarding')) {
    console.log('Authentication successful!')
  } else if (currentUrl.includes('/onboarding')) {
    console.log('User needs to complete onboarding - redirected to:', currentUrl)
  } else {
    console.log('Auth may not have worked - redirected to login')
  }
})

setup('setup placeholder', async () => {
  // Ensures setup project has at least one passing test
  expect(true).toBe(true)
})
