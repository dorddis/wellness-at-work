/**
 * Meeting Mode State Machine Hook
 *
 * React hook that wraps the pure MeetingModeStateMachine class.
 * Handles:
 * - Meeting detection polling (PowerShell every 3s)
 * - Side effect execution (start/stop capture, show UI)
 * - Zustand store synchronization
 * - DOM refs management
 *
 * Usage in App.tsx:
 * ```typescript
 * const { phase, send, isCapturing } = useMeetingModeStateMachine({
 *   meetingVideoRef,
 *   meetingCanvasRef,
 *   meetingStreamRef,
 *   isDetecting,
 * });
 * ```
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MeetingModeStateMachine,
  MeetingModePhase,
  MeetingModeEvent,
  MeetingModeAction,
  MeetingModeContext,
  TransitionResult,
  CaptureRegion,
} from '@lumina/core';
import { useMeetingModeStore } from '../stores/meetingModeStore';

// ============================================================================
// TYPES
// ============================================================================

export interface UseMeetingModeStateMachineOptions {
  /** Ref to the hidden video element for screen capture */
  meetingVideoRef: React.RefObject<HTMLVideoElement | null>;
  /** Ref to the hidden canvas for cropped region */
  meetingCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Mutable ref to the active MediaStream */
  meetingStreamRef: React.MutableRefObject<MediaStream | null>;
  /** Whether detection is currently active */
  isDetecting: boolean;
  /** Callback when calibration UI should be shown */
  onShowCalibrationUI?: (appName: string) => void;
  /** Callback when calibration UI should be hidden */
  onHideCalibrationUI?: () => void;
  /** Callback to show notifications */
  onShowNotification?: (title: string, message: string, actions?: Array<{ label: string; action: string }>) => void;
  /** Enable debug logging */
  debug?: boolean;
}

