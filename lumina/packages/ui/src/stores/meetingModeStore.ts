import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Capture region coordinates for self-view
 */
export interface CaptureRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Per-app calibration data
 */
export interface MeetingAppCalibration {
  appName: string;
  region: CaptureRegion;
  displayId: number;
  createdAt: number;
  lastUsed: number;
  /** Screenshot dimensions at calibration time - used for coordinate scaling */
  calibrationWidth?: number;
  calibrationHeight?: number;
}

/**
 * Meeting Mode state and actions
 */
export interface MeetingModeState {
  // Status
  enabled: boolean;
  isActive: boolean;
  detectedApp: string | null;
  lastError: string | null;

  // Calibrations (per-app regions)
  calibrations: MeetingAppCalibration[];

  // Settings
  captureRate: number; // FPS, default 30
  autoDetect: boolean; // Auto-switch on meeting detection

  // Actions
  setEnabled: (enabled: boolean) => void;
  setActive: (active: boolean, app?: string | null) => void;
  setError: (error: string | null) => void;

  // Calibration actions
  addCalibration: (cal: Omit<MeetingAppCalibration, 'createdAt' | 'lastUsed'>) => void;
  updateCalibration: (appName: string, region: CaptureRegion) => void;
  removeCalibration: (appName: string) => void;
  getCalibration: (appName: string) => MeetingAppCalibration | undefined;
  touchCalibration: (appName: string) => void;
  hasCalibration: (appName: string) => boolean;

  // Settings actions
  setCaptureRate: (fps: number) => void;
  setAutoDetect: (enabled: boolean) => void;

  reset: () => void;
}

// Demo mode: Read from environment variable
const DEMO_MODE =
  typeof import.meta !== 'undefined'
    ? import.meta.env?.VITE_DEMO_MODE === 'true'
    : false;

const initialState = DEMO_MODE
  ? {
      // Demo: Meeting mode available but not active
      enabled: true,
      isActive: false,
      detectedApp: null,
      lastError: null,
      // Pre-configured calibrations for demo
      calibrations: [
        {
          appName: 'Zoom',
          region: { x: 1620, y: 880, width: 280, height: 200 },
          displayId: 0,
          createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
          lastUsed: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
        },
        {
          appName: 'Microsoft Teams',
          region: { x: 1600, y: 860, width: 300, height: 220 },
          displayId: 0,
          createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
          lastUsed: Date.now() - 1 * 24 * 60 * 60 * 1000,
        },
      ],
      captureRate: 30,
      autoDetect: true,
    }
  : {
      // Production: Disabled by default, no calibrations
      enabled: false,
      isActive: false,
      detectedApp: null,
      lastError: null,
      calibrations: [],
      captureRate: 30,
      autoDetect: true,
    };

export const useMeetingModeStore = create<MeetingModeState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setEnabled: (enabled) => set({ enabled }),

      setActive: (isActive, app) =>
        set({
          isActive,
          detectedApp: isActive ? (app ?? get().detectedApp) : null,
          lastError: isActive ? null : get().lastError,
        }),

      setError: (error) => set({ lastError: error }),

      // Helper: normalize app name for case-insensitive comparison
      // All comparisons use lowercase to handle "Google Meet" vs "Google meet" etc.
      addCalibration: (cal) =>
        set((state) => {
          const now = Date.now();
          const normalizedName = cal.appName.toLowerCase();
          const existing = state.calibrations.find(
            (c) => c.appName.toLowerCase() === normalizedName
          );

          if (existing) {
            // Update existing calibration (keep original stored name)
            return {
              calibrations: state.calibrations.map((c) =>
                c.appName.toLowerCase() === normalizedName
                  ? { ...c, region: cal.region, displayId: cal.displayId, lastUsed: now }
                  : c
              ),
            };
          }

          // Add new calibration
          return {
            calibrations: [
              ...state.calibrations,
              { ...cal, createdAt: now, lastUsed: now },
            ],
          };
        }),

      updateCalibration: (appName, region) =>
        set((state) => ({
          calibrations: state.calibrations.map((c) =>
            c.appName.toLowerCase() === appName.toLowerCase()
              ? { ...c, region, lastUsed: Date.now() }
              : c
          ),
        })),

      removeCalibration: (appName) =>
        set((state) => ({
          calibrations: state.calibrations.filter(
            (c) => c.appName.toLowerCase() !== appName.toLowerCase()
          ),
        })),

      getCalibration: (appName) =>
        get().calibrations.find(
          (c) => c.appName.toLowerCase() === appName.toLowerCase()
        ),

      touchCalibration: (appName) =>
        set((state) => ({
          calibrations: state.calibrations.map((c) =>
            c.appName.toLowerCase() === appName.toLowerCase()
              ? { ...c, lastUsed: Date.now() }
              : c
          ),
        })),

      hasCalibration: (appName) =>
        get().calibrations.some(
          (c) => c.appName.toLowerCase() === appName.toLowerCase()
        ),

      setCaptureRate: (fps) =>
        set({ captureRate: Math.max(5, Math.min(30, fps)) }),

      setAutoDetect: (enabled) => set({ autoDetect: enabled }),

      reset: () => set(initialState),
    }),
    {
      name: 'lumina-meeting-mode',
      version: 1,
    }
  )
);
