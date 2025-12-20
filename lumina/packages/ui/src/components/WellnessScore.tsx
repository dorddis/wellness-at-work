import React from 'react';
import { cn } from '../lib/utils';

export interface WellnessScoreProps {
  score: number;
  trend?: 'up' | 'down' | 'stable';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-wellness-good';
  if (score >= 50) return 'text-wellness-fair';
  return 'text-wellness-poor';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 30) return 'Needs Attention';
  return 'Poor';
}

const trendIcons: Record<string, string> = {
  up: '\u2191',     // Up arrow
  down: '\u2193',   // Down arrow
  stable: '\u2194', // Left-right arrow
};

const sizeClasses = {
  sm: { score: 'text-2xl', label: 'text-xs' },
  md: { score: 'text-4xl', label: 'text-sm' },
  lg: { score: 'text-6xl', label: 'text-base' },
};

/**
 * Wellness Score Component
 * Displays wellness score with optional trend indicator
 */
export function WellnessScore({
  score,
  trend,
  label,
  size = 'md',
  className,
}: WellnessScoreProps) {
  const scoreColor = getScoreColor(score);
  const scoreLabel = label ?? getScoreLabel(score);
  const sizes = sizeClasses[size];

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="flex items-baseline gap-1">
        <span className={cn('font-bold tabular-nums', scoreColor, sizes.score)}>
          {score}
        </span>
        <span className={cn('text-muted-foreground', sizes.label)}>/100</span>
      </div>

      <div className="flex items-center gap-1 mt-1">
        <span className={cn('font-medium', scoreColor, sizes.label)}>
          {scoreLabel}
        </span>
        {trend && (
          <span
            className={cn(
              'font-bold',
              trend === 'up' && 'text-wellness-good',
              trend === 'down' && 'text-wellness-poor',
              trend === 'stable' && 'text-muted-foreground',
              sizes.label
            )}
          >
            {trendIcons[trend]}
          </span>
        )}
      </div>
    </div>
  );
}
