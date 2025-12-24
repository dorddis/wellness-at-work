import { create } from 'zustand';

/**
 * Data point for EAR waveform visualization
 * Stored in circular buffer for O(1) inserts with no GC pressure
 */
export interface EarDataPoint {
  timestamp: number;
  ear: number;
  isBlink?: boolean;
  phase?: 'open' | 'closing' | 'closed' | 'opening';
  /** Rate of change of EAR (for slope visualization) */
  slope?: number;
}

/**
 * Batched detection update for the session store
 * Combines multiple state changes into single update (1 instead of 6)
 */
export interface DetectionUpdate {
  faceDetected: boolean;
  waveformPoint?: EarDataPoint;
  isBlink?: boolean;
  blinkEar?: number;
}

// ============================================================================
// CIRCULAR BUFFER IMPLEMENTATION
// Eliminates array allocations in hot path (was 90-120 allocations/sec)
// ============================================================================

const WAVEFORM_BUFFER_SIZE = 150; // ~5 seconds at 30fps

/**
 * Pre-allocated circular buffer for waveform data
 * This is stored outside Zustand to avoid proxy overhead
 */
const waveformBuffer: (EarDataPoint | null)[] = new Array(WAVEFORM_BUFFER_SIZE).fill(null);
let waveformWriteIndex = 0;
let waveformCount = 0; // How many valid entries (max WAVEFORM_BUFFER_SIZE)

/**
 * Pre-allocated circular buffer for blink positions
 */
