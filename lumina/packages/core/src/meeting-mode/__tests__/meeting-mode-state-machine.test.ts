/**
 * Meeting Mode State Machine Tests
 *
 * Tests ALL state transitions and edge cases identified in the 71 edge case analysis.
 * The state machine is pure (no side effects) so we only test transition logic here.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MeetingModeStateMachine,
} from '../meeting-mode-state-machine';
import {
  MeetingModePhase,
  MeetingModeEvent,
  VALID_TRANSITIONS,
  getValidEventsForPhase,
} from '../meeting-mode-types';

describe('MeetingModeStateMachine', () => {
  let machine: MeetingModeStateMachine;

  beforeEach(() => {
    machine = new MeetingModeStateMachine({ debug: true });
  });

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  describe('initialization', () => {
    it('starts in WEBCAM_ACTIVE phase', () => {
      expect(machine.getPhase()).toBe(MeetingModePhase.WEBCAM_ACTIVE);
    });

    it('initializes with empty context', () => {
      const ctx = machine.getContext();
      expect(ctx.detectedApp).toBeNull();
      expect(ctx.sourceId).toBeNull();
      expect(ctx.activeCalibration).toBeNull();
      expect(ctx.lastError).toBeNull();
      expect(ctx.dismissedPrompts.size).toBe(0);
    });

    it('shouldWebcamBeActive returns true initially', () => {
      expect(machine.shouldWebcamBeActive()).toBe(true);
    });

    it('isCapturing returns false initially', () => {
      expect(machine.isCapturing()).toBe(false);
    });
  });

  // ==========================================================================
  // WEBCAM_ACTIVE STATE
  // ==========================================================================

  describe('WEBCAM_ACTIVE state', () => {
    it('transitions to STARTING_CAPTURE when meeting detected WITH calibration', () => {
      const result = machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: true,
        sourceId: 'window:123',
      });

      expect(result.transitioned).toBe(true);
      expect(result.phase).toBe(MeetingModePhase.STARTING_CAPTURE);
      expect(result.context.detectedApp).toBe('Zoom');
      expect(result.context.sourceId).toBe('window:123');

      // Should include STOP_WEBCAM and START_CAPTURE actions
      const actionTypes = result.actions.map((a) => a.type);
      expect(actionTypes).toContain('STOP_WEBCAM');
      expect(actionTypes).toContain('START_CAPTURE');
    });

    it('transitions to MEETING_DETECTED when meeting detected WITHOUT calibration', () => {
      const result = machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Google Meet',
        hasCalibration: false,
      });

      expect(result.transitioned).toBe(true);
      expect(result.phase).toBe(MeetingModePhase.MEETING_DETECTED);
      expect(result.context.detectedApp).toBe('Google Meet');

      // Should include notification action
      const actionTypes = result.actions.map((a) => a.type);
      expect(actionTypes).toContain('STOP_WEBCAM');
      expect(actionTypes).toContain('SHOW_NOTIFICATION');
    });

    it('rejects invalid events', () => {
      const result = machine.transition({ type: 'CAPTURE_READY', videoWidth: 1920, videoHeight: 1080 });

      expect(result.transitioned).toBe(false);
      expect(result.phase).toBe(MeetingModePhase.WEBCAM_ACTIVE);
      expect(result.rejectionReason).toContain('Invalid transition');
    });
  });

  // ==========================================================================
  // MEETING_DETECTED STATE
  // ==========================================================================

  describe('MEETING_DETECTED state', () => {
    beforeEach(() => {
      // Get to MEETING_DETECTED state
      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: false,
      });
    });

    it('transitions to CALIBRATING on CALIBRATION_STARTED', () => {
      const result = machine.transition({
        type: 'CALIBRATION_STARTED',
        appName: 'Zoom',
      });

      expect(result.transitioned).toBe(true);
      expect(result.phase).toBe(MeetingModePhase.CALIBRATING);

      const actionTypes = result.actions.map((a) => a.type);
      expect(actionTypes).toContain('SHOW_CALIBRATION_UI');
    });

    it('transitions to WEBCAM_ACTIVE on USER_DISMISSED_PROMPT', () => {
      const result = machine.transition({ type: 'USER_DISMISSED_PROMPT' });

      expect(result.transitioned).toBe(true);
      expect(result.phase).toBe(MeetingModePhase.WEBCAM_ACTIVE);
      expect(result.context.detectedApp).toBeNull();

      // Should remember dismissal
      expect(machine.wasPromptDismissed('Zoom')).toBe(true);

      const actionTypes = result.actions.map((a) => a.type);
      expect(actionTypes).toContain('START_WEBCAM');
    });

    it('transitions to WEBCAM_ACTIVE on MEETING_ENDED', () => {
      const result = machine.transition({ type: 'MEETING_ENDED' });

      expect(result.transitioned).toBe(true);
      expect(result.phase).toBe(MeetingModePhase.WEBCAM_ACTIVE);
      expect(result.context.detectedApp).toBeNull();
    });
  });

  // ==========================================================================
  // CALIBRATING STATE
  // ==========================================================================

  describe('CALIBRATING state', () => {
    beforeEach(() => {
      // Get to CALIBRATING state
      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: false,
      });
      machine.transition({
        type: 'CALIBRATION_STARTED',
        appName: 'Zoom',
      });
    });

    it('transitions to STARTING_CAPTURE on CALIBRATION_COMPLETED', () => {
      const result = machine.transition({
        type: 'CALIBRATION_COMPLETED',
        appName: 'Zoom',
        region: { x: 100, y: 100, width: 300, height: 200 },
        calibrationWidth: 1920,
        calibrationHeight: 1080,
        displayId: 0,
      });

      expect(result.transitioned).toBe(true);
      expect(result.phase).toBe(MeetingModePhase.STARTING_CAPTURE);
      expect(result.context.activeCalibration).not.toBeNull();
      expect(result.context.activeCalibration?.appName).toBe('Zoom');

      const actionTypes = result.actions.map((a) => a.type);
      expect(actionTypes).toContain('HIDE_CALIBRATION_UI');
      expect(actionTypes).toContain('START_CAPTURE');
    });

    it('transitions to WEBCAM_ACTIVE on CALIBRATION_CANCELLED', () => {
      const result = machine.transition({ type: 'CALIBRATION_CANCELLED' });

      expect(result.transitioned).toBe(true);
      expect(result.phase).toBe(MeetingModePhase.WEBCAM_ACTIVE);

      const actionTypes = result.actions.map((a) => a.type);
      expect(actionTypes).toContain('HIDE_CALIBRATION_UI');
      expect(actionTypes).toContain('START_WEBCAM');
    });

    it('transitions to WEBCAM_ACTIVE on MEETING_ENDED (abort)', () => {
      const result = machine.transition({ type: 'MEETING_ENDED' });

      expect(result.transitioned).toBe(true);
      expect(result.phase).toBe(MeetingModePhase.WEBCAM_ACTIVE);

      const actionTypes = result.actions.map((a) => a.type);
      expect(actionTypes).toContain('HIDE_CALIBRATION_UI');
      expect(actionTypes).toContain('START_WEBCAM');
    });
  });

  // ==========================================================================
  // STARTING_CAPTURE STATE
  // ==========================================================================

  describe('STARTING_CAPTURE state', () => {
    beforeEach(() => {
      // Get to STARTING_CAPTURE state (via calibration path)
      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: false,
      });
      machine.transition({
        type: 'CALIBRATION_STARTED',
        appName: 'Zoom',
      });
      machine.transition({
        type: 'CALIBRATION_COMPLETED',
        appName: 'Zoom',
        region: { x: 100, y: 100, width: 300, height: 200 },
        calibrationWidth: 1920,
        calibrationHeight: 1080,
        displayId: 0,
      });
    });

    it('transitions to CAPTURE_ACTIVE on CAPTURE_READY', () => {
      const result = machine.transition({
        type: 'CAPTURE_READY',
        videoWidth: 1920,
        videoHeight: 1080,
      });

      expect(result.transitioned).toBe(true);
      expect(result.phase).toBe(MeetingModePhase.CAPTURE_ACTIVE);
      expect(result.context.videoWidth).toBe(1920);
      expect(result.context.videoHeight).toBe(1080);

      const actionTypes = result.actions.map((a) => a.type);
      expect(actionTypes).toContain('INIT_CANVAS');
    });

    it('transitions to ERROR on CAPTURE_FAILED', () => {
      const result = machine.transition({
        type: 'CAPTURE_FAILED',
        error: 'Permission denied',
        recoverable: true,
      });

      expect(result.transitioned).toBe(true);
      expect(result.phase).toBe(MeetingModePhase.ERROR);
      expect(result.context.lastError).toBe('Permission denied');
      expect(result.context.errorRecoverable).toBe(true);

      const actionTypes = result.actions.map((a) => a.type);
      expect(actionTypes).toContain('SHOW_NOTIFICATION');
    });

    it('transitions to WEBCAM_ACTIVE on MEETING_ENDED (abort)', () => {
      const result = machine.transition({ type: 'MEETING_ENDED' });

      expect(result.transitioned).toBe(true);
      expect(result.phase).toBe(MeetingModePhase.WEBCAM_ACTIVE);
      expect(result.context.detectedApp).toBeNull();
      expect(result.context.activeCalibration).toBeNull();

      const actionTypes = result.actions.map((a) => a.type);
      expect(actionTypes).toContain('STOP_CAPTURE');
      expect(actionTypes).toContain('START_WEBCAM');
    });
  });

  // ==========================================================================
  // CAPTURE_ACTIVE STATE
  // ==========================================================================

  describe('CAPTURE_ACTIVE state', () => {
    beforeEach(() => {
      // Get to CAPTURE_ACTIVE state
      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: true,
      });
      machine.transition({
        type: 'CAPTURE_READY',
        videoWidth: 1920,
        videoHeight: 1080,
      });
    });

    it('isCapturing returns true', () => {
      expect(machine.isCapturing()).toBe(true);
    });

    it('transitions to STOPPING_CAPTURE on MEETING_ENDED', () => {
      const result = machine.transition({ type: 'MEETING_ENDED' });

      expect(result.transitioned).toBe(true);
      expect(result.phase).toBe(MeetingModePhase.STOPPING_CAPTURE);

      const actionTypes = result.actions.map((a) => a.type);
      expect(actionTypes).toContain('STOP_CAPTURE');
    });

    it('transitions to STOPPING_CAPTURE on USER_STOPPED', () => {
      const result = machine.transition({ type: 'USER_STOPPED' });

      expect(result.transitioned).toBe(true);
      expect(result.phase).toBe(MeetingModePhase.STOPPING_CAPTURE);

      const actionTypes = result.actions.map((a) => a.type);
      expect(actionTypes).toContain('STOP_CAPTURE');
    });

    it('transitions to ERROR on CAPTURE_FAILED', () => {
      const result = machine.transition({
        type: 'CAPTURE_FAILED',
        error: 'Stream ended unexpectedly',
        recoverable: false,
      });

      expect(result.transitioned).toBe(true);
      expect(result.phase).toBe(MeetingModePhase.ERROR);
      expect(result.context.lastError).toBe('Stream ended unexpectedly');

      const actionTypes = result.actions.map((a) => a.type);
      expect(actionTypes).toContain('STOP_CAPTURE');
      expect(actionTypes).toContain('SHOW_NOTIFICATION');
    });
  });

  // ==========================================================================
  // STOPPING_CAPTURE STATE
  // ==========================================================================

  describe('STOPPING_CAPTURE state', () => {
    beforeEach(() => {
      // Get to STOPPING_CAPTURE state
      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: true,
      });
      machine.transition({
        type: 'CAPTURE_READY',
        videoWidth: 1920,
        videoHeight: 1080,
      });
      machine.transition({ type: 'MEETING_ENDED' });
    });

    it('transitions to WEBCAM_ACTIVE on CAPTURE_STOPPED', () => {
      const result = machine.transition({ type: 'CAPTURE_STOPPED' });

      expect(result.transitioned).toBe(true);
      expect(result.phase).toBe(MeetingModePhase.WEBCAM_ACTIVE);
      expect(result.context.detectedApp).toBeNull();
      expect(result.context.activeCalibration).toBeNull();
      expect(result.context.sourceId).toBeNull();

      const actionTypes = result.actions.map((a) => a.type);
      expect(actionTypes).toContain('CLEAR_CANVAS');
      expect(actionTypes).toContain('START_WEBCAM');
    });
  });

  // ==========================================================================
  // ERROR STATE
  // ==========================================================================

  describe('ERROR state', () => {
    beforeEach(() => {
      // Get to ERROR state
      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: true,
      });
      machine.transition({
        type: 'CAPTURE_FAILED',
        error: 'Test error',
        recoverable: true,
      });
    });

    it('transitions to WEBCAM_ACTIVE on RETRY', () => {
      const result = machine.transition({ type: 'RETRY' });

      expect(result.transitioned).toBe(true);
      expect(result.phase).toBe(MeetingModePhase.WEBCAM_ACTIVE);
      expect(result.context.lastError).toBeNull();

      const actionTypes = result.actions.map((a) => a.type);
      expect(actionTypes).toContain('START_WEBCAM');
    });

    it('transitions to WEBCAM_ACTIVE on MEETING_ENDED', () => {
      const result = machine.transition({ type: 'MEETING_ENDED' });

      expect(result.transitioned).toBe(true);
      expect(result.phase).toBe(MeetingModePhase.WEBCAM_ACTIVE);
      expect(result.context.lastError).toBeNull();
    });
  });

  // ==========================================================================
  // RE-ENTRY SCENARIOS (Critical edge cases)
  // ==========================================================================

  describe('re-entry scenarios', () => {
    it('handles complete flow: detect -> calibrate -> capture -> end -> detect again', () => {
      // First meeting
      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: false,
      });
      expect(machine.getPhase()).toBe(MeetingModePhase.MEETING_DETECTED);

      machine.transition({ type: 'CALIBRATION_STARTED', appName: 'Zoom' });
      expect(machine.getPhase()).toBe(MeetingModePhase.CALIBRATING);

      machine.transition({
        type: 'CALIBRATION_COMPLETED',
        appName: 'Zoom',
        region: { x: 100, y: 100, width: 300, height: 200 },
        calibrationWidth: 1920,
        calibrationHeight: 1080,
        displayId: 0,
      });
      expect(machine.getPhase()).toBe(MeetingModePhase.STARTING_CAPTURE);

      machine.transition({ type: 'CAPTURE_READY', videoWidth: 1920, videoHeight: 1080 });
      expect(machine.getPhase()).toBe(MeetingModePhase.CAPTURE_ACTIVE);
      expect(machine.isCapturing()).toBe(true);

      // Meeting ends
      machine.transition({ type: 'MEETING_ENDED' });
      expect(machine.getPhase()).toBe(MeetingModePhase.STOPPING_CAPTURE);

      machine.transition({ type: 'CAPTURE_STOPPED' });
      expect(machine.getPhase()).toBe(MeetingModePhase.WEBCAM_ACTIVE);
      expect(machine.isCapturing()).toBe(false);

      // Second meeting (should have calibration now, but state machine doesn't persist)
      // In real usage, hasCalibration would be determined by the hook
      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: true, // Now has calibration
      });
      expect(machine.getPhase()).toBe(MeetingModePhase.STARTING_CAPTURE);
    });

    it('handles rapid exit and re-entry', () => {
      // Enter meeting mode
      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: true,
      });
      machine.transition({ type: 'CAPTURE_READY', videoWidth: 1920, videoHeight: 1080 });
      expect(machine.isCapturing()).toBe(true);

      // Rapid exit
      machine.transition({ type: 'MEETING_ENDED' });
      machine.transition({ type: 'CAPTURE_STOPPED' });
      expect(machine.getPhase()).toBe(MeetingModePhase.WEBCAM_ACTIVE);

      // Immediate re-entry
      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: true,
      });
      expect(machine.getPhase()).toBe(MeetingModePhase.STARTING_CAPTURE);
    });

    it('handles meeting ending during STARTING_CAPTURE', () => {
      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: true,
      });
      expect(machine.getPhase()).toBe(MeetingModePhase.STARTING_CAPTURE);

      // Meeting ends before capture is ready
      const result = machine.transition({ type: 'MEETING_ENDED' });
      expect(result.transitioned).toBe(true);
      expect(result.phase).toBe(MeetingModePhase.WEBCAM_ACTIVE);

      // Should have cleanup actions
      const actionTypes = result.actions.map((a) => a.type);
      expect(actionTypes).toContain('STOP_CAPTURE');
      expect(actionTypes).toContain('START_WEBCAM');
    });

    it('handles calibration cancelled then meeting re-detected', () => {
      // First detection - no calibration
      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: false,
      });
      machine.transition({ type: 'CALIBRATION_STARTED', appName: 'Zoom' });
      machine.transition({ type: 'CALIBRATION_CANCELLED' });

      expect(machine.getPhase()).toBe(MeetingModePhase.WEBCAM_ACTIVE);

      // Second detection - same meeting, still no calibration
      // But the hook should track this and could auto-skip notification
      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: false,
      });

      // State machine still goes to MEETING_DETECTED
      // Hook is responsible for checking dismissedPrompts
      expect(machine.getPhase()).toBe(MeetingModePhase.MEETING_DETECTED);
    });
  });

  // ==========================================================================
  // ERROR RECOVERY
  // ==========================================================================

  describe('error recovery', () => {
    it('recovers from capture failure via RETRY', () => {
      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: true,
      });
      machine.transition({
        type: 'CAPTURE_FAILED',
        error: 'Permission denied',
        recoverable: true,
      });

      expect(machine.getPhase()).toBe(MeetingModePhase.ERROR);
      expect(machine.getContext().errorRecoverable).toBe(true);

      machine.transition({ type: 'RETRY' });
      expect(machine.getPhase()).toBe(MeetingModePhase.WEBCAM_ACTIVE);
      expect(machine.getContext().lastError).toBeNull();
    });

    it('recovers from error when meeting ends', () => {
      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: true,
      });
      machine.transition({
        type: 'CAPTURE_FAILED',
        error: 'Stream error',
        recoverable: false,
      });

      expect(machine.getPhase()).toBe(MeetingModePhase.ERROR);

      machine.transition({ type: 'MEETING_ENDED' });
      expect(machine.getPhase()).toBe(MeetingModePhase.WEBCAM_ACTIVE);
    });
  });

  // ==========================================================================
  // VALID TRANSITIONS TABLE
  // ==========================================================================

  describe('transition validation', () => {
    it('VALID_TRANSITIONS covers all defined transitions', () => {
      // This is a meta-test to ensure our transition table is complete
      expect(VALID_TRANSITIONS.length).toBeGreaterThan(0);

      // Each phase should have at least one valid transition
      const phases = Object.values(MeetingModePhase);
      for (const phase of phases) {
        const validEvents = getValidEventsForPhase(phase);
        expect(validEvents.length).toBeGreaterThan(0);
      }
    });

    it('canTransition returns correct values', () => {
      // From WEBCAM_ACTIVE
      expect(machine.canTransition({ type: 'MEETING_DETECTED', appName: 'Zoom', hasCalibration: true })).toBe(true);
      expect(machine.canTransition({ type: 'CAPTURE_READY', videoWidth: 1920, videoHeight: 1080 })).toBe(false);
      expect(machine.canTransition({ type: 'MEETING_ENDED' })).toBe(false);

      // Move to MEETING_DETECTED
      machine.transition({ type: 'MEETING_DETECTED', appName: 'Zoom', hasCalibration: false });
      expect(machine.canTransition({ type: 'CALIBRATION_STARTED', appName: 'Zoom' })).toBe(true);
      expect(machine.canTransition({ type: 'USER_DISMISSED_PROMPT' })).toBe(true);
      expect(machine.canTransition({ type: 'CAPTURE_READY', videoWidth: 1920, videoHeight: 1080 })).toBe(false);
    });
  });

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  describe('utility methods', () => {
    it('reset() returns to initial state', () => {
      // Do some transitions
      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: true,
      });
      machine.transition({ type: 'CAPTURE_READY', videoWidth: 1920, videoHeight: 1080 });

      expect(machine.getPhase()).toBe(MeetingModePhase.CAPTURE_ACTIVE);

      machine.reset();

      expect(machine.getPhase()).toBe(MeetingModePhase.WEBCAM_ACTIVE);
      expect(machine.getContext().detectedApp).toBeNull();
    });

    it('getStateDescription returns human-readable text', () => {
      expect(machine.getStateDescription()).toContain('webcam');

      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: true,
      });
      expect(machine.getStateDescription()).toContain('Zoom');
    });

    it('getTimeInCurrentPhase returns elapsed time', () => {
      const time1 = machine.getTimeInCurrentPhase();
      expect(time1).toBeGreaterThanOrEqual(0);
      expect(time1).toBeLessThan(1000);

      // Transition and check time resets
      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: true,
      });
      const time2 = machine.getTimeInCurrentPhase();
      expect(time2).toBeLessThan(time1 + 100); // Should be very recent
    });
  });

  // ==========================================================================
  // DEBUG MODE
  // ==========================================================================

  describe('debug mode', () => {
    it('includes LOG_TRANSITION actions when debug=true', () => {
      const debugMachine = new MeetingModeStateMachine({ debug: true });
      const result = debugMachine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: true,
      });

      const logActions = result.actions.filter((a) => a.type === 'LOG_TRANSITION');
      expect(logActions.length).toBe(1);
    });

    it('excludes LOG_TRANSITION actions when debug=false', () => {
      const prodMachine = new MeetingModeStateMachine({ debug: false });
      const result = prodMachine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: true,
      });

      const logActions = result.actions.filter((a) => a.type === 'LOG_TRANSITION');
      expect(logActions.length).toBe(0);
    });
  });
});
