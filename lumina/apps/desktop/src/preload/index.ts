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
    signInWithGoogle: () => Promise<AuthResult>;
    getSession: () => Promise<SessionResult>;
    getUser: () => Promise<UserResult>;
    signOut: () => Promise<AuthResult>;
    joinOrg: (inviteCode: string) => Promise<JoinOrgResult>;
    requestAccountDeletion: () => Promise<AccountDeletionResult>;
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
    // Frameless window controls
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
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
    // Wellness events
    insertWellnessEvent: (timestamp: number, eventType: WellnessEventType, payload?: object) => Promise<void>;
    getWellnessEvents: (startTime: number, endTime: number, eventType?: WellnessEventType) => Promise<WellnessEvent[]>;
    getTodayWellnessStats: () => Promise<WellnessStats>;
    getRecentWellnessEvents: (minutes: number) => Promise<WellnessEvent[]>;
    // Data management
    exportData: () => Promise<ExportDataResult>;
    clearAllData: () => Promise<ClearDataResult>;
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
    openHub: () => Promise<void>;
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

  // Exercises
  exercises: {
    getAll: () => Promise<EyeExercise[]>;
    get: (exerciseId: string) => Promise<EyeExercise | undefined>;
    startSession: (exerciseId: string) => Promise<{ success: boolean; sessionId?: number }>;
    completeSession: (sessionId: number) => Promise<{ success: boolean }>;
    cancelSession: (sessionId: number) => Promise<{ success: boolean }>;
    getSessions: (days?: number) => Promise<ExerciseSession[]>;
    getStats: (days?: number) => Promise<ExerciseStats>;
  };

  // Meeting Mode
  meetingMode: {
    detectApp: () => Promise<MeetingDetectionResult>;
    getSources: () => Promise<ScreenSource[]>;
    getSourceId: (displayId?: number) => Promise<string | null>;
    getDisplays: () => Promise<DisplayInfo[]>;
    captureScreenshot: () => Promise<ScreenshotResult | null>;
    /** Opens hub and triggers meeting mode calibration */
    startCalibration: () => Promise<void>;
  };

  // System Notifications
  notification: {
    show: (options: { title: string; body: string; silent?: boolean; type?: 'meeting-detected' | 'general' }) => Promise<{ success: boolean; error?: string }>;
  };

  // Meeting Mode Navigation (from notification clicks)
  onMeetingModeNavigate: (callback: () => void) => () => void;
  offMeetingModeNavigate: (callback: () => void) => void;

  // Meeting Mode Start Calibration (from alert action button)
  onMeetingModeStartCalibration: (callback: () => void) => () => void;
}

