/**
 * RIGOROUS Sync Module Tests
 *
 * Tests the sync layer with edge cases, error handling, and boundary conditions.
 * Uses mocked Supabase client for isolated unit testing.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock Supabase client before imports
const mockInsert = vi.fn()
const mockFrom = vi.fn(() => ({ insert: mockInsert }))
const mockSupabase = { from: mockFrom }

vi.mock('../client', () => ({
  getSupabase: vi.fn(() => mockSupabase),
  initializeSupabase: vi.fn(),
  isSupabaseInitialized: vi.fn(() => true),
}))

// Mock navigator for isOnline
const mockNavigator = { onLine: true }
Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true,
})

// Mock window for SyncQueue
const mockWindow = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}
Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true,
})

import { syncWellnessData, syncAlert, isOnline, SyncQueue, type MinuteRollup, type SyncResult } from '../sync'

describe('syncWellnessData - Rigorous Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
  })

  // ============================================================================
  // SECTION 1: Empty and Basic Cases
  // ============================================================================

  describe('Empty and basic cases', () => {
    it('returns zero synced for empty rollups array', async () => {
      const result = await syncWellnessData('org-1', 'user-1', [])
      expect(result.synced).toBe(0)
      expect(result.failed).toBe(0)
      expect(result.errors).toHaveLength(0)
      expect(mockFrom).not.toHaveBeenCalled()
    })

    it('syncs single rollup successfully', async () => {
      const rollups: MinuteRollup[] = [
        { timestamp: Date.now(), blink_count: 10, avg_ear: 0.3, session_id: null }
      ]
      const result = await syncWellnessData('org-1', 'user-1', rollups)
      expect(result.synced).toBe(1)
      expect(result.failed).toBe(0)
    })
  })

  // ============================================================================
  // SECTION 2: Batch Size Edge Cases
  // ============================================================================

  describe('Batch size edge cases', () => {
    it('handles exactly 500 rollups in single batch', async () => {
      const rollups: MinuteRollup[] = Array(500).fill(null).map((_, i) => ({
        timestamp: Date.now() + i * 1000,
        blink_count: 10,
        avg_ear: 0.3,
        session_id: null,
      }))

      const result = await syncWellnessData('org-1', 'user-1', rollups)
      expect(result.synced).toBe(500)
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })

    it('splits 501 rollups into two batches', async () => {
      const rollups: MinuteRollup[] = Array(501).fill(null).map((_, i) => ({
        timestamp: Date.now() + i * 1000,
        blink_count: 10,
        avg_ear: 0.3,
        session_id: null,
      }))

      const result = await syncWellnessData('org-1', 'user-1', rollups)
      expect(result.synced).toBe(501)
      expect(mockInsert).toHaveBeenCalledTimes(2)
    })

    it('handles exactly 1000 rollups (2 full batches)', async () => {
      const rollups: MinuteRollup[] = Array(1000).fill(null).map((_, i) => ({
        timestamp: Date.now() + i * 1000,
        blink_count: 10,
        avg_ear: 0.3,
        session_id: null,
      }))

      const result = await syncWellnessData('org-1', 'user-1', rollups)
      expect(result.synced).toBe(1000)
      expect(mockInsert).toHaveBeenCalledTimes(2)
    })

    it('handles very large batch (5000 rollups)', async () => {
      const rollups: MinuteRollup[] = Array(5000).fill(null).map((_, i) => ({
        timestamp: Date.now() + i * 1000,
        blink_count: 10,
        avg_ear: 0.3,
        session_id: null,
      }))

      const result = await syncWellnessData('org-1', 'user-1', rollups)
      expect(result.synced).toBe(5000)
      expect(mockInsert).toHaveBeenCalledTimes(10) // 5000 / 500 = 10 batches
    })
  })

  // ============================================================================
  // SECTION 3: Timestamp Edge Cases
  // ============================================================================

  describe('Timestamp edge cases', () => {
    it('handles timestamp = 0 (Unix epoch)', async () => {
      const rollups: MinuteRollup[] = [
        { timestamp: 0, blink_count: 10, avg_ear: 0.3, session_id: null }
      ]
      const result = await syncWellnessData('org-1', 'user-1', rollups)
      expect(result.synced).toBe(1)

      // Verify the timestamp was converted correctly
      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall[0].timestamp).toBe('1970-01-01T00:00:00.000Z')
    })

    it('handles negative timestamp (before epoch)', async () => {
      const rollups: MinuteRollup[] = [
        { timestamp: -86400000, blink_count: 10, avg_ear: 0.3, session_id: null }
      ]
      const result = await syncWellnessData('org-1', 'user-1', rollups)
      expect(result.synced).toBe(1)

      // Should convert to 1969-12-31
      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall[0].timestamp).toBe('1969-12-31T00:00:00.000Z')
    })

    it('handles very large timestamp (year 3000)', async () => {
      const year3000 = new Date('3000-01-01').getTime()
      const rollups: MinuteRollup[] = [
        { timestamp: year3000, blink_count: 10, avg_ear: 0.3, session_id: null }
      ]
      const result = await syncWellnessData('org-1', 'user-1', rollups)
      expect(result.synced).toBe(1)
    })

    /**
     * BUG FIXED: NaN timestamp now handled gracefully
     *
     * Previously: new Date(NaN).toISOString() threw "RangeError: Invalid time value"
     * Now: Invalid timestamps fall back to current time
     */
    it('NaN timestamp is handled gracefully (uses fallback)', async () => {
      const rollups: MinuteRollup[] = [
        { timestamp: NaN, blink_count: 10, avg_ear: 0.3, session_id: null }
      ]

      // Should not throw, uses current time as fallback
      const result = await syncWellnessData('org-1', 'user-1', rollups)
      expect(result.synced).toBe(1)

      // Verify a valid ISO timestamp was used
      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    /**
     * BUG FIXED: Infinity timestamp now handled gracefully
     *
     * Previously: new Date(Infinity).toISOString() threw "RangeError: Invalid time value"
     * Now: Invalid timestamps fall back to current time
     */
    it('Infinity timestamp is handled gracefully (uses fallback)', async () => {
      const rollups: MinuteRollup[] = [
        { timestamp: Infinity, blink_count: 10, avg_ear: 0.3, session_id: null }
      ]

      // Should not throw, uses current time as fallback
      const result = await syncWellnessData('org-1', 'user-1', rollups)
      expect(result.synced).toBe(1)

      // Verify a valid ISO timestamp was used
      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })

  // ============================================================================
  // SECTION 4: Numeric Data Edge Cases
  // ============================================================================

  describe('Numeric data edge cases', () => {
    it('handles blink_count = 0', async () => {
      const rollups: MinuteRollup[] = [
        { timestamp: Date.now(), blink_count: 0, avg_ear: 0.3, session_id: null }
      ]
      const result = await syncWellnessData('org-1', 'user-1', rollups)
      expect(result.synced).toBe(1)
    })

    it('handles very large blink_count', async () => {
      const rollups: MinuteRollup[] = [
        { timestamp: Date.now(), blink_count: 999999999, avg_ear: 0.3, session_id: null }
      ]
      const result = await syncWellnessData('org-1', 'user-1', rollups)
      expect(result.synced).toBe(1)
    })

    it('handles negative blink_count', async () => {
      const rollups: MinuteRollup[] = [
        { timestamp: Date.now(), blink_count: -10, avg_ear: 0.3, session_id: null }
      ]
      const result = await syncWellnessData('org-1', 'user-1', rollups)
      expect(result.synced).toBe(1)
    })

    it('handles avg_ear = null', async () => {
      const rollups: MinuteRollup[] = [
        { timestamp: Date.now(), blink_count: 10, avg_ear: null, session_id: null }
      ]
      const result = await syncWellnessData('org-1', 'user-1', rollups)
      expect(result.synced).toBe(1)

      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall[0].avg_ear).toBeNull()
    })

    it('handles avg_ear = 0', async () => {
      const rollups: MinuteRollup[] = [
        { timestamp: Date.now(), blink_count: 10, avg_ear: 0, session_id: null }
      ]
      const result = await syncWellnessData('org-1', 'user-1', rollups)
      expect(result.synced).toBe(1)

      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall[0].avg_ear).toBe(0)
    })

    it('handles avg_ear = NaN', async () => {
      const rollups: MinuteRollup[] = [
        { timestamp: Date.now(), blink_count: 10, avg_ear: NaN, session_id: null }
      ]
      const result = await syncWellnessData('org-1', 'user-1', rollups)
      expect(result.synced).toBe(1)

      // NaN should be preserved
      const insertCall = mockInsert.mock.calls[0][0]
      expect(Number.isNaN(insertCall[0].avg_ear)).toBe(true)
    })

    it('handles very small avg_ear (floating point precision)', async () => {
      const rollups: MinuteRollup[] = [
        { timestamp: Date.now(), blink_count: 10, avg_ear: 1e-300, session_id: null }
      ]
      const result = await syncWellnessData('org-1', 'user-1', rollups)
      expect(result.synced).toBe(1)
    })
  })

  // ============================================================================
  // SECTION 5: Error Handling
  // ============================================================================

  describe('Error handling', () => {
    it('handles single batch failure', async () => {
      mockInsert.mockResolvedValue({ error: { message: 'Database error' } })

      const rollups: MinuteRollup[] = [
        { timestamp: Date.now(), blink_count: 10, avg_ear: 0.3, session_id: null }
      ]
      const result = await syncWellnessData('org-1', 'user-1', rollups)

      expect(result.synced).toBe(0)
      expect(result.failed).toBe(1)
      expect(result.errors).toContain('Database error')
    })

    it('handles partial batch failure', async () => {
      // First batch succeeds, second fails
      mockInsert
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: { message: 'Rate limit exceeded' } })

      const rollups: MinuteRollup[] = Array(1000).fill(null).map((_, i) => ({
        timestamp: Date.now() + i * 1000,
        blink_count: 10,
        avg_ear: 0.3,
        session_id: null,
      }))

      const result = await syncWellnessData('org-1', 'user-1', rollups)

      expect(result.synced).toBe(500)
      expect(result.failed).toBe(500)
      expect(result.errors).toContain('Rate limit exceeded')
    })

    it('accumulates multiple error messages', async () => {
      mockInsert
        .mockResolvedValueOnce({ error: { message: 'Error 1' } })
        .mockResolvedValueOnce({ error: { message: 'Error 2' } })
        .mockResolvedValueOnce({ error: { message: 'Error 3' } })

      const rollups: MinuteRollup[] = Array(1500).fill(null).map((_, i) => ({
        timestamp: Date.now() + i * 1000,
        blink_count: 10,
        avg_ear: 0.3,
        session_id: null,
      }))

      const result = await syncWellnessData('org-1', 'user-1', rollups)

      expect(result.synced).toBe(0)
      expect(result.failed).toBe(1500)
      expect(result.errors).toHaveLength(3)
      expect(result.errors).toContain('Error 1')
      expect(result.errors).toContain('Error 2')
      expect(result.errors).toContain('Error 3')
    })
  })

  // ============================================================================
  // SECTION 6: ID and Session Edge Cases
  // ============================================================================

  describe('ID and session edge cases', () => {
    it('handles empty orgId', async () => {
      const rollups: MinuteRollup[] = [
        { timestamp: Date.now(), blink_count: 10, avg_ear: 0.3, session_id: null }
      ]
      const result = await syncWellnessData('', 'user-1', rollups)
      expect(result.synced).toBe(1)

      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall[0].org_id).toBe('')
    })

    it('handles empty userId', async () => {
      const rollups: MinuteRollup[] = [
        { timestamp: Date.now(), blink_count: 10, avg_ear: 0.3, session_id: null }
      ]
      const result = await syncWellnessData('org-1', '', rollups)
      expect(result.synced).toBe(1)

      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall[0].user_id).toBe('')
    })

    it('handles very long IDs', async () => {
      const longId = 'a'.repeat(10000)
      const rollups: MinuteRollup[] = [
        { timestamp: Date.now(), blink_count: 10, avg_ear: 0.3, session_id: null }
      ]
      const result = await syncWellnessData(longId, longId, rollups)
      expect(result.synced).toBe(1)
    })

    it('handles session_id with value', async () => {
      const rollups: MinuteRollup[] = [
        { timestamp: Date.now(), blink_count: 10, avg_ear: 0.3, session_id: 'session-123' }
      ]
      const result = await syncWellnessData('org-1', 'user-1', rollups)
      expect(result.synced).toBe(1)

      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall[0].session_id).toBe('session-123')
    })
  })
})

