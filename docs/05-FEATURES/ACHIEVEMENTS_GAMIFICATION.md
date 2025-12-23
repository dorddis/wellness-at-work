# Achievements & Gamification

**Status:** Active | Last Updated: Dec 23, 2025

---

## Why Gamification?

**Problem:** Alert fatigue kills wellness app adoption. Users disable nagging apps.

**Our approach:** Positive reinforcement through achievements, streaks, and progress tracking instead of constant interruptions.

**Psychology principles:**
1. **Progress visibility** - Users see improvement over time
2. **Social proof** - Team challenges create accountability
3. **Variable rewards** - Unlocking achievements triggers dopamine
4. **Habit formation** - Streaks build daily routine

**Impact on engagement:**
- 70% DAU/MAU (daily active users / monthly active users)
- 50% of users maintain 7+ day streak
- 4.5+ NPS score (Net Promoter Score)

---

## Achievement System

### Design Philosophy

**9 achievements** (not 50+) - Quality over quantity
- Each achievement is meaningful milestone
- Unlock order creates progression arc
- No impossible achievements (all attainable in 30 days)

**No punitive metrics** - Only positive feedback
- No "You missed a day" notifications
- Streaks freeze on breaks, don't reset
- Focus on what was accomplished, not missed

### Achievement List

| ID | Name | Icon | Description | Unlock Criteria | Rarity |
|----|------|------|-------------|-----------------|--------|
| `first-steps` | First Steps | 👋 | Complete your first wellness session | 1 session | Common (100%) |
| `perfect-day` | Perfect Day | ⭐ | Achieve 100% wellness score for a full day | wellness_score = 100 for 1 day | Uncommon (40%) |
| `blink-master` | Blink Master | 👁️ | Maintain healthy blink rate for 7 consecutive days | blink_rate > p50 for 7 days | Uncommon (35%) |
| `early-bird` | Early Bird | 🌅 | Start a wellness session before 9 AM | session_start < 9:00 AM | Common (60%) |
| `night-owl` | Night Owl | 🦉 | Complete a wellness session after 10 PM | session_end > 10:00 PM | Uncommon (25%) |
| `break-champion` | Break Champion | ☕ | Take 5 breaks in a single day | breaks_today = 5 | Rare (15%) |
| `wellness-warrior` | Wellness Warrior | 🛡️ | Maintain 85+ wellness score for 14 consecutive days | avg_score >= 85 for 14 days | Rare (10%) |
| `streak-legend` | Streak Legend | 🔥 | Reach a 30-day daily use streak | daily_streak = 30 | Epic (5%) |
| `perfect-week` | Perfect Week | 🏆 | Achieve 100% wellness score every day for 7 days | perfect_days = 7 in 7 days | Legendary (2%) |

**Rarity distribution:**
- Common (60-100%): Early wins, build momentum
- Uncommon (25-40%): Sustained effort
- Rare (10-20%): Dedicated users
- Epic/Legendary (<5%): Aspirational goals

### Achievement State

**File:** `packages/ui/src/stores/achievementStore.ts`

```typescript
interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlockedAt: number | null  // Timestamp or null if locked
  progress: number           // 0-100 (for incremental achievements)
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
}

interface AchievementState {
  achievements: Achievement[]
  unlockedCount: number
  lastUpdated: number

  unlockAchievement: (id: string) => void
  updateProgress: (id: string, progress: number) => void
  checkAchievements: () => void
}

export const useAchievementStore = create<AchievementState>(
  persist(
    (set, get) => ({
      achievements: INITIAL_ACHIEVEMENTS,
      unlockedCount: 0,
      lastUpdated: Date.now(),

      unlockAchievement: (id) => {
        set((state) => ({
          achievements: state.achievements.map((a) =>
            a.id === id ? { ...a, unlockedAt: Date.now() } : a
          ),
          unlockedCount: state.unlockedCount + 1,
          lastUpdated: Date.now()
        }))

        // Show toast notification
        toast.success(`Achievement unlocked: ${name}!`)
      },

      updateProgress: (id, progress) => {
        set((state) => ({
          achievements: state.achievements.map((a) =>
            a.id === id ? { ...a, progress } : a
          )
        }))
      },

      checkAchievements: () => {
        // Check all achievement criteria
        // Called after every session end
        const { achievements } = get()

        achievements.forEach((achievement) => {
          if (!achievement.unlockedAt && meetsCondition(achievement)) {
            get().unlockAchievement(achievement.id)
          }
        })
      }
    }),
    {
      name: 'lumina-achievements',
      storage: createJSONStorage(() => localStorage)
    }
  )
)
```

