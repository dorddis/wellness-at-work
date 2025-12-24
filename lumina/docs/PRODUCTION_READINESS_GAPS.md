# Production Readiness Gaps & Integration Test Plan

## Current Test Coverage Analysis

### What's Tested (343 tests passing)

| Layer | Coverage | Tests |
|-------|----------|-------|
| **Pure State Machine** | ✅ Excellent | 60 tests - all transitions, edge cases |
| **Blink Detection** | ✅ Excellent | 82 tests - EAR, thresholds, state machine |
| **Alert Engine** | ✅ Good | 74 tests - throttling, queueing |
| **Database Operations** | ✅ Good | 40+ tests - SQLite, sync |
| **Kalman/Filters** | ✅ Good | 19 tests |
| **Meeting Mode Crop** | ✅ Good | 25 tests - coordinate scaling |

### What's NOT Tested (Integration Gaps)

| Gap | Risk | Why It Matters |
|-----|------|----------------|
| **React ↔ State Machine** | 🔴 HIGH | Actions emitted but callbacks not wired (onShowNotification bug) |
| **Camera Init Timing** | 🔴 HIGH | Blank screen bug - async dependencies |
| **Detection Loop + Store** | 🟡 MEDIUM | 6 state updates per frame, potential race conditions |
| **Meeting Detection Polling** | 🟡 MEDIUM | PowerShell failures, edge cases |
| **Video Element Ready States** | 🟡 MEDIUM | readyState < 2 handling |
| **Zustand Store Sync** | 🟡 MEDIUM | isActive vs isMeetingCapturing timing |
| **Canvas Drawing Priority** | 🟡 MEDIUM | Fallback source selection |
| **IPC Channel Reliability** | 🟢 LOW | Electron main ↔ renderer |

---

## Critical Use Case Scenarios (Need Integration Tests)

### Scenario 1: Meeting Mode Happy Path
```
User starts detection → Meeting detected → Has calibration →
Screen capture starts → Blinks detected → Meeting ends →
Camera restarts → Blinks detected on camera
```

**What to verify:**
- [ ] Blink count continues incrementing across mode switch
- [ ] No dropped frames during transition
- [ ] EAR graph shows continuous data
- [ ] Database records have correct source (camera vs screen)

### Scenario 2: Meeting Detection Without Calibration
```
Detection running → Zoom opens → No calibration exists →
Calibration UI appears → User calibrates →
Capture starts with new calibration
```

**What to verify:**
- [ ] Calibration UI actually renders (not just action emitted)
- [ ] Calibration saved to localStorage
- [ ] Screen capture uses correct region
- [ ] User can cancel and return to camera mode

### Scenario 3: Rapid Meeting Start/Stop
```
Meeting opens → Meeting closes (within 2 seconds) →
Meeting opens again → Should work
```

**What to verify:**
- [ ] No zombie streams (memory leak)
- [ ] State machine returns to WEBCAM_ACTIVE correctly
- [ ] Camera restarts without error
- [ ] No "source not found" errors

### Scenario 4: Camera Failure During Meeting
```
Camera fails → Meeting detected → Should use screen capture →
Camera should not block meeting mode
```

**What to verify:**
- [ ] Error doesn't propagate to block meeting mode
- [ ] Meeting mode starts despite camera failure
- [ ] Appropriate error shown to user

### Scenario 5: Long Meeting (2+ hours)
```
Capture runs for 2 hours → Memory stable →
Detection accuracy maintained → Database writes complete
```

**What to verify:**
- [ ] Memory doesn't grow unbounded (waveform circular buffer works)
- [ ] Database queue flushes every 2 seconds
- [ ] No performance degradation over time
- [ ] Rollups generated correctly

### Scenario 6: Face Moves Off-Screen in Meeting
```
User in meeting → Turns away for 5 minutes →
CAPTURE_STALE triggered → User returns →
Auto-recovery to CAPTURE_ACTIVE
```

**What to verify:**
- [ ] Stale notification appears
- [ ] Capture continues (not stopped)
- [ ] Auto-recovery when face detected
- [ ] Recalibration prompt if prolonged

### Scenario 7: Screen Resolution Change
```
Capture active → User changes display scaling →
Calibration coordinates invalid → Should handle gracefully
```

**What to verify:**
- [ ] calculateCropRegion clamps to valid bounds
- [ ] No blank regions drawn
- [ ] User prompted to recalibrate

### Scenario 8: App Switch During Meeting
```
Zoom meeting active → User switches to Teams →
Teams detected → Should prompt for Teams calibration
```

**What to verify:**
- [ ] Different app detected
- [ ] Zoom capture stopped
- [ ] Teams calibration flow starts
- [ ] Correct calibration used per app

