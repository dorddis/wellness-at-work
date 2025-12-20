# WellnessGuard - Scale Challenges Analysis

A comprehensive analysis of challenges when scaling the wellness tracking application from thousands to millions of users.

---

## Data Volume & Velocity Challenges

### Raw Data Generation Rate
- Each user generates data at **30 fps** (camera frame rate)
- Per user per second: 30 blink checks, 30 posture checks, 30 EAR values
- Per user per hour (active session): **108,000 data points**
- Per user per 8-hour workday: **864,000 data points**

### Scale Projections
| Users | Daily Data Points | Monthly Data Points |
|-------|-------------------|---------------------|
| 1,000 | 864 million | 17.3 billion |
| 10,000 | 8.64 billion | 173 billion |
| 100,000 | 86.4 billion | 1.73 trillion |
| 1,000,000 | 864 billion | 17.3 trillion |

### Storage Growth
- Each blink_data row: ~200 bytes (UUID, timestamps, floats, foreign keys)
- 1M users x 864K daily rows x 200 bytes = **~160 TB per day** of raw data
- Where does this data live? How long do we retain it?

---

## Write Path Challenges

### Concurrent Writes
- 1,000 users online simultaneously = 30,000 writes/second
- 100,000 users = 3,000,000 writes/second
- PostgreSQL (Supabase) single instance write limits
- Connection pool exhaustion
- Write amplification from indexes

### Burst Traffic
- 9 AM Monday - everyone starts work simultaneously
- Geographic clustering (entire timezone comes online)
- Post-lunch return spikes
- How does the system handle 10x normal load in 5 minutes?

### Transaction Overhead
- Each INSERT requires: connection acquisition, query parsing, index updates, WAL write, fsync
- Foreign key constraint checks on every write (user_id, session_id)
- Trigger overhead if we add any

---

## Network & Connectivity Challenges

### Client-Side
- Users on unreliable WiFi, corporate proxies, VPNs
- Mobile hotspots with high latency
- Firewalls blocking WebSocket connections
- SSL/TLS handshake overhead per connection

### Offline Queue Accumulation
- User offline for 2 hours = 216,000 queued data points per user
- Local SQLite growing unbounded
- Memory pressure on client machine
- What if user is offline for a week? A month?

### Sync Storm
- Office building loses internet for 1 hour
- 500 users come back online simultaneously
- Each trying to sync 108,000 records
- 54 million records hitting the API in seconds

### Connection Limits
- Supabase Realtime: limited concurrent WebSocket connections per project
- PostgreSQL max_connections (typically 100-500 default)
- Load balancer connection limits
- Each idle connection consumes memory

---

## Read Path Challenges

### Web Dashboard Queries
- User wants to see "last 30 days of blink data"
- That's 30 x 864,000 = 25.9 million rows per user
- Aggregation queries across massive datasets
- Chart rendering with millions of points

### Analytics Computation
- Wellness score requires joining blink_data + posture_data + sessions
- Calculating averages, percentiles, trends
- "Compare my stats to last week" - temporal queries
- "Show me patterns" - complex analytical queries

### Multi-Tenant Queries
- Admin dashboards: "Show all users' average wellness scores"
- Team features: "Our team's combined statistics"
- Cross-user aggregations at scale

### Index Bloat
- `idx_blink_data_user_time` on 17 trillion rows
- Index size potentially larger than data itself
- B-tree depth increases, query time degrades
- Index maintenance during writes

---

## Data Consistency Challenges

### Sync Conflicts
- User has two devices (work laptop + home laptop)
- Both generate data for same session_id
- Which data is "correct"?
- Timestamp drift between devices

### Clock Skew
- Client machine clock is wrong by hours/days
- Data arrives with future timestamps
- Data arrives with timestamps from 1970 (epoch bugs)
- How do we validate temporal data?

### Ordering Guarantees
- Offline queue syncs out of order
- Network delivers packets out of sequence
- Database sees insert for blink #500 before blink #1
- Session "ended_at" arrives before "started_at"

### Partial Failures
- 50,000 records queued, sync fails at record 25,000
- Which records made it? Which didn't?
- Retry logic - do we re-send everything?
- Idempotency - what if same record synced twice?

---

## Session Management Challenges

### Session Boundaries
- When does a "session" start? User opens app? First blink detected?
- When does it end? App closed? No blinks for X minutes? Laptop sleep?
- User closes laptop lid without quitting app
- Crash without graceful shutdown - orphaned sessions

### Long-Running Sessions
- User works 12-hour shift without closing app
- Single session with 1.3 million data points
- Loading this session in dashboard
- Calculating wellness score for massive session

### Session Attribution
- Offline data from yesterday syncs today
- Which session does it belong to?
- Sessions table shows ended_at = NULL for crashed sessions
- Zombie sessions accumulating

---

## Cost & Resource Challenges

### Supabase Pricing Pressure
- Database size limits per tier
- Row count impacts query planning
- Bandwidth egress charges
- Realtime message quotas

### Storage Economics
- Hot storage (SSD) vs cold storage
- 160 TB/day at $0.10/GB = $16,000/day = **$5.8M/year** just for storage
- And that's before backups, replicas, etc.

