/**
 * Preload Script
 * Exposes safe APIs to renderer process via contextBridge
 */

import { contextBridge, ipcRenderer } from 'electron';

// Type definitions for exposed API
export interface LuminaAPI {
  // Authentication
  auth: {
    sendOtp: (email: string) => Promise<AuthResult>;
    verifyOtp: (email: string, token: string) => Promise<AuthVerifyResult>;
    getSession: () => Promise<SessionResult>;
    getUser: () => Promise<UserResult>;
    signOut: () => Promise<AuthResult>;
    joinOrg: (inviteCode: string) => Promise<JoinOrgResult>;
    // Deep link listeners for magic link auth
    onDeepLinkSuccess: (callback: (data: { user: any }) => void) => () => void;
    onDeepLinkError: (callback: (data: { error: string }) => void) => () => void;
  };

  // Window Management
  window: {
    showHub: () => Promise<void>;
    hideHub: () => Promise<void>;
    toggleStatus: () => Promise<void>;
    showAlert: (alert: AlertData) => Promise<void>;
    hideAlert: () => Promise<void>;
  };

  // Database Operations
  database: {
    insertBlink: (timestamp: number, earValue: number, isBlink: boolean) => Promise<void>;
    insertRollup: (timestamp: number, blinkCount: number, avgEar: number | null) => Promise<void>;
    getUnsyncedRollups: (limit?: number) => Promise<RollupData[]>;
    markSynced: (ids: number[]) => Promise<void>;
    getRollups: (startTime: number, endTime: number) => Promise<RollupData[]>;
    getBaseline: () => Promise<BaselineData | null>;
    updateBaseline: (p25: number, p50: number, p75: number, samplesCount: number) => Promise<void>;
    cleanup: () => Promise<void>;
    getRecentBlinks: (minutes: number) => Promise<number>;
    getSessionStats: (sessionStartTime: number) => Promise<SessionStats>;
  };

  // Detection Events
  detection: {
    sendUpdate: (data: DetectionUpdate) => void;
    sendBlink: (data: BlinkData) => void;
    onToggle: (callback: () => void) => () => void;
  };

  // Alert Events
  alerts: {
    show: (alert: AlertData) => void;
    dismiss: () => void;
    snooze: (alertId: string, minutes: number) => void;
    onShow: (callback: (alert: AlertData) => void) => () => void;
    sync: (
      alertType: string,
      severity: 'info' | 'warning' | 'critical',
      message: string
    ) => Promise<{ success: boolean; error?: string }>;
  };

  // System
  system: {
    openExternal: (url: string) => Promise<void>;
    showSaveDialog: (options: SaveDialogOptions) => Promise<SaveDialogResult>;
    getAppPath: () => Promise<string>;
    writeFile: (filePath: string, content: string) => Promise<WriteFileResult>;
  };

  // Status Window
  status: {
    openHub: () => void;
    onUpdate: (callback: (data: DetectionUpdate) => void) => () => void;
    onBlink: (callback: (data: BlinkData) => void) => () => void;
  };

  // Navigation (for hub window)
  navigation: {
    onNavigate: (callback: (path: string) => void) => () => void;
  };

  // Sync Operations
  sync: {
    setCredentials: (orgId: string, userId: string) => Promise<{ success: boolean }>;
    clearCredentials: () => Promise<{ success: boolean }>;
    getStatus: () => Promise<SyncStatus>;
    trigger: () => Promise<SyncResult>;
    startAuto: (intervalMs?: number) => Promise<{ success: boolean }>;
    stopAuto: () => Promise<{ success: boolean }>;
  };
}

interface SyncStatus {
  isConfigured: boolean;
  isSyncing: boolean;
  pendingCount: number;
  credentials: { orgId: string; userId: string } | null;
}

interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

// Type definitions
interface AlertData {
  id: string;
  type?: 'low_blink' | 'critical_blink' | 'long_session' | 'poor_posture' | 'break_reminder' | 'posture' | 'session_start' | 'custom' | 'calibration_complete' | 'break_complete';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  action?: string;
}

interface RollupData {
  id: number;
  timestamp: number;
  blink_count: number;
  avg_ear: number | null;
  synced: number;
}

interface BaselineData {
  id: number;
  blink_p25: number | null;
  blink_p50: number | null;
  blink_p75: number | null;
  calibrated_at: number | null;
  samples_count: number;
}

interface SessionStats {
  totalBlinks: number;
  avgEar: number;
  minuteCount: number;
}

interface DetectionUpdate {
  blinkRate: number;
  wellnessScore: number;
  isDetecting: boolean;
  faceDetected: boolean;
}

interface BlinkData {
  ear: number;
  timestamp: number;
}

interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
}

interface SaveDialogResult {
  canceled: boolean;
  filePath?: string;
}

interface WriteFileResult {
  success: boolean;
  error?: string;
}

// Auth types
interface AuthResult {
  success: boolean;
  error?: string;
}

interface AuthVerifyResult {
  success: boolean;
  user?: any;
  session?: any;
  error?: string;
}

interface SessionResult {
  session: any | null;
  error: string | null;
}

interface AuthUser {
  id: string;
  email: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    role: 'admin' | 'manager' | 'employee';
    department: string | null;
  } | null;
}

interface UserResult {
  user: AuthUser | null;
  error: string | null;
}

interface JoinOrgResult {
  success: boolean;
  orgId?: string;
  orgName?: string;
  error?: string;
}

