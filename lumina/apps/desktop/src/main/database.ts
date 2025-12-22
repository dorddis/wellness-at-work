/**
 * Local SQLite Database Manager
 * Stores blink events, rollups, and user baseline locally
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export interface BlinkEvent {
  id?: number;
  timestamp: number;
  ear_value: number;
  is_blink: number;
}

export interface MinuteRollup {
  id?: number;
  timestamp: number;
  blink_count: number;
  avg_ear: number | null;
  synced: number;
}

export interface UserBaseline {
  id: number;
  blink_p25: number | null;
  blink_p50: number | null;
  blink_p75: number | null;
  calibrated_at: number | null;
  samples_count: number;
}

export interface StreakRecord {
  id?: number;
  type: string; // 'daily_use' | 'healthy_blink' | 'break_compliance' | 'good_posture'
  current_count: number;
  longest_count: number;
  last_updated: number;
  broken_at: number | null;
}

export interface AchievementRecord {
  id?: number;
  badge_id: string;
  unlocked_at: number;
  progress: number;
}

export interface UserSettings {
  id: number;
  sound_preference: string;
  has_completed_onboarding: number;
  max_postpones: number;
  break_interval_minutes: number;
  break_duration_seconds: number;
  posture_monitoring_enabled: number;
  theme: string;
}

/**
 * Wellness event types for tracking posture, yawn, and drowsiness
 */
export type WellnessEventType =
  | 'yawn'
  | 'posture_too_close'
  | 'posture_too_far'
  | 'posture_head_tilt'
  | 'posture_forward_lean'
  | 'drowsiness_mild'
  | 'drowsiness_moderate'
  | 'drowsiness_severe';

export interface WellnessEvent {
  id?: number;
  timestamp: number;
  event_type: WellnessEventType;
  payload: string | null; // JSON string
}

export class DatabaseManager {
  private db: Database.Database | null = null;
  private dbPath: string;

  /**
   * Create a new DatabaseManager
   * @param customPath Optional custom database path (for testing)
   */
  constructor(customPath?: string) {
    if (customPath) {
      this.dbPath = customPath;
    } else {
      // Store in app data directory (production)
      const userDataPath = app.getPath('userData');
      this.dbPath = path.join(userDataPath, 'lumina.db');
    }
  }

  /**
   * Get the database path (for testing/debugging)
   */
  getDbPath(): string {
    return this.dbPath;
  }

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Open database with WAL mode for better performance
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');

