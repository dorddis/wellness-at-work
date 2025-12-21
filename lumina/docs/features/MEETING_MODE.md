# Meeting Mode - Planned Feature

## Problem Statement

Enterprise users spend 30-50% of their workday in video meetings (Zoom, Teams, Google Meet, etc.). During meetings:
- The meeting app "owns" the camera
- Our app cannot access the camera directly
- **This makes the wellness app useless during a significant portion of work hours**

Without solving this, Lumina loses value for the exact B2B enterprise market we're targeting.

## User Story

> As a knowledge worker who spends half my day in meetings, I want Lumina to track my eye health even during video calls, so I get consistent wellness monitoring throughout my workday.

## Solution: Self-View Screen Capture

Instead of accessing the camera directly, capture the user's **self-view preview** that appears in meeting apps.

```
+------------------------------------------+
|                                          |
|        Meeting App (Zoom/Teams)          |
|                                          |
|   [Speaker video]                        |
|                                          |
|                          +----------+    |
|                          | Self-    |    | <-- Capture this region
|                          | view     |    |     Run MediaPipe on it
|                          +----------+    |
+------------------------------------------+
```

## Technical Approaches

### Approach 1: Screen Region Capture (Recommended for v1)

**How it works:**
1. Detect when meeting app is active (Zoom, Teams, Meet process running)
2. User defines their self-view region once (one-time calibration)
3. Periodically capture that screen region (~10 FPS is sufficient)
4. Run MediaPipe FaceLandmarker on captured frames
5. Calculate EAR and detect blinks as normal

**Pros:**
- Works with any meeting app
- No special permissions beyond screen capture
- Reuses existing detection pipeline
- User has control over what's captured

**Cons:**
- Requires one-time calibration per app
- Self-view position varies by app/settings
- Lower frame rate than direct camera access
- Fails if self-view is hidden/minimized

**Implementation:**

```typescript
// Electron provides desktopCapturer for screen capture
import { desktopCapturer, screen } from 'electron';

interface MeetingModeConfig {
  // Bounding box of self-view (relative to screen)
  region: { x: number; y: number; width: number; height: number };
  // Target FPS for capture (10 is sufficient for blink detection)
  captureRate: number;
  // Meeting app detection
  targetApps: string[]; // ['Zoom', 'Microsoft Teams', 'Google Chrome']
}

async function captureScreenRegion(region: MeetingModeConfig['region']) {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: screen.width, height: screen.height }
  });

  // Crop to self-view region
  const screenshot = sources[0].thumbnail;
  const cropped = screenshot.crop(region);

  // Convert to format MediaPipe expects
  return cropToImageData(cropped);
}
```

### Approach 2: Auto-Detect Self-View (v2 Enhancement)

**How it works:**
1. Capture full screen when meeting starts
2. Run face detection on full screen
3. Identify smallest face region (likely self-view)
4. Auto-track that region even if it moves

**Pros:**
- No manual calibration needed
- Adapts to layout changes

**Cons:**
- More compute intensive
- Could mistake other faces for self-view
- Complex implementation

### Approach 3: Virtual Camera (Future)

**How it works:**
1. Install virtual camera driver
2. User selects "Lumina Virtual Camera" in meeting app
3. We proxy real camera to meeting app
4. Simultaneously process frames for blink detection

**Pros:**
- Works seamlessly - user just picks different camera
- Full frame rate access
- Most reliable detection

**Cons:**
- Requires driver installation (admin rights)
- Different implementation per OS
- More invasive to user's system
- May conflict with other virtual cameras

## Meeting App Detection

```typescript
// Windows: Check running processes
async function detectMeetingApp(): Promise<string | null> {
  const meetingApps = [
    { process: 'Zoom.exe', name: 'Zoom' },
    { process: 'Teams.exe', name: 'Microsoft Teams' },
    { process: 'chrome.exe', title: 'Meet', name: 'Google Meet' },
    { process: 'webex.exe', name: 'Webex' },
    { process: 'Slack.exe', name: 'Slack Huddle' },
  ];

  // Use tasklist or similar to check running processes
  const running = await getRunningProcesses();

  for (const app of meetingApps) {
    if (running.includes(app.process)) {
      // Additional check for browser-based apps (check window title)
      if (app.title) {
        const hasTitle = await checkWindowTitle(app.process, app.title);
        if (hasTitle) return app.name;
      } else {
        return app.name;
      }
    }
  }

  return null;
}
```

## User Flow

### First-Time Setup (per meeting app)

