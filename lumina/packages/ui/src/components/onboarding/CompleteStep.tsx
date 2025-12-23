'use client';

/**
 * CompleteStep Component
 * Celebration screen with confetti when onboarding is complete
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

export interface CompleteStepProps {
  onComplete: () => void;
}

interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  duration: number;
  color: string;
  rotation: number;
}

const CONFETTI_COLORS = ['#000000', '#333333', '#666666', '#999999', '#cccccc'];

export function CompleteStep({ onComplete }: CompleteStepProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    // Generate confetti pieces
    const pieces: ConfettiPiece[] = [];
    for (let i = 0; i < 50; i++) {
      pieces.push({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * 360,
      });
    }
    setConfetti(pieces);
  }, []);

  return (
    <div className="h-full flex flex-col px-8 py-6 relative overflow-hidden">
      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none">
        {confetti.map((piece) => (
          <motion.div
            key={piece.id}
            className="absolute w-3 h-3"
            style={{
              left: `${piece.x}%`,
              backgroundColor: piece.color,
              borderRadius: Math.random() > 0.5 ? '50%' : '0',
            }}
            initial={{ y: -20, opacity: 1, rotate: 0 }}
            animate={{
              y: '100vh',
              opacity: [1, 1, 0],
              rotate: piece.rotation + 360,
            }}
            transition={{
              duration: piece.duration,
              delay: piece.delay,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
        {/* Success icon with animation */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 1.0, bounce: 0.3, delay: 0.3 }}
          className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6"
        >
          <motion.svg
            className="w-12 h-12 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <motion.path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 1.0 }}
            />
          </motion.svg>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-3xl font-bold text-gray-900 mb-2"
        >
          You're All Set!
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-gray-600 mb-8 max-w-md"
        >
          Lumina is now monitoring your wellness. We'll help you maintain healthy
          habits while you work.
        </motion.p>

        {/* Quick tips */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.5 }}
          className="bg-gray-50 rounded-xl p-6 max-w-sm w-full mb-6"
        >
          <h3 className="font-medium text-gray-900 mb-4">Quick Tips</h3>
          <div className="space-y-3 text-left">
            <TipItem icon="tray" text="Find Lumina in your system tray" />
            <TipItem icon="eye" text="Blink reminders when you're focused" />
            <TipItem icon="clock" text="Break reminders every 20 minutes" />
          </div>
        </motion.div>

        {/* Stats preview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="flex gap-4 text-center"
        >
          <div className="px-4 py-2">
            <div className="text-2xl font-bold text-gray-900">0</div>
            <div className="text-xs text-gray-500">Blinks Today</div>
          </div>
          <div className="w-px bg-gray-200" />
          <div className="px-4 py-2">
            <div className="text-2xl font-bold text-gray-900">0</div>
            <div className="text-xs text-gray-500">Breaks Taken</div>
          </div>
          <div className="w-px bg-gray-200" />
          <div className="px-4 py-2">
            <div className="text-2xl font-bold text-gray-900">1</div>
            <div className="text-xs text-gray-500">Day Streak</div>
          </div>
        </motion.div>
      </div>

      {/* Action button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.5 }}
        className="mt-6"
      >
        <button
          onClick={onComplete}
          className="w-full py-4 px-6 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors text-lg"
        >
          Open Dashboard
        </button>
        <p className="text-center text-sm text-gray-500 mt-4">
          Lumina will continue running in your system tray
        </p>
      </motion.div>
    </div>
  );
}

function TipItem({ icon, text }: { icon: string; text: string }) {
  const icons: Record<string, React.ReactElement> = {
    tray: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
    eye: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    ),
    clock: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  };

  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-600">
        {icons[icon]}
      </div>
      <span className="text-sm text-gray-700">{text}</span>
    </div>
  );
}

export default CompleteStep;
