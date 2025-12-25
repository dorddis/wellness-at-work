/**
 * Spinner Component
 * Animated loading spinner with size variants
 * Uses black/gray colors per design constraints
 */

import React from 'react';
import { cn } from '../lib/utils';

export interface SpinnerProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Additional CSS classes */
  className?: string;
  /** Label for screen readers */
  label?: string;
}

const sizeConfig = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-3',
  xl: 'w-12 h-12 border-4',
};

export function Spinner({ size = 'md', className, label = 'Loading' }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        'animate-spin rounded-full',
        'border-border border-t-gray-900',
        sizeConfig[size],
        className
      )}
    >
      <span className="sr-only">{label}</span>
    </div>
  );
}

export default Spinner;