```
1. User joins a meeting in Zoom/Teams/Meet
2. Lumina detects meeting app is active
3. Shows notification: "Meeting detected! Set up Meeting Mode?"

4. Calibration overlay appears:
   +------------------------------------------+
   |  Draw a box around your self-view        |
   |  +------------------------------------+  |
   |  |                                    |  |
   |  |      [user drags to create box]    |  |
   |  |                                    |  |
   |  +------------------------------------+  |
   |                                          |
   |     [Save for Zoom] [Skip]               |
   +------------------------------------------+

5. Settings saved per-app (remembered for future)
```

### During Meetings

```
Camera Mode: Direct (normal)
     |
     v
Meeting detected?
     |
     +-- No --> Continue normal operation
     |
     +-- Yes --> Switch to Meeting Mode
                 |
                 v
           Capture self-view region
                 |
                 v
           Run MediaPipe on captured frame
                 |
                 v
           Continue blink detection as normal
                 |
                 v
           Meeting ends? --> Return to Camera Mode
```

## Data Model

```typescript
interface MeetingModeSettings {
  enabled: boolean;
  calibrations: MeetingAppCalibration[];
  captureRate: number; // FPS, default 10
  autoDetect: boolean; // Try to auto-detect self-view
}

interface MeetingAppCalibration {
  appName: string; // 'Zoom', 'Teams', etc.
  region: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  monitor: number; // Which display
  lastUsed: Date;
}
```

## Challenges & Mitigations

| Challenge | Impact | Mitigation |
|-----------|--------|------------|
| Self-view hidden/minimized | No detection | Prompt user to enable self-view |
| Self-view moves during meeting | Lost tracking | Auto-redetect periodically (v2) |
| Multiple monitors | Wrong region captured | Track per-monitor settings |
| Small self-view (<100x100 px) | Poor detection accuracy | Warn user, suggest larger view |
| High CPU on screen capture | Performance impact | Throttle to 10 FPS, skip frames if needed |
| Privacy concern (screen recording) | User distrust | Clear messaging: only self-view, no recording |

## Performance Considerations

| Metric | Direct Camera | Meeting Mode |
|--------|--------------|--------------|
| Frame Rate | 30 FPS | 10 FPS (sufficient) |
| Latency | <30ms | ~100ms (acceptable) |
| CPU Usage | ~3% | ~5% (with region capture) |
| Accuracy | 95%+ | 85-90% (smaller image) |

## Privacy Messaging

**Critical:** Users may be uncomfortable with screen capture. Must communicate clearly:

```
Meeting Mode Privacy:
- Only your self-view is captured (not the full screen)
- No images are saved or transmitted
- Same privacy as normal mode: only blink metrics stored
- You control exactly what region is monitored
- Disable anytime from settings
```

## Implementation Roadmap

### Phase 1: Manual Calibration (v1.2)
- [ ] Meeting app detection (process monitoring)
- [ ] Manual region selection UI
- [ ] Screen capture at 10 FPS
- [ ] Route captured frames to existing MediaPipe pipeline
- [ ] Per-app settings storage
- [ ] UI to show Meeting Mode is active

### Phase 2: Smart Detection (v1.5)
- [ ] Auto-detect self-view using face detection
- [ ] Handle self-view position changes
- [ ] Support for browser-based meetings
- [ ] Better handling of multiple monitors

### Phase 3: Virtual Camera (v2.0)
- [ ] Research virtual camera SDKs (OBS Virtual Camera as reference)
- [ ] Windows virtual camera driver
- [ ] macOS virtual camera driver
- [ ] Seamless camera passthrough

## Success Metrics

| Metric | Target |
|--------|--------|
| Meeting detection accuracy | >95% |
| Self-view capture success | >90% of meeting time |
| Blink detection accuracy in meeting mode | >85% |
| CPU overhead vs normal mode | <3% additional |
| User setup time | <30 seconds per app |

## Open Questions

1. **Should we auto-enable meeting mode or require opt-in?**
   - Recommend: Opt-in with clear prompt

2. **How to handle "self-view off" setting some users prefer?**
   - May need to encourage enabling self-view for wellness tracking

3. **Browser-based meetings (Google Meet in Chrome)?**
   - Need window title detection, more complex

4. **Corporate security policies blocking screen capture?**
   - Fall back to "meeting paused" mode with notification

## Related Features

- Calendar Integration (P1) - Could predict meetings ahead of time
- DND Mode - Already pauses during meetings; this enables tracking instead
- Flow State Detection - Meetings are not flow state, different handling

## References

- Electron desktopCapturer: https://www.electronjs.org/docs/latest/api/desktop-capturer
- Windows process enumeration: PowerShell Get-Process
- Virtual camera: OBS Virtual Camera implementation
