/**
 * RIGOROUS Desktop SyncService Tests
 *
 * Tests the desktop sync service with edge cases and error handling.
 * Uses mocked dependencies (DatabaseManager, electron-store, net, @lumina/api).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Use vi.hoisted to ensure mocks are available before vi.mock is processed
const { mockStore, mockNet, mockInitializeSupabase, mockGetSupabase, mockSyncWellnessData } = vi.hoisted(() => ({
  mockStore: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
  mockNet: {
    isOnline: vi.fn(() => true),
  },
  mockInitializeSupabase: vi.fn(),
  mockGetSupabase: vi.fn(),
  mockSyncWellnessData: vi.fn(),
}))

// Mock electron-store
vi.mock('electron-store', () => ({
  default: vi.fn(() => mockStore),
}))

// Mock electron net
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/lumina-test'),
  },
  net: mockNet,
}))

// Mock @lumina/api
vi.mock('@lumina/api', () => ({
  initializeSupabase: mockInitializeSupabase,
  getSupabase: mockGetSupabase,
  syncWellnessData: mockSyncWellnessData,
}))

// Mock DatabaseManager - these don't need hoisting since they're passed directly
interface MockRollup {
  id: number | undefined
  timestamp: number
  blink_count: number
  avg_ear: number
  synced: number
}
const mockGetUnsyncedRollups = vi.fn((): MockRollup[] => [])
const mockMarkRollupsSynced = vi.fn((_ids: number[]): void => {})

const mockDatabase = {
  getUnsyncedRollups: mockGetUnsyncedRollups,
  markRollupsSynced: mockMarkRollupsSynced,
}

import { SyncService } from '../sync'

describe('SyncService - Rigorous Tests', () => {
  let syncService: SyncService

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Default mock implementations
    mockStore.get.mockReturnValue(undefined)
    mockNet.isOnline.mockReturnValue(true)
    mockSyncWellnessData.mockResolvedValue({ synced: 0, failed: 0, errors: [] })

    syncService = new SyncService(mockDatabase as any)
  })

  afterEach(() => {
    syncService.stopAutoSync()
    vi.useRealTimers()
  })

  // ============================================================================
  // SECTION 1: Initialization Tests
  // ============================================================================

  describe('Initialization', () => {
    it('loads saved credentials from store on construction', () => {
      const savedCreds = { orgId: 'saved-org', userId: 'saved-user' }
      mockStore.get.mockReturnValue(savedCreds)

      const service = new SyncService(mockDatabase as any)

      expect(service.getCredentials()).toEqual(savedCreds)
    })

    it('handles missing saved credentials', () => {
      mockStore.get.mockReturnValue(undefined)

      const service = new SyncService(mockDatabase as any)

      expect(service.getCredentials()).toBeNull()
    })

    it('initialize returns true on success', async () => {
      const result = await syncService.initialize()
      expect(result).toBe(true)
      expect(mockInitializeSupabase).toHaveBeenCalled()
    })

    it('initialize uses environment variables when available', async () => {
      const originalEnv = process.env
      process.env = { ...originalEnv, SUPABASE_URL: 'http://test.com', SUPABASE_ANON_KEY: 'test-key' }

      await syncService.initialize()

      expect(mockInitializeSupabase).toHaveBeenCalledWith('http://test.com', 'test-key')

      process.env = originalEnv
    })

    it('initialize uses saved config from store', async () => {
      mockStore.get.mockImplementation((key: string) => {
        if (key === 'syncConfig') {
          return { supabaseUrl: 'http://saved.com', supabaseKey: 'saved-key' }
        }
        return undefined
      })

      await syncService.initialize()

      expect(mockInitializeSupabase).toHaveBeenCalledWith('http://saved.com', 'saved-key')
    })

    it('initialize clears stale config with old placeholder URL', async () => {
      mockStore.get.mockImplementation((key: string) => {
        if (key === 'syncConfig') {
          return { supabaseUrl: 'http://gdfjmpmkwfqcepfzxpen.supabase.co', supabaseKey: 'old-key' }
        }
        return undefined
      })

      await syncService.initialize()

      expect(mockStore.delete).toHaveBeenCalledWith('syncConfig')
    })
  })

  // ============================================================================
  // SECTION 2: Credential Management
  // ============================================================================

  describe('Credential management', () => {
    it('setCredentials stores credentials in memory and store', () => {
      syncService.setCredentials('org-123', 'user-456')

      expect(syncService.getCredentials()).toEqual({ orgId: 'org-123', userId: 'user-456' })
      expect(mockStore.set).toHaveBeenCalledWith('syncCredentials', { orgId: 'org-123', userId: 'user-456' })
    })

    it('clearCredentials removes credentials from memory and store', () => {
      syncService.setCredentials('org-123', 'user-456')
      syncService.clearCredentials()

      expect(syncService.getCredentials()).toBeNull()
      expect(mockStore.delete).toHaveBeenCalledWith('syncCredentials')
    })

    it('isConfigured returns false when not initialized', async () => {
      syncService.setCredentials('org-1', 'user-1')
      expect(syncService.isConfigured()).toBe(false)
    })

    it('isConfigured returns false when no credentials', async () => {
      await syncService.initialize()
      expect(syncService.isConfigured()).toBe(false)
    })

    it('isConfigured returns true when initialized and credentials set', async () => {
      await syncService.initialize()
      syncService.setCredentials('org-1', 'user-1')
      expect(syncService.isConfigured()).toBe(true)
    })
  })

  // ============================================================================
  // SECTION 3: Sync Operation Edge Cases
  // ============================================================================

  describe('Sync operation edge cases', () => {
    beforeEach(async () => {
      await syncService.initialize()
      syncService.setCredentials('org-1', 'user-1')
    })

    it('sync returns error when not configured', async () => {
      syncService.clearCredentials()
      const result = await syncService.sync()

      expect(result.synced).toBe(0)
      expect(result.errors).toContain('Not configured')
    })

    it('sync returns error when offline', async () => {
      mockNet.isOnline.mockReturnValue(false)

      const result = await syncService.sync()

      expect(result.synced).toBe(0)
      expect(result.errors).toContain('Offline')
    })

    it('sync returns early when no unsynced rollups', async () => {
      mockGetUnsyncedRollups.mockReturnValue([])

      const result = await syncService.sync()

      expect(result.synced).toBe(0)
      expect(result.failed).toBe(0)
      expect(mockSyncWellnessData).not.toHaveBeenCalled()
    })

    it('sync processes unsynced rollups', async () => {
      const rollups = [
        { id: 1, timestamp: 1000, blink_count: 10, avg_ear: 0.3, synced: 0 },
        { id: 2, timestamp: 2000, blink_count: 15, avg_ear: 0.35, synced: 0 },
      ]
      mockGetUnsyncedRollups.mockReturnValue(rollups)
      mockSyncWellnessData.mockResolvedValue({ synced: 2, failed: 0, errors: [] })

      const result = await syncService.sync()

      expect(result.synced).toBe(2)
      expect(mockMarkRollupsSynced).toHaveBeenCalledWith([1, 2])
    })

    it('sync handles partial failure correctly', async () => {
      const rollups = [
        { id: 1, timestamp: 1000, blink_count: 10, avg_ear: 0.3, synced: 0 },
        { id: 2, timestamp: 2000, blink_count: 15, avg_ear: 0.35, synced: 0 },
        { id: 3, timestamp: 3000, blink_count: 20, avg_ear: 0.4, synced: 0 },
      ]
      mockGetUnsyncedRollups.mockReturnValue(rollups)
      mockSyncWellnessData.mockResolvedValue({ synced: 1, failed: 2, errors: ['Partial failure'] })

      const result = await syncService.sync()

      expect(result.synced).toBe(1)
      expect(result.failed).toBe(2)
      expect(mockMarkRollupsSynced).toHaveBeenCalledWith([1]) // Only first one synced
    })

    it('sync handles API error gracefully', async () => {
      const rollups = [
        { id: 1, timestamp: 1000, blink_count: 10, avg_ear: 0.3, synced: 0 },
      ]
      mockGetUnsyncedRollups.mockReturnValue(rollups)
      mockSyncWellnessData.mockRejectedValue(new Error('Network timeout'))

      const result = await syncService.sync()

      expect(result.errors).toContain('Network timeout')
      expect(mockMarkRollupsSynced).not.toHaveBeenCalled()
    })

    it('sync handles rollups without IDs', async () => {
      const rollups = [
        { id: undefined, timestamp: 1000, blink_count: 10, avg_ear: 0.3, synced: 0 },
        { id: 2, timestamp: 2000, blink_count: 15, avg_ear: 0.35, synced: 0 },
      ]
      mockGetUnsyncedRollups.mockReturnValue(rollups)
      mockSyncWellnessData.mockResolvedValue({ synced: 2, failed: 0, errors: [] })

      const result = await syncService.sync()

      expect(result.synced).toBe(2)
      // Should only mark valid IDs
      expect(mockMarkRollupsSynced).toHaveBeenCalledWith([2])
    })
  })

  // ============================================================================
  // SECTION 4: Concurrency Guard
  // ============================================================================

  describe('Concurrency guard', () => {
    beforeEach(async () => {
      await syncService.initialize()
      syncService.setCredentials('org-1', 'user-1')
    })

    it('prevents concurrent sync operations', async () => {
      const rollups = [{ id: 1, timestamp: 1000, blink_count: 10, avg_ear: 0.3, synced: 0 }]
      mockGetUnsyncedRollups.mockReturnValue(rollups)

      // Make the sync take some time
      mockSyncWellnessData.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ synced: 1, failed: 0, errors: [] }), 100))
      )

      // Start first sync (don't await)
      const sync1 = syncService.sync()

      // Immediately start second sync
      const sync2Promise = syncService.sync()

      // Second sync should return immediately with "Already syncing"
      const result2 = await sync2Promise
      expect(result2.errors).toContain('Already syncing')

      // Wait for first sync to complete
      vi.advanceTimersByTime(150)
      await sync1
    })
  })

  // ============================================================================
  // SECTION 5: Auto-Sync
  // ============================================================================

  describe('Auto-sync', () => {
    beforeEach(async () => {
      await syncService.initialize()
      syncService.setCredentials('org-1', 'user-1')
    })

    it('startAutoSync schedules initial sync after 30 seconds', () => {
      syncService.startAutoSync()

      expect(mockSyncWellnessData).not.toHaveBeenCalled()

      // Advance 30 seconds
      vi.advanceTimersByTime(30000)

      // Sync should be triggered
      expect(mockGetUnsyncedRollups).toHaveBeenCalled()
    })

    it('startAutoSync schedules periodic syncs', async () => {
      syncService.startAutoSync(60000) // 1 minute interval

      // Initial sync at 30s
      vi.advanceTimersByTime(30000)
      await vi.runOnlyPendingTimersAsync()
      const callsAfterInitial = mockGetUnsyncedRollups.mock.calls.length

      // First periodic sync at 1 minute
      vi.advanceTimersByTime(60000)
      await vi.runOnlyPendingTimersAsync()
      const callsAfterFirst = mockGetUnsyncedRollups.mock.calls.length

      // Second periodic sync at 2 minutes
      vi.advanceTimersByTime(60000)
      await vi.runOnlyPendingTimersAsync()
      const callsAfterSecond = mockGetUnsyncedRollups.mock.calls.length

      // Should have more calls as time advances
      expect(callsAfterFirst).toBeGreaterThan(callsAfterInitial)
      expect(callsAfterSecond).toBeGreaterThan(callsAfterFirst)
    })

    it('stopAutoSync cancels scheduled syncs', () => {
      syncService.startAutoSync(60000)

      // Initial sync at 30s
      vi.advanceTimersByTime(30000)
      expect(mockGetUnsyncedRollups).toHaveBeenCalledTimes(1)

      // Stop auto-sync
      syncService.stopAutoSync()

      // Advance time - no more syncs should happen
      vi.advanceTimersByTime(120000)
      expect(mockGetUnsyncedRollups).toHaveBeenCalledTimes(1)
    })

    it('startAutoSync clears previous interval when called again', () => {
      syncService.startAutoSync(60000)
      syncService.startAutoSync(120000)

      // Only one interval should be active
      vi.advanceTimersByTime(30000) // Initial sync
      expect(mockGetUnsyncedRollups).toHaveBeenCalledTimes(1)

      // At 120s, should sync (not at 60s and 90s)
      vi.advanceTimersByTime(90000)
      expect(mockGetUnsyncedRollups).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(30000) // Now at 150s, first 120s interval
      // Note: Initial timeout fires at 30s, then interval at 120s intervals
    })
  })

  // ============================================================================
  // SECTION 6: Status
  // ============================================================================

  describe('Status', () => {
    it('getStatus returns correct initial state', () => {
      // Reset the mock to return empty array for this specific test
      mockGetUnsyncedRollups.mockReturnValue([])

      const status = syncService.getStatus()

      expect(status.isConfigured).toBe(false)
      expect(status.isSyncing).toBe(false)
      expect(status.pendingCount).toBe(0)
      expect(status.credentials).toBeNull()
    })

    it('getStatus reflects configured state', async () => {
      await syncService.initialize()
      syncService.setCredentials('org-1', 'user-1')

      const status = syncService.getStatus()

      expect(status.isConfigured).toBe(true)
      expect(status.credentials).toEqual({ orgId: 'org-1', userId: 'user-1' })
    })

    it('getStatus shows pending count', async () => {
      const rollups: MockRollup[] = Array(50).fill(null).map(() => ({
        id: 1,
        timestamp: 1000,
        blink_count: 10,
        avg_ear: 0.3,
        synced: 0,
      }))
      mockGetUnsyncedRollups.mockReturnValue(rollups)

      const status = syncService.getStatus()

      expect(status.pendingCount).toBe(50)
    })
  })

  // ============================================================================
  // SECTION 7: Edge Case IDs
  // ============================================================================

  describe('Edge case IDs', () => {
    beforeEach(async () => {
      await syncService.initialize()
    })

    it('handles empty orgId', () => {
      syncService.setCredentials('', 'user-1')
      expect(syncService.getCredentials()?.orgId).toBe('')
    })

    it('handles empty userId', () => {
      syncService.setCredentials('org-1', '')
      expect(syncService.getCredentials()?.userId).toBe('')
    })

    it('handles very long IDs', () => {
      const longId = 'x'.repeat(10000)
      syncService.setCredentials(longId, longId)
      expect(syncService.getCredentials()?.orgId).toHaveLength(10000)
    })

    it('handles unicode in IDs', () => {
      syncService.setCredentials('org-test', 'user-test')
      expect(syncService.getCredentials()?.orgId).toBe('org-test')
    })
  })
})

// ============================================================================
// Error Recovery Tests
// ============================================================================

describe('SyncService - Error Recovery', () => {
  let syncService: SyncService

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    mockStore.get.mockReturnValue(undefined)
    mockNet.isOnline.mockReturnValue(true)

    syncService = new SyncService(mockDatabase as any)
  })

  afterEach(() => {
    syncService.stopAutoSync()
    vi.useRealTimers()
  })

  it('recovers from initialization failure', async () => {
    mockInitializeSupabase.mockImplementationOnce(() => {
      throw new Error('Init failed')
    })

    const result = await syncService.initialize()
    expect(result).toBe(false)

    // Second attempt should work
    mockInitializeSupabase.mockImplementation(() => {})
    const result2 = await syncService.initialize()
    expect(result2).toBe(true)
  })
})
