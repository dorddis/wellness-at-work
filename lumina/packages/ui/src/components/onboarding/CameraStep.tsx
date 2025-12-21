/**
 * CameraStep Component
 * Requests camera permission with explanation
 */

import React from 'react';
import { motion } from 'motion/react';

export interface CameraStepProps {
  onNext: () => void;
  onBack: () => void;
  hasPermission: boolean;
}

export function CameraStep({ onNext, onBack, hasPermission }: CameraStepProps) {
  return (
    <div className="h-full flex flex-col px-8 py-6">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {/* Camera icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6"
        >
          <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-gray-900 mb-2"
        >
          Camera Access Needed
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-gray-600 mb-8 max-w-md"
        >
          We need access to your camera to detect blinks and monitor posture.
          Remember: all processing happens locally on your device.
        </motion.p>

        {/* What we detect */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-50 rounded-xl p-6 max-w-sm w-full mb-6"
        >
          <h3 className="font-medium text-gray-900 mb-4">What we detect:</h3>
          <div className="space-y-3">
            <DetectionItem icon="eye" label="Eye blinks (15-20/min is healthy)" />
            <DetectionItem icon="face" label="Face position for posture" />
            <DetectionItem icon="clock" label="Screen time duration" />
          </div>
        </motion.div>

        {/* What we don't do */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-2 text-sm text-gray-500"
        >
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>No photos or videos are ever saved</span>
        </motion.div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex-1 py-3 px-6 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 px-6 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          {hasPermission ? 'Continue' : 'Allow Camera Access'}
        </button>
      </div>
    </div>
  );
}

function DetectionItem({ icon, label }: { icon: string; label: string }) {
  const icons: Record<string, JSX.Element> = {
    eye: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    face: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    clock: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className="flex items-center gap-3 text-left">
      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-600">
        {icons[icon]}
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </div>
  );
}

export default CameraStep;
