'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Timer,
  Eye,
  Users,
  Trophy,
  Download,
  Calendar,
  Loader2,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { useAuth } from '../../../providers';
import { getOrgAnalytics, type AnalyticsMetrics } from '@lumina/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

type DateRange = '7d' | '30d' | '90d' | 'custom';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!user?.organization?.id) return;

      try {
        setLoading(true);

        // Calculate date range
        const endDate = new Date();
        let startDate = new Date();

        if (dateRange === '7d') {
          startDate.setDate(startDate.getDate() - 7);
        } else if (dateRange === '30d') {
          startDate.setDate(startDate.getDate() - 30);
        } else if (dateRange === '90d') {
          startDate.setDate(startDate.getDate() - 90);
        } else if (dateRange === 'custom' && customStart && customEnd) {
          startDate = new Date(customStart);
          endDate.setTime(new Date(customEnd).getTime());
        }

        const data = await getOrgAnalytics(user.organization.id, startDate, endDate);
        setMetrics(data);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, dateRange, customStart, customEnd]);

  const handleExport = () => {
    if (!metrics) return;

    // Build CSV content
    const lines = [
      'Lumina Analytics Report',
      `Generated: ${new Date().toISOString()}`,
      `Date Range: ${dateRange}`,
      '',
      'Summary Metrics',
      `Average Wellness Score,${metrics.teamMetrics.avgWellnessScore}%`,
      `Average Break Compliance,${metrics.teamMetrics.avgBreakCompliance}%`,
      `Total Breaks,${metrics.teamMetrics.totalBreaksTaken}`,
      `Total Exercise Sessions,${metrics.teamMetrics.totalExercisesCompleted}`,
      `Active Users,${metrics.teamMetrics.totalActiveUsers}`,
      '',
      'Department Breakdown',
      'Department,Avg Wellness,Break Compliance,Members',
      ...metrics.departmentBreakdown.map(
        (d) => `${d.department},${d.avgScore}%,${d.breakCompliance}%,${d.userCount}`
      ),
      '',
      'Daily Trends',
      'Date,Wellness Score,Break Compliance',
      ...metrics.trends.map(
        (d) => `${d.date},${d.wellnessScore}%,${d.breakCompliance}%`
      ),
    ];

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lumina-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Colors for charts
  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // Pie chart data for break status (mock distribution based on compliance)
  const breakStatusData = metrics ? [
    { name: 'Completed', value: Math.round(metrics.teamMetrics.avgBreakCompliance), color: '#22c55e' },
    { name: 'Skipped', value: Math.round((100 - metrics.teamMetrics.avgBreakCompliance) * 0.6), color: '#ef4444' },
    { name: 'Postponed', value: Math.round((100 - metrics.teamMetrics.avgBreakCompliance) * 0.4), color: '#f59e0b' },
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Team wellness metrics and insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date range selector */}
          <div className="flex items-center gap-2 bg-secondary rounded-lg p-1">
            {(['7d', '30d', '90d'] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  dateRange === range
                    ? 'bg-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
          <button
            onClick={handleExport}
            className="btn btn-outline flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Custom date range (if selected) */}
      {dateRange === 'custom' && (
        <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-md text-sm"
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-md text-sm"
            />
          </div>
        </div>
      )}

      {metrics ? (
        <>
          {/* Metrics grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <MetricCard
              icon={<Activity className="w-5 h-5 text-green-600" />}
              label="Avg Wellness"
              value={`${metrics.teamMetrics.avgWellnessScore}%`}
              trend={metrics.teamMetrics.avgWellnessScore >= 75 ? 'up' : metrics.teamMetrics.avgWellnessScore >= 50 ? 'neutral' : 'down'}
            />
            <MetricCard
              icon={<Timer className="w-5 h-5 text-blue-600" />}
              label="Break Compliance"
              value={`${metrics.teamMetrics.avgBreakCompliance}%`}
              trend={metrics.teamMetrics.avgBreakCompliance >= 80 ? 'up' : metrics.teamMetrics.avgBreakCompliance >= 60 ? 'neutral' : 'down'}
            />
            <MetricCard
              icon={<Eye className="w-5 h-5 text-purple-600" />}
              label="Avg Blink Rate"
              value={`${metrics.teamMetrics.avgBlinkRate}/min`}
              trend={metrics.teamMetrics.avgBlinkRate >= 12 ? 'up' : metrics.teamMetrics.avgBlinkRate >= 8 ? 'neutral' : 'down'}
            />
            <MetricCard
              icon={<BarChart3 className="w-5 h-5 text-amber-600" />}
              label="Total Breaks"
              value={metrics.teamMetrics.totalBreaksTaken.toLocaleString()}
            />
            <MetricCard
              icon={<Eye className="w-5 h-5 text-cyan-600" />}
              label="Exercise Sessions"
              value={metrics.teamMetrics.totalExercisesCompleted.toLocaleString()}
            />
            <MetricCard
              icon={<Users className="w-5 h-5 text-orange-600" />}
              label="Active Users"
              value={metrics.teamMetrics.totalActiveUsers}
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trend chart */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold">Wellness & Break Trends</h2>
              </div>
              <div className="card-body">
                {metrics.trends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metrics.trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        stroke="#9ca3af"
                        fontSize={12}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }}
                      />
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
                        formatter={(value) => [`${value ?? 0}%`]}
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="wellnessScore"
                        name="Wellness"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="breakCompliance"
                        name="Breaks"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <p>No trend data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Break status pie chart */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold">Break Status Distribution</h2>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={300}>
                  <RePieChart>
                    <Pie
                      data={breakStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {breakStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`]} />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Department breakdown */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Department Comparison</h2>
            </div>
            <div className="card-body">
              {metrics.departmentBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.departmentBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      stroke="#9ca3af"
                      fontSize={12}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <YAxis
                      dataKey="department"
                      type="category"
                      stroke="#9ca3af"
                      fontSize={12}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                      formatter={(value) => [`${value ?? 0}%`]}
                    />
                    <Legend />
                    <Bar dataKey="avgScore" name="Wellness" fill="#22c55e" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="breakCompliance" name="Breaks" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <div className="text-center">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No department data available</p>
                    <p className="text-sm">Add department info to employees to see breakdown</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Daily breakdown table */}
          {metrics.trends.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold">Daily Breakdown</h2>
              </div>
              <div className="card-body p-0 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Wellness Score
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Break Compliance
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {metrics.trends.slice(-14).reverse().map((day) => {
                      const avgScore = (day.wellnessScore + day.breakCompliance) / 2;
                      return (
                        <tr key={day.date} className="hover:bg-secondary/30">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {new Date(day.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            <span className={day.wellnessScore >= 75 ? 'text-green-600' : day.wellnessScore >= 50 ? 'text-amber-600' : 'text-red-600'}>
                              {day.wellnessScore}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            <span className={day.breakCompliance >= 80 ? 'text-green-600' : day.breakCompliance >= 60 ? 'text-amber-600' : 'text-red-600'}>
                              {day.breakCompliance}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {avgScore >= 75 ? (
                              <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                                <TrendingUp className="w-4 h-4" />
                                Good
                              </span>
                            ) : avgScore >= 50 ? (
                              <span className="text-amber-600 text-sm">Average</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-600 text-sm">
                                <TrendingDown className="w-4 h-4" />
                                Needs Attention
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card p-12 text-center text-muted-foreground">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No analytics data available</p>
          <p className="text-sm">Data will appear as your team uses Lumina</p>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          {icon}
        </div>
        {trend && (
          <span className={`text-xs ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-amber-600'
          }`}>
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4" />
            ) : trend === 'down' ? (
              <TrendingDown className="w-4 h-4" />
            ) : (
              <span className="font-medium">--</span>
            )}
          </span>
        )}
      </div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
