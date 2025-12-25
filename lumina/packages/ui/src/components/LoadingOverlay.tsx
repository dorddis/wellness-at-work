/**
 * LoadingOverlay Component
 * Semi-transparent overlay with spinner for section-level loading
 * Use when refreshing content in-place (search, filter, pagination)
 */

import React from 'react';
import { cn } from '../lib/utils';
import { Spinner } from './Spinner';

export interface LoadingOverlayProps {
  /** Whether to show the loading overlay */
  loading: boolean;
  /** Content to wrap */
  children: React.ReactNode;
  /** Optional message to display */
  message?: string;
  /** Overlay variant */
  variant?: 'light' | 'dark' | 'blur';
  /** Spinner size */
  spinnerSize?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes for container */
  className?: string;
  /** Minimum height when loading (prevents collapse) */
  minHeight?: number | string;
}

const overlayVariants = {
  light: 'bg-card/80',
  dark: 'bg-foreground/10',
  blur: 'bg-card/60 backdrop-blur-sm',
};

export function LoadingOverlay({
  loading,
  children,
  message,
  variant = 'light',
  spinnerSize = 'md',
  className,
  minHeight,
}: LoadingOverlayProps) {
  return (
    <div
      className={cn('relative', className)}
      style={minHeight ? { minHeight } : undefined}
    >
      {children}

      {/* Overlay */}
      {loading && (
        <div
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center z-10',
            'transition-opacity duration-200',
            overlayVariants[variant]
          )}
        >
          <Spinner size={spinnerSize} />
          {message && (
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FullScreenLoader - For page-level or app-level loading
// ============================================================================

export interface FullScreenLoaderProps {
  /** Whether to show the loader */
  loading: boolean;
  /** Brand/app name to display */
  brandName?: string;
  /** Optional message */
  message?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Full-screen loader for app initialization or page transitions
 */
export function FullScreenLoader({
  loading,
  brandName = 'Lumina',
  message,
  className,
}: FullScreenLoaderProps) {
  if (!loading) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center',
        'bg-card',
        className
      )}
    >
      {/* Logo/Brand placeholder */}
      <div className="mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </div>
      </div>

      {/* Brand name */}
      <h1 className="text-xl font-semibold text-foreground mb-4">{brandName}</h1>

      {/* Spinner */}
      <Spinner size="lg" />

      {/* Message */}
      {message && (
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

export default LoadingOverlay;
