/**
 * WeeklyTrendCard Component
 * Shows wellness score trend for the current week with comparison to last week
 */

import React from 'react';
import { cn } from '../lib/utils';

export interface DayData {
  /** Day label (e.g., "Mon", "Tue") */
  label: string;
  /** Wellness score (0-100) or null if no data */
  score: number | null;
  /** Blink rate for the day */
  blinkRate?: number;
  /** Whether this is today */
  isToday?: boolean;
}

export interface WeeklyTrendCardProps {
  /** Data for each day of the week */
  days: DayData[];
  /** Average score from last week for comparison */
  lastWeekAverage?: number;
  /** Additional CSS classes */
  className?: string;
}

export function WeeklyTrendCard({
  days,
  lastWeekAverage,
  className,
}: WeeklyTrendCardProps) {
  // Calculate this week's average
  const daysWithData = days.filter(d => d.score !== null);
  const thisWeekAverage = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((sum, d) => sum + (d.score || 0), 0) / daysWithData.length)
    : null;

  // Calculate trend
  const trend = thisWeekAverage !== null && lastWeekAverage !== undefined
    ? thisWeekAverage - lastWeekAverage
    : null;

  // Get bar color based on score
  const getBarColor = (score: number | null) => {
    if (score === null) return 'bg-muted';
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Get bar height (percentage of max 100)
  const getBarHeight = (score: number | null) => {
    if (score === null) return 8; // Minimum height for empty days
    return Math.max((score / 100) * 100, 8);
  };

  return (
    <div className={cn(
      'bg-card rounded-xl border border-border p-4',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">This Week</h3>
        {trend !== null && (
          <div className={cn(
            'flex items-center gap-1 text-sm font-medium',
            trend >= 0 ? 'text-green-600' : 'text-red-600'
          )}>
            {trend >= 0 ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            )}
            <span>{trend >= 0 ? '+' : ''}{trend}%</span>
          </div>
        )}
      </div>

      {/* Weekly average */}
      {thisWeekAverage !== null && (
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {thisWeekAverage}
            </span>
            <span className="text-muted-foreground/70 text-sm">avg score</span>
          </div>
          {lastWeekAverage !== undefined && (
            <p className="text-xs text-muted-foreground">
              Last week: {lastWeekAverage}
            </p>
          )}
        </div>
      )}

      {/* Bar chart */}
      <div className="flex items-end justify-between gap-2 h-24">
        {days.map((day, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            {/* Bar */}
            <div className="flex-1 w-full flex items-end justify-center">
              <div
                className={cn(
                  'w-full max-w-8 rounded-t transition-all duration-300',
                  getBarColor(day.score),
                  day.isToday && 'ring-2 ring-foreground ring-offset-1'
                )}
                style={{ height: `${getBarHeight(day.score)}%` }}
                title={day.score !== null ? `${day.score}/100` : 'No data'}
              />
            </div>
            {/* Score label */}
            <p className="text-xs font-medium text-muted-foreground mt-1">
              {day.score !== null ? day.score : '-'}
            </p>
            {/* Day label */}
            <p className={cn(
              'text-xs mt-0.5',
              day.isToday ? 'text-foreground font-semibold' : 'text-muted-foreground/70'
            )}>
              {day.label}
            </p>
          </div>
        ))}
      </div>

      {/* No data message */}
      {daysWithData.length === 0 && (
        <p className="text-center text-sm text-muted-foreground mt-2">
          Start monitoring to see your weekly trend
        </p>
      )}
    </div>
  );
}

export default WeeklyTrendCard;