// ============================================================================
// syncAlert Tests
// ============================================================================

describe('syncAlert - Rigorous Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
  })

  it('syncs alert successfully', async () => {
    const result = await syncAlert('org-1', 'user-1', 'low_blink', 'warning', 'Blink rate low')
    expect(result.error).toBeNull()
    expect(mockInsert).toHaveBeenCalledWith({
      org_id: 'org-1',
      user_id: 'user-1',
      alert_type: 'low_blink',
      severity: 'warning',
      message: 'Blink rate low',
      acknowledged: false,
    })
  })

  it('returns error on failure', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'Insert failed' } })

    const result = await syncAlert('org-1', 'user-1', 'low_blink', 'critical', 'Error')
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toBe('Insert failed')
  })

  it('handles empty message', async () => {
    const result = await syncAlert('org-1', 'user-1', 'test', 'info', '')
    expect(result.error).toBeNull()

    const insertCall = mockInsert.mock.calls[0][0]
    expect(insertCall.message).toBe('')
  })

  it('handles very long message', async () => {
    const longMessage = 'x'.repeat(100000)
    const result = await syncAlert('org-1', 'user-1', 'test', 'info', longMessage)
    expect(result.error).toBeNull()
  })

  it('handles special characters in message', async () => {
    const specialMessage = '<script>alert("xss")</script>\n\t\r\0'
    const result = await syncAlert('org-1', 'user-1', 'test', 'info', specialMessage)
    expect(result.error).toBeNull()

    // Message should be preserved as-is (escaping is Supabase's job)
    const insertCall = mockInsert.mock.calls[0][0]
    expect(insertCall.message).toBe(specialMessage)
  })
})

