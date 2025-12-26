import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SoundPreference = 'silence' | 'chime' | 'bell' | 'soft-ping' | 'nature';

/** Full EAR calibration data for persistence */
export interface StoredEARCalibration {
  /** Computed optimal threshold for this user */
  threshold: number;
  /** 75th percentile - typical open eye EAR */
  openEAR: number;
  /** 10th percentile - typical closed eye EAR */
  closedEAR: number;
  /** When calibration was completed (ISO string) */
  calibratedAt: string;
  /** Number of samples used */
  samplesCount: number;
}

export interface SettingsState {
  // User preferences
  notifications: boolean;
  soundEffects: boolean;
  autoStart: boolean;
  showFloatingStatus: boolean;

  // Camera settings
  selectedCameraId: string | null;

  // Detection settings
  earThreshold: number;
  earCalibration: StoredEARCalibration | null;
  alertCooldownMinutes: number;

  // Break settings
  breakIntervalMinutes: number;
  breakDurationSeconds: number;
  longBreakIntervalMinutes: number;
  longBreakDurationMinutes: number;
  preNotificationSeconds: number;
  maxPostpones: number;

  // Sound settings
  soundPreference: SoundPreference;
  soundVolume: number; // 0-100

  // Posture settings
  postureMonitoringEnabled: boolean;
  postureSensitivity: 'low' | 'medium' | 'high';

  // Onboarding
  hasCompletedOnboarding: boolean;
  onboardingStep: number;
  hasCompletedProductTour: boolean;

  // Wellness goals (set during onboarding)
  wellnessGoals: {
    reduceEyeStrain: boolean;
    improvePosture: boolean;
    takeRegularBreaks: boolean;
  };

  // Appearance
  theme: 'light' | 'dark' | 'system';

  // Privacy & Sync (GDPR compliance)
  cloudSyncEnabled: boolean; // Local-only mode when false

  // Organization (B2B)
  orgId: string | null;
  orgName: string | null;
  userRole: 'admin' | 'manager' | 'employee' | null;

  // User tracking (for per-user onboarding)
  lastUserId: string | null;

  // Actions
  setNotifications: (enabled: boolean) => void;
  setSoundEffects: (enabled: boolean) => void;
  setAutoStart: (enabled: boolean) => void;
  setShowFloatingStatus: (enabled: boolean) => void;
  setSelectedCameraId: (cameraId: string | null) => void;
  setEarThreshold: (threshold: number) => void;
  setEarCalibration: (calibration: StoredEARCalibration | null) => void;
  setAlertCooldownMinutes: (minutes: number) => void;
  setBreakSettings: (settings: {
    breakIntervalMinutes?: number;
    breakDurationSeconds?: number;
    longBreakIntervalMinutes?: number;
    longBreakDurationMinutes?: number;
    preNotificationSeconds?: number;
    maxPostpones?: number;
  }) => void;
  setSoundPreference: (sound: SoundPreference) => void;
  setSoundVolume: (volume: number) => void;
  setPostureMonitoringEnabled: (enabled: boolean) => void;
  setPostureSensitivity: (sensitivity: 'low' | 'medium' | 'high') => void;
  setOnboardingComplete: () => void;
  setOnboardingStep: (step: number) => void;
  setProductTourComplete: () => void;
  setWellnessGoals: (goals: Partial<SettingsState['wellnessGoals']>) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setCloudSyncEnabled: (enabled: boolean) => void;
  setOrganization: (orgId: string, orgName: string, role: 'admin' | 'manager' | 'employee') => void;
  clearOrganization: () => void;
  resetForNewUser: (userId: string, forceReset?: boolean) => void;
  reset: () => void;
}

// Demo mode: Read from environment variable (set in .env file)
// Falls back to false if not set
const DEMO_MODE = typeof import.meta !== 'undefined'
  ? import.meta.env?.VITE_DEMO_MODE === 'true'
  : false;