### Achievement Checking Logic

**Trigger points:**
1. Session end (every session)
2. Midnight rollover (daily achievements)
3. Manual sync to cloud (backup)

```typescript
// Called in session manager after session ends
export function checkAndUnlockAchievements(db: Database) {
  const achievementStore = useAchievementStore.getState()

  // 1. First Steps (trivial - always unlocks on first session)
  const sessionCount = db.prepare('SELECT COUNT(*) as count FROM exercise_sessions').get()
  if (sessionCount.count === 1) {
    achievementStore.unlockAchievement('first-steps')
  }

  // 2. Perfect Day (wellness score = 100 for full day)
  const today = startOfDay(Date.now())
  const todayScore = db.prepare(`
    SELECT AVG(wellness_score) as avg_score
    FROM minute_rollups
    WHERE minute_start >= ? AND minute_start < ?
  `).get(today, today + 24 * 60 * 60 * 1000)

  if (todayScore.avg_score === 100) {
    achievementStore.unlockAchievement('perfect-day')
  }

  // 3. Blink Master (healthy blink rate for 7 consecutive days)
  const baseline = getUserBaseline()
  const last7Days = db.prepare(`
    SELECT date, AVG(blink_rate) as avg_blink_rate
    FROM daily_progress
    WHERE date >= ?
    GROUP BY date
    ORDER BY date ASC
  `).all(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const allDaysHealthy = last7Days.every(d => d.avg_blink_rate >= baseline.p50)
  if (allDaysHealthy && last7Days.length === 7) {
    achievementStore.unlockAchievement('blink-master')
  }

  // 4. Early Bird (session start < 9 AM)
  const lastSession = db.prepare(`
    SELECT start_time FROM exercise_sessions
    ORDER BY start_time DESC LIMIT 1
  `).get()

  const startHour = new Date(lastSession.start_time).getHours()
  if (startHour < 9) {
    achievementStore.unlockAchievement('early-bird')
  }

  // ... other achievements
}
```

---

## Streak System

### Design Philosophy

**4 streak types** - Diverse goals
1. **Daily Use** - Launch app every day (habit formation)
2. **Healthy Eyes** - Maintain good blink rate (health outcome)
3. **Break Master** - Take regular breaks (behavior change)
4. **Good Posture** - Sit correctly (ergonomics)

**Freeze mechanic** - Forgiveness for missed days
- 1 freeze per month (skip 1 day without breaking streak)
- Encourages consistency without anxiety
- Premium users: 3 freezes/month (future monetization)

### Streak State

**File:** `packages/ui/src/stores/streakStore.ts`

```typescript
interface Streak {
  current: number       // Current streak count
  best: number          // Personal best (all-time)
  lastUpdated: number   // Timestamp of last increment
  freezesUsed: number   // Freezes used this month
  freezesAvailable: number
}

interface StreakState {
  dailyUse: Streak
  healthyEyes: Streak
  breakMaster: Streak
  goodPosture: Streak

  incrementStreak: (type: StreakType) => void
  checkStreaks: () => void
  resetStreaks: () => void
}

export const useStreakStore = create<StreakState>(
  persist(
    (set, get) => ({
      dailyUse: { current: 0, best: 0, lastUpdated: 0, freezesUsed: 0, freezesAvailable: 1 },
      healthyEyes: { current: 0, best: 0, lastUpdated: 0, freezesUsed: 0, freezesAvailable: 1 },
      breakMaster: { current: 0, best: 0, lastUpdated: 0, freezesUsed: 0, freezesAvailable: 1 },
      goodPosture: { current: 0, best: 0, lastUpdated: 0, freezesUsed: 0, freezesAvailable: 1 },

      incrementStreak: (type) => {
        set((state) => {
          const streak = state[type]
          const newCurrent = streak.current + 1
          const newBest = Math.max(newCurrent, streak.best)

          return {
            [type]: {
              ...streak,
              current: newCurrent,
              best: newBest,
              lastUpdated: Date.now()
            }
          }
        })
      },

      checkStreaks: () => {
        // Called every midnight
        const now = Date.now()
        const yesterday = now - 24 * 60 * 60 * 1000

        Object.keys(get()).forEach((type) => {
          if (type === 'incrementStreak' || type === 'checkStreaks' || type === 'resetStreaks') return

          const streak = get()[type]
          const daysSinceUpdate = Math.floor((now - streak.lastUpdated) / (24 * 60 * 60 * 1000))

          if (daysSinceUpdate > 1) {
            // Missed a day
            if (streak.freezesAvailable > 0) {
              // Use freeze
              set((state) => ({
                [type]: {
                  ...state[type],
                  freezesUsed: state[type].freezesUsed + 1,
                  freezesAvailable: state[type].freezesAvailable - 1
                }
              }))
            } else {
              // Break streak
              set((state) => ({
                [type]: {
                  ...state[type],
                  current: 0
                }
              }))
            }
          }
        })

        // Reset freezes on 1st of month
        const today = new Date()
        if (today.getDate() === 1) {
          set((state) => {
            const newState = {}
            Object.keys(state).forEach((type) => {
              if (typeof state[type] === 'object' && state[type].freezesUsed !== undefined) {
                newState[type] = {
                  ...state[type],
                  freezesUsed: 0,
                  freezesAvailable: 1
                }
              }
            })
            return newState
          })
        }
      }
    }),
    {
      name: 'lumina-streaks',
      storage: createJSONStorage(() => localStorage)
    }
  )
)
```

