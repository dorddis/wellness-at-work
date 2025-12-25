'use client';

/**
 * CalibrationStep Component
 * Quick calibration to establish baseline using real FaceLandmarker detection
 *
 * @see docs/08-TESTING/CALIBRATION_ISSUES.md for known issues and fixes
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
// Desktop-only - uses @mediapipe/tasks-vision
import { FaceLandmarkerManager } from '@lumina/core/detection/faceLandmarker';
import {
  EARCalibrator,
  EAR_CALIBRATION,
  CALIBRATION_FLAGS,
  type EARCalibration,
} from '@lumina/core';

export interface CalibrationStepProps {
  onNext: (data: { baselineEar: number; earCalibration: EARCalibration | null }) => void;
  onBack: () => void;
  onSkip: () => void;
  /** Selected camera ID from previous step */
  selectedCameraId?: string | null;
}

type CalibrationState = 'ready' | 'initializing' | 'calibrating' | 'complete' | 'error';

// Use constant from core, with flag to control duration
// When USE_EXTENDED_CALIBRATION_DURATION is true: 60 seconds (more accurate)
// When false: 30 seconds (legacy, faster onboarding)
const CALIBRATION_DURATION_MS = CALIBRATION_FLAGS.USE_EXTENDED_CALIBRATION_DURATION
  ? EAR_CALIBRATION.CALIBRATION_DURATION_MS  // 60 seconds
  : 30_000;  // 30 seconds (legacy)

// Duration in seconds for display
const CALIBRATION_DURATION_SECONDS = CALIBRATION_DURATION_MS / 1000;

