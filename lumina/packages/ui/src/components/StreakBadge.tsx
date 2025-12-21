/**
 * StreakBadge Component
 * Displays streak count with flame animation
 * "Streaks create psychological investment - users don't want to break the chain"
 */

import React from 'react';
import { cn } from '../lib/utils';

export type StreakType = 'daily_use' | 'healthy_blink' | 'break_compliance' | 'good_posture';

export interface StreakBadgeProps {
  /** Type of streak */
  type: StreakType;
  /** Current streak count */
  count: number;
  /** Personal best streak */
  bestStreak?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show detailed info */
  showDetails?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const streakConfig: Record<StreakType, {
  label: string;
  icon: string;
  unit: string;
  color: string;
}> = {
  daily_use: {
    label: 'Daily Streak',
    icon: 'flame',
    unit: 'days',
    color: 'orange',
  },
  healthy_blink: {
    label: 'Healthy Eyes',
    icon: 'eye',
    unit: 'hours',
    color: 'green',
  },
  break_compliance: {
    label: 'Break Master',
    icon: 'check',
    unit: 'breaks',
    color: 'blue',
  },
  good_posture: {
    label: 'Good Posture',
    icon: 'spine',
    unit: 'minutes',
    color: 'purple',
  },
};

const sizeConfig = {
  sm: { container: 'p-2', icon: 'w-4 h-4', text: 'text-lg', label: 'text-xs' },
  md: { container: 'p-3', icon: 'w-5 h-5', text: 'text-2xl', label: 'text-sm' },
  lg: { container: 'p-4', icon: 'w-6 h-6', text: 'text-3xl', label: 'text-base' },
};

// Flame icon with animation
function FlameIcon({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <svg
      className={cn(className, animated && 'animate-pulse')}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 23C16.4183 23 20 19.4183 20 15C20 11 17 8 15 6C15 10 12 11.5 10 9C10 15 6 15 6 11C4 13 4 15 4 15C4 19.4183 7.58172 23 12 23Z" />
    </svg>
  );
}

// Eye icon
function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

// Check icon
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

// Spine icon
function SpineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <ellipse cx="12" cy="4" rx="2" ry="1.5" />
      <ellipse cx="12" cy="8" rx="2.5" ry="1.5" />
      <ellipse cx="12" cy="12" rx="2.5" ry="1.5" />
      <ellipse cx="12" cy="16" rx="2" ry="1.5" />
      <ellipse cx="12" cy="20" rx="1.5" ry="1" />
    </svg>
  );
}

export function StreakBadge({
  type,
  count,
  bestStreak,
  size = 'md',
  showDetails = false,
  className,
}: StreakBadgeProps) {
  const config = streakConfig[type];
  const sizes = sizeConfig[size];

  // Get color classes based on type
  const colorMap = {
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', icon: 'text-orange-500' },
    green: { bg: 'bg-green-100', text: 'text-green-600', icon: 'text-green-500' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', icon: 'text-blue-500' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', icon: 'text-purple-500' },
  } as const;

  const colorClasses = colorMap[config.color as keyof typeof colorMap] ?? colorMap.orange;

  // Render appropriate icon
  const renderIcon = () => {
    const iconProps = { className: cn(sizes.icon, colorClasses.icon) };
    switch (config.icon) {
      case 'flame': return <FlameIcon {...iconProps} animated={count > 0} />;
      case 'eye': return <EyeIcon {...iconProps} />;
      case 'check': return <CheckIcon {...iconProps} />;
      case 'spine': return <SpineIcon {...iconProps} />;
      default: return <FlameIcon {...iconProps} />;
    }
  };

  // Is this a milestone? (7, 14, 30, 100, etc.)
  const isMilestone = [7, 14, 30, 50, 100].includes(count);

  return (
    <div className={cn(
      'rounded-xl border transition-all',
      sizes.container,
      colorClasses.bg,
      isMilestone && 'ring-2 ring-offset-2',
      isMilestone && config.color === 'orange' && 'ring-orange-400',
      isMilestone && config.color === 'green' && 'ring-green-400',
      isMilestone && config.color === 'blue' && 'ring-blue-400',
      isMilestone && config.color === 'purple' && 'ring-purple-400',
      'border-transparent',
      className
    )}>
      <div className="flex items-center gap-2">
        {/* Icon */}
        {renderIcon()}

        {/* Count */}
        <div>
          <div className="flex items-baseline gap-1">
            <span className={cn('font-bold', sizes.text, colorClasses.text)}>
              {count}
            </span>
            {showDetails && (
              <span className={cn('text-gray-500', sizes.label)}>
                {config.unit}
              </span>
            )}
          </div>
          {showDetails && (
            <p className={cn('text-gray-600', sizes.label)}>
              {config.label}
            </p>
          )}
        </div>
      </div>

      {/* Best streak */}
      {showDetails && bestStreak !== undefined && bestStreak > count && (
        <p className={cn('mt-1 text-gray-500', sizes.label)}>
          Best: {bestStreak} {config.unit}
        </p>
      )}

      {/* Milestone celebration */}
      {isMilestone && (
        <p className={cn('mt-1 font-medium', sizes.label, colorClasses.text)}>
          Milestone reached!
        </p>
      )}
    </div>
  );
}

export default StreakBadge;
