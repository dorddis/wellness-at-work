/**
 * Sync Service
 * Wraps window.lumina.sync IPC calls for type safety and testability
 */

export interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

export interface SyncStatus {
  isConfigured: boolean;
  isSyncing: boolean;
  pendingCount: number;
  credentials: { orgId: string; userId: string } | null;
}

/**
 * Sync service - wraps all window.lumina.sync calls
 */
export const SyncService = {
  /**
   * Set credentials for cloud sync
   * Called after successful authentication
   */
  setCredentials: (orgId: string, userId: string): Promise<{ success: boolean }> =>
    window.lumina?.sync.setCredentials(orgId, userId),

  /**
   * Clear sync credentials (on logout)
   */
  clearCredentials: (): Promise<{ success: boolean }> =>
    window.lumina?.sync.clearCredentials(),

  /**
   * Get current sync status
   */
  getStatus: (): Promise<SyncStatus> =>
    window.lumina?.sync.getStatus(),

  /**
   * Trigger immediate sync of unsynced data to cloud
   */
  trigger: (): Promise<SyncResult> =>
    window.lumina?.sync.trigger(),

  /**
   * Start automatic sync (interval-based)
   * @param intervalMs Optional custom interval in milliseconds
   */
  startAuto: (intervalMs?: number): Promise<{ success: boolean }> =>
    window.lumina?.sync.startAuto(intervalMs),

  /**
   * Stop automatic sync
   */
  stopAuto: (): Promise<{ success: boolean }> =>
    window.lumina?.sync.stopAuto(),
};