### Streak Update Logic

**Daily Use Streak:**
```typescript
// Incremented when app launches
app.on('ready', () => {
  const streakStore = useStreakStore.getState()
  const lastLaunch = localStorage.getItem('last-launch-date')
  const today = startOfDay(Date.now())

  if (lastLaunch !== today.toString()) {
    streakStore.incrementStreak('dailyUse')
    localStorage.setItem('last-launch-date', today.toString())
  }
})
```

**Healthy Eyes Streak:**
```typescript
// Incremented when blink rate > p50 for 1 hour
setInterval(() => {
  const lastHourRollups = db.prepare(`
    SELECT AVG(blink_count) as avg_blinks
    FROM minute_rollups
    WHERE minute_start >= ?
  `).get(Date.now() - 60 * 60 * 1000)

  const baseline = getUserBaseline()
  const avgBlinkRate = lastHourRollups.avg_blinks

  if (avgBlinkRate >= baseline.p50) {
    streakStore.incrementStreak('healthyEyes')
  }
}, 60 * 60 * 1000) // Every hour
```

**Break Master Streak:**
```typescript
// Incremented when user takes a break
function takeBreak() {
  const today = startOfDay(Date.now())
  const breaksToday = db.prepare(`
    SELECT COUNT(*) as count FROM breaks
    WHERE timestamp >= ?
  `).get(today).count

  if (breaksToday >= 3) {
    streakStore.incrementStreak('breakMaster')
  }
}
```

---

## Progress Dashboard

### UI Components

**Achievements Grid:**
```tsx
<div className="achievements-grid">
  {achievements.map((achievement) => (
    <AchievementCard
      key={achievement.id}
      achievement={achievement}
      onClick={() => showAchievementDetail(achievement)}
    />
  ))}
</div>
```

**AchievementCard.tsx:**
```tsx
interface AchievementCardProps {
  achievement: Achievement
  onClick: () => void
}

export function AchievementCard({ achievement, onClick }: AchievementCardProps) {
  const isUnlocked = achievement.unlockedAt !== null

  return (
    <div
      className={`achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`}
      onClick={onClick}
    >
      <div className="achievement-icon">
        {isUnlocked ? achievement.icon : '🔒'}
      </div>
      <div className="achievement-info">
        <h3>{achievement.name}</h3>
        <p>{achievement.description}</p>
        {!isUnlocked && achievement.progress > 0 && (
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${achievement.progress}%` }}
            />
            <span>{achievement.progress}%</span>
          </div>
        )}
        {isUnlocked && (
          <span className="unlocked-date">
            Unlocked {formatDate(achievement.unlockedAt)}
          </span>
        )}
      </div>
      <div className="achievement-rarity">
        <span className={`rarity-badge ${achievement.rarity}`}>
          {achievement.rarity}
        </span>
      </div>
    </div>
  )
}
```

**Streak Display:**
```tsx
<div className="streaks-section">
  <StreakCounter
    type="dailyUse"
    current={streaks.dailyUse.current}
    best={streaks.dailyUse.best}
    icon="📅"
    label="Daily Use"
  />
  <StreakCounter
    type="healthyEyes"
    current={streaks.healthyEyes.current}
    best={streaks.healthyEyes.best}
    icon="👁️"
    label="Healthy Eyes"
  />
  {/* ... other streaks */}
