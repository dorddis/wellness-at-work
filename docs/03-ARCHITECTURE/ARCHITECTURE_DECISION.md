# Architecture Decision Matrix - WellnessGuard

**Decision:** Choose TimescaleDB architecture for MVP, plan event-driven migration for scale.

---

## Visual Decision Tree

```
┌─────────────────────────────────────────────────────────────┐
│           What's the primary constraint?                    │
└──────────────┬────────────────────────────────┬─────────────┘
               │                                │
        ┌──────▼──────┐                  ┌──────▼──────┐
        │ Speed to    │                  │ Long-term   │
        │ Market      │                  │ Cost        │
        └──────┬──────┘                  └──────┬──────┘
               │                                │
               │                                │
        ┌──────▼──────────────┐          ┌──────▼──────────────┐
        │ TimescaleDB         │          │ Event-Driven        │
        │ - 4 weeks to MVP    │          │ - 68% cheaper       │
        │ - Proven tech       │          │ - More scalable     │
        │ - Simple ops        │          │ - Future-proof      │
        └─────────────────────┘          └─────────────────────┘
```

---

## Score Comparison (1-10 scale)

| Criterion | Weight | TimescaleDB | Event-Driven | Winner |
|-----------|--------|-------------|--------------|--------|
| **Development Speed** | 20% | 9 | 6 | TimescaleDB |
| **Operational Simplicity** | 15% | 9 | 5 | TimescaleDB |
| **Cost Efficiency** | 15% | 6 | 10 | Event-Driven |
| **Query Performance** | 10% | 10 | 8 | TimescaleDB |
| **Scalability** | 10% | 9 | 9 | Tie |
| **Future Extensibility** | 10% | 7 | 10 | Event-Driven |
| **Team Learning Curve** | 10% | 10 | 4 | TimescaleDB |
| **Interview Impact** | 10% | 7 | 10 | Event-Driven |
| **Weighted Score** | 100% | **8.4** | **7.3** | **TimescaleDB** |

---

## Critical Six Solutions Comparison

| Challenge | TimescaleDB | Event-Driven | Difference |
|-----------|-------------|--------------|------------|
| **#1: Glasses Detection** | Client-side | Client-side | Same |
| **#2: Lighting Robustness** | Client-side | Client-side | Same |
| **#3: Alert Fatigue** | Redis cooldowns + preferences | Local CEP + event patterns | Event-Driven more elegant |
| **#4: Privacy Perception** | No image storage | Event stream (no images) | Same |
| **#5: Baseline Calibration** | SQL aggregates | ML worker on event stream | Event-Driven more flexible |
| **#6: Flow State** | Preferences JSONB | Event-driven state machine | Event-Driven more powerful |

