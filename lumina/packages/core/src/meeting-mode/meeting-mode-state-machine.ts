/**
 * Meeting Mode State Machine
 *
 * A pure, side-effect-free state machine for managing meeting mode transitions.
 * This class handles ALL the logic for transitioning between webcam and screen capture.
 *
 * Key principles:
 * 1. NO side effects - only returns actions to be executed
 * 2. NO async operations - all async handled by the caller
 * 3. NO React/DOM dependencies - pure TypeScript
 * 4. FULLY testable - all state transitions are deterministic
 *
 * Based on the BlinkStateMachine pattern.
 */

import {
  MeetingModePhase,
  MeetingModeEvent,
  MeetingModeAction,
  MeetingModeContext,
  TransitionResult,
  MeetingCalibration,
  createInitialContext,
  isValidTransition,
  CaptureRegion,
} from './meeting-mode-types';

/**
 * Configuration options for the state machine.
 */
export interface MeetingModeStateMachineConfig {
  /** Enable debug logging actions */
  debug?: boolean;
  /** Callback to get calibration data (injected dependency) */
  getCalibration?: (appName: string) => MeetingCalibration | undefined;
}

/**
 * Meeting Mode State Machine
 *
 * Usage:
 * ```typescript
 * const machine = new MeetingModeStateMachine();
 *
 * // Send an event
 * const result = machine.transition({ type: 'MEETING_DETECTED', appName: 'Zoom', hasCalibration: true });
 *
 * // Execute returned actions
 * for (const action of result.actions) {
 *   await executeAction(action);
 * }
 *
 * // Check current state
 * console.log(machine.getPhase()); // 'STARTING_CAPTURE'
 * ```
 */
export class MeetingModeStateMachine {
  private phase: MeetingModePhase = MeetingModePhase.WEBCAM_ACTIVE;
  private context: MeetingModeContext;
  private config: MeetingModeStateMachineConfig;

  constructor(config: MeetingModeStateMachineConfig = {}) {
    this.config = config;
    this.context = createInitialContext();
  }

  /**
   * Process an event and return the transition result.
   *
   * This is the ONLY way to change state. The returned actions should be
   * executed by the caller (hook or test).
   */
  transition(event: MeetingModeEvent): TransitionResult {
    const previousPhase = this.phase;
    const actions: MeetingModeAction[] = [];
    let rejectionReason: string | null = null;

    // Validate transition is allowed
    if (!isValidTransition(this.phase, event.type)) {
      return {
        phase: this.phase,
        previousPhase,
        transitioned: false,
        actions: this.config.debug
          ? [
              {
                type: 'LOG_TRANSITION',
                from: previousPhase,
                to: this.phase,
                event: `REJECTED: ${event.type}`,
                timestamp: Date.now(),
              },
            ]
          : [],
        context: { ...this.context },
        rejectionReason: `Invalid transition: ${this.phase} + ${event.type}`,
      };
    }

    // Process the transition
    switch (this.phase) {
      case MeetingModePhase.WEBCAM_ACTIVE:
        this.handleWebcamActive(event, actions);
        break;

      case MeetingModePhase.MEETING_DETECTED:
        this.handleMeetingDetected(event, actions);
        break;

      case MeetingModePhase.CALIBRATING:
        this.handleCalibrating(event, actions);
        break;

      case MeetingModePhase.STARTING_CAPTURE:
        this.handleStartingCapture(event, actions);
        break;

      case MeetingModePhase.CAPTURE_ACTIVE:
        this.handleCaptureActive(event, actions);
        break;

      case MeetingModePhase.STOPPING_CAPTURE:
        this.handleStoppingCapture(event, actions);
        break;

      case MeetingModePhase.ERROR:
        this.handleError(event, actions);
        break;

      case MeetingModePhase.CAPTURE_STALE:
        this.handleCaptureStale(event, actions);
        break;
    }

    const transitioned = this.phase !== previousPhase;

    // Add debug logging if enabled
    if (this.config.debug && transitioned) {
      actions.unshift({
        type: 'LOG_TRANSITION',
        from: previousPhase,
        to: this.phase,
        event: event.type,
        timestamp: Date.now(),
      });
    }

    // Update phase timestamp if transitioned
    if (transitioned) {
      this.context.phaseStartedAt = Date.now();
    }

    return {
      phase: this.phase,
      previousPhase,
      transitioned,
      actions,
      context: { ...this.context },
      rejectionReason,
    };
  }

