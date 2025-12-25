/**
 * PrivacyStep Component
 * Explains privacy-first approach to build trust
 */

import React from 'react';
import { motion } from 'motion/react';

export interface PrivacyStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function PrivacyStep({ onNext, onBack }: PrivacyStepProps) {
  const privacyPoints = [
    {
      icon: 'device',
      title: '100% Local Processing',
      description: 'All face detection happens on your device. Nothing is sent to the cloud.',
    },
    {
      icon: 'no-camera',
      title: 'No Images Saved',
      description: 'We never store photos or videos. Only aggregate metrics like blink count.',
    },
    {
      icon: 'shield',
      title: 'Your Data, Your Control',
      description: 'Export or delete your data anytime. No data is shared with third parties.',
    },
  ];

  return (
    <div className="h-full flex flex-col px-8 py-6">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {/* Shield icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.8, bounce: 0.3 }}
          className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6"
        >
          <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-2xl font-bold text-foreground mb-2"
        >
          Your Privacy is Protected
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-muted-foreground mb-8 max-w-md"
        >
          We take your privacy seriously. Here's how we keep your data safe:
        </motion.p>

        {/* Privacy points */}
        <div className="space-y-4 max-w-md w-full">
          {privacyPoints.map((point, index) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.15, duration: 0.4 }}
              className="flex items-start gap-4 text-left bg-muted/50 rounded-lg p-4"
            >
              <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center flex-shrink-0">
                <PrivacyIcon type={point.icon} />
              </div>
              <div>
                <h3 className="font-medium text-foreground">{point.title}</h3>
                <p className="text-sm text-muted-foreground">{point.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex-1 py-3 px-6 bg-secondary text-foreground/80 rounded-lg font-medium hover:bg-muted transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 px-6 bg-foreground text-background rounded-lg font-medium hover:bg-foreground/90 transition-colors"
        >
          I Understand
        </button>
      </div>
    </div>
  );
}

function PrivacyIcon({ type }: { type: string }) {
  switch (type) {
    case 'device':
      return (
        <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case 'no-camera':
      return (
        <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      );
    case 'shield':
      return (
        <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      );
    default:
      return null;
  }
}

export default PrivacyStep;
