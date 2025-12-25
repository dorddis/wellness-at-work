import React from 'react';
import { cn } from '../lib/utils';

export interface StatusIndicatorProps {
  blinkRate: number;
  wellnessScore: number;
  isCompact?: boolean;
  className?: string;
}

type WellnessStatus = 'good' | 'fair' | 'poor';

function getStatus(score: number): WellnessStatus {
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}

const statusColors: Record<WellnessStatus, string> = {
  good: 'bg-wellness-good',
  fair: 'bg-wellness-fair',
  poor: 'bg-wellness-poor',
};

const statusLabels: Record<WellnessStatus, string> = {
  good: 'Good',
  fair: 'Fair',
  poor: 'Needs Attention',
};

/**
 * Status Indicator Component
 * Shows current blink rate and wellness score
 * Has compact mode for floating status window
 */
export function StatusIndicator({
  blinkRate,
  wellnessScore,
  isCompact = false,
  className,
}: StatusIndicatorProps) {
  const status = getStatus(wellnessScore);

  if (isCompact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 bg-card/95 rounded-full shadow-lg backdrop-blur-sm',
          'border border-border/50',
          className
        )}
      >
        <div className={cn('w-2 h-2 rounded-full', statusColors[status])} />
        <span className="text-sm font-mono text-foreground">
          {blinkRate.toFixed(0)}/min
        </span>
        <span className="text-xs text-muted-foreground">|</span>
        <span className="text-sm font-medium text-foreground">
          {wellnessScore}/100
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-4 bg-card rounded-lg border border-border shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Wellness Status
        </h3>
        <div className="flex items-center gap-1.5">
          <div className={cn('w-2 h-2 rounded-full', statusColors[status])} />
          <span className="text-xs font-medium text-foreground">
            {statusLabels[status]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-semibold text-foreground">
            {blinkRate.toFixed(0)}
          </p>
          <p className="text-xs text-muted-foreground">blinks/min</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-foreground">
            {wellnessScore}
          </p>
          <p className="text-xs text-muted-foreground">wellness score</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            statusColors[status]
          )}
          style={{ width: `${wellnessScore}%` }}
        />
      </div>
    </div>
  );
}