interface ScreenshotResult {
  dataUrl: string;
  width: number;
  height: number;
  scaleFactor: number;
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
  type?:
    | 'low_blink' | 'critical_blink' | 'long_session' | 'poor_posture'
    | 'break_reminder' | 'posture' | 'session_start' | 'custom'
    | 'calibration_complete' | 'break_complete'
    // Wellness alert types
    | 'too_close' | 'too_far' | 'head_tilt' | 'forward_lean'
    | 'drowsy_mild' | 'drowsy_moderate' | 'drowsy_severe' | 'frequent_yawning'
    // Meeting mode alerts
    | 'meeting_detected' | 'meeting_mode_active' | 'meeting_mode_error';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  action?: string;
  /** Button text for primary action (e.g., "Set Up Now") */
  actionButtonText?: string;
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

// Wellness event types
type WellnessEventType =
  | 'yawn'
  | 'posture_too_close'
  | 'posture_too_far'
  | 'posture_head_tilt'
  | 'posture_forward_lean'
  | 'drowsiness_mild'
  | 'drowsiness_moderate'
  | 'drowsiness_severe';

interface WellnessEvent {
  id?: number;
  timestamp: number;
  event_type: WellnessEventType;
  payload: string | null;
}

interface WellnessStats {
  yawnCount: number;
  postureIssueCount: number;
  drowsinessEventCount: number;
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

interface AccountDeletionResult {
  success: boolean;
  deletionDate?: string;
  error?: string;
}

interface ExportDataResult {
  success: boolean;
  data?: any;
  error?: string;
}

interface ClearDataResult {
  success: boolean;
  error?: string;
}

// Exercise types
interface ExerciseStep {
  step: number;
  text: string;
  duration: number;
}

interface EyeExercise {
  id: string;
  name: string;
  description: string;
  category: 'relaxation' | 'focus' | 'mobility' | 'strain_relief';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  durationSeconds: number;
  iconName: string;
  instructions: ExerciseStep[];
}

interface ExerciseSession {
  id?: number;
  exercise_id: string;
  started_at: number;
  completed_at: number | null;
  status: 'in_progress' | 'completed' | 'cancelled';
}

interface ExerciseStats {
  todaySessions: number;
  todayMinutes: number;
  weekSessions: number;
  weekMinutes: number;
  totalSessions: number;
}

// Meeting Mode types
interface MeetingDetectionResult {
  isDetected: boolean;
  appName: string | null;
  processName?: string;
}

interface ScreenSource {
  id: string;
  name: string;
  displayId: string;
  thumbnail: string; // Base64 data URL
}

interface DisplayInfo {
  id: number;
  label: string;
  bounds: { x: number; y: number; width: number; height: number };
  isPrimary: boolean;
}

// Expose API to renderer
const luminaAPI: LuminaAPI = {
  auth: {
    sendOtp: (email) => ipcRenderer.invoke('auth:send-otp', email),
    verifyOtp: (email, token) => ipcRenderer.invoke('auth:verify-otp', email, token),
    signInWithGoogle: () => ipcRenderer.invoke('auth:sign-in-with-google'),
    getSession: () => ipcRenderer.invoke('auth:get-session'),
    getUser: () => ipcRenderer.invoke('auth:get-user'),
    signOut: () => ipcRenderer.invoke('auth:sign-out'),
    joinOrg: (inviteCode) => ipcRenderer.invoke('auth:join-org', inviteCode),
    requestAccountDeletion: () => ipcRenderer.invoke('auth:request-account-deletion'),
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
    // Frameless window controls
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
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
    // Wellness events
    insertWellnessEvent: (timestamp, eventType, payload) =>
      ipcRenderer.invoke('db:insert-wellness-event', timestamp, eventType, payload),
    getWellnessEvents: (startTime, endTime, eventType) =>
      ipcRenderer.invoke('db:get-wellness-events', startTime, endTime, eventType),
    getTodayWellnessStats: () => ipcRenderer.invoke('db:get-today-wellness-stats'),
    getRecentWellnessEvents: (minutes) =>
      ipcRenderer.invoke('db:get-recent-wellness-events', minutes),
    // Data management
    exportData: () => ipcRenderer.invoke('db:export-data'),
    clearAllData: () => ipcRenderer.invoke('db:clear-all-data'),
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
    openHub: () => ipcRenderer.invoke('window:show-hub'),
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

  exercises: {
    getAll: () => ipcRenderer.invoke('exercises:get-all'),
    get: (exerciseId) => ipcRenderer.invoke('exercises:get', exerciseId),
    startSession: (exerciseId) => ipcRenderer.invoke('exercises:start-session', exerciseId),
    completeSession: (sessionId) => ipcRenderer.invoke('exercises:complete-session', sessionId),
    cancelSession: (sessionId) => ipcRenderer.invoke('exercises:cancel-session', sessionId),
    getSessions: (days) => ipcRenderer.invoke('exercises:get-sessions', days),
    getStats: (days) => ipcRenderer.invoke('exercises:get-stats', days),
  },

  meetingMode: {
    detectApp: () => ipcRenderer.invoke('meeting:detect-app'),
    getSources: () => ipcRenderer.invoke('meeting:get-sources'),
    getSourceId: (displayId) => ipcRenderer.invoke('meeting:get-source-id', displayId),
    getDisplays: () => ipcRenderer.invoke('meeting:get-displays'),
    captureScreenshot: () => ipcRenderer.invoke('meeting:capture-screenshot'),
    startCalibration: () => ipcRenderer.invoke('meeting:start-calibration'),
  },

  notification: {
    show: (options) => ipcRenderer.invoke('notification:show', options),
  },

  // Meeting Mode Navigation (from notification clicks)
  onMeetingModeNavigate: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('meeting-mode:navigate', handler);
    return () => ipcRenderer.removeListener('meeting-mode:navigate', handler);
  },
  offMeetingModeNavigate: (callback) => {
    // Remove listener by reference - but typically the returned cleanup function should be used
    ipcRenderer.removeAllListeners('meeting-mode:navigate');
  },

  // Meeting Mode Start Calibration (from alert action button)
  onMeetingModeStartCalibration: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('meeting-mode:start-calibration', handler);
    return () => ipcRenderer.removeListener('meeting-mode:start-calibration', handler);
  },
};

contextBridge.exposeInMainWorld('lumina', luminaAPI);

// Type declaration for renderer
declare global {
  interface Window {
    lumina: LuminaAPI;
  }
}
