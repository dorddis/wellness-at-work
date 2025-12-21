/**
 * 1D Kalman Filter for EAR (Eye Aspect Ratio) smoothing
 *
 * Reduces frame-to-frame jitter caused by:
 * - Glasses reflections
 * - Variable lighting
 * - MediaPipe landmark noise
 *
 * Based on research showing Kalman filters achieve lowest error rate
 * and best jitter reduction for eye tracking applications.
 *
 * @see https://www.researchgate.net/publication/378539734
 */

export interface KalmanConfig {
  /** Process noise (Q) - how much EAR naturally changes between frames. Default: 0.01 */
  processNoise?: number;
  /** Measurement noise (R) - how noisy MediaPipe readings are. Default: 0.1 */
  measurementNoise?: number;
  /** Initial EAR estimate. Default: 0.3 (typical open eye) */
  initialEstimate?: number;
  /** Initial estimation error. Default: 1.0 */
  initialError?: number;
}

const DEFAULT_CONFIG: Required<KalmanConfig> = {
  processNoise: 0.01,
  measurementNoise: 0.1,
  initialEstimate: 0.3,
  initialError: 1.0,
};

/**
 * 1D Kalman Filter implementation optimized for EAR smoothing
 *
 * State model: x(k) = x(k-1) + w, where w ~ N(0, Q)
 * Measurement model: z(k) = x(k) + v, where v ~ N(0, R)
 */
export class KalmanFilter1D {
  private estimate: number;
  private errorCovariance: number;
  private readonly Q: number;
  private readonly R: number;
  private readonly initialEstimate: number;
  private readonly initialError: number;

  constructor(config?: KalmanConfig) {
    const cfg = { ...DEFAULT_CONFIG, ...config };

    this.Q = cfg.processNoise;
    this.R = cfg.measurementNoise;
    this.initialEstimate = cfg.initialEstimate;
    this.initialError = cfg.initialError;

    this.estimate = this.initialEstimate;
    this.errorCovariance = this.initialError;
  }

  /**
   * Update filter with new measurement and return smoothed estimate
   *
   * @param measurement - Raw EAR value from MediaPipe
   * @returns Smoothed EAR estimate
   */
  update(measurement: number): number {
    // Handle invalid measurements gracefully
    if (!Number.isFinite(measurement)) {
      return this.estimate;
    }

    // Predict step: increase uncertainty
    const predictedError = this.errorCovariance + this.Q;

    // Update step: compute Kalman gain
    const kalmanGain = predictedError / (predictedError + this.R);

    // Update estimate with measurement
    this.estimate = this.estimate + kalmanGain * (measurement - this.estimate);

    // Update error covariance
    this.errorCovariance = (1 - kalmanGain) * predictedError;

    return this.estimate;
  }

  /**
   * Get current estimate without updating
   */
  getEstimate(): number {
    return this.estimate;
  }

  /**
   * Get current error covariance (uncertainty)
   */
  getErrorCovariance(): number {
    return this.errorCovariance;
  }

  /**
   * Get Kalman gain from last update (for debugging/testing)
   */
  getKalmanGain(): number {
    const predictedError = this.errorCovariance + this.Q;
    return predictedError / (predictedError + this.R);
  }

  /**
   * Reset filter to initial state
   */
  reset(): void {
    this.estimate = this.initialEstimate;
    this.errorCovariance = this.initialError;
  }
}
