import React, { useEffect, useState } from 'react';
import { AlertToast, type AlertSeverity } from '@lumina/ui';
import { AnimatePresence } from 'motion/react';

interface AlertData {
  id: string;
  type?:
    | 'low_blink' | 'critical_blink' | 'long_session' | 'poor_posture'
    | 'break_reminder' | 'posture' | 'session_start' | 'custom'
    | 'calibration_complete' | 'break_complete'
    // New wellness alert types
    | 'too_close' | 'too_far' | 'head_tilt' | 'forward_lean'
    | 'drowsy_mild' | 'drowsy_moderate' | 'drowsy_severe' | 'frequent_yawning';
  severity: AlertSeverity;
  message: string;
  action?: string;
}

export default function OverlayApp() {
  const [alert, setAlert] = useState<AlertData | null>(null);

  // Listen for alerts from main process
  useEffect(() => {
    const unsubscribe = window.lumina?.alerts.onShow((newAlert) => {
      setAlert(newAlert);
    });

    return () => unsubscribe?.();
  }, []);

  const handleDismiss = (id: string) => {
    setAlert(null);
    window.lumina?.alerts.dismiss();
  };

  const handleSnooze = (id: string, minutes: number) => {
    setAlert(null);
    window.lumina?.alerts.snooze(id, minutes);
  };

  const handleDoubleClick = () => {
    setAlert(null);
    window.lumina?.alerts.openHub();
  };

  return (
    <div className="h-full flex items-start justify-end p-2">
      <AnimatePresence mode="wait">
        {alert && (
          <AlertToast
            key={alert.id}
            id={alert.id}
            severity={alert.severity}
            message={alert.message}
            action={alert.action}
            onDismiss={handleDismiss}
            onSnooze={handleSnooze}
            onDoubleClick={handleDoubleClick}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
