/**
 * PostureIndicator Component
 * Visual indicator for current posture status with spine icon
 */

import React from 'react';
import { cn } from '../lib/utils';

export type PostureStatus = 'good' | 'fair' | 'poor' | 'unknown';

export interface PostureIndicatorProps {
  /** Current posture status */
  status: PostureStatus;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show label */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const statusConfig: Record<PostureStatus, {
  color: string;
  bgColor: string;
  label: string;
  message: string;
}> = {
  good: {
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Good',
    message: 'Great posture! Keep it up',
  },
  fair: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: 'Fair',
    message: 'Slight slouch detected',
  },
  poor: {
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Poor',
    message: 'Sit up straight',
  },
  unknown: {
    color: 'text-muted-foreground/70',
    bgColor: 'bg-secondary',
    label: 'Unknown',
    message: 'Enable posture monitoring',
  },
};

const sizeConfig = {
  sm: { icon: 'w-4 h-4', text: 'text-xs' },
  md: { icon: 'w-5 h-5', text: 'text-sm' },
  lg: { icon: 'w-6 h-6', text: 'text-base' },
};

// Spine SVG icon
function SpineIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Simplified spine representation */}
      <ellipse cx="12" cy="4" rx="2" ry="1.5" />
      <ellipse cx="12" cy="8" rx="2.5" ry="1.5" />
      <ellipse cx="12" cy="12" rx="2.5" ry="1.5" />
      <ellipse cx="12" cy="16" rx="2" ry="1.5" />
      <ellipse cx="12" cy="20" rx="1.5" ry="1" />
      {/* Connecting line */}
      <line x1="12" y1="5.5" x2="12" y2="6.5" />
      <line x1="12" y1="9.5" x2="12" y2="10.5" />
      <line x1="12" y1="13.5" x2="12" y2="14.5" />
      <line x1="12" y1="17.5" x2="12" y2="19" />
    </svg>
  );
}

export function PostureIndicator({
  status,
  size = 'md',
  showLabel = true,
  className,
}: PostureIndicatorProps) {
  const config = statusConfig[status];
  const sizes = sizeConfig[size];

  return (
    <div
      className={cn('flex items-center gap-2', className)}
      title={config.message}
    >
      <div className={cn('rounded-full p-1.5', config.bgColor)}>
        <SpineIcon className={cn(sizes.icon, config.color)} />
      </div>
      {showLabel && (
        <span className={cn('font-medium', sizes.text, config.color)}>
          {config.label}
        </span>
      )}
    </div>
  );
}

export default PostureIndicator;
