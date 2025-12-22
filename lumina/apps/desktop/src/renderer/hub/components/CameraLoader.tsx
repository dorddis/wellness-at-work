/**
 * CameraLoader Component
 * Overlay shown during camera and MediaPipe initialization
 * Provides status feedback during the 5-10 second startup process
 */

import React from 'react';

export type CameraStatus =
  | 'loading-model'
  | 'requesting-camera'
  | 'warming-up'
  | 'ready'
  | 'error';

interface CameraLoaderProps {
  /** Current status of camera initialization */
  status: CameraStatus;
  /** Optional error message */
  error?: string;
}

const statusMessages: Record<CameraStatus, { title: string; subtitle: string }> = {
  'loading-model': {
    title: 'Loading AI model...',
    subtitle: 'Preparing face detection',
  },
  'requesting-camera': {
    title: 'Requesting camera access...',
    subtitle: 'Please allow camera permission if prompted',
  },
  'warming-up': {
    title: 'Starting camera...',
    subtitle: 'This may take a few seconds',
  },
  'ready': {
    title: 'Ready!',
    subtitle: 'Camera initialized successfully',
  },
  'error': {
    title: 'Camera Error',
    subtitle: 'Unable to access camera',
  },
};

export function CameraLoader({ status, error }: CameraLoaderProps) {
  const { title, subtitle } = statusMessages[status];

  // Don't render if ready (parent should hide)
  if (status === 'ready') return null;

  return (
    <div className="absolute inset-0 bg-white z-40 flex flex-col items-center justify-center">
      {/* Camera icon with pulse animation */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
          {status === 'error' ? (
            // Error icon
            <svg
              className="w-10 h-10 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          ) : (
            // Camera icon
            <svg
              className="w-10 h-10 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          )}
        </div>

        {/* Pulse animation ring (when not error) */}
        {status !== 'error' && (
          <div className="absolute inset-0 rounded-full bg-gray-300 animate-ping opacity-20" />
        )}
      </div>

      {/* Status message */}
      <p className="text-gray-800 font-medium mb-1">{title}</p>
      <p className="text-gray-500 text-sm mb-6">
        {status === 'error' && error ? error : subtitle}
      </p>

      {/* Loading indicator (when not error) */}
      {status !== 'error' && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}

      {/* Retry button (when error) */}
      {status === 'error' && (
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default CameraLoader;
