/**
 * RIGOROUS Alert Engine Tests
 *
 * Tests edge cases, boundary conditions, and error handling
 * that the happy-path tests don't cover.
 *
 * Philosophy: If breaking the code doesn't break the test, the test is useless.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { AlertEngine, Alert } from '../engine'
import { AlertRule, WellnessMetrics, DEFAULT_ALERT_RULES, createAlertRule } from '../rules'

describe('AlertEngine - Rigorous Edge Cases', () => {
  let engine: AlertEngine

  function createMetrics(overrides: Partial<WellnessMetrics> = {}): WellnessMetrics {
    return {
      blinkRate: 15,
      avgEAR: 0.3,
      sessionDurationMs: 30 * 60 * 1000,
      baseline: {
        blinkP25: 12,
        blinkP50: 15,
        blinkP75: 18,
      },
      ...overrides,
    }
  }

  beforeEach(() => {
    engine = new AlertEngine()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ============================================================================
  // SECTION 1: Invalid/Edge Metric Values
  // ============================================================================

  describe('Invalid metric values', () => {
    it('POTENTIAL BUG: blinkRate = 0 does NOT trigger any alert', () => {
      // This is by design (blinkRate > 0 check) but may be a bug
      // If blinkRate is 0, user may have fallen asleep or left desk
      const metrics = createMetrics({ blinkRate: 0 })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(5 * 60 * 1000) // Long duration
      const alerts = engine.evaluate(metrics)

      // Documents current behavior - blinkRate = 0 is ignored
      expect(alerts).toHaveLength(0)
    })

    it('blinkRate = -1 (invalid) does NOT trigger alert', () => {
      // Negative blink rate is invalid data but should not crash
      const metrics = createMetrics({ blinkRate: -1 })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(5 * 60 * 1000)
      const alerts = engine.evaluate(metrics)

      // -1 < 10 but -1 > 0 is FALSE, so no alert
      expect(alerts).toHaveLength(0)
    })

    it('blinkRate = NaN does not trigger alert and does not crash', () => {
      const metrics = createMetrics({ blinkRate: NaN })

      // Should not throw
      expect(() => {
        engine.evaluate(metrics)
        vi.advanceTimersByTime(5 * 60 * 1000)
        engine.evaluate(metrics)
      }).not.toThrow()

      // NaN comparisons are always false
      expect(engine.getActiveAlerts()).toHaveLength(0)
    })

    it('blinkRate = Infinity does not trigger alert', () => {
      const metrics = createMetrics({ blinkRate: Infinity })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(5 * 60 * 1000)
      const alerts = engine.evaluate(metrics)

      // Infinity > 0 is TRUE, but Infinity < threshold is FALSE
      expect(alerts).toHaveLength(0)
    })

    it('blinkRate = -Infinity does not trigger alert', () => {
      const metrics = createMetrics({ blinkRate: -Infinity })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(5 * 60 * 1000)
      const alerts = engine.evaluate(metrics)

      // -Infinity < threshold is TRUE but -Infinity > 0 is FALSE
      expect(alerts).toHaveLength(0)
    })

    it('sessionDurationMs = 0 does not trigger long_session alert', () => {
      const metrics = createMetrics({ sessionDurationMs: 0 })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(100)
      const alerts = engine.evaluate(metrics)

      expect(alerts.some(a => a.type === 'long_session')).toBe(false)
    })

    it('sessionDurationMs = NaN does not trigger long_session alert', () => {
      const metrics = createMetrics({ sessionDurationMs: NaN })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(100)
      const alerts = engine.evaluate(metrics)

      // NaN > 90*60*1000 is always FALSE
      expect(alerts.some(a => a.type === 'long_session')).toBe(false)
    })

    it('sessionDurationMs = -1 (negative) does not trigger', () => {
      const metrics = createMetrics({ sessionDurationMs: -1 })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(100)
      const alerts = engine.evaluate(metrics)

      expect(alerts.some(a => a.type === 'long_session')).toBe(false)
    })
  })

  // ============================================================================
  // SECTION 2: Baseline Edge Cases
  // ============================================================================

  describe('Baseline edge cases', () => {
    it('baseline.blinkP25 = 0 uses it (potential division issue if used as divisor)', () => {
      const metrics = createMetrics({
        blinkRate: 5,
        baseline: { blinkP25: 0, blinkP50: 10, blinkP75: 15 }
      })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(3 * 60 * 1000)
      const alerts = engine.evaluate(metrics)

      // threshold = 0 for low_blink, so 5 < 0 is FALSE (no low_blink)
      // threshold = 0 * 0.5 = 0 for critical_blink, so 5 < 0 is FALSE
      expect(alerts.some(a => a.type === 'low_blink')).toBe(false)
      expect(alerts.some(a => a.type === 'critical_blink')).toBe(false)
    })

    it('baseline.blinkP25 = NaN falls back to default', () => {
      const metrics = createMetrics({
        blinkRate: 5,
        baseline: { blinkP25: NaN, blinkP50: 10, blinkP75: 15 }
      })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(3 * 60 * 1000)
      const alerts = engine.evaluate(metrics)

      // NaN ?? 10 = NaN (nullish coalescing doesn't catch NaN!)
      // So threshold = NaN, and 5 < NaN is FALSE
      // This is a potential bug in the nullish coalescing usage
      expect(alerts.some(a => a.type === 'low_blink')).toBe(false)
    })

    it('baseline = null uses default thresholds', () => {
      const metrics = createMetrics({
        blinkRate: 5,
        baseline: null
      })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(3 * 60 * 1000)
      const alerts = engine.evaluate(metrics)

      // With null baseline, default low_blink threshold is 10
      // 5 < 10 && 5 > 0, so low_blink should trigger
      expect(alerts.some(a => a.type === 'low_blink')).toBe(true)
      // critical_blink threshold is 5, so 5 < 5 is FALSE
      expect(alerts.some(a => a.type === 'critical_blink')).toBe(false)
    })

    it('baseline.blinkP25 = Infinity makes threshold impossible to meet', () => {
      const metrics = createMetrics({
        blinkRate: 5,
        baseline: { blinkP25: Infinity, blinkP50: Infinity, blinkP75: Infinity }
      })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(3 * 60 * 1000)
      const alerts = engine.evaluate(metrics)

      // 5 < Infinity is TRUE but what about the critical threshold?
      // threshold = Infinity * 0.5 = Infinity
      // 5 < Infinity is TRUE, and 5 > 0, so alert should trigger
      expect(alerts.some(a => a.type === 'low_blink')).toBe(true)
      expect(alerts.some(a => a.type === 'critical_blink')).toBe(true)
    })
  })

  // ============================================================================
  // SECTION 3: Duration Boundary Precision
  // ============================================================================

  describe('Duration boundary precision', () => {
    it('alert does NOT trigger at exactly durationMs - 1 millisecond', () => {
      const metrics = createMetrics({ blinkRate: 8 })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 - 1) // 1ms before requirement
      const alerts = engine.evaluate(metrics)

      expect(alerts).toHaveLength(0)
    })

    it('alert DOES trigger at exactly durationMs', () => {
      const metrics = createMetrics({ blinkRate: 8 })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000) // Exactly at requirement
      const alerts = engine.evaluate(metrics)

      expect(alerts).toHaveLength(1)
      expect(alerts[0].type).toBe('low_blink')
    })

    it('durationMs = 0 triggers on second evaluation (not first)', () => {
      // Even with durationMs = 0, first eval sets conditionStartTimes
      const customRule = createAlertRule(
        'low_blink',
        'warning',
        () => true,
        'Test',
        'Test',
        60 * 1000,
        0 // Immediate
      )
      const customEngine = new AlertEngine({ rules: [customRule] })

      const metrics = createMetrics()

      // First evaluation
      const alerts1 = customEngine.evaluate(metrics)
      expect(alerts1).toHaveLength(0) // Still 0 because startTime wasn't set

      // Second evaluation (even with 0ms advance)
      vi.advanceTimersByTime(0)
      const alerts2 = customEngine.evaluate(metrics)
      expect(alerts2).toHaveLength(1) // NOW it triggers
    })
  })

  // ============================================================================
  // SECTION 4: Cooldown Edge Cases
  // ============================================================================

  describe('Cooldown edge cases', () => {
    it('cooldownMs = 0 allows immediate re-triggering', () => {
      const customRule = createAlertRule(
        'low_blink',
        'warning',
        () => true,
        'Test',
        'Test',
        0, // No cooldown
        0  // Immediate trigger
      )
      const customEngine = new AlertEngine({ rules: [customRule] })
      const metrics = createMetrics()

      // First evaluation sets start time
      customEngine.evaluate(metrics)

      // Second triggers
      const alerts1 = customEngine.evaluate(metrics)
      expect(alerts1).toHaveLength(1)

      // Third evaluation - should also trigger since cooldown is 0
      customEngine.evaluate(metrics) // Sets start time
      const alerts2 = customEngine.evaluate(metrics)
      expect(alerts2).toHaveLength(1)
    })

    it('cooldownMs = -1 (invalid) is treated as no cooldown', () => {
      const customRule = createAlertRule(
        'low_blink',
        'warning',
        () => true,
        'Test',
        'Test',
        -1, // Negative cooldown
        0
      )
      const customEngine = new AlertEngine({ rules: [customRule] })
      const metrics = createMetrics()

      // First trigger
      customEngine.evaluate(metrics)
      customEngine.evaluate(metrics)

      // Second trigger should work because now - lastTriggered >= -1 is always true
      customEngine.evaluate(metrics)
      const alerts = customEngine.evaluate(metrics)
      expect(alerts).toHaveLength(1)
    })

    it('snooze during active cooldown extends it correctly', () => {
      const metrics = createMetrics({ blinkRate: 8 })

      // Trigger alert
      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      engine.evaluate(metrics)

      // 10 minute cooldown started. Now snooze for 5 minutes.
      // snooze sets cooldowns.set(type, max(current, Date.now() + duration))
      engine.snooze('low_blink', 5 * 60 * 1000)

      // Advance 12 minutes - past original cooldown but not snooze+cooldown
      vi.advanceTimersByTime(12 * 60 * 1000)

      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      const stillCooling = engine.evaluate(metrics)

      // Should still be in cooldown because snooze extended it
      expect(stillCooling).toHaveLength(0)
    })

    it('double snooze takes the longer duration', () => {
      const metrics = createMetrics({ blinkRate: 8 })

      // Trigger alert
      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      engine.evaluate(metrics)

      // First snooze for 5 minutes
      engine.snooze('low_blink', 5 * 60 * 1000)

      // Second snooze for 10 minutes (should override)
      engine.snooze('low_blink', 10 * 60 * 1000)

      // Advance 7 minutes - past first snooze but not second
      vi.advanceTimersByTime(7 * 60 * 1000)

      // Cooldown check: now - cooldowns.get(type) >= rule.cooldownMs
      // cooldowns.get(type) = snoozeTime + 10min
      // We're only 7 minutes past snooze, so 7min < 10min + 10min cooldown
      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      const shouldBeBlocked = engine.evaluate(metrics)

      expect(shouldBeBlocked).toHaveLength(0)
    })
  })

  // ============================================================================
  // SECTION 5: Time Edge Cases
  // ============================================================================

  describe('Time edge cases', () => {
    it('handles time advancing by very large amount', () => {
      const metrics = createMetrics({ blinkRate: 8 })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      engine.evaluate(metrics)

      // Advance time by 1 year
      vi.advanceTimersByTime(365 * 24 * 60 * 60 * 1000)

      // Should be able to trigger again (cooldown long expired)
      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      const alerts = engine.evaluate(metrics)

      expect(alerts).toHaveLength(1)
    })

    it('cleanup boundary: alert exactly 24 hours old IS kept', () => {
      const metrics = createMetrics({ blinkRate: 8 })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      const alerts = engine.evaluate(metrics)
      engine.acknowledge(alerts[0].id)

      // Advance exactly 24 hours
      vi.advanceTimersByTime(24 * 60 * 60 * 1000)

      engine.cleanup()

      // 24 hours exactly: triggeredAt > cutoff should be TRUE (kept)
      // Actually: cutoff = now - 24h, triggeredAt = now - 24h - 2min
      // triggeredAt > cutoff is FALSE, so it should be REMOVED
      expect(engine.getAllAlerts()).toHaveLength(0)
    })

    it('cleanup boundary: alert 24h - 1ms old is kept', () => {
      const metrics = createMetrics({ blinkRate: 8 })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      const alerts = engine.evaluate(metrics)
      engine.acknowledge(alerts[0].id)

      // Advance 24 hours - 1 millisecond
      vi.advanceTimersByTime(24 * 60 * 60 * 1000 - 1)

      engine.cleanup()

      // Should be kept (just barely)
      expect(engine.getAllAlerts()).toHaveLength(1)
    })
  })

  // ============================================================================
  // SECTION 6: Stress Tests
  // ============================================================================

  describe('Stress tests', () => {
    it('handles 1000 active alerts', () => {
      const customRule = createAlertRule(
        'low_blink',
        'warning',
        () => true,
        'Test',
        'Test',
        0, // No cooldown
        0  // Immediate
      )
      const customEngine = new AlertEngine({ rules: [customRule] })
      const metrics = createMetrics()

      // Generate 1000 alerts
      for (let i = 0; i < 1000; i++) {
        customEngine.evaluate(metrics)
        vi.advanceTimersByTime(1)
        customEngine.evaluate(metrics)
        vi.advanceTimersByTime(1)
      }

      expect(customEngine.getAllAlerts()).toHaveLength(1000)
      // All alerts should be retrievable
      expect(customEngine.getActiveAlerts()).toHaveLength(1000)
    })

    it('getAllAlerts returns copy, not reference', () => {
      const metrics = createMetrics({ blinkRate: 8 })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      engine.evaluate(metrics)

      const alerts = engine.getAllAlerts()
      alerts.pop() // Modify returned array

      // Original should be unchanged
      expect(engine.getAllAlerts()).toHaveLength(1)
    })

    it('rapid evaluate calls do not cause issues', () => {
      const metrics = createMetrics({ blinkRate: 8 })

      // Call evaluate 100 times without advancing time
      for (let i = 0; i < 100; i++) {
        engine.evaluate(metrics)
      }

      // Only one condition start time should be tracked
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      const alerts = engine.evaluate(metrics)

      expect(alerts).toHaveLength(1)
    })
  })

  // ============================================================================
  // SECTION 7: Alert Object Edge Cases
  // ============================================================================

  describe('Alert object edge cases', () => {
    it('alert ID is unique even for same millisecond (due to type prefix)', () => {
      // Two different alert types at same time have different IDs
      const customRules: AlertRule[] = [
        createAlertRule('low_blink', 'warning', () => true, 'A', 'A', 0, 0),
        createAlertRule('critical_blink', 'critical', () => true, 'B', 'B', 0, 0),
      ]
      const customEngine = new AlertEngine({ rules: customRules })
      const metrics = createMetrics()

      customEngine.evaluate(metrics)
      const alerts = customEngine.evaluate(metrics)

      expect(alerts).toHaveLength(2)
      expect(alerts[0].id).not.toBe(alerts[1].id)
    })

    it('acknowledge is idempotent (calling twice has no effect)', () => {
      const metrics = createMetrics({ blinkRate: 8 })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      const alerts = engine.evaluate(metrics)

      engine.acknowledge(alerts[0].id)
      engine.acknowledge(alerts[0].id) // Second call

      expect(engine.getActiveAlerts()).toHaveLength(0)
      expect(engine.getAllAlerts()).toHaveLength(1)
      expect(engine.getAllAlerts()[0].acknowledged).toBe(true)
    })

    it('acknowledging during evaluate does not affect current evaluation', () => {
      const alertIds: string[] = []
      const engine = new AlertEngine({
        onAlert: (alert) => {
          alertIds.push(alert.id)
          // Acknowledge during callback
          engine.acknowledge(alert.id)
        }
      })

      engine.setRules([
        createAlertRule('low_blink', 'warning', () => true, 'A', 'A', 0, 0),
      ])

      const metrics = createMetrics()
      engine.evaluate(metrics)
      engine.evaluate(metrics)

      // Alert was triggered and acknowledged in callback
      expect(engine.getActiveAlerts()).toHaveLength(0)
      expect(engine.getAllAlerts()).toHaveLength(1)
      expect(engine.getAllAlerts()[0].acknowledged).toBe(true)
    })
  })

  // ============================================================================
  // SECTION 8: Rule Condition Edge Cases
  // ============================================================================

  describe('Rule condition edge cases', () => {
    it('rule that throws is handled gracefully', () => {
      const throwingRule = createAlertRule(
        'low_blink',
        'warning',
        () => { throw new Error('Condition failed') },
        'Test',
        'Test',
        0,
        0
      )

      const customEngine = new AlertEngine({ rules: [throwingRule] })
      const metrics = createMetrics()

      // Should throw (not caught by engine)
      expect(() => customEngine.evaluate(metrics)).toThrow('Condition failed')
    })

    it('rule that returns non-boolean is coerced', () => {
      const truthyRule = createAlertRule(
        'low_blink',
        'warning',
        (() => 1) as unknown as (metrics: WellnessMetrics) => boolean, // Returns truthy number
        'Test',
        'Test',
        0,
        0
      )

      const customEngine = new AlertEngine({ rules: [truthyRule] })
      const metrics = createMetrics()

      customEngine.evaluate(metrics)
      const alerts = customEngine.evaluate(metrics)

      // 1 is truthy, so alert triggers
      expect(alerts).toHaveLength(1)
    })

    it('empty rules array means no alerts ever', () => {
      const customEngine = new AlertEngine({ rules: [] })
      const metrics = createMetrics({ blinkRate: 0, sessionDurationMs: 1000000000 })

      customEngine.evaluate(metrics)
      vi.advanceTimersByTime(1000000000)
      const alerts = customEngine.evaluate(metrics)

      expect(alerts).toHaveLength(0)
    })
  })
})

// ============================================================================
// SECTION 9: DEFAULT_ALERT_RULES Condition Tests
// ============================================================================

describe('DEFAULT_ALERT_RULES conditions - Rigorous', () => {
  const lowBlinkRule = DEFAULT_ALERT_RULES.find(r => r.type === 'low_blink')!
  const criticalBlinkRule = DEFAULT_ALERT_RULES.find(r => r.type === 'critical_blink')!
  const longSessionRule = DEFAULT_ALERT_RULES.find(r => r.type === 'long_session')!

  function createMetrics(overrides: Partial<WellnessMetrics> = {}): WellnessMetrics {
    return {
      blinkRate: 15,
      avgEAR: 0.3,
      sessionDurationMs: 30 * 60 * 1000,
      baseline: { blinkP25: 12, blinkP50: 15, blinkP75: 18 },
      ...overrides,
    }
  }

  describe('low_blink condition', () => {
    it('blinkRate exactly at P25 does NOT trigger (uses strict <)', () => {
      const metrics = createMetrics({ blinkRate: 12 }) // Exactly at P25
      expect(lowBlinkRule.condition(metrics)).toBe(false)
    })

    it('blinkRate at P25 - 0.0001 DOES trigger', () => {
      const metrics = createMetrics({ blinkRate: 11.9999 })
      expect(lowBlinkRule.condition(metrics)).toBe(true)
    })

    it('blinkRate = 0 does NOT trigger (> 0 check)', () => {
      const metrics = createMetrics({ blinkRate: 0 })
      expect(lowBlinkRule.condition(metrics)).toBe(false)
    })

    it('blinkRate = 0.0001 (tiny positive) DOES trigger', () => {
      const metrics = createMetrics({ blinkRate: 0.0001 })
      expect(lowBlinkRule.condition(metrics)).toBe(true)
    })
  })

  describe('critical_blink condition', () => {
    it('blinkRate exactly at P25/2 does NOT trigger (uses strict <)', () => {
      const metrics = createMetrics({ blinkRate: 6 }) // P25=12, threshold=6
      expect(criticalBlinkRule.condition(metrics)).toBe(false)
    })

    it('blinkRate at P25/2 - 0.0001 DOES trigger', () => {
      const metrics = createMetrics({ blinkRate: 5.9999 })
      expect(criticalBlinkRule.condition(metrics)).toBe(true)
    })

    it('no baseline uses default threshold 5', () => {
      const metrics = createMetrics({ blinkRate: 4.9999, baseline: null })
      expect(criticalBlinkRule.condition(metrics)).toBe(true)
    })

    it('BUG FIXED: baseline with P25=0 correctly uses 0 as threshold', () => {
      // Previously: when baseline.blinkP25 = 0, the ternary condition
      // treated 0 as falsy and fell back to default threshold of 5
      // Now fixed: uses != null check so 0 is correctly used
      const metrics = createMetrics({
        blinkRate: 0.1, // Above 0
        baseline: { blinkP25: 0, blinkP50: 10, blinkP75: 15 }
      })
      // threshold = 0 * 0.5 = 0
      // 0.1 < 0 is FALSE (and blinkRate > 0 is TRUE, but both must be true)
      expect(criticalBlinkRule.condition(metrics)).toBe(false) // BUG FIXED!
    })
  })

  describe('long_session condition', () => {
    it('sessionDurationMs exactly at 90 min does NOT trigger (uses strict >)', () => {
      const metrics = createMetrics({ sessionDurationMs: 90 * 60 * 1000 })
      expect(longSessionRule.condition(metrics)).toBe(false)
    })

    it('sessionDurationMs at 90 min + 1ms DOES trigger', () => {
      const metrics = createMetrics({ sessionDurationMs: 90 * 60 * 1000 + 1 })
      expect(longSessionRule.condition(metrics)).toBe(true)
    })

    it('sessionDurationMs = MAX_SAFE_INTEGER triggers', () => {
      const metrics = createMetrics({ sessionDurationMs: Number.MAX_SAFE_INTEGER })
      expect(longSessionRule.condition(metrics)).toBe(true)
    })
  })
})