  // ==========================================================================
  // STATE HANDLERS
  // ==========================================================================

  private handleWebcamActive(event: MeetingModeEvent, actions: MeetingModeAction[]): void {
    if (event.type !== 'MEETING_DETECTED') return;

    this.context.detectedApp = event.appName;
    this.context.sourceId = event.sourceId || null;

    if (event.hasCalibration) {
      // Has calibration - start capture immediately
      this.phase = MeetingModePhase.STARTING_CAPTURE;
      actions.push({ type: 'STOP_WEBCAM' });
      actions.push({
        type: 'START_CAPTURE',
        appName: event.appName,
        sourceId: event.sourceId,
      });
    } else {
      // No calibration - wait for user
      this.phase = MeetingModePhase.MEETING_DETECTED;
      actions.push({ type: 'STOP_WEBCAM' });
      actions.push({
        type: 'SHOW_NOTIFICATION',
        title: 'Meeting Detected',
        message: `${event.appName} detected. Set up eye tracking for this app?`,
        actions: [
          { label: 'Set Up Now', action: 'CALIBRATION_STARTED' },
          { label: 'Dismiss', action: 'USER_DISMISSED_PROMPT' },
        ],
      });
    }
  }

  private handleMeetingDetected(event: MeetingModeEvent, actions: MeetingModeAction[]): void {
    switch (event.type) {
      case 'CALIBRATION_STARTED':
        if (event.type === 'CALIBRATION_STARTED') {
          this.phase = MeetingModePhase.CALIBRATING;
          actions.push({
            type: 'SHOW_CALIBRATION_UI',
            appName: event.appName,
          });
        }
        break;

      case 'USER_DISMISSED_PROMPT': {
        // Remember dismissal for this session (BEFORE clearing detectedApp)
        const appToRemember = this.context.detectedApp;
        if (appToRemember) {
          this.context.dismissedPrompts.add(appToRemember.toLowerCase());
        }
        this.phase = MeetingModePhase.WEBCAM_ACTIVE;
        this.context.detectedApp = null;
        actions.push({ type: 'START_WEBCAM' });
        break;
      }

      case 'MEETING_ENDED':
        this.phase = MeetingModePhase.WEBCAM_ACTIVE;
        this.context.detectedApp = null;
        actions.push({ type: 'START_WEBCAM' });
        break;
    }
  }

  private handleCalibrating(event: MeetingModeEvent, actions: MeetingModeAction[]): void {
    switch (event.type) {
      case 'CALIBRATION_COMPLETED':
        // Store calibration in context
        this.context.activeCalibration = {
          appName: event.appName,
          region: event.region,
          displayId: event.displayId,
          calibrationWidth: event.calibrationWidth,
          calibrationHeight: event.calibrationHeight,
          createdAt: Date.now(),
          lastUsed: Date.now(),
        };

        // Clear recalibration state
        this.context.isRecalibrating = false;
        this.context.previousCalibration = null;

        this.phase = MeetingModePhase.STARTING_CAPTURE;
        actions.push({ type: 'HIDE_CALIBRATION_UI' });
        actions.push({
          type: 'START_CAPTURE',
          appName: event.appName,
          displayId: event.displayId,
        });
        break;

      case 'CALIBRATION_CANCELLED':
        if (this.context.isRecalibrating && this.context.previousCalibration) {
          // Recalibration cancelled - resume with previous calibration
          this.context.activeCalibration = this.context.previousCalibration;
          this.context.previousCalibration = null;
          this.context.isRecalibrating = false;
          this.phase = MeetingModePhase.STARTING_CAPTURE;
          actions.push({ type: 'HIDE_CALIBRATION_UI' });
          actions.push({
            type: 'START_CAPTURE',
            appName: this.context.detectedApp || this.context.activeCalibration.appName,
            displayId: this.context.activeCalibration.displayId,
          });
        } else {
          // Normal cancel - go to webcam
          const appToRemember = this.context.detectedApp;
          this.phase = MeetingModePhase.WEBCAM_ACTIVE;
          this.context.detectedApp = null;
          // Remember cancellation as dismissal
          if (appToRemember) {
            this.context.dismissedPrompts.add(appToRemember.toLowerCase());
          }
          actions.push({ type: 'HIDE_CALIBRATION_UI' });
          actions.push({ type: 'START_WEBCAM' });
        }
        break;

      case 'MEETING_ENDED':
        // Clear recalibration state
        this.context.isRecalibrating = false;
        this.context.previousCalibration = null;
        this.phase = MeetingModePhase.WEBCAM_ACTIVE;
        this.context.detectedApp = null;
        actions.push({ type: 'HIDE_CALIBRATION_UI' });
        actions.push({ type: 'START_WEBCAM' });
        break;
    }
  }

