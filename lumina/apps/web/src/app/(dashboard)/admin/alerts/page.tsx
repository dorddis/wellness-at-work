'use client';

import { useState, useEffect } from 'react';
import { Filter, CheckCircle, AlertTriangle, Info, Clock } from 'lucide-react';
import { useAuth } from '../../../contexts/auth-context';
import { getSupabase } from '@lumina/api';

interface Alert {
  id: string;
  userId: string | null;
  alertType: string;
  severity: 'critical' | 'warning' | 'info';
  message: string | null;
  createdAt: string;
  acknowledged: boolean;
}

export default function AlertsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unacknowledged' | 'acknowledged'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAlerts() {
      if (!user?.organization?.id) return;

      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('org_alerts')
          .select('*')
          .eq('org_id', user.organization.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) {
          console.error('Failed to load alerts:', error);
          return;
        }

        setAlerts(
          (data || []).map((d) => ({
            id: d.id,
            userId: d.user_id,
            alertType: d.alert_type,
            severity: d.severity as Alert['severity'],
            message: d.message,
            createdAt: d.created_at,
            acknowledged: d.acknowledged,
          }))
        );
      } catch (error) {
        console.error('Failed to load alerts:', error);
      } finally {
        setLoading(false);
      }
    }

    loadAlerts();
  }, [user]);

  const filteredAlerts = alerts.filter((alert) => {
    const matchesAckFilter =
      filter === 'all' ||
      (filter === 'unacknowledged' && !alert.acknowledged) ||
      (filter === 'acknowledged' && alert.acknowledged);
    const matchesSeverity =
      severityFilter === 'all' || alert.severity === severityFilter;
    return matchesAckFilter && matchesSeverity;
  });

  const handleAcknowledge = async (id: string) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('org_alerts')
        .update({ acknowledged: true })
        .eq('id', id);

      if (error) {
        console.error('Failed to acknowledge alert:', error);
        return;
      }

      setAlerts(alerts.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const handleAcknowledgeAll = async () => {
    if (!user?.organization?.id) return;

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('org_alerts')
        .update({ acknowledged: true })
        .eq('org_id', user.organization.id)
        .eq('acknowledged', false);

      if (error) {
        console.error('Failed to acknowledge all alerts:', error);
        return;
      }

      setAlerts(alerts.map((a) => ({ ...a, acknowledged: true })));
    } catch (error) {
      console.error('Failed to acknowledge all alerts:', error);
    }
  };

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alerts</h1>
          <p className="text-muted-foreground">
            {unacknowledgedCount} unacknowledged alerts
          </p>
        </div>
        {unacknowledgedCount > 0 && (
          <button onClick={handleAcknowledgeAll} className="btn btn-outline">
            <CheckCircle className="w-4 h-4 mr-2" />
            Acknowledge All
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Critical"
          value={alerts.filter((a) => a.severity === 'critical' && !a.acknowledged).length}
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
          color="text-red-600"
        />
        <StatCard
          label="Warning"
          value={alerts.filter((a) => a.severity === 'warning' && !a.acknowledged).length}
          icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
          color="text-amber-600"
        />
        <StatCard
          label="Info"
          value={alerts.filter((a) => a.severity === 'info' && !a.acknowledged).length}
          icon={<Info className="w-5 h-5 text-blue-500" />}
          color="text-blue-600"
        />
        <StatCard
          label="Total"
          value={alerts.length}
          icon={<Clock className="w-5 h-5 text-muted-foreground" />}
          color="text-foreground"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="input w-48"
          >
            <option value="all">All Alerts</option>
            <option value="unacknowledged">Unacknowledged</option>
            <option value="acknowledged">Acknowledged</option>
          </select>
        </div>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as typeof severityFilter)}
          className="input w-40"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
      </div>

      {/* Alerts list */}
      <div className="card">
        <div className="divide-y divide-border">
          {filteredAlerts.map((alert) => (
            <AlertRow
              key={alert.id}
              alertType={alert.alertType}
              message={alert.message || 'No message'}
              severity={alert.severity}
              createdAt={alert.createdAt}
              acknowledged={alert.acknowledged}
              onAcknowledge={() => handleAcknowledge(alert.id)}
            />
          ))}
        </div>

        {filteredAlerts.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            {alerts.length === 0 ? 'No alerts yet.' : 'No alerts matching your filters.'}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
        {icon}
      </div>
    </div>
  );
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

function AlertRow({
  alertType,
  message,
  severity,
  createdAt,
  acknowledged,
  onAcknowledge,
}: {
  alertType: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  createdAt: string;
  acknowledged: boolean;
  onAcknowledge: () => void;
}) {
  const severityStyles = {
    critical: { bg: 'bg-red-50', border: 'border-l-red-500', icon: 'text-red-500' },
    warning: { bg: 'bg-amber-50', border: 'border-l-amber-500', icon: 'text-amber-500' },
    info: { bg: 'bg-blue-50', border: 'border-l-blue-500', icon: 'text-blue-500' },
  }[severity];

  return (
    <div
      className={`flex items-start gap-4 p-4 border-l-4 ${severityStyles.border} ${
        acknowledged ? 'opacity-60' : severityStyles.bg
      }`}
    >
      <AlertTriangle className={`w-5 h-5 mt-0.5 ${severityStyles.icon}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium">{formatAlertType(alertType)}</p>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm text-muted-foreground">{formatTimeAgo(createdAt)}</p>
            {!acknowledged && (
              <button
                onClick={onAcknowledge}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Acknowledge
              </button>
            )}
            {acknowledged && (
              <span className="inline-flex items-center gap-1 mt-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                Acknowledged
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