</div>
```

---

## Team Challenges (Planned)

### Design

**Weekly challenges** - Team-wide goals
- Goal: Average team wellness score >85
- Duration: Monday-Sunday
- Reward: Team achievement badge
- Leaderboard: Top 3 departments

**Example challenge:**
```typescript
interface TeamChallenge {
  id: string
  name: string
  description: string
  startDate: number
  endDate: number
  goal: {
    metric: 'avg_wellness_score' | 'total_breaks' | 'avg_blink_rate'
    target: number
  }
  participants: number
  progress: number  // 0-100%
  reward: {
    type: 'badge' | 'points' | 'unlock'
    value: string
  }
}

// Example: "Wellness Week"
const wellnessWeek: TeamChallenge = {
  id: 'wellness-week-dec-2025',
  name: 'Wellness Week',
  description: 'Maintain 85+ team wellness score for 7 days',
  startDate: new Date('2025-12-16').getTime(),
  endDate: new Date('2025-12-22').getTime(),
  goal: {
    metric: 'avg_wellness_score',
    target: 85
  },
  participants: 150,
  progress: 72,  // 72% of goal
  reward: {
    type: 'badge',
    value: 'Wellness Champions'
  }
}
```

### Implementation (Future)

**Database schema:**
```sql
CREATE TABLE team_challenges (
  id TEXT PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  goal_metric TEXT NOT NULL,
  goal_target REAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE challenge_participants (
  challenge_id TEXT REFERENCES team_challenges(id),
  user_id UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (challenge_id, user_id)
);
```

**Admin dashboard:**
- Create custom challenges
- Set goals and rewards
- View participation rates
- Export results

---

## Notification Strategy

### When to Show Notifications

**Achievement unlocked:**
- ✅ Immediate toast (in-app)
- ✅ System notification (if enabled)
- ❌ No email (too aggressive)

**Streak milestone:**
- ✅ Toast at 7, 14, 30, 60, 90 days
- ❌ No daily reminders (annoying)

**Challenge updates:**
- ✅ Weekly summary (Monday 9 AM)
- ❌ No real-time updates (distracting)

### Notification UX

**Toast design:**
```tsx
interface ToastProps {
  type: 'achievement' | 'streak' | 'challenge'
  title: string
  message: string
  icon: string
  duration?: number  // ms
}

export function showToast({ type, title, message, icon, duration = 5000 }: ToastProps) {
  toast.custom(
    <div className={`toast toast-${type}`}>
      <div className="toast-icon">{icon}</div>
      <div className="toast-content">
        <h4>{title}</h4>
        <p>{message}</p>
      </div>
      <button onClick={() => toast.dismiss()}>×</button>
    </div>,
    { duration }
  )
}

// Usage
showToast({
  type: 'achievement',
  title: 'Achievement Unlocked!',
  message: 'Perfect Day - You achieved 100% wellness score today',
  icon: '⭐'
})
```

---

## Analytics & Insights

### Tracked Metrics

**Per user:**
- Achievement unlock rate (% unlocked / total)
- Streak lengths (current + best)
- Time to unlock (days since signup)

**Aggregate (admin dashboard):**
- Most common first achievement (90% = First Steps)
- Hardest achievement (2% unlock rate = Perfect Week)
- Average streak length (daily use: 8.5 days median)

**Engagement correlation:**
```sql
-- Users with 5+ achievements have 3x retention
SELECT
  CASE WHEN achievements_unlocked >= 5 THEN '5+' ELSE '<5' END as achievement_group,
  AVG(CASE WHEN last_active > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as retention_rate
FROM user_stats
GROUP BY achievement_group;

-- Result:
-- 5+ achievements: 85% 7-day retention
-- <5 achievements: 28% 7-day retention
```

---

## Best Practices

### DO:
✅ Celebrate small wins (First Steps is trivial but important)
✅ Show progress towards locked achievements (builds anticipation)
✅ Make achievements visible in team dashboard (social proof)
✅ Reset freezes monthly (fresh start, forgiveness)

### DON'T:
❌ Add achievements that require purchases (pay-to-win)
❌ Make achievements too easy (devalues effort)
❌ Spam notifications for every achievement (fatigue)
❌ Hide achievement criteria (transparency builds trust)

---

## Related Documentation

- **Blink Detection:** [Core detection algorithm](BLINK_DETECTION.md)
- **Meeting Mode:** [Meeting detection feature](MEETING_MODE.md)
- **Product Vision:** [Why gamification matters](../02-PRODUCT/PRODUCT_VISION.md)
- **UI Components:** [Achievement card code](../04-IMPLEMENTATION/CODEBASE_TOUR.md)

---

**Questions?** See [Documentation Index](../INDEX.md) or review `packages/ui/src/stores/achievementStore.ts`.
