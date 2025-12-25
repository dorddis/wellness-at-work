/**
 * LoadingButton Component
 * Button that shows spinner when loading and disables interaction
 */

import React from 'react';
import { cn } from '../lib/utils';
import { Spinner } from './Spinner';

export interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Whether the button is in loading state */
  loading?: boolean;
  /** Text to show while loading (defaults to children) */
  loadingText?: string;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Icon to show before text */
  icon?: React.ReactNode;
}

const variantClasses = {
  // In dark mode: bg-foreground is light, so text needs to be dark (text-background)
  primary: 'bg-neutral-900 dark:bg-neutral-200 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-300 disabled:bg-muted-foreground/50',
  secondary: 'bg-secondary text-foreground hover:bg-muted disabled:bg-secondary disabled:text-muted-foreground/70',
  outline: 'border border-border text-foreground/80 hover:bg-muted/50 disabled:border-border disabled:text-muted-foreground/70',
  ghost: 'text-foreground/80 hover:bg-secondary disabled:text-muted-foreground/70',
  danger: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 disabled:bg-red-400 dark:disabled:bg-red-900',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

const spinnerSizes = {
  sm: 'sm' as const,
  md: 'sm' as const,
  lg: 'md' as const,
};

export function LoadingButton({
  loading = false,
  loadingText,
  variant = 'primary',
  size = 'md',
  icon,
  children,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
        'transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2 dark:focus:ring-offset-background',
        'disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {loading ? (
        <>
          <Spinner size={spinnerSizes[size]} className={variant === 'primary' || variant === 'danger' ? 'border-white/30 border-t-white' : ''} />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}

export default LoadingButton;
