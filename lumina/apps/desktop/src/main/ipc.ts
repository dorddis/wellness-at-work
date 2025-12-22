/**
 * IPC Handlers
 * Bridge between main and renderer processes
 */

import { ipcMain, dialog, shell } from 'electron';
import * as fs from 'fs';
import { WindowManager } from './windows';
import { DatabaseManager, WellnessEventType } from './database';
import { SyncService } from './sync';
import { getSupabase, syncAlert } from '@lumina/api';

// Store reference to window manager for deep link handling
let globalWindowManager: WindowManager | null = null;

/**
 * Handle deep link URL from magic link authentication
 * URL format: lumina://auth/callback#access_token=...&refresh_token=...&type=magiclink
 */
export function handleDeepLink(url: string, windowManager: WindowManager): void {
  try {
    console.log('Processing deep link:', url);

    // Parse the URL - Supabase returns tokens in the hash fragment
    const parsed = new URL(url);

    // Extract hash fragment (remove leading #)
    const hashParams = new URLSearchParams(parsed.hash.slice(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');

    if (accessToken && refreshToken) {
      console.log('Found tokens in deep link, completing auth...');

      // Set session in Supabase client
      const supabase = getSupabase();
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ data, error }) => {
        if (error) {
          console.error('Failed to set session from deep link:', error);
          windowManager.sendToHub('auth:deep-link-error', { error: error.message });
        } else {
          console.log('Session set successfully from deep link');
          windowManager.sendToHub('auth:deep-link-success', { user: data.user });
        }
      });
    } else {
      console.log('No tokens found in deep link URL');
      windowManager.sendToHub('auth:deep-link-error', { error: 'No tokens in magic link' });
    }
  } catch (err) {
    console.error('Failed to parse deep link URL:', err);
    windowManager.sendToHub('auth:deep-link-error', { error: String(err) });
  }
}