// Expose API to renderer
const luminaAPI: LuminaAPI = {
  auth: {
    sendOtp: (email) => ipcRenderer.invoke('auth:send-otp', email),
    verifyOtp: (email, token) => ipcRenderer.invoke('auth:verify-otp', email, token),
    getSession: () => ipcRenderer.invoke('auth:get-session'),
    getUser: () => ipcRenderer.invoke('auth:get-user'),
    signOut: () => ipcRenderer.invoke('auth:sign-out'),
    joinOrg: (inviteCode) => ipcRenderer.invoke('auth:join-org', inviteCode),
    // Deep link listeners for magic link auth
    onDeepLinkSuccess: (callback) => {
      const handler = (_: any, data: { user: any }) => callback(data);
      ipcRenderer.on('auth:deep-link-success', handler);
      return () => ipcRenderer.removeListener('auth:deep-link-success', handler);
    },
    onDeepLinkError: (callback) => {
      const handler = (_: any, data: { error: string }) => callback(data);
      ipcRenderer.on('auth:deep-link-error', handler);
      return () => ipcRenderer.removeListener('auth:deep-link-error', handler);
    },
  },

  window: {
    showHub: () => ipcRenderer.invoke('window:show-hub'),
    hideHub: () => ipcRenderer.invoke('window:hide-hub'),
    toggleStatus: () => ipcRenderer.invoke('window:toggle-status'),
    showAlert: (alert) => ipcRenderer.invoke('window:show-alert', alert),
    hideAlert: () => ipcRenderer.invoke('window:hide-alert'),
  },

  database: {
    insertBlink: (timestamp, earValue, isBlink) =>
      ipcRenderer.invoke('db:insert-blink', timestamp, earValue, isBlink),
    insertRollup: (timestamp, blinkCount, avgEar) =>
      ipcRenderer.invoke('db:insert-rollup', timestamp, blinkCount, avgEar),
    getUnsyncedRollups: (limit) => ipcRenderer.invoke('db:get-unsynced-rollups', limit),
    markSynced: (ids) => ipcRenderer.invoke('db:mark-synced', ids),
    getRollups: (startTime, endTime) => ipcRenderer.invoke('db:get-rollups', startTime, endTime),
    getBaseline: () => ipcRenderer.invoke('db:get-baseline'),
    updateBaseline: (p25, p50, p75, samplesCount) =>
      ipcRenderer.invoke('db:update-baseline', p25, p50, p75, samplesCount),
    cleanup: () => ipcRenderer.invoke('db:cleanup'),
    getRecentBlinks: (minutes) => ipcRenderer.invoke('db:get-recent-blinks', minutes),
    getSessionStats: (sessionStartTime) =>
      ipcRenderer.invoke('db:get-session-stats', sessionStartTime),
  },

  detection: {
    sendUpdate: (data) => ipcRenderer.send('detection:update', data),
    sendBlink: (data) => ipcRenderer.send('detection:blink', data),
    onToggle: (callback) => {
      const handler = () => callback();
      ipcRenderer.on('toggle-detection', handler);
      return () => ipcRenderer.removeListener('toggle-detection', handler);
    },
  },

  alerts: {
    show: (alert) => ipcRenderer.send('alert:show', alert),
    dismiss: () => ipcRenderer.send('alert:dismiss'),
    snooze: (alertId, minutes) => ipcRenderer.send('alert:snooze', alertId, minutes),
    onShow: (callback) => {
      const handler = (_: any, alert: AlertData) => callback(alert);
      ipcRenderer.on('show-alert', handler);
      return () => ipcRenderer.removeListener('show-alert', handler);
    },
    sync: (alertType, severity, message) =>
      ipcRenderer.invoke('alert:sync', alertType, severity, message),
  },

  system: {
    openExternal: (url) => ipcRenderer.invoke('system:open-external', url),
    showSaveDialog: (options) => ipcRenderer.invoke('system:show-save-dialog', options),
    getAppPath: () => ipcRenderer.invoke('system:get-app-path'),
    writeFile: (filePath, content) => ipcRenderer.invoke('system:write-file', filePath, content),
  },

  status: {
    openHub: () => ipcRenderer.send('status:open-hub'),
    onUpdate: (callback) => {
      const handler = (_: any, data: DetectionUpdate) => callback(data);
      ipcRenderer.on('detection:update', handler);
      return () => ipcRenderer.removeListener('detection:update', handler);
    },
    onBlink: (callback) => {
      const handler = (_: any, data: BlinkData) => callback(data);
      ipcRenderer.on('detection:blink', handler);
      return () => ipcRenderer.removeListener('detection:blink', handler);
    },
  },

  navigation: {
    onNavigate: (callback) => {
      const handler = (_: any, path: string) => callback(path);
      ipcRenderer.on('navigate', handler);
      return () => ipcRenderer.removeListener('navigate', handler);
    },
  },

  sync: {
    setCredentials: (orgId, userId) => ipcRenderer.invoke('sync:set-credentials', orgId, userId),
    clearCredentials: () => ipcRenderer.invoke('sync:clear-credentials'),
    getStatus: () => ipcRenderer.invoke('sync:get-status'),
    trigger: () => ipcRenderer.invoke('sync:trigger'),
    startAuto: (intervalMs) => ipcRenderer.invoke('sync:start-auto', intervalMs),
    stopAuto: () => ipcRenderer.invoke('sync:stop-auto'),
  },
};

contextBridge.exposeInMainWorld('lumina', luminaAPI);

// Type declaration for renderer
declare global {
  interface Window {
    lumina: LuminaAPI;
  }
}
