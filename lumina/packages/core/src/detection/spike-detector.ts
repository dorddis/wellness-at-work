/**
 * Spike Detector for EAR (Eye Aspect Ratio) values
 *
 * Detects and handles sudden EAR jumps caused by:
 * - Glasses reflections catching light
 * - Camera autofocus adjustments
 * - Rapid head movements
 * - MediaPipe landmark tracking errors
 *
 * When a spike is detected, the detector returns the last valid EAR
 * for a recovery period to avoid false blink triggers.
 */

export interface SpikeDetectorConfig {
  /** Maximum allowed EAR change per frame. Default: 0.15 */
  maxDelta?: number;
  /** Frames to wait after spike before trusting new values. Default: 2 */
  recoveryFrames?: number;
}

const DEFAULT_CONFIG: Required<SpikeDetectorConfig> = {
  maxDelta: 0.15,
  recoveryFrames: 2,
};

export interface SpikeDetectionResult {
  /** Whether this frame is considered a spike */
  isSpike: boolean;
  /** The EAR value to use (original or last valid) */
  ear: number;
  /** Whether we're in recovery period */
  inRecovery: boolean;
}

/**
 * Detects sudden EAR value spikes and provides stable fallback values
 */
export class SpikeDetector {
  private lastValidEAR: number | null = null;
  private recoveryCounter = 0;
  private readonly maxDelta: number;
  private readonly recoveryFrames: number;

  constructor(config?: SpikeDetectorConfig) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    this.maxDelta = cfg.maxDelta;
    this.recoveryFrames = cfg.recoveryFrames;
  }

  /**
   * Process a new EAR value and detect spikes
   *
   * @param currentEAR - Raw EAR value from current frame
   * @returns Spike detection result with stable EAR value
   */
  process(currentEAR: number): SpikeDetectionResult {
    // Handle invalid input
    if (!Number.isFinite(currentEAR)) {
      return {
        isSpike: true,
        ear: this.lastValidEAR ?? 0.3,
        inRecovery: this.recoveryCounter > 0,
      };
    }

    // First frame - no previous value to compare
    if (this.lastValidEAR === null) {
      this.lastValidEAR = currentEAR;
      return {
        isSpike: false,
        ear: currentEAR,
        inRecovery: false,
      };
    }

    // Still in recovery period from previous spike
    if (this.recoveryCounter > 0) {
      this.recoveryCounter--;

      // Check if current value has stabilized (close to last valid)
      const delta = Math.abs(currentEAR - this.lastValidEAR);
      if (delta <= this.maxDelta) {
        // Stabilized - exit recovery early
        this.recoveryCounter = 0;
        this.lastValidEAR = currentEAR;
        return {
          isSpike: false,
          ear: currentEAR,
          inRecovery: false,
        };
      }

      // Still spiking - use last valid value
      return {
        isSpike: true,
        ear: this.lastValidEAR,
        inRecovery: true,
      };
    }

    // Normal operation - check for spike
    const delta = Math.abs(currentEAR - this.lastValidEAR);

    if (delta > this.maxDelta) {
      // Spike detected - enter recovery mode
      this.recoveryCounter = this.recoveryFrames;
      return {
        isSpike: true,
        ear: this.lastValidEAR,
        inRecovery: true,
      };
    }

    // Normal frame - update last valid and return
    this.lastValidEAR = currentEAR;
    return {
      isSpike: false,
      ear: currentEAR,
      inRecovery: false,
    };
  }

  /**
   * Check if a value would be considered a spike (without updating state)
   */
  wouldBeSpike(ear: number): boolean {
    if (this.lastValidEAR === null) return false;
    return Math.abs(ear - this.lastValidEAR) > this.maxDelta;
  }

  /**
   * Get the last valid EAR value
   */
  getLastValidEAR(): number | null {
    return this.lastValidEAR;
  }

  /**
   * Check if currently in recovery period
   */
  isInRecovery(): boolean {
    return this.recoveryCounter > 0;
  }

  /**
   * Reset detector state
   */
  reset(): void {
    this.lastValidEAR = null;
    this.recoveryCounter = 0;
  }
}
