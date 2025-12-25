import React, { useState, useEffect } from 'react';
import {
  useStreakStore,
  useAchievementStore,
  PreBreakToast,
  WeeklyTrendCard,
  PostureStatusCard,
  StreakBadge,
  AchievementBadge,
  ACHIEVEMENTS,
  type DayData,
} from '@lumina/ui';
import type { Baseline, PostureResult, YawnResult, DrowsinessResult } from '@lumina/core';
import { Icons } from '../components';
import { DatabaseService } from '../services';

export interface DashboardViewProps {
  wellnessScore: number;
  blinkRate: number;
  blinkCount: number;
  sessionDuration: number;
  isDetecting: boolean;
  faceDetected: boolean;
  onToggleDetection: () => void;
  status: { label: string; color: string; bg: string };
  todayStats: { totalBlinks: number; avgBlinkRate: number; sessionMinutes: number; breaksCount: number };
  formatDuration: (s: number) => string;
  isOnBreak: boolean;
  breakTimeRemaining: number;
  onTakeBreak: () => void;
  onSkipBreak: () => void;
  isCalibrating: boolean;
  calibrationProgress: number;
  userBaseline: Baseline | null;
  showPreBreakToast: boolean;
  preBreakSeconds: number;
  onStartBreakNow: () => void;
  onPostponeBreak: () => void;
  postponesRemaining: number;
  currentPosture: PostureResult | null;
  currentYawn: YawnResult | null;
  currentDrowsiness: DrowsinessResult | null;
  userName: string;
}

/**
 * Dashboard View - main overview with wellness score, streaks, and live metrics
 */