const BLINK_POSITIONS_SIZE = 10;
const blinkPositionsBuffer: number[] = new Array(BLINK_POSITIONS_SIZE).fill(0);
let blinkPositionsWriteIndex = 0;
let blinkPositionsCount = 0;

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

  // Waveform metadata (actual data in circular buffer)
  waveformWindowSize: number;
  // Update counter triggers re-renders when waveform changes
  // Increment this only when UI needs to update (throttled)
  waveformUpdateCounter: number;

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

  // =========================================================================
  // BATCHED DETECTION UPDATE (NEW)
  // Single update per frame instead of 6 separate updates
  // =========================================================================
  processDetection: (update: DetectionUpdate) => void;

  // =========================================================================
  // WAVEFORM DATA ACCESS (reads from circular buffer)
  // =========================================================================
  getWaveformData: () => EarDataPoint[];
  getBlinkPositions: () => number[];
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
  waveformWindowSize: WAVEFORM_BUFFER_SIZE,
  waveformUpdateCounter: 0,
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
    const currentState = get().isDetecting;
    if (currentState !== detecting) {
      // Debug logging disabled for performance
      // console.log('[SessionStore] setDetecting:', detecting);
    }
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
    // Clear circular buffers
    waveformBuffer.fill(null);
    waveformWriteIndex = 0;
    waveformCount = 0;
    blinkPositionsBuffer.fill(0);
    blinkPositionsWriteIndex = 0;
    blinkPositionsCount = 0;
    set(initialState);
  },

  // =========================================================================
  // LEGACY: addWaveformPoint (kept for compatibility)
  // For new code, use processFrame instead
  // =========================================================================
  addWaveformPoint: (point: EarDataPoint) => {
    // Write to circular buffer (O(1), no allocations)
    waveformBuffer[waveformWriteIndex] = point;
    waveformWriteIndex = (waveformWriteIndex + 1) % WAVEFORM_BUFFER_SIZE;
    if (waveformCount < WAVEFORM_BUFFER_SIZE) {
      waveformCount++;
    }

    // Track blink positions in separate circular buffer
    if (point.isBlink) {
      blinkPositionsBuffer[blinkPositionsWriteIndex] = point.timestamp;
      blinkPositionsWriteIndex = (blinkPositionsWriteIndex + 1) % BLINK_POSITIONS_SIZE;
      if (blinkPositionsCount < BLINK_POSITIONS_SIZE) {
        blinkPositionsCount++;
      }
    }

    // Update currentEAR and trigger re-render via counter
    // Throttle: only trigger re-render every 3 frames (~100ms) for UI
    const shouldUpdateUI = waveformWriteIndex % 3 === 0;
    set((state) => ({
      currentEAR: point.ear,
      waveformUpdateCounter: shouldUpdateUI
        ? state.waveformUpdateCounter + 1
        : state.waveformUpdateCounter,
    }));
  },

  clearWaveform: () => {
    waveformBuffer.fill(null);
    waveformWriteIndex = 0;
    waveformCount = 0;
    blinkPositionsBuffer.fill(0);
    blinkPositionsWriteIndex = 0;
    blinkPositionsCount = 0;
    set({ waveformUpdateCounter: 0 });
  },

  // =========================================================================
  // BATCHED DETECTION UPDATE
  // Reduces 6 state updates per frame to 1
  // =========================================================================
  processDetection: (update: DetectionUpdate) => {
    // Update waveform circular buffer (O(1), no allocations)
    if (update.waveformPoint) {
      waveformBuffer[waveformWriteIndex] = update.waveformPoint;
      waveformWriteIndex = (waveformWriteIndex + 1) % WAVEFORM_BUFFER_SIZE;
      if (waveformCount < WAVEFORM_BUFFER_SIZE) {
        waveformCount++;
      }

      // Track blink in separate buffer
      if (update.waveformPoint.isBlink) {
        blinkPositionsBuffer[blinkPositionsWriteIndex] = update.waveformPoint.timestamp;
        blinkPositionsWriteIndex = (blinkPositionsWriteIndex + 1) % BLINK_POSITIONS_SIZE;
        if (blinkPositionsCount < BLINK_POSITIONS_SIZE) {
          blinkPositionsCount++;
        }
      }
    }

    // Single batched state update
    const shouldUpdateUI = waveformWriteIndex % 3 === 0; // Throttle UI updates
    set((state) => ({
      faceDetected: update.faceDetected,
      blinkCount: update.isBlink ? state.blinkCount + 1 : state.blinkCount,
      currentEAR: update.blinkEar ?? update.waveformPoint?.ear ?? state.currentEAR,
      waveformUpdateCounter: shouldUpdateUI
        ? state.waveformUpdateCounter + 1
        : state.waveformUpdateCounter,
    }));
  },

  // =========================================================================
  // WAVEFORM DATA ACCESS
  // Reconstructs array from circular buffer (only called by UI components)
  // =========================================================================
  getWaveformData: () => {
    if (waveformCount === 0) return [];

    // Reconstruct array in chronological order from circular buffer
    const result: EarDataPoint[] = [];
    const startIndex = waveformCount < WAVEFORM_BUFFER_SIZE
      ? 0
      : waveformWriteIndex; // Oldest entry is at write index when buffer is full

    for (let i = 0; i < waveformCount; i++) {
      const index = (startIndex + i) % WAVEFORM_BUFFER_SIZE;
      const point = waveformBuffer[index];
      if (point) {
        result.push(point);
      }
    }
    return result;
  },

  getBlinkPositions: () => {
    if (blinkPositionsCount === 0) return [];

    const result: number[] = [];
    const startIndex = blinkPositionsCount < BLINK_POSITIONS_SIZE
      ? 0
      : blinkPositionsWriteIndex;

    for (let i = 0; i < blinkPositionsCount; i++) {
      const index = (startIndex + i) % BLINK_POSITIONS_SIZE;
      result.push(blinkPositionsBuffer[index]);
    }
    return result;
  },
}));

// ============================================================================
// BACKWARDS COMPATIBILITY EXPORTS
// Components that accessed waveformData directly now use selectors
// ============================================================================

/**
 * Selector for waveform data (use this instead of state.waveformData)
 * Only reconstructs array when UI actually needs to render
 */
export const selectWaveformData = (state: SessionState) => state.getWaveformData();

/**
 * Selector for blink positions (use this instead of state.blinkPositions)
 */
export const selectBlinkPositions = (state: SessionState) => state.getBlinkPositions();
