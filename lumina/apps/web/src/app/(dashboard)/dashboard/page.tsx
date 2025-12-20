'use client';

import { useEffect, useState } from 'react';
import { Eye, TrendingUp, TrendingDown, Clock, Activity } from 'lucide-react';
import { WellnessScoreChart } from '../../../components/charts';
import { useAuth } from '../../contexts/auth-context';
import { getMyWellnessData, getMyDailyStats } from '@lumina/api';

interface DashboardStats {
  todayBlinkRate: number;
  avgBlinkRate: number;
  wellnessScore: number;
  scoreChange: number;
  sessionsToday: number;
  totalMinutesToday: number;
}

interface WeekTrendData {
  date: string;
  score: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weekTrend, setWeekTrend] = useState<WeekTrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        // Get today's data
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayData = await getMyWellnessData(today, tomorrow);

        // Get last 7 days for trend
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const dailyStats = await getMyDailyStats(7);

        // Calculate today's stats
        let todayBlinkRate = 0;
        let totalBlinks = 0;
        if (todayData.length > 0) {
          totalBlinks = todayData.reduce((sum, d) => sum + d.blinkCount, 0);
          todayBlinkRate = Math.round((totalBlinks / todayData.length) * 10) / 10;
        }

        // Calculate wellness score based on blink rate
        let wellnessScore = 0;
        if (todayBlinkRate < 5) wellnessScore = 30;
        else if (todayBlinkRate < 10) wellnessScore = 50;
        else if (todayBlinkRate < 15) wellnessScore = 75;
        else if (todayBlinkRate < 20) wellnessScore = 90;
        else wellnessScore = 100;

        // Calculate 7-day average blink rate
        let avgBlinkRate = 0;
        if (dailyStats.length > 0) {
          avgBlinkRate = dailyStats.reduce((sum, d) => sum + d.avgBlinkRate, 0) / dailyStats.length;
          avgBlinkRate = Math.round(avgBlinkRate * 10) / 10;
        }

        // Calculate score change (compare today vs yesterday)
        let scoreChange = 0;
        if (dailyStats.length >= 2) {
          const yesterdayStats = dailyStats[dailyStats.length - 2];
          const yesterdayScore = calculateWellnessScore(yesterdayStats?.avgBlinkRate ?? 0);
          scoreChange = wellnessScore - yesterdayScore;
        }

        // Count unique sessions today (by session_id or by hour grouping)
        const sessionsToday = todayData.length > 0 ? Math.ceil(todayData.length / 60) : 0;

        setStats({
          todayBlinkRate,
          avgBlinkRate,
          wellnessScore,
          scoreChange,
          sessionsToday: Math.max(1, sessionsToday),
          totalMinutesToday: todayData.length,
        });

        // Build week trend data
        const trendData: WeekTrendData[] = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const dayStats = dailyStats.find((d) => d.date === dateStr);

          trendData.push({
            date: date.toLocaleDateString('en-US', { weekday: 'short' }),
            score: dayStats ? calculateWellnessScore(dayStats.avgBlinkRate) : 0,
          });
        }
        setWeekTrend(trendData);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Your wellness overview for today</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Wellness Score"
          value={stats?.wellnessScore ?? 0}
          suffix="/100"
          change={stats?.scoreChange ?? 0}
          icon={<Activity className="w-5 h-5" />}
        />
        <StatCard
          label="Blink Rate"
          value={stats?.todayBlinkRate?.toFixed(1) ?? '0'}
          suffix="/min"
          subtext={`Avg: ${stats?.avgBlinkRate ?? 0}/min`}
          icon={<Eye className="w-5 h-5" />}
        />
        <StatCard
          label="Sessions Today"
          value={stats?.sessionsToday ?? 0}
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          label="Active Time"
          value={Math.floor((stats?.totalMinutesToday ?? 0) / 60)}
          suffix="h"
          subtext={`${(stats?.totalMinutesToday ?? 0) % 60}m`}
          icon={<Clock className="w-5 h-5" />}
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Wellness trend chart */}
        <div className="lg:col-span-2 card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Wellness Trend (This Week)</h2>
          </div>
          <div className="card-body">
            {weekTrend.length > 0 ? (
              <WellnessScoreChart data={weekTrend} height={256} />
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No data available yet
              </div>
            )}
          </div>
        </div>

        {/* Quick tips */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Wellness Tips</h2>
          </div>
          <div className="card-body space-y-4">
            {(stats?.totalMinutesToday ?? 0) > 90 && (
              <TipCard
                title="Take a break"
                description={`You've been active for ${stats?.totalMinutesToday} minutes. Consider a 5-minute break.`}
                type="info"
              />
            )}
            {(stats?.scoreChange ?? 0) > 0 && (
              <TipCard
                title="Blink rate improving"
                description={`Your wellness score is ${stats?.scoreChange}% higher than yesterday. Keep it up!`}
                type="success"
              />
            )}
            {(stats?.todayBlinkRate ?? 0) < 10 && (stats?.todayBlinkRate ?? 0) > 0 && (
              <TipCard
                title="Low blink rate detected"
                description="Consider taking more frequent breaks to reduce eye strain."
                type="warning"
              />
            )}
            <TipCard
              title="20-20-20 rule"
              description="Every 20 minutes, look at something 20 feet away for 20 seconds."
              type="info"
            />
          </div>
        </div>
      </div>

      {/* Data summary */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Today's Summary</h2>
        </div>
        <div className="card-body">
          {(stats?.totalMinutesToday ?? 0) > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{stats?.totalMinutesToday ?? 0}</p>
                <p className="text-sm text-muted-foreground">Minutes tracked</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Math.round((stats?.todayBlinkRate ?? 0) * (stats?.totalMinutesToday ?? 0))}
                </p>
                <p className="text-sm text-muted-foreground">Total blinks</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.todayBlinkRate?.toFixed(1) ?? 0}</p>
                <p className="text-sm text-muted-foreground">Avg blinks/min</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.wellnessScore ?? 0}</p>
                <p className="text-sm text-muted-foreground">Wellness score</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No tracking data for today yet.</p>
              <p className="text-sm mt-1">Start using the desktop app to begin tracking.</p>
            </div>
          )}
        </div>
      </div>
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

function StatCard({
  label,
  value,
  suffix,
  subtext,
  change,
  icon,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  subtext?: string;
  change?: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold">{value}</span>
        {suffix && <span className="text-muted-foreground">{suffix}</span>}
      </div>
      {change !== undefined && change !== 0 && (
        <div className={`flex items-center gap-1 mt-2 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {change >= 0 ? '+' : ''}{change}% vs yesterday
        </div>
      )}
      {subtext && change === undefined && (
        <p className="text-sm text-muted-foreground mt-1">{subtext}</p>
      )}
    </div>
  );
}

function TipCard({
  title,
  description,
  type,
}: {
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning';
}) {
  const bgClass = {
    info: 'bg-blue-50 border-blue-100',
    success: 'bg-green-50 border-green-100',
    warning: 'bg-amber-50 border-amber-100',
  }[type];

  return (
    <div className={`p-3 rounded-lg border ${bgClass}`}>
      <h4 className="text-sm font-medium">{title}</h4>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
}
