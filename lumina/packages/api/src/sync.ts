/**
 * Data Sync Module
 * Handles syncing local SQLite data to Supabase
 */

import { getSupabase } from './client';

export interface MinuteRollup {
  timestamp: number;
  blink_count: number;
  avg_ear: number | null;
  session_id: string | null;
}

export interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * Sync minute rollups to Supabase
 */
export async function syncWellnessData(
  orgId: string,
  userId: string,
  rollups: MinuteRollup[]
): Promise<SyncResult> {
  const supabase = getSupabase();
  const result: SyncResult = {
    synced: 0,
    failed: 0,
    errors: [],
  };

  if (rollups.length === 0) {
    return result;
  }

  // Convert to Supabase format
  const records = rollups.map((r) => ({
    org_id: orgId,
    user_id: userId,
    timestamp: new Date(r.timestamp).toISOString(),
    blink_count: r.blink_count,
    avg_ear: r.avg_ear,
    session_id: r.session_id,
  }));

  // Batch insert (Supabase handles up to 1000 per request)
  const batchSize = 500;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from('wellness_data').insert(batch);

    if (error) {
      result.failed += batch.length;
      result.errors.push(error.message);
    } else {
      result.synced += batch.length;
    }
  }

  return result;
}

/**
 * Sync an alert to Supabase (for admin visibility)
 */
export async function syncAlert(
  orgId: string,
  userId: string,
  alertType: string,
  severity: 'info' | 'warning' | 'critical',
  message: string
): Promise<{ error: Error | null }> {
  const supabase = getSupabase();

  const { error } = await supabase.from('org_alerts').insert({
    org_id: orgId,
    user_id: userId,
    alert_type: alertType,
    severity,
    message,
    acknowledged: false,
  });

  return { error: error ? new Error(error.message) : null };
}

/**
 * Check if online (simple connectivity check)
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Sync Queue Manager
 * Queues data when offline and syncs when online
 */
export class SyncQueue {
  private queue: MinuteRollup[] = [];
  private isSyncing = false;
  private orgId: string | null = null;
  private userId: string | null = null;
  private onSyncComplete?: (result: SyncResult) => void;

  constructor(options?: { onSyncComplete?: (result: SyncResult) => void }) {
    this.onSyncComplete = options?.onSyncComplete;

    // Listen for online event
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.flush());
    }
  }

  /**
   * Set organization and user IDs
   */
  setCredentials(orgId: string, userId: string): void {
    this.orgId = orgId;
    this.userId = userId;
  }

  /**
   * Add data to the sync queue
   */
  add(rollup: MinuteRollup): void {
    this.queue.push(rollup);

    // Try to sync if online
    if (isOnline() && !this.isSyncing) {
      this.flush();
    }
  }

  /**
   * Flush the queue (sync all pending data)
   */
  async flush(): Promise<SyncResult> {
    if (this.isSyncing || this.queue.length === 0) {
      return { synced: 0, failed: 0, errors: [] };
    }

    if (!this.orgId || !this.userId) {
      return { synced: 0, failed: 0, errors: ['Credentials not set'] };
    }

    if (!isOnline()) {
      return { synced: 0, failed: 0, errors: ['Offline'] };
    }

    this.isSyncing = true;
    const toSync = [...this.queue];
    this.queue = [];

    try {
      const result = await syncWellnessData(this.orgId, this.userId, toSync);

      // Re-queue failed items
      if (result.failed > 0) {
        const failedItems = toSync.slice(result.synced);
        this.queue.unshift(...failedItems);
      }

      if (this.onSyncComplete) {
        this.onSyncComplete(result);
      }

      return result;
    } catch (error) {
      // Re-queue all items on error
      this.queue.unshift(...toSync);
      return {
        synced: 0,
        failed: toSync.length,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Get queue size
   */
  getPendingCount(): number {
    return this.queue.length;
  }

  /**
   * Clear the queue (for testing)
   */
  clear(): void {
    this.queue = [];
  }
}
