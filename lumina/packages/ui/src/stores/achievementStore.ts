/**
 * Achievement Store
 * Tracks user achievements/badges for gamification
 * "Meaningful badges (not arbitrary) increase retention 22%"
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AchievementId =
  | 'first_steps'
  | 'perfect_day'
  | 'week_warrior'
  | 'blink_master'
  | 'flow_state'
  | 'wellness_champion'
  | 'early_bird'
  | 'night_owl'
  | 'posture_pro';

export interface UnlockedAchievement {
  id: AchievementId;
  unlockedAt: number; // timestamp
  progress: number; // 0-100
}

export interface AchievementProgress {
  /** Number of sessions completed */
  sessionsCompleted: number;
  /** Days with all breaks taken */
  perfectDays: number;
  /** Consecutive days of use */
  consecutiveDays: number;
  /** Minutes of healthy blink rate */
  healthyBlinkMinutes: number;
  /** Longest uninterrupted session (minutes) */
  longestSession: number;
  /** Minutes of good posture */
  goodPostureMinutes: number;
  /** Has started session before 8 AM */
  hasEarlySession: boolean;
  /** Has started session after 10 PM */
  hasLateSession: boolean;
}

export interface AchievementState {
  // Unlocked achievements
  unlocked: Record<AchievementId, UnlockedAchievement | null>;

  // Progress toward achievements
  progress: AchievementProgress;

  // Recently unlocked (for notifications)
  recentlyUnlocked: AchievementId[];

  // Actions
  checkAndUnlock: () => AchievementId[];
  updateProgress: (updates: Partial<AchievementProgress>) => void;
  incrementProgress: (key: keyof AchievementProgress, amount?: number) => void;
  isUnlocked: (id: AchievementId) => boolean;
  getProgress: (id: AchievementId) => number;
  clearRecentlyUnlocked: () => void;
  reset: () => void;
}

// Achievement requirements
const REQUIREMENTS: Record<AchievementId, { check: (p: AchievementProgress) => boolean; getProgress: (p: AchievementProgress) => number }> = {
  first_steps: {
    check: (p) => p.sessionsCompleted >= 1,
    getProgress: (p) => Math.min((p.sessionsCompleted / 1) * 100, 100),
  },
  perfect_day: {
    check: (p) => p.perfectDays >= 1,
    getProgress: (p) => Math.min((p.perfectDays / 1) * 100, 100),
  },
  week_warrior: {
    check: (p) => p.consecutiveDays >= 7,
    getProgress: (p) => Math.min((p.consecutiveDays / 7) * 100, 100),
  },
  blink_master: {
    check: (p) => p.healthyBlinkMinutes >= 60,
    getProgress: (p) => Math.min((p.healthyBlinkMinutes / 60) * 100, 100),
  },
  flow_state: {
    check: (p) => p.longestSession >= 120,
    getProgress: (p) => Math.min((p.longestSession / 120) * 100, 100),
  },
  wellness_champion: {
    check: (p) => p.consecutiveDays >= 30,
    getProgress: (p) => Math.min((p.consecutiveDays / 30) * 100, 100),
  },
  early_bird: {
    check: (p) => p.hasEarlySession,
    getProgress: (p) => p.hasEarlySession ? 100 : 0,
  },
  night_owl: {
    check: (p) => p.hasLateSession,
    getProgress: (p) => p.hasLateSession ? 100 : 0,
  },
  posture_pro: {
    check: (p) => p.goodPostureMinutes >= 240,
    getProgress: (p) => Math.min((p.goodPostureMinutes / 240) * 100, 100),
  },
};

const ALL_ACHIEVEMENT_IDS: AchievementId[] = [
  'first_steps',
  'perfect_day',
  'week_warrior',
  'blink_master',
  'flow_state',
  'wellness_champion',
  'early_bird',
  'night_owl',
  'posture_pro',
];

const initialUnlocked: Record<AchievementId, UnlockedAchievement | null> = {
  first_steps: null,
  perfect_day: null,
  week_warrior: null,
  blink_master: null,
  flow_state: null,
  wellness_champion: null,
  early_bird: null,
  night_owl: null,
  posture_pro: null,
};

const initialProgress: AchievementProgress = {
  sessionsCompleted: 0,
  perfectDays: 0,
  consecutiveDays: 0,
  healthyBlinkMinutes: 0,
  longestSession: 0,
  goodPostureMinutes: 0,
  hasEarlySession: false,
  hasLateSession: false,
};

const initialState = {
  unlocked: initialUnlocked,
  progress: initialProgress,
  recentlyUnlocked: [] as AchievementId[],
};

export const useAchievementStore = create<AchievementState>()(
  persist(
    (set, get) => ({
      ...initialState,

      checkAndUnlock: () => {
        const state = get();
        const newlyUnlocked: AchievementId[] = [];

        for (const id of ALL_ACHIEVEMENT_IDS) {
          // Skip already unlocked
          if (state.unlocked[id]) continue;

          // Check if requirement is met
          const requirement = REQUIREMENTS[id];
          if (requirement.check(state.progress)) {
            newlyUnlocked.push(id);
          }
        }

        if (newlyUnlocked.length > 0) {
          const now = Date.now();
          set((state) => ({
            unlocked: {
              ...state.unlocked,
              ...Object.fromEntries(
                newlyUnlocked.map((id) => [
                  id,
                  { id, unlockedAt: now, progress: 100 },
                ])
              ),
            },
            recentlyUnlocked: [...state.recentlyUnlocked, ...newlyUnlocked],
          }));
        }

        return newlyUnlocked;
      },

      updateProgress: (updates) => {
        set((state) => ({
          progress: {
            ...state.progress,
            ...updates,
          },
        }));
        // Check for new achievements
        get().checkAndUnlock();
      },

      incrementProgress: (key, amount = 1) => {
        set((state) => {
          const current = state.progress[key];
          if (typeof current === 'number') {
            return {
              progress: {
                ...state.progress,
                [key]: current + amount,
              },
            };
          }
          return state;
        });
        // Check for new achievements
        get().checkAndUnlock();
      },

      isUnlocked: (id: AchievementId) => {
        return get().unlocked[id] !== null;
      },

      getProgress: (id: AchievementId) => {
        const state = get();
        if (state.unlocked[id]) return 100;
        return REQUIREMENTS[id].getProgress(state.progress);
      },

      clearRecentlyUnlocked: () => {
        set({ recentlyUnlocked: [] });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'lumina-achievements',
      version: 1,
    }
  )
);
