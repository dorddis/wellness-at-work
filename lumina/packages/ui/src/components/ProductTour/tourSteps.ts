import type { TourStep } from './types';

/**
 * Product Tour Steps
 *
 * 6 steps (~75 seconds) designed based on customer retention research:
 * - Alert fatigue is #1 killer of wellness apps
 * - Gamification (streaks/achievements) drives 22% better retention
 * - Meeting mode is the B2B differentiator
 */
export const TOUR_STEPS: TourStep[] = [
  // Step 1: Wellness Score - Live feedback motivates habit formation
  {
    id: 'wellness-score',
    target: '[data-tour="wellness-score"]',
    title: 'Your Wellness Score',
    description: 'This is your real-time eye health score. It updates live as you work. Aim for 70+ to keep your eyes healthy!',
    view: 'dashboard',
    position: 'right',
    spotlightPadding: 12,
  },

  // Step 2: Streaks - Psychological investment (#1 retention driver)
  {
    id: 'streaks-panel',
    target: '[data-tour="streaks-panel"]',
    title: 'Build Your Streaks',
    description: 'Track 4 types of streaks: daily use, breaks taken, healthy blinks, and good posture. Keep the chain going!',
    view: 'dashboard',
    position: 'left',
    spotlightPadding: 12,
  },

  // Step 3: Achievements - Milestone motivation (22% better retention)
  {
    id: 'achievements',
    target: '[data-tour="achievements"]',
    title: 'Unlock Achievements',
    description: 'Earn meaningful badges as you build healthy habits. Start with First Steps and work your way up!',
    view: 'dashboard',
    position: 'top',
    spotlightPadding: 8,
  },

  // Step 4: Break Timer - Address alert fatigue concern upfront
  {
    id: 'break-timer',
    target: '[data-tour="break-timer"]',
    title: 'Smart Break Reminders',
    description: 'We gently remind you to rest your eyes. You can always postpone or customize the timing in Settings.',
    view: 'dashboard',
    position: 'bottom',
    spotlightPadding: 8,
  },

  // Step 5: Meeting Mode Nav - Tease B2B differentiator
  {
    id: 'meeting-mode-nav',
    target: '[data-tour="meeting-mode-nav"]',
    title: 'Works During Meetings',
    description: 'Unlike other apps, Lumina tracks your eye health even during Zoom, Teams, and Meet calls. Let me show you how.',
    view: 'dashboard',
    position: 'right',
    spotlightPadding: 4,
  },

  // Step 6: Meeting Mode Calibration - Show screen capture setup
  {
    id: 'meeting-calibration',
    target: '[data-tour="meeting-calibration"]',
    title: 'One-Time Setup',
    description: 'When you join a video call, draw a box around your self-view preview. Lumina will capture that region to track your blinks during meetings.',
    view: 'meetingMode',
    position: 'bottom',
    spotlightPadding: 16,
  },
];

export default TOUR_STEPS;
