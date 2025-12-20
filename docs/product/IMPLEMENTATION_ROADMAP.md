# Event-Driven Architecture Implementation Roadmap

## 4-Week Sprint Plan: MVP to Production

---

## Week 1: Foundation + Local-First Client

### Days 1-2: Project Setup + Local CEP

**Goal:** Client can detect events and trigger alerts locally (no server yet)

#### Tasks
- [ ] Initialize Electron project (electron-vite template)
- [ ] Set up SQLite database (better-sqlite3)
  - Schema: events table (event_id, event_type, timestamp, payload, synced)
  - Index on (synced, timestamp)
  - WAL mode for concurrency
- [ ] Implement event producer
  - Blink detector → Publish blink_detected events
  - Posture detector → Publish posture_measured events
  - Fatigue detector → Publish fatigue_assessed events
- [ ] Build local CEP engine (in-memory sliding windows)
  - 1min window for blink rate
  - 2min window for low blink detection
  - 3min window for posture alerts
- [ ] Create alert notification system (system tray toasts)

**Deliverable:** Desktop app that works 100% offline, shows real-time alerts

**Test:** Leave app running for 1 hour, verify alerts work without network

---

### Days 3-4: Event Schema + Sync Manager

**Goal:** Client can queue events and sync in batches

#### Tasks
- [ ] Define event schema (TypeScript types)
  ```typescript
  interface WellnessEvent {
    event_id: string;  // UUID v7
    user_id: string;
    session_id: string;
    event_type: string;
    timestamp: number;
    payload: object;
  }
  ```
- [ ] Implement sync manager
  - Background worker (runs every 5 seconds)
  - Reads unsyced events from SQLite
  - Batches 1000 events per request
  - Exponential backoff on failure
  - Idempotency tracking
- [ ] Build session lifecycle manager
  - session_started on app open
  - session_heartbeat every 30 seconds
  - session_ended on app close
  - session_recovered on crash recovery
- [ ] Add sync UI indicator ("Syncing 1,234 events...")

**Deliverable:** Client can queue events offline and sync when online

**Test:**
1. Disable network, use app for 30 minutes
2. Enable network, verify all events sync
3. Interrupt sync mid-way, verify resume works

---

### Days 5-7: Flow State Detection + Alert Suppression

**Goal:** Intelligent alert behavior (no fatigue)

#### Tasks
- [ ] Build flow state detector
  - Monitor typing speed (Electron globalShortcut)
  - Monitor mouse idle time (Electron powerMonitor)
  - Integrate with calendar API (optional)
  - Detect focus apps (IDE, editor, design tools)
- [ ] Implement alert cooldown system
  - Redis-like in-memory store (user:cooldowns)
  - TTL-based expiration
  - Per-alert-type cooldowns (10min for low_blink, 15min for posture)
- [ ] Build alert consolidation
  - Queue alerts during flow state
  - Show summary when flow state ends
  - "While you were focused: 2 posture alerts, 1 break reminder"
- [ ] Add alert escalation
  - Info → Warning → Critical based on duration
  - Critical alerts override cooldowns and flow state

**Deliverable:** Smart alert system that respects flow state and prevents fatigue

**Test:**
1. Simulate deep work (high typing, no mouse)
2. Verify alerts are suppressed
3. Stop typing, verify consolidated summary shows

---

## Week 2: Cloud Backend + Redis Streams

### Days 8-9: Cloudflare Workers API Gateway

**Goal:** Ingestion endpoint that publishes to Redis Streams

#### Tasks
- [ ] Create Cloudflare Workers project (wrangler init)
- [ ] Set up Upstash Redis account (free tier for dev)
  - Create Redis instance
  - Enable Redis Streams support
- [ ] Implement event ingestion endpoint
  ```typescript
  POST /events/batch
  - Validate JWT (Supabase Auth)
  - Validate event schema (Zod)
  - Rate limit (10 batches/min per user)
  - Publish to Redis Streams (XADD)
  - Return 202 Accepted
  ```
- [ ] Implement WebSocket handler (Durable Objects)
  - Connect client to user-specific stream
  - Push real-time updates (alert events)
- [ ] Add monitoring (Cloudflare Analytics)

**Deliverable:** API that accepts events and publishes to Redis Streams

**Test:**
1. Send 10,000 events via POST /events/batch
2. Verify all events in Redis (XLEN command)
3. Verify rate limiting works (429 on 11th batch)

---

### Days 10-11: Persistence Worker + TimescaleDB

**Goal:** Events flow from Redis → PostgreSQL

