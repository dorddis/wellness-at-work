/**
 * Database Service
 * Wraps window.lumina.database IPC calls for type safety and testability
 */

import type { WellnessEventType } from '../types';

// Re-export types from preload for convenience
export interface BaselineData {
  id: number;
  blink_p25: number | null;
  blink_p50: number | null;
  blink_p75: number | null;
  calibrated_at: number | null;
  samples_count: number;
}

export interface RollupData {
  id: number;
  timestamp: number;
  blink_count: number;
  avg_ear: number | null;
  synced: number;
}

export interface SessionStats {
  totalBlinks: number;
  avgEar: number;
  minuteCount: number;
}

export interface WellnessEvent {
  id?: number;
  timestamp: number;
  event_type: WellnessEventType;
  payload: string | null;
}

export interface WellnessStats {
  yawnCount: number;
  postureIssueCount: number;
  drowsinessEventCount: number;
}

export interface ExportDataResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ClearDataResult {
  success: boolean;
  error?: string;
}

/**
 * Database service - wraps all window.lumina.database calls
 */
export const DatabaseService = {
  // Blink tracking
  insertBlink: (timestamp: number, earValue: number, isBlink: boolean): Promise<void> =>
    window.lumina?.database.insertBlink(timestamp, earValue, isBlink),

  insertRollup: (timestamp: number, blinkCount: number, avgEar: number | null): Promise<void> =>
    window.lumina?.database.insertRollup(timestamp, blinkCount, avgEar),

  getRollups: (startTime: number, endTime: number): Promise<RollupData[]> =>
    window.lumina?.database.getRollups(startTime, endTime),

  getUnsyncedRollups: (limit?: number): Promise<RollupData[]> =>
    window.lumina?.database.getUnsyncedRollups(limit),

  markSynced: (ids: number[]): Promise<void> =>
    window.lumina?.database.markSynced(ids),

  getRecentBlinks: (minutes: number): Promise<number> =>
    window.lumina?.database.getRecentBlinks(minutes),

  getSessionStats: (sessionStartTime: number): Promise<SessionStats> =>
    window.lumina?.database.getSessionStats(sessionStartTime),

  // Baseline calibration
  getBaseline: (): Promise<BaselineData | null> =>
    window.lumina?.database.getBaseline(),

  updateBaseline: (p25: number, p50: number, p75: number, samplesCount: number): Promise<void> =>
    window.lumina?.database.updateBaseline(p25, p50, p75, samplesCount),

  // Wellness events
  insertWellnessEvent: (timestamp: number, eventType: WellnessEventType, payload?: object): Promise<void> =>
    window.lumina?.database.insertWellnessEvent(timestamp, eventType, payload),

  getWellnessEvents: (startTime: number, endTime: number, eventType?: WellnessEventType): Promise<WellnessEvent[]> =>
    window.lumina?.database.getWellnessEvents(startTime, endTime, eventType),

  getTodayWellnessStats: (): Promise<WellnessStats> =>
    window.lumina?.database.getTodayWellnessStats(),

  getRecentWellnessEvents: (minutes: number): Promise<WellnessEvent[]> =>
    window.lumina?.database.getRecentWellnessEvents(minutes),

  // Data management
  exportData: (): Promise<ExportDataResult> =>
    window.lumina?.database.exportData(),

  clearAllData: (): Promise<ClearDataResult> =>
    window.lumina?.database.clearAllData(),

  cleanup: (): Promise<void> =>
    window.lumina?.database.cleanup(),
};