const initialState = DEMO_MODE ? {
  // Demo: All features enabled, onboarding complete
  notifications: true,
  soundEffects: true,
  autoStart: true,
  showFloatingStatus: true,
  selectedCameraId: null,
  earThreshold: 0.21,
  earCalibration: null,
  alertCooldownMinutes: 10,
  // Break settings
  breakIntervalMinutes: 20,
  breakDurationSeconds: 20,
  longBreakIntervalMinutes: 60,
  longBreakDurationMinutes: 5,
  preNotificationSeconds: 30,
  maxPostpones: 2,
  // Sound settings
  soundPreference: 'chime' as const,
  soundVolume: 70,
  // Posture settings
  postureMonitoringEnabled: true,
  postureSensitivity: 'medium' as const,
  // Onboarding - COMPLETE in demo mode
  hasCompletedOnboarding: true,
  onboardingStep: 7,
  hasCompletedProductTour: true,
  // Wellness goals - all selected
  wellnessGoals: {
    reduceEyeStrain: true,
    improvePosture: true,
    takeRegularBreaks: true,
  },
  // Appearance
  theme: 'light' as const,
  // Privacy & Sync
  cloudSyncEnabled: true, // Demo mode: sync enabled
  // Demo organization
  orgId: 'demo-org-123',
  orgName: 'Acme Corporation',
  userRole: 'employee' as const,
  // User tracking
  lastUserId: null,
} : {
  notifications: true,
  soundEffects: true,
  autoStart: false,
  showFloatingStatus: true,
  selectedCameraId: null,
  earThreshold: 0.21,
  earCalibration: null,
  alertCooldownMinutes: 10,
  // Break settings (20-20-20 rule defaults)
  breakIntervalMinutes: 20,
  breakDurationSeconds: 20,
  longBreakIntervalMinutes: 60,
  longBreakDurationMinutes: 5,
  preNotificationSeconds: 30,
  maxPostpones: 2,
  // Sound settings
  soundPreference: 'chime' as const,
  soundVolume: 70,
  // Posture settings
  postureMonitoringEnabled: true,
  postureSensitivity: 'medium' as const,
  // Onboarding
  hasCompletedOnboarding: false,
  onboardingStep: 0,
  hasCompletedProductTour: false,
  // Wellness goals
  wellnessGoals: {
    reduceEyeStrain: true,
    improvePosture: true,
    takeRegularBreaks: true,
  },
  // Appearance
  theme: 'light' as const,
  // Privacy & Sync
  cloudSyncEnabled: true, // Default: sync enabled (user can disable for local-only mode)
  // Organization
  orgId: null,
  orgName: null,
  userRole: null,
  // User tracking
  lastUserId: null,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialState,

      setNotifications: (enabled) => set({ notifications: enabled }),
      setSoundEffects: (enabled) => set({ soundEffects: enabled }),
      setAutoStart: (enabled) => set({ autoStart: enabled }),
      setShowFloatingStatus: (enabled) => set({ showFloatingStatus: enabled }),
      setSelectedCameraId: (cameraId) => set({ selectedCameraId: cameraId }),
      setEarThreshold: (threshold) => set({ earThreshold: threshold }),
      setEarCalibration: (calibration) => set({
        earCalibration: calibration,
        earThreshold: calibration?.threshold ?? 0.21,
      }),
      setAlertCooldownMinutes: (minutes) => set({ alertCooldownMinutes: minutes }),

      setBreakSettings: (settings) => set((state) => ({
        breakIntervalMinutes: settings.breakIntervalMinutes ?? state.breakIntervalMinutes,
        breakDurationSeconds: settings.breakDurationSeconds ?? state.breakDurationSeconds,
        longBreakIntervalMinutes: settings.longBreakIntervalMinutes ?? state.longBreakIntervalMinutes,
        longBreakDurationMinutes: settings.longBreakDurationMinutes ?? state.longBreakDurationMinutes,
        preNotificationSeconds: settings.preNotificationSeconds ?? state.preNotificationSeconds,
        maxPostpones: settings.maxPostpones ?? state.maxPostpones,
      })),

      setSoundPreference: (sound) => set({ soundPreference: sound }),
      setSoundVolume: (volume) => set({ soundVolume: Math.max(0, Math.min(100, volume)) }),

      setPostureMonitoringEnabled: (enabled) => set({ postureMonitoringEnabled: enabled }),
      setPostureSensitivity: (sensitivity) => set({ postureSensitivity: sensitivity }),

      setOnboardingComplete: () => set({ hasCompletedOnboarding: true, onboardingStep: 7 }),
      setOnboardingStep: (step) => set({ onboardingStep: step }),
      setProductTourComplete: () => set({ hasCompletedProductTour: true }),

      setWellnessGoals: (goals) => set((state) => ({
        wellnessGoals: { ...state.wellnessGoals, ...goals },
      })),

      setTheme: (theme) => set({ theme }),

      setCloudSyncEnabled: (enabled) => set({ cloudSyncEnabled: enabled }),

      setOrganization: (orgId, orgName, role) =>
        set({ orgId, orgName, userRole: role }),

      clearOrganization: () =>
        set({ orgId: null, orgName: null, userRole: null }),

      resetForNewUser: (userId: string, forceReset = false) =>
        set((state) => {
          // If same user and not forcing reset, do nothing
          if (state.lastUserId === userId && !forceReset) {
            return state;
          }
          // New user or forced reset: reset onboarding/tour state, preserve device settings
          return {
            ...state,
            lastUserId: userId,
            hasCompletedOnboarding: false,
            onboardingStep: 0,
            hasCompletedProductTour: false,
            // Reset user-specific data
            earCalibration: null,
            earThreshold: 0.21,
            wellnessGoals: {
              reduceEyeStrain: true,
              improvePosture: true,
              takeRegularBreaks: true,
            },
            orgId: null,
            orgName: null,
            userRole: null,
          };
        }),

      reset: () => set(initialState),
    }),
    {
      name: 'lumina-settings',
      version: 8, // v8: Per-user onboarding tracking via lastUserId
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Partial<SettingsState>;

        // Migration from v6 -> v7: Update theme default from 'system' to 'light'
        if (version < 7) {
          if (state.theme === 'system') {
            state.theme = 'light';
          }
        }

        // Migration from v7 -> v8: Add lastUserId for per-user onboarding
        // Set to null - first auth will trigger resetForNewUser which sets it properly
        if (version < 8) {
          state.lastUserId = null;
        }

        return state as SettingsState;
      },
    }
  )
);
