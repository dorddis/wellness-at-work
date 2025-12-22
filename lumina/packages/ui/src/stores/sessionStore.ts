import { create } from 'zustand';

/**
 * Data point for EAR waveform visualization
 * Stored in rolling window for live graph display
 */
export interface EarDataPoint {
  timestamp: number;
  ear: number;
  isBlink?: boolean;
  phase?: 'open' | 'closing' | 'closed' | 'opening';
  /** Rate of change of EAR (for slope visualization) */
  slope?: number;
}

export interface SessionState {
  // Session info
  sessionId: string | null;
  startedAt: number | null;

  // Real-time metrics
  blinkCount: number;
  currentBlinkRate: number;
  currentEAR: number;
  wellnessScore: number;

  // Calibration
  isCalibrating: boolean;
  calibrationProgress: number;

  // Detection state
  isDetecting: boolean;
  faceDetected: boolean;

  // Waveform history (rolling window - persists across navigation)
  waveformData: EarDataPoint[];
  waveformWindowSize: number;
  blinkPositions: number[];  // Timestamps of recent blinks for markers

  // Actions
  startSession: () => void;
  endSession: () => void;
  recordBlink: (ear: number) => void;
  updateBlinkRate: (rate: number) => void;
  updateWellnessScore: (score: number) => void;
  updateEAR: (ear: number) => void;
  setDetecting: (detecting: boolean) => void;
  setFaceDetected: (detected: boolean) => void;
  setCalibrationProgress: (progress: number) => void;
  reset: () => void;

  // Waveform actions
  addWaveformPoint: (point: EarDataPoint) => void;
  clearWaveform: () => void;
}

const initialState = {
  sessionId: null,
  startedAt: null,
  blinkCount: 0,
  currentBlinkRate: 0,
  currentEAR: 0,
  wellnessScore: 100,
  isCalibrating: false,
  calibrationProgress: 0,
  isDetecting: false,
  faceDetected: false,
  // Waveform history (persists across navigation)
  waveformData: [] as EarDataPoint[],
  waveformWindowSize: 150, // ~5 seconds at 30fps
  blinkPositions: [] as number[],
};

export const useSessionStore = create<SessionState>((set, get) => ({
  ...initialState,

  startSession: () => {
    const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    set({
      sessionId: id,
      startedAt: Date.now(),
      blinkCount: 0,
      isCalibrating: true,
      calibrationProgress: 0,
    });
  },

  endSession: () => {
    set({
      sessionId: null,
      startedAt: null,
      isDetecting: false,
    });
  },

  recordBlink: (ear: number) => {
    set((state) => ({
      blinkCount: state.blinkCount + 1,
      currentEAR: ear,
    }));
  },

  updateBlinkRate: (rate: number) => {
    set({ currentBlinkRate: rate });
  },

  updateWellnessScore: (score: number) => {
    set({ wellnessScore: Math.max(0, Math.min(100, score)) });
  },

  updateEAR: (ear: number) => {
    set({ currentEAR: ear });
  },

  setDetecting: (detecting: boolean) => {
    set({ isDetecting: detecting });
  },

  setFaceDetected: (detected: boolean) => {
    set({ faceDetected: detected });
  },

  setCalibrationProgress: (progress: number) => {
    set({
      calibrationProgress: progress,
      isCalibrating: progress < 1,
    });
  },

  reset: () => {
    set(initialState);
  },

  // Waveform actions - data persists across navigation
  addWaveformPoint: (point: EarDataPoint) => {
    set((state) => {
      const newData = [...state.waveformData, point];
      // Trim to window size (rolling window)
      const trimmedData = newData.length > state.waveformWindowSize
        ? newData.slice(-state.waveformWindowSize)
        : newData;

      // Track blink positions for markers (keep last 10)
      const newBlinkPositions = point.isBlink
        ? [...state.blinkPositions, point.timestamp].slice(-10)
        : state.blinkPositions;

      return {
        waveformData: trimmedData,
        blinkPositions: newBlinkPositions,
        currentEAR: point.ear,
      };
    });
  },

  clearWaveform: () => {
    set({ waveformData: [], blinkPositions: [] });
  },
}));
