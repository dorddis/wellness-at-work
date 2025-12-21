import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SoundPreference = 'silence' | 'chime' | 'bell' | 'soft-ping' | 'nature';

export interface SettingsState {
  // User preferences
  notifications: boolean;
  soundEffects: boolean;
  autoStart: boolean;
  showFloatingStatus: boolean;

  // Detection settings
  earThreshold: number;
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

  // Wellness goals (set during onboarding)
  wellnessGoals: {
    reduceEyeStrain: boolean;
    improvePosture: boolean;
    takeRegularBreaks: boolean;
  };

  // Appearance
  theme: 'light' | 'dark' | 'system';

  // Organization (B2B)
  orgId: string | null;
  orgName: string | null;
  userRole: 'admin' | 'manager' | 'employee' | null;

  // Actions
  setNotifications: (enabled: boolean) => void;
  setSoundEffects: (enabled: boolean) => void;
  setAutoStart: (enabled: boolean) => void;
  setShowFloatingStatus: (enabled: boolean) => void;
  setEarThreshold: (threshold: number) => void;
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
  setWellnessGoals: (goals: Partial<SettingsState['wellnessGoals']>) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setOrganization: (orgId: string, orgName: string, role: 'admin' | 'manager' | 'employee') => void;
  clearOrganization: () => void;
  reset: () => void;
}

const initialState = {
  notifications: true,
  soundEffects: true,
  autoStart: false,
  showFloatingStatus: true,
  earThreshold: 0.21,
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
  // Wellness goals
  wellnessGoals: {
    reduceEyeStrain: true,
    improvePosture: true,
    takeRegularBreaks: true,
  },
  // Appearance
  theme: 'system' as const,
  orgId: null,
  orgName: null,
  userRole: null,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialState,

      setNotifications: (enabled) => set({ notifications: enabled }),
      setSoundEffects: (enabled) => set({ soundEffects: enabled }),
      setAutoStart: (enabled) => set({ autoStart: enabled }),
      setShowFloatingStatus: (enabled) => set({ showFloatingStatus: enabled }),
      setEarThreshold: (threshold) => set({ earThreshold: threshold }),
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

      setWellnessGoals: (goals) => set((state) => ({
        wellnessGoals: { ...state.wellnessGoals, ...goals },
      })),

      setTheme: (theme) => set({ theme }),

      setOrganization: (orgId, orgName, role) =>
        set({ orgId, orgName, userRole: role }),

      clearOrganization: () =>
        set({ orgId: null, orgName: null, userRole: null }),

      reset: () => set(initialState),
    }),
    {
      name: 'lumina-settings',
      version: 2, // Increment version for migration
    }
  )
);
