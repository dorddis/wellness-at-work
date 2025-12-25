/**
 * MeetingModeNotification Component
 * Shows an in-app notification when a meeting is detected
 * Gives user choice to set up meeting mode or dismiss
 */

import React, { useEffect, useRef } from 'react';

interface NotificationAction {
  label: string;
  action: string;
}

export interface MeetingModeNotificationProps {
  /** Whether the notification is visible */
  isVisible: boolean;
  /** Notification title */
  title: string;
  /** Notification message */
  message: string;
  /** App name that was detected */
  appName?: string;
  /** Available actions */
  actions?: NotificationAction[];
  /** Callback when an action is clicked */
  onAction: (action: string) => void;
  /** Callback when notification is dismissed (X button or timeout) */
  onDismiss: () => void;
  /** Auto-dismiss after this many seconds (0 = no auto-dismiss) */
  autoDismissSeconds?: number;
}

/**
 * In-app notification for meeting mode
 * Slides in from top-right corner
 */
export function MeetingModeNotification({
  isVisible,
  title,
  message,
  appName,
  actions = [],
  onAction,
  onDismiss,
  autoDismissSeconds = 30,
}: MeetingModeNotificationProps) {
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-dismiss after timeout
  useEffect(() => {
    if (isVisible && autoDismissSeconds > 0) {
      dismissTimerRef.current = setTimeout(() => {
        onDismiss();
      }, autoDismissSeconds * 1000);

      return () => {
        if (dismissTimerRef.current) {
          clearTimeout(dismissTimerRef.current);
        }
      };
    }
  }, [isVisible, autoDismissSeconds, onDismiss]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-sm overflow-hidden">
        {/* Header with icon and close button */}
        <div className="flex items-start gap-3 p-4 pb-2">
          {/* Meeting icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>

          {/* Title and message */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-0.5">{message}</p>
            {appName && (
              <p className="text-xs text-purple-600 font-medium mt-1">
                {appName}
              </p>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Dismiss"
          >
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Action buttons */}
        {actions.length > 0 && (
          <div className="flex gap-2 px-4 pb-4 pt-2">
            {actions.map((action, index) => (
              <button
                key={action.action}
                onClick={() => onAction(action.action)}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  index === 0
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MeetingModeNotification;
