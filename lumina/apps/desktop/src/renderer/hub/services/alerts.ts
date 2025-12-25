/**
 * Alerts Service
 * Wraps window.lumina.alerts IPC calls for type safety and testability
 */

// Alert types matching preload interface
export type AlertType =
  | 'low_blink' | 'critical_blink' | 'long_session' | 'poor_posture'
  | 'break_reminder' | 'posture' | 'session_start' | 'custom'
  | 'calibration_complete' | 'break_complete'
  // Wellness alert types
  | 'too_close' | 'too_far' | 'head_tilt' | 'forward_lean'
  | 'drowsy_mild' | 'drowsy_moderate' | 'drowsy_severe' | 'frequent_yawning'
  // Meeting mode alerts
  | 'meeting_detected' | 'meeting_mode_active' | 'meeting_mode_error';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertData {
  id: string;
  type?: AlertType;
  severity: AlertSeverity;
  message: string;
  action?: string;
}

/**
 * Alerts service - wraps all window.lumina.alerts calls
 */
export const AlertsService = {
  /**
   * Show an alert in the alert window
   */
  show: (data: AlertData): void =>
    window.lumina?.alerts.show(data),

  /**
   * Dismiss the current alert
   */
  dismiss: (): void =>
    window.lumina?.alerts.dismiss(),

  /**
   * Snooze an alert for specified minutes
   */
  snooze: (alertId: string, minutes: number): void =>
    window.lumina?.alerts.snooze(alertId, minutes),

  /**
   * Open the hub window from the alert
   */
  openHub: (): Promise<void> =>
    window.lumina?.alerts.openHub(),

  /**
   * Register callback for when alerts are shown
   * Returns unsubscribe function
   */
  onShow: (callback: (alert: AlertData) => void): (() => void) =>
    window.lumina?.alerts.onShow(callback),

  /**
   * Sync an alert to cloud (for admin visibility)
   */
  sync: (
    alertType: string,
    severity: AlertSeverity,
    message: string
  ): Promise<{ success: boolean; error?: string }> =>
    window.lumina?.alerts.sync(alertType, severity, message),
};
