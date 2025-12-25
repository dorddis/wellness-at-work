import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertToastProps {
  id: string;
  severity: AlertSeverity;
  message: string;
  action?: string;
  /** Optional primary action button text (replaces Snooze when provided) */
  actionButtonText?: string;
  /** Callback when action button is clicked */
  onActionClick?: (id: string) => void;
  onDismiss: (id: string) => void;
  onSnooze: (id: string, minutes: number) => void;
  onDoubleClick?: () => void;
  className?: string;
}

const severityStyles: Record<AlertSeverity, string> = {
  info: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-100',
  warning: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-100',
  critical: 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-900 text-red-900 dark:text-red-100',
};

const severityIcons: Record<AlertSeverity, string> = {
  info: 'i',
  warning: '!',
  critical: '!!',
};

/**
 * Alert Toast Component
 * Non-intrusive notification with dismiss and snooze options
 */
export function AlertToast({
  id,
  severity,
  message,
  action,
  actionButtonText,
  onActionClick,
  onDismiss,
  onSnooze,
  onDoubleClick,
  className,
}: AlertToastProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onDoubleClick={onDoubleClick}
      className={cn(
        'p-4 rounded-lg border shadow-lg max-w-sm cursor-pointer',
        severityStyles[severity],
        className
      )}
      title="Double-click to open Lumina"
    >
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-current/10 flex items-center justify-center text-xs font-bold">
          {severityIcons[severity]}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{message}</p>
          {action && (
            <p className="mt-1 text-xs opacity-80">{action}</p>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-3 pt-3 border-t border-current/10">
        <button
          onClick={() => onDismiss(id)}
          className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md bg-background/50 hover:bg-background/80 transition-colors"
        >
          Dismiss
        </button>
        {actionButtonText && onActionClick ? (
          <button
            onClick={() => onActionClick(id)}
            className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            {actionButtonText}
          </button>
        ) : (
          <button
            onClick={() => onSnooze(id, 10)}
            className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md bg-current/10 hover:bg-current/20 transition-colors"
          >
            Snooze 10 min
          </button>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Alert Toast Container
 * Manages multiple toasts with animations
 */
export interface AlertToastContainerProps {
  alerts: Array<{
    id: string;
    severity: AlertSeverity;
    message: string;
    action?: string;
  }>;
  onDismiss: (id: string) => void;
  onSnooze: (id: string, minutes: number) => void;
  className?: string;
}

export function AlertToastContainer({
  alerts,
  onDismiss,
  onSnooze,
  className,
}: AlertToastContainerProps) {
  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 flex flex-col gap-2',
        className
      )}
    >
      <AnimatePresence mode="popLayout">
        {alerts.map((alert) => (
          <AlertToast
            key={alert.id}
            {...alert}
            onDismiss={onDismiss}
            onSnooze={onSnooze}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