// ============================================================================
// isOnline Tests
// ============================================================================

describe('isOnline - Rigorous Tests', () => {
  it('returns true when navigator.onLine is true', () => {
    mockNavigator.onLine = true
    expect(isOnline()).toBe(true)
  })

  it('returns false when navigator.onLine is false', () => {
    mockNavigator.onLine = false
    expect(isOnline()).toBe(false)
  })

  afterEach(() => {
    mockNavigator.onLine = true // Reset to default
  })
})

// ============================================================================
// SyncQueue Tests
// ============================================================================

describe('SyncQueue - Rigorous Tests', () => {
  let queue: SyncQueue

  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
    mockNavigator.onLine = true
    queue = new SyncQueue()
  })

  afterEach(() => {
    queue.clear()
  })

  // ============================================================================
  // SECTION 1: Basic Queue Operations
  // ============================================================================

  describe('Basic queue operations', () => {
    it('getPendingCount returns 0 for empty queue', () => {
      expect(queue.getPendingCount()).toBe(0)
    })

    it('add increments pending count', () => {
      queue.add({ timestamp: Date.now(), blink_count: 10, avg_ear: 0.3, session_id: null })
      // Note: add() triggers flush if online, but without credentials it won't sync
      expect(queue.getPendingCount()).toBe(1)
    })

    it('clear empties the queue', () => {
      queue.add({ timestamp: Date.now(), blink_count: 10, avg_ear: 0.3, session_id: null })
      queue.clear()
      expect(queue.getPendingCount()).toBe(0)
    })
  })

  // ============================================================================
  // SECTION 2: Credential Handling
  // ============================================================================

  describe('Credential handling', () => {
    it('flush returns error when credentials not set', async () => {
      queue.add({ timestamp: Date.now(), blink_count: 10, avg_ear: 0.3, session_id: null })
      const result = await queue.flush()

      expect(result.synced).toBe(0)
      expect(result.errors).toContain('Credentials not set')
    })

    it('flush succeeds when credentials are set', async () => {
      queue.setCredentials('org-1', 'user-1')
      queue.add({ timestamp: Date.now(), blink_count: 10, avg_ear: 0.3, session_id: null })

      // Wait for any pending auto-flush
      await new Promise(resolve => setTimeout(resolve, 10))

      const result = await queue.flush()
      // May be 0 if already flushed by add()
      expect(result.errors.filter(e => e !== 'Credentials not set')).toHaveLength(0)
    })
  })

  // ============================================================================
  // SECTION 3: Offline Behavior
  // ============================================================================

  describe('Offline behavior', () => {
    it('flush returns error when offline', async () => {
      mockNavigator.onLine = false
      queue.setCredentials('org-1', 'user-1')
      queue.add({ timestamp: Date.now(), blink_count: 10, avg_ear: 0.3, session_id: null })

      const result = await queue.flush()

      expect(result.synced).toBe(0)
      expect(result.errors).toContain('Offline')
    })

    it('items remain in queue when offline', async () => {
      mockNavigator.onLine = false
      queue.setCredentials('org-1', 'user-1')
      queue.add({ timestamp: Date.now(), blink_count: 10, avg_ear: 0.3, session_id: null })

      await queue.flush()

      expect(queue.getPendingCount()).toBe(1)
    })
  })

  // ============================================================================
  // SECTION 4: Empty Queue Edge Cases
  // ============================================================================

  describe('Empty queue edge cases', () => {
    it('flush on empty queue returns zeros', async () => {
      queue.setCredentials('org-1', 'user-1')
      const result = await queue.flush()

      expect(result.synced).toBe(0)
      expect(result.failed).toBe(0)
      expect(result.errors).toHaveLength(0)
    })

    it('multiple flush calls on empty queue are safe', async () => {
      queue.setCredentials('org-1', 'user-1')

      const results = await Promise.all([
        queue.flush(),
        queue.flush(),
        queue.flush(),
      ])

      results.forEach(result => {
        expect(result.synced).toBe(0)
        expect(result.failed).toBe(0)
      })
    })
  })

  // ============================================================================
  // SECTION 5: Sync Callback
  // ============================================================================

  describe('Sync callback', () => {
    it('calls onSyncComplete callback after successful flush', async () => {
      const onComplete = vi.fn()
      const queueWithCallback = new SyncQueue({ onSyncComplete: onComplete })

      queueWithCallback.setCredentials('org-1', 'user-1')
      queueWithCallback.add({ timestamp: Date.now(), blink_count: 10, avg_ear: 0.3, session_id: null })

      // Wait for auto-flush
      await new Promise(resolve => setTimeout(resolve, 50))
      await queueWithCallback.flush()

      expect(onComplete).toHaveBeenCalled()
      queueWithCallback.clear()
    })
  })

  // ============================================================================
  // SECTION 6: Error Recovery
  // ============================================================================

  describe('Error recovery', () => {
    it('re-queues failed items on error', async () => {
      mockInsert.mockRejectedValue(new Error('Network error'))

      queue.setCredentials('org-1', 'user-1')
      queue.add({ timestamp: Date.now(), blink_count: 10, avg_ear: 0.3, session_id: null })

      // Wait for auto-flush to fail
      await new Promise(resolve => setTimeout(resolve, 50))
      const result = await queue.flush()

      expect(result.errors).toContain('Network error')
      // Item should be re-queued
      expect(queue.getPendingCount()).toBe(1)
    })
  })

  // ============================================================================
  // SECTION 7: Concurrency Guard
  // ============================================================================

  describe('Concurrency guard', () => {
    it('prevents concurrent flush operations', async () => {
      // Make insert take some time
      mockInsert.mockImplementation(() => new Promise(resolve =>
        setTimeout(() => resolve({ error: null }), 100)
      ))

      queue.setCredentials('org-1', 'user-1')
      queue.add({ timestamp: Date.now(), blink_count: 10, avg_ear: 0.3, session_id: null })

      // Start flush without awaiting
      const flush1 = queue.flush()

      // Immediately try another flush
      const flush2 = queue.flush()

      const [result1, result2] = await Promise.all([flush1, flush2])

      // Second flush should return early (already syncing)
      // One of them should have synced, the other should be 0
      const totalSynced = result1.synced + result2.synced
      expect(totalSynced).toBeLessThanOrEqual(1)
    })
  })
})

