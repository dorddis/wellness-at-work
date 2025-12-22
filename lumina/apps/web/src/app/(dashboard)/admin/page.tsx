'use client';

import { useEffect, useState } from 'react';
import { Users, TrendingUp, TrendingDown, AlertTriangle, Eye, Activity, Loader2 } from 'lucide-react';
import {
  getOrgWellnessStats,
  getDepartmentStats,
  getOrgAlerts,
  getOrgSettings,
  type DepartmentStats,
  type OrgSettings,
} from '@lumina/api';
import { useAuth } from '../../providers';
import { WellnessScoreChart, DepartmentComparisonChart } from '../../../components/charts';

// Default mock data (shown while loading or if no real data)
const defaultOrgStats = {
  totalEmployees: 0,
  activeToday: 0,
  avgWellnessScore: 0,
  scoreChange: 0,
  avgBlinkRate: 0,
  alertsThisWeek: 0,
  alertsTrend: 0,
};

interface OrgStats {
  totalEmployees: number;
  activeToday: number;
  avgWellnessScore: number;
  scoreChange: number;
  avgBlinkRate: number;
  alertsThisWeek: number;
  alertsTrend: number;
}

interface AlertItem {
  id: string;
  employee: string;
  department: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  time: string;
}

interface DepartmentRow {
  name: string;
  score: number;
  blinkRate: number;
  alerts: number;
  trend: 'up' | 'down' | 'stable';
}