---

## Integration Test Implementation Plan

### Phase 1: Mock-Based Integration Tests (No DOM)

Create `packages/ui/src/hooks/__tests__/useMeetingModeStateMachine.integration.test.ts`:

```typescript
/**
 * Integration tests for the state machine hook.
 * Uses mocks for IPC and DOM elements to test the glue code.
 */

describe('useMeetingModeStateMachine integration', () => {
  // Mock IPC
  const mockDetectApp = vi.fn();
  const mockGetSourceId = vi.fn();

  // Mock video/canvas refs
  const mockVideoRef = { current: { readyState: 2, videoWidth: 1920, videoHeight: 1080 } };

  describe('Scenario: Meeting ends, camera restarts', () => {
    it('should keep meetingCanvas available during camera init', async () => {
      // Setup: In CAPTURE_ACTIVE state
      // Action: Send MEETING_ENDED
      // Assert: shouldWebcamBeActive becomes true
      // Assert: isMeetingCapturing becomes false
      // Assert: CLEAR_CANVAS not emitted (canvas preserved for fallback)
    });
  });

  describe('Scenario: Calibration notification wiring', () => {
    it('should call onShowCalibrationUI when meeting detected without calibration', () => {
      // Setup: No calibration for "Zoom"
      // Action: Send MEETING_DETECTED with hasCalibration: false
      // Assert: onShowCalibrationUI called with "Zoom"
    });
  });
});
```

### Phase 2: React Testing Library Tests (With DOM)

Create `apps/desktop/src/renderer/hub/__tests__/MonitorView.integration.test.tsx`:

```typescript
/**
 * DOM-level integration tests for MonitorView.
 * Tests the draw loop priority logic.
 */

describe('MonitorView draw priority', () => {
  it('draws from meetingCanvas when camera not ready during transition', () => {
    // Render MonitorView with:
    //   - meetingModeActive: false
    //   - videoRef: { readyState: 0 } (not ready)
    //   - meetingCanvasRef: { width: 640, height: 480 }
    // Assert: Canvas draws from meetingCanvasRef (fallback)
  });

  it('switches to camera when ready', () => {
    // Start with fallback state
    // Update videoRef to readyState: 2
    // Assert: Canvas draws from videoRef
  });
});
```

### Phase 3: E2E Playwright Tests (Full App)

Create `apps/desktop/e2e/meeting-mode.spec.ts`:

```typescript
/**
 * Full application E2E tests for meeting mode.
 * Requires running Electron app.
 */

test.describe('Meeting Mode E2E', () => {
  test('complete flow: camera → meeting → camera', async ({ electronApp }) => {
    // 1. Start app, enable detection
    // 2. Verify blink count incrementing
    // 3. Simulate meeting detection (mock IPC)
    // 4. Verify screen capture UI
    // 5. End meeting
    // 6. Verify camera restart
    // 7. Verify blink count continues
  });
});
```

---

## Risk Mitigation Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Blank screen on meeting end | FIXED | High | Priority-based draw fallback |
| Calibration UI not showing | FIXED | High | Wired onShowNotification |
| Memory leak in long sessions | Unknown | High | Add memory profiling test |
| Database queue overflow | Low | Medium | Queue size limit + warning |
| Camera permission denied | Medium | High | Graceful error + retry UI |
| PowerShell detection fails | Low | Medium | Fallback to process list |
| Screen capture permission denied | Medium | High | Clear error message + instructions |

---

## Recommended Test Additions (Priority Order)

1. **Integration: Hook ↔ Component wiring** (catches callback bugs)
2. **Integration: Draw loop source selection** (catches blank screen)
3. **Performance: 2-hour session memory profile** (catches leaks)
4. **E2E: Full meeting mode flow** (catches real-world issues)
5. **Stress: Rapid meeting start/stop** (catches race conditions)

---

## Files to Create

| File | Purpose |
|------|---------|
| `packages/ui/src/hooks/__tests__/useMeetingModeStateMachine.integration.test.ts` | Hook integration tests |
| `apps/desktop/src/renderer/hub/__tests__/MonitorView.test.tsx` | Draw loop tests |
| `apps/desktop/e2e/meeting-mode.spec.ts` | Full E2E flow |
| `scripts/memory-profile.ts` | Long-session memory test |

---

## Definition of Production Ready

- [ ] All 8 critical scenarios pass in integration tests
- [ ] No memory growth in 2-hour session test
- [ ] Error recovery works for all error states
- [ ] Camera/screen transitions are seamless (< 500ms blank)
- [ ] All callbacks properly wired (no TODO stubs)
- [ ] TypeScript strict mode passes
- [ ] 343+ unit tests pass
- [ ] Manual QA checklist completed
