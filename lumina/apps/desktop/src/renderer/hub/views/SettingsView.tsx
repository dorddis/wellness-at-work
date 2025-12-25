import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '@lumina/ui';
import { Icons } from '../components';
import type { AuthUser } from '../types';
import { DatabaseService, SyncService } from '../services';

export interface SettingsViewProps {
  user: AuthUser;
  onSignOut: () => void;
}

/**
 * Settings View - app settings and preferences
 */
export function SettingsView({ user, onSignOut }: SettingsViewProps) {
  const {
    alertCooldownMinutes,
    notifications,
    showFloatingStatus,
    soundPreference,
    soundVolume,
    breakIntervalMinutes,
    breakDurationSeconds,
    maxPostpones,
    postureMonitoringEnabled,
    postureSensitivity,
    theme,
    cloudSyncEnabled,
    orgName,
    setAlertCooldownMinutes,
    setNotifications,
    setShowFloatingStatus,
    setSoundPreference,
    setSoundVolume,
    setBreakSettings,
    setPostureMonitoringEnabled,
    setPostureSensitivity,
    setTheme,
    setCloudSyncEnabled,
  } = useSettingsStore();

  const [syncStatus, setSyncStatus] = useState<{
    isConfigured: boolean;
    isSyncing: boolean;
    pendingCount: number;
  } | null>(null);

  // Data management state
  const [isExporting, setIsExporting] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [clearDataConfirmText, setClearDataConfirmText] = useState('');
  const [isClearingData, setIsClearingData] = useState(false);

  // Delete account state
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletionScheduled, setDeletionScheduled] = useState<string | null>(null);

  useEffect(() => {
    async function loadSyncStatus() {
      const status = await SyncService.getStatus();
      if (status) {
        setSyncStatus(status);
      }
    }
    loadSyncStatus();
    const interval = setInterval(loadSyncStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    const result = await SyncService.trigger();
    console.log('Manual sync result:', result);
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const result = await DatabaseService.exportData();
      if (result?.success && result.data) {
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
        alert('Failed to export data. Please try again.');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearLocalData = async () => {
    setIsClearingData(true);
    try {
      // Clear localStorage
      const keysToRemove = Object.keys(localStorage).filter((key) =>
        key.startsWith('lumina-')
      );
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      // Clear SQLite database via IPC
      await DatabaseService.clearAllData();

      setShowClearDataModal(false);
      setClearDataConfirmText('');
      alert('Local data cleared successfully. The app will restart.');
      // Reload the app
      window.location.reload();
    } catch (error) {
      console.error('Clear data error:', error);
      alert('Failed to clear local data. Please try again.');
    } finally {
      setIsClearingData(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const result = await window.lumina?.auth.requestAccountDeletion();
      if (result?.success && result.deletionDate) {
        setDeletionScheduled(result.deletionDate);
        setShowDeleteAccountModal(false);
        setDeleteConfirmText('');
      } else {
        setDeleteError(result?.error || 'Failed to schedule deletion');
      }
    } catch (error) {
      setDeleteError('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Detection Settings */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">Detection Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Detection Sensitivity</p>
                <p className="text-sm text-muted-foreground">Blink detection uses adaptive multi-stage algorithm with auto-calibration</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-secondary px-3 py-1 rounded text-sm">
                  Auto
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Alert Cooldown</p>
                <p className="text-sm text-muted-foreground">Minutes between repeated alerts</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="5"
                  value={alertCooldownMinutes}
                  onChange={(e) => setAlertCooldownMinutes(parseInt(e.target.value))}
                  className="w-24"
                />
                <span className="bg-secondary px-3 py-1 rounded font-mono w-16 text-center">
                  {alertCooldownMinutes}m
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Desktop Notifications</p>
                <p className="text-sm text-muted-foreground">Show alerts and reminders</p>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  notifications ? 'bg-foreground' : 'bg-muted'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-background rounded-full shadow transition-transform ${
                    notifications ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Floating Status</p>
                <p className="text-sm text-muted-foreground">Show small status window</p>
              </div>
              <button
                onClick={() => setShowFloatingStatus(!showFloatingStatus)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  showFloatingStatus ? 'bg-foreground' : 'bg-muted'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-background rounded-full shadow transition-transform ${
                    showFloatingStatus ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Sound Settings */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">Sound Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Notification Sound</p>
                <p className="text-sm text-muted-foreground">Sound played for break reminders</p>
              </div>
              <select
                value={soundPreference}
                onChange={(e) => setSoundPreference(e.target.value as any)}
                className="select select-minimal"
              >
                <option value="silence">Silence</option>
                <option value="chime">Chime</option>
                <option value="bell">Bell</option>
                <option value="soft-ping">Soft Ping</option>
                <option value="nature">Nature</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sound Volume</p>
                <p className="text-sm text-muted-foreground">Volume level for notifications</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={soundVolume}
                  onChange={(e) => setSoundVolume(parseInt(e.target.value))}
                  className="w-24"
                />
                <span className="bg-secondary px-3 py-1 rounded font-mono w-16 text-center">
                  {soundVolume}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Break Settings */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">Break Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Break Interval</p>
                <p className="text-sm text-muted-foreground">Time between breaks (minutes)</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="5"
                  value={breakIntervalMinutes}
                  onChange={(e) => setBreakSettings({ breakIntervalMinutes: parseInt(e.target.value) })}
                  className="w-24"
                />
                <span className="bg-secondary px-3 py-1 rounded font-mono w-16 text-center">
                  {breakIntervalMinutes}m
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Break Duration</p>
                <p className="text-sm text-muted-foreground">How long each break lasts (seconds)</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="5"
                  value={breakDurationSeconds}
                  onChange={(e) => setBreakSettings({ breakDurationSeconds: parseInt(e.target.value) })}
                  className="w-24"
                />
                <span className="bg-secondary px-3 py-1 rounded font-mono w-16 text-center">
                  {breakDurationSeconds}s
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Max Postpones</p>
                <p className="text-sm text-muted-foreground">How many times you can delay a break</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  value={maxPostpones}
                  onChange={(e) => setBreakSettings({ maxPostpones: parseInt(e.target.value) })}
                  className="w-24"
                />
                <span className="bg-secondary px-3 py-1 rounded font-mono w-16 text-center">
                  {maxPostpones}x
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Posture Settings */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">Posture Monitoring</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable Posture Monitoring</p>
                <p className="text-sm text-muted-foreground">Track your sitting posture</p>
              </div>
              <button
                onClick={() => setPostureMonitoringEnabled(!postureMonitoringEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  postureMonitoringEnabled ? 'bg-foreground' : 'bg-muted'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-background rounded-full shadow transition-transform ${
                    postureMonitoringEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            {postureMonitoringEnabled && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Posture Sensitivity</p>
                  <p className="text-sm text-muted-foreground">How strict the posture detection is</p>
                </div>
                <select
                  value={postureSensitivity}
                  onChange={(e) => setPostureSensitivity(e.target.value as any)}
                  className="select select-minimal"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">Appearance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Theme</p>
                <p className="text-sm text-muted-foreground">Color scheme for the app</p>
              </div>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="select select-minimal"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>
        </div>

        {/* Privacy & Sync Settings */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">Privacy & Cloud Sync</h3>
          <div className="space-y-4">
            {/* Cloud Sync Toggle - GDPR Local-Only Mode */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Cloud Sync</p>
                <p className="text-sm text-muted-foreground">
                  {cloudSyncEnabled
                    ? 'Sync wellness data to cloud for dashboard access'
                    : 'Local-only mode: data stays on this device'}
                </p>
              </div>
              <button
                onClick={async () => {
                  const newValue = !cloudSyncEnabled;
                  setCloudSyncEnabled(newValue);
                  // Control auto-sync based on toggle
                  if (newValue) {
                    await SyncService.startAuto();
                  } else {
                    await SyncService.stopAuto();
                  }
                }}
                className={`w-12 h-6 rounded-full transition-colors ${
                  cloudSyncEnabled ? 'bg-foreground' : 'bg-muted'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-background rounded-full shadow transition-transform ${
                    cloudSyncEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Privacy notice when disabled */}
            {!cloudSyncEnabled && (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Local-Only Mode Active</strong><br />
                  Your wellness data is stored only on this device. No data is sent to our servers.
                  You can re-enable sync anytime to access your data on the web dashboard.
                </p>
              </div>
            )}

            {/* Sync status - only show when enabled */}
            {cloudSyncEnabled && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Sync Status</p>
                    <p className="text-sm text-muted-foreground">
                      {syncStatus?.isConfigured ? 'Connected to cloud' : 'Not configured'}
                    </p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${syncStatus?.isConfigured ? 'bg-green-500' : 'bg-muted-foreground/50'}`} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Pending Records</p>
                    <p className="text-sm text-muted-foreground">Data waiting to sync</p>
                  </div>
                  <span className="bg-secondary px-3 py-1 rounded">{syncStatus?.pendingCount ?? 0}</span>
                </div>
                <button
                  onClick={handleManualSync}
                  className="w-full py-2 bg-secondary text-foreground/80 rounded-lg hover:bg-muted"
                >
                  Sync Now
                </button>
              </>
            )}
          </div>
        </div>

        {/* Account */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">Account</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{user.email}</p>
                <p className="text-sm text-muted-foreground">
                  {user.organization?.name ?? 'No organization'}
                  {user.organization?.role && ` - ${user.organization.role}`}
                </p>
              </div>
              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-muted-foreground font-medium">
                {user.email[0].toUpperCase()}
              </div>
            </div>
            <button
              onClick={onSignOut}
              className="w-full py-2 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* About */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">About Lumina</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Version: 0.1.0</p>
            <p>Built with Electron + MediaPipe</p>
            <p>All blink detection happens locally on your device.</p>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">Data Management</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Export My Data</p>
                <p className="text-sm text-muted-foreground">Download all your wellness data as JSON</p>
              </div>
              <button
                onClick={handleExportData}
                disabled={isExporting}
                className="px-4 py-2 bg-secondary text-foreground/80 rounded-lg hover:bg-muted disabled:opacity-50"
              >
                {isExporting ? 'Exporting...' : 'Export'}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Clear Local Data</p>
                <p className="text-sm text-muted-foreground">Reset all local storage (database, settings, streaks)</p>
              </div>
              <button
                onClick={() => setShowClearDataModal(true)}
                className="px-4 py-2 bg-secondary text-foreground/80 rounded-lg hover:bg-muted"
              >
                Clear Data
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-card rounded-xl border-2 border-red-200 dark:border-red-900 p-6">
          <h3 className="font-semibold mb-4 text-red-800 dark:text-red-400">Danger Zone</h3>
          {deletionScheduled && (
            <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg">
              <p className="font-medium text-amber-800 dark:text-amber-200">Account Deletion Scheduled</p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Your account is scheduled for deletion on{' '}
                {new Date(deletionScheduled).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                . Contact support to cancel.
              </p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-red-800 dark:text-red-400">Delete Account</p>
              <p className="text-sm text-muted-foreground">Permanently delete your account (30-day grace period)</p>
            </div>
            <button
              onClick={() => setShowDeleteAccountModal(true)}
              disabled={!!deletionScheduled}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Clear Data Confirmation Modal */}
      {showClearDataModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4 shadow-xl border border-border">
            <h3 className="text-lg font-semibold mb-4">Clear All Local Data?</h3>
            <p className="text-muted-foreground mb-4">
              This will permanently delete:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mb-4 space-y-1">
              <li>All wellness data stored on this device</li>
              <li>Streak progress and achievements</li>
              <li>Local settings and preferences</li>
            </ul>
            <p className="text-sm text-muted-foreground mb-4">
              Cloud-synced data will not be affected.
            </p>
            <div className="mb-4">
              <label className="text-sm font-medium block mb-1">
                Type <span className="font-mono font-bold">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={clearDataConfirmText}
                onChange={(e) => setClearDataConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowClearDataModal(false);
                  setClearDataConfirmText('');
                }}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleClearLocalData}
                disabled={isClearingData || clearDataConfirmText !== 'DELETE'}
                className="px-4 py-2 bg-neutral-900 dark:bg-neutral-200 text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-300 disabled:opacity-50"
              >
                {isClearingData ? 'Clearing...' : 'Clear All Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4 shadow-xl border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-950/50 rounded-full">
                <Icons.AlertTriangle className="text-red-600 dark:text-red-400" />
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
              <label className="text-sm font-medium block mb-1">
                Type <span className="font-mono font-bold">{orgName || 'DELETE'}</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={`Type ${orgName || 'DELETE'}`}
                className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50"
              />
            </div>
            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">{deleteError}</p>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteAccountModal(false);
                  setDeleteConfirmText('');
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmText !== (orgName || 'DELETE')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default SettingsView;
