import React, { useState } from 'react';
import { useMeetingModeStore, TourElement, LuminaTour } from '@lumina/ui';
import { Icons } from '../components';

export interface MeetingModeViewProps {
  onStartCalibration: (appName: string) => void;
  onRemoveCalibration: (appName: string) => void;
  onReset: () => void;
}

/**
 * Meeting Mode View - settings and calibration for meeting app integration
 */
export function MeetingModeView({ onStartCalibration, onRemoveCalibration, onReset }: MeetingModeViewProps) {
  const {
    enabled: meetingModeEnabled,
    isActive: meetingModeActive,
    detectedApp: meetingDetectedApp,
    calibrations: meetingCalibrations,
    autoDetect: meetingAutoDetect,
    setEnabled: setMeetingModeEnabled,
    setAutoDetect: setMeetingAutoDetect,
  } = useMeetingModeStore();

  const [customAppName, setCustomAppName] = useState('');

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Status Card */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Current Status</h3>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              meetingModeActive
                ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-200'
                : meetingModeEnabled
                  ? 'bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-200'
                  : 'bg-secondary text-muted-foreground'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                meetingModeActive
                  ? 'bg-purple-500 animate-pulse'
                  : meetingModeEnabled
                    ? 'bg-green-500'
                    : 'bg-muted-foreground/50'
              }`} />
              {meetingModeActive
                ? `Active: ${meetingDetectedApp}`
                : meetingModeEnabled
                  ? 'Ready'
                  : 'Disabled'}
            </div>
          </div>

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between py-4 border-b border-border/50">
            <div>
              <p className="font-medium text-foreground">Enable Meeting Mode</p>
              <p className="text-sm text-muted-foreground">Track eye health during video calls</p>
            </div>
            <button
              onClick={() => setMeetingModeEnabled(!meetingModeEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${
                meetingModeEnabled ? 'bg-foreground' : 'bg-muted'
              }`}
            >
              <div
                className={`w-5 h-5 bg-background rounded-full shadow transition-transform ${
                  meetingModeEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Auto-detect Toggle */}
          {meetingModeEnabled && (
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium text-foreground">Auto-detect meetings</p>
                <p className="text-sm text-muted-foreground">Automatically switch when meeting starts</p>
              </div>
              <button
                onClick={() => setMeetingAutoDetect(!meetingAutoDetect)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  meetingAutoDetect ? 'bg-foreground' : 'bg-muted'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-background rounded-full shadow transition-transform ${
                    meetingAutoDetect ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900 p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">How Meeting Mode Works</h3>
          <div className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center flex-shrink-0 text-blue-900 dark:text-blue-100 font-medium">1</div>
              <p>When a meeting app (Zoom, Teams, Meet) is detected, the camera is released so the meeting app can use it.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center flex-shrink-0 text-blue-900 dark:text-blue-100 font-medium">2</div>
              <p>Lumina captures your self-view preview (the small video of yourself) from the meeting app.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center flex-shrink-0 text-blue-900 dark:text-blue-100 font-medium">3</div>
              <p>Eye tracking continues on this captured region - no images are saved or transmitted.</p>
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-100">Video not showing correctly?</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">Reset meeting mode to fix display issues</p>
            </div>
            <button
              onClick={onReset}
              className="px-4 py-2 bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-100 rounded-lg text-sm font-medium transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Calibrated Apps */}
        <TourElement stepId={LuminaTour.MEETING_CALIBRATION}>
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Calibrated Apps</h3>
            <span className="text-sm text-muted-foreground">{meetingCalibrations.length} app{meetingCalibrations.length !== 1 ? 's' : ''}</span>
          </div>

          {meetingCalibrations.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                <Icons.VideoCall />
              </div>
              <p className="text-muted-foreground mb-2">No apps calibrated yet</p>
              <p className="text-sm text-muted-foreground/70">
                When you join a meeting, you'll be prompted to calibrate the self-view region.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {meetingCalibrations.map((cal) => (
                <div
                  key={cal.appName}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                      <Icons.VideoCall />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{cal.appName}</p>
                      <p className="text-xs text-muted-foreground">
                        Region: {cal.region.width}x{cal.region.height} px
                        {cal.lastUsed && (
                          <span className="ml-2">
                            Last used: {new Date(cal.lastUsed).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onStartCalibration(cal.appName)}
                      className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg"
                    >
                      Recalibrate
                    </button>
                    <button
                      onClick={() => onRemoveCalibration(cal.appName)}
                      className="px-3 py-1.5 text-sm text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Manual calibration */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-sm font-medium text-foreground/80 mb-3">Add Custom App</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customAppName}
                onChange={(e) => setCustomAppName(e.target.value)}
                placeholder="App name (e.g., Webex)"
                className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
              />
              <button
                onClick={() => {
                  if (customAppName.trim()) {
                    onStartCalibration(customAppName.trim());
                    setCustomAppName('');
                  }
                }}
                disabled={!customAppName.trim()}
                className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Calibrate
              </button>
            </div>
          </div>
          </div>
        </TourElement>

        {/* Privacy Notice */}
        <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-foreground">Privacy First</p>
              <p className="text-sm text-muted-foreground mt-1">
                Only the small self-view region is captured for blink detection. No meeting content, audio, or other participants are ever accessed. All processing happens locally on your device.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MeetingModeView;
