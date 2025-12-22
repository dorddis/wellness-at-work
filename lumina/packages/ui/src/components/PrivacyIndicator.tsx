/**
 * PrivacyIndicator Component
 * Shows visual trust indicator that all processing is local
 * Addresses user concern: "80%+ cite privacy concerns with camera apps"
 */

import React from 'react';
import { cn } from '../lib/utils';

export interface PrivacyIndicatorProps {
  /** Whether camera is currently active */
  isActive?: boolean;
  /** Compact mode for header placement */
  isCompact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function PrivacyIndicator({
  isActive = false,
  isCompact = false,
  className,
}: PrivacyIndicatorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 select-none',
        isCompact ? 'text-xs' : 'text-sm',
        className
      )}
      title="100% local processing - no images leave your device"
    >
      {/* Shield icon with pulse animation when active */}
      <div className="relative">
        <svg
          className={cn(
            'transition-colors duration-300',
            isCompact ? 'w-4 h-4' : 'w-5 h-5',
            isActive ? 'text-green-600' : 'text-gray-400'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>

        {/* Pulse ring when active */}
        {isActive && (
          <span className="absolute inset-0 animate-ping">
            <svg
              className={cn(
                'text-green-400 opacity-75',
                isCompact ? 'w-4 h-4' : 'w-5 h-5'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </span>
        )}
      </div>

      {/* Label */}
      {!isCompact && (
        <span className={cn(
          'font-medium transition-colors',
          isActive ? 'text-green-700' : 'text-gray-500'
        )}>
          {isActive ? '100% Private' : 'Camera Off'}
        </span>
      )}
    </div>
  );
}

export default PrivacyIndicator;
