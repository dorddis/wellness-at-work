/**
 * useBreakReminder - 20-20-20 break reminder state management
 * Manages break timers, countdown, and break actions
 */

import { useState, useEffect, useCallback } from 'react';

const BREAK_REMINDER_INTERVAL = 20 * 60 * 1000; // 20 minutes
const BREAK_DURATION = 20; // 20 seconds

export interface UseBreakReminderProps {
  isDetecting: boolean;
  setDetecting: (detecting: boolean) => void;
  onBreakComplete: () => void;
}

export interface UseBreakReminderReturn {
  // Break state
  isOnBreak: boolean;
  breakTimeRemaining: number;
  // Pre-break toast state
  showPreBreakToast: boolean;
  preBreakSeconds: number;
  postponesRemaining: number;
  // Handlers
  handleTakeBreak: () => void;
  handleSkipBreak: () => void;
  handleStartBreakNow: () => void;
  handlePostponeBreak: () => void;
}

/**
 * Hook for managing 20-20-20 break reminders
 * - Checks every minute if 20 minutes have passed since last break
 * - Shows break reminder notification
 * - Manages break countdown timer
 * - Pauses detection during breaks
 */
export function useBreakReminder({
  isDetecting,
  setDetecting,
  onBreakComplete,
}: UseBreakReminderProps): UseBreakReminderReturn {
  // Break state
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakTimeRemaining, setBreakTimeRemaining] = useState(BREAK_DURATION);
  const [lastBreakTime, setLastBreakTime] = useState<number>(Date.now());

  // Pre-break toast state (30 second warning)
  const [showPreBreakToast, setShowPreBreakToast] = useState(false);
  const [preBreakSeconds, setPreBreakSeconds] = useState(30);
  const [postponesRemaining, setPostponesRemaining] = useState(2);

  // Break reminder - check every minute if 20 minutes have passed
  useEffect(() => {
    if (!isDetecting || isOnBreak) return;

    const checkBreakReminder = () => {
      const timeSinceLastBreak = Date.now() - lastBreakTime;
      if (timeSinceLastBreak >= BREAK_REMINDER_INTERVAL) {
        // Show break reminder notification
        window.lumina?.alerts.show({
          id: `break-${Date.now()}`,
          type: 'break_reminder',
          severity: 'info',
          message: "Time for a 20-20-20 break!",
          action: "Look at something 20 feet away for 20 seconds.",
        });
      }
    };

    const interval = setInterval(checkBreakReminder, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isDetecting, isOnBreak, lastBreakTime]);

  // Break countdown timer
  useEffect(() => {
    if (!isOnBreak) return;

    if (breakTimeRemaining <= 0) {
      // Break complete
      setIsOnBreak(false);
      setBreakTimeRemaining(BREAK_DURATION);
      setLastBreakTime(Date.now());
      onBreakComplete();
      // Show completion notification
      window.lumina?.alerts.show({
        id: `break-complete-${Date.now()}`,
        type: 'break_complete',
        severity: 'info',
        message: "Break complete! Great job taking care of your eyes.",
        action: "You can resume your work now.",
      });
      return;
    }

    const timer = setTimeout(() => {
      setBreakTimeRemaining(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isOnBreak, breakTimeRemaining, onBreakComplete]);

  // Handle take a break
  const handleTakeBreak = useCallback(() => {
    setIsOnBreak(true);
    setBreakTimeRemaining(BREAK_DURATION);
    // Optionally pause detection during break
    if (isDetecting) {
      setDetecting(false);
    }
  }, [isDetecting, setDetecting]);

  // Handle skip break
  const handleSkipBreak = useCallback(() => {
    setIsOnBreak(false);
    setBreakTimeRemaining(BREAK_DURATION);
    setLastBreakTime(Date.now());
    setShowPreBreakToast(false);
  }, []);

  // Handle start break now (from pre-break toast)
  const handleStartBreakNow = useCallback(() => {
    setShowPreBreakToast(false);
    setIsOnBreak(true);
    setBreakTimeRemaining(BREAK_DURATION);
    if (isDetecting) {
      setDetecting(false);
    }
  }, [isDetecting, setDetecting]);

  // Handle postpone break (from pre-break toast)
  const handlePostponeBreak = useCallback(() => {
    if (postponesRemaining > 0) {
      setPostponesRemaining(prev => prev - 1);
      setShowPreBreakToast(false);
      // Add 5 minutes to the next break
      setLastBreakTime(Date.now() - (BREAK_REMINDER_INTERVAL - 5 * 60 * 1000));
    }
  }, [postponesRemaining]);

  return {
    isOnBreak,
    breakTimeRemaining,
    showPreBreakToast,
    preBreakSeconds,
    postponesRemaining,
    handleTakeBreak,
    handleSkipBreak,
    handleStartBreakNow,
    handlePostponeBreak,
  };
}
