/**
 * Meeting Mode State Machine Types
 *
 * This module defines all types for the meeting mode state machine.
 * The state machine handles transitions between webcam and screen capture modes
 * when video meetings are detected.
 */

// ============================================================================
// PHASE ENUM - Explicit states (replaces implicit boolean flags)
// ============================================================================

/**
 * All possible phases of the meeting mode state machine.
 *
 * Replaces the implicit state from multiple flags:
 * - meetingModeActive (Zustand)
 * - pendingMeetingApp (React state)
 * - isMeetingVideoReady (React state)
 * - isStartingMeetingModeRef (ref)
 */
export enum MeetingModePhase {
  /** Normal webcam detection mode - no meeting detected */
  WEBCAM_ACTIVE = 'WEBCAM_ACTIVE',

  /** Meeting detected but no calibration exists - waiting for user action */
  MEETING_DETECTED = 'MEETING_DETECTED',

  /** User is calibrating the self-view region */
  CALIBRATING = 'CALIBRATING',

  /** Async operation: getUserMedia + video ready + canvas init */
  STARTING_CAPTURE = 'STARTING_CAPTURE',

  /** Screen capture active, detection running on cropped region */
  CAPTURE_ACTIVE = 'CAPTURE_ACTIVE',

  /** Async operation: stopping stream, cleaning up refs */
  STOPPING_CAPTURE = 'STOPPING_CAPTURE',

  /** Recoverable error state (capture failed, permission denied, etc.) */
  ERROR = 'ERROR',

  /** Face detection timeout - no face detected for 5+ minutes, awaiting user action */
  CAPTURE_STALE = 'CAPTURE_STALE',
}

// ============================================================================
// EVENTS - All possible inputs to the state machine
// ============================================================================

/**
 * Event: A meeting application was detected via process monitoring.
 */
export interface MeetingDetectedEvent {
  type: 'MEETING_DETECTED';
  appName: string;
  hasCalibration: boolean;
  sourceId?: string; // Window/display source ID if available
}

/**
 * Event: No meeting application is currently running.
 */
export interface MeetingEndedEvent {
  type: 'MEETING_ENDED';
}

/**
 * Event: User started the calibration flow.
 */
export interface CalibrationStartedEvent {
  type: 'CALIBRATION_STARTED';
  appName: string;
}

/**
 * Event: User completed calibration with a region.
 */
export interface CalibrationCompletedEvent {
  type: 'CALIBRATION_COMPLETED';
  appName: string;
  region: CaptureRegion;
  calibrationWidth: number;
  calibrationHeight: number;
  displayId: number;
}

/**
 * Event: User cancelled calibration.
 */
export interface CalibrationCancelledEvent {
  type: 'CALIBRATION_CANCELLED';
}

/**
 * Event: Screen capture stream is ready and video element loaded.
 */
export interface CaptureReadyEvent {
  type: 'CAPTURE_READY';
  videoWidth: number;
  videoHeight: number;
}

/**
 * Event: Screen capture failed (permission, source unavailable, etc.)
 */
export interface CaptureFailedEvent {
  type: 'CAPTURE_FAILED';
  error: string;
  recoverable: boolean;
}

/**
 * Event: Screen capture has been stopped and cleaned up.
 */
export interface CaptureStoppedEvent {
  type: 'CAPTURE_STOPPED';
}

/**
 * Event: User manually stopped meeting mode.
 */
export interface UserStoppedEvent {
  type: 'USER_STOPPED';
}

/**
 * Event: User dismissed the "calibrate now" prompt.
 */
export interface UserDismissedPromptEvent {
  type: 'USER_DISMISSED_PROMPT';
}

/**
 * Event: User wants to retry after an error.
 */
export interface RetryEvent {
  type: 'RETRY';
}

// ============================================================================
// NEW EVENTS - Phase 3 additions for recalibration and face timeout
// ============================================================================

