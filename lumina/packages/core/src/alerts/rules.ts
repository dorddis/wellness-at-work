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

  // ============================================================================
  // Posture Alerts
  // ============================================================================
  {
    type: 'too_close',
    severity: 'warning',
    condition: (metrics) => metrics.posture?.distance.status === 'too_close',
    message: 'You are too close to the screen',
    action: 'Move back to a comfortable viewing distance (arm\'s length)',
    cooldownMs: WELLNESS_ALERT_COOLDOWN.TOO_CLOSE,
    durationMs: 30 * 1000, // 30 seconds sustained
  },
  {
    type: 'too_far',
    severity: 'info',
    condition: (metrics) => metrics.posture?.distance.status === 'too_far',
    message: 'You are quite far from the screen',
    action: 'Move closer or adjust your seating position',
    cooldownMs: WELLNESS_ALERT_COOLDOWN.TOO_FAR,
    durationMs: 60 * 1000, // 1 minute sustained
  },
  {
    type: 'head_tilt',
    severity: 'warning',
    condition: (metrics) => metrics.posture?.tilt.isTilted ?? false,
    message: 'Head tilt detected',
    action: 'Straighten your head to reduce neck strain',
    cooldownMs: WELLNESS_ALERT_COOLDOWN.HEAD_TILT,
    durationMs: 45 * 1000, // 45 seconds sustained
  },
  {
    type: 'forward_lean',
    severity: 'warning',
    condition: (metrics) => metrics.posture?.lean.isLeaningForward ?? false,
    message: 'Forward lean detected',
    action: 'Sit back in your chair to maintain good posture',
    cooldownMs: WELLNESS_ALERT_COOLDOWN.HEAD_TILT, // Same cooldown as tilt
    durationMs: 45 * 1000, // 45 seconds sustained
  },

  // ============================================================================
  // Drowsiness Alerts
  // ============================================================================
  {
    type: 'drowsy_mild',
    severity: 'info',
    condition: (metrics) => metrics.drowsiness?.drowsinessLevel === 'mild',
    message: 'Mild drowsiness detected',
    action: 'Consider getting some fresh air or a drink of water',
    cooldownMs: WELLNESS_ALERT_COOLDOWN.DROWSY_MILD,
    durationMs: 60 * 1000, // 1 minute sustained
  },
  {
    type: 'drowsy_moderate',
    severity: 'warning',
    condition: (metrics) => metrics.drowsiness?.drowsinessLevel === 'moderate',
    message: 'Moderate drowsiness detected',
    action: 'Take a short break - walk around or stretch',
    cooldownMs: WELLNESS_ALERT_COOLDOWN.DROWSY_MILD,
    durationMs: 30 * 1000, // 30 seconds sustained
  },
  {
    type: 'drowsy_severe',
    severity: 'critical',
    condition: (metrics) => metrics.drowsiness?.drowsinessLevel === 'severe',
    message: 'High drowsiness detected',
    action: 'Take a break immediately - walk around or get fresh air',
    cooldownMs: WELLNESS_ALERT_COOLDOWN.DROWSY_SEVERE,
    durationMs: 0, // Immediate
  },

  // ============================================================================
  // Yawn Alerts
  // ============================================================================
  {
    type: 'frequent_yawning',
    severity: 'info',
    condition: (metrics) => (metrics.yawn?.yawnCount ?? 0) >= 3,
    message: 'Frequent yawning detected',
    action: 'You may be tired - consider a short break or some fresh air',
    cooldownMs: WELLNESS_ALERT_COOLDOWN.DROWSY_MILD,
    durationMs: 0, // Immediate when threshold reached
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
