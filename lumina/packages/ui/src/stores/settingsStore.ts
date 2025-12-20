import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SettingsState {
  // User preferences
  notifications: boolean;
  soundEffects: boolean;
  autoStart: boolean;
  showFloatingStatus: boolean;

  // Detection settings
  earThreshold: number;
  alertCooldownMinutes: number;

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
      setTheme: (theme) => set({ theme }),

      setOrganization: (orgId, orgName, role) =>
        set({ orgId, orgName, userRole: role }),

      clearOrganization: () =>
        set({ orgId: null, orgName: null, userRole: null }),

      reset: () => set(initialState),
    }),
    {
      name: 'lumina-settings',
    }
  )
);
