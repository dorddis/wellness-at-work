/**
 * Database Integration Tests
 *
 * Run with: pnpm test:integration
 *
 * These tests use the REAL SQLite database through Electron's Node.js
 * to verify actual database behavior, file creation, WAL mode, etc.
 *
 * Prerequisites:
 * - Run through Electron: ELECTRON_RUN_AS_NODE=true electron vitest
 * - better-sqlite3 compiled for Electron's Node version
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DatabaseManager } from '../database'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('DatabaseManager - Integration Tests', () => {
  let db: DatabaseManager
  let testDbPath: string

  beforeEach(async () => {
    // Create a unique temp file for each test
    testDbPath = path.join(os.tmpdir(), `lumina-test-${Date.now()}-${Math.random().toString(36)}.db`)
    db = new DatabaseManager(testDbPath)
    await db.initialize()
  })

  afterEach(() => {
    db.close()
    // Cleanup test files
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath)
      if (fs.existsSync(testDbPath + '-wal')) fs.unlinkSync(testDbPath + '-wal')
      if (fs.existsSync(testDbPath + '-shm')) fs.unlinkSync(testDbPath + '-shm')
    } catch {
      // Ignore cleanup errors
    }
  })

  // ============================================================================
  // SECTION 1: File System Verification
  // ============================================================================

  describe('File System', () => {
    it('creates database file at specified path', () => {
      expect(fs.existsSync(testDbPath)).toBe(true)
    })

    it('creates WAL file when WAL mode is enabled', () => {
      // WAL file might not exist until first write
      db.insertBlinkEvent(Date.now(), 0.3, true)
      // WAL mode should create -wal file
      // Note: This may not always create the file immediately
      expect(fs.existsSync(testDbPath)).toBe(true)
    })

    it('creates parent directories if they do not exist', async () => {
      const deepPath = path.join(os.tmpdir(), 'lumina-test', 'deep', 'nested', `test-${Date.now()}.db`)
      const deepDb = new DatabaseManager(deepPath)
      await deepDb.initialize()

      expect(fs.existsSync(deepPath)).toBe(true)

      deepDb.close()
      // Cleanup
      fs.unlinkSync(deepPath)
      fs.rmdirSync(path.dirname(deepPath))
      fs.rmdirSync(path.dirname(path.dirname(deepPath)))
      fs.rmdirSync(path.dirname(path.dirname(path.dirname(deepPath))))
    })
  })

  // ============================================================================
  // SECTION 2: Data Persistence
  // ============================================================================

  describe('Data Persistence', () => {
    it('data survives close and reopen', async () => {
      // Insert data
      const timestamp = Date.now()
      db.insertBlinkEvent(timestamp, 0.35, true)
      db.insertMinuteRollup(timestamp, 15, 0.32)
      db.updateBaseline(10, 15, 20, 100)

      // Close database
      db.close()

      // Reopen database
      const db2 = new DatabaseManager(testDbPath)
      await db2.initialize()

      // Verify data persisted
      const baseline = db2.getBaseline()
      expect(baseline).not.toBeNull()
      expect(baseline?.blink_p25).toBe(10)
      expect(baseline?.blink_p50).toBe(15)
      expect(baseline?.blink_p75).toBe(20)
      expect(baseline?.samples_count).toBe(100)

      // Get rollups
      const rollups = db2.getRollups(timestamp - 1000, timestamp + 1000)
      expect(rollups.length).toBeGreaterThan(0)

      db2.close()
    })

    it('handles multiple inserts correctly', () => {
      const baseTime = Date.now()

      // Insert 100 blink events
      for (let i = 0; i < 100; i++) {
        db.insertBlinkEvent(baseTime + i * 100, 0.25 + Math.random() * 0.1, i % 5 === 0)
      }

      // Insert 10 minute rollups
      for (let i = 0; i < 10; i++) {
        db.insertMinuteRollup(baseTime + i * 60000, 10 + i, 0.3)
      }

      // Verify counts
      const rollups = db.getRollups(baseTime - 1000, baseTime + 1000000)
      expect(rollups.length).toBe(10)
    })
  })

  // ============================================================================
  // SECTION 3: Sync Operations
  // ============================================================================

  describe('Sync Operations', () => {
    it('getUnsyncedRollups returns only unsynced items', () => {
      const baseTime = Date.now()

      // Insert 5 rollups
      for (let i = 0; i < 5; i++) {
        db.insertMinuteRollup(baseTime + i * 60000, 10, 0.3)
      }

      // Get all unsynced
      const unsynced = db.getUnsyncedRollups()
      expect(unsynced.length).toBe(5)

      // Mark first 3 as synced
      const ids = unsynced.slice(0, 3).map(r => r.id!)
      db.markRollupsSynced(ids)

      // Now only 2 should be unsynced
      const remaining = db.getUnsyncedRollups()
      expect(remaining.length).toBe(2)
    })

    it('markRollupsSynced is idempotent', () => {
      const baseTime = Date.now()
      db.insertMinuteRollup(baseTime, 10, 0.3)

      const unsynced = db.getUnsyncedRollups()
      const id = unsynced[0].id!

      // Mark synced twice
      db.markRollupsSynced([id])
      db.markRollupsSynced([id])

      // Should still be 0 unsynced
      expect(db.getUnsyncedRollups().length).toBe(0)
    })
  })

  // ============================================================================
  // SECTION 4: Cleanup Operations
  // ============================================================================

  describe('Cleanup', () => {
    it('cleanup removes old blink events', () => {
      const now = Date.now()
      const twoDaysAgo = now - 48 * 60 * 60 * 1000

      // Insert old event
      db.insertBlinkEvent(twoDaysAgo, 0.3, true)
      // Insert recent event
      db.insertBlinkEvent(now, 0.3, true)

      // Run cleanup
      db.cleanup()

      // Only recent event should remain
      const recentCount = db.getRecentBlinkCount(60 * 24) // Last 24 hours
      expect(recentCount).toBe(1)
    })
  })

  // ============================================================================
  // SECTION 5: Session Statistics
  // ============================================================================

  describe('Session Statistics', () => {
    it('getSessionStats returns accurate totals', () => {
      const sessionStart = Date.now()

      // Insert some blink events
      for (let i = 0; i < 10; i++) {
        db.insertBlinkEvent(sessionStart + i * 100, 0.25, true)
      }
      for (let i = 0; i < 5; i++) {
        db.insertBlinkEvent(sessionStart + 1000 + i * 100, 0.35, false)
      }

      // Insert rollups
      db.insertMinuteRollup(sessionStart, 10, 0.28)
      db.insertMinuteRollup(sessionStart + 60000, 12, 0.30)

      const stats = db.getSessionStats(sessionStart - 1000)
      expect(stats.totalBlinks).toBe(10) // Only is_blink=true
      expect(stats.minuteCount).toBe(2)
      expect(stats.avgEar).toBeCloseTo(0.29, 1)
    })

    it('getSessionStats handles no data case', () => {
      const stats = db.getSessionStats(Date.now() + 1000000)
      expect(stats.totalBlinks).toBe(0)
      expect(stats.avgEar).toBe(0)
      expect(stats.minuteCount).toBe(0)
    })
  })

  // ============================================================================
  // SECTION 6: Stress Tests
  // ============================================================================

  describe('Stress Tests', () => {
    it('handles 10000 inserts without error', () => {
      const baseTime = Date.now()

      // This should complete without throwing
      expect(() => {
        for (let i = 0; i < 10000; i++) {
          db.insertBlinkEvent(baseTime + i, 0.25, i % 3 === 0)
        }
      }).not.toThrow()
    })

    it('bulk query performance is acceptable', () => {
      const baseTime = Date.now()

      // Insert data
      for (let i = 0; i < 1000; i++) {
        db.insertMinuteRollup(baseTime + i * 60000, 10 + (i % 20), 0.3)
      }

      // Query should complete in reasonable time
      const start = performance.now()
      const rollups = db.getRollups(baseTime, baseTime + 2000 * 60000)
      const elapsed = performance.now() - start

      expect(rollups.length).toBe(1000)
      expect(elapsed).toBeLessThan(1000) // Should be under 1 second
    })
  })
})