/**
 * Event: User wants to recalibrate during active capture.
 */
export interface RecalibrationRequestedEvent {
  type: 'RECALIBRATION_REQUESTED';
}

/**
 * Event: No face detected for 5+ minutes during active capture.
 */
export interface FaceDetectionTimeoutEvent {
  type: 'FACE_DETECTION_TIMEOUT';
  duration: number; // milliseconds since last face detected
}

/**
 * Event: Face detected (used to auto-recover from CAPTURE_STALE).
 */
export interface FaceDetectedEvent {
  type: 'FACE_DETECTED';
}

/**
 * Event: User accepted recalibration prompt (from CAPTURE_STALE).
 */
export interface RecalibrationAcceptedEvent {
  type: 'RECALIBRATION_ACCEPTED';
}

/**
 * Event: User dismissed recalibration prompt (from CAPTURE_STALE).
 */
export interface RecalibrationDismissedEvent {
  type: 'RECALIBRATION_DISMISSED';
}

/**
 * Event: Calibration was deleted externally while capture is active.
 */
export interface CalibrationInvalidatedEvent {
  type: 'CALIBRATION_INVALIDATED';
  appName?: string;
  /** Optional reason for invalidation (e.g., source type mismatch) */
  reason?: string;
}

/**
 * Union of all possible events.
 */
export type MeetingModeEvent =
  | MeetingDetectedEvent
  | MeetingEndedEvent
  | CalibrationStartedEvent
  | CalibrationCompletedEvent
  | CalibrationCancelledEvent
  | CaptureReadyEvent
  | CaptureFailedEvent
  | CaptureStoppedEvent
  | UserStoppedEvent
  | UserDismissedPromptEvent
  | RetryEvent
  // Phase 3 additions
  | RecalibrationRequestedEvent
  | FaceDetectionTimeoutEvent
  | FaceDetectedEvent
  | RecalibrationAcceptedEvent
  | RecalibrationDismissedEvent
  | CalibrationInvalidatedEvent;

// ============================================================================
// ACTIONS - Commands returned by state machine (executed by hook)
// ============================================================================

/**
 * Action: Start the webcam for normal detection.
 */
export interface StartWebcamAction {
  type: 'START_WEBCAM';
}

/**
 * Action: Stop the webcam (entering meeting mode or pending calibration).
 */
export interface StopWebcamAction {
  type: 'STOP_WEBCAM';
}

/**
 * Action: Start screen capture for meeting mode.
 */
export interface StartCaptureAction {
  type: 'START_CAPTURE';
  appName: string;
  sourceId?: string;
  displayId?: number;
}

/**
 * Action: Stop screen capture and clean up.
 */
export interface StopCaptureAction {
  type: 'STOP_CAPTURE';
}

/**
 * Action: Show the calibration UI.
 */
export interface ShowCalibrationUIAction {
  type: 'SHOW_CALIBRATION_UI';
  appName: string;
  screenshot?: {
    dataUrl: string;
    width: number;
    height: number;
  };
}

/**
 * Action: Hide the calibration UI.
 */
export interface HideCalibrationUIAction {
  type: 'HIDE_CALIBRATION_UI';
}

/**
 * Action: Show a notification to the user.
 */
export interface ShowNotificationAction {
  type: 'SHOW_NOTIFICATION';
  title: string;
  message: string;
  /** App name for context (e.g., for calibration prompts) */
  appName?: string;
  actions?: Array<{
    label: string;
    action: string; // Action ID to dispatch
  }>;
}

/**
 * Action: Initialize the canvas with calibration region.
 */
export interface InitCanvasAction {
  type: 'INIT_CANVAS';
  region: CaptureRegion;
  videoWidth: number;
  videoHeight: number;
}

/**
 * Action: Clear the canvas (during cleanup).
 */
export interface ClearCanvasAction {
  type: 'CLEAR_CANVAS';
}