export function DashboardView({
  wellnessScore,
  blinkRate,
  blinkCount,
  sessionDuration,
  isDetecting,
  faceDetected,
  onToggleDetection,
  status,
  todayStats,
  formatDuration,
  isOnBreak,
  breakTimeRemaining,
  onTakeBreak,
  onSkipBreak,
  isCalibrating,
  calibrationProgress,
  userBaseline,
  showPreBreakToast,
  preBreakSeconds,
  onStartBreakNow,
  onPostponeBreak,
  postponesRemaining,
  currentPosture,
  currentYawn,
  currentDrowsiness,
  userName,
}: DashboardViewProps) {
  // Access gamification stores
  const { streaks, todayProgress } = useStreakStore();
  const { unlocked, getProgress } = useAchievementStore();

  // Mock weekly data - in production, load from database
  const [weeklyData, setWeeklyData] = useState<DayData[]>([]);

  useEffect(() => {
    // Load weekly data
    async function loadWeeklyData() {
      const today = new Date();
      const days: DayData[] = [];

      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(today);
        dayStart.setDate(dayStart.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const rollups = await DatabaseService.getRollups(
          dayStart.getTime(),
          dayEnd.getTime()
        );

        if (rollups && rollups.length > 0) {
          const totalBlinks = rollups.reduce((sum, r) => sum + r.blink_count, 0);
          const avgBlinkRate = rollups.length > 0 ? totalBlinks / rollups.length : 0;
          // Score based on blink rate
          const score = Math.min(100, Math.round((avgBlinkRate / 15) * 100));
          days.push({
            label: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
            score,
            isToday: i === 0,
          });
        } else {
          days.push({
            label: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
            score: i === 0 ? wellnessScore : null,
            isToday: i === 0,
          });
        }
      }
      setWeeklyData(days);
    }
    loadWeeklyData();
  }, [wellnessScore]);

  // Calculate time until next break
  const breakIntervalMinutes = 20;
  const timeSinceBreak = Math.floor((Date.now() - todayStats.breaksCount * breakIntervalMinutes * 60000) / 1000);
  const timeUntilBreak = Math.max(0, breakIntervalMinutes * 60 - (sessionDuration % (breakIntervalMinutes * 60)));
  const nextBreakMinutes = Math.floor(timeUntilBreak / 60);
  const nextBreakSeconds = timeUntilBreak % 60;

  // Count unlocked achievements
  const unlockedCount = Object.values(unlocked).filter(Boolean).length;

  return (
    <div className="h-full flex flex-col relative">
      {/* Pre-break Toast */}
      <PreBreakToast
        secondsUntilBreak={preBreakSeconds}
        breakType="micro"
        onStartNow={onStartBreakNow}
        onPostpone={onPostponeBreak}
        postponesRemaining={postponesRemaining}
        isVisible={showPreBreakToast}
      />

      {/* Break Overlay Modal */}
      {isOnBreak && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-xl">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Time for a Break!</h2>
            <p className="text-gray-600 mb-6">
              Look at something 20 feet away to rest your eyes
            </p>
            <div className="relative w-36 h-36 mx-auto mb-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="72" cy="72" r="64" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                <circle
                  cx="72"
                  cy="72"
                  r="64"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="10"
                  strokeDasharray={`${(breakTimeRemaining / 20) * 402} 402`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold">{breakTimeRemaining}</span>
                <span className="text-sm text-gray-500">seconds</span>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={onSkipBreak}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Skip
              </button>
              <button
                onClick={() => {
                  // Extend break by 20 seconds
                }}
                className="px-6 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                +20s
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Welcome Hero Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {userName}! <span className="inline-block origin-[70%_70%] animate-wave">👋</span>
          </h1>
          <p className="text-lg text-gray-500">
            {(() => {
              const hour = new Date().getHours();
              if (hour < 12) return "Good morning! Ready to take care of your eyes today?";
              if (hour < 17) return "Good afternoon! Keep up the great work on your eye health.";
              return "Good evening! Let's wind down and give your eyes some rest.";
            })()}
          </p>
        </div>

        {/* Top Row: Wellness Score + Daily Streak */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Wellness Score Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Wellness Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold">{wellnessScore}</span>
                <span className="text-xl text-gray-400">/100</span>
              </div>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.color}`}>
                {status.label}
              </span>
            </div>
            <div className="w-28 h-28 relative">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="48" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  fill="none"
                  stroke={wellnessScore >= 70 ? '#22c55e' : wellnessScore >= 40 ? '#eab308' : '#ef4444'}
                  strokeWidth="10"
                  strokeDasharray={`${(wellnessScore / 100) * 301} 301`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Icons.Eye />
              </div>
            </div>
          </div>
        </div>

        {/* Daily Streak Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-3">Today's Streaks</p>
          <div className="grid grid-cols-2 gap-3">
            <StreakBadge
              type="daily_use"
              count={streaks.daily_use.currentCount}
              bestStreak={streaks.daily_use.longestCount}
              goal={7}
              size="sm"
              showDetails
            />
            <StreakBadge
              type="break_compliance"
              count={todayProgress.breaksTaken}
              bestStreak={streaks.break_compliance.longestCount}
              goal={4}
              size="sm"
              showDetails
            />
            <StreakBadge
              type="healthy_blink"
              count={streaks.healthy_blink.currentCount}
              bestStreak={streaks.healthy_blink.longestCount}
              goal={8}
              size="sm"
              showDetails
            />
            <StreakBadge
              type="good_posture"
              count={streaks.good_posture.currentCount}
              bestStreak={streaks.good_posture.longestCount}
              goal={60}
              size="sm"
              showDetails
            />
          </div>
        </div>
      </div>

      {/* Live Metrics Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Live Metrics</h3>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isDetecting ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-sm text-gray-500">{isDetecting ? 'Monitoring' : 'Paused'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Blink Rate */}
          <div className="bg-gray-50 rounded-lg p-4" data-tour="blink-stats">
            <div className="flex items-center gap-2 mb-1">
              <Icons.Eye />
              <span className="text-sm text-gray-500">Blink Rate</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{blinkRate.toFixed(1)}</span>
              <span className="text-gray-400">/min</span>
            </div>
            <p className={`text-xs mt-1 ${blinkRate >= 15 ? 'text-green-600' : 'text-yellow-600'}`}>
              {blinkRate >= 15 ? 'Great job!' : 'Eyes working hard'}
            </p>
          </div>

          {/* Session Time */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icons.Clock />
              <span className="text-sm text-gray-500">Session</span>
            </div>
            <span className="text-2xl font-bold">{formatDuration(sessionDuration)}</span>
            <p className="text-xs text-gray-500 mt-1">{blinkCount} blinks</p>
          </div>

          {/* Next Break */}
          <div className="bg-gray-50 rounded-lg p-4" data-tour="break-timer">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-gray-500">Next Break</span>
            </div>
            <span className="text-2xl font-bold">
              {nextBreakMinutes}:{nextBreakSeconds.toString().padStart(2, '0')}
            </span>
            <p className="text-xs text-gray-500 mt-1">{todayStats.breaksCount} breaks today</p>
          </div>

          {/* Face Detection */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icons.Camera />
              <span className="text-sm text-gray-500">Detection</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${faceDetected ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="text-lg font-medium">{faceDetected ? 'Face Found' : 'No Face'}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Multi-stage adaptive detection</p>
          </div>
        </div>
      </div>

      {/* Middle Row: Weekly Trend + Posture */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Weekly Trend */}
        <WeeklyTrendCard
          days={weeklyData}
        />

        {/* Posture Status */}
        <div data-tour="posture-indicator">
          <PostureStatusCard
            status={
              !isDetecting ? 'unknown' :
              !faceDetected ? 'unknown' :
              currentPosture?.hasIssues ? 'poor' : 'good'
            }
            goodPostureMinutes={streaks.good_posture.currentCount}
            totalMinutes={60}
            longestStreak={streaks.good_posture.longestCount}
          />
        </div>
      </div>

      {/* Achievements Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6" data-tour="achievements">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Achievements</h3>
          <span className="text-sm text-gray-500">{unlockedCount}/9 unlocked</span>
        </div>
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
          {(['first_steps', 'perfect_day', 'week_warrior', 'blink_master', 'posture_pro'] as const).map((id) => (
            <AchievementBadge
              key={id}
              achievement={ACHIEVEMENTS[id]}
              isUnlocked={!!unlocked[id]}
              progress={getProgress(id)}
              showProgress
              size="sm"
            />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold mb-4">Quick Actions</h3>
        <div className="flex gap-4">
          <button
            onClick={onToggleDetection}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              isDetecting
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}
          >
            {isDetecting ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
          <button
            onClick={onTakeBreak}
            className="flex-1 py-3 px-4 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Take a Break
          </button>
        </div>

        {/* Detection status */}
        {isDetecting && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-gray-600">
              {faceDetected ? 'Looking after your eyes' : 'Ready when you are - just look at the camera'}
            </span>
          </div>
        )}
      </div>

      {/* Calibration Progress */}
      {isCalibrating && (
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-purple-900">Calibrating Your Baseline</h4>
            <span className="text-sm text-purple-700">{Math.round(calibrationProgress * 100)}%</span>
          </div>
          <div className="w-full bg-purple-200 rounded-full h-2 mb-3">
            <div
              className="bg-purple-600 rounded-full h-2 transition-all duration-300"
              style={{ width: `${calibrationProgress * 100}%` }}
            />
          </div>
          <p className="text-sm text-purple-700">
            Learning your unique patterns to give you personalized care. This takes about 2 hours.
          </p>
        </div>
      )}

      {/* Baseline Info */}
      {userBaseline && !isCalibrating && (
        <div className="bg-green-50 rounded-xl p-4 border border-green-100 mb-6">
          <h4 className="font-medium text-green-900 mb-2">Your Personal Baseline</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-green-600">Low</span>
              <p className="font-medium text-green-900">{userBaseline.blinkP25.toFixed(1)}/min</p>
            </div>
            <div>
              <span className="text-green-600">Normal</span>
              <p className="font-medium text-green-900">{userBaseline.blinkP50.toFixed(1)}/min</p>
            </div>
            <div>
              <span className="text-green-600">High</span>
              <p className="font-medium text-green-900">{userBaseline.blinkP75.toFixed(1)}/min</p>
            </div>
          </div>
        </div>
      )}

        {/* Tips */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <h4 className="font-medium text-blue-900 mb-2">Eye Health Tips</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>- Aim for 15-20 blinks per minute to prevent dry eyes</li>
            <li>- Follow the 20-20-20 rule for regular eye breaks</li>
            <li>- Keep your monitor at arm's length and slightly below eye level</li>
          </ul>
        </div>

        {/* Footer message */}
        <div className="text-center py-6 text-gray-400 text-sm">
          <p>Your eyes work hard for you every day.</p>
          <p className="mt-1">Take care of them, they're the only pair you've got.</p>
        </div>
      </div>
    </div>
  );
}

export default DashboardView;