export interface UseMeetingModeStateMachineReturn {
  /** Current phase of the state machine */
  phase: MeetingModePhase;
  /** Current context (detected app, calibration, etc.) */
  context: MeetingModeContext;
  /** Send an event to the state machine */
  send: (event: MeetingModeEvent) => TransitionResult;
  /** Whether screen capture is currently active */
  isCapturing: boolean;
  /** Whether waiting for calibration */
  isWaitingForCalibration: boolean;
  /** Whether capture is starting (async in progress) */
  isStarting: boolean;
  /** Whether webcam should be active */
  shouldWebcamBeActive: boolean;
  /** Human-readable state description */
  stateDescription: string;
  /** Force reset the state machine */
  reset: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MEETING_DETECTION_INTERVAL_MS = 3000;
const CAPTURE_READY_TIMEOUT_MS = 10000;

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useMeetingModeStateMachine(
  options: UseMeetingModeStateMachineOptions
): UseMeetingModeStateMachineReturn {
  const {
    meetingVideoRef,
    meetingCanvasRef,
    meetingStreamRef,
    isDetecting,
    onShowCalibrationUI,
    onHideCalibrationUI,
    onShowNotification,
    debug = false,
  } = options;

  // State machine instance (stable across renders)
  const machineRef = useRef<MeetingModeStateMachine>(
    new MeetingModeStateMachine({ debug })
  );

  // Force re-render when phase changes
  const [phase, setPhase] = useState<MeetingModePhase>(MeetingModePhase.WEBCAM_ACTIVE);
  const [context, setContext] = useState<MeetingModeContext>(machineRef.current.getContext());

  // Zustand store
  const {
    enabled: meetingModeEnabled,
    calibrations,
    setActive: setStoreActive,
    getCalibration,
    hasCalibration,
    touchCalibration,
  } = useMeetingModeStore();

  // Track if component is mounted (prevent state updates after unmount)
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ==========================================================================
  // ACTION EXECUTORS
  // ==========================================================================

  /**
   * Execute a single action returned by the state machine.
   * These are the side effects.
   */
  const executeAction = useCallback(
    async (action: MeetingModeAction): Promise<void> => {
      if (!isMountedRef.current) return;

      switch (action.type) {
        case 'START_WEBCAM':
          // Camera is controlled by App.tsx via shouldWebcamBeActive
          // This action is informational - the effect will pick it up
          if (debug) console.log('[MeetingMode] Action: START_WEBCAM');
          break;

        case 'STOP_WEBCAM':
          // Camera is controlled by App.tsx
          if (debug) console.log('[MeetingMode] Action: STOP_WEBCAM');
          break;

        case 'START_CAPTURE':
          if (debug) console.log('[MeetingMode] Action: START_CAPTURE', action);
          await startScreenCapture(action.appName, action.sourceId, action.displayId);
          break;

        case 'STOP_CAPTURE':
          if (debug) console.log('[MeetingMode] Action: STOP_CAPTURE');
          await stopScreenCapture();
          break;

        case 'SHOW_CALIBRATION_UI':
          if (debug) console.log('[MeetingMode] Action: SHOW_CALIBRATION_UI', action.appName);
          onShowCalibrationUI?.(action.appName);
          break;

        case 'HIDE_CALIBRATION_UI':
          if (debug) console.log('[MeetingMode] Action: HIDE_CALIBRATION_UI');
          onHideCalibrationUI?.();
          break;

        case 'SHOW_NOTIFICATION':
          if (debug) console.log('[MeetingMode] Action: SHOW_NOTIFICATION', action.title);
          onShowNotification?.(action.title, action.message, action.actions);
          break;

        case 'INIT_CANVAS':
          if (debug) console.log('[MeetingMode] Action: INIT_CANVAS', action.region);
          initializeCanvas(action.region, action.videoWidth, action.videoHeight);
          break;

        case 'CLEAR_CANVAS':
          if (debug) console.log('[MeetingMode] Action: CLEAR_CANVAS');
          clearCanvas();
          break;

        case 'LOG_TRANSITION':
          console.log(
            `[MeetingMode] ${action.from} -> ${action.to} (${action.event})`
          );
          break;
      }
    },
    [debug, onShowCalibrationUI, onHideCalibrationUI, onShowNotification]
  );

  /**
   * Start screen capture for meeting mode.
   */
  const startScreenCapture = useCallback(
    async (appName: string, sourceId?: string, displayId?: number): Promise<void> => {
      try {
        // Get calibration for coordinate scaling
        const calibration = getCalibration(appName);
        if (!calibration) {
          send({ type: 'CAPTURE_FAILED', error: 'Calibration not found', recoverable: true });
          return;
        }

        // Get source ID if not provided
        let captureSourceId = sourceId;
        const meetingAPI = getMeetingModeAPI();
        if (!captureSourceId && meetingAPI) {
          captureSourceId = await meetingAPI.getWindowSourceId(appName) ?? undefined;
          if (!captureSourceId) {
            captureSourceId = await meetingAPI.getSourceId(
              displayId ?? calibration.displayId
            ) ?? undefined;
          }
        }

        if (!captureSourceId) {
          send({ type: 'CAPTURE_FAILED', error: 'Could not find capture source', recoverable: true });
          return;
        }

        // Request screen capture
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: captureSourceId,
              minWidth: 1280,
              maxWidth: 3840,
              minHeight: 720,
              maxHeight: 2160,
            },
          } as MediaTrackConstraints,
        });

        // Store stream
        meetingStreamRef.current = stream;

        // Set up video element
        const video = meetingVideoRef.current;
        if (!video) {
          stream.getTracks().forEach((t) => t.stop());
          send({ type: 'CAPTURE_FAILED', error: 'Video element not available', recoverable: true });
          return;
        }

        video.srcObject = stream;

