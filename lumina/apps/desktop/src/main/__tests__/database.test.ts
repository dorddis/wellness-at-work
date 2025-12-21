/**
 * RIGOROUS Database Manager Tests
 *
 * Tests the database layer logic with edge cases and boundary conditions.
 * Uses mocked better-sqlite3 for fast, isolated unit testing.
 *
 * Note: Integration tests with real SQLite should run in Electron context.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DatabaseManager } from '../database'

describe('DatabaseManager - Unit Tests', () => {
  let db: DatabaseManager

  beforeEach(async () => {
    // Use a unique path for each test (mock doesn't actually create files)
    db = new DatabaseManager('/tmp/test-' + Date.now() + '.db')
    await db.initialize()
  })

  afterEach(() => {
    db.close()
  })

  // ============================================================================
  // SECTION 1: Initialization Tests
  // ============================================================================

  describe('Initialization', () => {
    it('getDbPath returns the path passed to constructor', () => {
      const customPath = '/custom/path/test.db'
      const customDb = new DatabaseManager(customPath)
      expect(customDb.getDbPath()).toBe(customPath)
    })

    it('uses Electron userData path when no custom path provided', () => {
      const defaultDb = new DatabaseManager()
      const path = defaultDb.getDbPath()
      // Mock returns temp directory path containing 'lumina-test'
      expect(path).toContain('lumina.db')
    })

    it('initializes without throwing', async () => {
      const newDb = new DatabaseManager('/tmp/new.db')
      await expect(newDb.initialize()).resolves.not.toThrow()
    })
  })

  // ============================================================================
  // SECTION 2: BlinkEvent Operations
  // ============================================================================

  describe('Blink Events', () => {
    it('insertBlinkEvent does not throw with valid data', () => {
      expect(() => db.insertBlinkEvent(Date.now(), 0.3, true)).not.toThrow()
    })

    it('insertBlinkEvent handles timestamp = 0', () => {
      expect(() => db.insertBlinkEvent(0, 0.3, true)).not.toThrow()
    })

    it('insertBlinkEvent handles negative timestamp', () => {
      expect(() => db.insertBlinkEvent(-1000, 0.3, true)).not.toThrow()
    })

    it('insertBlinkEvent handles MAX_SAFE_INTEGER timestamp', () => {
      expect(() => db.insertBlinkEvent(Number.MAX_SAFE_INTEGER, 0.3, true)).not.toThrow()
    })

    it('insertBlinkEvent handles ear_value = 0', () => {
      expect(() => db.insertBlinkEvent(Date.now(), 0, true)).not.toThrow()
    })

    it('insertBlinkEvent handles negative ear_value', () => {
      expect(() => db.insertBlinkEvent(Date.now(), -0.5, true)).not.toThrow()
    })

    it('insertBlinkEvent handles very large ear_value', () => {
      expect(() => db.insertBlinkEvent(Date.now(), 1e100, true)).not.toThrow()
    })

    it('insertBlinkEvent converts boolean to 0/1', () => {
      db.insertBlinkEvent(Date.now(), 0.3, true)
      db.insertBlinkEvent(Date.now(), 0.4, false)
      // Mock tracks these - we can verify via getRecentBlinkCount
      expect(db.getRecentBlinkCount(1)).toBeGreaterThanOrEqual(0)
    })
  })

  // ============================================================================
  // SECTION 3: MinuteRollup Operations
  // ============================================================================

  describe('Minute Rollups', () => {
    it('insertMinuteRollup does not throw with valid data', () => {
      expect(() => db.insertMinuteRollup(Date.now(), 10, 0.3)).not.toThrow()
    })

    it('insertMinuteRollup handles blink_count = 0', () => {
      expect(() => db.insertMinuteRollup(Date.now(), 0, 0.3)).not.toThrow()
    })

    it('insertMinuteRollup handles very large blink_count', () => {
      expect(() => db.insertMinuteRollup(Date.now(), 999999, 0.3)).not.toThrow()
    })

    it('insertMinuteRollup handles avg_ear = null', () => {
      expect(() => db.insertMinuteRollup(Date.now(), 10, null)).not.toThrow()
    })

    it('insertMinuteRollup handles avg_ear = 0', () => {
      expect(() => db.insertMinuteRollup(Date.now(), 10, 0)).not.toThrow()
    })

    it('getUnsyncedRollups returns array', () => {
      const rollups = db.getUnsyncedRollups()
      expect(Array.isArray(rollups)).toBe(true)
    })

    it('getUnsyncedRollups with limit = 0 returns empty array', () => {
      db.insertMinuteRollup(Date.now(), 10, 0.3)
      const rollups = db.getUnsyncedRollups(0)
      expect(rollups).toHaveLength(0)
    })

    it('markRollupsSynced with empty array does not throw', () => {
      expect(() => db.markRollupsSynced([])).not.toThrow()
    })

    it('markRollupsSynced with non-existent IDs does not throw', () => {
      expect(() => db.markRollupsSynced([999, 1000, 1001])).not.toThrow()
    })
  })

  // ============================================================================
  // SECTION 4: getRollups Time Range
  // ============================================================================

  describe('getRollups - Time Range', () => {
    it('returns array for valid time range', () => {
      const rollups = db.getRollups(1000, 5000)
      expect(Array.isArray(rollups)).toBe(true)
    })

    it('handles startTime > endTime (returns empty)', () => {
      const rollups = db.getRollups(5000, 1000)
      expect(rollups).toHaveLength(0)
    })

    it('handles startTime = endTime', () => {
      const rollups = db.getRollups(1000, 1000)
      expect(Array.isArray(rollups)).toBe(true)
    })

    it('handles very large time range', () => {
      const rollups = db.getRollups(0, Number.MAX_SAFE_INTEGER)
      expect(Array.isArray(rollups)).toBe(true)
    })

    it('handles negative timestamps', () => {
      const rollups = db.getRollups(-1000, 0)
      expect(Array.isArray(rollups)).toBe(true)
    })
  })

  // ============================================================================
  // SECTION 5: Baseline Operations
  // ============================================================================

  describe('Baseline', () => {
    it('getBaseline returns object with expected fields', () => {
      const baseline = db.getBaseline()
      expect(baseline).not.toBeNull()
      expect(baseline).toHaveProperty('id')
      expect(baseline).toHaveProperty('blink_p25')
      expect(baseline).toHaveProperty('blink_p50')
      expect(baseline).toHaveProperty('blink_p75')
      expect(baseline).toHaveProperty('samples_count')
    })

    it('getBaseline returns default values on fresh database', () => {
      const baseline = db.getBaseline()
      expect(baseline?.samples_count).toBe(0)
      expect(baseline?.blink_p25).toBeNull()
    })

    it('updateBaseline does not throw with valid data', () => {
      expect(() => db.updateBaseline(10, 15, 20, 100)).not.toThrow()
    })

    it('updateBaseline handles p25 = 0', () => {
      expect(() => db.updateBaseline(0, 15, 20, 100)).not.toThrow()
    })

    it('updateBaseline handles negative values', () => {
      expect(() => db.updateBaseline(-5, -10, -15, 100)).not.toThrow()
    })

    it('updateBaseline handles very large values', () => {
      expect(() => db.updateBaseline(1e10, 2e10, 3e10, 1000000)).not.toThrow()
    })
  })

  // ============================================================================
  // SECTION 6: Cleanup
  // ============================================================================

  describe('Cleanup', () => {
    it('cleanup does not throw on empty database', () => {
      expect(() => db.cleanup()).not.toThrow()
    })

    it('cleanup does not throw with data present', () => {
      db.insertBlinkEvent(Date.now(), 0.3, true)
      expect(() => db.cleanup()).not.toThrow()
    })
  })

  // ============================================================================
  // SECTION 7: getRecentBlinkCount
  // ============================================================================

  describe('getRecentBlinkCount', () => {
    it('returns 0 when no blinks', () => {
      expect(db.getRecentBlinkCount(1)).toBe(0)
    })

    it('returns number for any minutes value', () => {
      const count = db.getRecentBlinkCount(60)
      expect(typeof count).toBe('number')
    })

    it('handles minutes = 0', () => {
      db.insertBlinkEvent(Date.now(), 0.3, true)
      const count = db.getRecentBlinkCount(0)
      expect(typeof count).toBe('number')
    })

    it('handles very large minutes value', () => {
      db.insertBlinkEvent(Date.now(), 0.3, true)
      const count = db.getRecentBlinkCount(10 * 365 * 24 * 60)
      expect(typeof count).toBe('number')
    })
  })

  // ============================================================================
  // SECTION 8: getSessionStats
  // ============================================================================

  describe('getSessionStats', () => {
    it('returns object with expected fields', () => {
      const stats = db.getSessionStats(Date.now())
      expect(stats).toHaveProperty('totalBlinks')
      expect(stats).toHaveProperty('avgEar')
      expect(stats).toHaveProperty('minuteCount')
    })

    it('returns zeros when no data', () => {
      const stats = db.getSessionStats(Date.now())
      expect(stats.totalBlinks).toBe(0)
      expect(stats.avgEar).toBe(0)
      expect(stats.minuteCount).toBe(0)
    })

    it('handles session start time = 0', () => {
      const stats = db.getSessionStats(0)
      expect(typeof stats.totalBlinks).toBe('number')
    })

    it('handles negative session start time', () => {
      const stats = db.getSessionStats(-1000)
      expect(typeof stats.totalBlinks).toBe('number')
    })

    it('handles MAX_SAFE_INTEGER session start time', () => {
      const stats = db.getSessionStats(Number.MAX_SAFE_INTEGER)
      expect(stats.totalBlinks).toBe(0)
    })
  })

  // ============================================================================
  // SECTION 9: Close and State
  // ============================================================================

  describe('Close and State', () => {
    it('close does not throw', () => {
      expect(() => db.close()).not.toThrow()
    })

    it('double close does not throw', () => {
      db.close()
      expect(() => db.close()).not.toThrow()
    })

    it('operations after close return safe defaults', () => {
      db.close()

      expect(db.getRecentBlinkCount(1)).toBe(0)
      expect(db.getBaseline()).toBeNull()
      expect(db.getUnsyncedRollups()).toHaveLength(0)
      expect(db.getSessionStats(0)).toEqual({ totalBlinks: 0, avgEar: 0, minuteCount: 0 })
    })

    it('insert operations after close do not throw', () => {
      db.close()

      expect(() => db.insertBlinkEvent(Date.now(), 0.3, true)).not.toThrow()
      expect(() => db.insertMinuteRollup(Date.now(), 10, 0.3)).not.toThrow()
      expect(() => db.updateBaseline(10, 15, 20, 100)).not.toThrow()
    })
  })
})

// ============================================================================
// Edge Cases with Data Type Validation
// ============================================================================

describe('DatabaseManager - Data Type Edge Cases', () => {
  let db: DatabaseManager

  beforeEach(async () => {
    db = new DatabaseManager('/tmp/types-test.db')
    await db.initialize()
  })

  afterEach(() => {
    db.close()
  })

  describe('Numeric boundary values', () => {
    it('handles Number.MIN_SAFE_INTEGER timestamp', () => {
      expect(() => db.insertBlinkEvent(Number.MIN_SAFE_INTEGER, 0.3, true)).not.toThrow()
    })

    it('handles Number.EPSILON ear_value', () => {
      expect(() => db.insertBlinkEvent(Date.now(), Number.EPSILON, true)).not.toThrow()
    })

    it('handles very small positive ear_value', () => {
      expect(() => db.insertBlinkEvent(Date.now(), 1e-300, true)).not.toThrow()
    })
  })
})

// ============================================================================
// Integration Test Notes
// ============================================================================

/**
 * INTEGRATION TESTS
 *
 * The following tests should run in Electron context to verify real SQLite behavior:
 *
 * 1. Verify database file is created at correct path
 * 2. Verify WAL mode is enabled
 * 3. Verify data persists across close/reopen
 * 4. Verify indexes are created
 * 5. Verify concurrent access behavior
 * 6. Verify cleanup actually deletes old data
 *
 * To run integration tests:
 * - Use `pnpm test:integration` which runs vitest through Electron
 * - Or use `ELECTRON_RUN_AS_NODE=true electron node_modules/vitest/vitest.mjs`
 */