  private handleStartingCapture(event: MeetingModeEvent, actions: MeetingModeAction[]): void {
    switch (event.type) {
      case 'CAPTURE_READY':
        this.context.videoWidth = event.videoWidth;
        this.context.videoHeight = event.videoHeight;
        this.phase = MeetingModePhase.CAPTURE_ACTIVE;

        // Initialize canvas with calibration region
        if (this.context.activeCalibration) {
          actions.push({
            type: 'INIT_CANVAS',
            region: this.context.activeCalibration.region,
            videoWidth: event.videoWidth,
            videoHeight: event.videoHeight,
          });
        }
        break;

      case 'CAPTURE_FAILED':
        this.context.lastError = event.error;
        this.context.errorRecoverable = event.recoverable;
        this.phase = MeetingModePhase.ERROR;
        actions.push({
          type: 'SHOW_NOTIFICATION',
          title: 'Screen Capture Failed',
          message: event.error,
          actions: event.recoverable
            ? [{ label: 'Retry', action: 'RETRY' }]
            : undefined,
        });
        break;

      case 'MEETING_ENDED':
        // Abort the capture attempt
        this.phase = MeetingModePhase.WEBCAM_ACTIVE;
        this.context.detectedApp = null;
        this.context.activeCalibration = null;
        actions.push({ type: 'STOP_CAPTURE' });
        actions.push({ type: 'START_WEBCAM' });
        break;
    }
  }

  private handleCaptureActive(event: MeetingModeEvent, actions: MeetingModeAction[]): void {
    switch (event.type) {
      case 'MEETING_ENDED':
        this.phase = MeetingModePhase.STOPPING_CAPTURE;
        // Clear dismissed prompts when meeting ends (allow re-notification next time)
        if (this.context.detectedApp) {
          this.context.dismissedPrompts.delete(this.context.detectedApp);
        }
        actions.push({ type: 'STOP_CAPTURE' });
        break;

      case 'USER_STOPPED':
        this.phase = MeetingModePhase.STOPPING_CAPTURE;
        actions.push({ type: 'STOP_CAPTURE' });
        break;

      case 'CAPTURE_FAILED':
        this.context.lastError = event.error;
        this.context.errorRecoverable = event.recoverable;
        this.phase = MeetingModePhase.ERROR;
        actions.push({ type: 'STOP_CAPTURE' });
        actions.push({
          type: 'SHOW_NOTIFICATION',
          title: 'Screen Capture Lost',
          message: event.error,
          actions: event.recoverable
            ? [{ label: 'Retry', action: 'RETRY' }]
            : undefined,
        });
        break;

      // Phase 3: User-initiated recalibration
      case 'RECALIBRATION_REQUESTED':
        // Save current calibration for cancel recovery
        this.context.previousCalibration = this.context.activeCalibration;
        this.context.isRecalibrating = true;
        this.phase = MeetingModePhase.CALIBRATING;
        actions.push({ type: 'STOP_CAPTURE' });
        actions.push({
          type: 'SHOW_CALIBRATION_UI',
          appName: this.context.detectedApp || 'Unknown',
        });
        break;

      // Phase 3: Face detection timeout (5+ minutes)
      case 'FACE_DETECTION_TIMEOUT':
        this.phase = MeetingModePhase.CAPTURE_STALE;
        actions.push({
          type: 'SHOW_NOTIFICATION',
          title: 'No Face Detected',
          message: `No face detected for ${Math.round(event.duration / 60000)} minutes. Would you like to recalibrate?`,
          actions: [
            { label: 'Recalibrate', action: 'RECALIBRATION_ACCEPTED' },
            { label: 'Dismiss', action: 'RECALIBRATION_DISMISSED' },
          ],
        });
        break;

      // Phase 3: Calibration deleted externally
      case 'CALIBRATION_INVALIDATED':
        this.context.activeCalibration = null;
        this.phase = MeetingModePhase.MEETING_DETECTED;
        actions.push({ type: 'STOP_CAPTURE' });
        actions.push({
          type: 'SHOW_NOTIFICATION',
          title: 'Calibration Removed',
          message: `Calibration for ${event.appName} was deleted. Please recalibrate.`,
          actions: [
            { label: 'Set Up Now', action: 'CALIBRATION_STARTED' },
            { label: 'Dismiss', action: 'USER_DISMISSED_PROMPT' },
          ],
        });
        break;
    }
  }