    // Create tables
    this.createTables();
  }

  /**
   * Create database tables
   */
  private createTables(): void {
    if (!this.db) return;

    // Blink events (raw data, kept for 24 hours)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS blink_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        ear_value REAL NOT NULL,
        is_blink INTEGER NOT NULL
      )
    `);

    // Minute rollups (aggregated data)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS minute_rollups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        blink_count INTEGER NOT NULL,
        avg_ear REAL,
        synced INTEGER DEFAULT 0
      )
    `);

    // User baseline
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_baseline (
        id INTEGER PRIMARY KEY DEFAULT 1,
        blink_p25 REAL,
        blink_p50 REAL,
        blink_p75 REAL,
        calibrated_at INTEGER,
        samples_count INTEGER DEFAULT 0
      )
    `);

    // Streaks table (gamification)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_streaks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL UNIQUE,
        current_count INTEGER DEFAULT 0,
        longest_count INTEGER DEFAULT 0,
        last_updated INTEGER NOT NULL,
        broken_at INTEGER
      )
    `);

    // Achievements table (gamification)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        badge_id TEXT NOT NULL UNIQUE,
        unlocked_at INTEGER NOT NULL,
        progress INTEGER DEFAULT 0
      )
    `);

    // User settings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        sound_preference TEXT DEFAULT 'chime',
        has_completed_onboarding INTEGER DEFAULT 0,
        max_postpones INTEGER DEFAULT 2,
        break_interval_minutes INTEGER DEFAULT 20,
        break_duration_seconds INTEGER DEFAULT 20,
        posture_monitoring_enabled INTEGER DEFAULT 1,
        theme TEXT DEFAULT 'system'
      )
    `);

    // Daily progress table (resets daily)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS daily_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        breaks_taken INTEGER DEFAULT 0,
        breaks_scheduled INTEGER DEFAULT 4,
        healthy_blink_minutes INTEGER DEFAULT 0,
        good_posture_minutes INTEGER DEFAULT 0,
        total_session_minutes INTEGER DEFAULT 0
      )
    `);

    // Wellness events table (yawn, posture, drowsiness)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS wellness_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        payload TEXT
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_blink_events_timestamp ON blink_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_minute_rollups_timestamp ON minute_rollups(timestamp);
      CREATE INDEX IF NOT EXISTS idx_minute_rollups_synced ON minute_rollups(synced) WHERE synced = 0;
      CREATE INDEX IF NOT EXISTS idx_user_streaks_type ON user_streaks(type);
      CREATE INDEX IF NOT EXISTS idx_daily_progress_date ON daily_progress(date);
      CREATE INDEX IF NOT EXISTS idx_wellness_events_timestamp ON wellness_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_wellness_events_type ON wellness_events(event_type);
    `);

    // Insert default baseline if not exists
    this.db.exec(`
      INSERT OR IGNORE INTO user_baseline (id, samples_count) VALUES (1, 0)
    `);

    // Insert default settings if not exists
    this.db.exec(`
      INSERT OR IGNORE INTO user_settings (id) VALUES (1)
    `);

    // Insert default streaks if not exist
    // DEMO_MODE: Read from environment variable (set in .env file)
    const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
    const now = Date.now();

    if (DEMO_MODE) {
      // Demo streaks data
      const demoStreaks = [
        { type: 'daily_use', current: 5, longest: 12 },
        { type: 'healthy_blink', current: 3, longest: 8 },
        { type: 'break_compliance', current: 2, longest: 5 },
        { type: 'good_posture', current: 45, longest: 90 },
      ];

      const upsertStreak = this.db.prepare(`
        INSERT INTO user_streaks (type, current_count, longest_count, last_updated)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(type) DO UPDATE SET
          current_count = excluded.current_count,
          longest_count = excluded.longest_count,
          last_updated = excluded.last_updated
      `);

      for (const streak of demoStreaks) {
        upsertStreak.run(streak.type, streak.current, streak.longest, now);
      }

      // Demo achievements data
      const demoAchievements = [
        { badge_id: 'first_steps', unlocked_at: now - 7 * 24 * 60 * 60 * 1000 },
        { badge_id: 'perfect_day', unlocked_at: now - 5 * 24 * 60 * 60 * 1000 },
        { badge_id: 'blink_master', unlocked_at: now - 3 * 24 * 60 * 60 * 1000 },
        { badge_id: 'early_bird', unlocked_at: now - 6 * 24 * 60 * 60 * 1000 },
      ];

      const upsertAchievement = this.db.prepare(`
        INSERT INTO user_achievements (badge_id, unlocked_at, progress)
        VALUES (?, ?, 100)
        ON CONFLICT(badge_id) DO UPDATE SET
          unlocked_at = excluded.unlocked_at,
          progress = 100
      `);

      for (const achievement of demoAchievements) {
        upsertAchievement.run(achievement.badge_id, achievement.unlocked_at);
      }

      // Demo daily progress for last 14 days
      const upsertDailyProgress = this.db.prepare(`
        INSERT INTO daily_progress (date, breaks_taken, breaks_scheduled, healthy_blink_minutes, good_posture_minutes, total_session_minutes)
        VALUES (?, ?, 4, ?, ?, ?)
        ON CONFLICT(date) DO UPDATE SET
          breaks_taken = excluded.breaks_taken,
          healthy_blink_minutes = excluded.healthy_blink_minutes,
          good_posture_minutes = excluded.good_posture_minutes,
          total_session_minutes = excluded.total_session_minutes
      `);

      // Generate 14 days of daily progress
      for (let i = 13; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        // Varying data - weekends have less activity
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const breaksTaken = isWeekend ? Math.floor(Math.random() * 2) + 1 : Math.floor(Math.random() * 3) + 2;
        const healthyMinutes = isWeekend ? Math.floor(Math.random() * 60) + 30 : Math.floor(Math.random() * 120) + 180;
        const postureMinutes = isWeekend ? Math.floor(Math.random() * 40) + 20 : Math.floor(Math.random() * 100) + 150;
        const sessionMinutes = isWeekend ? Math.floor(Math.random() * 60) + 60 : Math.floor(Math.random() * 120) + 300;

        upsertDailyProgress.run(dateStr, breaksTaken, healthyMinutes, postureMinutes, sessionMinutes);
      }

      // Seed minute rollups for last 7 days (comprehensive blink data)
      // This creates realistic data patterns for the History view
      const insertRollup = this.db.prepare(`
        INSERT OR IGNORE INTO minute_rollups (timestamp, blink_count, avg_ear, synced)
        VALUES (?, ?, ?, 1)
      `);

      for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
        const dayStart = new Date();
        dayStart.setDate(dayStart.getDate() - dayOffset);
        dayStart.setHours(9, 0, 0, 0); // Start at 9 AM

        // Work hours: 9 AM to 6 PM (9 hours = 540 minutes)
        const isWeekend = dayStart.getDay() === 0 || dayStart.getDay() === 6;
        const workMinutes = isWeekend ? 120 : 480; // 2 hours weekend, 8 hours weekday

        for (let minute = 0; minute < workMinutes; minute++) {
          const timestamp = dayStart.getTime() + (minute * 60 * 1000);

          // Simulate realistic blink patterns:
          // - Morning: higher blink rate (16-20)
          // - Afternoon: lower blink rate (10-14) - eye strain
          // - After breaks: temporary spike
          const hourOfDay = new Date(timestamp).getHours();
          let baseBlinks = 15;
          if (hourOfDay < 12) {
            baseBlinks = 17; // Morning - fresher
          } else if (hourOfDay < 15) {
            baseBlinks = 12; // Early afternoon - eye strain
          } else {
            baseBlinks = 14; // Late afternoon - moderate
          }

          // Add randomness
          const blinkCount = baseBlinks + Math.floor(Math.random() * 6) - 3;
          const avgEar = 0.25 + (Math.random() * 0.08) - 0.04; // 0.21 - 0.29

          insertRollup.run(timestamp, Math.max(5, blinkCount), avgEar);
        }
      }

      // Seed wellness events for last 7 days
      const insertWellnessEvent = this.db.prepare(`
        INSERT OR IGNORE INTO wellness_events (timestamp, event_type, payload)
        VALUES (?, ?, ?)
      `);

      const wellnessEventTypes: WellnessEventType[] = [
        'yawn',
        'posture_too_close',
        'posture_head_tilt',
        'posture_forward_lean',
        'drowsiness_mild',
      ];

      for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
        const dayStart = new Date();
        dayStart.setDate(dayStart.getDate() - dayOffset);

        const isWeekend = dayStart.getDay() === 0 || dayStart.getDay() === 6;
        const eventsPerDay = isWeekend ? 3 : 12; // Fewer events on weekends

        for (let i = 0; i < eventsPerDay; i++) {
          // Random time during work hours (9 AM - 6 PM)
          const hour = 9 + Math.floor(Math.random() * 9);
          const minute = Math.floor(Math.random() * 60);
          dayStart.setHours(hour, minute, 0, 0);
          const timestamp = dayStart.getTime();

          // Pick random event type, weighted towards yawns and posture
          const weights = [4, 2, 2, 2, 1]; // yawn most common
          const totalWeight = weights.reduce((a, b) => a + b, 0);
          let random = Math.random() * totalWeight;
          let eventTypeIndex = 0;
          for (let j = 0; j < weights.length; j++) {
            random -= weights[j];
            if (random <= 0) {
              eventTypeIndex = j;
              break;
            }
          }
          const eventType = wellnessEventTypes[eventTypeIndex];

          // Create appropriate payload
          let payload: object | null = null;
          if (eventType === 'yawn') {
            payload = { mar: 0.5 + Math.random() * 0.3 };
          } else if (eventType.startsWith('posture_')) {
            payload = { severity: Math.random() > 0.7 ? 'high' : 'medium' };
          } else if (eventType.startsWith('drowsiness_')) {
            payload = { perclos: 0.15 + Math.random() * 0.15, recentYawns: Math.floor(Math.random() * 3) + 1 };
          }

          insertWellnessEvent.run(timestamp, eventType, payload ? JSON.stringify(payload) : null);
        }
      }

      // Seed user baseline (calibrated)
      this.db.exec(`
        UPDATE user_baseline
        SET blink_p25 = 12.5,
            blink_p50 = 15.8,
            blink_p75 = 19.2,
            calibrated_at = ${now - 5 * 24 * 60 * 60 * 1000},
            samples_count = 120
        WHERE id = 1
      `);

      console.log('[Database] Demo data seeded: 14 days progress, 7 days rollups, wellness events');

    } else {
      // Production: just insert empty streaks
      const streakTypes = ['daily_use', 'healthy_blink', 'break_compliance', 'good_posture'];
      const insertStreak = this.db.prepare(`
        INSERT OR IGNORE INTO user_streaks (type, current_count, longest_count, last_updated)
        VALUES (?, 0, 0, ?)
      `);
      for (const type of streakTypes) {
        insertStreak.run(type, now);
      }
    }
  }

  /**
   * Insert a blink event
   */
  insertBlinkEvent(timestamp: number, earValue: number, isBlink: boolean): void {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO blink_events (timestamp, ear_value, is_blink)
      VALUES (?, ?, ?)
    `);
    stmt.run(timestamp, earValue, isBlink ? 1 : 0);
  }

  /**
   * Insert a minute rollup
   */
  insertMinuteRollup(timestamp: number, blinkCount: number, avgEar: number | null): void {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO minute_rollups (timestamp, blink_count, avg_ear, synced)
      VALUES (?, ?, ?, 0)
    `);
    stmt.run(timestamp, blinkCount, avgEar);
  }

  /**
   * Get unsynced rollups
   */
  getUnsyncedRollups(limit: number = 100): MinuteRollup[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT * FROM minute_rollups
      WHERE synced = 0
      ORDER BY timestamp ASC
      LIMIT ?
    `);
    return stmt.all(limit) as MinuteRollup[];
  }

  /**
   * Mark rollups as synced
   */
  markRollupsSynced(ids: number[]): void {
    if (!this.db || ids.length === 0) return;

    const placeholders = ids.map(() => '?').join(',');
    const stmt = this.db.prepare(`
      UPDATE minute_rollups
      SET synced = 1
      WHERE id IN (${placeholders})
    `);
    stmt.run(...ids);
  }

  /**
   * Get rollups for a time range
   */
  getRollups(startTime: number, endTime: number): MinuteRollup[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT * FROM minute_rollups
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp ASC
    `);
    return stmt.all(startTime, endTime) as MinuteRollup[];
  }

  /**
   * Get user baseline
   */
  getBaseline(): UserBaseline | null {
    if (!this.db) return null;

    const stmt = this.db.prepare('SELECT * FROM user_baseline WHERE id = 1');
    return stmt.get() as UserBaseline | null;
  }

  /**
   * Update user baseline
   */
  updateBaseline(p25: number, p50: number, p75: number, samplesCount: number): void {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      UPDATE user_baseline
      SET blink_p25 = ?, blink_p50 = ?, blink_p75 = ?, calibrated_at = ?, samples_count = ?
      WHERE id = 1
    `);
    stmt.run(p25, p50, p75, Date.now(), samplesCount);
  }

  /**
   * Cleanup old data (blink events older than 24 hours)
   */
  cleanup(): void {
    if (!this.db) return;

    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    const stmt = this.db.prepare('DELETE FROM blink_events WHERE timestamp < ?');
    stmt.run(cutoff);

    // Also cleanup old wellness events (keep 7 days)
    const wellnessCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const wellnessStmt = this.db.prepare('DELETE FROM wellness_events WHERE timestamp < ?');
    wellnessStmt.run(wellnessCutoff);
  }

  // ========== WELLNESS EVENTS ==========

  /**
   * Insert a wellness event (yawn, posture issue, drowsiness change)
   */
  insertWellnessEvent(
    timestamp: number,
    eventType: WellnessEventType,
    payload?: object
  ): void {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO wellness_events (timestamp, event_type, payload)
      VALUES (?, ?, ?)
    `);
    stmt.run(timestamp, eventType, payload ? JSON.stringify(payload) : null);
  }

  /**
   * Get wellness events for a time range
   */
  getWellnessEvents(
    startTime: number,
    endTime: number,
    eventType?: WellnessEventType
  ): WellnessEvent[] {
    if (!this.db) return [];

    if (eventType) {
      const stmt = this.db.prepare(`
        SELECT * FROM wellness_events
        WHERE timestamp >= ? AND timestamp <= ? AND event_type = ?
        ORDER BY timestamp ASC
      `);
      return stmt.all(startTime, endTime, eventType) as WellnessEvent[];
    } else {
      const stmt = this.db.prepare(`
        SELECT * FROM wellness_events
        WHERE timestamp >= ? AND timestamp <= ?
        ORDER BY timestamp ASC
      `);
      return stmt.all(startTime, endTime) as WellnessEvent[];
    }
  }

  /**
   * Get wellness event counts for today (for dashboard)
   */
  getTodayWellnessStats(): {
    yawnCount: number;
    postureIssueCount: number;
    drowsinessEventCount: number;
  } {
    if (!this.db) {
      return { yawnCount: 0, postureIssueCount: 0, drowsinessEventCount: 0 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDay = today.getTime();
    const now = Date.now();

    const yawnStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM wellness_events
      WHERE timestamp >= ? AND timestamp <= ? AND event_type = 'yawn'
    `);
    const yawnResult = yawnStmt.get(startOfDay, now) as { count: number };

    const postureStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM wellness_events
      WHERE timestamp >= ? AND timestamp <= ?
      AND event_type IN ('posture_too_close', 'posture_too_far', 'posture_head_tilt', 'posture_forward_lean')
    `);
    const postureResult = postureStmt.get(startOfDay, now) as { count: number };

    const drowsinessStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM wellness_events
      WHERE timestamp >= ? AND timestamp <= ?
      AND event_type IN ('drowsiness_mild', 'drowsiness_moderate', 'drowsiness_severe')
    `);
    const drowsinessResult = drowsinessStmt.get(startOfDay, now) as { count: number };

    return {
      yawnCount: yawnResult.count,
      postureIssueCount: postureResult.count,
      drowsinessEventCount: drowsinessResult.count,
    };
  }

  /**
   * Get recent wellness events (last N minutes)
   */
  getRecentWellnessEvents(minutes: number): WellnessEvent[] {
    if (!this.db) return [];

    const cutoff = Date.now() - minutes * 60 * 1000;
    const stmt = this.db.prepare(`
      SELECT * FROM wellness_events
      WHERE timestamp >= ?
      ORDER BY timestamp DESC
    `);
    return stmt.all(cutoff) as WellnessEvent[];
  }

  /**
   * Get recent blink count (for calculating rate)
   */
  getRecentBlinkCount(minutes: number): number {
    if (!this.db) return 0;

    const cutoff = Date.now() - minutes * 60 * 1000;
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM blink_events
      WHERE timestamp >= ? AND is_blink = 1
    `);
    const result = stmt.get(cutoff) as { count: number };
    return result.count;
  }

  /**
   * Get statistics for current session
   */
  getSessionStats(sessionStartTime: number): {
    totalBlinks: number;
    avgEar: number;
    minuteCount: number;
  } {
    if (!this.db) return { totalBlinks: 0, avgEar: 0, minuteCount: 0 };

    const blinkStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM blink_events
      WHERE timestamp >= ? AND is_blink = 1
    `);
    const blinkResult = blinkStmt.get(sessionStartTime) as { count: number };

    const rollupStmt = this.db.prepare(`
      SELECT AVG(avg_ear) as avg_ear, COUNT(*) as count FROM minute_rollups
      WHERE timestamp >= ?
    `);
    const rollupResult = rollupStmt.get(sessionStartTime) as { avg_ear: number | null; count: number };

    return {
      totalBlinks: blinkResult.count,
      avgEar: rollupResult.avg_ear ?? 0,
      minuteCount: rollupResult.count,
    };
  }

  // ========== STREAKS ==========

  /**
   * Get all streaks
   */
  getStreaks(): StreakRecord[] {
    if (!this.db) return [];
    const stmt = this.db.prepare('SELECT * FROM user_streaks');
    return stmt.all() as StreakRecord[];
  }

  /**
   * Get a specific streak
   */
  getStreak(type: string): StreakRecord | null {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT * FROM user_streaks WHERE type = ?');
    return stmt.get(type) as StreakRecord | null;
  }

  /**
   * Increment a streak
   */
  incrementStreak(type: string): void {
    if (!this.db) return;
    const stmt = this.db.prepare(`
      UPDATE user_streaks
      SET current_count = current_count + 1,
          longest_count = MAX(longest_count, current_count + 1),
          last_updated = ?,
          broken_at = NULL
      WHERE type = ?
    `);
    stmt.run(Date.now(), type);
  }

  /**
   * Break a streak (reset to 0)
   */
  breakStreak(type: string): void {
    if (!this.db) return;
    const stmt = this.db.prepare(`
      UPDATE user_streaks
      SET current_count = 0,
          broken_at = ?
      WHERE type = ?
    `);
    stmt.run(Date.now(), type);
  }

  /**
   * Update a streak directly
   */
  updateStreak(type: string, currentCount: number, longestCount: number): void {
    if (!this.db) return;
    const stmt = this.db.prepare(`
      UPDATE user_streaks
      SET current_count = ?,
          longest_count = ?,
          last_updated = ?
      WHERE type = ?
    `);
    stmt.run(currentCount, longestCount, Date.now(), type);
  }

  // ========== ACHIEVEMENTS ==========

  /**
   * Get all achievements
   */
  getAchievements(): AchievementRecord[] {
    if (!this.db) return [];
    const stmt = this.db.prepare('SELECT * FROM user_achievements');
    return stmt.all() as AchievementRecord[];
  }

  /**
   * Get a specific achievement
   */
  getAchievement(badgeId: string): AchievementRecord | null {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT * FROM user_achievements WHERE badge_id = ?');
    return stmt.get(badgeId) as AchievementRecord | null;
  }

  /**
   * Unlock an achievement
   */
  unlockAchievement(badgeId: string): void {
    if (!this.db) return;
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_achievements (badge_id, unlocked_at, progress)
      VALUES (?, ?, 100)
    `);
    stmt.run(badgeId, Date.now());
  }

  /**
   * Update achievement progress
   */
  updateAchievementProgress(badgeId: string, progress: number): void {
    if (!this.db) return;
    // Only update if not already unlocked
    const existing = this.getAchievement(badgeId);
    if (existing && existing.progress >= 100) return;

    const stmt = this.db.prepare(`
      INSERT INTO user_achievements (badge_id, unlocked_at, progress)
      VALUES (?, 0, ?)
      ON CONFLICT(badge_id) DO UPDATE SET progress = ?
    `);
    stmt.run(badgeId, progress, progress);
  }

  // ========== DAILY PROGRESS ==========

  /**
   * Get today's date string (YYYY-MM-DD)
   */
  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Get or create today's progress
   */
  getTodayProgress(): {
    date: string;
    breaks_taken: number;
    breaks_scheduled: number;
    healthy_blink_minutes: number;
    good_posture_minutes: number;
    total_session_minutes: number;
  } {
    if (!this.db) {
      return {
        date: this.getTodayDate(),
        breaks_taken: 0,
        breaks_scheduled: 4,
        healthy_blink_minutes: 0,
        good_posture_minutes: 0,
        total_session_minutes: 0,
      };
    }

    const today = this.getTodayDate();

    // Try to get existing record
    const selectStmt = this.db.prepare('SELECT * FROM daily_progress WHERE date = ?');
    let record = selectStmt.get(today) as any;

    // Create if doesn't exist
    if (!record) {
      const insertStmt = this.db.prepare(`
        INSERT INTO daily_progress (date, breaks_taken, breaks_scheduled)
        VALUES (?, 0, 4)
      `);
      insertStmt.run(today);
      record = selectStmt.get(today);
    }

    return record;
  }

  /**
   * Increment breaks taken today
   */
  incrementBreaksTaken(): void {
    if (!this.db) return;
    this.getTodayProgress(); // Ensure record exists
    const stmt = this.db.prepare(`
      UPDATE daily_progress
      SET breaks_taken = breaks_taken + 1
      WHERE date = ?
    `);
    stmt.run(this.getTodayDate());
  }

  /**
   * Add healthy blink minutes
   */
  addHealthyBlinkMinutes(minutes: number): void {
    if (!this.db) return;
    this.getTodayProgress(); // Ensure record exists
    const stmt = this.db.prepare(`
      UPDATE daily_progress
      SET healthy_blink_minutes = healthy_blink_minutes + ?
      WHERE date = ?
    `);
    stmt.run(minutes, this.getTodayDate());
  }

  /**
   * Add good posture minutes
   */
  addGoodPostureMinutes(minutes: number): void {
    if (!this.db) return;
    this.getTodayProgress(); // Ensure record exists
    const stmt = this.db.prepare(`
      UPDATE daily_progress
      SET good_posture_minutes = good_posture_minutes + ?
      WHERE date = ?
    `);
    stmt.run(minutes, this.getTodayDate());
  }

  /**
   * Add session minutes
   */
  addSessionMinutes(minutes: number): void {
    if (!this.db) return;
    this.getTodayProgress(); // Ensure record exists
    const stmt = this.db.prepare(`
      UPDATE daily_progress
      SET total_session_minutes = total_session_minutes + ?
      WHERE date = ?
    `);
    stmt.run(minutes, this.getTodayDate());
  }

  // ========== USER SETTINGS ==========

  /**
   * Get user settings
   */
  getUserSettings(): UserSettings | null {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT * FROM user_settings WHERE id = 1');
    return stmt.get() as UserSettings | null;
  }

  /**
   * Update user settings
   */
  updateUserSettings(settings: Partial<Omit<UserSettings, 'id'>>): void {
    if (!this.db) return;

    const updates: string[] = [];
    const values: any[] = [];

    if (settings.sound_preference !== undefined) {
      updates.push('sound_preference = ?');
      values.push(settings.sound_preference);
    }
    if (settings.has_completed_onboarding !== undefined) {
      updates.push('has_completed_onboarding = ?');
      values.push(settings.has_completed_onboarding);
    }
    if (settings.max_postpones !== undefined) {
      updates.push('max_postpones = ?');
      values.push(settings.max_postpones);
    }
    if (settings.break_interval_minutes !== undefined) {
      updates.push('break_interval_minutes = ?');
      values.push(settings.break_interval_minutes);
    }
    if (settings.break_duration_seconds !== undefined) {
      updates.push('break_duration_seconds = ?');
      values.push(settings.break_duration_seconds);
    }
    if (settings.posture_monitoring_enabled !== undefined) {
      updates.push('posture_monitoring_enabled = ?');
      values.push(settings.posture_monitoring_enabled);
    }
    if (settings.theme !== undefined) {
      updates.push('theme = ?');
      values.push(settings.theme);
    }

    if (updates.length === 0) return;

    const stmt = this.db.prepare(`
      UPDATE user_settings
      SET ${updates.join(', ')}
      WHERE id = 1
    `);
    stmt.run(...values);
  }

  /**
   * Close the database
   */
  close(): void {
    this.db?.close();
    this.db = null;
  }
}
