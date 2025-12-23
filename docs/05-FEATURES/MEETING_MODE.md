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

## Implementation Status

> **Status:** Phase 1 fully implemented (2024-12)

### Phase 1: Manual Calibration (v1.2) - COMPLETE

- [x] Meeting app detection (process monitoring) - `detectMeetingApp()` in `meetingMode.ts`
- [x] Manual region selection UI - `MeetingModeCalibration` component
- [x] Screen capture via `desktopCapturer` API
- [x] Route captured frames to existing MediaPipe pipeline - `useMeetingModeCapture` hook
- [x] Per-app settings storage (region saved per app name)
- [x] UI to show Meeting Mode is active - `MeetingModeStatus` component

**Implementation files:**
- `apps/desktop/src/main/meetingMode.ts` - Process detection, screen sources
- `apps/desktop/src/renderer/hub/components/MeetingModeCalibration.tsx` - Region selection UI
- `apps/desktop/src/renderer/hub/hooks/useMeetingModeCapture.ts` - Capture hook

**Supported apps:** Zoom, Microsoft Teams, Teams (New), Webex, Slack, Google Meet (browser)

### Phase 2: Smart Detection (v1.5) - PENDING

- [ ] Auto-detect self-view using face + edge detection
- [ ] Handle self-view position changes
- [ ] Support for browser-based meetings (partial - title pattern matching exists)
- [ ] Better handling of multiple monitors (basic support via `getDisplays()`)

---

## Phase 2 Technical Specification: Smart Self-View Detection

### Problem with Manual Calibration

Users must manually drag a box around their self-view for each meeting app. This is:
- Tedious for first-time setup
- Error-prone (users may draw inaccurate boxes)
- Requires recalibration if meeting app layout changes

### Solution: Face Detection + Edge Snapping

Automatically detect the self-view video box using a two-step approach:

1. **Face Detection** - Find the user's face in the screenshot (gives approximate location)
2. **Edge Detection** - From the face center, scan outward to find the video box borders

```
+------------------------------------------+
|                                          |
|        Meeting App Screenshot            |
|                                          |
|                          +----------+    |
|                          |  ┌────┐  |    |
|                          |  │FACE│  |    |  Step 1: Detect face
|                          |  └────┘  |    |
|                          +----------+    |  Step 2: Find edges of box
|                          ▲          ▲    |
|                     left edge    right edge
+------------------------------------------+
```

### Algorithm Overview

```typescript
interface DetectedRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

async function autoDetectSelfView(screenshot: ImageData): Promise<DetectedRegion | null> {
  // Step 1: Find face in screenshot
  const faces = await detectFaces(screenshot);

  if (faces.length === 0) {
    return null; // No face found
  }

  // Step 2: Select most likely self-view face
  // Heuristic: smallest face in a corner (self-view is usually thumbnail-sized)
  const selfViewFace = selectSelfViewCandidate(faces, screenshot.width, screenshot.height);

  // Step 3: From face center, scan outward to find video box edges
  const faceCenter = {
    x: selfViewFace.x + selfViewFace.width / 2,
    y: selfViewFace.y + selfViewFace.height / 2,
  };

  const edges = findVideoBoxEdges(screenshot, faceCenter);

  return {
    x: edges.left,
    y: edges.top,
    width: edges.right - edges.left,
    height: edges.bottom - edges.top,
    confidence: calculateConfidence(selfViewFace, edges),
  };
}
```

### Step 1: Face Detection

Use existing MediaPipe FaceLandmarker to detect faces in the screenshot.

```typescript
async function detectFaces(screenshot: ImageData): Promise<FaceBounds[]> {
  // MediaPipe FaceLandmarker already initialized in app
  const results = await faceLandmarker.detect(screenshot);

  return results.faceLandmarks.map(landmarks => {
    // Calculate bounding box from landmarks
    const xs = landmarks.map(p => p.x * screenshot.width);
    const ys = landmarks.map(p => p.y * screenshot.height);

    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
      area: (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)),
    };
  });
}
```

### Step 2: Self-View Candidate Selection

When multiple faces are detected (e.g., main speaker + self-view), use heuristics:

