import React, { useState } from 'react';
import { useMeetingModeStore } from '@lumina/ui';
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
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Current Status</h3>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              meetingModeActive
                ? 'bg-purple-100 text-purple-800'
                : meetingModeEnabled
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                meetingModeActive
                  ? 'bg-purple-500 animate-pulse'
                  : meetingModeEnabled
                    ? 'bg-green-500'
                    : 'bg-gray-400'
              }`} />
              {meetingModeActive
                ? `Active: ${meetingDetectedApp}`
                : meetingModeEnabled
                  ? 'Ready'
                  : 'Disabled'}
            </div>
          </div>

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <div>
              <p className="font-medium">Enable Meeting Mode</p>
              <p className="text-sm text-gray-500">Track eye health during video calls</p>
            </div>
            <button
              onClick={() => setMeetingModeEnabled(!meetingModeEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${
                meetingModeEnabled ? 'bg-gray-800' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  meetingModeEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Auto-detect Toggle */}
          {meetingModeEnabled && (
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium">Auto-detect meetings</p>
                <p className="text-sm text-gray-500">Automatically switch when meeting starts</p>
              </div>
              <button
                onClick={() => setMeetingAutoDetect(!meetingAutoDetect)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  meetingAutoDetect ? 'bg-gray-800' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    meetingAutoDetect ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-6">
          <h3 className="font-semibold text-blue-900 mb-3">How Meeting Mode Works</h3>
          <div className="space-y-3 text-sm text-blue-800">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 text-blue-900 font-medium">1</div>
              <p>When a meeting app (Zoom, Teams, Meet) is detected, the camera is released so the meeting app can use it.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 text-blue-900 font-medium">2</div>
              <p>Lumina captures your self-view preview (the small video of yourself) from the meeting app.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 text-blue-900 font-medium">3</div>
              <p>Eye tracking continues on this captured region - no images are saved or transmitted.</p>
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-amber-900">Video not showing correctly?</p>
              <p className="text-sm text-amber-700">Reset meeting mode to fix display issues</p>
            </div>
            <button
              onClick={onReset}
              className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-sm font-medium transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Calibrated Apps */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Calibrated Apps</h3>
            <span className="text-sm text-gray-500">{meetingCalibrations.length} app{meetingCalibrations.length !== 1 ? 's' : ''}</span>
          </div>

          {meetingCalibrations.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icons.VideoCall />
              </div>
              <p className="text-gray-600 mb-2">No apps calibrated yet</p>
              <p className="text-sm text-gray-500">
                When you join a meeting, you'll be prompted to calibrate the self-view region.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {meetingCalibrations.map((cal) => (
                <div
                  key={cal.appName}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                      <Icons.VideoCall />
                    </div>
                    <div>
                      <p className="font-medium">{cal.appName}</p>
                      <p className="text-xs text-gray-500">
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
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                    >
                      Recalibrate
                    </button>
                    <button
                      onClick={() => onRemoveCalibration(cal.appName)}
                      className="px-3 py-1.5 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Manual calibration */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-3">Add Custom App</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customAppName}
                onChange={(e) => setCustomAppName(e.target.value)}
                placeholder="App name (e.g., Webex)"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
              <button
                onClick={() => {
                  if (customAppName.trim()) {
                    onStartCalibration(customAppName.trim());
                    setCustomAppName('');
                  }
                }}
                disabled={!customAppName.trim()}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Calibrate
              </button>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Privacy First</p>
              <p className="text-sm text-gray-600 mt-1">
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
