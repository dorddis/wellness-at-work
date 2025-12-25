/**
 * Meeting Mode Service
 * Wraps window.lumina.meetingMode IPC calls for type safety and testability
 */

export interface MeetingDetectionResult {
  isDetected: boolean;
  appName: string | null;
  processName?: string;
}

export interface ScreenSource {
  id: string;
  name: string;
  displayId: string;
  thumbnail: string; // Base64 data URL
}

export interface DisplayInfo {
  id: number;
  label: string;
  bounds: { x: number; y: number; width: number; height: number };
  isPrimary: boolean;
}

export interface ScreenshotResult {
  dataUrl: string;
  width: number;
  height: number;
  scaleFactor: number;
}

/**
 * Meeting Mode service - wraps all window.lumina.meetingMode calls
 */
export const MeetingModeService = {
  /**
   * Detect if a meeting app (Zoom, Teams, Meet, etc.) is currently running
   */
  detectApp: (): Promise<MeetingDetectionResult> =>
    window.lumina?.meetingMode.detectApp(),

  /**
   * Get available screen sources for capture
   */
  getSources: (): Promise<ScreenSource[]> =>
    window.lumina?.meetingMode.getSources(),

  /**
   * Get source ID for a specific display (for full screen capture)
   */
  getSourceId: (displayId?: number): Promise<string | null> =>
    window.lumina?.meetingMode.getSourceId(displayId),

  /**
   * Get source ID for a specific window by app name (for window capture)
   */
  getWindowSourceId: (appName: string): Promise<string | null> =>
    window.lumina?.meetingMode.getWindowSourceId(appName),

  /**
   * Get available display information
   */
  getDisplays: (): Promise<DisplayInfo[]> =>
    window.lumina?.meetingMode.getDisplays(),

  /**
   * Capture a screenshot for calibration
   */
  captureScreenshot: (): Promise<ScreenshotResult | null> =>
    window.lumina?.meetingMode.captureScreenshot(),

  /**
   * Opens hub and triggers meeting mode calibration
   */
  startCalibration: (): Promise<void> =>
    window.lumina?.meetingMode.startCalibration(),
};

/**
 * Notification service for meeting mode
 */
export const NotificationService = {
  /**
   * Show a system notification
   */
  show: (options: {
    title: string;
    body: string;
    silent?: boolean;
    type?: 'meeting-detected' | 'general';
  }): Promise<{ success: boolean; error?: string }> =>
    window.lumina?.notification.show(options),
};

/**
 * Event listeners for meeting mode navigation
 */
export const MeetingModeEvents = {
  /**
   * Register callback for meeting mode navigation (from notification clicks)
   */
  onNavigate: (callback: () => void): (() => void) =>
    window.lumina?.onMeetingModeNavigate(callback),

  /**
   * Unregister callback for meeting mode navigation
   */
  offNavigate: (callback: () => void): void =>
    window.lumina?.offMeetingModeNavigate(callback),

  /**
   * Register callback for meeting mode calibration start
   * Receives pre-captured screenshot
   */
  onStartCalibration: (
    callback: (data: { screenshot?: ScreenshotResult | null }) => void
  ): (() => void) =>
    window.lumina?.onMeetingModeStartCalibration(callback),
};
