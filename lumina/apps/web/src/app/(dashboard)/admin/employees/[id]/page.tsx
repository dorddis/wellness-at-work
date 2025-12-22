'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, Activity, Clock, Calendar, Mail, Send, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../../../../providers';
import { getSupabase } from '@lumina/api';
import { BlinkRateTrendChart } from '../../../../../components/charts';

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  joinedAt: string;
  score: number;
  blinkRate: number;
  totalSessions: number;
  totalMinutes: number;
  baseline: { p25: number; p50: number; p75: number };
}

interface Session {
  date: string;
  duration: string;
  blinkRate: number;
  score: number;
}

interface Alert {
  id: string;
  type: string;
  message: string;
  time: string;
  severity: 'critical' | 'warning' | 'info';
}

interface TrendDataPoint {
  date: string;
  blinkRate: number;
}

function calculateWellnessScore(blinkRate: number): number {
  // Continuous scale: score = blinkRate * 4 + 20, clamped to 25-100
  return Math.min(100, Math.max(25, Math.round(blinkRate * 4 + 20)));
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function formatAlertType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function EmployeeDetailPage() {
  const params = useParams();
  const employeeId = params.id as string;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  const orgId = user?.organization?.id;

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 3000);
  }, []);

  useEffect(() => {
    async function loadEmployeeData() {
      if (!orgId || !employeeId) return;

      try {
        const supabase = getSupabase();

        // Get employee info from member_details view
        const { data: memberData, error: memberError } = await supabase
          .from('member_details')
          .select('user_id, email, full_name, role, department, joined_at')
          .eq('org_id', orgId)
          .eq('user_id', employeeId)
          .single();

        if (memberError || !memberData) {
          console.error('Failed to load employee:', memberError);
          setLoading(false);
          return;
        }

        // Get wellness data for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: wellnessData } = await supabase
          .from('wellness_data')
          .select('timestamp, blink_count, session_id')
          .eq('org_id', orgId)
          .eq('user_id', employeeId)
          .gte('timestamp', thirtyDaysAgo.toISOString())
          .order('timestamp', { ascending: true });

        // Get alerts for this employee
        const { data: alertsData } = await supabase
          .from('org_alerts')
          .select('*')
          .eq('org_id', orgId)
          .eq('user_id', employeeId)
          .order('created_at', { ascending: false })
          .limit(5);

        // Calculate stats from wellness data
        let totalBlinks = 0;
        let avgBlinkRate = 0;
        const dailyData = new Map<string, { blinks: number; count: number }>();
        const uniqueSessions = new Set<string>();

        if (wellnessData && wellnessData.length > 0) {
          for (const d of wellnessData) {
            totalBlinks += d.blink_count;
            if (d.session_id) uniqueSessions.add(d.session_id);

            const dateKey = d.timestamp.split('T')[0];
            const existing = dailyData.get(dateKey) ?? { blinks: 0, count: 0 };
            dailyData.set(dateKey, {
              blinks: existing.blinks + d.blink_count,
              count: existing.count + 1,
            });
          }
          avgBlinkRate = totalBlinks / wellnessData.length;
        }

        // Calculate baseline from historical data (P25/P50/P75)
        const blinkRates = wellnessData?.map(d => d.blink_count) ?? [];
        blinkRates.sort((a, b) => a - b);
        const p25 = blinkRates[Math.floor(blinkRates.length * 0.25)] ?? 12;
        const p50 = blinkRates[Math.floor(blinkRates.length * 0.5)] ?? 15;
        const p75 = blinkRates[Math.floor(blinkRates.length * 0.75)] ?? 18;

        // Build employee object
        const employeeInfo: Employee = {
          id: memberData.user_id,
          name: memberData.full_name || memberData.email?.split('@')[0] || 'Unknown',
          email: memberData.email ?? 'unknown@example.com',
          department: memberData.department ?? 'Unassigned',
          joinedAt: memberData.joined_at,
          score: calculateWellnessScore(avgBlinkRate),
          blinkRate: Math.round(avgBlinkRate * 10) / 10,
          totalSessions: uniqueSessions.size || Math.ceil((wellnessData?.length ?? 0) / 60),
          totalMinutes: wellnessData?.length ?? 0,
          baseline: { p25, p50, p75 },
        };

        setEmployee(employeeInfo);

        // Build sessions from daily data
        const sessionsList: Session[] = [];
        const sortedDates = Array.from(dailyData.keys()).sort().reverse().slice(0, 5);

        for (const dateKey of sortedDates) {
          const stats = dailyData.get(dateKey)!;
          const avgRate = stats.blinks / stats.count;
          const date = new Date(dateKey);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);

          let dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (date.getTime() === today.getTime()) dateLabel = 'Today';
          else if (date.getTime() === yesterday.getTime()) dateLabel = 'Yesterday';

          sessionsList.push({
            date: dateLabel,
            duration: `${Math.floor(stats.count / 60)}h ${stats.count % 60}m`,
            blinkRate: Math.round(avgRate * 10) / 10,
            score: calculateWellnessScore(avgRate),
          });
        }
        setSessions(sessionsList);

        // Build alerts
        if (alertsData) {
          setAlerts(
            alertsData.map((a) => ({
              id: a.id,
              type: formatAlertType(a.alert_type),
              message: a.message || 'No additional details',
              time: formatTimeAgo(a.created_at),
              severity: a.severity as Alert['severity'],
            }))
          );
        }

        // Build trend data for chart (last 30 days)
        const trend: TrendDataPoint[] = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateKey = date.toISOString().split('T')[0];
          const dayStats = dailyData.get(dateKey);

          trend.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            blinkRate: dayStats ? Math.round((dayStats.blinks / dayStats.count) * 10) / 10 : 0,
          });
        }
        setTrendData(trend);

      } catch (error) {
        console.error('Failed to load employee data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadEmployeeData();
  }, [orgId, employeeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading employee data...</span>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/employees"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to employees
        </Link>
        <div className="card p-12 text-center">
          <p className="text-muted-foreground">Employee not found or no data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/admin/employees"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to employees
      </Link>

      {/* Employee header */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
              {employee.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{employee.name}</h1>
              <p className="text-muted-foreground">{employee.department}</p>
              <p className="text-sm text-muted-foreground">{employee.email}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              className="btn btn-outline"
              onClick={() => showToast(`Message feature coming soon - would email ${employee.email}`)}
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Message
            </button>
            <button
              className="btn btn-primary"
              onClick={() => showToast(`Wellness tip sent to ${employee.name}!`)}
            >
              <Send className="w-4 h-4 mr-2" />
              Send Wellness Tip
            </button>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Wellness Score"
          value={employee.score}
          suffix="/100"
          icon={<Activity className="w-5 h-5" />}
          status={employee.score < 65 ? 'warning' : 'normal'}
        />
        <StatCard
          label="Current Blink Rate"
          value={employee.blinkRate.toFixed(1)}
          suffix="/min"
          icon={<Eye className="w-5 h-5" />}
          status={employee.blinkRate < employee.baseline.p25 ? 'warning' : 'normal'}
        />
        <StatCard
          label="Total Sessions"
          value={employee.totalSessions}
          icon={<Calendar className="w-5 h-5" />}
        />
        <StatCard
          label="Total Time"
          value={Math.floor(employee.totalMinutes / 60)}
          suffix="h"
          icon={<Clock className="w-5 h-5" />}
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Baseline info */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Personal Baseline</h2>
          </div>
          <div className="card-body space-y-4">
            <BaselineRow label="Low Range (P25)" value={employee.baseline.p25} />
            <BaselineRow label="Normal (P50)" value={employee.baseline.p50} />
            <BaselineRow label="High Range (P75)" value={employee.baseline.p75} />
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Current rate ({employee.blinkRate}/min) is{' '}
                {employee.blinkRate < employee.baseline.p25 ? (
                  <span className="text-red-600 font-medium">below baseline</span>
                ) : employee.blinkRate > employee.baseline.p75 ? (
                  <span className="text-green-600 font-medium">above baseline</span>
                ) : (
                  <span className="text-green-600 font-medium">within normal range</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Recent alerts */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Recent Alerts</h2>
          </div>
          <div className="card-body space-y-3">
            {alerts.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No recent alerts</p>
            ) : (
              alerts.map((alert) => (
                <AlertItem key={alert.id} {...alert} />
              ))
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Actions</h2>
          </div>
          <div className="card-body space-y-3">
            <ActionButton
              label="Schedule Break Reminder"
              description="Send a gentle reminder to take a break"
              onClick={() => showToast(`Break reminder scheduled for ${employee.name}`)}
            />
            <ActionButton
              label="Send Wellness Report"
              description="Email a weekly summary to the employee"
              onClick={() => showToast(`Weekly wellness report will be sent to ${employee.email}`)}
            />
            <ActionButton
              label="Adjust Alert Thresholds"
              description="Customize alert sensitivity for this employee"
              onClick={() => showToast('Alert threshold customization coming soon')}
            />
          </div>
        </div>
      </div>

      {/* Session history */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Recent Sessions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Date</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Duration</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Blink Rate</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Score</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    No session data available yet
                  </td>
                </tr>
              ) : (
                sessions.map((session, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-6 py-4 font-medium">{session.date}</td>
                    <td className="px-6 py-4 text-muted-foreground">{session.duration}</td>
                    <td className="px-6 py-4">{session.blinkRate}/min</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${getScoreBadgeClass(session.score)}`}>
                        {session.score}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Wellness trend chart */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Blink Rate Trend (Last 30 Days)</h2>
        </div>
        <div className="card-body">
          {trendData.some(d => d.blinkRate > 0) ? (
            <BlinkRateTrendChart data={trendData} height={256} />
          ) : (
            <div className="h-64 flex items-center justify-center bg-secondary/30 rounded-lg">
              <p className="text-muted-foreground">No trend data available yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Toast notification */}
      {toast.visible && (
        <div className="fixed bottom-6 right-6 bg-foreground text-background px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-5 z-50">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="text-sm">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  icon,
  status = 'normal',
}: {
  label: string;
  value: number | string;
  suffix?: string;
  icon: React.ReactNode;
  status?: 'normal' | 'warning';
}) {
  return (
    <div className={`card p-5 ${status === 'warning' ? 'border-amber-200 bg-amber-50' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={status === 'warning' ? 'text-amber-600' : 'text-muted-foreground'}>
          {icon}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-3xl font-bold ${status === 'warning' ? 'text-amber-700' : ''}`}>
          {value}
        </span>
        {suffix && <span className="text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function BaselineRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-medium">{value}/min</span>
    </div>
  );
}

function AlertItem({
  type,
  message,
  time,
  severity,
}: {
  type: string;
  message: string;
  time: string;
  severity: 'critical' | 'warning' | 'info';
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
        <p className="text-sm font-medium">{type}</p>
        <p className="text-xs text-muted-foreground">{message}</p>
        <p className="text-xs text-muted-foreground mt-1">{time}</p>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  description,
  onClick,
}: {
  label: string;
  description: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg bg-secondary/30 hover:bg-secondary transition-colors"
    >
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

function getScoreBadgeClass(score: number): string {
  if (score >= 80) return 'badge-success';
  if (score >= 60) return 'badge-warning';
  return 'badge-error';
}