  private handleStoppingCapture(event: MeetingModeEvent, actions: MeetingModeAction[]): void {
    if (event.type === 'CAPTURE_STOPPED') {
      this.phase = MeetingModePhase.WEBCAM_ACTIVE;
      this.context.detectedApp = null;
      this.context.activeCalibration = null;
      this.context.sourceId = null;
      this.context.videoWidth = 0;
      this.context.videoHeight = 0;
      // Clear recalibration state
      this.context.isRecalibrating = false;
      this.context.previousCalibration = null;
      // Note: Don't clear canvas here - let it serve as fallback until camera is ready
      // The draw function in MonitorView will naturally switch to camera once available
      actions.push({ type: 'START_WEBCAM' });
    }
  }

  /**
   * Handle CAPTURE_STALE state (Phase 3: face detection timeout)
   * User is prompted to recalibrate after 5+ minutes without face detection.
   */
  private handleCaptureStale(event: MeetingModeEvent, actions: MeetingModeAction[]): void {
    switch (event.type) {
      case 'RECALIBRATION_ACCEPTED':
        // User accepted recalibration prompt
        this.context.previousCalibration = this.context.activeCalibration;
        this.context.isRecalibrating = true;
        this.phase = MeetingModePhase.CALIBRATING;
        actions.push({ type: 'STOP_CAPTURE' });
        actions.push({
          type: 'SHOW_CALIBRATION_UI',
          appName: this.context.detectedApp || 'Unknown',
        });
        break;

      case 'RECALIBRATION_DISMISSED':
        // User dismissed prompt - continue as-is
        this.phase = MeetingModePhase.CAPTURE_ACTIVE;
        // Reset face detection timer
        this.context.lastFaceDetected = Date.now();
        break;

      case 'FACE_DETECTED':
        // Face auto-detected - recover to CAPTURE_ACTIVE
        this.phase = MeetingModePhase.CAPTURE_ACTIVE;
        this.context.lastFaceDetected = Date.now();
        break;

      case 'MEETING_ENDED':
        // Meeting ended while stale
        this.phase = MeetingModePhase.STOPPING_CAPTURE;
        if (this.context.detectedApp) {
          this.context.dismissedPrompts.delete(this.context.detectedApp);
        }
        actions.push({ type: 'STOP_CAPTURE' });
        break;
    }
  }

  private handleError(event: MeetingModeEvent, actions: MeetingModeAction[]): void {
    switch (event.type) {
      case 'RETRY':
        this.context.lastError = null;
        this.context.errorRecoverable = false;

        // Phase 3: Smart retry - if meeting still detected, go to STARTING_CAPTURE
        if (this.context.detectedApp && this.context.activeCalibration) {
          this.phase = MeetingModePhase.STARTING_CAPTURE;
          actions.push({
            type: 'START_CAPTURE',
            appName: this.context.detectedApp,
            displayId: this.context.activeCalibration.displayId,
          });
        } else {
          // Fallback: go to webcam
          this.phase = MeetingModePhase.WEBCAM_ACTIVE;
          actions.push({ type: 'START_WEBCAM' });
        }
        break;

      case 'MEETING_ENDED':
        this.context.lastError = null;
        this.context.errorRecoverable = false;
        this.context.detectedApp = null;
        this.phase = MeetingModePhase.WEBCAM_ACTIVE;
        actions.push({ type: 'START_WEBCAM' });
        break;
    }
  }