export function setupIPC(
  windowManager: WindowManager,
  database: DatabaseManager,
  syncService: SyncService
): void {
  // ============================================================================
  // Window Management
  // ============================================================================

  ipcMain.handle('window:show-hub', () => {
    windowManager.showHubWindow();
  });

  ipcMain.handle('window:hide-hub', () => {
    windowManager.hideHubWindow();
  });

  ipcMain.handle('window:toggle-status', () => {
    windowManager.toggleStatusWindow();
  });

  ipcMain.handle('window:show-alert', (_, alert) => {
    windowManager.showAlert(alert);
  });

  ipcMain.handle('window:hide-alert', () => {
    windowManager.hideAlert();
  });

  // Window controls (for frameless window)
  ipcMain.handle('window:minimize', () => {
    const win = windowManager.getHubWindow();
    if (win && !win.isDestroyed()) {
      win.minimize();
    }
  });

  ipcMain.handle('window:maximize', () => {
    const win = windowManager.getHubWindow();
    if (win && !win.isDestroyed()) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  ipcMain.handle('window:close', () => {
    const win = windowManager.getHubWindow();
    if (win && !win.isDestroyed()) {
      win.hide(); // Hide instead of close (matches existing behavior)
    }
  });

  ipcMain.handle('window:is-maximized', () => {
    const win = windowManager.getHubWindow();
    return win && !win.isDestroyed() ? win.isMaximized() : false;
  });

  // ============================================================================
  // Database Operations
  // ============================================================================

  ipcMain.handle('db:insert-blink', (_, timestamp: number, earValue: number, isBlink: boolean) => {
    database.insertBlinkEvent(timestamp, earValue, isBlink);
  });

  ipcMain.handle('db:insert-rollup', (_, timestamp: number, blinkCount: number, avgEar: number | null) => {
    database.insertMinuteRollup(timestamp, blinkCount, avgEar);
  });

  ipcMain.handle('db:get-unsynced-rollups', (_, limit: number = 100) => {
    return database.getUnsyncedRollups(limit);
  });

  ipcMain.handle('db:mark-synced', (_, ids: number[]) => {
    database.markRollupsSynced(ids);
  });

  ipcMain.handle('db:get-rollups', (_, startTime: number, endTime: number) => {
    return database.getRollups(startTime, endTime);
  });

  ipcMain.handle('db:get-baseline', () => {
    return database.getBaseline();
  });

  ipcMain.handle('db:update-baseline', (_, p25: number, p50: number, p75: number, samplesCount: number) => {
    database.updateBaseline(p25, p50, p75, samplesCount);
  });

  ipcMain.handle('db:cleanup', () => {
    database.cleanup();
  });

  ipcMain.handle('db:get-recent-blinks', (_, minutes: number) => {
    return database.getRecentBlinkCount(minutes);
  });

  ipcMain.handle('db:get-session-stats', (_, sessionStartTime: number) => {
    return database.getSessionStats(sessionStartTime);
  });

  // ============================================================================
  // Wellness Events
  // ============================================================================

  ipcMain.handle('db:insert-wellness-event', (
    _,
    timestamp: number,
    eventType: WellnessEventType,
    payload?: object
  ) => {
    database.insertWellnessEvent(timestamp, eventType, payload);
  });

  ipcMain.handle('db:get-wellness-events', (
    _,
    startTime: number,
    endTime: number,
    eventType?: WellnessEventType
  ) => {
    return database.getWellnessEvents(startTime, endTime, eventType);
  });

  ipcMain.handle('db:get-today-wellness-stats', () => {
    return database.getTodayWellnessStats();
  });

  ipcMain.handle('db:get-recent-wellness-events', (_, minutes: number) => {
    return database.getRecentWellnessEvents(minutes);
  });

  // ============================================================================
  // Exercise Operations
  // ============================================================================

  ipcMain.handle('exercises:get-all', () => {
    return database.getExercises();
  });

  ipcMain.handle('exercises:get', (_, exerciseId: string) => {
    return database.getExercise(exerciseId);
  });

  ipcMain.handle('exercises:start-session', (_, exerciseId: string) => {
    const sessionId = database.startExerciseSession(exerciseId);
    return { success: sessionId !== null, sessionId };
  });

  ipcMain.handle('exercises:complete-session', (_, sessionId: number) => {
    database.completeExerciseSession(sessionId);
    return { success: true };
  });

  ipcMain.handle('exercises:cancel-session', (_, sessionId: number) => {
    database.cancelExerciseSession(sessionId);
    return { success: true };
  });

  ipcMain.handle('exercises:get-sessions', (_, days: number = 30) => {
    return database.getExerciseSessions(days);
  });

  ipcMain.handle('exercises:get-stats', (_, days: number = 7) => {
    return database.getExerciseStats(days);
  });

  // ============================================================================
  // Detection State Updates
  // ============================================================================

  // Forward detection updates to status window
  ipcMain.on('detection:update', (_, data: {
    blinkRate: number;
    wellnessScore: number;
    isDetecting: boolean;
    faceDetected: boolean;
  }) => {
    windowManager.sendToStatus('detection:update', data);
  });

  // Forward blink events
  ipcMain.on('detection:blink', (_, data: {
    ear: number;
    timestamp: number;
  }) => {
    windowManager.sendToStatus('detection:blink', data);
  });

  // ============================================================================
  // Alert Handling
  // ============================================================================

  ipcMain.on('alert:show', (_, alert) => {
    windowManager.showAlert(alert);
  });

  ipcMain.on('alert:dismiss', () => {
    windowManager.hideAlert();
  });

  ipcMain.on('alert:snooze', (_, alertId: string, minutes: number) => {
    windowManager.hideAlert();
    // The snooze logic is handled in the renderer by the alert engine
  });

  // Sync alert to Supabase
  ipcMain.handle('alert:sync', async (
    _,
    alertType: string,
    severity: 'info' | 'warning' | 'critical',
    message: string
  ) => {
    const credentials = syncService.getCredentials();
    if (!credentials || !credentials.orgId || !credentials.userId) {
      return { success: false, error: 'Not authenticated' };
    }
    const result = await syncAlert(
      credentials.orgId,
      credentials.userId,
      alertType,
      severity,
      message
    );
    return { success: !result.error, error: result.error?.message };
  });

  // ============================================================================
  // System Integration
  // ============================================================================

  ipcMain.handle('system:open-external', (_, url: string) => {
    shell.openExternal(url);
  });

  ipcMain.handle('system:show-save-dialog', async (_, options) => {
    const result = await dialog.showSaveDialog(options);
    return result;
  });

  ipcMain.handle('system:get-app-path', () => {
    const { app } = require('electron');
    return app.getPath('userData');
  });

  ipcMain.handle('system:write-file', async (_, filePath: string, content: string) => {
    try {
      fs.writeFileSync(filePath, content, 'utf8');
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // ============================================================================
  // Status Window Commands
  // ============================================================================

  // Open hub from status window
  ipcMain.on('status:open-hub', () => {
    windowManager.showHubWindow();
  });

  // ============================================================================
  // Sync Operations
  // ============================================================================

  ipcMain.handle('sync:set-credentials', (_, orgId: string, userId: string) => {
    syncService.setCredentials(orgId, userId);
    return { success: true };
  });

  ipcMain.handle('sync:clear-credentials', () => {
    syncService.clearCredentials();
    return { success: true };
  });

  ipcMain.handle('sync:get-status', () => {
    return syncService.getStatus();
  });

  ipcMain.handle('sync:trigger', async () => {
    return await syncService.sync();
  });

  ipcMain.handle('sync:start-auto', (_, intervalMs?: number) => {
    syncService.startAutoSync(intervalMs);
    return { success: true };
  });

  ipcMain.handle('sync:stop-auto', () => {
    syncService.stopAutoSync();
    return { success: true };
  });

  // ============================================================================
  // Authentication
  // ============================================================================

  // Send OTP code to email
  // NOTE: For this to send a 6-digit code instead of a magic link,
  // configure the email template in Supabase Dashboard > Auth > Email Templates
  // Change the Magic Link template to show: "Your code is: {{ .Token }}"
  ipcMain.handle('auth:send-otp', async (_, email: string) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // Verify OTP code from email
  ipcMain.handle('auth:verify-otp', async (_, email: string, token: string) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, user: data.user, session: data.session };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // Get current session
  ipcMain.handle('auth:get-session', async () => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        return { session: null, error: error.message };
      }
      return { session: data.session, error: null };
    } catch (err) {
      return { session: null, error: String(err) };
    }
  });

  // Get current user with organization info
  ipcMain.handle('auth:get-user', async () => {
    try {
      const supabase = getSupabase();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        return { user: null, error: userError?.message ?? 'Not authenticated' };
      }

      // Get organization membership
      const { data: membership } = await supabase
        .from('org_members')
        .select(`
          role,
          department,
          organizations (
            id,
            name,
            slug
          )
        `)
        .eq('user_id', user.id)
        .single();

      const org = membership?.organizations as {
        id: string;
        name: string;
        slug: string;
      } | null;

      return {
        user: {
          id: user.id,
          email: user.email ?? '',
          organization: org && membership ? {
            id: org.id,
            name: org.name,
            slug: org.slug,
            role: membership.role as 'admin' | 'manager' | 'employee',
            department: membership.department,
          } : null,
        },
        error: null,
      };
    } catch (err) {
      return { user: null, error: String(err) };
    }
  });

  // Sign out
  ipcMain.handle('auth:sign-out', async () => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signOut();
      // Clear sync credentials on sign out
      syncService.clearCredentials();
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // Join organization with invite code
  ipcMain.handle('auth:join-org', async (_, inviteCode: string) => {
    try {
      const supabase = getSupabase();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Find organization by slug (invite code = slug)
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('slug', inviteCode.toLowerCase())
        .single();

      if (orgError || !org) {
        return { success: false, error: 'Invalid invite code' };
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from('org_members')
        .select('id')
        .eq('org_id', org.id)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        // Already a member - just set sync credentials
        syncService.setCredentials(org.id, user.id);
        return { success: true, orgId: org.id, orgName: org.name };
      }

      // Add user to organization
      const { error: memberError } = await supabase.from('org_members').insert({
        org_id: org.id,
        user_id: user.id,
        role: 'employee',
        department: null,
      });

      if (memberError) {
        return { success: false, error: memberError.message };
      }

      // Set sync credentials
      syncService.setCredentials(org.id, user.id);

      return { success: true, orgId: org.id, orgName: org.name };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // Request account deletion (30-day grace period)
  ipcMain.handle('auth:request-account-deletion', async () => {
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Calculate deletion date (30 days from now)
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + 30);

      // TODO: In production, you would call an API to schedule deletion
      // For now, we'll just return the scheduled date
      // The actual deletion would be handled by a backend job

      return {
        success: true,
        deletionDate: deletionDate.toISOString(),
      };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // ============================================================================
  // Data Management
  // ============================================================================

  // Export all user data
  ipcMain.handle('db:export-data', () => {
    try {
      const data = database.exportAllData();
      return { success: true, data };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // Clear all local data
  ipcMain.handle('db:clear-all-data', () => {
    try {
      database.clearAllData();
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });
}
