# WellnessGuard - Scaling Challenges (Filtered Top 50%)

Realistic scaling challenges for 1K-100K users. Removed premature optimization for 1M+ scale.

---

## The 10 That Actually Matter

### 1. Offline Queue & Sync Storm
**The problem:**
- User offline 2 hours = 216,000 queued data points
- Office internet outage, 500 users reconnect simultaneously
- 54 million records hitting API in seconds

**Why it matters:** This WILL happen. Not edge case. Regular occurrence.

**Must handle:** Backpressure, rate limiting, chunked sync, queue persistence.

---

### 2. Write Path & Connection Limits
**The problem:**
- 1,000 concurrent users = 30,000 writes/second
- PostgreSQL max_connections typically 100-500
- Supabase connection pooling has limits
- 9 AM Monday = everyone starts simultaneously

**Why it matters:** First real scale test. Will hit this at ~500 concurrent users.

**Must handle:** Connection pooling, batched writes, queue buffering.

---

### 3. Data Volume & Retention Policy
**The problem:**
- 864,000 data points per user per day
- 1,000 users x 30 days = 25.9 billion rows
- Storage costs grow linearly, query time grows worse

**Why it matters:** Unbounded growth kills you. Must decide early what to keep.

**Must handle:** Aggregation policy, raw data TTL, tiered storage.

---

### 4. Dashboard Query Performance
**The problem:**
- "Last 30 days" = 25.9 million rows per user
- Aggregations (avg, percentile) on large datasets
- Charts can't render millions of points

**Why it matters:** Slow dashboard = users leave. Core product experience.

**Must handle:** Pre-aggregated rollups, materialized views, pagination.

---

### 5. Real-Time Alert Latency
**The problem:**
- "Low blink rate for 2 minutes" = continuous evaluation
- Can't query database every second for every user
- Alert must fire within seconds, not minutes

**Why it matters:** Delayed alerts are useless alerts. Core feature.

**Must handle:** Client-side detection, streaming architecture, or smart batching.

---

### 6. GDPR Deletion at Scale
**The problem:**
- User has 25+ million rows across tables
- DELETE with foreign key cascades
- Must complete in reasonable time
- Must prove deletion for compliance

**Why it matters:** Legal requirement. Can't ignore.

**Must handle:** Soft delete + background cleanup, or partitioned tables.

---

### 7. Session Management
**The problem:**
- App crash = session never closed (ended_at = NULL)
- Laptop sleep without quit = orphaned session
- Offline data from yesterday - which session?
- Zombie sessions accumulating forever

**Why it matters:** Dirty data breaks analytics. Wellness scores become meaningless.

**Must handle:** Heartbeat timeout, session recovery logic, cleanup jobs.

---

### 8. Partial Sync Failure & Idempotency
**The problem:**
- 50,000 records in queue, network fails at record 25,000
- Which records synced? Which didn't?
- Retry sends duplicates if not idempotent
- User shows double blink counts

**Why it matters:** Data integrity. Wrong data = wrong wellness scores = lost trust.

**Must handle:** Idempotency keys, sync checkpoints, upsert logic.

---

### 9. Supabase Tier Limits
**The problem:**
- Free tier: 500MB database, limited connections
- Pro tier: 8GB database, still has limits
- Realtime: connection quotas per project
- Egress: bandwidth costs for dashboard queries

**Why it matters:** Real cost constraint. Affects architecture decisions early.

**Must handle:** Know limits, plan upgrade path, consider self-host threshold.

---

### 10. Burst Traffic Handling
**The problem:**
- 9 AM Monday: 10x normal traffic in 5 minutes
- Post-lunch: everyone returns at once
- Geographic clustering (timezone comes online)

**Why it matters:** System must handle peaks, not just averages.

**Must handle:** Auto-scaling, graceful degradation, queue buffers.

---

## Removed (Premature Optimization)

| Challenge | Reason for Removal |
|-----------|-------------------|
| 1M user scale calculations | Years away, solve when approaching |
| 17 trillion row projections | Fantasy math for startup |
| $5.8M/year storage costs | Irrelevant at current scale |
| 100K WebSocket connections | Enterprise-only problem |
| Schema migrations on huge tables | Won't have huge tables for years |
| Multi-region deployment | Start single region |
| 100TB backup procedures | Not our scale |
| Index bloat on billions of rows | Premature worry |
| Team/admin cross-user queries | Build later when needed |
| Split brain distributed scenarios | Over-engineering |
| PostgreSQL corruption recovery | Rare, trust the database |
| Feature flags at massive scale | Startup complexity not needed |
| Client update rollout to millions | Not there yet |
| Noisy neighbor isolation | Optimize later |
| Complex clock skew handling | Simple validation sufficient |

---

## Priority Order for Implementation

**Phase 1 (MVP):**
1. Session management (clean data from start)
2. Idempotent sync (prevent duplicates)
3. Basic offline queue (SQLite + simple sync)

**Phase 2 (First 1K users):**
4. Retention policy (don't store everything forever)
5. Dashboard query optimization (pre-aggregation)
6. GDPR deletion path

**Phase 3 (Scaling to 10K+):**
7. Connection pooling / batched writes
8. Sync storm handling (rate limiting, backpressure)
9. Real-time alert architecture
10. Supabase tier planning / self-host evaluation

---

## Relationship to Critical Challenges

Scaling challenges are SECONDARY to the Critical Six (see CRITICAL_CHALLENGES.md).

**Solve first:** Glasses, lighting, alert fatigue, privacy, baseline, flow state.
**Then solve:** These 10 scaling challenges.
**Ignore for now:** The removed 50%.

A product that works but doesn't scale can be fixed.
A product that scales but doesn't work is worthless.
