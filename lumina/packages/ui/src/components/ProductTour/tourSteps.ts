/**
 * Tour Step Definitions
 *
 * Based on customer retention research:
 * - 46% of wellness apps are abandoned
 * - Gamification drives 22% better retention
 * - Alert fatigue is #1 killer
 *
 * 9 steps, ~90 seconds total
 */

export type ViewType = 'dashboard' | 'monitor' | 'meetingMode' | 'history' | 'settings';

/** Type-safe step identifiers */
export enum LuminaTour {
  WELLNESS_SCORE = 'wellness-score',
  QUICK_START = 'quick-start',
  STREAKS = 'streaks',
  ACHIEVEMENTS = 'achievements',
  BREAK_TIMER = 'break-timer',
  LIVE_MONITOR_NAV = 'live-monitor-nav',
  LIVE_MONITOR_PREVIEW = 'live-monitor-preview',
  MEETING_MODE_NAV = 'meeting-mode-nav',
  MEETING_CALIBRATION = 'meeting-calibration',
}

/** Step order - determines tour sequence */
export const TOUR_STEP_ORDER: LuminaTour[] = [
  LuminaTour.WELLNESS_SCORE,
  LuminaTour.QUICK_START,
  LuminaTour.STREAKS,
  LuminaTour.ACHIEVEMENTS,
  LuminaTour.BREAK_TIMER,
  LuminaTour.LIVE_MONITOR_NAV,
  LuminaTour.LIVE_MONITOR_PREVIEW,
  LuminaTour.MEETING_MODE_NAV,
  LuminaTour.MEETING_CALIBRATION,
];

export interface TourStepConfig {
  id: LuminaTour;
  title: string;
  description: string;
  view: ViewType;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/** Step content and metadata */
export const TOUR_STEPS: Record<LuminaTour, TourStepConfig> = {
  [LuminaTour.WELLNESS_SCORE]: {
    id: LuminaTour.WELLNESS_SCORE,
    title: 'Your Wellness Score',
    description:
      'This is your real-time eye health score. It updates live as you work. Aim for 70+ to keep your eyes healthy!',
    view: 'dashboard',
    position: 'right',
  },
  [LuminaTour.QUICK_START]: {
    id: LuminaTour.QUICK_START,
    title: 'Quick Start Monitoring',
    description:
      'Start or pause eye tracking with one click. When active, Lumina uses your camera to detect blinks and monitor your eye health.',
    view: 'dashboard',
    position: 'left',
  },
  [LuminaTour.STREAKS]: {
    id: LuminaTour.STREAKS,
    title: 'Build Your Streaks',
    description:
      'Track 4 types of streaks: daily use, breaks taken, healthy blinks, and good posture. Keep the chain going!',
    view: 'dashboard',
    position: 'left',
  },
  [LuminaTour.ACHIEVEMENTS]: {
    id: LuminaTour.ACHIEVEMENTS,
    title: 'Unlock Achievements',
    description:
      'Earn meaningful badges as you build healthy habits. Start with First Steps and work your way up!',
    view: 'dashboard',
    position: 'top',
  },
  [LuminaTour.BREAK_TIMER]: {
    id: LuminaTour.BREAK_TIMER,
    title: 'Smart Break Reminders',
    description:
      "We gently remind you to rest your eyes. You can always postpone or customize the timing in Settings.",
    view: 'dashboard',
    position: 'bottom',
  },
  [LuminaTour.LIVE_MONITOR_NAV]: {
    id: LuminaTour.LIVE_MONITOR_NAV,
    title: 'Live Monitor',
    description:
      'See real-time eye tracking in action. The Live Monitor shows your camera feed, blink detection, and detailed metrics.',
    view: 'dashboard',
    position: 'right',
  },
  [LuminaTour.LIVE_MONITOR_PREVIEW]: {
    id: LuminaTour.LIVE_MONITOR_PREVIEW,
    title: 'Real-Time Tracking',
    description:
      'Watch your blinks being detected in real-time. The camera preview shows face detection status and eye aspect ratio visualization.',
    view: 'monitor',
    position: 'left',
  },
  [LuminaTour.MEETING_MODE_NAV]: {
    id: LuminaTour.MEETING_MODE_NAV,
    title: 'Works During Meetings',
    description:
      'Unlike other apps, Lumina tracks your eye health even during Zoom, Teams, and Meet calls. Let me show you how.',
    view: 'dashboard',
    position: 'right',
  },
  [LuminaTour.MEETING_CALIBRATION]: {
    id: LuminaTour.MEETING_CALIBRATION,
    title: 'One-Time Setup',
    description:
      'When you join a video call, draw a box around your self-view preview. Lumina will capture that region to track your blinks during meetings.',
    view: 'meetingMode',
    position: 'bottom',
  },
};
