import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSessionStore, useAlertStore, useSettingsStore } from '@lumina/ui';
import { FaceLandmarkerManager, AlertEngine, BaselineCalibrator, type WellnessMetrics, type Baseline } from '@lumina/core';
import type { BlinkRateDataPoint } from '@lumina/ui';
import luminaLogo from './assets/lumina-logo.png';
import AuthScreen from './AuthScreen';

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
};

// Detection manager (singleton)
const landmarkerManager = new FaceLandmarkerManager();

// Alert engine (singleton)
const alertEngine = new AlertEngine();

// Baseline calibrator (singleton)
const baselineCalibrator = new BaselineCalibrator();

type View = 'dashboard' | 'monitor' | 'history' | 'settings';

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number>(0);

  // Auth state
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Current view
  const [currentView, setCurrentView] = useState<View>('dashboard');

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

  // Camera state
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const currentStreamRef = useRef<MediaStream | null>(null);

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

  // Baseline calibration state
  const [userBaseline, setUserBaseline] = useState<Baseline | null>(null);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Check auth on mount
  useEffect(() => {
    async function checkAuth() {
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

  // Initialize MediaPipe and camera (only after auth)
  useEffect(() => {
    if (!authUser) return; // Don't init until authenticated
    async function init() {
      try {
        setIsLoading(true);
        setError(null);

        await landmarkerManager.initialize({
          delegate: 'GPU',
          runningMode: 'VIDEO',
        });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        setIsLoading(false);
      }
    }

    init();

    return () => {
      landmarkerManager.close();
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [authUser]);

  // Detection loop
  const runDetection = useCallback(() => {
    if (!videoRef.current || !isDetecting || !landmarkerManager.isReady()) {
      return;
    }

    const result = landmarkerManager.processVideoFrame(videoRef.current);

    if (result) {
      setFaceDetected(result.rawLandmarks !== null);

      if (result.blink.isBlink) {
        recordBlink(result.blink.avgEAR);
        window.lumina?.database.insertBlink(Date.now(), result.blink.avgEAR, true);
        window.lumina?.detection.sendBlink({ ear: result.blink.avgEAR, timestamp: Date.now() });
      }
    }

    animationRef.current = requestAnimationFrame(runDetection);
  }, [isDetecting, setFaceDetected, recordBlink]);

  // Start/stop detection loop
  useEffect(() => {
    if (isDetecting) {
      animationRef.current = requestAnimationFrame(runDetection);
    } else {
      cancelAnimationFrame(animationRef.current);
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [isDetecting, runDetection]);

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
  }, [isDetecting, sessionStartTime, blinkCount, faceDetected, updateBlinkRate, updateWellnessScore, addAlert, isCalibrating, userBaseline]);

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
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show auth screen
  if (!authUser) {
    return <AuthScreen onAuthComplete={handleAuthComplete} />;
  }

  // Loading state (camera init)
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Initializing camera...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">!</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">Camera Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-gray-200">
          <img src={luminaLogo} alt="Lumina" className="h-8 w-8 object-contain" />
          <span className="ml-2 text-lg font-bold">Lumina</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <Icons.Activity /> },
            { id: 'monitor', label: 'Live Monitor', icon: <Icons.Camera /> },
            { id: 'history', label: 'History', icon: <Icons.Clock /> },
            { id: 'settings', label: 'Settings', icon: <Icons.Settings /> },
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

        {/* Session status */}
        <div className="p-4 border-t border-gray-200">
          <div className={`flex items-center gap-2 text-sm ${isDetecting ? 'text-green-600' : 'text-gray-500'}`}>
            <div className={`w-2 h-2 rounded-full ${isDetecting ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {isDetecting ? 'Monitoring Active' : 'Monitoring Paused'}
          </div>
          {isDetecting && sessionDuration > 0 && (
            <p className="text-xs text-gray-500 mt-1">Session: {formatDuration(sessionDuration)}</p>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Hidden video element for detection */}
        <video ref={videoRef} className="hidden" muted playsInline />

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
          />
        )}

        {currentView === 'monitor' && (
          <MonitorView
            videoRef={videoRef}
            isDetecting={isDetecting}
            faceDetected={faceDetected}
            blinkCount={blinkCount}
            blinkRate={currentBlinkRate}
            wellnessScore={wellnessScore}
            onToggleDetection={handleToggleDetection}
          />
        )}

        {currentView === 'history' && <HistoryView />}

        {currentView === 'settings' && <SettingsView user={authUser} onSignOut={handleSignOut} />}
      </main>
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
}) {
  return (
    <div className="p-6 relative">
      {/* Break Overlay Modal */}
      {isOnBreak && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-xl">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">20-20-20 Break</h2>
            <p className="text-gray-600 mb-6">
              Look at something 20 feet away to rest your eyes
            </p>
            <div className="relative w-32 h-32 mx-auto mb-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="56" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="8"
                  strokeDasharray={`${(breakTimeRemaining / 20) * 352} 352`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold">{breakTimeRemaining}</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-6">seconds remaining</p>
            <button
              onClick={onSkipBreak}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Skip Break
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Wellness Dashboard</h1>
        <p className="text-gray-500">Track your eye health and prevent strain</p>
      </div>

      {/* Main wellness score */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">Current Wellness Score</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold">{wellnessScore}</span>
              <span className="text-xl text-gray-400">/100</span>
            </div>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.color}`}>
              {status.label}
            </span>
          </div>
          <div className="w-32 h-32 relative">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="64" cy="64" r="56" fill="none" stroke="#e5e7eb" strokeWidth="12" />
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke={wellnessScore >= 70 ? '#22c55e' : wellnessScore >= 40 ? '#eab308' : '#ef4444'}
                strokeWidth="12"
                strokeDasharray={`${(wellnessScore / 100) * 352} 352`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Icons.Eye />
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Blink Rate"
          value={`${blinkRate.toFixed(1)}`}
          suffix="/min"
          subtext={blinkRate >= 15 ? 'Healthy range' : 'Below average'}
          trend={blinkRate >= 15 ? 'up' : 'down'}
        />
        <StatCard
          label="Blinks This Session"
          value={blinkCount.toString()}
          subtext={isDetecting ? 'Counting...' : 'Start session'}
        />
        <StatCard
          label="Session Duration"
          value={formatDuration(sessionDuration)}
          subtext={sessionDuration > 3600 ? 'Consider a break' : 'Keep going'}
        />
        <StatCard
          label="Today's Total Blinks"
          value={(todayStats.totalBlinks + blinkCount).toString()}
          subtext={`${todayStats.sessionMinutes + Math.floor(sessionDuration / 60)} min monitored`}
        />
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
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
              {faceDetected ? 'Face detected - tracking blinks' : 'No face detected - position yourself in front of camera'}
            </span>
          </div>
        )}
      </div>

      {/* Calibration Progress */}
      {isCalibrating && (
        <div className="mt-6 bg-purple-50 rounded-xl p-4 border border-purple-100">
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
            We're learning your natural blink rate. This takes about 2 hours of monitoring. Keep using Lumina normally!
          </p>
        </div>
      )}

      {/* Baseline Info */}
      {userBaseline && !isCalibrating && (
        <div className="mt-6 bg-green-50 rounded-xl p-4 border border-green-100">
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
          <p className="text-xs text-green-600 mt-2">
            Based on {userBaseline.samplesCount} samples
          </p>
        </div>
      )}

      {/* Tips */}
      <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-100">
        <h4 className="font-medium text-blue-900 mb-2">Eye Health Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>- Aim for 15-20 blinks per minute to prevent dry eyes</li>
          <li>- Follow the 20-20-20 rule: Every 20 minutes, look at something 20 feet away for 20 seconds</li>
          <li>- Keep your monitor at arm's length and slightly below eye level</li>
        </ul>
      </div>
    </div>
  );
}

// Monitor View Component
function MonitorView({
  videoRef,
  isDetecting,
  faceDetected,
  blinkCount,
  blinkRate,
  wellnessScore,
  onToggleDetection,
}: {
  videoRef: React.RefObject<HTMLVideoElement>;
  isDetecting: boolean;
  faceDetected: boolean;
  blinkCount: number;
  blinkRate: number;
  wellnessScore: number;
  onToggleDetection: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw video to visible canvas
  useEffect(() => {
    if (!isDetecting || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (video.readyState >= 2) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
      }
      if (isDetecting) {
        requestAnimationFrame(draw);
      }
    };
    draw();
  }, [isDetecting, videoRef]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Live Monitor</h1>
        <p className="text-gray-500">Real-time blink detection and eye tracking</p>
      </div>

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

            <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-2 rounded-lg">
              <span className="text-white text-lg font-bold">Blinks: {blinkCount}</span>
            </div>
          </div>

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
              {blinkRate >= 15 ? 'Healthy' : 'Below average'}
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
            <p>EAR Threshold: 0.21</p>
            <p>Frame Rate: 30 FPS</p>
            <p>Processing: GPU</p>
          </div>
        </div>
      </div>
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

  useEffect(() => {
    async function loadData() {
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
      const headers = ['Timestamp', 'Blink Count', 'Average EAR', 'Synced'];
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">History</h1>
          <p className="text-gray-500">View your wellness data over time</p>
        </div>
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
          <p className="text-sm text-gray-500">Average EAR</p>
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
              <span className="text-right">Avg EAR</span>
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
    earThreshold,
    alertCooldownMinutes,
    notifications,
    showFloatingStatus,
    setEarThreshold,
    setAlertCooldownMinutes,
    setNotifications,
    setShowFloatingStatus,
  } = useSettingsStore();

  const [syncStatus, setSyncStatus] = useState<{
    isConfigured: boolean;
    isSyncing: boolean;
    pendingCount: number;
  } | null>(null);

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

  return (
    <div className="p-6 overflow-y-auto max-h-[calc(100vh-80px)]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Configure your Lumina experience</p>
      </div>

      <div className="space-y-6">
        {/* Detection Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Detection Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">EAR Threshold</p>
                <p className="text-sm text-gray-500">Eye Aspect Ratio threshold for blink detection (0.15-0.30)</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0.15"
                  max="0.30"
                  step="0.01"
                  value={earThreshold}
                  onChange={(e) => setEarThreshold(parseFloat(e.target.value))}
                  className="w-24"
                />
                <span className="bg-gray-100 px-3 py-1 rounded font-mono w-16 text-center">
                  {earThreshold.toFixed(2)}
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

        {/* Sync Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Cloud Sync</h3>
          <div className="space-y-4">
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
