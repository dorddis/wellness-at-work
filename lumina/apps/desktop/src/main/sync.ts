/**
 * Sync Service
 * Handles syncing local SQLite data to Supabase cloud
 */

import { initializeSupabase, getSupabase, syncWellnessData, type MinuteRollup } from '@lumina/api';
import { DatabaseManager } from './database';
import Store from 'electron-store';
import { net } from 'electron';

// Safe logger that catches EPIPE errors (broken pipe when stdout is closed)
function safeLog(...args: unknown[]): void {
  try {
    console.log(...args);
  } catch {
    // Ignore EPIPE errors - stdout may be closed during shutdown
  }
}

function safeError(...args: unknown[]): void {
  try {
    console.error(...args);
  } catch {
    // Ignore EPIPE errors
  }
}

interface SyncCredentials {
  orgId: string;
  userId: string;
}

interface SyncConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

// Persistent store for credentials
const store = new Store<{
  syncCredentials?: SyncCredentials;
  syncConfig?: SyncConfig;
}>({
  name: 'lumina-sync',
});

export class SyncService {
  private database: DatabaseManager;
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private credentials: SyncCredentials | null = null;
  private isInitialized = false;

  constructor(database: DatabaseManager) {
    this.database = database;
    // Load saved credentials
    this.credentials = store.get('syncCredentials') ?? null;
  }

  /**
   * Initialize Supabase client with config
   */
  async initialize(config?: SyncConfig): Promise<boolean> {
    try {
      // Default Supabase config (real project)
      const defaultUrl = 'https://acvmkigubzldhpyrlail.supabase.co';
      const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdm1raWd1YnpsZGhweXJsYWlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNDI0ODIsImV4cCI6MjA4MTcxODQ4Mn0.K9qSjNvjl1Nmro06J5pDbWaWK3jcSGWOgigxe35fZ0k';

      // Use provided config or load from store
      let syncConfig = config ?? store.get('syncConfig');

      // Clear stale config if it uses old placeholder URL
      if (syncConfig && syncConfig.supabaseUrl.includes('gdfjmpmkwfqcepfzxpen')) {
        safeLog('Sync: Clearing stale config with old placeholder URL');
        store.delete('syncConfig');
        syncConfig = undefined;
      }

      if (!syncConfig) {
        safeLog('Sync: No Supabase config found, using defaults');
        // Use environment variables or defaults
        const url = process.env.SUPABASE_URL ?? defaultUrl;
        const key = process.env.SUPABASE_ANON_KEY ?? defaultKey;

        initializeSupabase(url, key);
        store.set('syncConfig', { supabaseUrl: url, supabaseKey: key });
      } else {
        initializeSupabase(syncConfig.supabaseUrl, syncConfig.supabaseKey);
      }

      this.isInitialized = true;
      safeLog('Sync: Supabase client initialized');
      return true;
    } catch (error) {
      safeError('Sync: Failed to initialize Supabase:', error);
      return false;
    }
  }

  /**
   * Set sync credentials (org and user IDs)
   */
  setCredentials(orgId: string, userId: string): void {
    this.credentials = { orgId, userId };
    store.set('syncCredentials', this.credentials);
    safeLog('Sync: Credentials set for org:', orgId);
  }

  /**
   * Clear credentials (on logout)
   */
  clearCredentials(): void {
    this.credentials = null;
    store.delete('syncCredentials');
  }

  /**
   * Get current credentials
   */
  getCredentials(): SyncCredentials | null {
    return this.credentials;
  }

  /**
   * Check if sync is configured
   */
  isConfigured(): boolean {
    return this.isInitialized && this.credentials !== null;
  }

  /**
   * Start automatic sync (every 5 minutes)
   */
  startAutoSync(intervalMs: number = 5 * 60 * 1000): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Initial sync after 30 seconds
    setTimeout(() => this.sync(), 30000);

    // Then sync periodically
    this.syncInterval = setInterval(() => this.sync(), intervalMs);
    safeLog(`Sync: Auto-sync started (every ${intervalMs / 1000}s)`);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      safeLog('Sync: Auto-sync stopped');
    }
  }

  /**
   * Perform sync operation
   */
  async sync(): Promise<{ synced: number; failed: number; errors: string[] }> {
    if (this.isSyncing) {
      safeLog('Sync: Already syncing, skipping');
      return { synced: 0, failed: 0, errors: ['Already syncing'] };
    }

    if (!this.isConfigured()) {
      safeLog('Sync: Not configured, skipping');
      return { synced: 0, failed: 0, errors: ['Not configured'] };
    }

    if (!net.isOnline()) {
      safeLog('Sync: Offline, skipping');
      return { synced: 0, failed: 0, errors: ['Offline'] };
    }

    this.isSyncing = true;
    const result = { synced: 0, failed: 0, errors: [] as string[] };

    try {
      // Get unsynced rollups from local database
      const unsyncedRollups = this.database.getUnsyncedRollups(500);

      if (unsyncedRollups.length === 0) {
        safeLog('Sync: No data to sync');
        return result;
      }

      safeLog(`Sync: Found ${unsyncedRollups.length} unsynced rollups`);

      // Convert to API format
      const rollups: MinuteRollup[] = unsyncedRollups.map((r) => ({
        timestamp: r.timestamp,
        blink_count: r.blink_count,
        avg_ear: r.avg_ear,
        session_id: null, // Could track session IDs later
      }));

      // Sync to Supabase
      const syncResult = await syncWellnessData(
        this.credentials!.orgId,
        this.credentials!.userId,
        rollups
      );

      result.synced = syncResult.synced;
      result.failed = syncResult.failed;
      result.errors = syncResult.errors;

      // Mark successfully synced rollups
      if (syncResult.synced > 0) {
        const syncedIds = unsyncedRollups
          .slice(0, syncResult.synced)
          .map((r) => r.id!)
          .filter((id) => id !== undefined);

        if (syncedIds.length > 0) {
          this.database.markRollupsSynced(syncedIds);
        }
      }

      safeLog(`Sync: Completed - ${result.synced} synced, ${result.failed} failed`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMsg);
      safeError('Sync: Error during sync:', errorMsg);
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Get sync status
   */
  getStatus(): {
    isConfigured: boolean;
    isSyncing: boolean;
    pendingCount: number;
    credentials: SyncCredentials | null;
  } {
    return {
      isConfigured: this.isConfigured(),
      isSyncing: this.isSyncing,
      pendingCount: this.database.getUnsyncedRollups(1000).length,
      credentials: this.credentials,
    };
  }
}
