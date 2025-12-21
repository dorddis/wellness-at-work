/**
 * Session Manager
 * Tracks wellness sessions and aggregates data
 */

import { SESSION } from '../detection/constants';
import { BaselineCalibrator, Baseline } from '../baseline/calibration';
import { AlertEngine, Alert } from '../alerts/engine';
import { WellnessMetrics } from '../alerts/rules';

export interface SessionData {
  id: string;
  startedAt: number;
  endedAt: number | null;
  blinkCount: number;
  minuteRollups: MinuteRollup[];
}

export interface MinuteRollup {
  timestamp: number;  // Start of the minute
  blinkCount: number;
  avgEAR: number;
  blinkRate: number;  // blinks per minute
}

export interface SessionConfig {
  onAlert?: (alert: Alert) => void;
  onRollup?: (rollup: MinuteRollup) => void;
}

/**
 * Session Manager
 * Coordinates detection, alerts, and data aggregation
 */
export class SessionManager {
  private session: SessionData | null = null;
  private calibrator: BaselineCalibrator;
  private alertEngine: AlertEngine;

  // Current minute aggregation
  private currentMinuteStart: number = 0;
  private currentMinuteBlinks: number = 0;
  private currentMinuteEARSum: number = 0;
  private currentMinuteEARCount: number = 0;

  private onRollup?: (rollup: MinuteRollup) => void;

  constructor(config: SessionConfig = {}) {
    this.calibrator = new BaselineCalibrator();
    this.alertEngine = new AlertEngine({ onAlert: config.onAlert });
    this.onRollup = config.onRollup;
  }

  /**
   * Start a new session
   */
  startSession(): string {
    const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    this.session = {
      id,
      startedAt: Date.now(),
      endedAt: null,
      blinkCount: 0,
      minuteRollups: [],
    };

    this.currentMinuteStart = Date.now();
    this.currentMinuteBlinks = 0;
    this.currentMinuteEARSum = 0;
    this.currentMinuteEARCount = 0;

    return id;
  }

  /**
   * Record a blink event
   */
  recordBlink(ear: number): void {
    if (!this.session) return;

    this.session.blinkCount++;
    this.currentMinuteBlinks++;
    this.currentMinuteEARSum += ear;
    this.currentMinuteEARCount++;

    // Check if minute has elapsed
    this.checkMinuteRollup();
  }

  /**
   * Record EAR without blink (for averaging)
   */
  recordEAR(ear: number): void {
    if (!this.session) return;

    this.currentMinuteEARSum += ear;
    this.currentMinuteEARCount++;

    this.checkMinuteRollup();
  }

  /**
   * Check and create minute rollup if needed
   */
  private checkMinuteRollup(): void {
    const now = Date.now();
    if (now - this.currentMinuteStart >= SESSION.AGGREGATION_INTERVAL) {
      this.createMinuteRollup();
    }
  }

  /**
   * Create a minute rollup
   */
  private createMinuteRollup(): void {
    if (!this.session) return;

    const rollup: MinuteRollup = {
      timestamp: this.currentMinuteStart,
      blinkCount: this.currentMinuteBlinks,
      avgEAR: this.currentMinuteEARCount > 0
        ? this.currentMinuteEARSum / this.currentMinuteEARCount
        : 0,
      blinkRate: this.currentMinuteBlinks, // Already per minute
    };

    this.session.minuteRollups.push(rollup);

    // Add to calibrator
    this.calibrator.addSample(rollup.blinkRate);

    // Check alerts
    const metrics = this.getMetrics();
    if (metrics) {
      this.alertEngine.evaluate(metrics);
    }

    // Callback
    if (this.onRollup) {
      this.onRollup(rollup);
    }

    // Reset for next minute
    this.currentMinuteStart = Date.now();
    this.currentMinuteBlinks = 0;
    this.currentMinuteEARSum = 0;
    this.currentMinuteEARCount = 0;
  }

  /**
   * Get current wellness metrics
   */
  getMetrics(): WellnessMetrics | null {
    if (!this.session) return null;

    // Calculate recent blink rate (last 5 minutes)
    const recentRollups = this.session.minuteRollups.slice(-5);
    const blinkRate = recentRollups.length > 0
      ? recentRollups.reduce((sum, r) => sum + r.blinkRate, 0) / recentRollups.length
      : this.currentMinuteBlinks;

    const avgEAR = recentRollups.length > 0
      ? recentRollups.reduce((sum, r) => sum + r.avgEAR, 0) / recentRollups.length
      : this.currentMinuteEARCount > 0
        ? this.currentMinuteEARSum / this.currentMinuteEARCount
        : 0;

    return {
      blinkRate,
      avgEAR,
      sessionDurationMs: Date.now() - this.session.startedAt,
      baseline: this.calibrator.getBaseline(),
      posture: null, // Session manager doesn't track posture - handled by FaceLandmarkerManager
      yawn: null,    // Session manager doesn't track yawn - handled by FaceLandmarkerManager
      drowsiness: null, // Session manager doesn't track drowsiness - handled by FaceLandmarkerManager
    };
  }

  /**
   * End the current session
   */
  endSession(): SessionData | null {
    if (!this.session) return null;

    // Create final rollup if there's pending data
    if (this.currentMinuteBlinks > 0 || this.currentMinuteEARCount > 0) {
      this.createMinuteRollup();
    }

    this.session.endedAt = Date.now();
    const data = { ...this.session };
    this.session = null;

    return data;
  }

  /**
   * Get current session data
   */
  getSession(): SessionData | null {
    return this.session;
  }

  /**
   * Get baseline
   */
  getBaseline(): Baseline | null {
    return this.calibrator.getBaseline();
  }

  /**
   * Load baseline from storage
   */
  loadBaseline(baseline: Baseline): void {
    this.calibrator.loadBaseline(baseline);
  }

  /**
   * Get calibration progress
   */
  getCalibrationProgress(): number {
    return this.calibrator.getProgress();
  }

  /**
   * Check if session is active
   */
  isSessionActive(): boolean {
    return this.session !== null;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alertEngine.getActiveAlerts();
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    this.alertEngine.acknowledge(alertId);
  }

  /**
   * Snooze an alert type
   */
  snoozeAlert(type: string, durationMs: number): void {
    this.alertEngine.snooze(type as any, durationMs);
  }
}