/**
 * Action: Log a state transition for debugging.
 */
export interface LogTransitionAction {
  type: 'LOG_TRANSITION';
  from: MeetingModePhase;
  to: MeetingModePhase;
  event: string;
  timestamp: number;
}

/**
 * Union of all possible actions.
 */
export type MeetingModeAction =
  | StartWebcamAction
  | StopWebcamAction
  | StartCaptureAction
  | StopCaptureAction
  | ShowCalibrationUIAction
  | HideCalibrationUIAction
  | ShowNotificationAction
  | InitCanvasAction
  | ClearCanvasAction
  | LogTransitionAction;

// ============================================================================
// CONTEXT - State machine internal data
// ============================================================================

/**
 * Region coordinates for screen capture cropping.
 */
export interface CaptureRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calibration data for a specific meeting app.
 */
export interface MeetingCalibration {
  appName: string;
  region: CaptureRegion;
  displayId: number;
  calibrationWidth: number;
  calibrationHeight: number;
  createdAt: number;
  lastUsed: number;
}

/**
 * Internal context maintained by the state machine.
 */
export interface MeetingModeContext {
  /** Currently detected meeting app (null if none) */
  detectedApp: string | null;

  /** Source ID for screen capture (window or display) */
  sourceId: string | null;

  /** Display ID for multi-monitor support */
  displayId: number | null;

  /** Active calibration being used */
  activeCalibration: MeetingCalibration | null;

  /** Last error message (for ERROR state) */
  lastError: string | null;

  /** Whether the error is recoverable */
  errorRecoverable: boolean;

  /** Apps user has dismissed prompts for (session-only) */
  dismissedPrompts: Set<string>;

  /** Timestamp when current phase started */
  phaseStartedAt: number;

  /** Video dimensions (set when capture ready) */
  videoWidth: number;
  videoHeight: number;

  // ========== Phase 3 additions ==========

  /** Previous calibration saved during recalibration (for cancel recovery) */
  previousCalibration: MeetingCalibration | null;

  /** Whether we're in a recalibration flow (affects cancel behavior) */
  isRecalibrating: boolean;

  /** Timestamp of last face detection (for timeout tracking) */
  lastFaceDetected: number;
}

// ============================================================================
// TRANSITION RESULT - Output from state machine
// ============================================================================

/**
 * Result of a state machine transition.
 */
export interface TransitionResult {
  /** New phase after transition */
  phase: MeetingModePhase;

  /** Previous phase before transition */
  previousPhase: MeetingModePhase;

  /** Whether a transition occurred */
  transitioned: boolean;

  /** Actions to execute (side effects) */
  actions: MeetingModeAction[];

  /** Updated context */
  context: MeetingModeContext;

  /** Why transition was rejected (if transitioned=false) */
  rejectionReason: string | null;
}

// ============================================================================
// TRANSITION DEFINITION - For validation and documentation
// ============================================================================

/**
 * Definition of a valid transition.
 */
export interface TransitionDefinition {
  from: MeetingModePhase;
  event: MeetingModeEvent['type'];
  to: MeetingModePhase;
  condition?: string; // Human-readable condition
  actions: MeetingModeAction['type'][];
}

/**
 * All valid transitions (used for validation and documentation).
 */
