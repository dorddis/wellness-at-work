/**
 * Vitest Integration Test Configuration
 *
 * Run with: pnpm test:integration
 * Uses ELECTRON_RUN_AS_NODE to run tests through Electron's Node.js
 * This allows testing with real native modules (better-sqlite3, etc.)
 */

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.integration.test.ts'],
    // Longer timeout for integration tests
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  // No aliases - use real modules
  resolve: {},
})
