import { create } from 'zustand';

export interface Alert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  action?: string;
  triggeredAt: number;
  acknowledged: boolean;
}

export interface AlertState {
  alerts: Alert[];

  // Actions
  addAlert: (alert: Omit<Alert, 'acknowledged'>) => void;
  dismissAlert: (id: string) => void;
  snoozeAlert: (id: string, durationMs: number) => void;
  acknowledgeAlert: (id: string) => void;
  clearAllAlerts: () => void;
  getActiveAlerts: () => Alert[];
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],

  addAlert: (alert) => {
    const newAlert: Alert = {
      ...alert,
      acknowledged: false,
    };
    set((state) => ({
      alerts: [...state.alerts, newAlert],
    }));
  },

  dismissAlert: (id) => {
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === id ? { ...a, acknowledged: true } : a
      ),
    }));
  },

  snoozeAlert: (id, durationMs) => {
    // Just dismiss for now - actual snooze logic is in AlertEngine
    get().dismissAlert(id);
  },

  acknowledgeAlert: (id) => {
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === id ? { ...a, acknowledged: true } : a
      ),
    }));
  },

  clearAllAlerts: () => {
    set({ alerts: [] });
  },

  getActiveAlerts: () => {
    return get().alerts.filter((a) => !a.acknowledged);
  },
}));
