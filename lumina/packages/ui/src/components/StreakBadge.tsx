/**
 * StreakBadge Component
 * Displays streak count with flame animation and progress indicators
 * "Streaks create psychological investment - users don't want to break the chain"
 */

import React, { useEffect, useState } from 'react';
import { cn } from '../lib/utils';

export type StreakType = 'daily_use' | 'healthy_blink' | 'break_compliance' | 'good_posture';

export interface StreakBadgeProps {
  /** Type of streak */
  type: StreakType;
  /** Current streak count */
  count: number;
  /** Personal best streak */
  bestStreak?: number;
  /** Daily goal (for progress indicator) */
  goal?: number;
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
  defaultGoal: number;
  emptyMessage: string;
}> = {
  daily_use: {
    label: 'Daily Streak',
    icon: 'flame',
    unit: 'days',
    color: 'orange',
    defaultGoal: 7,
    emptyMessage: 'Start today!',
  },
  healthy_blink: {
    label: 'Healthy Eyes',
    icon: 'eye',
    unit: 'hours',
    color: 'green',
    defaultGoal: 8,
    emptyMessage: 'Begin tracking',
  },
  break_compliance: {
    label: 'Break Master',
    icon: 'check',
    unit: 'breaks',
    color: 'blue',
    defaultGoal: 4,
    emptyMessage: 'Take a break!',
  },
  good_posture: {
    label: 'Good Posture',
    icon: 'spine',
    unit: 'minutes',
    color: 'purple',
    defaultGoal: 60,
    emptyMessage: 'Sit up straight!',
  },
};

const sizeConfig = {
  sm: {
    container: 'p-3',
    icon: 'w-5 h-5',
    number: 'text-2xl',
    unit: 'text-xs',
    label: 'text-xs',
    best: 'text-[10px]',
  },
  md: {
    container: 'p-4',
    icon: 'w-6 h-6',
    number: 'text-3xl',
    unit: 'text-sm',
    label: 'text-sm',
    best: 'text-xs',
  },
  lg: {
    container: 'p-5',
    icon: 'w-7 h-7',
    number: 'text-4xl',
    unit: 'text-base',
    label: 'text-base',
    best: 'text-sm',
  },
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

// Progress Ring Component
function ProgressRing({
  progress,
  size,
  strokeColor,
  bgColor,
}: {
  progress: number;
  size: number;
  strokeColor: string;
  bgColor: string;
}) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(progress, 1) * circumference);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={bgColor}
        strokeWidth="4"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        className="transition-all duration-500 ease-out"
      />
    </svg>
  );
}

