/**
 * IPC Handlers
 * Bridge between main and renderer processes
 */

import { ipcMain, dialog, shell } from 'electron';
import * as fs from 'fs';
import { WindowManager } from './windows';
import { DatabaseManager, WellnessEventType } from './database';
import { SyncService } from './sync';
import { getSupabase, syncAlert, requestAccountDeletion } from '@lumina/api';

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
  // Store reference to window manager for notification click handling
  globalWindowManager = windowManager;

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

  // Google OAuth - opens browser, redirects to web callback, then deep links back
  // Flow: Desktop -> Browser -> Google -> Web callback page -> Deep link -> Desktop
  const WEB_CALLBACK_URL = 'https://lumina-rho-sandy.vercel.app/auth/desktop-callback';

  ipcMain.handle('auth:sign-in-with-google', async () => {
    try {
      const supabase = getSupabase();

      // Get the OAuth URL - redirect to web callback page (not deep link directly)
      // The web page will show "Open in Lumina?" and trigger the deep link
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: WEB_CALLBACK_URL,
          skipBrowserRedirect: true, // We'll open the browser ourselves
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.url) {
        // Open OAuth URL in system browser
        shell.openExternal(data.url);
        return { success: true };
      }

      return { success: false, error: 'No OAuth URL returned' };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

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
  // The Edge Function 'process-account-deletions' runs daily at 3 AM UTC
  // to permanently delete accounts marked for deletion > 30 days ago.
  ipcMain.handle('auth:request-account-deletion', async () => {
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Mark user for deletion in org_members table
      // The actual deletion is handled by the 'process-account-deletions' Edge Function
      const result = await requestAccountDeletion(user.id);

      return result;
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

  // ============================================================================
  // Meeting Mode
  // ============================================================================

  // Detect if a meeting app is currently running
  ipcMain.handle('meeting:detect-app', async () => {
    const { detectMeetingApp } = await import('./meetingMode');
    return detectMeetingApp();
  });

  // Get available screen capture sources
  ipcMain.handle('meeting:get-sources', async () => {
    const { getScreenSources } = await import('./meetingMode');
    const sources = await getScreenSources();
    // Convert to serializable format (thumbnails are NativeImage)
    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      displayId: s.display_id,
      thumbnail: s.thumbnail.toDataURL(),
    }));
  });

  // Get source ID for a specific display
  ipcMain.handle('meeting:get-source-id', async (_, displayId?: number) => {
    const { getSourceIdForDisplay } = await import('./meetingMode');
    return getSourceIdForDisplay(displayId);
  });

  // Get all available displays
  ipcMain.handle('meeting:get-displays', async () => {
    const { getDisplays } = await import('./meetingMode');
    return getDisplays();
  });

  // Get source ID for a specific window by app name (for window capture)
  ipcMain.handle('meeting:get-window-source-id', async (_, appName: string) => {
    const { getSourceIdForWindow } = await import('./meetingMode');
    return getSourceIdForWindow(appName);
  });

  // Helper function to capture a screenshot of a specific window or primary display
  async function captureScreenshot(windowTitlePattern?: string): Promise<{
    dataUrl: string;
    width: number;
    height: number;
    scaleFactor: number;
    isWindowCapture: boolean;
  } | null> {
    const { desktopCapturer, screen } = await import('electron');

    const primaryDisplay = screen.getPrimaryDisplay();
    const scaleFactor = primaryDisplay.scaleFactor;

    // If a window title pattern is provided, try to capture that specific window
    if (windowTitlePattern) {
      console.log(`[Screenshot] Looking for window matching: ${windowTitlePattern}`);

      // Get all windows
      const windowSources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: {
          width: Math.round(1920 * scaleFactor),
          height: Math.round(1080 * scaleFactor),
        },
        fetchWindowIcons: false,
      });

      // Find the matching window
      const pattern = new RegExp(windowTitlePattern, 'i');
      const matchingWindow = windowSources.find((s) => pattern.test(s.name));

      if (matchingWindow) {
        console.log(`[Screenshot] Found window: "${matchingWindow.name}"`);

        return {
          dataUrl: matchingWindow.thumbnail.toDataURL(),
          width: matchingWindow.thumbnail.getSize().width,
          height: matchingWindow.thumbnail.getSize().height,
          scaleFactor,
          isWindowCapture: true,
        };
      } else {
        console.log(`[Screenshot] No window found matching pattern, falling back to screen capture`);
      }
    }

    // Fallback: capture full screen
    const { width, height } = primaryDisplay.workAreaSize;
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.round(width * scaleFactor),
        height: Math.round(height * scaleFactor),
      },
    });

    const primarySource = sources.find((s) => s.display_id === '0') || sources[0];

    if (primarySource) {
      return {
        dataUrl: primarySource.thumbnail.toDataURL(),
        width: primarySource.thumbnail.getSize().width,
        height: primarySource.thumbnail.getSize().height,
        scaleFactor,
        isWindowCapture: false,
      };
    }

    return null;
  }

  // Capture a screenshot - can capture specific window by title pattern
  ipcMain.handle('meeting:capture-screenshot', async (_, windowTitlePattern?: string) => {
    return captureScreenshot(windowTitlePattern);
  });

  // Start meeting mode calibration (opens hub and triggers calibration UI)
  ipcMain.handle('meeting:start-calibration', async () => {
    // First detect which meeting app is active
    const { detectMeetingApp } = await import('./meetingMode');
    const detection = await detectMeetingApp();

    // Build window title pattern based on detected app
    let windowTitlePattern: string | undefined;
    if (detection.isDetected) {
      // Use patterns that match meeting windows
      if (detection.appName === 'Google Meet') {
        windowTitlePattern = 'Meet.*-.*-|meet\\.google\\.com';
      } else if (detection.appName === 'Zoom') {
        windowTitlePattern = 'Zoom Meeting|Zoom Webinar';
      } else if (detection.appName === 'Microsoft Teams') {
        windowTitlePattern = 'Microsoft Teams|teams\\.microsoft';
      }
    }

    // IMPORTANT: Capture screenshot FIRST while meeting is still visible
    // Try to capture just the meeting window, not the full screen
    const screenshot = await captureScreenshot(windowTitlePattern);

    // Now show the hub window (this will focus it, but we already have the screenshot)
    windowManager.showHubWindow();

    // Send event to trigger calibration UI with pre-captured screenshot
    windowManager.sendToHub('meeting-mode:start-calibration', {
      screenshot,
      appName: detection.appName,
    });
  });

  // ============================================================================
  // System Notifications
  // ============================================================================

  // Show a native system notification
  ipcMain.handle('notification:show', async (_, options: {
    title: string;
    body: string;
    silent?: boolean;
    type?: 'meeting-detected' | 'general';
  }) => {
    const { Notification } = await import('electron');

    if (!Notification.isSupported()) {
      console.log('[Notification] System notifications not supported');
      return { success: false, error: 'Notifications not supported' };
    }

    const notification = new Notification({
      title: options.title,
      body: options.body,
      silent: options.silent ?? false,
    });

    // Show the notification
    notification.show();

    // Handle click - bring app to focus and navigate based on type
    notification.on('click', () => {
      const wm = globalWindowManager;
      if (wm) {
        wm.showHubWindow();
        // For meeting-detected notifications, send event to navigate to Meeting Mode view
        if (options.type === 'meeting-detected') {
          wm.sendToHub('meeting-mode:navigate', {});
        }
      }
    });

    return { success: true };
  });
}
