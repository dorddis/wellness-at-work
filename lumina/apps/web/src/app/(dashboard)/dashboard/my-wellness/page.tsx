'use client';

import { useState, useEffect } from 'react';
import { Eye, TrendingUp, Download, Trash2, Loader2, AlertTriangle, Activity, Clock, Shield, Target, Calendar } from 'lucide-react';
import { BlinkRateTrendChart } from '../../../../components/charts';
import { useAuth } from '../../../contexts/auth-context';
import { exportUserData, requestAccountDeletion, getMyWellnessData, getMyDailyStats } from '@lumina/api';
import { StreakBadge, useStreakStore } from '@lumina/ui';

interface DailyData {
  day: string;
  blinkRate: number;
  score: number;
}

interface MonthlyData {
  date: string;
  blinkRate: number;
}

interface Baseline {
  p25: number;
  p50: number;
  p75: number;
  calibratedAt: string;
}

export default function MyWellnessPage() {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletionScheduled, setDeletionScheduled] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Streak store for gamification
  const streaks = useStreakStore((state) => state.streaks);
  const todayProgress = useStreakStore((state) => state.todayProgress);

  // Real data states
  const [weeklyData, setWeeklyData] = useState<DailyData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [todayStats, setTodayStats] = useState({
    blinkRate: 0,
    wellnessScore: 0,
    activeMinutes: 0,
    sessionsToday: 0,
  });
  const [baseline, setBaseline] = useState<Baseline>({
    p25: 12,
    p50: 15,
    p75: 18,
    calibratedAt: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        // Get last 30 days of data
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const now = new Date();

        const wellnessData = await getMyWellnessData(thirtyDaysAgo, now);
        const dailyStats = await getMyDailyStats(30);

        // Build monthly chart data
        const monthly: MonthlyData[] = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const dayStats = dailyStats.find((d) => d.date === dateStr);

          monthly.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            blinkRate: dayStats?.avgBlinkRate ?? 0,
          });
        }
        setMonthlyData(monthly);

        // Build weekly data (last 5 weekdays)
        const weekly: DailyData[] = [];
        const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        for (let i = 4; i >= 0; i--) {
          const date = new Date();
          // Find the last 5 weekdays
          let daysBack = 0;
          let weekdayCount = 0;
          while (weekdayCount <= i) {
            const checkDate = new Date();
            checkDate.setDate(checkDate.getDate() - daysBack);
            const dayOfWeek = checkDate.getDay();
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
              weekdayCount++;
              if (weekdayCount > i) {
                date.setTime(checkDate.getTime());
              }
            }
            daysBack++;
          }

          const dateStr = date.toISOString().split('T')[0];
          const dayStats = dailyStats.find((d) => d.date === dateStr);
          const blinkRate = dayStats?.avgBlinkRate ?? 0;
          const score = calculateWellnessScore(blinkRate);

          weekly.push({
            day: weekdays[date.getDay() - 1] || 'N/A',
            blinkRate: Math.round(blinkRate * 10) / 10,
            score,
          });
        }
        setWeeklyData(weekly);

        // Calculate baseline from data (P25, P50, P75)
        if (wellnessData.length > 0) {
          const blinkRates = wellnessData.map((d) => d.blinkCount).sort((a, b) => a - b);
          const p25Index = Math.floor(blinkRates.length * 0.25);
          const p50Index = Math.floor(blinkRates.length * 0.5);
          const p75Index = Math.floor(blinkRates.length * 0.75);

          setBaseline({
            p25: Math.round(blinkRates[p25Index] * 10) / 10,
            p50: Math.round(blinkRates[p50Index] * 10) / 10,
            p75: Math.round(blinkRates[p75Index] * 10) / 10,
            calibratedAt: new Date().toISOString().split('T')[0],
          });
        }

        // Get today's stats
        const today = new Date().toISOString().split('T')[0];
        const todayDayStats = dailyStats.find((d) => d.date === today);
        if (todayDayStats) {
          setTodayStats({
            blinkRate: Math.round(todayDayStats.avgBlinkRate * 10) / 10,
            wellnessScore: calculateWellnessScore(todayDayStats.avgBlinkRate),
            activeMinutes: Math.round(todayDayStats.totalBlinks / (todayDayStats.avgBlinkRate || 15)),
            sessionsToday: todayDayStats.sessionCount || 1,
          });
        }
      } catch (error) {
        console.error('Failed to load wellness data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  const handleExportData = async () => {
    if (!user?.id) return;

    setIsExporting(true);
    try {
      const result = await exportUserData(user.id);
      if (result.success && result.data) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lumina-wellness-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        console.error('Export failed:', result.error);
        alert('Failed to export data. Please try again.');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (!user?.id) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      const result = await requestAccountDeletion(user.id);
      if (result.success && result.deletionDate) {
        setDeletionScheduled(result.deletionDate);
        setShowDeleteConfirm(false);
      } else {
        setDeleteError(result.error || 'Failed to schedule deletion');
      }
    } catch (error) {
      setDeleteError('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate insights from real data
  const weeklyAvg = weeklyData.length > 0
    ? weeklyData.reduce((sum, d) => sum + d.score, 0) / weeklyData.length
    : 0;
  const bestDay = weeklyData.length > 0
    ? weeklyData.reduce((best, d) => d.score > best.score ? d : best, weeklyData[0])
    : null;
  const worstDay = weeklyData.length > 0
    ? weeklyData.reduce((worst, d) => d.score < worst.score ? d : worst, weeklyData[0])
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Get today's day name for highlighting
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'short' });

  return (
    <div className="space-y-6">
      {/* Page header with privacy indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Wellness</h1>
          <p className="text-muted-foreground">Your personal wellness insights and history</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Privacy indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
            <Shield className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-green-700">100% On-Device</span>
          </div>
          <button
            className="btn btn-outline"
            onClick={handleExportData}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isExporting ? 'Exporting...' : 'Export Data'}
          </button>
        </div>
      </div>

      {/* Today's Status - Clean stat row without nested cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-3 p-4 bg-white rounded-lg border">
          <div className="p-2 rounded-lg bg-gray-100">
            <Target className={`w-5 h-5 ${todayStats.wellnessScore >= 70 ? 'text-green-600' : todayStats.wellnessScore >= 50 ? 'text-amber-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Wellness Score</p>
            <p className={`text-xl font-bold ${todayStats.wellnessScore >= 70 ? 'text-green-600' : todayStats.wellnessScore >= 50 ? 'text-amber-600' : 'text-gray-400'}`}>
              {todayStats.wellnessScore}<span className="text-sm font-normal text-muted-foreground">/100</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-white rounded-lg border">
          <div className="p-2 rounded-lg bg-gray-100">
            <Eye className={`w-5 h-5 ${todayStats.blinkRate >= 15 ? 'text-green-600' : todayStats.blinkRate >= 10 ? 'text-amber-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Blink Rate</p>
            <p className={`text-xl font-bold ${todayStats.blinkRate >= 15 ? 'text-green-600' : todayStats.blinkRate >= 10 ? 'text-amber-600' : 'text-gray-400'}`}>
              {todayStats.blinkRate}<span className="text-sm font-normal text-muted-foreground">/min</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-white rounded-lg border">
          <div className="p-2 rounded-lg bg-gray-100">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Active Time</p>
            <p className="text-xl font-bold text-blue-600">
              {todayStats.activeMinutes}<span className="text-sm font-normal text-muted-foreground">min</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-white rounded-lg border">
          <div className="p-2 rounded-lg bg-gray-100">
            <Activity className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Sessions</p>
            <p className="text-xl font-bold text-purple-600">{todayStats.sessionsToday}</p>
          </div>
        </div>
      </div>

      {/* Baseline + Streaks side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Your Baseline - Takes 3 columns */}
        <div className="lg:col-span-3 card">
          <div className="card-header flex items-center justify-between py-3">
            <h2 className="font-semibold">Your Baseline</h2>
            <span className="text-xs text-muted-foreground">Calibrated: {baseline.calibratedAt}</span>
          </div>
          <div className="px-6 pb-5">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <p className="text-xs text-muted-foreground mb-1">Low (P25)</p>
                <p className="text-2xl font-bold text-amber-600">{baseline.p25}</p>
                <p className="text-xs text-muted-foreground">blinks/min</p>
              </div>
              <div className="w-px h-12 bg-gray-200" />
              <div className="text-center flex-1">
                <p className="text-xs text-muted-foreground mb-1">Normal (P50)</p>
                <p className="text-2xl font-bold text-green-600">{baseline.p50}</p>
                <p className="text-xs text-muted-foreground">blinks/min</p>
              </div>
              <div className="w-px h-12 bg-gray-200" />
              <div className="text-center flex-1">
                <p className="text-xs text-muted-foreground mb-1">High (P75)</p>
                <p className="text-2xl font-bold text-blue-600">{baseline.p75}</p>
                <p className="text-xs text-muted-foreground">blinks/min</p>
              </div>
            </div>
          </div>
        </div>

        {/* Streaks - Takes 2 columns */}
        <div className="lg:col-span-2 card">
          <div className="card-header py-3">
            <h2 className="font-semibold">Your Streaks</h2>
          </div>
          <div className="px-4 pb-4 grid grid-cols-2 gap-2">
            <StreakBadge type="daily_use" count={streaks.daily_use.currentCount} size="sm" />
            <StreakBadge type="healthy_blink" count={streaks.healthy_blink.currentCount} size="sm" />
            <StreakBadge type="break_compliance" count={streaks.break_compliance.currentCount} size="sm" />
            <StreakBadge type="good_posture" count={streaks.good_posture.currentCount} size="sm" />
          </div>
        </div>
      </div>

      {/* Weekly trend - Simplified */}
      <div className="card">
        <div className="card-header flex items-center justify-between py-3">
          <h2 className="font-semibold">This Week</h2>
          <span className="text-xs text-muted-foreground">Last 5 weekdays</span>
        </div>
        <div className="px-6 pb-5">
          {weeklyData.length > 0 ? (
            <div className="flex items-end justify-between gap-2">
              {weeklyData.map((day, i) => (
                <DayCard key={i} {...day} isToday={day.day === todayDayName} />
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No data available for this week
            </div>
          )}
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Weekly Insights</h2>
          </div>
          <div className="card-body space-y-4">
            {weeklyAvg > 0 && (
              <InsightItem
                icon={<TrendingUp className="w-5 h-5 text-green-600" />}
                title={`Average score: ${Math.round(weeklyAvg)}`}
                description={weeklyAvg >= 70 ? "You're doing great this week!" : "There's room for improvement."}
              />
            )}
            {bestDay && bestDay.score > 0 && (
              <InsightItem
                icon={<Eye className="w-5 h-5 text-blue-600" />}
                title={`Best day: ${bestDay.day}`}
                description={`You had a wellness score of ${bestDay.score} with ${bestDay.blinkRate} blinks/min.`}
              />
            )}
            {worstDay && worstDay.score > 0 && worstDay.day !== bestDay?.day && (
              <InsightItem
                icon={<Calendar className="w-5 h-5 text-amber-600" />}
                title={`Focus area: ${worstDay.day}`}
                description={`Score was ${worstDay.score}. Consider more breaks on similar days.`}
              />
            )}
            {weeklyData.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Start using the desktop app to see your insights.
              </p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Recommendations</h2>
          </div>
          <div className="card-body space-y-3">
            <RecommendationCard
              title="Schedule regular breaks"
              description="Set a reminder every 45 minutes for a 5-minute eye break."
              priority="high"
            />
            <RecommendationCard
              title="Monitor screen brightness"
              description="Adjust your screen brightness to match ambient lighting."
              priority="medium"
            />
            <RecommendationCard
              title="20-20-20 practice"
              description="Every 20 minutes, look at something 20 feet away for 20 seconds."
              priority="low"
            />
          </div>
        </div>
      </div>

      {/* Historical data */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Monthly History</h2>
        </div>
        <div className="card-body">
          {monthlyData.some((d) => d.blinkRate > 0) ? (
            <BlinkRateTrendChart data={monthlyData} height={256} showHealthyRange />
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              No historical data available yet
            </div>
          )}
        </div>
      </div>

      {/* Data & Privacy */}
      <div className="card border-red-200">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Data & Privacy</h2>
        </div>
        <div className="card-body space-y-4">
          {deletionScheduled && (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800">Account Deletion Scheduled</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    Your account is scheduled for deletion on{' '}
                    {new Date(deletionScheduled).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    . You can cancel this request by contacting support before that date.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 rounded-lg bg-secondary/30">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium">Delete Account</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Permanently delete your account and all associated data. This action has a 30-day grace period.
                </p>
              </div>
              <button
                className="btn bg-red-600 text-white hover:bg-red-700 flex-shrink-0"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={!!deletionScheduled}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold">Delete Account?</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to delete your account? This will:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mb-4 space-y-1">
              <li>Remove all your wellness data</li>
              <li>Cancel your organization membership</li>
              <li>Delete your account after 30 days</li>
            </ul>
            <p className="text-sm text-muted-foreground mb-6">
              You can cancel this request within 30 days by contacting support.
            </p>
            {deleteError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 mb-4">
                <p className="text-sm text-red-700">{deleteError}</p>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                className="btn btn-outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="btn bg-red-600 text-white hover:bg-red-700"
                onClick={handleRequestDeletion}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Yes, Delete My Account'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function calculateWellnessScore(blinkRate: number): number {
  if (blinkRate < 5) return 30;
  if (blinkRate < 10) return 50;
  if (blinkRate < 15) return 75;
  if (blinkRate < 20) return 90;
  return 100;
}

function DayCard({
  day,
  blinkRate,
  score,
  isToday = false,
}: {
  day: string;
  blinkRate: number;
  score: number;
  isToday?: boolean;
}) {
  const scoreColor =
    score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-500';
  const barColor =
    score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-400';
  const barHeight = Math.max(20, (score / 100) * 60);

  return (
    <div className={`flex-1 text-center ${isToday ? 'relative' : ''}`}>
      {isToday && (
        <div className="absolute -inset-2 bg-gray-100 rounded-lg -z-10" />
      )}
      <p className={`text-xs mb-2 ${isToday ? 'font-semibold' : 'text-muted-foreground'}`}>
        {isToday ? 'Today' : day}
      </p>

      {/* Simple bar visualization */}
      <div className="flex flex-col items-center gap-1">
        <div className="h-16 w-8 bg-gray-100 rounded-t-sm flex items-end justify-center relative">
          <div
            className={`w-full rounded-t-sm transition-all duration-300 ${barColor}`}
            style={{ height: `${barHeight}px` }}
          />
        </div>
        <p className={`text-xs font-medium ${scoreColor}`}>{score}</p>
      </div>

      <p className="text-sm font-semibold mt-2">{blinkRate}</p>
      <p className="text-[10px] text-muted-foreground">/min</p>
    </div>
  );
}

function InsightItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div>
        <h4 className="text-sm font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function RecommendationCard({
  title,
  description,
  priority,
}: {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}) {
  const priorityColor = {
    high: 'border-l-red-500',
    medium: 'border-l-amber-500',
    low: 'border-l-blue-500',
  }[priority];

  return (
    <div className={`p-3 rounded-lg bg-secondary/30 border-l-4 ${priorityColor}`}>
      <h4 className="text-sm font-medium">{title}</h4>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