#### Tasks
- [ ] Set up Supabase project
  - Enable TimescaleDB extension
  - Create hypertable for raw events
    ```sql
    CREATE TABLE wellness_events (
      event_id TEXT PRIMARY KEY,
      user_id UUID NOT NULL,
      event_type TEXT NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL,
      payload JSONB NOT NULL
    );
    SELECT create_hypertable('wellness_events', 'timestamp');
    SELECT add_retention_policy('wellness_events', INTERVAL '7 days');
    ```
  - Create rollup tables (1min_stats, 1hr_stats, 1day_stats)
- [ ] Build persistence worker (Node.js on Railway)
  - Read from Redis Streams (XREADGROUP)
  - Batch 1000 events
  - Upsert to PostgreSQL (ON CONFLICT DO NOTHING)
  - Acknowledge consumption (XACK)
  - Auto-scale based on queue depth
- [ ] Add error handling (DLQ for failed events)

**Deliverable:** Events automatically flow from Redis to PostgreSQL

**Test:**
1. Send 100,000 events to Redis
2. Verify worker drains queue in <5 minutes
3. Verify all events in PostgreSQL
4. Verify idempotency (re-send same events, no duplicates)

---

### Days 12-14: Aggregation Worker + Rollups

**Goal:** Pre-computed aggregates for fast dashboard queries

#### Tasks
- [ ] Build aggregation worker (Node.js on Railway)
  - Consume from Redis Streams (aggregation-group)
  - Compute sliding window aggregates (1min, 5min)
  - Write to rollup tables
  - Write to Redis cache (user:{id}:latest)
- [ ] Create continuous aggregations (TimescaleDB)
  ```sql
  CREATE MATERIALIZED VIEW wellness_1min_rollup
  WITH (timescaledb.continuous) AS
  SELECT
    user_id,
    time_bucket('1 minute', timestamp) AS bucket,
    COUNT(*) FILTER (WHERE event_type = 'blink_detected') AS blink_count,
    AVG((payload->>'posture_score')::int) AS avg_posture_score
  FROM wellness_events
  GROUP BY user_id, bucket;
  ```
- [ ] Add refresh policy (update every 5 minutes)
- [ ] Add compression policy (compress after 24 hours)

**Deliverable:** Pre-aggregated data ready for dashboard queries

**Test:**
1. Send events for past 7 days
2. Verify 1min_rollup has 10,080 rows per user (7 days × 24 hours × 60 min)
3. Verify queries are fast (<20ms)

---

## Week 3: Dashboard + CEP Engine

### Days 15-16: Next.js Dashboard

**Goal:** Web dashboard that shows real-time and historical data

#### Tasks
- [ ] Create Next.js project (app router)
- [ ] Implement authentication (Supabase Auth)
- [ ] Build dashboard API routes
  ```typescript
  GET /api/dashboard/realtime (Redis cache)
  GET /api/dashboard/daily (1hr_rollup)
  GET /api/dashboard/weekly (1day_rollup)
  GET /api/dashboard/monthly (1day_rollup)
  ```
- [ ] Create UI components
  - Real-time blink rate chart (recharts)
  - Posture score gauge
  - Wellness score trend
  - Session history table
- [ ] Add WebSocket integration for live updates
- [ ] Deploy to Vercel

**Deliverable:** Web dashboard with real-time and historical views

**Test:**
1. Open dashboard, verify data loads in <1 second
2. Use desktop app, verify dashboard updates within 10 seconds
3. Query last 30 days, verify <50ms response time

---

### Days 17-18: Server-Side CEP Engine

**Goal:** Validate client alerts and detect patterns client can't see

#### Tasks
- [ ] Build CEP worker (Node.js on Railway)
  - Consume from Redis Streams (alert-group)
  - Pattern matching rules (Apache Flink-inspired)
    - Low blink rate sustained (2 minutes)
    - Poor posture sustained (3 minutes)
    - Fatigue indicators (10 minutes)
    - Long session without break (90 minutes)
  - Cross-session patterns (baseline drift detection)
  - Anomaly detection (suspicious client behavior)
- [ ] Implement alert publishing
  - Write alert events to Redis Streams
  - Push to WebSocket (real-time to dashboard)
  - Store in alerts table (PostgreSQL)
- [ ] Add alert override system
  - Server can suppress client alerts (false positives)
  - Server can trigger alerts client missed

**Deliverable:** Server-side validation and pattern detection

