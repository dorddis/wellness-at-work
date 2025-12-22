'use client';

import { useEffect, useState } from 'react';
import {
  Plug,
  Check,
  X,
  AlertCircle,
  Clock,
  RefreshCw,
  Settings,
  Loader2,
  Calendar,
  MessageSquare,
  Users,
  Briefcase,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../../providers';
import {
  getOrgIntegrations,
  connectIntegration,
  updateIntegrationConfig,
  disconnectIntegration,
  type Integration,
} from '@lumina/api';

type IntegrationType =
  | 'google_calendar'
  | 'microsoft_calendar'
  | 'slack'
  | 'microsoft_teams'
  | 'bamboohr'
  | 'workday';

interface IntegrationInfo {
  type: IntegrationType;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'calendar' | 'communication' | 'hr';
  features: string[];
}

const integrationCatalog: IntegrationInfo[] = [
  {
    type: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sync breaks and wellness events with Google Calendar',
    icon: <Calendar className="w-8 h-8" />,
    category: 'calendar',
    features: ['Auto-block breaks in calendar', 'Meeting detection', 'Smart scheduling'],
  },
  {
    type: 'microsoft_calendar',
    name: 'Microsoft Outlook',
    description: 'Integrate with Outlook calendar for seamless break scheduling',
    icon: <Calendar className="w-8 h-8" />,
    category: 'calendar',
    features: ['Outlook break events', 'Teams presence sync', 'Focus time integration'],
  },
  {
    type: 'slack',
    name: 'Slack',
    description: 'Send wellness reminders and team updates to Slack channels',
    icon: <MessageSquare className="w-8 h-8" />,
    category: 'communication',
    features: ['Break reminders', 'Team leaderboards', 'Status updates'],
  },
  {
    type: 'microsoft_teams',
    name: 'Microsoft Teams',
    description: 'Integrate wellness notifications with Microsoft Teams',
    icon: <Users className="w-8 h-8" />,
    category: 'communication',
    features: ['Teams notifications', 'Channel updates', 'Presence sync'],
  },
  {
    type: 'bamboohr',
    name: 'BambooHR',
    description: 'Sync employee data and departments from BambooHR',
    icon: <Briefcase className="w-8 h-8" />,
    category: 'hr',
    features: ['Employee sync', 'Department mapping', 'Org structure'],
  },
  {
    type: 'workday',
    name: 'Workday',
    description: 'Import employee information from Workday',
    icon: <Briefcase className="w-8 h-8" />,
    category: 'hr',
    features: ['Employee directory', 'Manager hierarchy', 'Department data'],
  },
];

const statusColors: Record<string, string> = {
  connected: 'bg-green-100 text-green-700',
  disconnected: 'bg-gray-100 text-gray-700',
  error: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
};

const statusIcons: Record<string, React.ReactNode> = {
  connected: <Check className="w-4 h-4" />,
  disconnected: <X className="w-4 h-4" />,
  error: <AlertCircle className="w-4 h-4" />,
  pending: <Clock className="w-4 h-4" />,
};

export default function IntegrationsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState<Integration | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!user?.organization?.id) return;

      try {
        setLoading(true);
        const data = await getOrgIntegrations(user.organization.id);
        setIntegrations(data);
      } catch (error) {
        console.error('Failed to load integrations:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  const handleConnect = async (type: IntegrationType) => {
    if (!user?.organization?.id) return;
    setActionLoading(type);
    try {
      // In production, this would initiate OAuth flow
      // For now, show a message
      await connectIntegration(user.organization.id, type);
      alert(`OAuth flow for ${type} would start here. This is a demo - integration marked as pending.`);

      // Refresh integrations
      const updated = await getOrgIntegrations(user.organization.id);
      setIntegrations(updated);
    } catch (error) {
      console.error('Failed to connect:', error);
      alert('Failed to initiate connection. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (integration: Integration) => {
    if (!user?.organization?.id) return;
    if (!confirm(`Are you sure you want to disconnect ${integration.integrationType.replace('_', ' ')}?`)) {
      return;
    }

    setActionLoading(integration.id);
    try {
      await disconnectIntegration(integration.id);

      // Refresh integrations
      const updated = await getOrgIntegrations(user.organization.id);
      setIntegrations(updated);
    } catch (error) {
      console.error('Failed to disconnect:', error);
      alert('Failed to disconnect integration. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateConfig = async (integration: Integration, config: Record<string, boolean>) => {
    if (!user?.organization?.id) return;
    setActionLoading(integration.id);
    try {
      await updateIntegrationConfig(integration.id, config);

      // Refresh integrations
      const updated = await getOrgIntegrations(user.organization.id);
      setIntegrations(updated);
      setShowConfigModal(null);
    } catch (error) {
      console.error('Failed to update config:', error);
      alert('Failed to update configuration. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  // Get integration status for a type
  const getIntegration = (type: IntegrationType): Integration | undefined => {
    return integrations.find((i) => i.integrationType === type);
  };

  // Group by category
  const calendarIntegrations = integrationCatalog.filter((i) => i.category === 'calendar');
  const commIntegrations = integrationCatalog.filter((i) => i.category === 'communication');
  const hrIntegrations = integrationCatalog.filter((i) => i.category === 'hr');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading integrations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Connect Lumina with your existing tools and workflows
        </p>
      </div>

      {/* Connected count */}
      <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg">
        <Plug className="w-6 h-6 text-primary" />
        <div>
          <p className="font-medium">
            {integrations.filter((i) => i.status === 'connected').length} of {integrationCatalog.length} integrations connected
          </p>
          <p className="text-sm text-muted-foreground">
            Connect services to enhance your team's wellness workflow
          </p>
        </div>
      </div>

      {/* Calendar Integrations */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          Calendar
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {calendarIntegrations.map((info) => (
            <IntegrationCard
              key={info.type}
              info={info}
              integration={getIntegration(info.type)}
              loading={actionLoading === info.type || actionLoading === getIntegration(info.type)?.id}
              onConnect={() => handleConnect(info.type)}
              onDisconnect={() => {
                const integration = getIntegration(info.type);
                if (integration) handleDisconnect(integration);
              }}
              onConfigure={() => {
                const integration = getIntegration(info.type);
                if (integration) setShowConfigModal(integration);
              }}
            />
          ))}
        </div>
      </div>

      {/* Communication Integrations */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-muted-foreground" />
          Communication
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {commIntegrations.map((info) => (
            <IntegrationCard
              key={info.type}
              info={info}
              integration={getIntegration(info.type)}
              loading={actionLoading === info.type || actionLoading === getIntegration(info.type)?.id}
              onConnect={() => handleConnect(info.type)}
              onDisconnect={() => {
                const integration = getIntegration(info.type);
                if (integration) handleDisconnect(integration);
              }}
              onConfigure={() => {
                const integration = getIntegration(info.type);
                if (integration) setShowConfigModal(integration);
              }}
            />
          ))}
        </div>
      </div>

      {/* HR Integrations */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-muted-foreground" />
          HR Systems
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hrIntegrations.map((info) => (
            <IntegrationCard
              key={info.type}
              info={info}
              integration={getIntegration(info.type)}
              loading={actionLoading === info.type || actionLoading === getIntegration(info.type)?.id}
              onConnect={() => handleConnect(info.type)}
              onDisconnect={() => {
                const integration = getIntegration(info.type);
                if (integration) handleDisconnect(integration);
              }}
              onConfigure={() => {
                const integration = getIntegration(info.type);
                if (integration) setShowConfigModal(integration);
              }}
            />
          ))}
        </div>
      </div>

      {/* Configuration Modal */}
      {showConfigModal && (
        <ConfigModal
          integration={showConfigModal}
          onClose={() => setShowConfigModal(null)}
          onSave={(config) => handleUpdateConfig(showConfigModal, config)}
          loading={actionLoading === showConfigModal.id}
        />
      )}
    </div>
  );
}

function IntegrationCard({
  info,
  integration,
  loading,
  onConnect,
  onDisconnect,
  onConfigure,
}: {
  info: IntegrationInfo;
  integration?: Integration;
  loading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onConfigure: () => void;
}) {
  const isConnected = integration?.status === 'connected';
  const hasError = integration?.status === 'error';

  return (
    <div className={`card p-5 ${hasError ? 'border-red-200' : ''}`}>
      <div className="flex items-start gap-4">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isConnected ? 'bg-green-100 text-green-600' : 'bg-secondary text-muted-foreground'
        }`}>
          {info.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{info.name}</h3>
            {integration && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[integration.status]}`}>
                {statusIcons[integration.status]}
                {integration.status}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-3">{info.description}</p>

          {/* Features */}
          <div className="flex flex-wrap gap-2 mb-4">
            {info.features.map((feature) => (
              <span key={feature} className="px-2 py-0.5 text-xs bg-secondary rounded-full text-muted-foreground">
                {feature}
              </span>
            ))}
          </div>

          {/* Error message */}
          {integration?.errorMessage && (
            <div className="mb-3 p-2 bg-red-50 rounded-md text-sm text-red-600 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{integration.errorMessage}</span>
            </div>
          )}

          {/* Last synced */}
          {integration?.lastSyncedAt && (
            <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              Last synced: {new Date(integration.lastSyncedAt).toLocaleString()}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <button
                  onClick={onConfigure}
                  className="btn btn-outline text-sm py-1.5 flex items-center gap-1"
                >
                  <Settings className="w-4 h-4" />
                  Configure
                </button>
                <button
                  onClick={onDisconnect}
                  disabled={loading}
                  className="btn btn-outline text-sm py-1.5 text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={onConnect}
                disabled={loading}
                className="btn btn-primary text-sm py-1.5 flex items-center gap-1"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                Connect
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigModal({
  integration,
  onClose,
  onSave,
  loading,
}: {
  integration: Integration;
  onClose: () => void;
  onSave: (config: Record<string, boolean>) => void;
  loading: boolean;
}) {
  const [config, setConfig] = useState<Record<string, boolean>>(
    (integration.config as Record<string, boolean>) ?? {}
  );

  // Default config options based on integration type
  const configOptions: Record<string, { label: string; description: string }[]> = {
    google_calendar: [
      { label: 'syncBreaks', description: 'Add breaks to Google Calendar' },
      { label: 'blockCalendar', description: 'Block calendar during breaks' },
      { label: 'detectMeetings', description: 'Skip breaks during meetings' },
    ],
    microsoft_calendar: [
      { label: 'syncBreaks', description: 'Add breaks to Outlook Calendar' },
      { label: 'blockCalendar', description: 'Block calendar during breaks' },
      { label: 'syncPresence', description: 'Sync with Teams presence' },
    ],
    slack: [
      { label: 'breakReminders', description: 'Send break reminders to users' },
      { label: 'teamUpdates', description: 'Post team wellness updates' },
      { label: 'leaderboard', description: 'Share weekly leaderboard' },
    ],
    microsoft_teams: [
      { label: 'breakReminders', description: 'Send break reminders' },
      { label: 'channelUpdates', description: 'Post to wellness channel' },
      { label: 'presenceSync', description: 'Sync break status to presence' },
    ],
    bamboohr: [
      { label: 'syncEmployees', description: 'Auto-sync employee directory' },
      { label: 'syncDepartments', description: 'Sync department structure' },
      { label: 'syncManagers', description: 'Sync manager hierarchy' },
    ],
    workday: [
      { label: 'syncEmployees', description: 'Import employee data' },
      { label: 'syncDepartments', description: 'Import departments' },
      { label: 'dailySync', description: 'Enable daily auto-sync' },
    ],
  };

  const options = configOptions[integration.integrationType] ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold">
            Configure {integration.integrationType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {options.map((option) => (
            <label key={option.label} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config[option.label] ?? true}
                onChange={(e) => setConfig({ ...config, [option.label]: e.target.checked })}
                className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <div>
                <p className="font-medium text-sm">{option.description}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="btn btn-outline flex-1">
            Cancel
          </button>
          <button
            onClick={() => onSave(config)}
            disabled={loading}
            className="btn btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
