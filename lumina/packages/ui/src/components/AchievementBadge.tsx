/**
 * AchievementBadge Component
 * Individual achievement badge display
 * "Meaningful badges (not arbitrary) increase retention 22%"
 */

import React from 'react';
import { cn } from '../lib/utils';

export type AchievementId =
  | 'first_steps'
  | 'perfect_day'
  | 'week_warrior'
  | 'blink_master'
  | 'flow_state'
  | 'wellness_champion'
  | 'early_bird'
  | 'night_owl'
  | 'posture_pro';

export interface Achievement {
  id: AchievementId;
  name: string;
  description: string;
  requirement: string;
  icon: string;
  color: string;
}

export interface AchievementBadgeProps {
  /** Achievement definition */
  achievement: Achievement;
  /** Whether unlocked */
  isUnlocked: boolean;
  /** When it was unlocked */
  unlockedAt?: Date;
  /** Progress toward achievement (0-100) */
  progress?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show progress bar */
  showProgress?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// Achievement definitions
export const ACHIEVEMENTS: Record<AchievementId, Achievement> = {
  first_steps: {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Complete your first monitoring session',
    requirement: '1 session completed',
    icon: 'footprints',
    color: 'gray',
  },
  perfect_day: {
    id: 'perfect_day',
    name: 'Perfect Day',
    description: 'Take all scheduled breaks in a day',
    requirement: '4/4 breaks taken',
    icon: 'star',
    color: 'yellow',
  },
  week_warrior: {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Use Lumina for 7 consecutive days',
    requirement: '7-day streak',
    icon: 'shield',
    color: 'blue',
  },
  blink_master: {
    id: 'blink_master',
    name: 'Blink Master',
    description: 'Maintain healthy blink rate for 1 hour',
    requirement: '60 minutes at 15+ blinks/min',
    icon: 'eye',
    color: 'green',
  },
  flow_state: {
    id: 'flow_state',
    name: 'Flow State',
    description: 'Complete a 2-hour focused session',
    requirement: '120 minutes uninterrupted',
    icon: 'lightning',
    color: 'purple',
  },
  wellness_champion: {
    id: 'wellness_champion',
    name: 'Wellness Champion',
    description: 'Achieve a 30-day usage streak',
    requirement: '30 consecutive days',
    icon: 'trophy',
    color: 'orange',
  },
  early_bird: {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Start monitoring before 8 AM',
    requirement: 'Session started before 8:00 AM',
    icon: 'sun',
    color: 'amber',
  },
  night_owl: {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Monitor a late-night session',
    requirement: 'Session after 10 PM',
    icon: 'moon',
    color: 'indigo',
  },
  posture_pro: {
    id: 'posture_pro',
    name: 'Posture Pro',
    description: 'Maintain good posture for 4 hours',
    requirement: '240 minutes of good posture',
    icon: 'spine',
    color: 'teal',
  },
};

const sizeConfig = {
  sm: { container: 'w-16 h-16', icon: 'text-xl', name: 'text-xs' },
  md: { container: 'w-20 h-20', icon: 'text-2xl', name: 'text-sm' },
  lg: { container: 'w-24 h-24', icon: 'text-3xl', name: 'text-base' },
};

// Icon components
const icons: Record<string, React.FC<{ className?: string }>> = {
  footprints: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 14q-.425 0-.712-.288T3 13q0-.425.288-.712T4 12q.425 0 .713.288T5 13q0 .425-.287.713T4 14m3-2q-.425 0-.712-.288T6 11q0-.425.288-.712T7 10q.425 0 .713.288T8 11q0 .425-.287.713T7 12m3-2q-.425 0-.712-.288T9 9q0-.425.288-.712T10 8q.425 0 .713.288T11 9q0 .425-.287.713T10 10m4 0q-.425 0-.712-.288T13 9q0-.425.288-.712T14 8q.425 0 .713.288T15 9q0 .425-.287.713T14 10m3 2q-.425 0-.712-.288T16 11q0-.425.288-.712T17 10q.425 0 .713.288T18 11q0 .425-.287.713T17 12m3 2q-.425 0-.712-.288T19 13q0-.425.288-.712T20 12q.425 0 .713.288T21 13q0 .425-.287.713T20 14"/>
    </svg>
  ),
  star: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
  shield: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
    </svg>
  ),
  eye: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
    </svg>
  ),
  lightning: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
    </svg>
  ),
  trophy: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
    </svg>
  ),
  sun: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z"/>
    </svg>
  ),
  moon: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 2c-1.05 0-2.05.16-3 .46 4.06 1.27 7 5.06 7 9.54 0 4.48-2.94 8.27-7 9.54.95.3 1.95.46 3 .46 5.52 0 10-4.48 10-10S14.52 2 9 2z"/>
    </svg>
  ),
  spine: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <ellipse cx="12" cy="4" rx="3" ry="2"/>
      <ellipse cx="12" cy="9" rx="3.5" ry="2"/>
      <ellipse cx="12" cy="14" rx="3.5" ry="2"/>
      <ellipse cx="12" cy="19" rx="3" ry="2"/>
    </svg>
  ),
};

export function AchievementBadge({
  achievement,
  isUnlocked,
  unlockedAt,
  progress = 0,
  size = 'md',
  showProgress = false,
  onClick,
  className,
}: AchievementBadgeProps) {
  const sizes = sizeConfig[size];
  const IconComponent = icons[achievement.icon] || icons.star;

  // Color mapping for unlocked state
  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    amber: 'bg-amber-100 text-amber-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    teal: 'bg-teal-100 text-teal-600',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      title={isUnlocked
        ? `${achievement.name}: ${achievement.description}`
        : `${achievement.name}: ${achievement.requirement}`
      }
    >
      {/* Badge circle */}
      <div
        className={cn(
          'rounded-full flex items-center justify-center transition-all',
          sizes.container,
          isUnlocked
            ? colorClasses[achievement.color]
            : 'bg-gray-100 text-gray-300'
        )}
      >
        <IconComponent className={cn(sizes.icon, 'w-1/2 h-1/2')} />
      </div>

      {/* Name */}
      <span className={cn(
        'font-medium text-center',
        sizes.name,
        isUnlocked ? 'text-gray-900' : 'text-gray-400'
      )}>
        {achievement.name}
      </span>

      {/* Progress bar for locked achievements */}
      {showProgress && !isUnlocked && progress > 0 && (
        <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-400 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Unlock date */}
      {isUnlocked && unlockedAt && size === 'lg' && (
        <span className="text-xs text-gray-500">
          {unlockedAt.toLocaleDateString()}
        </span>
      )}
    </div>
  );
}

export default AchievementBadge;