**Test:**
1. Simulate low blink rate for 2 minutes
2. Verify server CEP triggers alert
3. Verify alert appears in dashboard
4. Verify cooldown prevents duplicate alerts

---

### Days 19-21: Analytics Pipeline + Baseline Computation

**Goal:** Personalized baselines for each user

#### Tasks
- [ ] Build analytics worker (Python on Railway)
  - Daily cron job per user
  - Fetch last 7 days of events
  - Compute baselines:
    - Blink rate median/p25/p75
    - Posture score median
    - Session duration median
    - Flow state hours per day
  - Context-aware baselines:
    - By time of day (morning vs afternoon)
    - By lighting condition (backlit vs normal)
    - By day type (weekday vs weekend)
- [ ] Store baselines in user_baselines table
- [ ] Update client on baseline change (WebSocket push)
- [ ] Implement cold-start strategy
  - First 2 hours: Use population averages
  - 2-24 hours: Use coarse personal baseline
  - After 24 hours: Full multi-dimensional baseline

**Deliverable:** Personalized alert thresholds for every user

**Test:**
1. Generate 7 days of synthetic data (varying blink rates)
2. Run analytics worker
3. Verify baseline matches data distribution (median)
4. Verify alerts adapt to personal baseline

---

## Week 4: GDPR + Monitoring + Polish

### Days 22-23: GDPR Compliance

**Goal:** Complete data export and deletion workflows

#### Tasks
- [ ] Build GDPR deletion workflow
  - API endpoint: DELETE /users/:userId
  - Publish gdpr-deletion event
  - Soft-delete user record (deleted_at = NOW())
  - GDPR cleanup worker:
    - Drop Redis stream (instant)
    - Soft-delete events (batched)
    - Delete rollups
    - Delete session summaries
    - Publish completion event
- [ ] Build data export workflow
  - API endpoint: GET /users/:userId/export
  - Query all user data (events, rollups, sessions)
  - Generate JSON export
  - Return download link (expires in 24 hours)
- [ ] Add GDPR consent UI (dashboard)
- [ ] Create privacy policy page (explain event data)

**Deliverable:** Full GDPR compliance (deletion + export)

**Test:**
1. Create test user with 1M events
2. Request deletion
3. Verify soft-delete completes in <1 second
4. Verify full cleanup completes in <24 hours
5. Verify user data is fully purged

---

### Days 24-25: Monitoring + Observability

**Goal:** Production-ready monitoring and alerting

#### Tasks
- [ ] Set up Sentry (error tracking)
  - Client errors (Electron crashes)
  - API errors (Cloudflare Workers)
  - Worker errors (Railway)
- [ ] Set up Datadog (metrics)
  - Redis Streams queue depth
  - Worker lag (time between event and processing)
  - Database connection pool usage
  - API latency (p50, p95, p99)
- [ ] Create Grafana dashboards
  - Real-time event ingestion rate
  - Worker throughput
  - Alert trigger rate
  - User engagement metrics
- [ ] Set up alerts
  - Redis queue depth > 100K (scale workers)
  - Worker lag > 5 minutes (investigate)
  - Error rate > 1% (page on-call)
  - PostgreSQL connection pool > 80% (scale database)

**Deliverable:** Production monitoring with alerts

**Test:**
1. Simulate high load (10K events/sec)
2. Verify metrics are collected
3. Verify alerts fire when thresholds exceeded

---

### Days 26-28: Polish + Documentation

**Goal:** Production-ready MVP

#### Tasks
- [ ] Client polish
  - Dark theme for desktop app
  - Settings panel (preferences, retention, GDPR)
  - Onboarding flow (explain privacy, camera permissions)
  - System tray menu (quick stats, pause monitoring)
- [ ] Dashboard polish
  - Responsive design (mobile-friendly)
  - Loading states and skeletons
  - Error boundaries
  - Empty states (no data yet)
- [ ] Documentation
  - README with architecture diagram
  - Setup instructions (dev environment)
  - Deployment guide (Cloudflare + Railway + Supabase)
  - API documentation (event schema)
- [ ] Testing
  - Unit tests for CEP engine
  - Integration tests for sync manager
  - E2E tests for dashboard
  - Load tests for API (10K concurrent users)

**Deliverable:** Polished MVP ready for demo

---

## Week 5+ (Post-MVP Enhancements)

### Priority 1: User Testing + Iteration
- [ ] Beta test with 10 users
- [ ] Collect feedback on alert frequency/timing
- [ ] Tune CEP rules based on real data
- [ ] Fix bugs and edge cases

