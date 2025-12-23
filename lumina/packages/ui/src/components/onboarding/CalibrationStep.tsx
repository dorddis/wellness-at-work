'use client';

/**
 * CalibrationStep Component
 * Quick 30-second calibration to establish baseline
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';

export interface CalibrationStepProps {
  onNext: (data: { baselineEar: number }) => void;
  onBack: () => void;
  onSkip: () => void;
}

type CalibrationState = 'ready' | 'calibrating' | 'complete';

export function CalibrationStep({ onNext, onBack, onSkip }: CalibrationStepProps) {
  const [state, setState] = useState<CalibrationState>('ready');
  const [progress, setProgress] = useState(0);
  const [blinkCount, setBlinkCount] = useState(0);
  const [baselineEar, setBaselineEar] = useState(0.25);

  const startCalibration = useCallback(() => {
    setState('calibrating');
    setProgress(0);
    setBlinkCount(0);
  }, []);

  useEffect(() => {
    if (state !== 'calibrating') return;

    const duration = 30000; // 30 seconds
    const interval = 100;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += interval;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      // Simulate blink detection during calibration
      if (Math.random() < 0.03) {
        setBlinkCount((prev) => prev + 1);
      }

      if (elapsed >= duration) {
        clearInterval(timer);
        // Calculate baseline EAR (simulated)
        const calculatedEar = 0.22 + Math.random() * 0.06;
        setBaselineEar(calculatedEar);
        setState('complete');
      }
    }, interval);

    return () => clearInterval(timer);
  }, [state]);

  const handleComplete = () => {
    onNext({ baselineEar });
  };

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
              Sit comfortably and look at your screen naturally for 30 seconds.
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

        {state === 'calibrating' && (
          <>
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

            <div className="bg-gray-50 rounded-lg px-6 py-3">
              <span className="text-sm text-gray-500">Blinks detected: </span>
              <span className="font-medium text-gray-900">{blinkCount}</span>
            </div>
          </>
        )}

        {state === 'complete' && (
          <>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', duration: 0.8, bounce: 0.3 }}
              className="w-20 h-20 bg-black rounded-full flex items-center justify-center mb-6"
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
              <span className="font-medium text-gray-900">{Math.round(blinkCount * 2)} blinks per minute</span>.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="bg-gray-50 rounded-xl p-6 max-w-sm w-full"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Your rate</span>
                <span className="font-bold text-gray-900">{Math.round(blinkCount * 2)}/min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Healthy range</span>
                <span className="text-gray-500">15-20/min</span>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  {blinkCount * 2 >= 15 ? (
                    <>Great! Your blink rate is healthy.</>
                  ) : (
                    <>We'll help you maintain a healthier blink rate.</>
                  )}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        {state === 'ready' && (
          <>
            <button
              onClick={onBack}
              className="flex-1 py-3 px-6 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Back
            </button>
            <button
              onClick={startCalibration}
              className="flex-1 py-3 px-6 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Start Calibration
            </button>
          </>
        )}

        {state === 'calibrating' && (
          <button
            onClick={onSkip}
            className="w-full py-3 px-6 text-gray-500 hover:text-gray-700 transition-colors text-sm"
          >
            Skip calibration
          </button>
        )}

        {state === 'complete' && (
          <button
            onClick={handleComplete}
            className="w-full py-3 px-6 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

export default CalibrationStep;