export function StreakBadge({
  type,
  count,
  bestStreak,
  goal,
  size = 'md',
  showDetails = false,
  className,
}: StreakBadgeProps) {
  const config = streakConfig[type];
  const sizes = sizeConfig[size];
  const targetGoal = goal ?? config.defaultGoal;

  // Get color classes based on type
  // Dark mode: use muted/desaturated colors per Material Design guidelines
  // Light pastels (50-100) in light mode, dark muted (900-950) in dark mode
  const colorMap = {
    orange: {
      bg: 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/30',
      text: 'text-orange-600 dark:text-orange-400',
      icon: 'text-orange-500 dark:text-orange-400',
      ring: '#f97316',
      ringBg: '#fed7aa',
      ringDark: '#c2410c',
      ringBgDark: '#431407',
    },
    green: {
      bg: 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30',
      text: 'text-green-600 dark:text-green-400',
      icon: 'text-green-500 dark:text-green-400',
      ring: '#22c55e',
      ringBg: '#bbf7d0',
      ringDark: '#16a34a',
      ringBgDark: '#14532d',
    },
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30',
      text: 'text-blue-600 dark:text-blue-400',
      icon: 'text-blue-500 dark:text-blue-400',
      ring: '#3b82f6',
      ringBg: '#bfdbfe',
      ringDark: '#2563eb',
      ringBgDark: '#1e3a5f',
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30',
      text: 'text-purple-600 dark:text-purple-400',
      icon: 'text-purple-500 dark:text-purple-400',
      ring: '#a855f7',
      ringBg: '#e9d5ff',
      ringDark: '#9333ea',
      ringBgDark: '#3b0764',
    },
  } as const;

  const colorClasses = colorMap[config.color as keyof typeof colorMap] ?? colorMap.orange;

  // Detect dark mode for SVG ring colors (can't use Tailwind dark: prefix)
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    // Watch for class changes on html element
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Calculate progress
  const progress = targetGoal > 0 ? count / targetGoal : 0;
  const isComplete = progress >= 1;
  const isEmpty = count === 0;

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

  // Ring size based on component size
  const ringSize = size === 'sm' ? 40 : size === 'md' ? 48 : 56;

  return (
    <div className={cn(
      'rounded-xl transition-all relative overflow-hidden',
      sizes.container,
      colorClasses.bg,
      isMilestone && 'ring-2 ring-offset-2',
      isMilestone && config.color === 'orange' && 'ring-orange-400',
      isMilestone && config.color === 'green' && 'ring-green-400',
      isMilestone && config.color === 'blue' && 'ring-blue-400',
      isMilestone && config.color === 'purple' && 'ring-purple-400',
      'border border-white/30 dark:border-white/10 shadow-sm',
      className
    )}>
      {/* Subtle left accent border */}
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-1 rounded-l-xl',
          config.color === 'orange' && 'bg-orange-400',
          config.color === 'green' && 'bg-green-400',
          config.color === 'blue' && 'bg-blue-400',
          config.color === 'purple' && 'bg-purple-400',
        )}
      />

      <div className="flex items-center gap-3 pl-2">
        {/* Progress Ring with Icon */}
        <div className="relative flex-shrink-0">
          <ProgressRing
            progress={progress}
            size={ringSize}
            strokeColor={isDark ? colorClasses.ringDark : colorClasses.ring}
            bgColor={isDark ? colorClasses.ringBgDark : colorClasses.ringBg}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            {renderIcon()}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Number display - HERO element */}
          <div className="flex items-baseline gap-1">
            <span className={cn(
              'font-bold leading-none',
              sizes.number,
              isEmpty ? 'text-muted-foreground/70' : colorClasses.text
            )}>
              {isEmpty ? '-' : count}
            </span>
            <span className={cn('text-muted-foreground/70 font-medium', sizes.unit)}>
              {config.unit}
            </span>
          </div>

          {/* Label - secondary */}
          {showDetails && (
            <p className={cn('text-muted-foreground font-medium mt-0.5', sizes.label)}>
              {config.label}
            </p>
          )}

          {/* Empty state message */}
          {isEmpty && showDetails && (
            <p className={cn('font-medium mt-0.5', sizes.best, colorClasses.text)}>
              {config.emptyMessage}
            </p>
          )}

          {/* Best streak - always show if available and count > 0 */}
          {showDetails && bestStreak !== undefined && bestStreak > 0 && !isEmpty && (
            <p className={cn('text-muted-foreground/70 mt-0.5', sizes.best)}>
              Best: {bestStreak}
            </p>
          )}

          {/* Goal progress for non-empty states */}
          {showDetails && !isEmpty && !isComplete && targetGoal > 0 && (
            <p className={cn('text-muted-foreground/70 mt-0.5', sizes.best)}>
              {Math.round(progress * 100)}% to goal
            </p>
          )}

          {/* Completion celebration */}
          {isComplete && showDetails && (
            <p className={cn('font-medium mt-0.5', sizes.best, colorClasses.text)}>
              Goal reached!
            </p>
          )}
        </div>
      </div>

      {/* Milestone celebration */}
      {isMilestone && (
        <div className={cn(
          'mt-2 pt-2 border-t border-white/30 dark:border-white/10 text-center',
          'animate-pulse'
        )}>
          <span className={cn('font-semibold', sizes.best, colorClasses.text)}>
            {count}-{config.unit.slice(0, -1)} milestone!
          </span>
        </div>
      )}
    </div>
  );
}

export default StreakBadge;
