/**
 * Streak Store
 * Tracks user streaks for gamification
 * "Streaks create psychological investment - users don't want to break the chain"
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type StreakType = 'daily_use' | 'healthy_blink' | 'break_compliance' | 'good_posture';

export interface Streak {
  type: StreakType;
  currentCount: number;
  longestCount: number;
  lastUpdated: number; // timestamp
  brokenAt: number | null; // timestamp when streak was broken
}

export interface StreakState {
  // Streaks data
  streaks: Record<StreakType, Streak>;

  // Today's progress (resets daily)
  todayProgress: {
    breaksTaken: number;
    breaksScheduled: number;
    healthyBlinkMinutes: number;
    goodPostureMinutes: number;
    lastResetDate: string; // YYYY-MM-DD format
  };

  // Actions
  incrementStreak: (type: StreakType) => void;
  breakStreak: (type: StreakType) => void;
  updateTodayProgress: (updates: Partial<StreakState['todayProgress']>) => void;
  checkAndResetDaily: () => void;
  getStreak: (type: StreakType) => Streak;
  reset: () => void;
}

const createInitialStreak = (type: StreakType): Streak => ({
  type,
  currentCount: 0,
  longestCount: 0,
  lastUpdated: Date.now(),
  brokenAt: null,
});

const getTodayDate = () => new Date().toISOString().split('T')[0];

// Demo mode: Read from environment variable (set in .env file)
// Falls back to false if not set
const DEMO_MODE = typeof import.meta !== 'undefined'
  ? import.meta.env?.VITE_DEMO_MODE === 'true'
  : false;

const initialState = DEMO_MODE ? {
  streaks: {
    daily_use: {
      type: 'daily_use' as StreakType,
      currentCount: 5,
      longestCount: 12,
      lastUpdated: Date.now(),
      brokenAt: null,
    },
    healthy_blink: {
      type: 'healthy_blink' as StreakType,
      currentCount: 3,
      longestCount: 8,
      lastUpdated: Date.now(),
      brokenAt: null,
    },
    break_compliance: {
      type: 'break_compliance' as StreakType,
      currentCount: 2,
      longestCount: 5,
      lastUpdated: Date.now(),
      brokenAt: null,
    },
    good_posture: {
      type: 'good_posture' as StreakType,
      currentCount: 45,
      longestCount: 90,
      lastUpdated: Date.now(),
      brokenAt: null,
    },
  },
  todayProgress: {
    breaksTaken: 2,
    breaksScheduled: 4,
    healthyBlinkMinutes: 35,
    goodPostureMinutes: 45,
    lastResetDate: getTodayDate(),
  },
} : {
  streaks: {
    daily_use: createInitialStreak('daily_use'),
    healthy_blink: createInitialStreak('healthy_blink'),
    break_compliance: createInitialStreak('break_compliance'),
    good_posture: createInitialStreak('good_posture'),
  },
  todayProgress: {
    breaksTaken: 0,
    breaksScheduled: 4,
    healthyBlinkMinutes: 0,
    goodPostureMinutes: 0,
    lastResetDate: getTodayDate(),
  },
};

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
      ...initialState,

      incrementStreak: (type: StreakType) => {
        set((state) => {
          const current = state.streaks[type];
          const newCount = current.currentCount + 1;
          return {
            streaks: {
              ...state.streaks,
              [type]: {
                ...current,
                currentCount: newCount,
                longestCount: Math.max(current.longestCount, newCount),
                lastUpdated: Date.now(),
                brokenAt: null,
              },
            },
          };
        });
      },

      breakStreak: (type: StreakType) => {
        set((state) => ({
          streaks: {
            ...state.streaks,
            [type]: {
              ...state.streaks[type],
              currentCount: 0,
              brokenAt: Date.now(),
            },
          },
        }));
      },

      updateTodayProgress: (updates) => {
        set((state) => ({
          todayProgress: {
            ...state.todayProgress,
            ...updates,
          },
        }));
      },

      checkAndResetDaily: () => {
        const today = getTodayDate();
        const state = get();

        if (state.todayProgress.lastResetDate !== today) {
          // New day - check if daily streak should continue
          const yesterdayProgress = state.todayProgress;

          // Check break compliance streak
          if (yesterdayProgress.breaksTaken >= yesterdayProgress.breaksScheduled) {
            // Completed all breaks yesterday - increment streak
            get().incrementStreak('break_compliance');
          } else if (yesterdayProgress.breaksTaken > 0) {
            // Took some breaks but not all - break the streak
            get().breakStreak('break_compliance');
          }

          // Check healthy blink streak (if monitored for at least 30 min)
          if (yesterdayProgress.healthyBlinkMinutes >= 30) {
            get().incrementStreak('healthy_blink');
          }

          // Check posture streak (if good posture for at least 30 min)
          if (yesterdayProgress.goodPostureMinutes >= 30) {
            get().incrementStreak('good_posture');
          }

          // Reset today's progress
          set({
            todayProgress: {
              breaksTaken: 0,
              breaksScheduled: 4,
              healthyBlinkMinutes: 0,
              goodPostureMinutes: 0,
              lastResetDate: today,
            },
          });
        }
      },

      getStreak: (type: StreakType) => {
        return get().streaks[type];
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'lumina-streaks',
      version: 1,
    }
  )
);
