import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  useSessionStore,
  useAlertStore,
  useSettingsStore,
  useStreakStore,
  useAchievementStore,
  useMeetingModeStore,
  PrivacyIndicator,
  PostureStatusCard,
  WeeklyTrendCard,
  StreakBadge,
  AchievementBadge,
  PreBreakToast,
  EarWaveform,
  ProductTour,
  Select,
  ACHIEVEMENTS,
  type DayData,
  type CaptureRegion,
  type SelectOption,
} from '@lumina/ui';
// Desktop-only component - imports @lumina/core which has @mediapipe/tasks-vision
// Must import directly to avoid breaking web builds
import { OnboardingFlow } from '@lumina/ui/components/onboarding';
// Desktop-only hook - imports @lumina/core which has @mediapipe/tasks-vision
// Must import directly to avoid breaking web builds
import { useMeetingModeStateMachine } from '@lumina/ui/hooks/useMeetingModeStateMachine';
import {
  FaceLandmarkerManager,
  AlertEngine,
  BaselineCalibrator,
  calculateCropRegion,
  MeetingModePhase,
  type WellnessMetrics,
  type Baseline,
  type FrameResult,
  type PostureResult,
  type YawnResult,
  type DrowsinessResult,
  type DrowsinessLevel,
} from '@lumina/core';
import luminaLogo from './assets/lumina-logo.png';
import AuthScreen from './AuthScreen';
import { AppLoader, CameraLoader, HistorySkeleton, Icons, StatCard, MeetingModeNotification, type CameraStatus } from './components';
import { MeetingModeCalibration, MeetingModeStatus, type CalibrationResult } from './components/MeetingModeCalibration';
import { useAuth, useBreakReminder } from './hooks';
import {
  AlertsService,
  DatabaseService,
  DetectionService,
  MeetingModeService,
  MeetingModeEvents,
  NotificationService,
  SyncService,
} from './services';
import type { AuthUser, View, WellnessEventType, DatabaseWrite } from './types';
import { DashboardView, ExercisesView, HistoryView, MeetingModeView, MonitorView, SettingsView } from './views';

// Web dashboard URL (Vercel deployment)
const WEB_DASHBOARD_URL = 'https://lumina-rho-sandy.vercel.app';

// Meeting Mode Debug Config
// Set to true to enable debug logging for meeting mode state/video issues
// Logs first N frames after meeting mode activation to diagnose re-entry bugs
const DEBUG_MEETING_MODE = import.meta.env.VITE_DEBUG_MEETING_MODE === 'true';
const DEBUG_MEETING_MAX_FRAMES = 5; // Only log first N frames to avoid log bloat

// Detection manager (singleton)
const landmarkerManager = new FaceLandmarkerManager();

// Alert engine (singleton)
const alertEngine = new AlertEngine();