```typescript
function selectSelfViewCandidate(
  faces: FaceBounds[],
  screenWidth: number,
  screenHeight: number
): FaceBounds {
  // Score each face based on likelihood of being self-view
  const scored = faces.map(face => {
    let score = 0;

    // Heuristic 1: Prefer smaller faces (self-view is usually thumbnail)
    // Typical self-view: 100-300px, Main speaker: 400-1000px
    const avgDimension = (face.width + face.height) / 2;
    if (avgDimension < 200) score += 30;
    else if (avgDimension < 350) score += 20;
    else if (avgDimension > 500) score -= 20; // Probably main speaker

    // Heuristic 2: Prefer faces in corners
    const centerX = face.x + face.width / 2;
    const centerY = face.y + face.height / 2;
    const isInCorner = (
      (centerX < screenWidth * 0.25 || centerX > screenWidth * 0.75) &&
      (centerY < screenHeight * 0.25 || centerY > screenHeight * 0.75)
    );
    if (isInCorner) score += 25;

    // Heuristic 3: Slight preference for right side (most apps put self-view right)
    if (centerX > screenWidth * 0.5) score += 5;

    // Heuristic 4: Slight preference for bottom (common self-view position)
    if (centerY > screenHeight * 0.5) score += 5;

    return { face, score };
  });

  // Return highest scoring face
  scored.sort((a, b) => b.score - a.score);
  return scored[0].face;
}
```

### Step 3: Edge Detection (Video Box Boundaries)

From the face center, scan outward in 4 directions to find the video box borders.

**Why edge detection?**
- Self-view boxes have distinct borders (often darker or lighter than content)
- Zoom: rounded corners with shadow
- Teams: sharp rectangle with border
- Meet: subtle border with rounded corners

```typescript
interface Edges {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function findVideoBoxEdges(screenshot: ImageData, faceCenter: Point): Edges {
  const { data, width, height } = screenshot;

  // Helper: Get pixel luminance at (x, y)
  const getLuminance = (x: number, y: number): number => {
    const i = (Math.floor(y) * width + Math.floor(x)) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    return 0.299 * r + 0.587 * g + 0.114 * b; // Standard luminance formula
  };

  // Helper: Calculate gradient (rate of change) between two points
  const getGradient = (x1: number, y1: number, x2: number, y2: number): number => {
    return Math.abs(getLuminance(x1, y1) - getLuminance(x2, y2));
  };

  // Configuration
  const GRADIENT_THRESHOLD = 30; // Luminance change to consider an "edge"
  const SAMPLE_STEP = 2;         // Pixels to step when scanning
  const MAX_SCAN_DISTANCE = 400; // Don't scan more than 400px from face
  const MIN_BOX_SIZE = 80;       // Minimum expected self-view size

  // Scan LEFT from face center
  let left = faceCenter.x;
  for (let x = faceCenter.x; x > Math.max(0, faceCenter.x - MAX_SCAN_DISTANCE); x -= SAMPLE_STEP) {
    const gradient = getGradient(x, faceCenter.y, x - SAMPLE_STEP, faceCenter.y);
    if (gradient > GRADIENT_THRESHOLD && faceCenter.x - x > MIN_BOX_SIZE / 2) {
      left = x;
      break;
    }
    left = x; // Keep updating until we find edge or hit limit
  }

  // Scan RIGHT from face center
  let right = faceCenter.x;
  for (let x = faceCenter.x; x < Math.min(width, faceCenter.x + MAX_SCAN_DISTANCE); x += SAMPLE_STEP) {
    const gradient = getGradient(x, faceCenter.y, x + SAMPLE_STEP, faceCenter.y);
    if (gradient > GRADIENT_THRESHOLD && x - faceCenter.x > MIN_BOX_SIZE / 2) {
      right = x;
      break;
    }
    right = x;
  }

  // Scan UP from face center
  let top = faceCenter.y;
  for (let y = faceCenter.y; y > Math.max(0, faceCenter.y - MAX_SCAN_DISTANCE); y -= SAMPLE_STEP) {
    const gradient = getGradient(faceCenter.x, y, faceCenter.x, y - SAMPLE_STEP);
    if (gradient > GRADIENT_THRESHOLD && faceCenter.y - y > MIN_BOX_SIZE / 2) {
      top = y;
      break;
    }
    top = y;
  }

  // Scan DOWN from face center
  let bottom = faceCenter.y;
  for (let y = faceCenter.y; y < Math.min(height, faceCenter.y + MAX_SCAN_DISTANCE); y += SAMPLE_STEP) {
    const gradient = getGradient(faceCenter.x, y, faceCenter.x, y + SAMPLE_STEP);
    if (gradient > GRADIENT_THRESHOLD && y - faceCenter.y > MIN_BOX_SIZE / 2) {
      bottom = y;
      break;
    }
    bottom = y;
  }

  return { left, right, top, bottom };
}
```

### Edge Detection Improvements

**Multi-ray scanning** - Instead of scanning along a single line, scan multiple parallel lines and take the median:

```typescript
function scanForEdgeMultiRay(
  screenshot: ImageData,
  faceCenter: Point,
  direction: 'left' | 'right' | 'up' | 'down'
): number {
  const offsets = [-20, -10, 0, 10, 20]; // Scan 5 parallel rays
  const edges: number[] = [];

  for (const offset of offsets) {
    const adjustedCenter = direction === 'left' || direction === 'right'
      ? { x: faceCenter.x, y: faceCenter.y + offset }
      : { x: faceCenter.x + offset, y: faceCenter.y };

    const edge = scanSingleRay(screenshot, adjustedCenter, direction);
    edges.push(edge);
  }

  // Return median for robustness
  edges.sort((a, b) => a - b);
  return edges[Math.floor(edges.length / 2)];
}
```

**Sobel operator** - For more accurate edge detection, use Sobel gradient instead of simple difference:

```typescript
function sobelGradient(screenshot: ImageData, x: number, y: number): number {
  const { data, width } = screenshot;

  const getPixel = (px: number, py: number): number => {
    const i = (py * width + px) * 4;
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  };

  // Sobel kernels
  // Gx: horizontal gradient
  const gx = (
    -1 * getPixel(x - 1, y - 1) + 1 * getPixel(x + 1, y - 1) +
    -2 * getPixel(x - 1, y)     + 2 * getPixel(x + 1, y) +
    -1 * getPixel(x - 1, y + 1) + 1 * getPixel(x + 1, y + 1)
  );

  // Gy: vertical gradient
  const gy = (
    -1 * getPixel(x - 1, y - 1) - 2 * getPixel(x, y - 1) - 1 * getPixel(x + 1, y - 1) +
     1 * getPixel(x - 1, y + 1) + 2 * getPixel(x, y + 1) + 1 * getPixel(x + 1, y + 1)
  );

  return Math.sqrt(gx * gx + gy * gy);
}
```

### User Flow with Smart Detection

```
1. User clicks "Auto-detect" in Meeting Mode settings
2. App captures screenshot of current screen
3. App runs face detection + edge detection
4. Preview shown: "Is this your self-view?"
   +------------------------------------------+
   |  We found your self-view!                |
   |  +------------------------------------+  |
   |  |   [Detected region highlighted]    |  |
   |  +------------------------------------+  |
   |                                          |
   |  [Yes, use this]  [No, let me adjust]    |
   +------------------------------------------+
5. If user confirms → Save as calibration
6. If user declines → Fall back to manual selection
```

### Fallback Strategy

Smart detection may fail in some cases:
- No face visible (self-view hidden)
- Multiple similar-sized faces
- Low contrast between self-view and background

**Fallback chain:**
1. Try smart detection
2. If confidence < 70% → Show result but ask for confirmation
3. If no face detected → Fall back to manual calibration
4. If edge detection fails → Use face bounds + 2x expansion as fallback

```typescript
async function calibrateSelfView(screenshot: ImageData): Promise<CalibrationResult> {
  const detected = await autoDetectSelfView(screenshot);

  if (!detected) {
    return { method: 'manual', reason: 'No face detected' };
  }

  if (detected.confidence < 0.7) {
    return {
      method: 'confirm',
      region: detected,
      reason: 'Low confidence - please verify',
    };
  }

  return { method: 'auto', region: detected };
}
```

### Performance Considerations

| Operation | Time (est.) | Notes |
|-----------|-------------|-------|
| Screenshot capture | ~50ms | Electron desktopCapturer |
| Face detection | ~100ms | MediaPipe on 1080p |
| Edge detection | ~20ms | Canvas pixel operations |
| **Total** | **~170ms** | Acceptable for one-time calibration |

Smart detection only runs during calibration (not every frame), so performance is not critical.

### Implementation Files (Planned)

```
apps/desktop/src/renderer/hub/
├── utils/
│   └── smartDetection.ts        # Face + edge detection algorithms
├── components/
│   └── MeetingModeCalibration.tsx  # Add "Auto-detect" button (existing)
└── hooks/
    └── useMeetingModeCapture.ts    # Unchanged
```

### Testing Strategy

| Test Case | Expected Behavior |
|-----------|-------------------|
| Zoom with self-view bottom-right | Detects correctly |
| Teams with self-view top-right | Detects correctly |
| Meet with floating self-view | Detects correctly |
| No self-view visible | Falls back to manual |
| Self-view minimized | Falls back to manual |
| Multiple people on screen | Selects smallest face in corner |
| Low contrast background | May require manual adjustment |

### Estimated Implementation Effort

| Task | Time |
|------|------|
| Face detection integration | 2 hours |
| Edge detection algorithm | 4 hours |
| UI for auto-detect button + preview | 2 hours |
| Testing across Zoom/Teams/Meet | 2 hours |
| **Total** | **~1 day** |

### Phase 3: Virtual Camera (v2.0) - PENDING

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