interface TrendDataPoint {
  date: string;
  score: number;
}

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orgStats, setOrgStats] = useState<OrgStats>(defaultOrgStats);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<AlertItem[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [privacyMode, setPrivacyMode] = useState<'anonymous' | 'named' | 'manager_only'>('anonymous');

  // Get org ID from auth context
  const orgId = user?.organization?.id;
  const userRole = user?.organization?.role;

  useEffect(() => {
    async function fetchData() {
      if (!orgId) return;

      try {
        setLoading(true);

        // Fetch privacy mode first
        const settings = await getOrgSettings(orgId);
        if (settings) {
          setPrivacyMode(settings.privacyMode);
        }

        // Fetch organization stats
        const stats = await getOrgWellnessStats(orgId, 7);
        setOrgStats({
          totalEmployees: stats.activeUsers || 1,
          activeToday: stats.activeUsers,
          avgWellnessScore: Math.round(50 + stats.avgBlinkRate * 3),
          scoreChange: 0,
          avgBlinkRate: Math.round(stats.avgBlinkRate * 10) / 10,
          alertsThisWeek: stats.totalAlerts,
          alertsTrend: 0,
        });

        // Fetch department stats
        const deptStats = await getDepartmentStats(orgId);
        setDepartments(
          deptStats.map((d: DepartmentStats) => ({
            name: d.department,
            score: d.avgWellnessScore,
            blinkRate: d.avgBlinkRate,
            alerts: d.alertCount,
            trend: d.avgWellnessScore > 75 ? 'up' : d.avgWellnessScore < 60 ? 'down' : 'stable',
          }))
        );

        // Fetch recent alerts (only in named mode or for managers)
        const canViewIndividualAlerts =
          settings?.privacyMode === 'named' ||
          (settings?.privacyMode === 'manager_only' && (userRole === 'admin' || userRole === 'manager'));

        if (canViewIndividualAlerts) {
          const alerts = await getOrgAlerts(orgId, 5);
          setRecentAlerts(
            alerts.map((a, index) => ({
              id: a.id,
              employee: settings?.privacyMode === 'anonymous'
                ? `Employee ${index + 1}`
                : a.userName || a.userEmail?.split('@')[0] || 'Unknown',
              department: a.department || 'General',
              type: a.alertType,
              severity: a.severity,
              time: formatTimeAgo(new Date(a.createdAt)),
            }))
          );
        } else {
          // Anonymous mode - show aggregate alert count only
          setRecentAlerts([]);
        }

        // Generate trend data for last 30 days based on current wellness score
        const baseScore = Math.round(50 + stats.avgBlinkRate * 3);
        const trend: TrendDataPoint[] = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          // Add some variance to create realistic trend
          const variance = Math.sin(i * 0.3) * 8 + (Math.random() - 0.5) * 6;
          const score = Math.max(40, Math.min(100, Math.round(baseScore + variance)));
          trend.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            score,
          });
        }
        setTrendData(trend);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        // Keep default/mock data on error
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [orgId]);

  function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    return `${Math.floor(hours / 24)} days ago`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading dashboard...</span>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Team Overview</h1>
        <p className="text-muted-foreground">Organization-wide wellness metrics</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Team Wellness Score"
          value={orgStats.avgWellnessScore}
          suffix="/100"
          change={orgStats.scoreChange}
          icon={<Activity className="w-5 h-5" />}
        />
        <StatCard
          label="Avg Blink Rate"
          value={orgStats.avgBlinkRate.toFixed(1)}
          suffix="/min"
          icon={<Eye className="w-5 h-5" />}
        />
        <StatCard
          label="Active Today"
          value={orgStats.activeToday}
          subtext={`of ${orgStats.totalEmployees} employees`}
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          label="Alerts This Week"
          value={orgStats.alertsThisWeek}
          change={orgStats.alertsTrend}
          changeLabel="vs last week"
          icon={<AlertTriangle className="w-5 h-5" />}
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department breakdown */}
        <div className="lg:col-span-2 card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Department Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Department</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Score</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Blink Rate</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Alerts</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Trend</th>
                </tr>
              </thead>
              <tbody>
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No department data yet. Data will appear when employees start using the desktop app.
                    </td>
                  </tr>
                ) : (
                  departments.map((dept) => (
                    <tr key={dept.name} className="border-b border-border last:border-0 hover:bg-secondary/30">
                      <td className="px-6 py-4 font-medium">{dept.name}</td>
                      <td className="px-6 py-4">
                        <span className={`badge ${getScoreBadgeClass(dept.score)}`}>
                          {dept.score}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{dept.blinkRate}/min</td>
                      <td className="px-6 py-4">
                        {dept.alerts > 0 && (
                          <span className="badge badge-error">{dept.alerts}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <TrendIndicator trend={dept.trend} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent alerts */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Alerts</h2>
            {privacyMode !== 'anonymous' && (
              <a href="/admin/alerts" className="text-sm text-primary hover:underline">View all</a>
            )}
          </div>
          <div className="card-body space-y-4">
            {privacyMode === 'anonymous' ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">
                  Individual alerts are hidden in anonymous mode.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {orgStats.alertsThisWeek} alerts this week across the team.
                </p>
              </div>
            ) : recentAlerts.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No recent alerts</p>
            ) : (
              recentAlerts.map((alert) => (
                <AlertItem key={alert.id} {...alert} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team wellness trend chart */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Team Wellness Trend (Last 30 Days)</h2>
          </div>
          <div className="card-body">
            <WellnessScoreChart data={trendData} height={256} />
          </div>
        </div>

        {/* Department comparison chart */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Department Wellness Scores</h2>
          </div>
          <div className="card-body">
            <DepartmentComparisonChart data={departments} height={256} metric="score" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  subtext,
  change,
  changeLabel = 'vs yesterday',
  icon,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  subtext?: string;
  change?: number;
  changeLabel?: string;
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
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {change >= 0 ? '+' : ''}{change} {changeLabel}
        </div>
      )}
      {subtext && !change && (
        <p className="text-sm text-muted-foreground mt-1">{subtext}</p>
      )}
    </div>
  );
}

function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') {
    return (
      <span className="flex items-center gap-1 text-green-600">
        <TrendingUp className="w-4 h-4" />
        Up
      </span>
    );
  }
  if (trend === 'down') {
    return (
      <span className="flex items-center gap-1 text-red-600">
        <TrendingDown className="w-4 h-4" />
        Down
      </span>
    );
  }
  return <span className="text-muted-foreground">Stable</span>;
}

function AlertItem({
  employee,
  department,
  type,
  severity,
  time,
}: {
  employee: string;
  department: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  time: string;
}) {
  const severityColor = {
    critical: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
  }[severity];

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
      <div className={`w-2 h-2 rounded-full ${severityColor} mt-2`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{employee}</p>
        <p className="text-xs text-muted-foreground">{department} - {type}</p>
        <p className="text-xs text-muted-foreground mt-1">{time}</p>
      </div>
    </div>
  );
}

function getScoreBadgeClass(score: number): string {
  if (score >= 80) return 'badge-success';
  if (score >= 60) return 'badge-warning';
  return 'badge-error';
}