### Priority 2: ML Enhancements
- [ ] Train ML model for glasses detection compensation
- [ ] Implement predictive alerts ("you usually crash at 3pm")
- [ ] Add emotion detection (stress, focus, fatigue)
- [ ] Improve flow state detection with ML

### Priority 3: Advanced Features
- [ ] Guided breathing exercises (built-in)
- [ ] Focus mode (batch alerts)
- [ ] Weekly email reports
- [ ] Calendar integration (respect meeting times)
- [ ] Team dashboard (aggregated wellness scores)

### Priority 4: Scale Optimization
- [ ] Multi-region support (Redis replication)
- [ ] Self-hosted option (Docker Compose)
- [ ] Enterprise features (SSO, audit logs)
- [ ] Mobile companion app (React Native)

---

## Development Environment Setup

### Prerequisites
- Node.js 20+
- Python 3.11+
- Docker (for local Redis)
- Cloudflare account
- Supabase account
- Upstash account
- Railway account (or Fly.io)

### Local Development

```bash
# 1. Clone repo
git clone https://github.com/your-org/wellness-guard.git
cd wellness-guard

# 2. Install dependencies
npm install  # Root (Electron app)
cd dashboard && npm install  # Next.js dashboard
cd ../workers && npm install  # Background workers

# 3. Start local Redis (Docker)
docker run -d -p 6379:6379 redis:7-alpine

# 4. Set up Supabase locally (optional)
npx supabase init
npx supabase start

# 5. Environment variables
cp .env.example .env
# Fill in:
# - SUPABASE_URL, SUPABASE_ANON_KEY
# - UPSTASH_REDIS_URL
# - CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN

# 6. Run dev servers
npm run dev  # Electron app (port 5173)
cd dashboard && npm run dev  # Dashboard (port 3000)
cd workers && npm run dev  # Workers (local)

# 7. Test event flow
# - Open Electron app
# - Trigger blink events
# - Verify events in Redis (redis-cli XREAD)
# - Verify events in PostgreSQL (Supabase dashboard)
# - Open dashboard (http://localhost:3000)
```

---

## Deployment Checklist

### Cloudflare Workers (API Gateway)
- [ ] Create Workers project: `wrangler init`
- [ ] Add secrets: `wrangler secret put SUPABASE_JWT_SECRET`
- [ ] Deploy: `wrangler publish`
- [ ] Test: `curl https://wellness-api.your-domain.workers.dev/health`

### Upstash Redis (Event Streams)
- [ ] Create Redis instance (free tier for dev)
- [ ] Enable TLS and strong password
- [ ] Copy connection URL to .env
- [ ] Test: `redis-cli -u $UPSTASH_REDIS_URL PING`

### Supabase (PostgreSQL)
- [ ] Create project
- [ ] Enable TimescaleDB extension
- [ ] Run migration scripts (create tables)
- [ ] Set up RLS policies (row-level security)
- [ ] Test: `psql $DATABASE_URL -c "SELECT version();"`

### Railway (Background Workers)
- [ ] Create project
- [ ] Add services: persistence-worker, aggregation-worker, cep-worker, analytics-worker
- [ ] Set environment variables
- [ ] Deploy: `railway up`
- [ ] Test: Check logs for "Worker started"

### Vercel (Dashboard)
- [ ] Connect GitHub repo
- [ ] Set environment variables (Supabase URL, keys)
- [ ] Deploy: `vercel --prod`
- [ ] Test: `curl https://dashboard.your-domain.com`

### Electron App (Desktop)
- [ ] Build for Windows: `npm run build:win`
- [ ] Build for macOS: `npm run build:mac`
- [ ] Sign and notarize (for distribution)
- [ ] Upload to release page (GitHub Releases)
- [ ] Test: Download and install, verify auto-update works

---

## Testing Strategy

### Unit Tests
- CEP engine (alert rule matching)
- Sync manager (batching, retries)
- Event schema validation
- Baseline computation

### Integration Tests
- Client → API → Redis → Worker → PostgreSQL
- WebSocket real-time updates
- Offline queue and sync
- GDPR deletion workflow

### Load Tests
- 10K concurrent users (simulate)
- 100K events/sec ingestion
- Dashboard query performance
- Worker throughput

### E2E Tests
- Onboarding flow
- Alert trigger and dismiss
- Dashboard navigation
- Data export and deletion

---

## Success Metrics

### Week 1 (Local Client)
- [ ] App runs offline
- [ ] Alerts trigger within 150ms
- [ ] No crashes during 8-hour session

