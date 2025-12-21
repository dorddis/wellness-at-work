import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    // Exclude integration tests - they need Electron context
    exclude: ['src/**/__tests__/**/*.integration.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    // Mock native modules for Node.js testing
    alias: {
      electron: path.resolve(__dirname, 'src/__mocks__/electron.ts'),
      'better-sqlite3': path.resolve(__dirname, 'src/__mocks__/better-sqlite3.ts'),
    },
  },
})
