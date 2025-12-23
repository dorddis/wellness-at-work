'use client';

/**
 * PreBreakToast Component
 * 30-second warning before break starts
 * "Stretchly's most-loved feature - users hate sudden interruptions"
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export interface PreBreakToastProps {
  /** Seconds until break (countdown) */
  secondsUntilBreak: number;
  /** Type of upcoming break */
  breakType?: 'micro' | 'long';
  /** Callback when user clicks "Start Now" */
  onStartNow?: () => void;
  /** Callback when user clicks "Postpone" */
  onPostpone?: () => void;
  /** Number of postpones remaining */
  postponesRemaining?: number;
  /** Whether to show the toast */
  isVisible: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function PreBreakToast({
  secondsUntilBreak,
  breakType = 'micro',
  onStartNow,
  onPostpone,
  postponesRemaining = 2,
  isVisible,
  className,
}: PreBreakToastProps) {
  const [countdown, setCountdown] = useState(secondsUntilBreak);

  // Update countdown
  useEffect(() => {
    setCountdown(secondsUntilBreak);
  }, [secondsUntilBreak]);

  // Countdown timer
  useEffect(() => {
    if (!isVisible || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, countdown]);

  if (!isVisible) return null;

  const breakLabel = breakType === 'long' ? 'Long break' : 'Eye break';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={cn(
        'fixed top-4 right-4 z-50',
        'bg-white rounded-xl shadow-lg border border-gray-200',
        'p-4 min-w-[280px]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        {/* Timer icon with countdown */}
        <div className="relative">
          <svg
            className="w-10 h-10 text-blue-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          {/* Countdown overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-blue-600">
              {countdown}
            </span>
          </div>
        </div>

        <div>
          <p className="font-semibold text-gray-900">
            {breakLabel} in {countdown} seconds
          </p>
          <p className="text-sm text-gray-500">
            Time to rest your eyes
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-3">
        <motion.div
          className="h-full bg-blue-500 rounded-full"
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: secondsUntilBreak, ease: 'linear' }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onStartNow}
          className="flex-1 py-2 px-3 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Start Now
        </button>
        <button
          onClick={onPostpone}
          disabled={postponesRemaining === 0}
          className={cn(
            'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors',
            postponesRemaining > 0
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
          )}
        >
          Postpone {postponesRemaining > 0 && `(${postponesRemaining})`}
        </button>
      </div>

      {/* Postpone limit warning */}
      {postponesRemaining === 0 && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          Maximum postpones reached for this break
        </p>
      )}
    </motion.div>
  );
}

export default PreBreakToast;
