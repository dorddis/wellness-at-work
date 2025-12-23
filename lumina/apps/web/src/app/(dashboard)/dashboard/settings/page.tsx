'use client';

import { useState, useEffect } from 'react';
import {
  User,
  Bell,
  Moon,
  Shield,
  Download,
  Trash2,
  LogOut,
  Loader2,
  AlertTriangle,
  Clock,
  Calendar,
  FileText,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../../../providers';
import {
  exportUserData,
  requestAccountDeletion,
  submitDataAccessRequest,
  getMyDataAccessRequests,
  type ExportFormat,
  type DataRequestType,
  type DataAccessRequest,
} from '@lumina/api';

interface UserSettings {
  displayName: string;
  emailNotifications: boolean;
  browserNotifications: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  respectSystemDnd: boolean;
  calendarIntegration: boolean;
}

const defaultSettings: UserSettings = {
  displayName: '',
  emailNotifications: true,
  browserNotifications: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  respectSystemDnd: true,
  calendarIntegration: false,
};

export default function UserSettingsPage() {
  const { user, signOut } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');

  // Clear cache state
  const [showClearCacheConfirm, setShowClearCacheConfirm] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletionScheduled, setDeletionScheduled] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Data access request state
  const [showDataRequestForm, setShowDataRequestForm] = useState(false);
  const [dataRequestType, setDataRequestType] = useState<DataRequestType>('access');
  const [dataRequestDetails, setDataRequestDetails] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [dataRequests, setDataRequests] = useState<DataAccessRequest[]>([]);
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('lumina-user-settings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
      } catch {
        // Use defaults
      }
    }
    // Set display name from user email if not set
    if (user?.email) {
      setSettings((prev) => ({
        ...prev,
        displayName: prev.displayName || user.email.split('@')[0],
      }));
    }
    setIsLoading(false);
  }, [user]);

  // Load data access requests
  useEffect(() => {
    async function loadRequests() {
      if (!user?.id) return;
      const result = await getMyDataAccessRequests(user.id);
      if (result.success && result.requests) {
        setDataRequests(result.requests);
      }
    }
    loadRequests();
  }, [user?.id]);

  const handleSubmitDataRequest = async () => {
    if (!user?.id) return;

    setIsSubmittingRequest(true);
    try {
      const result = await submitDataAccessRequest(
        user.id,
        dataRequestType,
        dataRequestDetails || undefined
      );
      if (result.success) {
        setRequestSuccess(true);
        setDataRequestDetails('');
        // Refresh the requests list
        const refreshResult = await getMyDataAccessRequests(user.id);
        if (refreshResult.success && refreshResult.requests) {
          setDataRequests(refreshResult.requests);
        }
        setTimeout(() => {
          setShowDataRequestForm(false);
          setRequestSuccess(false);
        }, 2000);
      } else {
        alert('Failed to submit request: ' + result.error);
      }
    } catch (error) {
      console.error('Request error:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Save to localStorage
      localStorage.setItem('lumina-user-settings', JSON.stringify(settings));
      setSaveMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportData = async () => {
    if (!user?.id) return;

    setIsExporting(true);
    try {
      const result = await exportUserData(user.id, exportFormat);

      if (!result.success) {
        console.error('Export failed:', result.error);
        alert('Failed to export data. Please try again.');
        return;
      }

      const dateStr = new Date().toISOString().split('T')[0];

      if (exportFormat === 'json' && result.data) {
        // Download single JSON file with all data
        downloadFile(
          JSON.stringify(result.data, null, 2),
          `lumina-wellness-data-${dateStr}.json`,
          'application/json'
        );
      } else if (exportFormat === 'csv' && result.csv) {
        // Download multiple CSV files
        const csvFiles = [
          { name: 'wellness-data', content: result.csv.wellnessData },
          { name: 'break-events', content: result.csv.breakEvents },
          { name: 'exercise-sessions', content: result.csv.exerciseSessions },
          { name: 'alerts', content: result.csv.alerts },
        ].filter(f => f.content); // Only non-empty files

        if (csvFiles.length === 0) {
          alert('No data to export.');
          return;
        }

        // Download each CSV file with a small delay to avoid browser blocking
        for (let i = 0; i < csvFiles.length; i++) {
          const file = csvFiles[i];
          await new Promise(resolve => setTimeout(resolve, i * 200));
          downloadFile(
            file.content,
            `lumina-${file.name}-${dateStr}.csv`,
            'text/csv'
          );
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearCache = () => {
    setIsClearingCache(true);
    try {
      // Clear all Lumina-related localStorage items
      const keysToRemove = Object.keys(localStorage).filter((key) =>
        key.startsWith('lumina-')
      );
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      setShowClearCacheConfirm(false);
      setSaveMessage({ type: 'success', text: 'Local cache cleared successfully!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to clear cache' });
    } finally {
      setIsClearingCache(false);
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
        setDeleteConfirmText('');
      } else {
        setDeleteError(result.error || 'Failed to schedule deletion');
      }
    } catch {
      setDeleteError('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
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

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span className={`text-sm ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {saveMessage.text}
            </span>
          )}
          <button onClick={handleSave} disabled={isSaving} className="btn btn-primary">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>

      {/* Profile section */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile
          </h2>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Display Name</label>
              <input
                type="text"
                value={settings.displayName}
                onChange={(e) => setSettings({ ...settings, displayName: e.target.value })}
                className="input"
                placeholder="Your name"
              />
              <p className="text-xs text-muted-foreground mt-1">
                How you appear in team challenges and leaderboards
              </p>
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                readOnly
                className="input bg-secondary/30"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Contact support to change your email
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications section */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </h2>
        </div>
        <div className="card-body space-y-4">
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) =>
                  setSettings({ ...settings, emailNotifications: e.target.checked })
                }
                className="w-4 h-4 rounded border-border"
              />
              <div>
                <span className="font-medium">Email notifications</span>
                <p className="text-sm text-muted-foreground">
                  Receive weekly wellness summaries and important alerts
                </p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.browserNotifications}
                onChange={(e) =>
                  setSettings({ ...settings, browserNotifications: e.target.checked })
                }
                className="w-4 h-4 rounded border-border"
              />
              <div>
                <span className="font-medium">Browser notifications</span>
                <p className="text-sm text-muted-foreground">
                  Get notified about breaks and achievements in your browser
                </p>
              </div>
            </label>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Quiet Hours</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.quietHoursEnabled}
                  onChange={(e) =>
                    setSettings({ ...settings, quietHoursEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
            {settings.quietHoursEnabled && (
              <div className="flex items-center gap-3 pl-6">
                <input
                  type="time"
                  value={settings.quietHoursStart}
                  onChange={(e) =>
                    setSettings({ ...settings, quietHoursStart: e.target.value })
                  }
                  className="input w-auto"
                />
                <span className="text-muted-foreground">to</span>
                <input
                  type="time"
                  value={settings.quietHoursEnd}
                  onChange={(e) =>
                    setSettings({ ...settings, quietHoursEnd: e.target.value })
                  }
                  className="input w-auto"
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2 pl-6">
              Pause all notifications during these hours
            </p>
          </div>
        </div>
      </div>

      {/* Do Not Disturb section */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Moon className="w-5 h-5" />
            Do Not Disturb
          </h2>
        </div>
        <div className="card-body space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.respectSystemDnd}
              onChange={(e) =>
                setSettings({ ...settings, respectSystemDnd: e.target.checked })
              }
              className="w-4 h-4 rounded border-border"
            />
            <div>
              <span className="font-medium">Respect system Do Not Disturb</span>
              <p className="text-sm text-muted-foreground">
                Pause alerts when your system DnD is enabled
              </p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer opacity-60">
            <input
              type="checkbox"
              checked={settings.calendarIntegration}
              disabled
              className="w-4 h-4 rounded border-border"
            />
            <div>
              <span className="font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Calendar integration
                <span className="text-xs px-2 py-0.5 bg-secondary rounded-full">Coming soon</span>
              </span>
              <p className="text-sm text-muted-foreground">
                Automatically pause during meetings
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Data & Privacy section */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Data & Privacy
          </h2>
        </div>
        <div className="card-body space-y-4">
          <div className="p-4 rounded-lg bg-secondary/30">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium">Export My Data</h4>
                <p className="text-sm text-muted-foreground">
                  Download your wellness data (last 90 days)
                </p>
              </div>
              <button
                onClick={handleExportData}
                disabled={isExporting}
                className="btn btn-outline"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {isExporting ? 'Exporting...' : 'Export'}
              </button>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Format:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setExportFormat('json')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    exportFormat === 'json'
                      ? 'bg-primary text-white'
                      : 'bg-white border border-border hover:bg-secondary/50'
                  }`}
                >
                  JSON
                </button>
                <button
                  onClick={() => setExportFormat('csv')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    exportFormat === 'csv'
                      ? 'bg-primary text-white'
                      : 'bg-white border border-border hover:bg-secondary/50'
                  }`}
                >
                  CSV
                </button>
              </div>
            </div>
            {exportFormat === 'csv' && (
              <p className="text-xs text-muted-foreground mt-2">
                CSV will download separate files for wellness data, breaks, exercises, and alerts.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
            <div>
              <h4 className="font-medium">Clear Local Cache</h4>
              <p className="text-sm text-muted-foreground">
                Reset all local browser storage (streaks, achievements, preferences)
              </p>
            </div>
            <button
              onClick={() => setShowClearCacheConfirm(true)}
              className="btn btn-outline"
            >
              Clear Cache
            </button>
          </div>

          {/* Data Access Request */}
          <div className="p-4 rounded-lg bg-secondary/30">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Data Access Request
                </h4>
                <p className="text-sm text-muted-foreground">
                  Submit a formal request under GDPR
                </p>
              </div>
              <button
                onClick={() => setShowDataRequestForm(!showDataRequestForm)}
                className="btn btn-outline"
              >
                {showDataRequestForm ? 'Cancel' : 'New Request'}
              </button>
            </div>

            {/* Request Form */}
            {showDataRequestForm && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-border space-y-4">
                {requestSuccess ? (
                  <div className="flex items-center gap-3 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span>Request submitted successfully!</span>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="label text-sm">Request Type</label>
                      <select
                        value={dataRequestType}
                        onChange={(e) => setDataRequestType(e.target.value as DataRequestType)}
                        className="input"
                      >
                        <option value="access">Data Access (view all my data)</option>
                        <option value="portability">Data Portability (transfer to another service)</option>
                        <option value="rectification">Data Rectification (correct inaccurate data)</option>
                      </select>
                    </div>
                    <div>
                      <label className="label text-sm">Additional Details (optional)</label>
                      <textarea
                        value={dataRequestDetails}
                        onChange={(e) => setDataRequestDetails(e.target.value)}
                        placeholder="Describe your request in more detail..."
                        className="input min-h-[80px]"
                        rows={3}
                      />
                    </div>
                    <button
                      onClick={handleSubmitDataRequest}
                      disabled={isSubmittingRequest}
                      className="btn btn-primary"
                    >
                      {isSubmittingRequest ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Request'
                      )}
                    </button>
                    <p className="text-xs text-muted-foreground">
                      We will process your request within 30 days as required by GDPR.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Previous Requests */}
            {dataRequests.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Previous Requests</p>
                <div className="space-y-2">
                  {dataRequests.slice(0, 3).map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between text-sm p-2 bg-white rounded border border-border"
                    >
                      <div className="flex items-center gap-2">
                        <span className="capitalize">{req.requestType}</span>
                        <span className="text-muted-foreground">
                          {new Date(req.requestedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          req.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : req.status === 'processing'
                            ? 'bg-blue-100 text-blue-700'
                            : req.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Account section */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <User className="w-5 h-5" />
            Account
          </h2>
        </div>
        <div className="card-body space-y-4">
          {/* Organization info */}
          {user?.organization && (
            <div className="p-4 rounded-lg bg-secondary/30">
              <p className="text-sm text-muted-foreground">Organization</p>
              <p className="font-medium">{user.organization.name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Role: <span className="capitalize">{user.organization.role}</span>
              </p>
            </div>
          )}

          {/* Sign out */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
            <div>
              <h4 className="font-medium">Sign Out</h4>
              <p className="text-sm text-muted-foreground">
                Sign out of your account on this device
              </p>
            </div>
            <button onClick={signOut} className="btn btn-outline">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-red-200">
        <div className="card-header bg-red-50">
          <h2 className="text-lg font-semibold text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </h2>
        </div>
        <div className="card-body">
          {deletionScheduled && (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 mb-4">
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
                    . Contact support to cancel this request.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start justify-between p-4 rounded-lg bg-red-50/50">
            <div>
              <h4 className="font-medium text-red-800">Delete Account</h4>
              <p className="text-sm text-red-700/80 mt-1">
                Permanently delete your account and all associated data. This action has a 30-day grace period.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={!!deletionScheduled}
              className="btn bg-red-600 text-white hover:bg-red-700 flex-shrink-0"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Clear cache confirmation modal */}
      {showClearCacheConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Clear Local Cache?</h3>
            <p className="text-muted-foreground mb-4">
              This will reset all locally stored data including:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mb-6 space-y-1">
              <li>Streak progress</li>
              <li>Achievement badges</li>
              <li>Local preferences</li>
            </ul>
            <p className="text-sm text-muted-foreground mb-6">
              Your cloud-synced wellness data will not be affected.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="btn btn-outline"
                onClick={() => setShowClearCacheConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleClearCache}
                disabled={isClearingCache}
              >
                {isClearingCache ? 'Clearing...' : 'Clear Cache'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete account confirmation modal */}
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
            <p className="text-sm text-muted-foreground mb-4">
              You can cancel this request within 30 days by contacting support.
            </p>
            <div className="mb-4">
              <label className="label text-sm">
                Type <span className="font-mono font-bold">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="input"
              />
            </div>
            {deleteError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 mb-4">
                <p className="text-sm text-red-700">{deleteError}</p>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                className="btn btn-outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                  setDeleteError(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="btn bg-red-600 text-white hover:bg-red-700"
                onClick={handleRequestDeletion}
                disabled={isDeleting || deleteConfirmText !== 'DELETE'}
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