**Winner: Event-Driven (more elegant solutions for #3, #5, #6)**

---

## Scaling Challenges Comparison

| Challenge | TimescaleDB | Event-Driven | Difference |
|-----------|-------------|--------------|------------|
| **#1: Offline Queue** | Batch COPY (36 min sync) | Redis Streams (3.6 min sync) | Event-Driven 10x faster |
| **#2: Write Path** | PgBouncer pooling | Redis buffer + workers | Event-Driven better decoupled |
| **#3: Data Volume** | Compression + retention | Same + tiered storage | Tie |
| **#4: Dashboard Queries** | Continuous aggregates (20ms) | Rollups (15ms but stale) | TimescaleDB instant |
| **#5: Alert Latency** | Client-side (<100ms) | Client-side (<100ms) | Same |
| **#6: GDPR Deletion** | Chunk-aware (1-2s) | Event sourcing (instant) | Event-Driven faster |
| **#7: Session Management** | Heartbeat + cleanup | Event-sourced lifecycle | Event-Driven more robust |
| **#8: Sync Idempotency** | ON CONFLICT | Event IDs + upsert | Same |
| **#9: Supabase Limits** | Need paid tier | Redis offloads writes | Event-Driven cheaper |
| **#10: Burst Traffic** | K8s HPA + circuit breakers | Redis buffer + workers | Event-Driven more elastic |

**Winner: Event-Driven (better for 6/10 challenges)**

---

## Cost Breakdown @ 10K Users

### TimescaleDB Stack
```
Component                Cost/Month
─────────────────────────────────────
Timescale Cloud         $313
  - 3TB storage @ $0.10/GB
  - Compression enabled
  - 30-day retention

Compute                 $100
  - 4 vCPU, 16GB RAM
  - Auto-scaling enabled

Supabase Auth           $25
  - 10K MAU
  - PostgreSQL access

API Servers (Railway)   $50
  - 2x instances
  - Auto-scaling

Total                   $488/month
Per User                $0.049/month
─────────────────────────────────────
```

### Event-Driven Stack
```
Component                Cost/Month
─────────────────────────────────────
Upstash Redis           $50
  - Redis Streams
  - 10K events/sec
  - 1-hour retention

Railway Workers         $60
  - 3x worker instances
  - Auto-scaling enabled

Supabase                $25
  - Auth + rollup storage
  - 500GB (vs 3TB)

Cloudflare Workers      $5
  - API gateway
  - Edge functions

Total                   $140/month
Per User                $0.014/month
─────────────────────────────────────

SAVINGS: $348/month (71% cheaper)
```

---

## Interview Strategy Matrix

### If Interviewer Asks About...

**Scalability:**
> "I chose TimescaleDB because it's proven at 100K+ sensors. But I've also designed an event-driven alternative that's 68% cheaper and scales linearly. Here's the migration path..."

**Cost:**
> "TimescaleDB is $0.049/user/month vs event-driven at $0.014/user/month. For an MVP with <1K users, that's $50/month vs $14/month - not a significant difference. But at 10K users, the $348/month savings becomes meaningful, which is why I'd plan a migration by month 3."

**Complexity:**
> "TimescaleDB has lower complexity (standard SQL, managed service, fewer moving parts). Event-driven is more complex (Redis, workers, eventual consistency) but provides better decoupling for future features like ML, multi-region, or integrations."

**Real-Time:**
> "Both architectures handle real-time alerts identically - client-side CEP with <100ms latency. The difference is dashboard consistency: TimescaleDB gives instant data (20ms query), event-driven has 15-second lag but is cheaper."

**Privacy:**
> "Both architectures are privacy-first - no images leave the device. TimescaleDB stores metrics directly in PostgreSQL, event-driven stores events in Redis then persists to PostgreSQL. Neither touches raw video."

---

## Migration Trigger Points

```
Timeline    Users    Action                              Rationale
─────────────────────────────────────────────────────────────────────
Week 1-4    0-100    Build with TimescaleDB              Fast MVP, proven tech

Week 5-8    100-1K   Add event logging (dual-write)      Audit trail, debugging

Month 3     1K-5K    Introduce Redis Streams             Cost savings kick in
                     Build aggregation workers           Decouple processing
                     Enable continuous aggregates        Dashboard performance

Month 4     5K-10K   Full event-driven migration         $348/mo savings
                     Remove direct DB writes             Better scaling
                     CQRS read/write separation          Future-proof

Month 6+    10K+     Optimize worker count               Linear scaling
                     Consider self-hosted TimescaleDB    Further cost savings
                     Add ML workers                      Predictive features
```

---

## What to Build First

### Phase 1: TimescaleDB MVP (Week 1-4)

**Why TimescaleDB first:**
1. Faster development (familiar SQL)
2. Lower risk (proven at scale)
3. Easier debugging (direct queries)
4. Simpler architecture (fewer components)

**Deliverables:**
- Hypertables for blink_data, posture_data
- Continuous aggregates (5-min, hourly, daily)
- Compression policies (7-day trigger)
- Retention policies (30-day raw)
- Web dashboard querying aggregates
- Desktop app with SQLite queue

**Success Metrics:**
- 10 test users successfully syncing
- Dashboard loads in <100ms
- Offline sync working (216K events)
- All Critical Six challenges solved

---

### Phase 2: Event Layer Addition (Week 5-8)

**Why add events:**
1. Audit trail (compliance, debugging)
2. Prepare for migration
3. Learn event sourcing patterns

**Changes:**
- Add events table (dual-write)
- Log all state changes
- Build event replay functionality

**Success Metrics:**
- All actions logged as events
- Event replay reconstructs state
- No performance degradation

---

### Phase 3: Event-Driven Migration (Month 3)

**Why migrate now:**
1. Cost savings ($348/mo at 10K users)
2. Scale preparation (10K-100K users)
3. Better extensibility (ML, integrations)

**Changes:**
- Introduce Redis Streams
- Build worker fleet (persistence, aggregation, analytics)
- CQRS separation (events → TimescaleDB rollups)
- Remove direct DB writes

**Success Metrics:**
- Cost reduced by 68%
- Dashboard still <100ms (eventual consistency acceptable)
- Offline sync 10x faster
- Workers auto-scaling

---

## Decision: Start with TimescaleDB

### Reasons:
1. **Interview context** - Easier to explain in 1-2 hour session
2. **Risk mitigation** - Proven technology, lower chance of failure
3. **Team familiarity** - SQL is universal, event sourcing is not
4. **Development speed** - 4 weeks to MVP vs 6-8 weeks
5. **Debugging** - Simpler to troubleshoot initially

### But also mention:
> "I've designed this with a migration path to event-driven architecture by month 3. Here's why that's the right evolution..."

**Show migration plan in interview - demonstrates forward thinking.**

---

## Final Recommendation

**For the interview:**
1. **Primary presentation:** TimescaleDB architecture (detailed in TIME_SERIES_ARCHITECTURE.md)
2. **Alternative mention:** Event-driven architecture (in ARCHITECTURE_SUMMARY.md)
3. **Evolution path:** Migration plan (this document)

**For real implementation:**
1. **Weeks 1-4:** Build TimescaleDB MVP
2. **Weeks 5-8:** Add event logging (dual-write)
3. **Month 3:** Migrate to event-driven (if >1K users)
4. **Month 6+:** Optimize and extend

**Interview talking points:**
- "I chose TimescaleDB because [reasons]"
- "I've also designed an event-driven alternative because [reasons]"
- "Here's when I'd migrate: [trigger points]"
- "This shows I can balance pragmatism (MVP fast) with architecture vision (scale plan)"

---

## One-Sentence Summary

**"Start with TimescaleDB for a 4-week MVP, migrate to event-driven by month 3 when cost savings ($348/mo) justify the complexity, demonstrating both pragmatic execution and architectural foresight."**

---

**This is the answer to give in the interview.**
