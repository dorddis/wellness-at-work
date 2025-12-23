'use client';

/**
 * CalibrationStep Component
 * Quick calibration to establish baseline using real FaceLandmarker detection
 *
 * @see docs/08-TESTING/CALIBRATION_ISSUES.md for known issues and fixes
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import {
  FaceLandmarkerManager,
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

      // Start calibration
      setState('calibrating');
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
      if (!faceLandmarkerRef.current || !videoRef.current || state !== 'calibrating') {
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
  }, [state]);

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

        {state === 'initializing' && (
          <>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6"
            >
              <svg className="w-10 h-10 text-gray-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </motion.div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Initializing...</h2>
            <p className="text-gray-600">Setting up face detection</p>
          </>
        )}

        {state === 'calibrating' && (
          <>
            {/* Hidden video element for camera feed */}
            <video
              ref={videoRef}
              className="hidden"
              playsInline
              muted
            />

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative w-32 h-32 mb-8"
            >
              {/* Progress circle */}
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                <motion.circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#000"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={352}
                  initial={{ strokeDashoffset: 352 }}
                  animate={{ strokeDashoffset: 352 - (progress / 100) * 352 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{Math.round(30 - (progress / 100) * 30)}s</span>
              </div>
            </motion.div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Calibrating...</h2>

            <p className="text-gray-600 mb-4">Just work naturally. We're learning your blink patterns.</p>

            <div className="flex gap-4">
              <div className="bg-gray-50 rounded-lg px-6 py-3">
                <span className="text-sm text-gray-500">Blinks detected: </span>
                <span className="font-medium text-gray-900">{blinkCount}</span>
              </div>
              <div className="bg-gray-50 rounded-lg px-6 py-3">
                <span className="text-sm text-gray-500">Samples: </span>
                <span className="font-medium text-gray-900">{sampleCount}</span>
              </div>
            </div>
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

        {(state === 'calibrating' || state === 'initializing') && (
          <button
            onClick={handleSkip}
            className="w-full py-3 px-6 text-gray-500 hover:text-gray-700 transition-colors text-sm"
          >
            Skip calibration
          </button>
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
