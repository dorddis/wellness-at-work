import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AlertEngine, Alert } from '../engine'
import { AlertRule, WellnessMetrics, DEFAULT_ALERT_RULES, createAlertRule } from '../rules'

describe('AlertEngine', () => {
  let engine: AlertEngine

  // Helper to create test metrics
  function createMetrics(overrides: Partial<WellnessMetrics> = {}): WellnessMetrics {
    return {
      blinkRate: 15,
      avgEAR: 0.3,
      sessionDurationMs: 30 * 60 * 1000, // 30 minutes
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

  describe('constructor', () => {
    it('initializes with default rules', () => {
      const engine = new AlertEngine()
      expect(engine.getActiveAlerts()).toHaveLength(0)
    })

    it('accepts custom rules', () => {
      const customRules: AlertRule[] = [
        createAlertRule(
          'low_blink',
          'warning',
          () => true,
          'Test message',
          'Test action',
          1000,
          0
        ),
      ]
      const customEngine = new AlertEngine({ rules: customRules })
      expect(customEngine.getActiveAlerts()).toHaveLength(0)
    })

    it('accepts onAlert callback', () => {
      const onAlert = vi.fn()
      const customEngine = new AlertEngine({ onAlert })
      expect(onAlert).not.toHaveBeenCalled()
    })
  })

  describe('evaluate', () => {
    it('returns empty array when no conditions are met', () => {
      const metrics = createMetrics({ blinkRate: 15 }) // Normal blink rate
      const alerts = engine.evaluate(metrics)
      expect(alerts).toHaveLength(0)
    })

    it('does not trigger alert on first evaluation (duration tracking)', () => {
      // Create metrics that meet low_blink condition
      const metrics = createMetrics({ blinkRate: 8 }) // Below P25 (12)

      const alerts = engine.evaluate(metrics)
      expect(alerts).toHaveLength(0) // First eval starts duration tracking
    })

    it('triggers alert after duration requirement is met', () => {
      const metrics = createMetrics({ blinkRate: 8 }) // Below P25 (12)

      // First evaluation - starts tracking
      engine.evaluate(metrics)

      // Advance time past duration requirement (2 minutes for low_blink)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)

      // Second evaluation - should trigger
      const alerts = engine.evaluate(metrics)

      expect(alerts).toHaveLength(1)
      expect(alerts[0].type).toBe('low_blink')
      expect(alerts[0].severity).toBe('warning')
    })

    it('does not trigger alert if condition stops being met', () => {
      const lowBlinkMetrics = createMetrics({ blinkRate: 8 })
      const normalMetrics = createMetrics({ blinkRate: 15 })

      // Start tracking
      engine.evaluate(lowBlinkMetrics)

      // Condition no longer met
      engine.evaluate(normalMetrics)

      // Advance time past duration
      vi.advanceTimersByTime(3 * 60 * 1000)

      // Evaluate again with low blink
      engine.evaluate(lowBlinkMetrics)

      // Should not trigger because duration reset
      const alerts = engine.evaluate(lowBlinkMetrics)
      expect(alerts).toHaveLength(0)
    })

    it('triggers long_session alert immediately (durationMs = 0)', () => {
      // Long session has durationMs = 0
      const metrics = createMetrics({ sessionDurationMs: 91 * 60 * 1000 }) // Over 90 min

      // First evaluation starts tracking
      engine.evaluate(metrics)

      // Advance time slightly (just to ensure we're in next eval)
      vi.advanceTimersByTime(100)

      // Second evaluation should trigger
      const alerts = engine.evaluate(metrics)

      expect(alerts).toHaveLength(1)
      expect(alerts[0].type).toBe('long_session')
      expect(alerts[0].severity).toBe('info')
    })

    it('respects cooldown period', () => {
      const metrics = createMetrics({ blinkRate: 8 })

      // Trigger first alert
      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      const firstAlerts = engine.evaluate(metrics)
      expect(firstAlerts).toHaveLength(1)

      // Try to trigger again immediately - should be blocked by cooldown
      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      const blockedAlerts = engine.evaluate(metrics)
      expect(blockedAlerts).toHaveLength(0)

      // Advance past cooldown (10 minutes for low_blink)
      vi.advanceTimersByTime(10 * 60 * 1000)

      // Now it should be able to trigger again
      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      const afterCooldown = engine.evaluate(metrics)
      expect(afterCooldown).toHaveLength(1)
    })

    it('calls onAlert callback when alert is triggered', () => {
      const onAlert = vi.fn()
      const customEngine = new AlertEngine({ onAlert })

      const metrics = createMetrics({ blinkRate: 8 })

      customEngine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      customEngine.evaluate(metrics)

      expect(onAlert).toHaveBeenCalledTimes(1)
      expect(onAlert).toHaveBeenCalledWith(expect.objectContaining({
        type: 'low_blink',
        severity: 'warning',
      }))
    })

    it('generates unique alert IDs', () => {
      const metrics = createMetrics({ blinkRate: 8 })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      const alerts1 = engine.evaluate(metrics)

      // Wait for cooldown
      vi.advanceTimersByTime(10 * 60 * 1000)

      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      const alerts2 = engine.evaluate(metrics)

      expect(alerts1[0].id).not.toBe(alerts2[0].id)
    })
  })

  describe('critical_blink rule', () => {
    it('triggers at half of P25 baseline', () => {
      // P25 is 12, so critical threshold is 6
      // Note: low_blink (threshold 12) also triggers, so we expect 2 alerts
      const metrics = createMetrics({ blinkRate: 5 })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(3 * 60 * 1000 + 1000) // 3 min duration (critical needs 3 min)
      const alerts = engine.evaluate(metrics)

      // Both low_blink and critical_blink should trigger
      expect(alerts.length).toBeGreaterThanOrEqual(1)
      const criticalAlert = alerts.find(a => a.type === 'critical_blink')
      expect(criticalAlert).toBeDefined()
      expect(criticalAlert!.severity).toBe('critical')
    })

    it('uses default threshold of 5 when no baseline', () => {
      const metrics = createMetrics({
        blinkRate: 4,
        baseline: null
      })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(3 * 60 * 1000 + 1000)
      const alerts = engine.evaluate(metrics)

      expect(alerts.some(a => a.type === 'critical_blink')).toBe(true)
    })
  })

  describe('baseline fallback', () => {
    it('low_blink uses default threshold of 10 when no baseline', () => {
      const metrics = createMetrics({
        blinkRate: 8,
        baseline: null,
      })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      const alerts = engine.evaluate(metrics)

      expect(alerts).toHaveLength(1)
      expect(alerts[0].type).toBe('low_blink')
    })
  })

  describe('acknowledge', () => {
    it('marks an alert as acknowledged', () => {
      const metrics = createMetrics({ blinkRate: 8 })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      const alerts = engine.evaluate(metrics)

      expect(engine.getActiveAlerts()).toHaveLength(1)

      engine.acknowledge(alerts[0].id)

      expect(engine.getActiveAlerts()).toHaveLength(0)
      expect(engine.getAllAlerts()).toHaveLength(1)
      expect(engine.getAllAlerts()[0].acknowledged).toBe(true)
    })

    it('does nothing for unknown alert ID', () => {
      engine.acknowledge('unknown-id')
      expect(engine.getAllAlerts()).toHaveLength(0)
    })
  })

  describe('snooze', () => {
    it('extends cooldown for an alert type', () => {
      const metrics = createMetrics({ blinkRate: 8 })

      // Trigger first alert
      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      engine.evaluate(metrics)

      // Snooze for 5 minutes from now
      // This sets "lastTriggered" to now + 5min, so total cooldown is 5min + 10min = 15min
      engine.snooze('low_blink', 5 * 60 * 1000)

      // Advance 10 minutes - we're past original cooldown (10min) but not snooze+cooldown (15min)
      vi.advanceTimersByTime(10 * 60 * 1000)

      // Try to trigger - should still be in extended cooldown period
      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      const duringSnooze = engine.evaluate(metrics)

      expect(duringSnooze).toHaveLength(0) // Still in snooze+cooldown period

      // Advance past snooze+cooldown (need 5+ more min to pass 15 min total)
      vi.advanceTimersByTime(6 * 60 * 1000)

      // Now try to trigger again - snooze+cooldown should be over
      // First eval starts duration tracking
      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      const afterSnooze = engine.evaluate(metrics)

      expect(afterSnooze).toHaveLength(1)
    })
  })

  describe('getActiveAlerts', () => {
    it('returns only unacknowledged alerts', () => {
      const lowBlinkMetrics = createMetrics({ blinkRate: 8 })
      const longSessionMetrics = createMetrics({ sessionDurationMs: 91 * 60 * 1000 })

      // Trigger low_blink
      engine.evaluate(lowBlinkMetrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      const alerts1 = engine.evaluate(lowBlinkMetrics)

      // Trigger long_session
      vi.advanceTimersByTime(100)
      engine.evaluate(longSessionMetrics)
      vi.advanceTimersByTime(100)
      engine.evaluate(longSessionMetrics)

      expect(engine.getActiveAlerts().length).toBeGreaterThanOrEqual(1)

      // Acknowledge one
      engine.acknowledge(alerts1[0].id)

      const activeAlerts = engine.getActiveAlerts()
      expect(activeAlerts.every(a => !a.acknowledged)).toBe(true)
    })
  })

  describe('getAllAlerts', () => {
    it('returns all alerts including acknowledged', () => {
      const metrics = createMetrics({ blinkRate: 8 })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      const alerts = engine.evaluate(metrics)

      engine.acknowledge(alerts[0].id)

      expect(engine.getAllAlerts()).toHaveLength(1)
      expect(engine.getAllAlerts()[0].acknowledged).toBe(true)
    })
  })

  describe('cleanup', () => {
    it('removes acknowledged alerts older than 24 hours', () => {
      const metrics = createMetrics({ blinkRate: 8 })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      const alerts = engine.evaluate(metrics)

      engine.acknowledge(alerts[0].id)

      expect(engine.getAllAlerts()).toHaveLength(1)

      // Advance 25 hours
      vi.advanceTimersByTime(25 * 60 * 60 * 1000)

      engine.cleanup()

      expect(engine.getAllAlerts()).toHaveLength(0)
    })

    it('keeps unacknowledged alerts regardless of age', () => {
      const metrics = createMetrics({ blinkRate: 8 })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      engine.evaluate(metrics)

      // Advance 25 hours
      vi.advanceTimersByTime(25 * 60 * 60 * 1000)

      engine.cleanup()

      expect(engine.getAllAlerts()).toHaveLength(1)
    })

    it('keeps acknowledged alerts less than 24 hours old', () => {
      const metrics = createMetrics({ blinkRate: 8 })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      const alerts = engine.evaluate(metrics)

      engine.acknowledge(alerts[0].id)

      // Advance 12 hours
      vi.advanceTimersByTime(12 * 60 * 60 * 1000)

      engine.cleanup()

      expect(engine.getAllAlerts()).toHaveLength(1)
    })
  })

  describe('reset', () => {
    it('clears all state', () => {
      const metrics = createMetrics({ blinkRate: 8 })

      // Generate some state
      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      engine.evaluate(metrics)

      expect(engine.getAllAlerts()).toHaveLength(1)

      engine.reset()

      expect(engine.getAllAlerts()).toHaveLength(0)
      expect(engine.getActiveAlerts()).toHaveLength(0)
    })

    it('allows alerts to trigger again after reset', () => {
      const metrics = createMetrics({ blinkRate: 8 })

      // Trigger alert
      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      engine.evaluate(metrics)

      engine.reset()

      // Should be able to trigger again immediately (no cooldown)
      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      const alerts = engine.evaluate(metrics)

      expect(alerts).toHaveLength(1)
    })
  })

  describe('setRules', () => {
    it('replaces rules', () => {
      const customRule = createAlertRule(
        'low_blink',
        'critical',  // Changed severity
        () => true,
        'Custom message',
        'Custom action',
        1000,
        0,
      )

      engine.setRules([customRule])

      const metrics = createMetrics({ blinkRate: 15 })

      // First eval starts tracking
      engine.evaluate(metrics)
      vi.advanceTimersByTime(100)
      const alerts = engine.evaluate(metrics)

      expect(alerts).toHaveLength(1)
      expect(alerts[0].message).toBe('Custom message')
      expect(alerts[0].severity).toBe('critical')
    })
  })

  describe('multiple alerts', () => {
    it('can trigger multiple alert types simultaneously', () => {
      // Metrics that meet both low_blink and long_session conditions
      const metrics = createMetrics({
        blinkRate: 8,
        sessionDurationMs: 91 * 60 * 1000,
      })

      engine.evaluate(metrics)
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000)
      const alerts = engine.evaluate(metrics)

      // Should have low_blink and long_session
      expect(alerts.length).toBeGreaterThanOrEqual(1)
      const types = alerts.map(a => a.type)
      expect(types).toContain('low_blink')
    })
  })
})

describe('DEFAULT_ALERT_RULES', () => {
  it('has 3 default rules', () => {
    expect(DEFAULT_ALERT_RULES).toHaveLength(3)
  })

  it('includes low_blink, critical_blink, and long_session', () => {
    const types = DEFAULT_ALERT_RULES.map(r => r.type)
    expect(types).toContain('low_blink')
    expect(types).toContain('critical_blink')
    expect(types).toContain('long_session')
  })

  it('low_blink has correct configuration', () => {
    const rule = DEFAULT_ALERT_RULES.find(r => r.type === 'low_blink')!
    expect(rule.severity).toBe('warning')
    expect(rule.cooldownMs).toBe(10 * 60 * 1000) // 10 minutes
    expect(rule.durationMs).toBe(2 * 60 * 1000)  // 2 minutes
  })

  it('critical_blink has correct configuration', () => {
    const rule = DEFAULT_ALERT_RULES.find(r => r.type === 'critical_blink')!
    expect(rule.severity).toBe('critical')
    expect(rule.cooldownMs).toBe(15 * 60 * 1000) // 15 minutes
    expect(rule.durationMs).toBe(3 * 60 * 1000)  // 3 minutes
  })

  it('long_session has correct configuration', () => {
    const rule = DEFAULT_ALERT_RULES.find(r => r.type === 'long_session')!
    expect(rule.severity).toBe('info')
    expect(rule.cooldownMs).toBe(30 * 60 * 1000) // 30 minutes
    expect(rule.durationMs).toBe(0) // Immediate
  })
})

describe('createAlertRule', () => {
  it('creates a valid alert rule', () => {
    const rule = createAlertRule(
      'poor_posture',
      'warning',
      (metrics) => metrics.avgEAR < 0.2,
      'Poor posture detected',
      'Sit up straight',
      5 * 60 * 1000,
      60 * 1000,
    )

    expect(rule.type).toBe('poor_posture')
    expect(rule.severity).toBe('warning')
    expect(rule.message).toBe('Poor posture detected')
    expect(rule.action).toBe('Sit up straight')
    expect(rule.cooldownMs).toBe(5 * 60 * 1000)
    expect(rule.durationMs).toBe(60 * 1000)
    expect(typeof rule.condition).toBe('function')
  })
})
