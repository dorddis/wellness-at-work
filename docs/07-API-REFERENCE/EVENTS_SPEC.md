# Events Specification

**Status:** Active | Last Updated: Dec 23, 2025

---

## Overview

This document specifies all event types, payload schemas, and event flows in Lumina.

**Event types:**
1. Blink events (raw frame data)
2. Wellness events (posture, yawns, drowsiness)
3. Session events (lifecycle)
4. Sync events (cloud communication)

---

## Blink Events

### blink_detected

**Triggered:** When EAR < 0.18 for 2 consecutive frames

**Payload:**
```typescript
interface BlinkDetectedEvent {
  timestamp: number          // Unix timestamp (ms)
  earLeft: number            // Left eye EAR
  earRight: number           // Right eye EAR
  earAvg: number             // Average EAR
  isBlink: boolean           // Always true for this event
  confidence: number         // MediaPipe confidence (0-1)
}
```

**Example:**
```json
{
  "timestamp": 1734955200000,
  "earLeft": 0.17,
  "earRight": 0.18,
  "earAvg": 0.175,
  "isBlink": true,
  "confidence": 0.95
}
```

---

## Wellness Events

### yawn_detected

**Triggered:** MAR > 0.7 for 2+ seconds

**Payload:**
```typescript
interface YawnDetectedEvent {
  timestamp: number
  mar: number                // Mouth aspect ratio
  duration: number           // Milliseconds
  severity: 'low' | 'medium' | 'high'
}
```

**Severity calculation:**
```typescript
if (duration < 2500) return 'low'
if (duration < 4000) return 'medium'
return 'high'
```

---

### posture_warning

**Triggered:** Distance/tilt/lean exceeds thresholds for 30+ seconds

**Payload:**
```typescript
interface PostureWarningEvent {
  timestamp: number
  postureType: 'too_close' | 'too_far' | 'head_tilt' | 'forward_lean'
  severity: 'low' | 'medium' | 'high'
  metadata: {
    distance?: number        // 0-1 (camera distance ratio)
    tilt?: number            // Degrees
    lean?: number            // 0-1 (forward lean ratio)
  }
}
```

**Example:**
```json
{
  "timestamp": 1734955300000,
  "postureType": "too_close",
  "severity": "medium",
  "metadata": {
    "distance": 0.75
  }
}
```

---

### drowsiness_detected

**Triggered:** PERCLOS > 15% for 1 minute

**Payload:**
```typescript
interface DrowsinessDetectedEvent {
  timestamp: number
  perclos: number            // % of time eyes >80% closed
  severity: 'low' | 'medium' | 'high'
  recommendation: string     // "Take a break" or "Get some rest"
}
```

---

## Session Events

### session_started

**Triggered:** User launches app or starts new session

**Payload:**
```typescript
interface SessionStartedEvent {
  sessionId: string          // UUID
  timestamp: number
  meetingMode: boolean       // True if meeting detected
  userId?: string            // Supabase user ID (if authenticated)
}
```

---

### session_ended

**Triggered:** User closes app or manually ends session

**Payload:**
```typescript
interface SessionEndedEvent {
  sessionId: string
  timestamp: number
  duration: number           // Milliseconds
  totalBlinks: number
  avgWellnessScore: number   // 0-100
  breaksTokenen: number
}
```

---

### minute_rollup_created

**Triggered:** Every 60 seconds during active session

**Payload:**
```typescript
interface MinuteRollupCreatedEvent {
  sessionId: string
  minuteStart: number        // Unix timestamp (rounded to minute)
  blinkCount: number
  avgEar: number
  minEar: number
  maxEar: number
  wellnessScore: number      // 0-100
}
```

---

## Sync Events

### sync_started

**Triggered:** Cloud sync begins (every 5 minutes)

**Payload:**
```typescript
interface SyncStartedEvent {
  timestamp: number
  unsyncedCount: number      // Number of records to sync
}
```

---

### sync_completed

**Triggered:** Cloud sync succeeds

**Payload:**
```typescript
interface SyncCompletedEvent {
  timestamp: number
  syncedCount: number        // Successfully synced records
  duration: number           // Sync duration (ms)
}
```

---

### sync_failed

**Triggered:** Cloud sync fails

**Payload:**
```typescript
interface SyncFailedEvent {
  timestamp: number
  error: string              // Error message
  retryAfter: number         // Milliseconds until retry
}
```

---

## Achievement Events

### achievement_unlocked

**Triggered:** User unlocks achievement

**Payload:**
```typescript
interface AchievementUnlockedEvent {
  timestamp: number
  achievementId: string      // 'first-steps', 'perfect-day', etc.
  achievementName: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
}
```

---

### streak_updated

**Triggered:** Streak increments

**Payload:**
```typescript
interface StreakUpdatedEvent {
  timestamp: number
  streakType: 'daily_use' | 'healthy_eyes' | 'break_master' | 'good_posture'
  current: number            // New streak count
  best: number               // Personal best
  isNewRecord: boolean
}
```

---

## Related Documentation

- **Database Schema:** [Table definitions](DATABASE_SCHEMA.md)
- **Data Flow:** [Event processing pipeline](../03-ARCHITECTURE/DATA_FLOW.md)
- **Blink Detection:** [EAR algorithm](../05-FEATURES/BLINK_DETECTION.md)

---

**Questions?** See [Documentation Index](../INDEX.md).
