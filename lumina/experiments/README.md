# Meeting Detection Experiments

These scripts help debug and improve meeting detection for Lumina.

## Quick Start

### Option 1: Node.js (Recommended - matches Electron behavior)
```bash
cd lumina/experiments
node meeting-detector.js
```

### Option 2: PowerShell (More detailed process info)
```bash
powershell -ExecutionPolicy Bypass -File meeting-detection-test.ps1
```

### Option 3: Advanced PowerShell (Pattern matching analysis)
```bash
powershell -ExecutionPolicy Bypass -File advanced-meeting-detector.ps1
```

## How to Test

1. Run one of the scripts
2. Join a meeting (Zoom, Google Meet, Teams, etc.)
3. Watch the console output - it shows:
   - Process name and PID
   - Window title
   - Detection confidence
   - Which pattern matched

4. Leave the meeting and see it disappear

## What We're Looking For

When you join a meeting, we need to identify:

1. **Process Name** - What does Windows call this app?
   - Native Zoom: `Zoom` or `Zoom Meetings`?
   - Teams: `Teams` or `ms-teams`?
   - Browser: `chrome`, `msedge`, `firefox`

2. **Window Title** - What's in the title bar?
   - Zoom: "Zoom Meeting" or just "Zoom"?
   - Google Meet: "Meet - xxx-xxxx-xxx" format?
   - Teams: Contains "Microsoft Teams"?

3. **Timing** - When does it appear?
   - On meeting join?
   - When video starts?
   - When window is focused?

## Common Issues

### Zoom not detected
- Check if the process is named differently
- The title might be the meeting name instead of "Zoom Meeting"
- Zoom web might be in Chrome

### Google Meet detected as Zoom
- The patterns were too broad
- "Meet" was matching "Zoom Meeting"

### Detection is slow
- Polling is every 15 seconds in the app
- These experiments poll every 1-2 seconds

## Reporting Results

When reporting a detection failure, capture:

```
1. App name (Zoom, Google Meet, etc.)
2. How you joined (desktop app, browser, link)
3. The process name shown in the script
4. The window title shown in the script
5. Any pattern that DID match (even wrong app)
```
