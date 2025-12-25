/**
 * HistorySkeleton Component
 * Skeleton loading state for the History view
 * Matches the layout: session stats + chart + 7-day history
 */

import React from 'react';

export function HistorySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Session stats cards */}
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-card rounded-lg border border-border p-4"
          >
            <div className="h-3 w-20 bg-muted rounded mb-2" />
            <div className="h-7 w-14 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="bg-card rounded-lg border border-border p-4">
        {/* Chart header */}
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-4 w-20 bg-muted rounded" />
        </div>

        {/* Chart area with bar hints */}
        <div className="h-44 flex items-end gap-2 pt-4">
          {[40, 65, 55, 80, 45, 70, 60].map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-muted rounded-t"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between mt-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="h-3 w-8 bg-secondary rounded" />
          ))}
        </div>
      </div>

      {/* 7-day history list */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/50">
          <div className="h-4 w-28 bg-muted rounded" />
        </div>

        {/* History items */}
        <div className="divide-y divide-border/50">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Date */}
                <div className="h-4 w-24 bg-muted rounded" />
                {/* Stats */}
                <div className="h-4 w-16 bg-secondary rounded" />
              </div>
              {/* Score badge */}
              <div className="h-6 w-12 bg-muted rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HistorySkeleton;
