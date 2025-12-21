/**
 * PostureStatusCard Component
 * Dashboard card showing posture status and daily stats
 */

import React from 'react';
import { cn } from '../lib/utils';
import { PostureIndicator, type PostureStatus } from './PostureIndicator';

export interface PostureStatusCardProps {
  /** Current posture status */
  status: PostureStatus;
  /** Minutes in good posture today */
  goodPostureMinutes: number;
  /** Total monitored minutes today */
  totalMinutes: number;
  /** Longest streak in good posture (minutes) */
  longestStreak?: number;
  /** Whether posture monitoring is enabled */
  isEnabled?: boolean;
  /** Callback when enable button clicked */
  onEnable?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function PostureStatusCard({
  status,
  goodPostureMinutes,
  totalMinutes,
  longestStreak = 0,
  isEnabled = true,
  onEnable,
  className,
}: PostureStatusCardProps) {
  // Calculate percentage
  const percentage = totalMinutes > 0
    ? Math.round((goodPostureMinutes / totalMinutes) * 100)
    : 0;

  // Format time
  const formatMinutes = (mins: number) => {
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
    }
    return `${mins}m`;
  };

  // Get score color
  const getScoreColor = (pct: number) => {
    if (pct >= 80) return 'text-green-600';
    if (pct >= 60) return 'text-yellow-600';
    if (pct >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  if (!isEnabled) {
    return (
      <div className={cn(
        'bg-white rounded-xl border border-gray-200 p-4',
        className
      )}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Posture</h3>
          <PostureIndicator status="unknown" size="sm" showLabel={false} />
        </div>
        <p className="text-sm text-gray-500 mb-3">
          Enable posture monitoring to track your sitting habits
        </p>
        <button
          onClick={onEnable}
          className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
        >
          Enable Posture Monitoring
        </button>
      </div>
    );
  }

  return (
    <div className={cn(
      'bg-white rounded-xl border border-gray-200 p-4',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Posture</h3>
        <PostureIndicator status={status} size="sm" />
      </div>

      {/* Score */}
      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className={cn('text-3xl font-bold', getScoreColor(percentage))}>
            {percentage}%
          </span>
          <span className="text-gray-400 text-sm">good posture</span>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              percentage >= 80 ? 'bg-green-500' :
              percentage >= 60 ? 'bg-yellow-500' :
              percentage >= 40 ? 'bg-orange-500' : 'bg-red-500'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-500">Good posture time</p>
          <p className="font-semibold text-gray-900">
            {formatMinutes(goodPostureMinutes)}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Best streak</p>
          <p className="font-semibold text-gray-900">
            {formatMinutes(longestStreak)}
          </p>
        </div>
      </div>

      {/* Status message */}
      {status !== 'good' && status !== 'unknown' && (
        <div className={cn(
          'mt-3 p-2 rounded-lg text-xs',
          status === 'fair' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
        )}>
          {status === 'fair'
            ? 'Slight slouch detected - adjust your position'
            : 'Poor posture detected - sit up straight!'}
        </div>
      )}
    </div>
  );
}

export default PostureStatusCard;
