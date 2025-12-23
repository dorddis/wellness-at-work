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
  OnboardingFlow,
  ACHIEVEMENTS,
  type DayData,
  type CaptureRegion,
} from '@lumina/ui';
import {
  FaceLandmarkerManager,
  AlertEngine,
  BaselineCalibrator,
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
import { AppLoader, CameraLoader, HistorySkeleton, type CameraStatus } from './components';
import { MeetingModeCalibration, MeetingModeStatus } from './components/MeetingModeCalibration';

// Auth user type
interface AuthUser {
  id: string;
  email: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    role: 'admin' | 'manager' | 'employee';
    department: string | null;
  } | null;
}

// Icons (inline SVG to avoid dependencies)
const Icons = {
  Eye: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  Activity: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Camera: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  TrendUp: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  TrendDown: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  ),
  Play: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Pause: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  X: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  AlertTriangle: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Users: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Gift: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  ),
  HelpCircle: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  VideoCall: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      <circle cx="8" cy="11" r="2" stroke="currentColor" strokeWidth={2} fill="none" />
    </svg>
  ),
  // Window control icons (clean, minimal)
  Bell: () => (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5a4 4 0 00-4 4v2.793l-.854.853A.5.5 0 003.5 10h9a.5.5 0 00.354-.854L12 8.293V5.5a4 4 0 00-4-4z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 10v.5a2 2 0 104 0V10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  Minimize: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none">
      <path d="M2.5 6h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  Maximize: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none">
      <rect x="2" y="2" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  Restore: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none">
      <rect x="1.5" y="3.5" width="6" height="6" rx="0.5" stroke="currentColor" strokeWidth="1"/>
      <path d="M4.5 3.5V2.5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-1" stroke="currentColor" strokeWidth="1"/>
    </svg>
  ),
  Close: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none">
      <path d="M3 3l6 6M9 3L3 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
};

// Web dashboard URL (Vercel deployment)
const WEB_DASHBOARD_URL = 'https://lumina-rho-sandy.vercel.app';

// Dev mode auth bypass
const BYPASS_AUTH = import.meta.env.VITE_BYPASS_AUTH === 'true';

// Mock user for dev mode (when VITE_BYPASS_AUTH=true)
const DEV_USER: AuthUser = {
  id: 'dev-user-00000000-0000-0000-0000-000000000000',
  email: 'dev@lumina.local',
  organization: {
    id: 'dev-org-00000000-0000-0000-0000-000000000000',
    name: 'Development Org',
    slug: 'dev-org',
    role: 'admin',
    department: null,
  },
};

// Detection manager (singleton)
const landmarkerManager = new FaceLandmarkerManager();

// Alert engine (singleton)
const alertEngine = new AlertEngine();

// Baseline calibrator (singleton)
const baselineCalibrator = new BaselineCalibrator();