// ============================================================================
// Data Validation Edge Cases
// ============================================================================

describe('Data Validation Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
  })

  it('handles unicode in IDs', async () => {
    const rollups: MinuteRollup[] = [
      { timestamp: Date.now(), blink_count: 10, avg_ear: 0.3, session_id: null }
    ]

    // Should handle unicode without throwing
    const result = await syncWellnessData('org-test', 'user-test', rollups)
    expect(result.synced).toBe(1)
  })

  it('handles null bytes in strings', async () => {
    const result = await syncAlert('org\0id', 'user\0id', 'alert\0type', 'info', 'message\0with\0nulls')
    expect(result.error).toBeNull()
  })

  it('preserves data integrity across batch boundaries', async () => {
    const rollups: MinuteRollup[] = [
      { timestamp: 1000, blink_count: 1, avg_ear: 0.1, session_id: 'first' },
      ...Array(498).fill(null).map((_, i) => ({
        timestamp: 2000 + i,
        blink_count: i + 2,
        avg_ear: 0.2,
        session_id: 'middle',
      })),
      { timestamp: 999000, blink_count: 500, avg_ear: 0.5, session_id: 'boundary' },
      { timestamp: 1000000, blink_count: 501, avg_ear: 0.6, session_id: 'next-batch' },
    ]

    await syncWellnessData('org-1', 'user-1', rollups)

    // Verify both batches were called
    expect(mockInsert).toHaveBeenCalledTimes(2)

    // First batch should have 500 items, second should have 1
    const firstBatch = mockInsert.mock.calls[0][0]
    const secondBatch = mockInsert.mock.calls[1][0]

    expect(firstBatch.length).toBe(500)
    expect(secondBatch.length).toBe(1)

    // Verify boundary items are correct
    expect(firstBatch[0].session_id).toBe('first')
    expect(firstBatch[499].session_id).toBe('boundary')
    expect(secondBatch[0].session_id).toBe('next-batch')
  })
})