export function CalibrationStep({ onNext, onBack, onSkip, selectedCameraId }: CalibrationStepProps) {
  const [state, setState] = useState<CalibrationState>('ready');
  const [progress, setProgress] = useState(0);
  const [blinkCount, setBlinkCount] = useState(0);
  const [sampleCount, setSampleCount] = useState(0);
  const [calibrationResult, setCalibrationResult] = useState<EARCalibration | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Refs for detection pipeline
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceLandmarkerRef = useRef<FaceLandmarkerManager | null>(null);
  const earCalibratorRef = useRef<EARCalibrator | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const stateRef = useRef<CalibrationState>(state); // Track state in ref for detection loop

  // Keep stateRef in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close FaceLandmarker
    if (faceLandmarkerRef.current) {
      faceLandmarkerRef.current.close();
      faceLandmarkerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Start calibration process
  const startCalibration = useCallback(async () => {
    setState('initializing');
    stateRef.current = 'initializing';
    setProgress(0);
    setBlinkCount(0);
    setSampleCount(0);
    setErrorMessage('');

    try {
      // Initialize FaceLandmarker
      const manager = new FaceLandmarkerManager();
      await manager.initialize({
        runningMode: 'VIDEO',
        delegate: 'GPU',
        disableCalibration: true, // We'll use our own calibrator
      });
      faceLandmarkerRef.current = manager;

      // Initialize EAR calibrator
      const calibrator = new EARCalibrator({
        calibrationDurationMs: CALIBRATION_DURATION_MS,
        minSamples: 100,
      });
      earCalibratorRef.current = calibrator;

      // Get camera stream
      const constraints: MediaStreamConstraints = {
        video: selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode: 'user' },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Attach to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Start calibration - update both state and ref
      setState('calibrating');
      stateRef.current = 'calibrating'; // Update ref immediately for detection loop
      startTimeRef.current = performance.now();

      // Start detection loop
      runDetectionLoop();
    } catch (error) {
      console.error('Calibration initialization failed:', error);
      setState('error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to initialize camera or detection'
      );
    }
  }, [selectedCameraId]);

  // Detection loop using requestAnimationFrame
  const runDetectionLoop = useCallback(() => {
    const detect = () => {
      // Use stateRef to avoid stale closure issues
      if (!faceLandmarkerRef.current || !videoRef.current || stateRef.current !== 'calibrating') {
        // If not calibrating but refs exist, keep checking (wait for state transition)
        if (stateRef.current === 'initializing' && faceLandmarkerRef.current) {
          animationFrameRef.current = requestAnimationFrame(detect);
        }
        return;
      }

      const video = videoRef.current;
      const manager = faceLandmarkerRef.current;
      const calibrator = earCalibratorRef.current;

      // Skip if video not ready
      if (video.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      // Process frame
      const result = manager.processVideoFrame(video);

      if (result && calibrator) {
        // Feed EAR to calibrator
        if (result.blink.smoothedEAR > 0) {
          calibrator.addSample(result.blink.smoothedEAR);
          setSampleCount(calibrator.getSampleCount());
        }

        // Track blinks
        if (result.blink.isBlink) {
          setBlinkCount(prev => prev + 1);
        }
      }

      // Update progress
      const elapsed = performance.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / CALIBRATION_DURATION_MS) * 100, 100);
      setProgress(newProgress);

      // Check if calibration is complete
      if (elapsed >= CALIBRATION_DURATION_MS) {
        finishCalibration();
        return;
      }

      // Continue loop
      animationFrameRef.current = requestAnimationFrame(detect);
    };

    animationFrameRef.current = requestAnimationFrame(detect);
  }, []); // No dependencies - uses refs

  // Finish calibration and compute threshold
  const finishCalibration = useCallback(() => {
    // Stop detection loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const calibrator = earCalibratorRef.current;
    if (calibrator) {
      // Force calibration even if not enough samples
      const result = calibrator.forceCalibrate();
      setCalibrationResult(result);
    }

    // Stop camera stream (keep FaceLandmarker for potential re-use)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setState('complete');
  }, []);

  // Handle continue after calibration
  const handleComplete = useCallback(() => {
    const calibrator = earCalibratorRef.current;
    const threshold = calibrator?.getThreshold() ?? 0.21;

    cleanup();

    onNext({
      baselineEar: threshold,
      earCalibration: calibrationResult,
    });
  }, [calibrationResult, cleanup, onNext]);

  // Handle skip
  const handleSkip = useCallback(() => {
    cleanup();
    onSkip();
  }, [cleanup, onSkip]);

  // Handle back
  const handleBack = useCallback(() => {
    cleanup();
    onBack();
  }, [cleanup, onBack]);

  // Calculate blinks per minute (extrapolate from calibration duration)
  // Note: Short calibration periods have high variance - this is an estimate
  const blinksPerMinute = blinkCount > 0
    ? Math.round(blinkCount * (60_000 / CALIBRATION_DURATION_MS))
    : 0;

  return (
    <div className="h-full flex flex-col px-8 py-6">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {state === 'ready' && (
          <>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', duration: 0.8, bounce: 0.3 }}
              className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6"
            >
              <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-2xl font-bold text-gray-900 mb-2"
            >
              Quick Calibration
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-gray-600 mb-8 max-w-md"
            >
              Sit comfortably and look at your screen naturally for {CALIBRATION_DURATION_SECONDS} seconds.
              This helps us learn your baseline blink rate.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="bg-gray-50 rounded-xl p-6 max-w-sm w-full mb-6"
            >
              <h3 className="font-medium text-gray-900 mb-4">Tips for best results:</h3>
              <ul className="space-y-2 text-left text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Face the camera directly
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Good lighting on your face
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Keep glasses on if you wear them
                </li>
              </ul>
            </motion.div>
          </>
        )}

        {/* Camera preview - render during initializing AND calibrating so stream can attach */}
        {(state === 'initializing' || state === 'calibrating') && (
          <>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative w-64 h-48 rounded-2xl overflow-hidden bg-gray-900 mb-6 shadow-lg"
            >
              {/* Single video element - always present so stream can attach */}
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
                playsInline
                muted
              />
              {/* Loading spinner overlay during init */}
              {state === 'initializing' && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                  <svg className="w-10 h-10 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
              )}
              {/* Progress ring overlay during calibrating */}
              {state === 'calibrating' && (
                <div className="absolute bottom-3 right-3 w-12 h-12">
                  <svg className="w-12 h-12 transform -rotate-90">
                    <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.3)" strokeWidth="3" fill="none" />
                    <motion.circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="#fff"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={126}
                      initial={{ strokeDashoffset: 126 }}
                      animate={{ strokeDashoffset: 126 - (progress / 100) * 126 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {Math.round(CALIBRATION_DURATION_SECONDS - (progress / 100) * CALIBRATION_DURATION_SECONDS)}s
                    </span>
                  </div>
                </div>
              )}
            </motion.div>

            {state === 'initializing' && (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Initializing...</h2>
                <p className="text-gray-600 mb-4">Setting up face detection</p>
              </>
            )}

            {state === 'calibrating' && (
              <>
                {/* Reading text cards - pop up with emphasis to encourage natural eye movement */}
                <div className="fixed inset-0 pointer-events-none z-10 p-6">
                  {/* Top left - below stepper */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 2, duration: 0.5, type: 'spring' }}
                    className="absolute top-28 left-6 bg-white rounded-xl shadow-lg border border-gray-200 p-4 max-w-52"
                  >
                    <p className="text-sm font-medium text-gray-800">
                      Your eyes naturally blink 15-20 times per minute
                    </p>
                  </motion.div>

                  {/* Top right - below stepper */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 7, duration: 0.5, type: 'spring' }}
                    className="absolute top-28 right-6 bg-white rounded-xl shadow-lg border border-gray-200 p-4 max-w-52"
                  >
                    <p className="text-sm font-medium text-gray-800 text-right">
                      Screen time can reduce this to just 3-4 blinks
                    </p>
                  </motion.div>

                  {/* Bottom left */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 12, duration: 0.5, type: 'spring' }}
                    className="absolute bottom-32 left-6 bg-white rounded-xl shadow-lg border border-gray-200 p-4 max-w-52"
                  >
                    <p className="text-sm font-medium text-gray-800">
                      This causes dry eyes, strain, and fatigue
                    </p>
                  </motion.div>

                  {/* Bottom right */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 17, duration: 0.5, type: 'spring' }}
                    className="absolute bottom-32 right-6 bg-white rounded-xl shadow-lg border border-gray-200 p-4 max-w-52"
                  >
                    <p className="text-sm font-medium text-gray-800 text-right">
                      Lumina helps you maintain healthy blink patterns
                    </p>
                  </motion.div>

                  {/* Center bottom - final message */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 22, duration: 0.5, type: 'spring' }}
                    className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-gray-800 text-white rounded-xl shadow-lg p-4 max-w-64"
                  >
                    <p className="text-sm font-medium text-center">
                      Almost done! Keep looking naturally at the screen
                    </p>
                  </motion.div>
                </div>

                {/* Blink counter and skip button - centered below camera */}
                <div className="flex flex-col items-center gap-3 mt-4">
                  <div className="bg-gray-50 rounded-lg px-6 py-3">
                    <span className="text-sm text-gray-500">Blinks detected: </span>
                    <span className="font-medium text-gray-900">{blinkCount}</span>
                  </div>
                  <button
                    onClick={() => {
                      cleanup();
                      onSkip();
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors pointer-events-auto"
                  >
                    Skip calibration
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {state === 'complete' && (
          <>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', duration: 0.8, bounce: 0.3 }}
              className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6"
            >
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-2xl font-bold text-gray-900 mb-2"
            >
              Calibration Complete!
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-gray-600 mb-8 max-w-md"
            >
              We detected {blinkCount} blinks in 30 seconds. That's about{' '}
              <span className="font-medium text-gray-900">{blinksPerMinute} blinks per minute</span>.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="bg-gray-50 rounded-xl p-6 max-w-sm w-full"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Your rate</span>
                <span className="font-bold text-gray-900">{blinksPerMinute}/min</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Healthy range</span>
                <span className="text-gray-500">15-20/min</span>
              </div>
              {calibrationResult && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">EAR threshold</span>
                  <span className="text-gray-500">{calibrationResult.threshold.toFixed(3)}</span>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  {blinksPerMinute >= 15 ? (
                    <>Great! Your blink rate is healthy.</>
                  ) : (
                    <>We'll help you maintain a healthier blink rate.</>
                  )}
                </p>
              </div>
            </motion.div>
          </>
        )}

        {state === 'error' && (
          <>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6"
            >
              <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </motion.div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Calibration Failed</h2>
            <p className="text-gray-600 mb-4">{errorMessage}</p>
            <p className="text-sm text-gray-500">You can try again or skip calibration for now.</p>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        {state === 'ready' && (
          <>
            <button
              onClick={handleBack}
              className="flex-1 py-3 px-6 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Back
            </button>
            <button
              onClick={startCalibration}
              className="flex-1 py-3 px-6 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              Start Calibration
            </button>
          </>
        )}

        {state === 'complete' && (
          <button
            onClick={handleComplete}
            className="w-full py-3 px-6 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            Continue
          </button>
        )}

        {state === 'error' && (
          <>
            <button
              onClick={handleSkip}
              className="flex-1 py-3 px-6 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Skip
            </button>
            <button
              onClick={startCalibration}
              className="flex-1 py-3 px-6 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default CalibrationStep;