### Week 2 (Cloud Backend)
- [ ] Events sync successfully (100% success rate)
- [ ] Redis queue depth < 10K (steady state)
- [ ] Worker lag < 1 minute (p95)

### Week 3 (Dashboard + CEP)
- [ ] Dashboard loads in <1 second
- [ ] Queries return in <50ms (p95)
- [ ] Server CEP validates 100% of client alerts

### Week 4 (GDPR + Polish)
- [ ] GDPR deletion completes in <24 hours
- [ ] Zero critical errors (Sentry)
- [ ] API uptime > 99.9%

---

## Risk Mitigation

### Risk 1: Redis Streams Learning Curve
**Mitigation:**
- Start with simple XADD/XREAD
- Use Redis Insight (GUI) for debugging
- Reference: https://redis.io/docs/data-types/streams/

### Risk 2: TimescaleDB Complexity
**Mitigation:**
- Use Supabase managed service
- Start with simple hypertables
- Add continuous aggregation later

### Risk 3: CEP Engine Bugs
**Mitigation:**
- Extensive unit tests for pattern matching
- Feature flag for server-side CEP (can disable)
- Client-side CEP as fallback

### Risk 4: Worker Auto-Scaling Lag
**Mitigation:**
- Monitor queue depth (alert at 50K)
- Pre-warm workers during known peak times (9 AM)
- Manual scaling as backup

---

## Cost Tracking

### Development (4 weeks)
- Cloudflare Workers: $0 (free tier)
- Upstash Redis: $0 (free tier, 10K requests/day)
- Supabase: $0 (free tier, 500MB)
- Railway: $5 (hobby plan)
- Vercel: $0 (free tier)
- **Total:** $5/month during dev

### Production (10K users)
- Cloudflare Workers: $5/mo (100M requests)
- Upstash Redis: $20/mo (Pro plan)
- Supabase: $25/mo (Pro plan)
- Railway: $20/mo (2GB RAM workers)
- Vercel: $20/mo (Pro plan)
- Monitoring: $50/mo (Sentry + Datadog)
- **Total:** $140/month at 10K users

### Revenue Model
- $5/mo per user × 10K users = $50K/mo revenue
- $140/mo infrastructure cost
- **Profit margin:** 99.7%

---

## Team Collaboration

### If Working with a Team

**Roles:**
- **Frontend Engineer:** Electron app + Dashboard
- **Backend Engineer:** API + Workers
- **DevOps Engineer:** Deployment + Monitoring
- **ML Engineer:** Baseline computation + Analytics

**Communication:**
- Daily standup (15 min)
- Shared event schema (single source of truth)
- Integration tests (ensure components work together)

**Tools:**
- GitHub for code
- Linear for tasks
- Slack for communication
- Notion for documentation

---

## Post-Launch Checklist

### Week 5: Launch Preparation
- [ ] Security audit (OWASP top 10)
- [ ] Load testing (simulate 10K users)
- [ ] Backup strategy (PostgreSQL daily backups)
- [ ] Incident response plan (who's on-call?)
- [ ] Customer support setup (help desk)

### Week 6: Soft Launch
- [ ] Beta release to 100 users
- [ ] Monitor errors (Sentry)
- [ ] Monitor performance (Datadog)
- [ ] Collect feedback (surveys)
- [ ] Fix critical bugs

### Week 7-8: Public Launch
- [ ] Marketing campaign (Product Hunt, HN)
- [ ] Press kit (screenshots, demo video)
- [ ] Pricing page (free tier + paid tiers)
- [ ] Support documentation (FAQ, guides)
- [ ] Monitor scaling (be ready to add workers)

---

## Conclusion

This roadmap delivers a **production-ready event-driven architecture in 4 weeks**.

**Key milestones:**
- Week 1: Offline-first client with local alerts
- Week 2: Cloud backend with Redis Streams
- Week 3: Dashboard and server-side CEP
- Week 4: GDPR compliance and monitoring

**What makes this feasible:**
- Managed services reduce infrastructure work
- Event-driven patterns simplify scaling
- Local-first design means MVP works offline
- Clear separation of concerns (CQRS)

**Post-launch:**
- Week 5+: User feedback and iteration
- Month 2-3: ML enhancements and advanced features
- Month 4-6: Scale to 100K users

**Total cost:** $5/mo (dev) → $140/mo (10K users) → $1,400/mo (100K users)

**Expected timeline to 100K users:** 12-18 months (with solid product-market fit)

---

**Roadmap by:** Claude Code (Opus 4.5)
**Date:** 2025-12-18
