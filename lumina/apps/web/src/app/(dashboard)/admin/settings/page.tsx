'use client';

import { useState, useEffect } from 'react';
import { Save, Copy, RefreshCw, Shield, Bell, Users, Eye, Loader2 } from 'lucide-react';
import { getOrgSettings, updateOrgSettings, type OrgSettings as ApiOrgSettings, type AlertSettings } from '@lumina/api';
import { useAuth } from '../../../providers';

type PrivacyMode = 'anonymous' | 'named' | 'manager_only';

interface OrgSettings {
  orgName: string;
  slug: string;
  privacyMode: PrivacyMode;
  inviteCode: string;
  alertSettings: {
    lowBlinkThreshold: number;
    lowBlinkDuration: number;
    sessionAlertHours: number;
    emailNotifications: boolean;
    inAppNotifications: boolean;
  };
}

// Default settings (shown while loading)
const defaultSettings: OrgSettings = {
  orgName: '',
  slug: '',
  privacyMode: 'anonymous',
  inviteCode: '',
  alertSettings: {
    lowBlinkThreshold: 10,
    lowBlinkDuration: 10,
    sessionAlertHours: 3,
    emailNotifications: true,
    inAppNotifications: true,
  },
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<OrgSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const orgId = user?.organization?.id;

  // Fetch settings on mount
  useEffect(() => {
    async function loadSettings() {
      if (!orgId) return;

      try {
        const orgSettings = await getOrgSettings(orgId);
        if (orgSettings) {
          setSettings({
            orgName: orgSettings.name,
            slug: orgSettings.slug,
            privacyMode: orgSettings.privacyMode,
            inviteCode: orgSettings.slug.toUpperCase(), // Use slug as invite code
            alertSettings: orgSettings.alertSettings ?? defaultSettings.alertSettings,
          });
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, [orgId]);

  const handleSave = async () => {
    if (!orgId) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const result = await updateOrgSettings(orgId, {
        name: settings.orgName,
        slug: settings.slug,
        privacyMode: settings.privacyMode,
        alertSettings: settings.alertSettings,
      });

      if (result.success) {
        setSaveMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        setSaveMessage({ type: 'error', text: result.error || 'Failed to save settings' });
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'An error occurred while saving' });
    } finally {
      setIsSaving(false);
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading settings...</span>
      </div>
    );
  }

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(settings.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateCode = async () => {
    if (!orgId) return;

    // Generate new invite code (random 8-char alphanumeric)
    const newSlug = Math.random().toString(36).substring(2, 10).toLowerCase();
    const newCode = newSlug.toUpperCase();

    try {
      // Save the new slug to Supabase immediately
      const result = await updateOrgSettings(orgId, {
        slug: newSlug,
      });

      if (result.success) {
        setSettings({ ...settings, slug: newSlug, inviteCode: newCode });
        setSaveMessage({ type: 'success', text: 'Invite code regenerated!' });
      } else {
        setSaveMessage({ type: 'error', text: result.error || 'Failed to regenerate code' });
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to regenerate code' });
    }

    setTimeout(() => setSaveMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organization Settings</h1>
          <p className="text-muted-foreground">Manage your organization preferences</p>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span className={`text-sm ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {saveMessage.text}
            </span>
          )}
          <button onClick={handleSave} disabled={isSaving} className="btn btn-primary">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* General settings */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            General
          </h2>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Organization Name</label>
              <input
                type="text"
                value={settings.orgName}
                onChange={(e) => setSettings({ ...settings, orgName: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Slug (URL)</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-border bg-secondary text-muted-foreground text-sm">
                  lumina.app/
                </span>
                <input
                  type="text"
                  value={settings.slug}
                  onChange={(e) => setSettings({ ...settings, slug: e.target.value })}
                  className="input rounded-l-none flex-1"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invite code */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Employee Onboarding
          </h2>
        </div>
        <div className="card-body">
          <label className="label">Invite Code</label>
          <p className="text-sm text-muted-foreground mb-3">
            Share this code with employees to join your organization.
          </p>
          <div className="flex gap-2">
            <div className="flex-1 flex">
              <input
                type="text"
                value={settings.inviteCode}
                readOnly
                className="input font-mono text-lg tracking-wider"
              />
            </div>
            <button onClick={handleCopyInvite} className="btn btn-outline">
              <Copy className="w-4 h-4 mr-2" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button onClick={handleRegenerateCode} className="btn btn-outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </button>
          </div>
        </div>
      </div>

      {/* Privacy settings */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Privacy Mode
          </h2>
        </div>
        <div className="card-body">
          <p className="text-sm text-muted-foreground mb-4">
            Control how employee data is displayed to managers and admins.
          </p>
          <div className="space-y-3">
            <PrivacyOption
              value="anonymous"
              current={settings.privacyMode}
              title="Anonymous"
              description="Show team-level aggregates only. Individual data is never visible."
              onChange={(v) => setSettings({ ...settings, privacyMode: v })}
            />
            <PrivacyOption
              value="named"
              current={settings.privacyMode}
              title="Named"
              description="Admins and managers can see individual employee data and reports."
              onChange={(v) => setSettings({ ...settings, privacyMode: v })}
            />
            <PrivacyOption
              value="manager_only"
              current={settings.privacyMode}
              title="Manager Only"
              description="Only direct managers can see their team members' data."
              onChange={(v) => setSettings({ ...settings, privacyMode: v })}
            />
          </div>
        </div>
      </div>

      {/* Alert settings */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Alert Thresholds
          </h2>
        </div>
        <div className="card-body space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Low Blink Rate Threshold
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="5"
                  max="15"
                  value={settings.alertSettings.lowBlinkThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      alertSettings: {
                        ...settings.alertSettings,
                        lowBlinkThreshold: parseInt(e.target.value),
                      },
                    })
                  }
                  className="flex-1"
                />
                <span className="w-20 text-right font-medium">
                  {settings.alertSettings.lowBlinkThreshold}/min
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Alert when blink rate drops below this value
              </p>
            </div>

            <div>
              <label className="label">Duration Before Alert</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="5"
                  value={settings.alertSettings.lowBlinkDuration}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      alertSettings: {
                        ...settings.alertSettings,
                        lowBlinkDuration: parseInt(e.target.value),
                      },
                    })
                  }
                  className="flex-1"
                />
                <span className="w-20 text-right font-medium">
                  {settings.alertSettings.lowBlinkDuration} min
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                How long before triggering an alert
              </p>
            </div>

            <div>
              <label className="label">Extended Session Alert</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="6"
                  value={settings.alertSettings.sessionAlertHours}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      alertSettings: {
                        ...settings.alertSettings,
                        sessionAlertHours: parseInt(e.target.value),
                      },
                    })
                  }
                  className="flex-1"
                />
                <span className="w-20 text-right font-medium">
                  {settings.alertSettings.sessionAlertHours} hours
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Alert when no break taken for this duration
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="font-medium mb-4">Notification Channels</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.alertSettings.emailNotifications}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      alertSettings: {
                        ...settings.alertSettings,
                        emailNotifications: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded border-border"
                />
                <span>Email notifications for critical alerts</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.alertSettings.inAppNotifications}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      alertSettings: {
                        ...settings.alertSettings,
                        inAppNotifications: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded border-border"
                />
                <span>In-app notifications for all alerts</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrivacyOption({
  value,
  current,
  title,
  description,
  onChange,
}: {
  value: 'anonymous' | 'named' | 'manager_only';
  current: string;
  title: string;
  description: string;
  onChange: (v: typeof value) => void;
}) {
  const isSelected = current === value;

  return (
    <label
      className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50'
      }`}
    >
      <input
        type="radio"
        name="privacyMode"
        value={value}
        checked={isSelected}
        onChange={() => onChange(value)}
        className="mt-1"
      />
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </label>
  );
}
