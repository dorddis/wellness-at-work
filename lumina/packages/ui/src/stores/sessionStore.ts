import { create } from 'zustand';

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
}));
