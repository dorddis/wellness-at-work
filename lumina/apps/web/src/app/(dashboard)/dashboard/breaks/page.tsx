'use client';

import { useEffect, useState } from 'react';
import {
  Clock,
  Play,
  Pause,
  SkipForward,
  CheckCircle,
  XCircle,
  Loader2,
  Coffee,
  Eye,
  Timer,
} from 'lucide-react';
import { useAuth } from '../../../providers';
import {
  getMyBreakStats,
  getMyBreakEvents,
  createBreakEvent,
  updateBreakEvent,
  type BreakEvent,
  type BreakStats,
} from '@lumina/api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface WeekDayData {
  day: string;
  compliance: number;
  completed: number;
  total: number;
}

export default function BreaksPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<BreakStats | null>(null);
  const [weekHistory, setWeekHistory] = useState<WeekDayData[]>([]);
  const [nextBreakTime, setNextBreakTime] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        setLoading(true);

        // Get break stats
        const breakStats = await getMyBreakStats(7);
        setStats(breakStats);

        if (breakStats.nextBreakAt) {
          setNextBreakTime(
            new Date(breakStats.nextBreakAt).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })
          );
        }

        // Get last 7 days of breaks for chart
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const events = await getMyBreakEvents(sevenDaysAgo, tomorrow);

        // Group by day and calculate compliance
        const dayMap = new Map<string, { completed: number; total: number }>();

        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          dayMap.set(dateStr, { completed: 0, total: 0 });
        }

        for (const event of events) {
          const dateStr = event.scheduledAt.split('T')[0];
          const dayData = dayMap.get(dateStr);
          if (dayData) {
            dayData.total += 1;
            if (event.status === 'completed') {
              dayData.completed += 1;
            }
          }
        }

        const weekData = Array.from(dayMap.entries()).map(([date, data]) => {
          const dateObj = new Date(date);
          return {
            day: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
            compliance:
              data.total > 0
                ? Math.round((data.completed / data.total) * 100)
                : 0,
            completed: data.completed,
            total: data.total,
          };
        });

        setWeekHistory(weekData);
      } catch (error) {
        console.error('Failed to load break data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  const handleStartBreak = async () => {
    setActionLoading(true);
    try {
      const result = await createBreakEvent(new Date(), 'manual');
      if (result.success && result.id) {
        await updateBreakEvent(result.id, 'in_progress');
        // Refresh stats
        const breakStats = await getMyBreakStats(7);
        setStats(breakStats);
      }
    } catch (error) {
      console.error('Failed to start break:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Break Timer</h1>
        <p className="text-muted-foreground">
          Manage your eye break schedule and track compliance
        </p>
      </div>

      {/* Current break status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6 md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Next Break
            </h2>
            <button
              onClick={handleTogglePause}
              className="btn btn-outline py-1 px-3 text-sm flex items-center gap-1"
            >
              {isPaused ? (
                <Play className="w-4 h-4" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          </div>

          <div className="text-center py-8">
            {nextBreakTime ? (
              <>
                <p className="text-5xl font-bold mb-2">{nextBreakTime}</p>
                <p className="text-muted-foreground">
                  {isPaused ? 'Breaks paused' : 'Time of your next break'}
                </p>
              </>
            ) : (
              <>
                <Coffee className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-xl font-medium text-muted-foreground mb-2">
                  No breaks scheduled
                </p>
                <p className="text-sm text-muted-foreground">
                  Start using the desktop app to schedule automatic breaks
                </p>
              </>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleStartBreak}
              disabled={actionLoading}
              className="btn btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Start Break Now
            </button>
            <button className="btn btn-outline flex-1 flex items-center justify-center gap-2">
              <SkipForward className="w-4 h-4" />
              Skip Next Break
            </button>
          </div>
        </div>

        {/* Today's stats */}
        <div className="card p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Today's Breaks
          </h3>
          <div className="space-y-4">
            <StatRow
              icon={<CheckCircle className="w-5 h-5 text-green-600" />}
              label="Completed"
              value={stats?.todayCompleted ?? 0}
            />
            <StatRow
              icon={<XCircle className="w-5 h-5 text-red-500" />}
              label="Skipped"
              value={stats?.todaySkipped ?? 0}
            />
            <StatRow
              icon={<SkipForward className="w-5 h-5 text-amber-500" />}
              label="Postponed"
              value={stats?.todayPostponed ?? 0}
            />
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Weekly Compliance
              </span>
              <span className="text-2xl font-bold">
                {stats?.weeklyCompliance ?? 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly compliance chart */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Weekly Break Compliance</h2>
        </div>
        <div className="card-body">
          {weekHistory.length > 0 &&
          weekHistory.some((d) => d.total > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={weekHistory}>
                <defs>
                  <linearGradient
                    id="colorCompliance"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#9ca3af" fontSize={12} />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={12}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value}% (${props.payload.completed}/${props.payload.total})`,
                    'Compliance',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="compliance"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#colorCompliance)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No break data yet.</p>
              <p className="text-sm">Start using the desktop app!</p>
            </div>
          )}
        </div>
      </div>

      {/* 20-20-20 Rule Info */}
      <div className="card p-6 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Eye className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">The 20-20-20 Rule</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Every 20 minutes, look at something 20 feet away for 20 seconds.
              This simple technique helps reduce digital eye strain and keeps
              your eyes healthy.
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-primary" />
                <span>Every 20 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <span>Look 20 feet away</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>For 20 seconds</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Break settings info */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Break Settings</h2>
        </div>
        <div className="card-body">
          <p className="text-sm text-muted-foreground mb-4">
            Break settings are managed in the desktop app. Open Lumina Desktop
            &gt; Settings to customize:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Clock className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <span>
                <strong>Break interval:</strong> How often breaks occur (default:
                20 minutes)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Timer className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <span>
                <strong>Break duration:</strong> How long each break lasts
                (default: 20 seconds)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <SkipForward className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <span>
                <strong>Max postpones:</strong> Times you can delay a break
                (default: 2)
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
}
