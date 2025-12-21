/**
 * WelcomeStep Component
 * First step of onboarding - value proposition
 */

import React from 'react';
import { motion } from 'motion/react';

export interface WelcomeStepProps {
  onNext: () => void;
  onSkip?: () => void;
}

export function WelcomeStep({ onNext, onSkip }: WelcomeStepProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-8 text-center">
      {/* Logo animation */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', duration: 0.8 }}
        className="mb-8"
      >
        <div className="w-24 h-24 bg-black rounded-2xl flex items-center justify-center">
          <svg className="w-14 h-14 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
          </svg>
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-3xl font-bold text-gray-900 mb-4"
      >
        Welcome to Lumina
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-lg text-gray-600 mb-8 max-w-md"
      >
        Your AI-powered eye wellness companion. We'll help you maintain healthy
        blink rates, take regular breaks, and improve your posture.
      </motion.p>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex gap-6 mb-12"
      >
        <Feature icon="eye" label="Blink Detection" />
        <Feature icon="clock" label="Smart Breaks" />
        <Feature icon="spine" label="Posture Tracking" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col gap-3 w-full max-w-xs"
      >
        <button
          onClick={onNext}
          className="w-full py-3 px-6 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          Get Started
        </button>
        {onSkip && (
          <button
            onClick={onSkip}
            className="w-full py-3 px-6 text-gray-500 hover:text-gray-700 transition-colors text-sm"
          >
            Skip for now
          </button>
        )}
      </motion.div>
    </div>
  );
}

function Feature({ icon, label }: { icon: string; label: string }) {
  const icons: Record<string, JSX.Element> = {
    eye: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    clock: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    spine: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <ellipse cx="12" cy="4" rx="3" ry="2"/>
        <ellipse cx="12" cy="9" rx="3.5" ry="2"/>
        <ellipse cx="12" cy="14" rx="3.5" ry="2"/>
        <ellipse cx="12" cy="19" rx="3" ry="2"/>
      </svg>
    ),
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
        {icons[icon]}
      </div>
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  );
}

export default WelcomeStep;