### Compute Costs
- Aggregation queries consuming CPU
- Index maintenance background processes
- Connection handling overhead
- SSL termination costs

### Backup & Recovery
- Backing up 100+ TB database
- Point-in-time recovery requirements
- How long to restore from backup?
- DR site synchronization lag

---

## Real-Time Feature Challenges

### Alert Latency
- "Notify when blink rate < 8 for 2 minutes"
- This requires real-time stream processing
- Can't query database every second for every user
- Alert must fire within seconds, not minutes

### Live Dashboard Updates
- Web dashboard showing "live" blink count
- Supabase Realtime subscription per user
- 100,000 concurrent WebSocket connections
- Message fan-out at scale

### Cross-Device Sync
- User opens web dashboard while desktop app running
- Both should show same data instantly
- Realtime propagation latency
- Consistency between views

---

## Multi-Tenancy Challenges

### Noisy Neighbor
- One power user with 20-hour sessions
- Consumes disproportionate resources
- Degrades experience for others
- How to isolate/limit?

### Data Isolation
- User A must never see User B's data
- Row-level security at scale
- Query planner effectiveness with RLS policies
- Security audit complexity

### Fair Resource Allocation
- Free tier vs paid tier users
- Rate limiting per user
- Quota enforcement
- Graceful degradation

---

## Client-Side Challenges

### Device Diversity
- Windows 7 vs Windows 11
- Intel Macs vs M1/M2/M3 Macs
- Different webcam qualities and frame rates
- Different CPU/memory constraints

### Resource Competition
- User running heavy apps (video editing, games)
- Our app competing for CPU, camera, network
- MediaPipe ML inference slowing down
- Should we throttle our own data collection?

### Local Storage Limits
- SQLite database growing during offline periods
- 100MB? 1GB? 10GB? What's acceptable?
- User's disk filling up
- Old data cleanup policies

---

## Operational Challenges

### Monitoring at Scale
- Which of 1M users are having sync issues?
- Detecting degraded performance before users complain
- Log volume from 1M clients
- Alert fatigue from scale

### Debugging
- User reports "my data didn't sync"
- Finding needle in haystack of billions of records
- Correlating client logs with server logs
- Timezone confusion in timestamps

### Schema Migrations
- Adding a column to 17 trillion row table
- ALTER TABLE on production with live traffic
- Backfilling historical data
- Client app compatibility during migration

### Deployment
- Rolling out new client version to 1M users
- Some users never update
- API versioning for backward compatibility
- Feature flags at scale

---

## Security Challenges

### Data in Transit
- 30 requests/second per user
- SSL/TLS overhead adds up
- Certificate pinning on clients
- Man-in-the-middle on corporate networks

### Data at Rest
- Biometric-adjacent data (eye tracking = identity signal)
- Encryption requirements
- Key management at scale
- Compliance audits

### Access Control
- API key exposure in desktop app binary
- Reverse engineering client to extract credentials
- Rate limiting to prevent abuse
- DDoS potential from compromised clients

---

## GDPR & Compliance Challenges

### Right to Deletion
- User requests deletion
- Finding all their data across tables
- Cascading deletes on billions of related rows
- Proving deletion to auditors

### Data Export
- User requests all their data
- Generating export of 25 million rows
- Timeout during export generation
- File size of export

### Consent Management
- User revokes consent
- Stopping data collection immediately
- Handling data collected before revocation
- Audit trail of consent changes

### Data Residency
- EU users' data must stay in EU
- Multi-region deployment complexity
- Cross-region sync for users who travel
- Legal jurisdiction mapping

---

## Failure Mode Challenges

### Cascading Failures
- Database slow -> connection pool exhausted -> API timeouts -> client retries -> more load -> database slower
- Positive feedback loop to complete outage

### Split Brain
- Network partition between app and database
- Client thinks it synced, server never received
- Data loss without anyone knowing

### Corruption
- SQLite corruption on client (power loss during write)
- PostgreSQL corruption (unlikely but catastrophic)
- Backup also corrupted (same bug)
- Detection and recovery

---

## Challenge Categories Summary

| Category | Severity at 1K Users | Severity at 1M Users |
|----------|---------------------|----------------------|
| Data Volume | Low | Critical |
| Write Path | Medium | Critical |
| Network | Low | High |
| Read Path | Low | Critical |
| Consistency | Medium | High |
| Sessions | Low | Medium |
| Cost | Low | Critical |
| Real-Time | Medium | Critical |
| Multi-Tenancy | Low | High |
| Client-Side | Medium | Medium |
| Operations | Low | Critical |
| Security | Medium | Critical |
| GDPR | Medium | Critical |
| Failure Modes | Low | Critical |

---

## Next Steps

Solutions to explore:
1. Client-side aggregation (reduce data before sending)
2. Time-series database (TimescaleDB, InfluxDB)
3. Event streaming (Kafka, Redis Streams)
4. Data tiering and retention policies
5. Batch processing vs real-time trade-offs
6. Sharding strategies
7. CQRS (Command Query Responsibility Segregation)
8. Edge computing approaches