type View = 'dashboard' | 'monitor' | 'exercises' | 'history' | 'meetingMode' | 'settings';

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRollupTimeRef = useRef<number>(0);
  const minuteBlinkCountRef = useRef<number>(0);
  const minuteEarSumRef = useRef<number>(0);
  const minuteEarCountRef = useRef<number>(0);
  // For slope calculation
  const prevEarRef = useRef<{ ear: number; timestamp: number } | null>(null);

  // Auth state
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Current view
  const [currentView, setCurrentView] = useState<View>('dashboard');

  // Window state (for frameless window controls)
  const [isMaximized, setIsMaximized] = useState(false);

  // Zustand stores
  const {
    isDetecting,
    faceDetected,
    blinkCount,
    currentBlinkRate,
    wellnessScore,
    setDetecting,
    setFaceDetected,
    recordBlink,
    updateBlinkRate,
    updateWellnessScore,
    startSession,
  } = useSessionStore();

  const { alerts, addAlert, dismissAlert } = useAlertStore();

  // Onboarding state + cloud sync control
  const {
    hasCompletedOnboarding,
    setOnboardingComplete,
    setWellnessGoals,
    setSelectedCameraId: saveSelectedCameraId,
    selectedCameraId: savedCameraId,
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

  // Break reminder state
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakTimeRemaining, setBreakTimeRemaining] = useState(20); // 20 seconds for 20-20-20 rule
  const [lastBreakTime, setLastBreakTime] = useState<number>(Date.now());
  const BREAK_REMINDER_INTERVAL = 20 * 60 * 1000; // 20 minutes

  // Pre-break toast state (30 second warning)
  const [showPreBreakToast, setShowPreBreakToast] = useState(false);
  const [preBreakSeconds, setPreBreakSeconds] = useState(30);
  const [postponesRemaining, setPostponesRemaining] = useState(2);

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

  // Waveform data is now stored in sessionStore (persists across navigation)
  const addWaveformPoint = useSessionStore((state) => state.addWaveformPoint);

  // Meeting Mode state
  const {
    enabled: meetingModeEnabled,
    isActive: meetingModeActive,
    autoDetect: meetingAutoDetect,
    calibrations: meetingCalibrations,
    setEnabled: setMeetingModeEnabled,
    setActive: setMeetingModeActive,
    getCalibration,
    touchCalibration,
    addCalibration: addMeetingCalibration,
  } = useMeetingModeStore();

  // Meeting mode refs
  const meetingVideoRef = useRef<HTMLVideoElement>(null);
  const meetingCanvasRef = useRef<HTMLCanvasElement>(null);
  const meetingStreamRef = useRef<MediaStream | null>(null);

  // Meeting mode calibration UI state (for main app - triggered by meeting detection prompt)
  const [showCalibrationUI, setShowCalibrationUI] = useState(false);
  const [calibrationAppName, setCalibrationAppName] = useState<string>('');
  // State for meeting detected without calibration (camera paused, waiting for user action)
  const [pendingMeetingApp, setPendingMeetingApp] = useState<string | null>(null);
  const dismissedMeetingPromptRef = useRef<Set<string>>(new Set());

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

  // Check auth on mount
  useEffect(() => {
    async function checkAuth() {
      // Dev mode bypass - skip auth entirely
      if (BYPASS_AUTH) {
        console.log('[Auth] Bypassing auth - using dev user');
        setAuthUser(DEV_USER);
        setAuthChecked(true);
        return;
      }

      try {
        const result = await window.lumina.auth.getUser();
        if (result.user && result.user.organization) {
          setAuthUser(result.user);
          // Set sync credentials
          await window.lumina.sync.setCredentials(
            result.user.organization.id,
            result.user.id
          );
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        setAuthChecked(true);
      }
    }
    checkAuth();
  }, []);

  // Handle auth complete
  const handleAuthComplete = useCallback(async (user: AuthUser) => {
    setAuthUser(user);
    if (user.organization) {
      await window.lumina.sync.setCredentials(user.organization.id, user.id);
    }
  }, []);

  // Start auto-sync after auth if cloudSyncEnabled is true (GDPR local-only mode support)
  useEffect(() => {
    if (!authUser) return;

    if (appCloudSyncEnabled) {
      console.log('[Sync] Starting auto-sync (cloudSyncEnabled=true)');
      window.lumina?.sync.startAuto();
    } else {
      console.log('[Sync] Auto-sync disabled (local-only mode)');
      window.lumina?.sync.stopAuto();
    }
  }, [authUser, appCloudSyncEnabled]);

  // Load baseline from database on auth
  useEffect(() => {
    if (!authUser) return;

    async function loadBaseline() {
      try {
        const existingBaseline = await window.lumina?.database.getBaseline();
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

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    await window.lumina.auth.signOut();
    setAuthUser(null);
  }, []);

  // Initialize MediaPipe only (expensive, do once on auth)
  useEffect(() => {
    if (!authUser) return;

    async function initMediaPipe() {
      try {
        console.log('[MediaPipe] Initializing FaceLandmarker...');
        await landmarkerManager.initialize({
          delegate: 'GPU',
          runningMode: 'VIDEO',
        });
        console.log('[MediaPipe] Initialized successfully');

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

  // Start camera when detection starts (unless in meeting mode or pending calibration), stop when it stops
  useEffect(() => {
    if (!isDetecting || meetingModeActive || pendingMeetingApp) {
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

      // Pending meeting app - camera stopped, waiting for calibration, don't continue detection
      if (pendingMeetingApp) {
        return;
      }

      // In meeting mode, detection continues with screen capture video
      if (meetingModeActive && meetingVideoRef.current && meetingVideoRef.current.readyState >= 2) {
        setIsVideoReady(true);
      }
      return;
    }

    // Start camera when detection starts (only if not in meeting mode)
    let mounted = true;

    async function startCamera() {
      try {
        console.log('[Camera] Starting camera...');

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
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
          setError(err instanceof Error ? err.message : 'Camera error');
        }
      }
    }

    startCamera();

    return () => {
      mounted = false;
    };
  }, [isDetecting, meetingModeActive, pendingMeetingApp]);

  // Meeting detection polling - ALWAYS check for meetings when detection is running
  useEffect(() => {
    if (!isDetecting) {
      return;
    }

    const checkForMeeting = async () => {
      try {
        const result = await window.lumina.meetingMode.detectApp();

        if (result.isDetected && result.appName) {
          // Meeting detected - check if we have calibration for this app
          const calibration = getCalibration(result.appName);

          // Debug: Log detection and calibration state
          const allCalibrations = useMeetingModeStore.getState().calibrations;
          console.log('[MeetingMode] Detection result:', {
            detectedApp: result.appName,
            processName: result.processName,
            hasCalibration: !!calibration,
            storedCalibrations: allCalibrations.map(c => c.appName),
            meetingModeActive,
          });

          if (calibration && !meetingModeActive) {
            // Has calibration - auto-start meeting mode
            // Note: We auto-start regardless of meetingModeEnabled since user has calibrated
            // (having calibration implies user wants this feature)
            console.log('[MeetingMode] Meeting detected with calibration:', result.appName);
            const sourceId = await window.lumina.meetingMode.getSourceId(calibration.displayId);
            if (sourceId && meetingVideoRef.current) {
              try {
                const stream = await navigator.mediaDevices.getUserMedia({
                  audio: false,
                  video: {
                    // @ts-ignore - Electron-specific constraints
                    mandatory: {
                      chromeMediaSource: 'desktop',
                      chromeMediaSourceId: sourceId,
                      minWidth: 1280,
                      maxWidth: 3840,
                      minHeight: 720,
                      maxHeight: 2160,
                    },
                  },
                });

                meetingStreamRef.current = stream;
                meetingVideoRef.current.srcObject = stream;

                // Wait for video to be ready before setting active
                await new Promise<void>((resolve) => {
                  const video = meetingVideoRef.current!;
                  if (video.readyState >= 2) {
                    resolve();
                  } else {
                    video.onloadeddata = () => resolve();
                  }
                });

                await meetingVideoRef.current.play();

                setMeetingModeActive(true, result.appName);
                touchCalibration(result.appName);
                console.log('[MeetingMode] Screen capture started for', result.appName);

                // Show in-app alert that meeting mode is now active
                window.lumina.alerts.show({
                  id: `meeting-active-${Date.now()}`,
                  type: 'meeting_mode_active',
                  severity: 'info',
                  message: `Meeting Mode active - tracking eye health during ${result.appName}`,
                });
              } catch (err) {
                console.error('[MeetingMode] Failed to start screen capture:', err);
                // Show in-app error alert
                window.lumina.alerts.show({
                  id: `meeting-error-${Date.now()}`,
                  type: 'meeting_mode_error',
                  severity: 'warning',
                  message: 'Failed to start Meeting Mode. Please try recalibrating.',
                  action: 'Open Settings to recalibrate',
                });
              }
            }
          } else if (!calibration && !dismissedMeetingPromptRef.current.has(result.appName)) {
            // No calibration - show in-app alert to prompt setup
            // This allows first-time users to discover the feature
            console.log('[MeetingMode] Meeting detected, no calibration for:', result.appName);

            // Store pending app for calibration
            setPendingMeetingApp(result.appName);
            dismissedMeetingPromptRef.current.add(result.appName);

            // Show in-app alert with action button to start calibration
            window.lumina.alerts.show({
              id: `meeting-detected-${Date.now()}`,
              type: 'meeting_detected',
              severity: 'info',
              message: `${result.appName} detected! Track your eye health during video calls.`,
              actionButtonText: 'Set Up Now',
            });
          }
        } else {
          // No meeting detected
          if (meetingModeActive) {
            // Meeting ended - stop screen capture
            console.log('[MeetingMode] Meeting ended, stopping capture');
            if (meetingStreamRef.current) {
              meetingStreamRef.current.getTracks().forEach((track) => track.stop());
              meetingStreamRef.current = null;
            }
            if (meetingVideoRef.current) {
              meetingVideoRef.current.srcObject = null;
            }
            // Clear dismissed prompt for this app so user gets notified next meeting
            const endedApp = useMeetingModeStore.getState().detectedApp;
            if (endedApp) {
              dismissedMeetingPromptRef.current.delete(endedApp);
            }
            setMeetingModeActive(false);
          } else if (pendingMeetingApp) {
            // Meeting ended before calibration was completed - restart camera
            console.log('[MeetingMode] Meeting ended without calibration, restarting camera');
            // Clear dismissed prompt so user gets notified next meeting
            dismissedMeetingPromptRef.current.delete(pendingMeetingApp);
            setPendingMeetingApp(null);
            // Camera will restart automatically via the camera effect (pendingMeetingApp changed)
          }
        }
      } catch (err) {
        console.error('[MeetingMode] Detection error:', err);
      }
    };

    // Initial check
    checkForMeeting();

    // Poll every 15 seconds (faster for better UX)
    const interval = setInterval(checkForMeeting, 15000);

    return () => {
      clearInterval(interval);
      // Cleanup screen capture on unmount
      if (meetingStreamRef.current) {
        meetingStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isDetecting, meetingModeActive, getCalibration, setMeetingModeActive, touchCalibration]);

  // Handle notification click - navigate to Meeting Mode view and start calibration
  // This is triggered when user clicks the system notification
  useEffect(() => {
    // Listen for notification click from main process via IPC
    const handleMeetingModeNavigate = () => {
      // Navigate to Meeting Mode view
      setCurrentView('meetingMode');
      // If we have a pending app, start calibration
      if (pendingMeetingApp) {
        setCalibrationAppName(pendingMeetingApp);
        setShowCalibrationUI(true);
        setMeetingModeEnabled(true);
      }
    };

    // Register IPC listener for notification clicks
    window.lumina?.onMeetingModeNavigate?.(handleMeetingModeNavigate);

    return () => {
      // Cleanup listener if available
      window.lumina?.offMeetingModeNavigate?.(handleMeetingModeNavigate);
    };
  }, [pendingMeetingApp, setMeetingModeEnabled]);

  // Handle alert action button click - start calibration directly
  // This is triggered when user clicks "Set Up Now" on the meeting detected alert
  useEffect(() => {
    const handleStartCalibration = async () => {
      // First detect which meeting app is running
      try {
        const result = await window.lumina.meetingMode.detectApp();
        if (result.isDetected && result.appName) {
          setCalibrationAppName(result.appName);
          setShowCalibrationUI(true);
          setMeetingModeEnabled(true);
        }
      } catch (err) {
        console.error('[MeetingMode] Failed to detect app for calibration:', err);
      }
    };

    const cleanup = window.lumina?.onMeetingModeStartCalibration?.(handleStartCalibration);

    return () => {
      cleanup?.();
    };
  }, [setMeetingModeEnabled]);

  // Start/stop detection loop - uses setInterval to work in background
  useEffect(() => {
    // Only start detection when video is actually ready
    // For meeting mode, we also need the meeting video to be ready
    const videoReady = meetingModeActive ?
      (meetingVideoRef.current?.readyState ?? 0) >= 2 :
      isVideoReady;

    if (isDetecting && videoReady) {
      // Run detection at ~30fps (33ms) for both camera and meeting mode
      const intervalMs = 33;

      detectionIntervalRef.current = setInterval(() => {
        // Use meeting video when in meeting mode, otherwise camera
        const video = meetingModeActive ? meetingVideoRef.current : videoRef.current;
        if (!video || !landmarkerManager.isReady()) return;

        // Wait for video to have valid data
        if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
          return;
        }

        // For meeting mode, we need to crop the screen capture to the calibrated region
        let frameSource: HTMLVideoElement | HTMLCanvasElement = video;

        if (meetingModeActive && meetingCanvasRef.current) {
          const detectedApp = useMeetingModeStore.getState().detectedApp;
          if (detectedApp) {
            const calibration = getCalibration(detectedApp);
            if (calibration) {
              const canvas = meetingCanvasRef.current;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                // Set canvas size to region size
                canvas.width = calibration.region.width;
                canvas.height = calibration.region.height;

                // Draw cropped region from screen capture
                ctx.drawImage(
                  video,
                  calibration.region.x,
                  calibration.region.y,
                  calibration.region.width,
                  calibration.region.height,
                  0,
                  0,
                  calibration.region.width,
                  calibration.region.height
                );

                frameSource = canvas;
              }
            }
          }
        }

        const result = landmarkerManager.processVideoFrame(frameSource);
        if (result) {
          setFaceDetected(result.rawLandmarks !== null);

          // Update EAR waveform data on every frame (for visualization)
          if (result.rawLandmarks !== null) {
            const ear = result.blink.avgEAR;
            const threshold = result.blink.threshold;
            const now = Date.now();
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

            // Add to Zustand store (persists across navigation)
            addWaveformPoint({
              timestamp: now,
              ear,
              isBlink: result.blink.isBlink,
              phase,
              slope,
            });
          }

          if (result.blink.isBlink) {
            recordBlink(result.blink.avgEAR);
            window.lumina?.database.insertBlink(Date.now(), result.blink.avgEAR, true);
            window.lumina?.detection.sendBlink({ ear: result.blink.avgEAR, timestamp: Date.now() });

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
            // Log new yawns to database
            if (result.yawn.yawnCount > lastYawnCountRef.current) {
              window.lumina?.database.insertWellnessEvent(
                Date.now(),
                'yawn',
                { mar: result.yawn.mar }
              );
              lastYawnCountRef.current = result.yawn.yawnCount;
            }
          }
          if (result.drowsiness) {
            setCurrentDrowsiness(result.drowsiness);
            // Log drowsiness level changes to database
            if (result.drowsiness.drowsinessLevel !== lastDrowsinessLevelRef.current) {
              const level = result.drowsiness.drowsinessLevel;
              if (level !== 'alert') {
                window.lumina?.database.insertWellnessEvent(
                  Date.now(),
                  level === 'mild' ? 'drowsiness_mild' :
                    level === 'moderate' ? 'drowsiness_moderate' : 'drowsiness_severe',
                  { perclos: result.drowsiness.perclos, recentYawns: result.drowsiness.recentYawns }
                );
              }
              lastDrowsinessLevelRef.current = result.drowsiness.drowsinessLevel;
            }
          }

          // Create minute rollup every 60 seconds
          const now = Date.now();
          if (lastRollupTimeRef.current === 0) {
            lastRollupTimeRef.current = now;
          } else if (now - lastRollupTimeRef.current >= 60000) {
            const avgEar = minuteEarCountRef.current > 0
              ? minuteEarSumRef.current / minuteEarCountRef.current
              : null;

            window.lumina?.database.insertRollup(
              lastRollupTimeRef.current,
              minuteBlinkCountRef.current,
              avgEar
            );
            console.log('[Rollup] Created:', {
              blinks: minuteBlinkCountRef.current,
              avgEar: avgEar?.toFixed(3)
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
  }, [isDetecting, isVideoReady, meetingModeActive, setFaceDetected, recordBlink, getCalibration]);

  // Update blink rate periodically and evaluate alerts
  useEffect(() => {
    if (!isDetecting || !sessionStartTime) return;

    const updateRate = () => {
      const elapsedMs = Date.now() - sessionStartTime;
      const elapsedMinutes = Math.max(elapsedMs / 60000, 1 / 60);
      const blinkRate = Math.round((blinkCount / elapsedMinutes) * 10) / 10;

      updateBlinkRate(blinkRate);
      setSessionDuration(Math.floor(elapsedMs / 1000));

      let score: number;
      if (blinkRate < 5) score = 30;
      else if (blinkRate < 10) score = 50;
      else if (blinkRate < 15) score = 70;
      else if (blinkRate < 20) score = 90;
      else score = 100;

      updateWellnessScore(score);

      window.lumina?.detection.sendUpdate({
        blinkRate,
        wellnessScore: score,
        isDetecting: true,
        faceDetected,
      });

      // Add sample to baseline calibrator if calibrating
      if (isCalibrating && !baselineCalibrator.isCalibrated()) {
        baselineCalibrator.addSample(blinkRate);
        setCalibrationProgress(baselineCalibrator.getProgress());

        // Check if calibration is complete
        if (baselineCalibrator.isCalibrated()) {
          const newBaseline = baselineCalibrator.getBaseline();
          if (newBaseline) {
            setUserBaseline(newBaseline);
            setIsCalibrating(false);
            // Save to database
            window.lumina?.database.updateBaseline(
              newBaseline.blinkP25,
              newBaseline.blinkP50,
              newBaseline.blinkP75,
              newBaseline.samplesCount
            );
            // Notify user
            window.lumina?.alerts.show({
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
        baseline: userBaseline,
        posture: currentPosture,
        yawn: currentYawn,
        drowsiness: currentDrowsiness,
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
        window.lumina?.alerts.show({
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          action: alert.action,
        });

        // Sync to cloud
        window.lumina?.alerts.sync(alert.type, alert.severity, alert.message);
      }
    };

    updateRate();
    const interval = setInterval(updateRate, 5000);
    return () => clearInterval(interval);
  }, [isDetecting, sessionStartTime, blinkCount, faceDetected, updateBlinkRate, updateWellnessScore, addAlert, isCalibrating, userBaseline, currentPosture, currentYawn, currentDrowsiness]);

  // Toggle detection
  const handleToggleDetection = () => {
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

  // Break reminder - check every minute if 20 minutes have passed
  useEffect(() => {
    if (!isDetecting || isOnBreak) return;

    const checkBreakReminder = () => {
      const timeSinceLastBreak = Date.now() - lastBreakTime;
      if (timeSinceLastBreak >= BREAK_REMINDER_INTERVAL) {
        // Show break reminder notification
        window.lumina?.alerts.show({
          id: `break-${Date.now()}`,
          type: 'break_reminder',
          severity: 'info',
          message: "Time for a 20-20-20 break!",
          action: "Look at something 20 feet away for 20 seconds.",
        });
      }
    };

    const interval = setInterval(checkBreakReminder, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isDetecting, isOnBreak, lastBreakTime]);

  // Break countdown timer
  useEffect(() => {
    if (!isOnBreak) return;

    if (breakTimeRemaining <= 0) {
      // Break complete
      setIsOnBreak(false);
      setBreakTimeRemaining(20);
      setLastBreakTime(Date.now());
      setTodayStats(prev => ({
        ...prev,
        breaksCount: prev.breaksCount + 1,
      }));
      // Show completion notification
      window.lumina?.alerts.show({
        id: `break-complete-${Date.now()}`,
        type: 'break_complete',
        severity: 'info',
        message: "Break complete! Great job taking care of your eyes.",
        action: "You can resume your work now.",
      });
      return;
    }

    const timer = setTimeout(() => {
      setBreakTimeRemaining(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isOnBreak, breakTimeRemaining]);

  // Handle take a break
  const handleTakeBreak = () => {
    setIsOnBreak(true);
    setBreakTimeRemaining(20);
    // Optionally pause detection during break
    if (isDetecting) {
      setDetecting(false);
    }
  };

  // Handle skip break
  const handleSkipBreak = () => {
    setIsOnBreak(false);
    setBreakTimeRemaining(20);
    setLastBreakTime(Date.now());
    setShowPreBreakToast(false);
  };

  // Handle start break now (from pre-break toast)
  const handleStartBreakNow = () => {
    setShowPreBreakToast(false);
    handleTakeBreak();
  };

  // Handle postpone break (from pre-break toast)
  const handlePostponeBreak = () => {
    if (postponesRemaining > 0) {
      setPostponesRemaining(prev => prev - 1);
      setShowPreBreakToast(false);
      // Add 5 minutes to the next break
      setLastBreakTime(Date.now() - (BREAK_REMINDER_INTERVAL - 5 * 60 * 1000));
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
          // Calibration data will be stored when detection starts
          console.log('Onboarding calibration baseline:', data.baselineEar);
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

  // Error state
  if (error) {
    return (
      <div className="h-full bg-gray-50">
        <CameraLoader status="error" error={error} />
      </div>
    );
  }

  return (
    <div className="h-full flex bg-gray-50 relative">
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
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
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
                  ? 'bg-black text-white'
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
                  ? 'bg-black text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
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

        {/* Meeting mode status indicator */}
        {meetingModeActive && (
          <div className="absolute top-16 right-6 z-40">
            <MeetingModeStatus
              appName={useMeetingModeStore.getState().detectedApp || 'Meeting'}
              onStop={() => {
                if (meetingStreamRef.current) {
                  meetingStreamRef.current.getTracks().forEach((track) => track.stop());
                  meetingStreamRef.current = null;
                }
                if (meetingVideoRef.current) {
                  meetingVideoRef.current.srcObject = null;
                }
                setMeetingModeActive(false);
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
            videoRef={meetingModeActive ? meetingVideoRef : videoRef}
            meetingCanvasRef={meetingModeActive ? meetingCanvasRef : undefined}
            isDetecting={isDetecting}
            faceDetected={faceDetected}
            blinkCount={blinkCount}
            blinkRate={currentBlinkRate}
            wellnessScore={wellnessScore}
            onToggleDetection={handleToggleDetection}
            meetingModeActive={meetingModeActive}
            meetingAppName={useMeetingModeStore.getState().detectedApp}
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
          onComplete={(region: CaptureRegion) => {
            // Save calibration
            addMeetingCalibration({
              appName: calibrationAppName,
              region,
              displayId: 0,
            });
            setShowCalibrationUI(false);

            const appName = calibrationAppName;
            setCalibrationAppName('');
            // NOTE: Don't clear pendingMeetingApp yet - wait until screen capture starts
            // to prevent camera effect from trying to restart webcam

            // Check if meeting is still active before starting capture
            (async () => {
              try {
                // Verify meeting is still running (user may have left during calibration)
                const meetingStatus = await window.lumina.meetingMode.detectApp();
                if (!meetingStatus.isDetected) {
                  console.log('[MeetingMode] Meeting ended during calibration, skipping capture');
                  // Now clear pendingMeetingApp - camera will restart
                  setPendingMeetingApp(null);
                  return;
                }

                console.log('[MeetingMode] Starting capture after calibration for:', appName);
                const sourceId = await window.lumina.meetingMode.getSourceId(0);
                console.log('[MeetingMode] Got source ID:', sourceId);

                if (sourceId && meetingVideoRef.current) {
                  const stream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: {
                      // @ts-ignore - Electron-specific constraints
                      mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: sourceId,
                        minWidth: 1280,
                        maxWidth: 3840,
                        minHeight: 720,
                        maxHeight: 2160,
                      },
                    },
                  });

                  console.log('[MeetingMode] Got stream:', stream.getVideoTracks()[0]?.label);
                  meetingStreamRef.current = stream;
                  meetingVideoRef.current.srcObject = stream;

                  // Wait for video to be ready
                  await new Promise<void>((resolve) => {
                    const video = meetingVideoRef.current!;
                    if (video.readyState >= 2) {
                      resolve();
                    } else {
                      video.onloadeddata = () => resolve();
                    }
                  });

                  await meetingVideoRef.current.play();
                  setMeetingModeActive(true, appName);
                  // Now safe to clear pendingMeetingApp - screen capture is running
                  setPendingMeetingApp(null);
                  console.log('[MeetingMode] Screen capture started successfully');
                } else {
                  console.error('[MeetingMode] No source ID or video ref');
                  // Clear pendingMeetingApp to allow camera restart
                  setPendingMeetingApp(null);
                  window.lumina.notification.show({
                    title: 'Meeting Mode Error',
                    body: 'Could not access screen. Please try again.',
                    silent: false,
                    type: 'general',
                  });
                }
              } catch (err) {
                console.error('[MeetingMode] Failed to start screen capture after calibration:', err);
                // Clear pendingMeetingApp to allow camera restart
                setPendingMeetingApp(null);
                window.lumina.notification.show({
                  title: 'Meeting Mode Error',
                  body: 'Failed to start screen capture. Please check permissions and try again.',
                  silent: false,
                  type: 'general',
                });
              }
            })();
          }}
          onCancel={() => {
            setShowCalibrationUI(false);
            setCalibrationAppName('');
            // Clear pending app - camera will restart if meeting ended
            setPendingMeetingApp(null);
          }}
        />
      )}
    </div>
  );
}

// Dashboard View Component
function DashboardView({
  wellnessScore,
  blinkRate,
  blinkCount,
  sessionDuration,
  isDetecting,
  faceDetected,
  onToggleDetection,
  status,
  todayStats,
  formatDuration,
  isOnBreak,
  breakTimeRemaining,
  onTakeBreak,
  onSkipBreak,
  isCalibrating,
  calibrationProgress,
  userBaseline,
  showPreBreakToast,
  preBreakSeconds,
  onStartBreakNow,
  onPostponeBreak,
  postponesRemaining,
  currentPosture,
  currentYawn,
  currentDrowsiness,
  userName,
}: {
  wellnessScore: number;
  blinkRate: number;
  blinkCount: number;
  sessionDuration: number;
  isDetecting: boolean;
  faceDetected: boolean;
  onToggleDetection: () => void;
  status: { label: string; color: string; bg: string };
  todayStats: { totalBlinks: number; avgBlinkRate: number; sessionMinutes: number; breaksCount: number };
  formatDuration: (s: number) => string;
  isOnBreak: boolean;
  breakTimeRemaining: number;
  onTakeBreak: () => void;
  onSkipBreak: () => void;
  isCalibrating: boolean;
  calibrationProgress: number;
  userBaseline: Baseline | null;
  showPreBreakToast: boolean;
  preBreakSeconds: number;
  onStartBreakNow: () => void;
  onPostponeBreak: () => void;
  postponesRemaining: number;
  currentPosture: PostureResult | null;
  currentYawn: YawnResult | null;
  currentDrowsiness: DrowsinessResult | null;
  userName: string;
}) {
  // Access gamification stores
  const { streaks, todayProgress } = useStreakStore();
  const { unlocked, getProgress } = useAchievementStore();

  // Mock weekly data - in production, load from database
  const [weeklyData, setWeeklyData] = useState<DayData[]>([]);

  useEffect(() => {
    // Load weekly data
    async function loadWeeklyData() {
      const today = new Date();
      const days: DayData[] = [];

      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(today);
        dayStart.setDate(dayStart.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const rollups = await window.lumina?.database.getRollups(
          dayStart.getTime(),
          dayEnd.getTime()
        );

        if (rollups && rollups.length > 0) {
          const totalBlinks = rollups.reduce((sum, r) => sum + r.blink_count, 0);
          const avgBlinkRate = rollups.length > 0 ? totalBlinks / rollups.length : 0;
          // Score based on blink rate
          const score = Math.min(100, Math.round((avgBlinkRate / 15) * 100));
          days.push({
            label: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
            score,
            isToday: i === 0,
          });
        } else {
          days.push({
            label: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
            score: i === 0 ? wellnessScore : null,
            isToday: i === 0,
          });
        }
      }
      setWeeklyData(days);
    }
    loadWeeklyData();
  }, [wellnessScore]);

  // Calculate time until next break
  const breakIntervalMinutes = 20;
  const timeSinceBreak = Math.floor((Date.now() - todayStats.breaksCount * breakIntervalMinutes * 60000) / 1000);
  const timeUntilBreak = Math.max(0, breakIntervalMinutes * 60 - (sessionDuration % (breakIntervalMinutes * 60)));
  const nextBreakMinutes = Math.floor(timeUntilBreak / 60);
  const nextBreakSeconds = timeUntilBreak % 60;

  // Count unlocked achievements
  const unlockedCount = Object.values(unlocked).filter(Boolean).length;

  return (
    <div className="h-full flex flex-col relative">
      {/* Pre-break Toast */}
      <PreBreakToast
        secondsUntilBreak={preBreakSeconds}
        breakType="micro"
        onStartNow={onStartBreakNow}
        onPostpone={onPostponeBreak}
        postponesRemaining={postponesRemaining}
        isVisible={showPreBreakToast}
      />

      {/* Break Overlay Modal */}
      {isOnBreak && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-xl">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Time for a Break!</h2>
            <p className="text-gray-600 mb-6">
              Look at something 20 feet away to rest your eyes
            </p>
            <div className="relative w-36 h-36 mx-auto mb-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="72" cy="72" r="64" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                <circle
                  cx="72"
                  cy="72"
                  r="64"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="10"
                  strokeDasharray={`${(breakTimeRemaining / 20) * 402} 402`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold">{breakTimeRemaining}</span>
                <span className="text-sm text-gray-500">seconds</span>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={onSkipBreak}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Skip
              </button>
              <button
                onClick={() => {
                  // Extend break by 20 seconds
                }}
                className="px-6 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                +20s
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Welcome Hero Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {userName}! <span className="inline-block origin-[70%_70%] animate-wave">👋</span>
          </h1>
          <p className="text-lg text-gray-500">
            {(() => {
              const hour = new Date().getHours();
              if (hour < 12) return "Good morning! Ready to take care of your eyes today?";
              if (hour < 17) return "Good afternoon! Keep up the great work on your eye health.";
              return "Good evening! Let's wind down and give your eyes some rest.";
            })()}
          </p>
        </div>

        {/* Top Row: Wellness Score + Daily Streak */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Wellness Score Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Wellness Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold">{wellnessScore}</span>
                <span className="text-xl text-gray-400">/100</span>
              </div>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.color}`}>
                {status.label}
              </span>
            </div>
            <div className="w-28 h-28 relative">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="48" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  fill="none"
                  stroke={wellnessScore >= 70 ? '#22c55e' : wellnessScore >= 40 ? '#eab308' : '#ef4444'}
                  strokeWidth="10"
                  strokeDasharray={`${(wellnessScore / 100) * 301} 301`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Icons.Eye />
              </div>
            </div>
          </div>
        </div>

        {/* Daily Streak Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-3">Today's Streaks</p>
          <div className="grid grid-cols-2 gap-3">
            <StreakBadge
              type="daily_use"
              count={streaks.daily_use.currentCount}
              bestStreak={streaks.daily_use.longestCount}
              goal={7}
              size="sm"
              showDetails
            />
            <StreakBadge
              type="break_compliance"
              count={todayProgress.breaksTaken}
              bestStreak={streaks.break_compliance.longestCount}
              goal={4}
              size="sm"
              showDetails
            />
            <StreakBadge
              type="healthy_blink"
              count={streaks.healthy_blink.currentCount}
              bestStreak={streaks.healthy_blink.longestCount}
              goal={8}
              size="sm"
              showDetails
            />
            <StreakBadge
              type="good_posture"
              count={streaks.good_posture.currentCount}
              bestStreak={streaks.good_posture.longestCount}
              goal={60}
              size="sm"
              showDetails
            />
          </div>
        </div>
      </div>

      {/* Live Metrics Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Live Metrics</h3>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isDetecting ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-sm text-gray-500">{isDetecting ? 'Monitoring' : 'Paused'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Blink Rate */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icons.Eye />
              <span className="text-sm text-gray-500">Blink Rate</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{blinkRate.toFixed(1)}</span>
              <span className="text-gray-400">/min</span>
            </div>
            <p className={`text-xs mt-1 ${blinkRate >= 15 ? 'text-green-600' : 'text-yellow-600'}`}>
              {blinkRate >= 15 ? 'Great job!' : 'Eyes working hard'}
            </p>
          </div>

          {/* Session Time */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icons.Clock />
              <span className="text-sm text-gray-500">Session</span>
            </div>
            <span className="text-2xl font-bold">{formatDuration(sessionDuration)}</span>
            <p className="text-xs text-gray-500 mt-1">{blinkCount} blinks</p>
          </div>

          {/* Next Break */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-gray-500">Next Break</span>
            </div>
            <span className="text-2xl font-bold">
              {nextBreakMinutes}:{nextBreakSeconds.toString().padStart(2, '0')}
            </span>
            <p className="text-xs text-gray-500 mt-1">{todayStats.breaksCount} breaks today</p>
          </div>

          {/* Face Detection */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icons.Camera />
              <span className="text-sm text-gray-500">Detection</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${faceDetected ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="text-lg font-medium">{faceDetected ? 'Face Found' : 'No Face'}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Multi-stage adaptive detection</p>
          </div>
        </div>
      </div>

      {/* Middle Row: Weekly Trend + Posture */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Weekly Trend */}
        <WeeklyTrendCard
          days={weeklyData}
        />

        {/* Posture Status */}
        <PostureStatusCard
          status={
            !isDetecting ? 'unknown' :
            !faceDetected ? 'unknown' :
            currentPosture?.hasIssues ? 'poor' : 'good'
          }
          goodPostureMinutes={streaks.good_posture.currentCount}
          totalMinutes={60}
          longestStreak={streaks.good_posture.longestCount}
        />
      </div>

      {/* Achievements Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Achievements</h3>
          <span className="text-sm text-gray-500">{unlockedCount}/9 unlocked</span>
        </div>
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
          {(['first_steps', 'perfect_day', 'week_warrior', 'blink_master', 'posture_pro'] as const).map((id) => (
            <AchievementBadge
              key={id}
              achievement={ACHIEVEMENTS[id]}
              isUnlocked={!!unlocked[id]}
              progress={getProgress(id)}
              showProgress
              size="sm"
            />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold mb-4">Quick Actions</h3>
        <div className="flex gap-4">
          <button
            onClick={onToggleDetection}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              isDetecting
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            {isDetecting ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
          <button
            onClick={onTakeBreak}
            className="flex-1 py-3 px-4 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Take a Break
          </button>
        </div>

        {/* Detection status */}
        {isDetecting && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-gray-600">
              {faceDetected ? 'Looking after your eyes' : 'Ready when you are - just look at the camera'}
            </span>
          </div>
        )}
      </div>

      {/* Calibration Progress */}
      {isCalibrating && (
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-purple-900">Calibrating Your Baseline</h4>
            <span className="text-sm text-purple-700">{Math.round(calibrationProgress * 100)}%</span>
          </div>
          <div className="w-full bg-purple-200 rounded-full h-2 mb-3">
            <div
              className="bg-purple-600 rounded-full h-2 transition-all duration-300"
              style={{ width: `${calibrationProgress * 100}%` }}
            />
          </div>
          <p className="text-sm text-purple-700">
            Learning your unique patterns to give you personalized care. This takes about 2 hours.
          </p>
        </div>
      )}

      {/* Baseline Info */}
      {userBaseline && !isCalibrating && (
        <div className="bg-green-50 rounded-xl p-4 border border-green-100 mb-6">
          <h4 className="font-medium text-green-900 mb-2">Your Personal Baseline</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-green-600">Low</span>
              <p className="font-medium text-green-900">{userBaseline.blinkP25.toFixed(1)}/min</p>
            </div>
            <div>
              <span className="text-green-600">Normal</span>
              <p className="font-medium text-green-900">{userBaseline.blinkP50.toFixed(1)}/min</p>
            </div>
            <div>
              <span className="text-green-600">High</span>
              <p className="font-medium text-green-900">{userBaseline.blinkP75.toFixed(1)}/min</p>
            </div>
          </div>
        </div>
      )}

        {/* Tips */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <h4 className="font-medium text-blue-900 mb-2">Eye Health Tips</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>- Aim for 15-20 blinks per minute to prevent dry eyes</li>
            <li>- Follow the 20-20-20 rule for regular eye breaks</li>
            <li>- Keep your monitor at arm's length and slightly below eye level</li>
          </ul>
        </div>

        {/* Footer message */}
        <div className="text-center py-6 text-gray-400 text-sm">
          <p>Your eyes work hard for you every day.</p>
          <p className="mt-1">Take care of them, they're the only pair you've got.</p>
        </div>
      </div>
    </div>
  );
}

// Monitor View Component
// Note: EarWaveform now reads from Zustand store, no need to pass currentEarData
function MonitorView({
  videoRef,
  meetingCanvasRef,
  isDetecting,
  faceDetected,
  blinkCount,
  blinkRate,
  wellnessScore,
  onToggleDetection,
  meetingModeActive = false,
  meetingAppName = null,
}: {
  videoRef: React.RefObject<HTMLVideoElement>;
  meetingCanvasRef?: React.RefObject<HTMLCanvasElement>;
  isDetecting: boolean;
  faceDetected: boolean;
  blinkCount: number;
  blinkRate: number;
  wellnessScore: number;
  onToggleDetection: () => void;
  meetingModeActive?: boolean;
  meetingAppName?: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw video/cropped canvas to visible canvas
  useEffect(() => {
    if (!isDetecting || !canvasRef.current) {
      console.log('[MonitorView] Draw skipped:', { isDetecting, hasCanvas: !!canvasRef.current });
      return;
    }

    // In meeting mode, draw from the cropped canvas; otherwise draw from video
    const sourceVideo = videoRef.current;
    const sourceCanvas = meetingCanvasRef?.current;

    if (!sourceVideo && !sourceCanvas) {
      console.log('[MonitorView] No source available');
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('[MonitorView] No canvas context');
      return;
    }

    console.log('[MonitorView] Starting draw loop, meetingMode:', meetingModeActive, 'hasSourceCanvas:', !!sourceCanvas);

    let frameCount = 0;
    const draw = () => {
      // In meeting mode with cropped canvas, draw from the cropped canvas
      if (meetingModeActive && sourceCanvas && sourceCanvas.width > 0 && sourceCanvas.height > 0) {
        canvas.width = sourceCanvas.width;
        canvas.height = sourceCanvas.height;
        ctx.drawImage(sourceCanvas, 0, 0);
        if (frameCount === 0) {
          console.log('[MonitorView] First frame from cropped canvas:', canvas.width, 'x', canvas.height);
        }
        frameCount++;
      } else if (sourceVideo && sourceVideo.readyState >= 2) {
        // Fall back to video (camera mode or meeting mode without crop)
        canvas.width = sourceVideo.videoWidth;
        canvas.height = sourceVideo.videoHeight;
        ctx.drawImage(sourceVideo, 0, 0);
        if (frameCount === 0) {
          console.log('[MonitorView] First frame from video:', canvas.width, 'x', canvas.height);
        }
        frameCount++;
      } else if (frameCount === 0) {
        console.log('[MonitorView] Waiting for source...');
      }
      if (isDetecting) {
        requestAnimationFrame(draw);
      }
    };
    draw();
  }, [isDetecting, videoRef, meetingCanvasRef, meetingModeActive]);

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera view */}
        <div className="lg:col-span-2">
          <div className="bg-black rounded-xl overflow-hidden aspect-video relative">
            {isDetecting ? (
              <canvas ref={canvasRef} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/60">
                <div className="text-center">
                  <Icons.Camera />
                  <p className="mt-2">Camera paused</p>
                </div>
              </div>
            )}

            {/* Overlay indicators */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isDetecting ? (faceDetected ? 'bg-green-500' : 'bg-yellow-500') : 'bg-gray-500'}`} />
              <span className="text-white text-sm bg-black/50 px-2 py-1 rounded">
                {isDetecting ? (faceDetected ? 'Detecting' : 'No face') : 'Paused'}
              </span>
            </div>

            {/* Meeting mode indicator */}
            {meetingModeActive && (
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-purple-600/90 px-3 py-1.5 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-white text-sm font-medium">
                  Meeting Mode: {meetingAppName || 'Active'}
                </span>
              </div>
            )}

            <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-2 rounded-lg">
              <span className="text-white text-lg font-bold">Blinks: {blinkCount}</span>
            </div>
          </div>

          {/* Start/Stop button */}
          <button
            onClick={onToggleDetection}
            className={`w-full mt-4 py-3 rounded-lg font-medium transition-colors ${
              isDetecting
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            {isDetecting ? 'Stop Detection' : 'Start Detection'}
          </button>

          {/* EAR Waveform - Real-time eye signal visualization */}
          {/* Data now persists in Zustand store across navigation */}
          <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Eye Signal (EAR)</h3>
              <span className="text-xs text-gray-400">Eye Aspect Ratio over time</span>
            </div>
            <EarWaveform
              windowSize={150}
              threshold={0.21}
              height={100}
              showThreshold={true}
              showBlinkMarkers={true}
            />
          </div>

          {/* Slope Waveform - Rate of change visualization */}
          <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Eye Movement (Slope)</h3>
              <span className="text-xs text-gray-400">Rate of change - dips show blinks</span>
            </div>
            <EarWaveform
              windowSize={150}
              threshold={0}
              height={80}
              showThreshold={true}
              showBlinkMarkers={false}
              useSlope={true}
            />
          </div>
        </div>

        {/* Stats panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500 mb-1">Wellness Score</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{wellnessScore}</span>
              <span className="text-gray-400">/100</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500 mb-1">Blink Rate</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{blinkRate.toFixed(1)}</span>
              <span className="text-gray-400">/min</span>
            </div>
            <p className={`text-sm mt-1 ${blinkRate >= 15 ? 'text-green-600' : 'text-yellow-600'}`}>
              {blinkRate >= 15 ? 'Great job!' : 'Eyes working hard'}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500 mb-1">Status</p>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="font-medium">{faceDetected ? 'Face Detected' : 'No Face'}</span>
            </div>
          </div>

          <div className="bg-gray-100 rounded-xl p-4 text-sm text-gray-600">
            <p className="font-medium mb-2">Detection Info</p>
            <p>Algorithm: Multi-stage adaptive</p>
            <p>Frame Rate: 30 FPS</p>
            <p>Processing: GPU</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Exercises View Component
interface ExerciseStep {
  step: number;
  text: string;
  duration: number;
}

interface EyeExercise {
  id: string;
  name: string;
  description: string;
  category: 'relaxation' | 'focus' | 'mobility' | 'strain_relief';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  durationSeconds: number;
  iconName: string;
  instructions: ExerciseStep[];
}

interface ExerciseSession {
  id?: number;
  exercise_id: string;
  started_at: number;
  completed_at: number | null;
  status: 'in_progress' | 'completed' | 'cancelled';
}

function ExercisesView() {
  const [exercises, setExercises] = useState<EyeExercise[]>([]);
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [stats, setStats] = useState<{
    todaySessions: number;
    todayMinutes: number;
    weekSessions: number;
    weekMinutes: number;
    totalSessions: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeExercise, setActiveExercise] = useState<EyeExercise | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [exerciseList, sessionList, exerciseStats] = await Promise.all([
          window.lumina.exercises.getAll(),
          window.lumina.exercises.getSessions(30),
          window.lumina.exercises.getStats(7),
        ]);
        setExercises(exerciseList);
        setSessions(sessionList);
        setStats(exerciseStats);
      } catch (error) {
        console.error('Failed to load exercises:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Timer logic
  useEffect(() => {
    if (!activeExercise || isPaused || isComplete) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          const steps = activeExercise.instructions;
          if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
            return steps[currentStepIndex + 1].duration;
          } else {
            setIsComplete(true);
            if (sessionId) {
              window.lumina.exercises.completeSession(sessionId);
            }
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [activeExercise, isPaused, isComplete, currentStepIndex, sessionId]);

  const handleStartExercise = async (exercise: EyeExercise) => {
    try {
      const result = await window.lumina.exercises.startSession(exercise.id);
      if (result.success && result.sessionId) {
        setSessionId(result.sessionId);
        setActiveExercise(exercise);
        setCurrentStepIndex(0);
        setCountdown(exercise.instructions[0]?.duration ?? 5);
        setIsPaused(false);
        setIsComplete(false);
      }
    } catch (error) {
      console.error('Failed to start exercise:', error);
    }
  };

  const handleCloseModal = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setActiveExercise(null);
    setSessionId(null);
    setCurrentStepIndex(0);
    setCountdown(0);
    setIsPaused(false);
    setIsComplete(false);
    // Refresh stats
    const [sessionList, exerciseStats] = await Promise.all([
      window.lumina.exercises.getSessions(30),
      window.lumina.exercises.getStats(7),
    ]);
    setSessions(sessionList);
    setStats(exerciseStats);
  }, []);

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'relaxation': return 'bg-blue-100 text-blue-700';
      case 'focus': return 'bg-purple-100 text-purple-700';
      case 'mobility': return 'bg-green-100 text-green-700';
      case 'strain_relief': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-700';
      case 'intermediate': return 'bg-amber-100 text-amber-700';
      case 'advanced': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-gray-500">Loading exercises...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-sm text-gray-500">Today</div>
          <div className="text-2xl font-bold">{stats?.todayMinutes ?? 0} min</div>
          <div className="text-xs text-gray-400">{stats?.todaySessions ?? 0} sessions</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-sm text-gray-500">This Week</div>
          <div className="text-2xl font-bold">{stats?.weekMinutes ?? 0} min</div>
          <div className="text-xs text-gray-400">{stats?.weekSessions ?? 0} sessions</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-sm text-gray-500">Total</div>
          <div className="text-2xl font-bold">{stats?.totalSessions ?? 0}</div>
          <div className="text-xs text-gray-400">exercises completed</div>
        </div>
      </div>

      {/* Exercise Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">All Exercises</h2>
        <div className="grid grid-cols-2 gap-4">
          {exercises.map((exercise) => (
            <div
              key={exercise.id}
              className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0">
                  <Icons.Eye />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{exercise.name}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-2">{exercise.description}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryColor(exercise.category)}`}>
                      {exercise.category.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getDifficultyBadge(exercise.difficulty)}`}>
                      {exercise.difficulty}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Icons.Clock />
                      {exercise.durationSeconds}s
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleStartExercise(exercise)}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                <Icons.Play />
                Start Exercise
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      {sessions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {sessions.slice(0, 5).map((session) => {
              const exercise = exercises.find((e) => e.id === session.exercise_id);
              return (
                <div key={session.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                    <Icons.Eye />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {exercise?.name ?? 'Unknown Exercise'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(session.started_at).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.status === 'completed' ? (
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <Icons.Check />
                        Completed
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">{session.status}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Exercise Modal */}
      {activeExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{activeExercise.name}</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <Icons.X />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {isComplete ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center text-green-500 mb-4">
                    <Icons.Check />
                  </div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">Great job!</h4>
                  <p className="text-gray-500 mb-6">
                    You completed the {activeExercise.name} exercise.
                  </p>
                  <button
                    onClick={handleCloseModal}
                    className="px-6 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {/* Countdown display */}
                  <div className="text-center mb-6">
                    <div className="w-32 h-32 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <span className="text-5xl font-bold text-gray-900">{countdown}</span>
                    </div>
                    <p className="text-sm text-gray-500">seconds remaining</p>
                  </div>

                  {/* Current step */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-black text-white text-sm font-medium flex items-center justify-center">
                        {currentStepIndex + 1}
                      </span>
                      <span className="text-sm text-gray-500">
                        Step {currentStepIndex + 1} of {activeExercise.instructions.length}
                      </span>
                    </div>
                    <p className="text-lg font-medium text-gray-900">
                      {activeExercise.instructions[currentStepIndex]?.text}
                    </p>
                  </div>

                  {/* Progress dots */}
                  <div className="flex justify-center gap-2 mb-6">
                    {activeExercise.instructions.map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          idx === currentStepIndex
                            ? 'bg-black'
                            : idx < currentStepIndex
                            ? 'bg-green-500'
                            : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Controls */}
                  <div className="flex gap-3">
                    <button
                      onClick={togglePause}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                    >
                      {isPaused ? <><Icons.Play /> Resume</> : <><Icons.Pause /> Pause</>}
                    </button>
                    <button
                      onClick={handleCloseModal}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// History View Component
interface DailyData {
  date: string;
  totalBlinks: number;
  minuteCount: number;
  avgBlinkRate: number;
  avgEar: number;
}

function HistoryView() {
  const [stats, setStats] = useState<{
    totalBlinks: number;
    avgEar: number;
    minuteCount: number;
  } | null>(null);
  const [weeklyData, setWeeklyData] = useState<DailyData[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Load today's stats
      const result = await window.lumina?.database.getSessionStats(today.getTime());
      if (result) {
        setStats(result);
      }

      // Load last 7 days of data
      const days: DailyData[] = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(today);
        dayStart.setDate(dayStart.getDate() - i);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const rollups = await window.lumina?.database.getRollups(
          dayStart.getTime(),
          dayEnd.getTime()
        );

        if (rollups && rollups.length > 0) {
          const totalBlinks = rollups.reduce((sum, r) => sum + r.blink_count, 0);
          const avgEar = rollups.reduce((sum, r) => sum + (r.avg_ear ?? 0), 0) / rollups.length;
          days.push({
            date: dayStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            totalBlinks,
            minuteCount: rollups.length,
            avgBlinkRate: rollups.length > 0 ? totalBlinks / rollups.length : 0,
            avgEar,
          });
        } else {
          days.push({
            date: dayStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            totalBlinks: 0,
            minuteCount: 0,
            avgBlinkRate: 0,
            avgEar: 0,
          });
        }
      }
      setWeeklyData(days);
      setIsLoading(false);
    }
    loadData();
  }, []);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      // Get all data from last 30 days
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const rollups = await window.lumina?.database.getRollups(
        thirtyDaysAgo.getTime(),
        today.getTime()
      );

      if (!rollups || rollups.length === 0) {
        alert('No data to export');
        return;
      }

      // Generate CSV content
      const headers = ['Timestamp', 'Blink Count', 'Eye Openness', 'Synced'];
      const rows = rollups.map((r) => [
        new Date(r.timestamp).toISOString(),
        r.blink_count.toString(),
        r.avg_ear?.toFixed(4) ?? '',
        r.synced ? 'Yes' : 'No',
      ]);

      const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');

      // Show save dialog
      const result = await window.lumina?.system.showSaveDialog({
        title: 'Export Wellness Data',
        defaultPath: `lumina-wellness-${new Date().toISOString().split('T')[0]}.csv`,
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      });

      if (result && !result.canceled && result.filePath) {
        // Write to file
        const writeResult = await window.lumina?.system.writeFile(result.filePath, csvContent);
        if (writeResult?.success) {
          alert(`Data exported successfully! ${rollups.length} records saved to:\n${result.filePath}`);
        } else {
          // Fallback to clipboard
          await navigator.clipboard.writeText(csvContent);
          alert(`File write failed, but data copied to clipboard. ${rollups.length} records.`);
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate max for bar chart scaling
  const maxBlinks = Math.max(...weeklyData.map((d) => d.totalBlinks), 1);

  // Show skeleton while loading
  if (isLoading) {
    return (
      <div className="p-6">
        <HistorySkeleton />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Action bar */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleExportCSV}
          disabled={isExporting}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {isExporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Today's Blinks</p>
          <p className="text-2xl font-bold mt-1">{stats?.totalBlinks ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Eye Openness</p>
          <p className="text-2xl font-bold mt-1">{stats?.avgEar?.toFixed(3) ?? '0.000'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Minutes Tracked</p>
          <p className="text-2xl font-bold mt-1">{stats?.minuteCount ?? 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold mb-4">Weekly Activity</h3>
        <div className="flex items-end justify-between gap-2 h-40">
          {weeklyData.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div className="flex-1 w-full flex items-end">
                <div
                  className="w-full bg-black rounded-t transition-all"
                  style={{
                    height: `${Math.max((day.totalBlinks / maxBlinks) * 100, 2)}%`,
                    minHeight: day.totalBlinks > 0 ? '8px' : '2px',
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 truncate w-full text-center">
                {day.date.split(' ')[0]}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center text-sm text-gray-500">
          Total: {weeklyData.reduce((sum, d) => sum + d.totalBlinks, 0)} blinks this week
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold mb-4">Daily Breakdown</h3>
        {weeklyData.some((d) => d.totalBlinks > 0) ? (
          <div className="space-y-2">
            <div className="grid grid-cols-5 gap-2 text-xs text-gray-500 font-medium px-2">
              <span>Date</span>
              <span className="text-right">Blinks</span>
              <span className="text-right">Minutes</span>
              <span className="text-right">Rate/min</span>
              <span className="text-right">Openness</span>
            </div>
            {weeklyData.filter((d) => d.totalBlinks > 0).map((day, i) => (
              <div
                key={i}
                className="grid grid-cols-5 gap-2 text-sm py-2 px-2 hover:bg-gray-50 rounded"
              >
                <span className="font-medium">{day.date}</span>
                <span className="text-right">{day.totalBlinks}</span>
                <span className="text-right">{day.minuteCount}</span>
                <span className="text-right">{day.avgBlinkRate.toFixed(1)}</span>
                <span className="text-right">{day.avgEar.toFixed(3)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Icons.Clock />
            <p className="mt-2">No data recorded yet. Start monitoring to see your history.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Settings View Component
interface SettingsViewProps {
  user: AuthUser;
  onSignOut: () => void;
}

function SettingsView({ user, onSignOut }: SettingsViewProps) {
  const {
    alertCooldownMinutes,
    notifications,
    showFloatingStatus,
    soundPreference,
    soundVolume,
    breakIntervalMinutes,
    breakDurationSeconds,
    maxPostpones,
    postureMonitoringEnabled,
    postureSensitivity,
    theme,
    cloudSyncEnabled,
    orgName,
    setAlertCooldownMinutes,
    setNotifications,
    setShowFloatingStatus,
    setSoundPreference,
    setSoundVolume,
    setBreakSettings,
    setPostureMonitoringEnabled,
    setPostureSensitivity,
    setTheme,
    setCloudSyncEnabled,
  } = useSettingsStore();

  const [syncStatus, setSyncStatus] = useState<{
    isConfigured: boolean;
    isSyncing: boolean;
    pendingCount: number;
  } | null>(null);

  // Data management state
  const [isExporting, setIsExporting] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [clearDataConfirmText, setClearDataConfirmText] = useState('');
  const [isClearingData, setIsClearingData] = useState(false);

  // Delete account state
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletionScheduled, setDeletionScheduled] = useState<string | null>(null);

  useEffect(() => {
    async function loadSyncStatus() {
      const status = await window.lumina?.sync.getStatus();
      if (status) {
        setSyncStatus(status);
      }
    }
    loadSyncStatus();
    const interval = setInterval(loadSyncStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    const result = await window.lumina?.sync.trigger();
    console.log('Manual sync result:', result);
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const result = await window.lumina?.database.exportData();
      if (result?.success && result.data) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lumina-wellness-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert('Failed to export data. Please try again.');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearLocalData = async () => {
    setIsClearingData(true);
    try {
      // Clear localStorage
      const keysToRemove = Object.keys(localStorage).filter((key) =>
        key.startsWith('lumina-')
      );
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      // Clear SQLite database via IPC
      await window.lumina?.database.clearAllData();

      setShowClearDataModal(false);
      setClearDataConfirmText('');
      alert('Local data cleared successfully. The app will restart.');
      // Reload the app
      window.location.reload();
    } catch (error) {
      console.error('Clear data error:', error);
      alert('Failed to clear local data. Please try again.');
    } finally {
      setIsClearingData(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const result = await window.lumina?.auth.requestAccountDeletion();
      if (result?.success && result.deletionDate) {
        setDeletionScheduled(result.deletionDate);
        setShowDeleteAccountModal(false);
        setDeleteConfirmText('');
      } else {
        setDeleteError(result?.error || 'Failed to schedule deletion');
      }
    } catch (error) {
      setDeleteError('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Detection Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Detection Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Detection Sensitivity</p>
                <p className="text-sm text-gray-500">Blink detection uses adaptive multi-stage algorithm with auto-calibration</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-gray-100 px-3 py-1 rounded text-sm">
                  Auto
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Alert Cooldown</p>
                <p className="text-sm text-gray-500">Minutes between repeated alerts</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="5"
                  value={alertCooldownMinutes}
                  onChange={(e) => setAlertCooldownMinutes(parseInt(e.target.value))}
                  className="w-24"
                />
                <span className="bg-gray-100 px-3 py-1 rounded font-mono w-16 text-center">
                  {alertCooldownMinutes}m
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Desktop Notifications</p>
                <p className="text-sm text-gray-500">Show alerts and reminders</p>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  notifications ? 'bg-black' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    notifications ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Floating Status</p>
                <p className="text-sm text-gray-500">Show small status window</p>
              </div>
              <button
                onClick={() => setShowFloatingStatus(!showFloatingStatus)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  showFloatingStatus ? 'bg-black' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    showFloatingStatus ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Sound Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Sound Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Notification Sound</p>
                <p className="text-sm text-gray-500">Sound played for break reminders</p>
              </div>
              <select
                value={soundPreference}
                onChange={(e) => setSoundPreference(e.target.value as any)}
                className="select select-minimal"
              >
                <option value="silence">Silence</option>
                <option value="chime">Chime</option>
                <option value="bell">Bell</option>
                <option value="soft-ping">Soft Ping</option>
                <option value="nature">Nature</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sound Volume</p>
                <p className="text-sm text-gray-500">Volume level for notifications</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={soundVolume}
                  onChange={(e) => setSoundVolume(parseInt(e.target.value))}
                  className="w-24"
                />
                <span className="bg-gray-100 px-3 py-1 rounded font-mono w-16 text-center">
                  {soundVolume}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Break Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Break Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Break Interval</p>
                <p className="text-sm text-gray-500">Time between breaks (minutes)</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="5"
                  value={breakIntervalMinutes}
                  onChange={(e) => setBreakSettings({ breakIntervalMinutes: parseInt(e.target.value) })}
                  className="w-24"
                />
                <span className="bg-gray-100 px-3 py-1 rounded font-mono w-16 text-center">
                  {breakIntervalMinutes}m
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Break Duration</p>
                <p className="text-sm text-gray-500">How long each break lasts (seconds)</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="5"
                  value={breakDurationSeconds}
                  onChange={(e) => setBreakSettings({ breakDurationSeconds: parseInt(e.target.value) })}
                  className="w-24"
                />
                <span className="bg-gray-100 px-3 py-1 rounded font-mono w-16 text-center">
                  {breakDurationSeconds}s
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Max Postpones</p>
                <p className="text-sm text-gray-500">How many times you can delay a break</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  value={maxPostpones}
                  onChange={(e) => setBreakSettings({ maxPostpones: parseInt(e.target.value) })}
                  className="w-24"
                />
                <span className="bg-gray-100 px-3 py-1 rounded font-mono w-16 text-center">
                  {maxPostpones}x
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Posture Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Posture Monitoring</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable Posture Monitoring</p>
                <p className="text-sm text-gray-500">Track your sitting posture</p>
              </div>
              <button
                onClick={() => setPostureMonitoringEnabled(!postureMonitoringEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  postureMonitoringEnabled ? 'bg-black' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    postureMonitoringEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            {postureMonitoringEnabled && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Posture Sensitivity</p>
                  <p className="text-sm text-gray-500">How strict the posture detection is</p>
                </div>
                <select
                  value={postureSensitivity}
                  onChange={(e) => setPostureSensitivity(e.target.value as any)}
                  className="select select-minimal"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Appearance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Theme</p>
                <p className="text-sm text-gray-500">Color scheme for the app</p>
              </div>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="select select-minimal"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>
        </div>

        {/* Privacy & Sync Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Privacy & Cloud Sync</h3>
          <div className="space-y-4">
            {/* Cloud Sync Toggle - GDPR Local-Only Mode */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Cloud Sync</p>
                <p className="text-sm text-gray-500">
                  {cloudSyncEnabled
                    ? 'Sync wellness data to cloud for dashboard access'
                    : 'Local-only mode: data stays on this device'}
                </p>
              </div>
              <button
                onClick={async () => {
                  const newValue = !cloudSyncEnabled;
                  setCloudSyncEnabled(newValue);
                  // Control auto-sync based on toggle
                  if (newValue) {
                    await window.lumina?.sync.startAuto();
                  } else {
                    await window.lumina?.sync.stopAuto();
                  }
                }}
                className={`w-12 h-6 rounded-full transition-colors ${
                  cloudSyncEnabled ? 'bg-black' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    cloudSyncEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Privacy notice when disabled */}
            {!cloudSyncEnabled && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Local-Only Mode Active</strong><br />
                  Your wellness data is stored only on this device. No data is sent to our servers.
                  You can re-enable sync anytime to access your data on the web dashboard.
                </p>
              </div>
            )}

            {/* Sync status - only show when enabled */}
            {cloudSyncEnabled && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Sync Status</p>
                    <p className="text-sm text-gray-500">
                      {syncStatus?.isConfigured ? 'Connected to cloud' : 'Not configured'}
                    </p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${syncStatus?.isConfigured ? 'bg-green-500' : 'bg-gray-400'}`} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Pending Records</p>
                    <p className="text-sm text-gray-500">Data waiting to sync</p>
                  </div>
                  <span className="bg-gray-100 px-3 py-1 rounded">{syncStatus?.pendingCount ?? 0}</span>
                </div>
                <button
                  onClick={handleManualSync}
                  className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Sync Now
                </button>
              </>
            )}
          </div>
        </div>

        {/* Account */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Account</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{user.email}</p>
                <p className="text-sm text-gray-500">
                  {user.organization?.name ?? 'No organization'}
                  {user.organization?.role && ` - ${user.organization.role}`}
                </p>
              </div>
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium">
                {user.email[0].toUpperCase()}
              </div>
            </div>
            <button
              onClick={onSignOut}
              className="w-full py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">About Lumina</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>Version: 0.1.0</p>
            <p>Built with Electron + MediaPipe</p>
            <p>All blink detection happens locally on your device.</p>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Data Management</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Export My Data</p>
                <p className="text-sm text-gray-500">Download all your wellness data as JSON</p>
              </div>
              <button
                onClick={handleExportData}
                disabled={isExporting}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                {isExporting ? 'Exporting...' : 'Export'}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Clear Local Data</p>
                <p className="text-sm text-gray-500">Reset all local storage (database, settings, streaks)</p>
              </div>
              <button
                onClick={() => setShowClearDataModal(true)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Clear Data
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-xl border-2 border-red-200 p-6">
          <h3 className="font-semibold mb-4 text-red-800">Danger Zone</h3>
          {deletionScheduled && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="font-medium text-amber-800">Account Deletion Scheduled</p>
              <p className="text-sm text-amber-700 mt-1">
                Your account is scheduled for deletion on{' '}
                {new Date(deletionScheduled).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                . Contact support to cancel.
              </p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-red-800">Delete Account</p>
              <p className="text-sm text-gray-500">Permanently delete your account (30-day grace period)</p>
            </div>
            <button
              onClick={() => setShowDeleteAccountModal(true)}
              disabled={!!deletionScheduled}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Clear Data Confirmation Modal */}
      {showClearDataModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Clear All Local Data?</h3>
            <p className="text-gray-600 mb-4">
              This will permanently delete:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 mb-4 space-y-1">
              <li>All wellness data stored on this device</li>
              <li>Streak progress and achievements</li>
              <li>Local settings and preferences</li>
            </ul>
            <p className="text-sm text-gray-500 mb-4">
              Cloud-synced data will not be affected.
            </p>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Type <span className="font-mono font-bold">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={clearDataConfirmText}
                onChange={(e) => setClearDataConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowClearDataModal(false);
                  setClearDataConfirmText('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClearLocalData}
                disabled={isClearingData || clearDataConfirmText !== 'DELETE'}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                {isClearingData ? 'Clearing...' : 'Clear All Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Icons.AlertTriangle className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold">Delete Account?</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete your account? This will:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 mb-4 space-y-1">
              <li>Remove all your wellness data</li>
              <li>Cancel your organization membership</li>
              <li>Delete your account after 30 days</li>
            </ul>
            <p className="text-sm text-gray-500 mb-4">
              You can cancel this request within 30 days by contacting support.
            </p>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Type <span className="font-mono font-bold">{orgName || 'DELETE'}</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={`Type ${orgName || 'DELETE'}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{deleteError}</p>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteAccountModal(false);
                  setDeleteConfirmText('');
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmText !== (orgName || 'DELETE')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Meeting Mode View Component
interface MeetingModeViewProps {
  onStartCalibration: (appName: string) => void;
}

function MeetingModeView({ onStartCalibration }: MeetingModeViewProps) {
  const {
    enabled: meetingModeEnabled,
    isActive: meetingModeActive,
    detectedApp: meetingDetectedApp,
    calibrations: meetingCalibrations,
    autoDetect: meetingAutoDetect,
    setEnabled: setMeetingModeEnabled,
    setAutoDetect: setMeetingAutoDetect,
    removeCalibration: removeMeetingCalibration,
  } = useMeetingModeStore();

  const [customAppName, setCustomAppName] = useState('');

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Status Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Current Status</h3>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              meetingModeActive
                ? 'bg-purple-100 text-purple-800'
                : meetingModeEnabled
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                meetingModeActive
                  ? 'bg-purple-500 animate-pulse'
                  : meetingModeEnabled
                    ? 'bg-green-500'
                    : 'bg-gray-400'
              }`} />
              {meetingModeActive
                ? `Active: ${meetingDetectedApp}`
                : meetingModeEnabled
                  ? 'Ready'
                  : 'Disabled'}
            </div>
          </div>

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <div>
              <p className="font-medium">Enable Meeting Mode</p>
              <p className="text-sm text-gray-500">Track eye health during video calls</p>
            </div>
            <button
              onClick={() => setMeetingModeEnabled(!meetingModeEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${
                meetingModeEnabled ? 'bg-black' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  meetingModeEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Auto-detect Toggle */}
          {meetingModeEnabled && (
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium">Auto-detect meetings</p>
                <p className="text-sm text-gray-500">Automatically switch when meeting starts</p>
              </div>
              <button
                onClick={() => setMeetingAutoDetect(!meetingAutoDetect)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  meetingAutoDetect ? 'bg-black' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    meetingAutoDetect ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-6">
          <h3 className="font-semibold text-blue-900 mb-3">How Meeting Mode Works</h3>
          <div className="space-y-3 text-sm text-blue-800">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 text-blue-900 font-medium">1</div>
              <p>When a meeting app (Zoom, Teams, Meet) is detected, the camera is released so the meeting app can use it.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 text-blue-900 font-medium">2</div>
              <p>Lumina captures your self-view preview (the small video of yourself) from the meeting app.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 text-blue-900 font-medium">3</div>
              <p>Eye tracking continues on this captured region - no images are saved or transmitted.</p>
            </div>
          </div>
        </div>

        {/* Calibrated Apps */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Calibrated Apps</h3>
            <span className="text-sm text-gray-500">{meetingCalibrations.length} app{meetingCalibrations.length !== 1 ? 's' : ''}</span>
          </div>

          {meetingCalibrations.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icons.VideoCall />
              </div>
              <p className="text-gray-600 mb-2">No apps calibrated yet</p>
              <p className="text-sm text-gray-500">
                When you join a meeting, you'll be prompted to calibrate the self-view region.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {meetingCalibrations.map((cal) => (
                <div
                  key={cal.appName}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                      <Icons.VideoCall />
                    </div>
                    <div>
                      <p className="font-medium">{cal.appName}</p>
                      <p className="text-xs text-gray-500">
                        Region: {cal.region.width}x{cal.region.height} px
                        {cal.lastUsed && (
                          <span className="ml-2">
                            Last used: {new Date(cal.lastUsed).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onStartCalibration(cal.appName)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                    >
                      Recalibrate
                    </button>
                    <button
                      onClick={() => removeMeetingCalibration(cal.appName)}
                      className="px-3 py-1.5 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Manual calibration */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-3">Add Custom App</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customAppName}
                onChange={(e) => setCustomAppName(e.target.value)}
                placeholder="App name (e.g., Webex)"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
              <button
                onClick={() => {
                  if (customAppName.trim()) {
                    onStartCalibration(customAppName.trim());
                    setCustomAppName('');
                  }
                }}
                disabled={!customAppName.trim()}
                className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Calibrate
              </button>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Privacy First</p>
              <p className="text-sm text-gray-600 mt-1">
                Only the small self-view region is captured for blink detection. No meeting content, audio, or other participants are ever accessed. All processing happens locally on your device.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  suffix,
  subtext,
  trend,
}: {
  label: string;
  value: string;
  suffix?: string;
  subtext?: string;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">{value}</span>
        {suffix && <span className="text-gray-400">{suffix}</span>}
      </div>
      {subtext && (
        <p className={`text-sm mt-1 flex items-center gap-1 ${
          trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-yellow-600' : 'text-gray-500'
        }`}>
          {trend === 'up' && <Icons.TrendUp />}
          {trend === 'down' && <Icons.TrendDown />}
          {subtext}
        </p>
      )}
    </div>
  );
}