  // ==========================================================================
  // PUBLIC GETTERS
  // ==========================================================================

  /**
   * Get the current phase.
   */
  getPhase(): MeetingModePhase {
    return this.phase;
  }

  /**
   * Get a copy of the current context.
   */
  getContext(): MeetingModeContext {
    return { ...this.context };
  }

  /**
   * Check if currently in an active capture state.
   * Includes CAPTURE_STALE since capture is still running.
   */
  isCapturing(): boolean {
    return (
      this.phase === MeetingModePhase.CAPTURE_ACTIVE ||
      this.phase === MeetingModePhase.CAPTURE_STALE
    );
  }

  /**
   * Check if currently starting capture (async operation in progress).
   */
  isStarting(): boolean {
    return this.phase === MeetingModePhase.STARTING_CAPTURE;
  }

  /**
   * Check if waiting for calibration.
   */
  isWaitingForCalibration(): boolean {
    return (
      this.phase === MeetingModePhase.MEETING_DETECTED ||
      this.phase === MeetingModePhase.CALIBRATING
    );
  }

  /**
   * Check if webcam should be active.
   */
  shouldWebcamBeActive(): boolean {
    return this.phase === MeetingModePhase.WEBCAM_ACTIVE;
  }

  /**
   * Check if an app was previously dismissed this session.
   * Case-insensitive matching.
   */
  wasPromptDismissed(appName: string): boolean {
    return this.context.dismissedPrompts.has(appName.toLowerCase());
  }

  /**
   * Get time spent in current phase (ms).
   */
  getTimeInCurrentPhase(): number {
    return Date.now() - this.context.phaseStartedAt;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Reset state machine to initial state.
   */
  reset(): void {
    this.phase = MeetingModePhase.WEBCAM_ACTIVE;
    this.context = createInitialContext();
  }

  /**
   * Force a specific phase (for testing or recovery).
   * WARNING: Use with caution - bypasses normal transitions.
   */
  forcePhase(phase: MeetingModePhase): void {
    this.phase = phase;
    this.context.phaseStartedAt = Date.now();
  }

  /**
   * Update calibration in context (when loaded from store).
   */
  setActiveCalibration(calibration: MeetingCalibration | null): void {
    this.context.activeCalibration = calibration;
  }

  /**
   * Check if transition would be valid without executing it.
   */
  canTransition(event: MeetingModeEvent): boolean {
    return isValidTransition(this.phase, event.type);
  }

  /**
   * Get a human-readable description of current state.
   */
  getStateDescription(): string {
    const phase = this.phase;
    const app = this.context.detectedApp;
    const error = this.context.lastError;

    switch (phase) {
      case MeetingModePhase.WEBCAM_ACTIVE:
        return 'Using webcam for detection';
      case MeetingModePhase.MEETING_DETECTED:
        return `Meeting detected: ${app} (awaiting calibration)`;
      case MeetingModePhase.CALIBRATING:
        return `Calibrating: ${app}`;
      case MeetingModePhase.STARTING_CAPTURE:
        return `Starting screen capture: ${app}`;
      case MeetingModePhase.CAPTURE_ACTIVE:
        return `Screen capture active: ${app}`;
      case MeetingModePhase.STOPPING_CAPTURE:
        return `Stopping screen capture: ${app}`;
      case MeetingModePhase.ERROR:
        return `Error: ${error}`;
      case MeetingModePhase.CAPTURE_STALE:
        return `Screen capture stale: ${app} (no face detected)`;
      default:
        return `Unknown state: ${phase}`;
    }
  }

  /**
   * Check if in a stale capture state (face timeout).
   */
  isStale(): boolean {
    return this.phase === MeetingModePhase.CAPTURE_STALE;
  }

  /**
   * Check if currently recalibrating (during active session).
   */
  isRecalibrating(): boolean {
    return this.context.isRecalibrating;
  }

  /**
   * Update face detection timestamp (call when face is detected).
   */
  updateFaceDetected(): void {
    this.context.lastFaceDetected = Date.now();
  }

  /**
   * Get time since last face detection (ms).
   */
  getTimeSinceLastFace(): number {
    return Date.now() - this.context.lastFaceDetected;
  }
}
