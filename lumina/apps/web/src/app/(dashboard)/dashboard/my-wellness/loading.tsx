/**
 * My Wellness page loading skeleton
 * Matches layout: header + streaks row + baseline card + chart + history
 */

import { Skeleton, SkeletonCard, SkeletonChart } from '@lumina/ui';

export default function MyWellnessLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Streaks row - 4 streak badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-8 w-12 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Two-column layout: Baseline + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Baseline card */}
        <div className="lg:col-span-2">
          <SkeletonCard className="h-48" />
        </div>

        {/* Actions card */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <Skeleton className="h-5 w-24 mb-4" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
      </div>

      {/* 30-day chart */}
      <SkeletonChart height={300} type="area" />

      {/* History table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="divide-y divide-gray-100">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
