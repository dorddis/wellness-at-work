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

export class DatabaseManager {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    // Store in app data directory
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'lumina.db');
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

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_blink_events_timestamp ON blink_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_minute_rollups_timestamp ON minute_rollups(timestamp);
      CREATE INDEX IF NOT EXISTS idx_minute_rollups_synced ON minute_rollups(synced) WHERE synced = 0;
    `);

    // Insert default baseline if not exists
    this.db.exec(`
      INSERT OR IGNORE INTO user_baseline (id, samples_count) VALUES (1, 0)
    `);
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

  /**
   * Close the database
   */
  close(): void {
    this.db?.close();
    this.db = null;
  }
}
