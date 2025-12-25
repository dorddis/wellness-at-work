/**
 * Detection Service
 * Wraps window.lumina.detection IPC calls for type safety and testability
 */

export interface DetectionUpdate {
  blinkRate: number;
  wellnessScore: number;
  isDetecting: boolean;
  faceDetected: boolean;
}

export interface BlinkData {
  ear: number;
  timestamp: number;
}

/**
 * Detection service - wraps all window.lumina.detection calls
 */
export const DetectionService = {
  /**
   * Send detection state update to main process
   * Used for system tray display and status window
   */
  sendUpdate: (data: DetectionUpdate): void =>
    window.lumina?.detection.sendUpdate(data),

  /**
   * Send blink event to main process
   * Used for real-time blink display in status window
   */
  sendBlink: (data: BlinkData): void =>
    window.lumina?.detection.sendBlink(data),

  /**
   * Register callback for detection toggle events
   * Called when user toggles detection from system tray
   */
  onToggle: (callback: () => void): (() => void) =>
    window.lumina?.detection.onToggle(callback),
};