// Baseline calibrator (singleton)
const baselineCalibrator = new BaselineCalibrator();

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRollupTimeRef = useRef<number>(0);
  const minuteBlinkCountRef = useRef<number>(0);
  const minuteEarSumRef = useRef<number>(0);
  const minuteEarCountRef = useRef<number>(0);
  // For slope calculation
  const prevEarRef = useRef<{ ear: number; timestamp: number } | null>(null);
  // Database write queue - flushed every 2 seconds
  const dbWriteQueueRef = useRef<DatabaseWrite[]>([]);
  // Refs for values used in blink rate update interval (avoids 12-dependency effect)
  const blinkCountRef = useRef<number>(0);
  const faceDetectedRef = useRef<boolean>(false);
  const currentPostureRef = useRef<PostureResult | null>(null);
  const currentYawnRef = useRef<YawnResult | null>(null);
  const currentDrowsinessRef = useRef<DrowsinessResult | null>(null);
  const userBaselineRef = useRef<Baseline | null>(null);
  const isCalibratingRef = useRef<boolean>(false);
  // Ref for meeting mode face detection callback (avoids effect restarts)
  const onMeetingFaceDetectedRef = useRef<(() => void) | null>(null);

  // Auth state (from hook)
  const { authUser, authChecked, handleAuthComplete, handleSignOut } = useAuth();

  // Current view
  const [currentView, setCurrentView] = useState<View>('dashboard');

  // Window state (for frameless window controls)
  const [isMaximized, setIsMaximized] = useState(false);

  // Zustand stores - using selective subscriptions to reduce re-renders
  // State values use individual selectors (only re-renders when that specific value changes)
  const isDetecting = useSessionStore((s) => s.isDetecting);
  const faceDetected = useSessionStore((s) => s.faceDetected);
  const blinkCount = useSessionStore((s) => s.blinkCount);
  const currentBlinkRate = useSessionStore((s) => s.currentBlinkRate);
  const wellnessScore = useSessionStore((s) => s.wellnessScore);
  // Actions are stable references, safe to destructure once
  const { setDetecting, updateBlinkRate, updateWellnessScore, startSession } = useSessionStore.getState();

  const alerts = useAlertStore((s) => s.alerts);
  const { addAlert, dismissAlert } = useAlertStore.getState();

  // Onboarding state + cloud sync control
  const {
    hasCompletedOnboarding,
    setOnboardingComplete,
    setWellnessGoals,
    setSelectedCameraId: saveSelectedCameraId,
    selectedCameraId: savedCameraId,
    earCalibration,
    setEarCalibration,
    hasCompletedProductTour,
    setProductTourComplete,
    cloudSyncEnabled: appCloudSyncEnabled, // Used for auto-sync control after auth
  } = useSettingsStore();

  // Camera state
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const currentStreamRef = useRef<MediaStream | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  // Local state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [todayStats, setTodayStats] = useState({
    totalBlinks: 0,
    avgBlinkRate: 0,
    sessionMinutes: 0,
    breaksCount: 0,
  });

  // Break reminder state (from hook)
  const {
    isOnBreak,
    breakTimeRemaining,
    showPreBreakToast,
    preBreakSeconds,
    postponesRemaining,
    handleTakeBreak,
    handleSkipBreak,
    handleStartBreakNow,
    handlePostponeBreak,
  } = useBreakReminder({
    isDetecting,
    setDetecting,
    onBreakComplete: useCallback(() => {
      setTodayStats(prev => ({
        ...prev,
        breaksCount: prev.breaksCount + 1,
      }));
    }, []),
  });

  // Baseline calibration state
  const [userBaseline, setUserBaseline] = useState<Baseline | null>(null);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Wellness detection state (posture, yawn, drowsiness)
  const [currentPosture, setCurrentPosture] = useState<PostureResult | null>(null);
  const [currentYawn, setCurrentYawn] = useState<YawnResult | null>(null);
  const [currentDrowsiness, setCurrentDrowsiness] = useState<DrowsinessResult | null>(null);
  const lastYawnCountRef = useRef<number>(0);
  const lastDrowsinessLevelRef = useRef<DrowsinessLevel>('alert');

  // Batched detection updates (replaces individual setFaceDetected, addWaveformPoint, recordBlink)
  const processDetection = useSessionStore((state) => state.processDetection);

  // Meeting Mode state
  const {
    enabled: meetingModeEnabled,
    isActive: meetingModeActive,
    autoDetect: meetingAutoDetect,
    calibrations: meetingCalibrations,
    setEnabled: setMeetingModeEnabled,
    setActive: setMeetingModeActive,
    touchCalibration,
    addCalibration: addMeetingCalibration,
  } = useMeetingModeStore();

  // Meeting mode refs (passed to state machine hook)
  const meetingVideoRef = useRef<HTMLVideoElement>(null);
  const meetingCanvasRef = useRef<HTMLCanvasElement>(null);
  const meetingStreamRef = useRef<MediaStream | null>(null);
  // Cached canvas context (avoids getContext() call every frame)
  const meetingCanvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Meeting mode calibration UI state (controlled by state machine via callbacks)
  const [showCalibrationUI, setShowCalibrationUI] = useState(false);
  const [calibrationAppName, setCalibrationAppName] = useState<string>('');
  // Pre-captured screenshot for calibration (captured before window focus)
  const [preCapturedScreenshot, setPreCapturedScreenshot] = useState<{
    dataUrl: string;
    width: number;
    height: number;
    scaleFactor: number;
  } | null>(null);

  // Meeting mode notification state (shown before calibration)
  const [showMeetingNotification, setShowMeetingNotification] = useState(false);
  const [meetingNotificationData, setMeetingNotificationData] = useState<{
    title: string;
    message: string;
    appName: string;
    actions: Array<{ label: string; action: string }>;
  } | null>(null);

  // ==========================================================================
  // MEETING MODE STATE MACHINE (NEW)
  // This hook manages all meeting mode transitions. Currently running alongside
  // existing code for validation. Will replace old code in App.tsx refactor.
  // ==========================================================================
  const {
    phase: meetingPhase,
    context: meetingContext,
    send: sendMeetingEvent,
    isCapturing: isMeetingCapturing,
    isWaitingForCalibration,
    isStarting: isMeetingStarting,
    isStale: isMeetingStale,
    stateDescription: meetingStateDescription,
    reset: resetMeetingStateMachine,
    onFaceDetected: onMeetingFaceDetected,
  } = useMeetingModeStateMachine({
    meetingVideoRef,
    meetingCanvasRef,
    meetingStreamRef,
    isDetecting,
    onShowCalibrationUI: (appName) => {
      setCalibrationAppName(appName);
      setShowCalibrationUI(true);
    },
    onHideCalibrationUI: () => {
      setShowCalibrationUI(false);
    },
    onShowNotification: (title, message, actions, appName) => {
      // Show system-level alert that appears on top of everything
      // The overlay window handles displaying the AlertToast component
      const detectedAppName = appName || meetingContext.detectedApp || 'Meeting';
      console.log('[MeetingMode] Showing system alert:', title, 'for app:', detectedAppName);

      // Use AlertsService to show the alert in the overlay window (always on top)
      AlertsService.show({
        id: `meeting-detected-${Date.now()}`,
        type: 'meeting_detected',
        severity: 'info',
        message: `${detectedAppName} detected. ${message}`,
        action: 'Set up eye tracking for this meeting?',
        actionButtonText: actions?.[0]?.label || 'Set Up Now',
      });
    },
    debug: false, // Set to true for transition logging
  });

  // Handle meeting mode notification actions
  const handleMeetingNotificationAction = useCallback((action: string) => {
    console.log('[MeetingMode] Notification action:', action);
    setShowMeetingNotification(false);

    if (action === 'CALIBRATION_STARTED' && meetingNotificationData?.appName) {
      // User wants to set up meeting mode - show calibration UI
      setCalibrationAppName(meetingNotificationData.appName);
      setShowCalibrationUI(true);
      setMeetingModeEnabled(true);
      sendMeetingEvent({ type: 'CALIBRATION_STARTED', appName: meetingNotificationData.appName });
    } else if (action === 'USER_DISMISSED_PROMPT') {
      // User dismissed - send event to state machine
      sendMeetingEvent({ type: 'USER_DISMISSED_PROMPT' });
    }

    setMeetingNotificationData(null);
  }, [meetingNotificationData, sendMeetingEvent, setMeetingModeEnabled]);

  // Handle meeting mode notification dismiss
  const handleMeetingNotificationDismiss = useCallback(() => {
    console.log('[MeetingMode] Notification dismissed');
    setShowMeetingNotification(false);
    setMeetingNotificationData(null);
    // Send dismiss event to state machine
    sendMeetingEvent({ type: 'USER_DISMISSED_PROMPT' });
  }, [sendMeetingEvent]);

  // Check window maximize state on mount
  useEffect(() => {
    async function checkMaximized() {
      const maximized = await window.lumina?.window.isMaximized();
      setIsMaximized(maximized ?? false);
    }
    checkMaximized();
  }, []);

  // Window control handlers
  const handleMinimize = () => window.lumina?.window.minimize();
  const handleMaximize = async () => {
    await window.lumina?.window.maximize();
    const maximized = await window.lumina?.window.isMaximized();
    setIsMaximized(maximized ?? false);
  };
  const handleClose = () => window.lumina?.window.close();

  // Start auto-sync after auth if cloudSyncEnabled is true (GDPR local-only mode support)
  useEffect(() => {
    if (!authUser) return;

    if (appCloudSyncEnabled) {
      console.log('[Sync] Starting auto-sync (cloudSyncEnabled=true)');
      SyncService.startAuto();
    } else {
      console.log('[Sync] Auto-sync disabled (local-only mode)');
      SyncService.stopAuto();
    }
  }, [authUser, appCloudSyncEnabled]);

  // Load baseline from database on auth
  useEffect(() => {
    if (!authUser) return;

    async function loadBaseline() {
      try {
        const existingBaseline = await DatabaseService.getBaseline();
        if (existingBaseline && existingBaseline.blink_p50 !== null) {
          const baseline: Baseline = {
            blinkP25: existingBaseline.blink_p25 ?? 0,
            blinkP50: existingBaseline.blink_p50 ?? 0,
            blinkP75: existingBaseline.blink_p75 ?? 0,
            calibratedAt: existingBaseline.calibrated_at ?? Date.now(),
            samplesCount: existingBaseline.samples_count,
          };
          baselineCalibrator.loadBaseline(baseline);
          setUserBaseline(baseline);
          setCalibrationProgress(1);
        } else {
          // No baseline - start calibrating
          setIsCalibrating(true);
        }
      } catch (error) {
        console.error('Failed to load baseline:', error);
        setIsCalibrating(true);
      }
    }
    loadBaseline();
  }, [authUser]);

  // Initialize MediaPipe only (expensive, do once on auth)
  useEffect(() => {
    if (!authUser) return;

    async function initMediaPipe() {
      try {
        console.log('[MediaPipe] Initializing FaceLandmarker...');

        // Convert stored calibration format (ISO string) to EARCalibration format (timestamp)
        const existingCalibration = earCalibration
          ? {
              threshold: earCalibration.threshold,
              openEAR: earCalibration.openEAR,
              closedEAR: earCalibration.closedEAR,
              calibratedAt: new Date(earCalibration.calibratedAt).getTime(),
              samplesCount: earCalibration.samplesCount,
            }
          : undefined;

        await landmarkerManager.initialize({
          delegate: 'GPU',
          runningMode: 'VIDEO',
          existingCalibration,
        });
        console.log('[MediaPipe] Initialized successfully', existingCalibration ? '(with calibration)' : '(no calibration)');

        // List available cameras (for UI)
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        console.log('[Camera] Available cameras:', videoDevices.length);
        setCameras(videoDevices);

        setIsLoading(false);
      } catch (err) {
        console.error('[MediaPipe] Initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize MediaPipe');
        setIsLoading(false);
      }
    }

    initMediaPipe();

    return () => {
      landmarkerManager.close();
    };
  }, [authUser]);

  // Start camera when detection starts (unless in meeting mode or waiting for calibration), stop when it stops
  useEffect(() => {
    // Don't use webcam when:
    // - Detection is not running
    // - Meeting mode is actively capturing screen
    // - Waiting for user to calibrate (meeting detected, no calibration)
    // - Meeting mode is starting capture (async operation in progress)
    if (!isDetecting || isMeetingCapturing || isWaitingForCalibration || isMeetingStarting) {
      // Stop camera when detection stops OR when meeting mode is active OR waiting for calibration
      if (currentStreamRef.current) {
        console.log('[Camera] Stopping camera...');
        currentStreamRef.current.getTracks().forEach(track => track.stop());
        currentStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsVideoReady(false);

      // Early exit cases
      if (!isDetecting) {
        return;
      }

      // Waiting for calibration - camera stopped, user needs to calibrate first
      if (isWaitingForCalibration) {
        return;
      }

      // In meeting mode, detection continues with screen capture video
      if (isMeetingCapturing && meetingVideoRef.current && meetingVideoRef.current.readyState >= 2) {
        setIsVideoReady(true);
      }
      return;
    }

    // Start camera when detection starts (only if not in meeting mode)
    let mounted = true;

    async function startCamera() {
      try {
        console.log('[Camera] Starting camera...', selectedCameraId ? `(device: ${selectedCameraId})` : '(default)');

        // Use selected camera if available, otherwise use default
        const videoConstraints: MediaTrackConstraints = selectedCameraId
          ? { deviceId: { exact: selectedCameraId }, width: { ideal: 640 }, height: { ideal: 480 } }
          : { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' };

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
        });

        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        console.log('[Camera] Got stream:', stream.getVideoTracks()[0]?.label);
        currentStreamRef.current = stream;

        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = stream;

          // Wait for video to be ready with polling
          await new Promise<void>((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 100; // 5 seconds max

            const checkVideo = () => {
              if (!mounted) {
                reject(new Error('Unmounted'));
                return;
              }

              if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
                console.log('[Camera] Video ready:', video.videoWidth, 'x', video.videoHeight);
                resolve();
                return;
              }

              attempts++;
              if (attempts >= maxAttempts) {
                reject(new Error('Video timeout - no dimensions after 5s'));
                return;
              }

              setTimeout(checkVideo, 50);
            };

            // Start playing first, then check
            video.play().then(() => {
              console.log('[Camera] Video.play() called');
              checkVideo();
            }).catch(reject);
          });

          if (mounted) {
            setIsVideoReady(true);
            console.log('[Camera] Camera ready and playing');
          }
        }
      } catch (err) {
        if (mounted) {
          console.error('[Camera] Error:', err);
          // Don't show blocking error if meeting mode is active or waiting - user can still use app
          // Camera will restart when meeting mode ends or calibration is cancelled
          if (!isWaitingForCalibration && !isMeetingCapturing) {
            // Camera failed - check if we can fall back to meeting mode
            try {
              const meetingResult = await MeetingModeService.detectApp();
              if (meetingResult.isDetected && meetingResult.appName) {
                const calibrations = useMeetingModeStore.getState().calibrations;
                const hasCalibration = calibrations.some(
                  (c) => c.appName.toLowerCase() === meetingResult.appName!.toLowerCase()
                );
                if (hasCalibration) {
                  console.log('[Camera] Camera failed but meeting detected with calibration, will auto-start meeting mode');
                  // Don't show error - state machine will start meeting mode
                  return;
                }
              }
            } catch {
              // Ignore meeting detection errors
            }
            setError(err instanceof Error ? err.message : 'Camera error');
          }
        }
      }
    }

    startCamera();

    return () => {
      mounted = false;
    };
  }, [isDetecting, isMeetingCapturing, isWaitingForCalibration, isMeetingStarting, selectedCameraId]);

  // Camera change handler - updates local state and persists to settings
  const handleCameraChange = (newCameraId: string) => {
    console.log('[Camera] Switching to:', newCameraId);
    setSelectedCameraId(newCameraId);
    saveSelectedCameraId(newCameraId);
  };

  // ==========================================================================
  // MEETING MODE: IPC handlers for notification/alert clicks
  // Note: The state machine hook handles polling, detection, and capture.
  // These handlers respond to user actions from notifications/alerts.
  // ==========================================================================

  // Handle notification click - navigate to Meeting Mode view and start calibration
  useEffect(() => {
    const handleMeetingModeNavigate = () => {
      setCurrentView('meetingMode');
      // If waiting for calibration (meeting detected, no calibration), trigger calibration
      if (isWaitingForCalibration && meetingContext.detectedApp) {
        setCalibrationAppName(meetingContext.detectedApp);
        setShowCalibrationUI(true);
        setMeetingModeEnabled(true);
        sendMeetingEvent({ type: 'CALIBRATION_STARTED', appName: meetingContext.detectedApp });
      }
    };

    MeetingModeEvents.onNavigate(handleMeetingModeNavigate);
    return () => {
      MeetingModeEvents.offNavigate(handleMeetingModeNavigate);
    };
  }, [isWaitingForCalibration, meetingContext.detectedApp, sendMeetingEvent, setMeetingModeEnabled]);

  // Handle alert action button click - start calibration directly
  useEffect(() => {
    const handleStartCalibration = async (data: { screenshot?: { dataUrl: string; width: number; height: number; scaleFactor: number } | null }) => {
      // Store pre-captured screenshot if provided
      if (data?.screenshot) {
        console.log('[MeetingMode] Received pre-captured screenshot:', data.screenshot.width, 'x', data.screenshot.height);
        setPreCapturedScreenshot(data.screenshot);
      }

      // Use detected app from state machine context
      if (meetingContext.detectedApp) {
        console.log('[MeetingMode] Starting calibration for:', meetingContext.detectedApp);
        setCalibrationAppName(meetingContext.detectedApp);
        setShowCalibrationUI(true);
        setMeetingModeEnabled(true);
        sendMeetingEvent({ type: 'CALIBRATION_STARTED', appName: meetingContext.detectedApp });
        return;
      }

      // Fallback: detect which meeting app is running (may fail if window focused)
      try {
        console.log('[MeetingMode] No detected app in context, attempting detection...');
        const result = await MeetingModeService.detectApp();
        if (result.isDetected && result.appName) {
          console.log('[MeetingMode] Detected app:', result.appName);
          setCalibrationAppName(result.appName);
          setShowCalibrationUI(true);
          setMeetingModeEnabled(true);
          sendMeetingEvent({ type: 'CALIBRATION_STARTED', appName: result.appName });
        } else {
          console.warn('[MeetingMode] Detection failed, no app found');
          NotificationService.show({
            title: 'Calibration Error',
            body: 'Could not detect meeting app. Please make sure your meeting is visible and try again.',
            silent: false,
            type: 'general',
          });
        }
      } catch (err) {
        console.error('[MeetingMode] Failed to detect app for calibration:', err);
        NotificationService.show({
          title: 'Calibration Error',
          body: 'Failed to detect meeting app. Please try again.',
          silent: false,
          type: 'general',
        });
      }
    };

    const cleanup = MeetingModeEvents.onStartCalibration(handleStartCalibration);
    return () => {
      cleanup?.();
    };
  }, [meetingContext.detectedApp, sendMeetingEvent, setMeetingModeEnabled]);

  // Start/stop detection loop - uses setInterval to work in background
  useEffect(() => {
    // Only start detection when video is actually ready
    // For meeting mode, use isMeetingCapturing from state machine hook
    const videoReady = isMeetingCapturing ? true : isVideoReady;

    // Debug logging disabled for performance - enable via DEBUG_DETECTION=true
    // console.log('[DetectionLoop] Effect running:', { isDetecting, isMeetingCapturing, isVideoReady, videoReady });

    if (isDetecting && videoReady) {
      // Run detection at ~30fps (33ms) for both camera and meeting mode
      const intervalMs = 33;

      detectionIntervalRef.current = setInterval(() => {
        // Read current meeting mode state directly from store (avoids stale closure)
        const currentMeetingMode = useMeetingModeStore.getState().isActive;

        // Use meeting video when in meeting mode, otherwise camera
        const video = currentMeetingMode ? meetingVideoRef.current : videoRef.current;
        if (!video || !landmarkerManager.isReady()) return;

        // Wait for video to have valid data
        if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
          return;
        }

        // For meeting mode, we need to crop the screen capture to the calibrated region
        let frameSource: HTMLVideoElement | HTMLCanvasElement = video;

        if (currentMeetingMode && meetingCanvasRef.current) {
          const storeState = useMeetingModeStore.getState();
          const detectedApp = storeState.detectedApp;

          if (detectedApp) {
            // Get calibration directly from store state (avoid stale closure)
            const calibration = storeState.calibrations.find(
              (c) => c.appName.toLowerCase() === detectedApp.toLowerCase()
            );
            if (calibration) {
              const canvas = meetingCanvasRef.current;
              if (!canvas) return;

              // Use cached context (avoid getContext() call every frame - 1800 calls/min saved)
              // Re-acquire if null (was cleared during reset) or if canvas changed
              if (!meetingCanvasCtxRef.current) {
                meetingCanvasCtxRef.current = canvas.getContext('2d');
              }
              const ctx = meetingCanvasCtxRef.current;
              if (ctx) {
                // Use the pure function to calculate crop region with proper scaling and clamping
                // This handles: missing calibration dimensions, out-of-bounds coordinates
                const cropResult = calculateCropRegion(
                  {
                    region: calibration.region,
                    calibrationWidth: calibration.calibrationWidth,
                    calibrationHeight: calibration.calibrationHeight,
                  },
                  video.videoWidth,
                  video.videoHeight
                );

                // Use CLAMPED region to ensure we always draw valid content
                // This fixes the blank stream bug when coordinates are out of bounds
                const region = cropResult.clampedRegion;

                // Only resize canvas if dimensions changed (avoid reset every frame)
                if (canvas.width !== region.width || canvas.height !== region.height) {
                  canvas.width = region.width;
                  canvas.height = region.height;
                }

                // Draw cropped region from screen capture using clamped coordinates
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

                frameSource = canvas;
              }
            }
          }
        }

        const result = landmarkerManager.processVideoFrame(frameSource);
        if (result) {
          const faceFound = result.rawLandmarks !== null;
          const now = Date.now();

          // Build waveform point if face detected
          let waveformPoint = undefined;
          if (result.rawLandmarks !== null) {
            const ear = result.blink.avgEAR;
            const threshold = result.blink.threshold;
            const phase: 'open' | 'closing' | 'closed' | 'opening' =
              ear < threshold ? 'closed' : 'open';

            // Calculate slope (rate of change)
            let slope = 0;
            if (prevEarRef.current) {
              const dt = now - prevEarRef.current.timestamp;
              if (dt > 0) {
                slope = (ear - prevEarRef.current.ear) / dt;
                // Scale up for visibility (multiply by 1000 for per-second rate)
                slope = slope * 1000;
              }
            }
            prevEarRef.current = { ear, timestamp: now };

            waveformPoint = {
              timestamp: now,
              ear,
              isBlink: result.blink.isBlink,
              phase,
              slope,
            };
          }

          // BATCHED STATE UPDATE: Single store update instead of 6 separate calls
          // This reduces React re-renders from 180/sec to ~30/sec (or less with throttling)
          processDetection({
            faceDetected: faceFound,
            waveformPoint,
            isBlink: result.blink.isBlink,
            blinkEar: result.blink.isBlink ? result.blink.avgEAR : undefined,
          });

          // Notify meeting mode state machine of face detection (for CAPTURE_STALE recovery)
          // Uses ref to avoid effect restarts (same pattern as sendRef in the hook)
          if (faceFound && onMeetingFaceDetectedRef.current) {
            onMeetingFaceDetectedRef.current();
          }

          // Handle blink-specific side effects (queued database, IPC)
          if (result.blink.isBlink) {
            // Queue database write instead of synchronous call
            dbWriteQueueRef.current.push({
              type: 'blink',
              timestamp: now,
              ear: result.blink.avgEAR,
              detected: true,
            });
            // IPC is fast, keep synchronous
            DetectionService.sendBlink({ ear: result.blink.avgEAR, timestamp: now });

            // Track for minute rollups
            minuteBlinkCountRef.current++;
            minuteEarSumRef.current += result.blink.avgEAR;
            minuteEarCountRef.current++;
          }

          // Update wellness state (posture, yawn, drowsiness)
          if (result.posture) {
            setCurrentPosture(result.posture);
          }
          if (result.yawn) {
            setCurrentYawn(result.yawn);
            // Queue new yawns to database
            if (result.yawn.yawnCount > lastYawnCountRef.current) {
              dbWriteQueueRef.current.push({
                type: 'wellness',
                timestamp: now,
                eventType: 'yawn',
                payload: { mar: result.yawn.mar },
              });
              lastYawnCountRef.current = result.yawn.yawnCount;
            }
          }
          if (result.drowsiness) {
            setCurrentDrowsiness(result.drowsiness);
            // Queue drowsiness level changes
            if (result.drowsiness.drowsinessLevel !== lastDrowsinessLevelRef.current) {
              const level = result.drowsiness.drowsinessLevel;
              if (level !== 'alert') {
                dbWriteQueueRef.current.push({
                  type: 'wellness',
                  timestamp: now,
                  eventType: level === 'mild' ? 'drowsiness_mild' :
                    level === 'moderate' ? 'drowsiness_moderate' : 'drowsiness_severe',
                  payload: { perclos: result.drowsiness.perclos, recentYawns: result.drowsiness.recentYawns },
                });
              }
              lastDrowsinessLevelRef.current = result.drowsiness.drowsinessLevel;
            }
          }

          // Create minute rollup every 60 seconds
          if (lastRollupTimeRef.current === 0) {
            lastRollupTimeRef.current = now;
          } else if (now - lastRollupTimeRef.current >= 60000) {
            const avgEar = minuteEarCountRef.current > 0
              ? minuteEarSumRef.current / minuteEarCountRef.current
              : null;

            // Queue rollup write
            dbWriteQueueRef.current.push({
              type: 'rollup',
              timestamp: lastRollupTimeRef.current,
              blinkCount: minuteBlinkCountRef.current,
              avgEar,
            });

            lastRollupTimeRef.current = now;
            minuteBlinkCountRef.current = 0;
            minuteEarSumRef.current = 0;
            minuteEarCountRef.current = 0;
          }
        }
      }, intervalMs); // 33ms = ~30fps for both camera and meeting mode
    } else {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    }
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [isDetecting, isVideoReady, isMeetingCapturing, processDetection]);

  // =========================================================================
  // DATABASE WRITE QUEUE FLUSH
  // Flushes queued writes every 2 seconds to avoid blocking render thread
  // =========================================================================
  useEffect(() => {
    const flushQueue = () => {
      const queue = dbWriteQueueRef.current;
      if (queue.length === 0) return;

      // Process each queued write
      for (const write of queue) {
        switch (write.type) {
          case 'blink':
            DatabaseService.insertBlink(write.timestamp, write.ear, write.detected);
            break;
          case 'wellness':
            DatabaseService.insertWellnessEvent(write.timestamp, write.eventType, write.payload);
            break;
          case 'rollup':
            DatabaseService.insertRollup(write.timestamp, write.blinkCount, write.avgEar);
            break;
        }
      }
      // Clear the queue
      dbWriteQueueRef.current = [];
    };

    // Flush every 2 seconds
    const flushInterval = setInterval(flushQueue, 2000);

    // Flush on unmount to prevent data loss
    return () => {
      flushQueue();
      clearInterval(flushInterval);
    };
  }, []);

  // Sync refs for blink rate update interval (prevents 12-dependency effect from restarting)
  useEffect(() => {
    blinkCountRef.current = blinkCount;
    faceDetectedRef.current = faceDetected;
    currentPostureRef.current = currentPosture;
    currentYawnRef.current = currentYawn;
    currentDrowsinessRef.current = currentDrowsiness;
    userBaselineRef.current = userBaseline;
    isCalibratingRef.current = isCalibrating;
    // Sync meeting mode face detection callback ref
    onMeetingFaceDetectedRef.current = onMeetingFaceDetected;
  }, [blinkCount, faceDetected, currentPosture, currentYawn, currentDrowsiness, userBaseline, isCalibrating, onMeetingFaceDetected]);

  // Update blink rate periodically and evaluate alerts
  // Uses refs for frequently-changing values to avoid interval restart on every blink
  useEffect(() => {
    if (!isDetecting || !sessionStartTime) return;

    const updateRate = () => {
      const elapsedMs = Date.now() - sessionStartTime;
      const elapsedMinutes = Math.max(elapsedMs / 60000, 1 / 60);
      const blinkRate = Math.round((blinkCountRef.current / elapsedMinutes) * 10) / 10;

      updateBlinkRate(blinkRate);
      setSessionDuration(Math.floor(elapsedMs / 1000));

      let score: number;
      if (blinkRate < 5) score = 30;
      else if (blinkRate < 10) score = 50;
      else if (blinkRate < 15) score = 70;
      else if (blinkRate < 20) score = 90;
      else score = 100;

      updateWellnessScore(score);

      DetectionService.sendUpdate({
        blinkRate,
        wellnessScore: score,
        isDetecting: true,
        faceDetected: faceDetectedRef.current,
      });

      // Add sample to baseline calibrator if calibrating
      if (isCalibratingRef.current && !baselineCalibrator.isCalibrated()) {
        baselineCalibrator.addSample(blinkRate);
        setCalibrationProgress(baselineCalibrator.getProgress());

        // Check if calibration is complete
        if (baselineCalibrator.isCalibrated()) {
          const newBaseline = baselineCalibrator.getBaseline();
          if (newBaseline) {
            setUserBaseline(newBaseline);
            setIsCalibrating(false);
            // Save to database
            DatabaseService.updateBaseline(
              newBaseline.blinkP25,
              newBaseline.blinkP50,
              newBaseline.blinkP75,
              newBaseline.samplesCount
            );
            // Notify user
            AlertsService.show({
              id: `calibration-complete-${Date.now()}`,
              type: 'calibration_complete',
              severity: 'info',
              message: 'Baseline calibration complete!',
              action: `Your personal blink rate baseline: ${newBaseline.blinkP50.toFixed(1)}/min`,
            });
          }
        }
      }

      // Evaluate alert rules
      const metrics: WellnessMetrics = {
        blinkRate,
        avgEAR: 0.25, // Default - would track from blinks
        sessionDurationMs: elapsedMs,
        baseline: userBaselineRef.current,
        posture: currentPostureRef.current,
        yawn: currentYawnRef.current,
        drowsiness: currentDrowsinessRef.current,
      };

      const newAlerts = alertEngine.evaluate(metrics);

      // Handle triggered alerts
      for (const alert of newAlerts) {
        // Add to local store
        addAlert({
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          action: alert.action,
          triggeredAt: alert.triggeredAt,
        });

        // Show alert notification
        AlertsService.show({
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          action: alert.action,
        });

        // Sync to cloud
        AlertsService.sync(alert.type, alert.severity, alert.message);
      }
    };

    updateRate();
    const interval = setInterval(updateRate, 5000);
    return () => clearInterval(interval);
  }, [isDetecting, sessionStartTime]); // Only restart when detection starts/stops

  // Toggle detection
  const handleToggleDetection = () => {
    // Always reset meeting mode state on toggle (acts as a reboot)
    setPreCapturedScreenshot(null);
    setShowCalibrationUI(false);
    setCalibrationAppName('');
    setShowMeetingNotification(false);
    setMeetingNotificationData(null);
    resetMeetingStateMachine();
    useMeetingModeStore.getState().setActive(false);
    useMeetingModeStore.getState().setError(null);
    // Clear cached canvas context to avoid stale state
    meetingCanvasCtxRef.current = null;
    // Stop any active meeting stream
    if (meetingStreamRef.current) {
      meetingStreamRef.current.getTracks().forEach(t => t.stop());
      meetingStreamRef.current = null;
    }
    if (meetingVideoRef.current) {
      meetingVideoRef.current.srcObject = null;
    }

    if (!isDetecting) {
      setDetecting(true);
      startSession();
      setSessionStartTime(Date.now());
    } else {
      setDetecting(false);
      // Update today stats
      setTodayStats(prev => ({
        ...prev,
        totalBlinks: prev.totalBlinks + blinkCount,
        sessionMinutes: prev.sessionMinutes + Math.floor(sessionDuration / 60),
      }));
    }
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  // Get wellness status
  const getWellnessStatus = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 60) return { label: 'Good', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (score >= 40) return { label: 'Fair', color: 'text-orange-600', bg: 'bg-orange-100' };
    return { label: 'Poor', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const status = getWellnessStatus(wellnessScore);

  // Auth check loading
  if (!authChecked) {
    return <AppLoader message="Checking authentication..." />;
  }

  // Not authenticated - show auth screen
  if (!authUser) {
    return <AuthScreen onAuthComplete={handleAuthComplete} />;
  }

  // Onboarding flow for new users
  if (!hasCompletedOnboarding) {
    return (
      <OnboardingFlow
        onComplete={() => setOnboardingComplete()}
        onSkip={() => setOnboardingComplete()}
        hasCameraPermission={cameras.length > 0}
        onCameraSelected={(cameraId) => {
          saveSelectedCameraId(cameraId);
          setSelectedCameraId(cameraId);
        }}
        onCalibrationComplete={(data) => {
          console.log('Onboarding calibration baseline:', data.baselineEar);
          // Store EAR calibration data for future sessions
          if (data.earCalibration) {
            setEarCalibration({
              threshold: data.earCalibration.threshold,
              openEAR: data.earCalibration.openEAR,
              closedEAR: data.earCalibration.closedEAR,
              calibratedAt: new Date(data.earCalibration.calibratedAt).toISOString(),
              samplesCount: data.earCalibration.samplesCount,
            });
          }
        }}
        onGoalsSelected={(goals) => {
          setWellnessGoals(goals);
        }}
        logoSrc={luminaLogo}
      />
    );
  }

  // Loading state (camera init)
  if (isLoading) {
    return (
      <div className="h-full bg-gray-50">
        <CameraLoader status="loading-model" />
      </div>
    );
  }

  // Camera error is now shown as a dismissable banner, not a blocking screen
  // This allows users to still navigate the app and try meeting mode, settings, etc.

  return (
    <>
      {/* Product Tour - runs after onboarding is complete */}
      <ProductTour
        run={hasCompletedOnboarding && !hasCompletedProductTour}
        onComplete={setProductTourComplete}
      />

      <div className="h-full flex bg-gray-50 relative">
        {/* Draggable title bar region - invisible but draggable */}
        <div
          className="absolute top-0 left-0 right-0 h-10 z-40"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />

        {/* Floating window controls - top right corner */}
      <div
        className="absolute top-2 right-3 z-50 flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Notification bell */}
        <button
          className="p-1.5 hover:bg-black/5 rounded-md transition-colors text-gray-400 hover:text-gray-600"
          title="Notifications"
        >
          <Icons.Bell />
        </button>

        <div className="w-2" />

        {/* Window controls */}
        <button
          onClick={handleMinimize}
          className="p-1.5 hover:bg-black/5 rounded-md transition-colors text-gray-400 hover:text-gray-600"
          title="Minimize"
        >
          <Icons.Minimize />
        </button>
        <button
          onClick={handleMaximize}
          className="p-1.5 hover:bg-black/5 rounded-md transition-colors text-gray-400 hover:text-gray-600"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? <Icons.Restore /> : <Icons.Maximize />}
        </button>
        <button
          onClick={handleClose}
          className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-md transition-colors text-gray-400"
          title="Close"
        >
          <Icons.Close />
        </button>
      </div>

      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col" data-tour="sidebar">
        {/* Logo - draggable area */}
        <div
          className="h-14 flex items-center px-4 border-b border-gray-200"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <img src={luminaLogo} alt="Lumina" className="h-8 w-8 object-contain" />
          <span className="ml-2 text-lg font-bold">Lumina</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <Icons.Activity /> },
            { id: 'monitor', label: 'Live Monitor', icon: <Icons.Camera /> },
            { id: 'exercises', label: 'Eye Exercises', icon: <Icons.Eye /> },
            { id: 'history', label: 'History', icon: <Icons.Clock /> },
            { id: 'meetingMode', label: 'Meeting Mode', icon: <Icons.VideoCall /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                currentView === item.id
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom utility section (Flow style) */}
        <div className="border-t border-gray-200">
          {/* Session status */}
          <div className="px-4 py-3">
            <div className={`flex items-center gap-2 text-sm ${isDetecting ? 'text-green-600' : 'text-gray-500'}`}>
              <div className={`w-2 h-2 rounded-full ${isDetecting ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              {isDetecting ? 'Monitoring Active' : 'Monitoring Paused'}
            </div>
            {isDetecting && sessionDuration > 0 && (
              <p className="text-xs text-gray-500 mt-1">Session: {formatDuration(sessionDuration)}</p>
            )}
          </div>

          {/* Utility links */}
          <div className="px-3 py-2 space-y-1">
            <button
              onClick={() => window.lumina?.system.openExternal(`${WEB_DASHBOARD_URL}/invite`)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Icons.Users />
              Invite your team
            </button>
            <button
              onClick={() => window.lumina?.system.openExternal(`${WEB_DASHBOARD_URL}/referral`)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Icons.Gift />
              Get a free month
            </button>
          </div>

          {/* Settings & Help */}
          <div className="px-3 py-2 border-t border-gray-100 space-y-1">
            <button
              onClick={() => setCurrentView('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                currentView === 'settings'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              data-tour="settings"
            >
              <Icons.Settings />
              Settings
            </button>
            <button
              onClick={() => window.lumina?.system.openExternal(`${WEB_DASHBOARD_URL}/help`)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Icons.HelpCircle />
              Help
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Hidden video element for detection */}
        <video ref={videoRef} className="hidden" muted playsInline />

        {/* Hidden elements for meeting mode screen capture */}
        <video ref={meetingVideoRef} className="hidden" muted playsInline />
        <canvas ref={meetingCanvasRef} className="hidden" />

        {/* Camera error banner - dismissable, non-blocking */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-red-800">Camera unavailable</p>
                <p className="text-xs text-red-600">{error}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setError(null);
                  // Trigger camera restart by toggling detection
                  if (isDetecting) {
                    handleToggleDetection();
                    setTimeout(() => handleToggleDetection(), 100);
                  }
                }}
                className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-medium"
              >
                Retry
              </button>
              <button
                onClick={() => setError(null)}
                className="p-1 hover:bg-red-100 rounded text-red-400 hover:text-red-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Meeting mode status indicator */}
        {isMeetingCapturing && (
          <div className="absolute top-16 right-6 z-40">
            <MeetingModeStatus
              appName={meetingContext.detectedApp || 'Meeting'}
              isStale={isMeetingStale}
              onRecalibrate={() => {
                console.log('[MeetingMode] Recalibration requested');
                // Send RECALIBRATION_REQUESTED event - state machine handles stopping capture and showing calibration UI
                sendMeetingEvent({ type: 'RECALIBRATION_REQUESTED' });
              }}
              onStop={() => {
                console.log('[MeetingMode] Manual stop requested');
                // Send USER_STOPPED event - state machine handles cleanup
                sendMeetingEvent({ type: 'USER_STOPPED' });
              }}
            />
          </div>
        )}

        {/* Shared Fixed Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentView === 'dashboard' && 'My Wellness Dashboard'}
                {currentView === 'monitor' && 'Live Monitor'}
                {currentView === 'exercises' && 'Eye Exercises'}
                {currentView === 'history' && 'History'}
                {currentView === 'meetingMode' && 'Meeting Mode'}
                {currentView === 'settings' && 'Settings'}
              </h1>
              <p className="text-gray-500 text-sm">
                {currentView === 'dashboard' && 'Track your eye health and prevent strain'}
                {currentView === 'monitor' && 'Real-time blink detection and eye tracking'}
                {currentView === 'exercises' && 'Guided exercises to reduce eye strain and improve eye health'}
                {currentView === 'history' && 'View your wellness data over time'}
                {currentView === 'meetingMode' && 'Track eye health during video calls'}
                {currentView === 'settings' && 'Configure your Lumina experience'}
              </p>
            </div>
            <PrivacyIndicator isActive={isDetecting} />
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-auto">
          {currentView === 'dashboard' && (
            <DashboardView
            wellnessScore={wellnessScore}
            blinkRate={currentBlinkRate}
            blinkCount={blinkCount}
            sessionDuration={sessionDuration}
            isDetecting={isDetecting}
            faceDetected={faceDetected}
            onToggleDetection={handleToggleDetection}
            status={status}
            todayStats={todayStats}
            formatDuration={formatDuration}
            isOnBreak={isOnBreak}
            breakTimeRemaining={breakTimeRemaining}
            onTakeBreak={handleTakeBreak}
            onSkipBreak={handleSkipBreak}
            isCalibrating={isCalibrating}
            calibrationProgress={calibrationProgress}
            userBaseline={userBaseline}
            showPreBreakToast={showPreBreakToast}
            preBreakSeconds={preBreakSeconds}
            onStartBreakNow={handleStartBreakNow}
            onPostponeBreak={handlePostponeBreak}
            postponesRemaining={postponesRemaining}
            currentPosture={currentPosture}
            currentYawn={currentYawn}
            currentDrowsiness={currentDrowsiness}
            userName={authUser?.email?.split('@')[0] ?? 'there'}
          />
        )}

        {currentView === 'monitor' && (
          <MonitorView
            videoRef={videoRef}
            meetingVideoRef={meetingVideoRef}
            meetingCanvasRef={meetingCanvasRef}
            isDetecting={isDetecting}
            faceDetected={faceDetected}
            blinkCount={blinkCount}
            blinkRate={currentBlinkRate}
            wellnessScore={wellnessScore}
            onToggleDetection={handleToggleDetection}
            onReset={() => {
              // Reset all meeting mode state
              setPreCapturedScreenshot(null);
              setShowCalibrationUI(false);
              setCalibrationAppName('');
              setShowMeetingNotification(false);
              setMeetingNotificationData(null);
              resetMeetingStateMachine();
              useMeetingModeStore.getState().setActive(false);
              useMeetingModeStore.getState().setError(null);
              // Clear cached canvas context to avoid stale state
              meetingCanvasCtxRef.current = null;
              if (meetingStreamRef.current) {
                meetingStreamRef.current.getTracks().forEach(t => t.stop());
                meetingStreamRef.current = null;
              }
              if (meetingVideoRef.current) {
                meetingVideoRef.current.srcObject = null;
              }
            }}
            meetingModeActive={meetingModeActive}
            meetingAppName={meetingContext.detectedApp}
            cameras={cameras}
            selectedCameraId={selectedCameraId}
            onCameraChange={handleCameraChange}
          />
        )}

        {currentView === 'exercises' && <ExercisesView />}

        {currentView === 'history' && <HistoryView />}

        {currentView === 'meetingMode' && (
          <MeetingModeView
            onStartCalibration={(appName: string) => {
              setCalibrationAppName(appName);
              setShowCalibrationUI(true);
            }}
            onRemoveCalibration={(appName: string) => {
              useMeetingModeStore.getState().removeCalibration(appName);
              setPreCapturedScreenshot(null);
            }}
            onReset={() => {
              // Reset all meeting mode state
              setPreCapturedScreenshot(null);
              setShowCalibrationUI(false);
              setCalibrationAppName('');
              resetMeetingStateMachine();
              useMeetingModeStore.getState().setActive(false);
              useMeetingModeStore.getState().setError(null);
              // Clear cached canvas context to avoid stale state
              meetingCanvasCtxRef.current = null;
              // Stop any active meeting stream
              if (meetingStreamRef.current) {
                meetingStreamRef.current.getTracks().forEach(t => t.stop());
                meetingStreamRef.current = null;
              }
              if (meetingVideoRef.current) {
                meetingVideoRef.current.srcObject = null;
              }
            }}
          />
        )}

        {currentView === 'settings' && <SettingsView user={authUser} onSignOut={handleSignOut} />}
        </div>
      </main>

      {/* Meeting Mode Calibration Overlay (triggered by meeting detection prompt) */}
      {showCalibrationUI && (
        <MeetingModeCalibration
          appName={calibrationAppName}
          displayId={0}
          preCapturedScreenshot={preCapturedScreenshot}
          onComplete={(result: CalibrationResult) => {
            console.log('[MeetingMode] Calibration completed for:', calibrationAppName,
              'dimensions:', result.calibrationWidth, 'x', result.calibrationHeight,
              'isWindowCapture:', result.isWindowCapture);

            // Use the ACTUAL source type from the screenshot, not hardcoded 'window'
            // This fixes the pixel mapping bug where screen capture coordinates were
            // incorrectly saved as window capture, causing misalignment at runtime
            const sourceType = result.isWindowCapture ? 'window' : 'screen';

            // Save calibration with actual screenshot dimensions and source type
            addMeetingCalibration({
              appName: calibrationAppName,
              region: result.region,
              displayId: 0,
              calibrationWidth: result.calibrationWidth,
              calibrationHeight: result.calibrationHeight,
              sourceType,
            });

            // Hide UI and clear state
            setShowCalibrationUI(false);
            setPreCapturedScreenshot(null);
            const appName = calibrationAppName;
            setCalibrationAppName('');

            // Send calibration completed event to state machine
            // The state machine will handle starting screen capture
            sendMeetingEvent({
              type: 'CALIBRATION_COMPLETED',
              appName,
              region: result.region,
              displayId: 0,
              calibrationWidth: result.calibrationWidth,
              calibrationHeight: result.calibrationHeight,
            });

            // Auto-restart detection if it was stopped
            if (!useSessionStore.getState().isDetecting) {
              console.log('[MeetingMode] Detection was stopped, auto-restarting after calibration');
              setDetecting(true);
              startSession();
              setSessionStartTime(Date.now());
            }
          }}
          onCancel={() => {
            console.log('[MeetingMode] Calibration cancelled for:', calibrationAppName);

            // Hide UI and clear state
            setShowCalibrationUI(false);
            setCalibrationAppName('');
            setPreCapturedScreenshot(null);
            setError(null);

            // Send cancellation event to state machine
            sendMeetingEvent({ type: 'CALIBRATION_CANCELLED' });
          }}
        />
      )}

      {/* Meeting mode notification popup - shown before calibration */}
      <MeetingModeNotification
        isVisible={showMeetingNotification}
        title={meetingNotificationData?.title || 'Meeting Detected'}
        message={meetingNotificationData?.message || 'Enable eye tracking for this meeting?'}
        appName={meetingNotificationData?.appName}
        actions={meetingNotificationData?.actions}
        onAction={handleMeetingNotificationAction}
        onDismiss={handleMeetingNotificationDismiss}
        autoDismissSeconds={30}
      />
      </div>
    </>
  );
}