export const VALID_TRANSITIONS: TransitionDefinition[] = [
  // From WEBCAM_ACTIVE
  {
    from: MeetingModePhase.WEBCAM_ACTIVE,
    event: 'MEETING_DETECTED',
    to: MeetingModePhase.STARTING_CAPTURE,
    condition: 'hasCalibration=true',
    actions: ['STOP_WEBCAM', 'START_CAPTURE'],
  },
  {
    from: MeetingModePhase.WEBCAM_ACTIVE,
    event: 'MEETING_DETECTED',
    to: MeetingModePhase.MEETING_DETECTED,
    condition: 'hasCalibration=false',
    actions: ['STOP_WEBCAM', 'SHOW_NOTIFICATION'],
  },

  // From MEETING_DETECTED
  {
    from: MeetingModePhase.MEETING_DETECTED,
    event: 'CALIBRATION_STARTED',
    to: MeetingModePhase.CALIBRATING,
    actions: ['SHOW_CALIBRATION_UI'],
  },
  {
    from: MeetingModePhase.MEETING_DETECTED,
    event: 'USER_DISMISSED_PROMPT',
    to: MeetingModePhase.WEBCAM_ACTIVE,
    actions: ['START_WEBCAM'],
  },
  {
    from: MeetingModePhase.MEETING_DETECTED,
    event: 'MEETING_ENDED',
    to: MeetingModePhase.WEBCAM_ACTIVE,
    actions: ['START_WEBCAM'],
  },

  // From CALIBRATING
  {
    from: MeetingModePhase.CALIBRATING,
    event: 'CALIBRATION_COMPLETED',
    to: MeetingModePhase.STARTING_CAPTURE,
    actions: ['HIDE_CALIBRATION_UI', 'START_CAPTURE'],
  },
  // Normal cancel: go to webcam
  {
    from: MeetingModePhase.CALIBRATING,
    event: 'CALIBRATION_CANCELLED',
    to: MeetingModePhase.WEBCAM_ACTIVE,
    condition: 'isRecalibrating=false',
    actions: ['HIDE_CALIBRATION_UI', 'START_WEBCAM'],
  },
  // Phase 3: Recalibration cancel - resume with old calibration
  {
    from: MeetingModePhase.CALIBRATING,
    event: 'CALIBRATION_CANCELLED',
    to: MeetingModePhase.STARTING_CAPTURE,
    condition: 'isRecalibrating=true',
    actions: ['HIDE_CALIBRATION_UI', 'START_CAPTURE'],
  },
  {
    from: MeetingModePhase.CALIBRATING,
    event: 'MEETING_ENDED',
    to: MeetingModePhase.WEBCAM_ACTIVE,
    actions: ['HIDE_CALIBRATION_UI', 'START_WEBCAM'],
  },

  // From STARTING_CAPTURE
  {
    from: MeetingModePhase.STARTING_CAPTURE,
    event: 'CAPTURE_READY',
    to: MeetingModePhase.CAPTURE_ACTIVE,
    actions: ['INIT_CANVAS'],
  },
  {
    from: MeetingModePhase.STARTING_CAPTURE,
    event: 'CAPTURE_FAILED',
    to: MeetingModePhase.ERROR,
    actions: ['SHOW_NOTIFICATION'],
  },
  {
    from: MeetingModePhase.STARTING_CAPTURE,
    event: 'MEETING_ENDED',
    to: MeetingModePhase.WEBCAM_ACTIVE,
    actions: ['STOP_CAPTURE', 'START_WEBCAM'],
  },

  // From CAPTURE_ACTIVE
  {
    from: MeetingModePhase.CAPTURE_ACTIVE,
    event: 'MEETING_ENDED',
    to: MeetingModePhase.STOPPING_CAPTURE,
    actions: ['STOP_CAPTURE'],
  },
  {
    from: MeetingModePhase.CAPTURE_ACTIVE,
    event: 'USER_STOPPED',
    to: MeetingModePhase.STOPPING_CAPTURE,
    actions: ['STOP_CAPTURE'],
  },
  {
    from: MeetingModePhase.CAPTURE_ACTIVE,
    event: 'CAPTURE_FAILED',
    to: MeetingModePhase.ERROR,
    actions: ['STOP_CAPTURE', 'SHOW_NOTIFICATION'],
  },
  // Phase 3: Recalibration during active capture
  {
    from: MeetingModePhase.CAPTURE_ACTIVE,
    event: 'RECALIBRATION_REQUESTED',
    to: MeetingModePhase.CALIBRATING,
    actions: ['STOP_CAPTURE', 'SHOW_CALIBRATION_UI'],
  },
  // Phase 3: Face detection timeout
  {
    from: MeetingModePhase.CAPTURE_ACTIVE,
    event: 'FACE_DETECTION_TIMEOUT',
    to: MeetingModePhase.CAPTURE_STALE,
    actions: ['SHOW_NOTIFICATION'],
  },
  // Phase 3: Calibration invalidated externally
  {
    from: MeetingModePhase.CAPTURE_ACTIVE,
    event: 'CALIBRATION_INVALIDATED',
    to: MeetingModePhase.MEETING_DETECTED,
    actions: ['STOP_CAPTURE', 'SHOW_NOTIFICATION'],
  },

  // From CAPTURE_STALE (Phase 3)
  {
    from: MeetingModePhase.CAPTURE_STALE,
    event: 'RECALIBRATION_ACCEPTED',
    to: MeetingModePhase.CALIBRATING,
    actions: ['STOP_CAPTURE', 'SHOW_CALIBRATION_UI'],
  },
  {
    from: MeetingModePhase.CAPTURE_STALE,
    event: 'RECALIBRATION_DISMISSED',
    to: MeetingModePhase.CAPTURE_ACTIVE,
    actions: [],
  },
  {
    from: MeetingModePhase.CAPTURE_STALE,
    event: 'FACE_DETECTED',
    to: MeetingModePhase.CAPTURE_ACTIVE,
    actions: [],
  },
  {
    from: MeetingModePhase.CAPTURE_STALE,
    event: 'MEETING_ENDED',
    to: MeetingModePhase.STOPPING_CAPTURE,
    actions: ['STOP_CAPTURE'],
  },

  // From STOPPING_CAPTURE
  {
    from: MeetingModePhase.STOPPING_CAPTURE,
    event: 'CAPTURE_STOPPED',
    to: MeetingModePhase.WEBCAM_ACTIVE,
    actions: ['CLEAR_CANVAS', 'START_WEBCAM'],
  },

  // From ERROR
  // Smart retry: if meeting still detected, go to STARTING_CAPTURE
  {
    from: MeetingModePhase.ERROR,
    event: 'RETRY',
    to: MeetingModePhase.STARTING_CAPTURE,
    condition: 'detectedApp != null',
    actions: ['START_CAPTURE'],
  },
  // Fallback retry: go to WEBCAM_ACTIVE
  {
    from: MeetingModePhase.ERROR,
    event: 'RETRY',
    to: MeetingModePhase.WEBCAM_ACTIVE,
    condition: 'detectedApp == null',
    actions: ['START_WEBCAM'],
  },
  {
    from: MeetingModePhase.ERROR,
    event: 'MEETING_ENDED',
    to: MeetingModePhase.WEBCAM_ACTIVE,
    actions: ['START_WEBCAM'],
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all valid events for a given phase.
 */
export function getValidEventsForPhase(phase: MeetingModePhase): MeetingModeEvent['type'][] {
  return VALID_TRANSITIONS
    .filter((t) => t.from === phase)
    .map((t) => t.event);
}

/**
 * Check if a transition is valid.
 */
export function isValidTransition(
  from: MeetingModePhase,
  event: MeetingModeEvent['type']
): boolean {
  return VALID_TRANSITIONS.some((t) => t.from === from && t.event === event);
}

/**
 * Create initial context.
 */
export function createInitialContext(): MeetingModeContext {
  return {
    detectedApp: null,
    sourceId: null,
    displayId: null,
    activeCalibration: null,
    lastError: null,
    errorRecoverable: false,
    dismissedPrompts: new Set(),
    phaseStartedAt: Date.now(),
    videoWidth: 0,
    videoHeight: 0,
    // Phase 3 additions
    previousCalibration: null,
    isRecalibrating: false,
    lastFaceDetected: Date.now(),
  };
}
