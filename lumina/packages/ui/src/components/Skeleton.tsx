/**
 * Skeleton Components
 * Content placeholder components with shimmer animation
 * Research shows skeletons are perceived as 30% faster than spinners
 */

import React from 'react';
import { cn } from '../lib/utils';

// ============================================================================
// Base Skeleton
// ============================================================================

export interface SkeletonProps {
  /** Additional CSS classes */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

/**
 * Base skeleton element with shimmer animation
 * Use className to control dimensions: "h-4 w-full", "h-8 w-32", etc.
 */
export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'skeleton rounded bg-gray-200',
        className
      )}
      style={style}
    />
  );
}

// ============================================================================
// SkeletonText - Multiple text lines
// ============================================================================

export interface SkeletonTextProps {
  /** Number of lines to display */
  lines?: number;
  /** Additional CSS classes for container */
  className?: string;
}

/**
 * Skeleton for text content with varying line widths
 * Simulates natural text flow
 */
export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  // Varying widths for natural look
  const widths = ['w-full', 'w-11/12', 'w-10/12', 'w-9/12', 'w-3/4', 'w-2/3'];

  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            // Last line is usually shorter
            i === lines - 1 ? widths[Math.floor(Math.random() * 3) + 3] : widths[i % 3]
          )}
        />
      ))}
    </div>
  );
}

// ============================================================================
// SkeletonCard - Card placeholder with header and content
// ============================================================================

export interface SkeletonCardProps {
  /** Show header area */
  hasHeader?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Skeleton for card components
 * Includes optional header and content area
 */
export function SkeletonCard({ hasHeader = true, className }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-white overflow-hidden',
        className
      )}
    >
      {hasHeader && (
        <div className="px-4 py-3 border-b border-gray-100">
          <Skeleton className="h-4 w-1/3" />
        </div>
      )}
      <div className="p-4 space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

// ============================================================================
// SkeletonChart - Chart placeholder
// ============================================================================

export interface SkeletonChartProps {
  /** Chart height in pixels */
  height?: number;
  /** Chart type hint for visual */
  type?: 'bar' | 'line' | 'area';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Skeleton for chart components
 * Shows visual hint of chart type
 */
export function SkeletonChart({
  height = 200,
  type = 'bar',
  className
}: SkeletonChartProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-white overflow-hidden',
        className
      )}
      style={{ height }}
    >
      {/* Chart header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>

      {/* Chart area with bars hint */}
      <div className="p-4 h-full flex items-end gap-2 pb-8">
        {type === 'bar' && (
          // Bar chart hint
          <>
            {[40, 65, 45, 80, 55, 70, 60].map((h, i) => (
              <Skeleton
                key={i}
                className="flex-1 rounded-t"
                style={{ height: `${h}%` }}
              />
            ))}
          </>
        )}
        {type === 'line' && (
          // Line chart hint - wavy line placeholder
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="h-1 w-full rounded-full" />
          </div>
        )}
        {type === 'area' && (
          // Area chart hint
          <Skeleton className="w-full h-3/4 rounded-t" />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SkeletonTable - Table placeholder
// ============================================================================

export interface SkeletonTableProps {
  /** Number of rows */
  rows?: number;
  /** Number of columns */
  cols?: number;
  /** Show header row */
  hasHeader?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Skeleton for data tables
 * Shows header and rows with varying column widths
 */
export function SkeletonTable({
  rows = 5,
  cols = 4,
  hasHeader = true,
  className
}: SkeletonTableProps) {
  // Column width patterns
  const colWidths = ['w-1/4', 'w-1/3', 'w-1/2', 'w-2/3', 'w-3/4', 'w-full'];

  return (
    <div className={cn('rounded-lg border border-gray-200 overflow-hidden', className)}>
      <table className="w-full">
        {hasHeader && (
          <thead className="bg-gray-50">
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-4 py-3 text-left">
                  <Skeleton className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="bg-white divide-y divide-gray-100">
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {Array.from({ length: cols }).map((_, colIdx) => (
                <td key={colIdx} className="px-4 py-3">
                  <Skeleton
                    className={cn(
                      'h-4',
                      colWidths[(rowIdx + colIdx) % colWidths.length]
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// SkeletonAvatar - Circular avatar placeholder
// ============================================================================

export interface SkeletonAvatarProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Additional CSS classes */
  className?: string;
}

const avatarSizes = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

/**
 * Skeleton for avatar/profile images
 */
export function SkeletonAvatar({ size = 'md', className }: SkeletonAvatarProps) {
  return (
    <Skeleton
      className={cn(
        'rounded-full',
        avatarSizes[size],
        className
      )}
    />
  );
}

// ============================================================================
// SkeletonStats - Stats grid placeholder (common pattern)
// ============================================================================

export interface SkeletonStatsProps {
  /** Number of stat cards */
  count?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Skeleton for stats/metrics grid
 * Common pattern in dashboards
 */
export function SkeletonStats({ count = 4, className }: SkeletonStatsProps) {
  return (
    <div className={cn('grid gap-4', `grid-cols-${Math.min(count, 4)}`, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-gray-200 bg-white p-4"
        >
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

// Default export for convenience
export default Skeleton;