        // Set up track ended handler
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            if (isMountedRef.current) {
              send({ type: 'CAPTURE_FAILED', error: 'Screen capture ended', recoverable: false });
            }
          };
        }

        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Video ready timeout'));
          }, CAPTURE_READY_TIMEOUT_MS);

          if (video.readyState >= 2) {
            clearTimeout(timeout);
            resolve();
          } else {
            video.onloadeddata = () => {
              clearTimeout(timeout);
              resolve();
            };
            video.onerror = () => {
              clearTimeout(timeout);
              reject(new Error('Video load error'));
            };
          }
        });

        await video.play();

        // Check video dimensions
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          throw new Error('Video dimensions are zero');
        }

        // Update calibration lastUsed
        touchCalibration(appName);

        // Store calibration in state machine
        machineRef.current.setActiveCalibration({
          appName: calibration.appName,
          region: calibration.region,
          displayId: calibration.displayId,
          calibrationWidth: calibration.calibrationWidth ?? video.videoWidth,
          calibrationHeight: calibration.calibrationHeight ?? video.videoHeight,
          createdAt: calibration.createdAt,
          lastUsed: Date.now(),
        });

        // Signal capture is ready
        send({
          type: 'CAPTURE_READY',
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        send({ type: 'CAPTURE_FAILED', error: message, recoverable: true });
      }
    },
    [meetingVideoRef, meetingStreamRef, getCalibration, touchCalibration]
  );

  /**
   * Stop screen capture and clean up.
   */
  const stopScreenCapture = useCallback(async (): Promise<void> => {
    try {
      // Stop all tracks
      if (meetingStreamRef.current) {
        meetingStreamRef.current.getTracks().forEach((track) => {
          track.onended = null;
          track.stop();
        });
        meetingStreamRef.current = null;
      }

      // Clear video element
      const video = meetingVideoRef.current;
      if (video) {
        video.srcObject = null;
      }

      // Signal capture stopped
      send({ type: 'CAPTURE_STOPPED' });
    } catch (error) {
      // Even if cleanup fails, signal stopped
      send({ type: 'CAPTURE_STOPPED' });
    }
  }, [meetingVideoRef, meetingStreamRef]);

  /**
   * Initialize canvas with calibration region.
   */
  const initializeCanvas = useCallback(
    (region: CaptureRegion, videoWidth: number, videoHeight: number): void => {
      const canvas = meetingCanvasRef.current;
      const video = meetingVideoRef.current;
      if (!canvas || !video) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size to region size
      canvas.width = region.width;
      canvas.height = region.height;

      // Draw first frame
      try {
        ctx.drawImage(
          video,
          region.x,
          region.y,
          region.width,
          region.height,
          0,
          0,
          region.width,
          region.height
        );
      } catch (e) {
        console.warn('[MeetingMode] First frame draw failed:', e);
      }
    },
    [meetingCanvasRef, meetingVideoRef]
  );

  /**
   * Clear the canvas.
   */
  const clearCanvas = useCallback((): void => {
    const canvas = meetingCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Reset to default size
    canvas.width = 300;
    canvas.height = 150;
  }, [meetingCanvasRef]);

  // ==========================================================================
  // SEND FUNCTION
  // ==========================================================================

  /**
   * Send an event to the state machine and execute resulting actions.
   */
  const send = useCallback(
    (event: MeetingModeEvent): TransitionResult => {
      const machine = machineRef.current;
      const result = machine.transition(event);

      // Update React state
      if (isMountedRef.current) {
        setPhase(result.phase);
        setContext(result.context);
      }

      // Sync to Zustand store
      const isNowCapturing = result.phase === MeetingModePhase.CAPTURE_ACTIVE;
      setStoreActive(isNowCapturing, result.context.detectedApp);

      // Execute actions (async, fire and forget)
      for (const action of result.actions) {
        executeAction(action).catch((e) => {
          console.error('[MeetingMode] Action failed:', action.type, e);
        });
      }

      return result;
    },
    [executeAction, setStoreActive]
  );

  // ==========================================================================
  // MEETING DETECTION POLLING
  // ==========================================================================
  // NOTE: Polling is DISABLED while running alongside existing App.tsx code.
  // The existing code handles detection; this hook just tracks state.
  // Enable polling when this hook fully replaces the old meeting mode code.
  // ==========================================================================

  /*
  // DISABLED: Causes duplicate polling when running alongside existing code
  useEffect(() => {
    if (!isDetecting || !meetingModeEnabled) return;

    const checkForMeeting = async () => {
      if (!isMountedRef.current) return;

      const machine = machineRef.current;
      const currentPhase = machine.getPhase();

      // Only poll in states where we care about meeting detection
      if (
        currentPhase !== MeetingModePhase.WEBCAM_ACTIVE &&
        currentPhase !== MeetingModePhase.CAPTURE_ACTIVE
      ) {
        return;
      }

      try {
        // Detect meeting via IPC (uses actual API: detectApp)
        const meetingAPI = getMeetingModeAPI();
        const result = await meetingAPI?.detectApp();
        if (!isMountedRef.current) return;

        if (result?.isDetected && result.appName) {
          const appName = result.appName;

          // Check if already handling this meeting
          if (currentPhase === MeetingModePhase.CAPTURE_ACTIVE) {
            const ctx = machine.getContext();
            if (ctx.detectedApp?.toLowerCase() === appName.toLowerCase()) {
              // Same meeting, still running - no action needed
              return;
            }
          }

          // Check if user dismissed this app
          if (machine.wasPromptDismissed(appName)) {
            return;
          }

          // Check if we have calibration
          const hasCalib = hasCalibration(appName);

          // Send meeting detected event
          // Note: sourceId is obtained later via getWindowSourceId/getSourceId when starting capture
          send({
            type: 'MEETING_DETECTED',
            appName,
            hasCalibration: hasCalib,
          });
        } else if (currentPhase === MeetingModePhase.CAPTURE_ACTIVE) {
          // Meeting ended while we were capturing
          send({ type: 'MEETING_ENDED' });
        }
      } catch (error) {
        console.error('[MeetingMode] Detection error:', error);
      }
    };

    // Run immediately
    checkForMeeting();

    // Set up polling interval
    const interval = setInterval(checkForMeeting, MEETING_DETECTION_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [isDetecting, meetingModeEnabled, hasCalibration, send]);
  */

  // ==========================================================================
  // CLEANUP ON UNMOUNT
  // ==========================================================================

  useEffect(() => {
    return () => {
      // Stop capture if active
      if (meetingStreamRef.current) {
        meetingStreamRef.current.getTracks().forEach((t) => t.stop());
        meetingStreamRef.current = null;
      }
    };
  }, [meetingStreamRef]);

  // ==========================================================================
  // RETURN VALUE
  // ==========================================================================

  const reset = useCallback(() => {
    machineRef.current.reset();
    setPhase(MeetingModePhase.WEBCAM_ACTIVE);
    setContext(machineRef.current.getContext());
    setStoreActive(false, null);
  }, [setStoreActive]);

  return {
    phase,
    context,
    send,
    isCapturing: phase === MeetingModePhase.CAPTURE_ACTIVE,
    isWaitingForCalibration:
      phase === MeetingModePhase.MEETING_DETECTED ||
      phase === MeetingModePhase.CALIBRATING,
    isStarting: phase === MeetingModePhase.STARTING_CAPTURE,
    shouldWebcamBeActive: phase === MeetingModePhase.WEBCAM_ACTIVE,
    stateDescription: machineRef.current.getStateDescription(),
    reset,
  };
}

// ============================================================================
// TYPED ACCESSOR FOR ELECTRON IPC
// Avoids global Window declaration conflicts with apps/desktop/src/preload/index.ts
// ============================================================================

interface MeetingDetectionResult {
  isDetected: boolean;
  appName: string | null;
  processName?: string;
}

interface MeetingModeAPI {
  detectApp: () => Promise<MeetingDetectionResult>;
  getWindowSourceId: (appName: string) => Promise<string | null>;
  getSourceId: (displayId?: number) => Promise<string | null>;
  captureScreenshot: (sourceId: string) => Promise<{
    dataUrl: string;
    width: number;
    height: number;
  } | null>;
}

/**
 * Type-safe accessor for window.lumina.meetingMode
 * Uses any cast internally to avoid global Window type conflicts
 */
function getMeetingModeAPI(): MeetingModeAPI | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).lumina?.meetingMode as MeetingModeAPI | undefined;
}

export default useMeetingModeStateMachine;
