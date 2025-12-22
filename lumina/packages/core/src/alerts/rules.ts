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
    message: 'Your eyes might need a little break',
    action: 'Try the 20-20-20 rule: look at something 20 feet away for 20 seconds',
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
    message: 'Your eyes are working really hard',
    action: 'Let\'s give them a 2-5 minute rest - they deserve it!',
    cooldownMs: 15 * 60 * 1000, // 15 minutes
    durationMs: 3 * 60 * 1000,  // 3 minutes sustained
  },
  {
    type: 'long_session',
    severity: 'info',
    condition: (metrics) => metrics.sessionDurationMs > 90 * 60 * 1000,
    message: 'You\'ve been focused for a while - nice work!',
    action: 'A short break would do your eyes good',
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
    message: 'You\'re getting quite close to the screen',
    action: 'Try sitting about an arm\'s length away - your eyes will thank you',
    cooldownMs: WELLNESS_ALERT_COOLDOWN.TOO_CLOSE,
    durationMs: 30 * 1000, // 30 seconds sustained
  },
  {
    type: 'too_far',
    severity: 'info',
    condition: (metrics) => metrics.posture?.distance.status === 'too_far',
    message: 'You seem a bit far from the screen',
    action: 'Moving a little closer might be more comfortable',
    cooldownMs: WELLNESS_ALERT_COOLDOWN.TOO_FAR,
    durationMs: 60 * 1000, // 1 minute sustained
  },
  {
    type: 'head_tilt',
    severity: 'warning',
    condition: (metrics) => metrics.posture?.tilt.isTilted ?? false,
    message: 'Your head is tilting a bit',
    action: 'Straightening up will help your neck feel better',
    cooldownMs: WELLNESS_ALERT_COOLDOWN.HEAD_TILT,
    durationMs: 45 * 1000, // 45 seconds sustained
  },
  {
    type: 'forward_lean',
    severity: 'warning',
    condition: (metrics) => metrics.posture?.lean.isLeaningForward ?? false,
    message: 'You\'re leaning forward a bit',
    action: 'Sitting back will be easier on your back and shoulders',
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
    message: 'Feeling a little tired?',
    action: 'Some fresh air or water might help perk you up',
    cooldownMs: WELLNESS_ALERT_COOLDOWN.DROWSY_MILD,
    durationMs: 60 * 1000, // 1 minute sustained
  },
  {
    type: 'drowsy_moderate',
    severity: 'warning',
    condition: (metrics) => metrics.drowsiness?.drowsinessLevel === 'moderate',
    message: 'Your energy seems low',
    action: 'A quick walk or stretch could help refresh you',
    cooldownMs: WELLNESS_ALERT_COOLDOWN.DROWSY_MILD,
    durationMs: 30 * 1000, // 30 seconds sustained
  },
  {
    type: 'drowsy_severe',
    severity: 'critical',
    condition: (metrics) => metrics.drowsiness?.drowsinessLevel === 'severe',
    message: 'You seem quite tired',
    action: 'Taking a proper break now will help you feel much better',
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
    message: 'Noticed a few yawns',
    action: 'Your body might be asking for a short break',
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
