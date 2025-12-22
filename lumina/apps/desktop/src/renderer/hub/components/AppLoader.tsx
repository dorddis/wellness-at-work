/**
 * AppLoader Component
 * Full-screen branded loader for app startup
 * Shows during auth check and initial load
 */

import React from 'react';

interface AppLoaderProps {
  /** Optional message to display */
  message?: string;
}

export function AppLoader({ message = 'Loading...' }: AppLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
      {/* Brand logo placeholder */}
      <div className="mb-8">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-sm">
          {/* Eye icon */}
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
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </div>
      </div>

      {/* Brand name */}
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Lumina</h1>

      {/* Spinner */}
      <div className="w-8 h-8 border-3 border-gray-200 border-t-gray-900 rounded-full animate-spin mb-4" />

      {/* Message */}
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

export default AppLoader;
