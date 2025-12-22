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
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="h-3 w-20 bg-gray-200 rounded mb-2" />
            <div className="h-7 w-14 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {/* Chart header */}
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="h-4 w-20 bg-gray-200 rounded" />
        </div>

        {/* Chart area with bar hints */}
        <div className="h-44 flex items-end gap-2 pt-4">
          {[40, 65, 55, 80, 45, 70, 60].map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-gray-200 rounded-t"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between mt-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="h-3 w-8 bg-gray-100 rounded" />
          ))}
        </div>
      </div>

      {/* 7-day history list */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="h-4 w-28 bg-gray-200 rounded" />
        </div>

        {/* History items */}
        <div className="divide-y divide-gray-100">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Date */}
                <div className="h-4 w-24 bg-gray-200 rounded" />
                {/* Stats */}
                <div className="h-4 w-16 bg-gray-100 rounded" />
              </div>
              {/* Score badge */}
              <div className="h-6 w-12 bg-gray-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HistorySkeleton;
