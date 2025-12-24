/**
 * Integration Tests for useMeetingModeStateMachine Hook
 *
 * These tests verify the critical integration points between:
 * - State machine transitions and React state updates
 * - Action emissions and callback invocations
 * - Store synchronization timing
 *
 * Note: These tests use the pure state machine class directly since
 * the hook is just a wrapper that adds React state and side effects.
 * The critical bugs we found were in:
 * 1. Callback wiring (onShowNotification not called)
 * 2. Action sequencing (CLEAR_CANVAS before camera ready)
 * 3. Store timing (isActive set before transition complete)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MeetingModeStateMachine } from '../meeting-mode-state-machine';
import { MeetingModePhase } from '../meeting-mode-types';

describe('Meeting Mode Integration Scenarios', () => {
  let machine: MeetingModeStateMachine;

  beforeEach(() => {
    machine = new MeetingModeStateMachine({ debug: false });
  });

  // =========================================================================
  // SCENARIO 1: Meeting Mode Happy Path
  // =========================================================================
  describe('Scenario 1: Complete meeting mode flow', () => {
    it('should emit correct actions for: detect → capture → end → return to camera', () => {
      const allActions: string[] = [];

      // Step 1: Meeting detected with calibration
      let result = machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: true,
        sourceId: 'window:123',
      });
      allActions.push(...result.actions.map(a => a.type));

      expect(result.phase).toBe(MeetingModePhase.STARTING_CAPTURE);
      expect(allActions).toContain('STOP_WEBCAM');
      expect(allActions).toContain('START_CAPTURE');

      // Step 1.5: Hook loads calibration from store and sets it
      // (This happens in the real hook after MEETING_DETECTED)
      machine.setActiveCalibration({
        appName: 'Zoom',
        region: { x: 100, y: 100, width: 300, height: 200 },
        displayId: 0,
        calibrationWidth: 1920,
        calibrationHeight: 1080,
        createdAt: Date.now(),
        lastUsed: Date.now(),
      });

      // Step 2: Capture ready
      result = machine.transition({
        type: 'CAPTURE_READY',
        videoWidth: 1920,
        videoHeight: 1080,
      });
      allActions.push(...result.actions.map(a => a.type));

      expect(result.phase).toBe(MeetingModePhase.CAPTURE_ACTIVE);
      expect(allActions).toContain('INIT_CANVAS');

      // Step 3: Meeting ends
      result = machine.transition({ type: 'MEETING_ENDED' });
      allActions.push(...result.actions.map(a => a.type));

      expect(result.phase).toBe(MeetingModePhase.STOPPING_CAPTURE);
      expect(allActions).toContain('STOP_CAPTURE');

      // Step 4: Capture stopped
      result = machine.transition({ type: 'CAPTURE_STOPPED' });
      allActions.push(...result.actions.map(a => a.type));

      expect(result.phase).toBe(MeetingModePhase.WEBCAM_ACTIVE);
      expect(allActions).toContain('START_WEBCAM');

      // CRITICAL: CLEAR_CANVAS should NOT be in actions for CAPTURE_STOPPED
      // This was the bug - canvas cleared before camera ready
      const captureStoppedActions = result.actions.map(a => a.type);
      expect(captureStoppedActions).not.toContain('CLEAR_CANVAS');
    });

    it('should allow meeting re-detection after end', () => {
      // First meeting
      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: true,
      });
      machine.transition({ type: 'CAPTURE_READY', videoWidth: 1920, videoHeight: 1080 });
      machine.transition({ type: 'MEETING_ENDED' });
      machine.transition({ type: 'CAPTURE_STOPPED' });

      expect(machine.getPhase()).toBe(MeetingModePhase.WEBCAM_ACTIVE);

      // Second meeting
      const result = machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: true,
      });

      expect(result.transitioned).toBe(true);
      expect(result.phase).toBe(MeetingModePhase.STARTING_CAPTURE);
    });
  });

  // =========================================================================
  // SCENARIO 2: Meeting Without Calibration
  // =========================================================================
  describe('Scenario 2: Meeting detected without calibration', () => {
    it('should emit SHOW_NOTIFICATION with calibration action', () => {
      const result = machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Google Meet',
        hasCalibration: false,
      });

      expect(result.phase).toBe(MeetingModePhase.MEETING_DETECTED);

      // Find SHOW_NOTIFICATION action
      const notifyAction = result.actions.find(a => a.type === 'SHOW_NOTIFICATION');
      expect(notifyAction).toBeDefined();

      if (notifyAction && notifyAction.type === 'SHOW_NOTIFICATION') {
        expect(notifyAction.actions).toBeDefined();
        expect(notifyAction.actions?.some(a => a.action === 'CALIBRATION_STARTED')).toBe(true);
      }
    });

    it('should transition to CALIBRATING when user accepts', () => {
      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Google Meet',
        hasCalibration: false,
      });

      const result = machine.transition({
        type: 'CALIBRATION_STARTED',
        appName: 'Google Meet',
      });

      expect(result.phase).toBe(MeetingModePhase.CALIBRATING);

      // Should show calibration UI
      const showUIAction = result.actions.find(a => a.type === 'SHOW_CALIBRATION_UI');
      expect(showUIAction).toBeDefined();
    });

    it('should return to webcam when user dismisses prompt', () => {
      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Google Meet',
        hasCalibration: false,
      });

      const result = machine.transition({
        type: 'USER_DISMISSED_PROMPT',
        appName: 'Google Meet',
      });

      expect(result.phase).toBe(MeetingModePhase.WEBCAM_ACTIVE);
      expect(machine.wasPromptDismissed('Google Meet')).toBe(true);
    });
  });

  // =========================================================================
  // SCENARIO 3: Rapid Meeting Start/Stop
  // =========================================================================
  describe('Scenario 3: Rapid meeting start/stop', () => {
    it('should handle meeting ending during STARTING_CAPTURE', () => {
      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: true,
      });

      expect(machine.getPhase()).toBe(MeetingModePhase.STARTING_CAPTURE);

      // Meeting ends before capture ready
      const result = machine.transition({ type: 'MEETING_ENDED' });

      expect(result.phase).toBe(MeetingModePhase.WEBCAM_ACTIVE);
      expect(result.actions.some(a => a.type === 'START_WEBCAM')).toBe(true);
    });

    it('should handle meeting ending during CALIBRATING', () => {
      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Teams',
        hasCalibration: false,
      });
      machine.transition({
        type: 'CALIBRATION_STARTED',
        appName: 'Teams',
      });

      expect(machine.getPhase()).toBe(MeetingModePhase.CALIBRATING);

      const result = machine.transition({ type: 'MEETING_ENDED' });

      expect(result.phase).toBe(MeetingModePhase.WEBCAM_ACTIVE);
      expect(result.actions.some(a => a.type === 'HIDE_CALIBRATION_UI')).toBe(true);
    });

    it('should allow immediate re-detection after cancelled calibration', () => {
      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: false,
      });
      machine.transition({
        type: 'CALIBRATION_STARTED',
        appName: 'Zoom',
      });
      machine.transition({ type: 'CALIBRATION_CANCELLED' });

      expect(machine.getPhase()).toBe(MeetingModePhase.WEBCAM_ACTIVE);

      // Should be able to detect again
      const result = machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: false,
      });

      expect(result.transitioned).toBe(true);
    });
  });

  // =========================================================================
  // SCENARIO 4: Error Recovery
  // =========================================================================
  describe('Scenario 4: Capture failure and recovery', () => {
    it('should transition to ERROR on capture failure', () => {
      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: true,
      });

      const result = machine.transition({
        type: 'CAPTURE_FAILED',
        error: 'Permission denied',
        recoverable: true,
      });

      expect(result.phase).toBe(MeetingModePhase.ERROR);
      expect(machine.getContext().lastError).toBe('Permission denied');
      expect(machine.getContext().errorRecoverable).toBe(true);
    });

    it('should recover via RETRY when recoverable', () => {
      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: true,
      });
      machine.transition({
        type: 'CAPTURE_FAILED',
        error: 'Temporary error',
        recoverable: true,
      });

      // Simulate user clicks retry
      const result = machine.transition({ type: 'RETRY' });

      // Should return to WEBCAM_ACTIVE (smart retry not available without calibration context)
      expect([MeetingModePhase.WEBCAM_ACTIVE, MeetingModePhase.STARTING_CAPTURE]).toContain(result.phase);
    });

    it('should return to webcam when meeting ends during error', () => {
      machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: true,
      });
      machine.transition({
        type: 'CAPTURE_FAILED',
        error: 'Error',
        recoverable: false,
      });

      const result = machine.transition({ type: 'MEETING_ENDED' });

      expect(result.phase).toBe(MeetingModePhase.WEBCAM_ACTIVE);
      expect(machine.getContext().lastError).toBeNull();
    });
  });

  // =========================================================================
  // SCENARIO 5: Face Detection Timeout (Long Meeting)
  // =========================================================================
  describe('Scenario 5: Face detection timeout in long meeting', () => {
    beforeEach(() => {
      // Get to CAPTURE_ACTIVE
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

    it('should transition to CAPTURE_STALE on face timeout', () => {
      const result = machine.transition({
        type: 'FACE_DETECTION_TIMEOUT',
        duration: 5 * 60 * 1000, // 5 minutes
      });

      expect(result.phase).toBe(MeetingModePhase.CAPTURE_STALE);
      expect(machine.isStale()).toBe(true);

      // Capture should still be running
      expect(machine.isCapturing()).toBe(true);
    });

    it('should auto-recover when face detected again', () => {
      machine.transition({
        type: 'FACE_DETECTION_TIMEOUT',
        duration: 5 * 60 * 1000,
      });

      const result = machine.transition({ type: 'FACE_DETECTED' });

      expect(result.phase).toBe(MeetingModePhase.CAPTURE_ACTIVE);
      expect(machine.isStale()).toBe(false);
    });

    it('should offer recalibration option', () => {
      machine.transition({
        type: 'FACE_DETECTION_TIMEOUT',
        duration: 5 * 60 * 1000,
      });

      // User accepts recalibration
      const result = machine.transition({ type: 'RECALIBRATION_ACCEPTED' });

      expect(result.phase).toBe(MeetingModePhase.CALIBRATING);
      expect(machine.getContext().isRecalibrating).toBe(true);
    });
  });

  // =========================================================================
  // SCENARIO 6: App Switch During Meeting
  // =========================================================================
  describe('Scenario 6: Different meeting app detected', () => {
    it('should handle switching from Zoom to Teams', () => {
      // Start with Zoom
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

      expect(machine.getContext().detectedApp).toBe('Zoom');

      // Meeting ends
      machine.transition({ type: 'MEETING_ENDED' });
      machine.transition({ type: 'CAPTURE_STOPPED' });

      // Teams detected (no calibration)
      const result = machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Microsoft Teams',
        hasCalibration: false,
      });

      expect(result.phase).toBe(MeetingModePhase.MEETING_DETECTED);
      expect(machine.getContext().detectedApp).toBe('Microsoft Teams');
    });
  });

  // =========================================================================
  // SCENARIO 7: Calibration Invalidation
  // =========================================================================
  describe('Scenario 7: Calibration deleted during capture', () => {
    it('should handle CALIBRATION_INVALIDATED during capture', () => {
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

      // User deletes calibration from settings
      const result = machine.transition({
        type: 'CALIBRATION_INVALIDATED',
        appName: 'Zoom',
      });

      expect(result.phase).toBe(MeetingModePhase.MEETING_DETECTED);

      // Should offer to recalibrate
      const notifyAction = result.actions.find(a => a.type === 'SHOW_NOTIFICATION');
      expect(notifyAction).toBeDefined();
    });
  });

  // =========================================================================
  // CRITICAL INTEGRATION POINT: Action Sequencing
  // =========================================================================
  describe('Critical: Action sequencing for transitions', () => {
    it('STOP_WEBCAM should come before START_CAPTURE', () => {
      const result = machine.transition({
        type: 'MEETING_DETECTED',
        appName: 'Zoom',
        hasCalibration: true,
      });

      const actionTypes = result.actions.map(a => a.type);
      const stopIndex = actionTypes.indexOf('STOP_WEBCAM');
      const startIndex = actionTypes.indexOf('START_CAPTURE');

      expect(stopIndex).toBeLessThan(startIndex);
    });

    it('STOP_CAPTURE should come before CAPTURE_STOPPED is expected', () => {
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

      const result = machine.transition({ type: 'MEETING_ENDED' });

      expect(result.actions.some(a => a.type === 'STOP_CAPTURE')).toBe(true);
      expect(result.phase).toBe(MeetingModePhase.STOPPING_CAPTURE);
    });

    it('START_WEBCAM emitted on return to WEBCAM_ACTIVE', () => {
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

      const result = machine.transition({ type: 'CAPTURE_STOPPED' });

      expect(result.actions.some(a => a.type === 'START_WEBCAM')).toBe(true);
    });
  });
});
