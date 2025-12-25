# Lumina - Lines of Code & Cost Analysis

**Generated:** December 25, 2025

## Development Timeline

| Metric | Value |
|--------|-------|
| **First Commit** | December 20, 2025 (15:07) |
| **Last Commit** | December 25, 2025 (12:25) |
| **Total Duration** | **5 days** |
| **Total Commits** | 93 |

### Commits Per Day

| Date | Commits |
|------|--------:|
| Dec 20 | 6 |
| Dec 21 | 8 |
| Dec 22 | 32 |
| Dec 23 | 21 |
| Dec 24 | 12 |
| Dec 25 | 14 |

---

## Lines of Code Breakdown

| Component | Files | Code Lines |
|-----------|------:|----------:|
| Desktop App (Electron) | 61 | 10,260 |
| Web App (Next.js) | 85 | 12,385 |
| Core Package | 39 | 7,231 |
| UI Package | 52 | 6,447 |
| API Package | 11 | 3,651 |
| Supabase Migrations | 4 | 603 |
| **Total Application Code** | **252** | **40,577** |
| Documentation | 61 | 18,791 |
| **Grand Total** | **313** | **59,368** |

### By File Type (Application Code Only)

| Extension | Files | Code Lines |
|-----------|------:|----------:|
| .tsx (React) | 112 | 20,394 |
| .ts (TypeScript) | 117 | 18,984 |
| .sql | 3 | 462 |
| .css | 2 | 284 |
| .json (config) | 12 | 341 |
| .html | 4 | 106 |

---

## Actual Development Productivity

| Metric | Value |
|--------|-------|
| Code written | 40,577 lines |
| Time spent | 5 days |
| **Productivity** | **8,115 LOC/day** |
| Industry average (senior dev) | 60 LOC/day |
| **AI multiplier achieved** | **135x** |

*Note: This was built with Claude Code (AI-assisted development)*

---

## Market Cost Estimates (2025)

To build an equivalent application from scratch:

### Development Time Estimates

| Approach | LOC/Day | Days | Months |
|----------|--------:|-----:|-------:|
| Traditional (senior dev) | 60 | 676 | 30.7 |
| AI-assisted (typical) | 180 | 225 | 10.2 |
| **Actual (this project)** | **8,115** | **5** | **0.2** |

### Cost by Market (with 1.5x complexity multiplier)

This project includes high-complexity features:
- Real-time computer vision (MediaPipe blink/posture/yawn detection)
- Electron cross-platform packaging (Windows + macOS)
- Meeting mode with screen capture
- Supabase auth + RLS + real-time sync
- Gamification system (streaks, achievements)

| Market | Traditional | AI-Assisted |
|--------|------------:|------------:|
| India Mid ($20/hr) | $162,308 | $54,103 |
| India Senior ($40/hr) | $324,616 | $108,205 |
| Europe Senior ($100/hr) | $811,540 | $270,513 |
| US Junior ($75/hr) | $608,655 | $202,885 |
| US Mid ($125/hr) | $1,014,425 | $338,142 |
| US Senior ($175/hr) | $1,420,195 | $473,398 |

### Quick Reference

| Scenario | Cost Range |
|----------|------------|
| **Minimum** (India, AI-assisted) | $54,000 - $108,000 |
| **Mid-range** (Europe/US, AI-assisted) | $200,000 - $340,000 |
| **Maximum** (US, traditional) | $1,000,000 - $1,400,000 |

---

## Value Delivered

### What Was Built in 5 Days

**Desktop Application (Electron)**
- Real-time blink detection with bilateral eye tracking
- Posture detection from face landmarks
- Yawn and drowsiness detection (MAR + PERCLOS)
- Meeting mode with screen capture (Zoom/Teams/Meet)
- System tray integration
- Local SQLite database with rollups
- Cross-platform builds (Windows + macOS)

**Web Dashboard (Next.js)**
- Organization admin panel
- Team wellness analytics
- User management with RBAC
- Real-time data sync

**Shared Packages**
- Core detection algorithms
- UI component library
- Supabase API integration

**Infrastructure**
- Supabase backend with RLS policies
- GitHub Actions CI/CD
- Cloudflare R2 release hosting
- Auto-updater system

**Documentation**
- 61 files, 18,791 lines
- Complete technical architecture
- Product decisions documentation
- Founder demo package

### Equivalent Agency Quote

Based on the complexity and scope, a typical software agency would quote:

| Agency Type | Quote Range |
|-------------|-------------|
| Indian boutique agency | $80,000 - $150,000 |
| European agency | $200,000 - $400,000 |
| US agency | $400,000 - $800,000 |
| Enterprise vendor | $1,000,000+ |

**Actual development cost:** ~$2,000 (5 days of Claude Code Max subscription + developer time)

---

## Methodology

### LOC Counting Rules
- Excluded: `node_modules`, `dist`, `release`, `.git`, `.next`, `.turbo`
- Excluded files: `pnpm-lock.yaml`, `package-lock.json`, `LICENSES.chromium.html`
- Counted: `.ts`, `.tsx`, `.js`, `.jsx`, `.css`, `.html`, `.sql`, `.json`, `.md`
- "Code lines" = non-blank, non-comment lines

### Cost Calculation Assumptions
- Senior dev productivity: 60 LOC/day (complex project with CV/Electron)
- AI-assisted productivity: 180 LOC/day (3x multiplier)
- Working days per month: 22
- Complexity multiplier: 1.5x (CV + Electron + real-time features)

### Hourly Rate Sources
- India: Glassdoor, Toptal rate cards (2024-2025)
- Europe: Arc.dev, Toptal (2024-2025)
- US: Levels.fyi, Glassdoor (2024-2025)
