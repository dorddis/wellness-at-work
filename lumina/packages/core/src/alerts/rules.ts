/**
 * Alert rules configuration
 * Defines when alerts should be triggered based on wellness metrics
 *
 * Enhanced with posture, yawn, and drowsiness alerts.
 */

import { PostureResult } from '../detection/posture';
import { YawnResult } from '../detection/yawn';
import { DrowsinessResult } from '../detection/drowsiness';
import { WELLNESS_ALERT_COOLDOWN } from '../detection/constants';

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertType =
  | 'low_blink'
  | 'critical_blink'
  | 'long_session'
  | 'poor_posture'
  | 'too_close'
  | 'too_far'
  | 'head_tilt'
  | 'forward_lean'
  | 'drowsy_mild'
  | 'drowsy_moderate'
  | 'drowsy_severe'
  | 'frequent_yawning';

export interface AlertRule {
  type: AlertType;
  severity: AlertSeverity;
  condition: (metrics: WellnessMetrics) => boolean;
  message: string;
  action: string;
  cooldownMs: number;
  durationMs: number; // How long condition must persist before triggering
}

export interface WellnessMetrics {
  blinkRate: number;       // blinks per minute
  avgEAR: number;          // average eye aspect ratio
  sessionDurationMs: number;
  baseline: {
    blinkP25: number;      // 25th percentile (low threshold)
    blinkP50: number;      // 50th percentile (median)
    blinkP75: number;      // 75th percentile (high threshold)
  } | null;
  /** Posture detection result (null if no face detected) */
  posture: PostureResult | null;
  /** Yawn detection result (null if no face detected) */
  yawn: YawnResult | null;
  /** Drowsiness detection result (null if insufficient data) */
  drowsiness: DrowsinessResult | null;
}

/**
 * Default alert rules
 */
export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    type: 'low_blink',
    severity: 'warning',
    condition: (metrics) => {
      const threshold = metrics.baseline?.blinkP25 ?? 10;
      return metrics.blinkRate < threshold && metrics.blinkRate > 0;
    },
    message: 'Low blink rate detected',
    action: 'Take a 20-second break and look at something 20 feet away',
    cooldownMs: 10 * 60 * 1000, // 10 minutes
    durationMs: 2 * 60 * 1000,  // 2 minutes sustained
  },
  {
    type: 'critical_blink',
    severity: 'critical',
    condition: (metrics) => {
      // FIX: Use nullish coalescing (??) instead of truthy check
      // to properly handle blinkP25 = 0 (0 * 0.5 = 0, not 5)
      const threshold = metrics.baseline?.blinkP25 != null
        ? metrics.baseline.blinkP25 * 0.5  // Half of p25
        : 5;
      return metrics.blinkRate < threshold && metrics.blinkRate > 0;
    },
    message: 'Very low blink rate - eyes may be straining',
    action: 'Stop and rest your eyes for 2-5 minutes',
    cooldownMs: 15 * 60 * 1000, // 15 minutes
    durationMs: 3 * 60 * 1000,  // 3 minutes sustained
  },
  {
    type: 'long_session',
    severity: 'info',
    condition: (metrics) => metrics.sessionDurationMs > 90 * 60 * 1000,
    message: 'Long session detected',
    action: 'Consider taking a short break to rest your eyes',
    cooldownMs: 30 * 60 * 1000, // 30 minutes
    durationMs: 0, // Immediate
  },
];

/**
 * Create a custom alert rule
 */
export function createAlertRule(
  type: AlertType,
  severity: AlertSeverity,
  condition: (metrics: WellnessMetrics) => boolean,
  message: string,
  action: string,
  cooldownMs: number,
  durationMs: number
): AlertRule {
  return {
    type,
    severity,
    condition,
    message,
    action,
    cooldownMs,
    durationMs,
  };
}
