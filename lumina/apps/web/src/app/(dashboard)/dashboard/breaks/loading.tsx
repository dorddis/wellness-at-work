/**
 * Breaks page loading skeleton
 * Matches layout: header + timer card + weekly chart + break history
 */

import { Skeleton, SkeletonChart } from '@lumina/ui';

export default function BreaksLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Main layout: Timer + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timer card - large */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex flex-col items-center">
            {/* Timer circle */}
            <Skeleton className="w-48 h-48 rounded-full mb-6" />
            {/* Timer controls */}
            <div className="flex gap-3">
              <Skeleton className="h-10 w-24 rounded-lg" />
              <Skeleton className="h-10 w-24 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Stats sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <Skeleton className="h-4 w-28 mb-2" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-12" />
          </div>
        </div>
      </div>

      {/* Weekly compliance chart */}
      <SkeletonChart height={250} type="bar" />

      {/* Break history list */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="divide-y divide-gray-100">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
