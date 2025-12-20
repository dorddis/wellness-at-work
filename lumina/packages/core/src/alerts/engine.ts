/**
 * Alert Engine
 * Manages alert triggering, cooldowns, and state
 */

import { AlertRule, AlertType, WellnessMetrics, DEFAULT_ALERT_RULES } from './rules';

export interface Alert {
  id: string;
  type: AlertType;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  action: string;
  triggeredAt: number;
  acknowledged: boolean;
}

export interface AlertEngineConfig {
  rules?: AlertRule[];
  onAlert?: (alert: Alert) => void;
}

/**
 * Alert Engine class
 * Evaluates metrics against rules and manages cooldowns
 */
export class AlertEngine {
  private rules: AlertRule[];
  private cooldowns: Map<AlertType, number> = new Map();
  private conditionStartTimes: Map<AlertType, number> = new Map();
  private activeAlerts: Alert[] = [];
  private onAlert?: (alert: Alert) => void;

  constructor(config: AlertEngineConfig = {}) {
    this.rules = config.rules ?? DEFAULT_ALERT_RULES;
    this.onAlert = config.onAlert;
  }

  /**
   * Evaluate metrics and trigger alerts if conditions are met
   *
   * @param metrics Current wellness metrics
   * @returns Array of newly triggered alerts
   */
  evaluate(metrics: WellnessMetrics): Alert[] {
    const now = Date.now();
    const newAlerts: Alert[] = [];

    for (const rule of this.rules) {
      // Check cooldown
      const lastTriggered = this.cooldowns.get(rule.type) ?? 0;
      if (now - lastTriggered < rule.cooldownMs) {
        continue;
      }

      // Check condition
      const conditionMet = rule.condition(metrics);

      if (conditionMet) {
        // Track duration
        const startTime = this.conditionStartTimes.get(rule.type);
        if (!startTime) {
          this.conditionStartTimes.set(rule.type, now);
          continue;
        }

        // Check if duration requirement is met
        if (now - startTime >= rule.durationMs) {
          // Trigger alert
          const alert: Alert = {
            id: `${rule.type}-${now}`,
            type: rule.type,
            severity: rule.severity,
            message: rule.message,
            action: rule.action,
            triggeredAt: now,
            acknowledged: false,
          };

          newAlerts.push(alert);
          this.activeAlerts.push(alert);
          this.cooldowns.set(rule.type, now);
          this.conditionStartTimes.delete(rule.type);

          // Callback
          if (this.onAlert) {
            this.onAlert(alert);
          }
        }
      } else {
        // Condition no longer met, reset duration tracking
        this.conditionStartTimes.delete(rule.type);
      }
    }

    return newAlerts;
  }

  /**
   * Acknowledge an alert
   */
  acknowledge(alertId: string): void {
    const alert = this.activeAlerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  /**
   * Snooze an alert type for additional time
   */
  snooze(type: AlertType, durationMs: number): void {
    const currentCooldown = this.cooldowns.get(type) ?? 0;
    this.cooldowns.set(type, Math.max(currentCooldown, Date.now() + durationMs));
  }

  /**
   * Get all active (unacknowledged) alerts
   */
  getActiveAlerts(): Alert[] {
    return this.activeAlerts.filter((a) => !a.acknowledged);
  }

  /**
   * Get all alerts (including acknowledged)
   */
  getAllAlerts(): Alert[] {
    return [...this.activeAlerts];
  }

  /**
   * Clear old alerts (acknowledged and older than 24 hours)
   */
  cleanup(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    this.activeAlerts = this.activeAlerts.filter(
      (a) => !a.acknowledged || a.triggeredAt > cutoff
    );
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.cooldowns.clear();
    this.conditionStartTimes.clear();
    this.activeAlerts = [];
  }

  /**
   * Update rules
   */
  setRules(rules: AlertRule[]): void {
    this.rules = rules;
  }
}
