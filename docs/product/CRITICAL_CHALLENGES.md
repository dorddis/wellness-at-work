# WellnessGuard - Critical Challenges (Pareto 20%)

The six challenges that will determine product success or failure. Everything else is secondary.

---

## 1. Glasses Detection Failure

**Why critical:** ~75% of knowledge workers wear glasses. Core market.

**Failure modes:**
- Reflections causing false blink detection
- Thick frames occluding eye landmarks
- Transition lenses going dark indoors
- Blue light coating creating artifacts
- Bifocals/progressives with user looking through different zones

**If unsolved:** Product doesn't work for 3/4 of users.

---

## 2. Lighting Robustness

**Why critical:** 100% of users experience lighting changes daily. Not an edge case.

**Failure modes:**
- Backlit users (window behind) - extremely common in home offices
- Changing natural light: morning bright, afternoon glare, evening dim
- Monitor-only illumination for evening/night workers
- Overhead harsh lighting creating eye socket shadows
- Mixed lighting (window + lamp + monitor)

**If unsolved:** Works in demo, fails in real deployment.

---

## 3. Alert Fatigue & Timing

**Why critical:** #1 killer of wellness apps. Every break reminder app dies this way.

**Failure modes:**
- Notification blindness within 2 weeks of install
- Alerts during meetings = embarrassment + resentment
- Alerts during flow state = productivity damage
- Alerts during deadline crunch = "not now" forever
- Too frequent = annoying, too rare = forgotten
- Same message repeatedly = tuned out

**If unsolved:** Product becomes abandoned shelf-ware.

---

## 4. Privacy/Surveillance Perception

**Why critical:** Adoption blocker. Users who won't enable camera = zero users.

**Failure modes:**
- "Always-on camera" triggers visceral discomfort
- Corporate deployment = assumed productivity surveillance
- Fear of images being stored/transmitted
- Concern about being recorded in private moments
- One negative news story = viral fear
- Partner/family visible in background

**If unsolved:** Product never achieves adoption regardless of quality.

---

## 5. Individual Baseline Calibration

**Why critical:** "Normal" blink rate = 10-22/min across healthy people. Population average is wrong for most individuals.

**Failure modes:**
- User with natural 10/min gets constant false "low blink" alerts
- User with natural 22/min never gets alerts even when fatigued
- LASIK patients have different baselines (dry eye)
- Medication affects baseline (ADHD meds, antidepressants)
- Baseline changes with seasons (dry winter air)
- Without personal baseline, every alert is noise

**If unsolved:** Alerts feel random, users ignore everything.

---

## 6. Flow State Interruption

**Why critical:** Knowledge workers' #1 asset is deep focus. Breaking it makes us the enemy.

**Failure modes:**
- Developer mid-debug interrupted = 23 minutes to recover context
- Writer mid-paragraph = thought lost
- Designer in creative flow = momentum broken
- Analyst mid-calculation = error introduced
- Any interruption during "zone" = resentment toward app
- User starts closing app before deep work

**If unsolved:** Product actively harms users it's meant to help.

---

## Priority Matrix

| Challenge | User Impact | Technical Difficulty | Must Solve By |
|-----------|-------------|---------------------|---------------|
| Glasses detection | 75% users | High | MVP |
| Lighting robustness | 100% users | High | MVP |
| Alert fatigue | 100% users | Medium | MVP |
| Privacy perception | 50-80% users | Low (UX/messaging) | MVP |
| Baseline calibration | 100% users | Medium | Week 1 post-launch |
| Flow state awareness | 80% users | Medium | Week 1 post-launch |

---

## Success Criteria

**Glasses:** Detection accuracy >90% for users with glasses in normal conditions.

**Lighting:** Detection works in backlit conditions, low light, and changing light without manual adjustment.

**Alert Fatigue:** >50% of alerts still being acknowledged after 30 days of use.

**Privacy:** >80% of users who install actually enable camera within first session.

**Baseline:** Personal calibration within first 2 hours of use, alerts accuracy >85% for individual.

**Flow State:** Zero interruptions during user-defined focus periods; smart detection of deep work.

---

## Relationship to Scale Challenges

These six must be solved BEFORE scaling matters. A product that doesn't work at 100 users won't magically work at 1M users.

Scale challenges (documented in SCALE_CHALLENGES.md) become relevant only after these six are solved.

**Sequence:**
1. Solve critical six → Product works
2. Find product-market fit → Users stay
3. Solve scale challenges → Product grows
