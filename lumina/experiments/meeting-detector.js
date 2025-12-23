/**
 * Meeting Detection Experiment - Node.js Version
 * Run: node meeting-detector.js
 *
 * This mimics the exact detection logic used in the Electron app
 * so we can debug and test detection patterns.
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Meeting detection patterns - same structure as meetingMode.ts
const MEETING_PATTERNS = [
  // Zoom - HIGH confidence patterns
  { pattern: /Zoom Meeting/i, app: 'Zoom', confidence: 100 },
  { pattern: /Zoom Webinar/i, app: 'Zoom', confidence: 100 },
  { pattern: /app\.zoom\.us/i, app: 'Zoom', confidence: 100 },
  { pattern: /zoom\.us\/j\//i, app: 'Zoom', confidence: 100 },

  // Zoom - Process-based (if title contains Zoom and process is Zoom)
  { pattern: /^Zoom$/i, app: 'Zoom', confidence: 70, processHint: 'zoom' },

  // Google Meet - HIGH confidence
  { pattern: /meet\.google\.com/i, app: 'Google Meet', confidence: 100 },
  { pattern: /Google Meet/i, app: 'Google Meet', confidence: 100 },
  // Meet code format: xxx-xxxx-xxx
  { pattern: /Meet\s*[-–]\s*[a-z]{3}-[a-z]{4}-[a-z]{3}/i, app: 'Google Meet', confidence: 100 },

  // Microsoft Teams
  { pattern: /Microsoft Teams/i, app: 'Microsoft Teams', confidence: 90 },
  { pattern: /teams\.microsoft\.com/i, app: 'Microsoft Teams', confidence: 100 },
  { pattern: /\| Microsoft Teams$/i, app: 'Microsoft Teams', confidence: 100 },
  { pattern: /Meeting in.*Teams/i, app: 'Microsoft Teams', confidence: 95 },

  // Webex
  { pattern: /Webex/i, app: 'Webex', confidence: 90 },
  { pattern: /webex\.com/i, app: 'Webex', confidence: 100 },

  // Slack Huddle
  { pattern: /Slack.*[Hh]uddle/i, app: 'Slack Huddle', confidence: 100 },
  { pattern: /Slack\s+call/i, app: 'Slack Huddle', confidence: 100 },

  // Discord (lower confidence - could just be chatting)
  { pattern: /Discord.*voice/i, app: 'Discord', confidence: 70 },
];

// Process names that indicate meeting apps
const MEETING_PROCESS_NAMES = [
  { process: /^zoom$/i, app: 'Zoom' },
  { process: /^zoom meetings$/i, app: 'Zoom' },
  { process: /^teams$/i, app: 'Microsoft Teams' },
  { process: /^ms-teams$/i, app: 'Microsoft Teams' },
  { process: /^webex$/i, app: 'Webex' },
  { process: /^slack$/i, app: 'Slack' },
];

async function getWindowsWithTitles() {
  const psScript = `
    Get-Process | Where-Object { $_.MainWindowTitle -ne '' } |
    Select-Object ProcessName, Id, MainWindowTitle |
    ConvertTo-Json -Compress
  `;

  const encodedCommand = Buffer.from(psScript, 'utf16le').toString('base64');

  try {
    const { stdout } = await execAsync(
      `powershell -NoProfile -EncodedCommand ${encodedCommand}`,
      { timeout: 5000 }
    );

    if (!stdout.trim()) {
      return [];
    }

    const parsed = JSON.parse(stdout);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    console.error('Error getting windows:', error.message);
    return [];
  }
}

function detectMeeting(processes) {
  const results = [];

  for (const proc of processes) {
    const { ProcessName, MainWindowTitle, Id } = proc;

    // Check window title patterns
    for (const { pattern, app, confidence, processHint } of MEETING_PATTERNS) {
      if (pattern.test(MainWindowTitle)) {
        // If there's a process hint, verify it matches
        if (processHint && !new RegExp(processHint, 'i').test(ProcessName)) {
          continue;
        }

        results.push({
          app,
          confidence,
          processName: ProcessName,
          pid: Id,
          windowTitle: MainWindowTitle,
          matchType: 'title',
          pattern: pattern.toString(),
        });
        break; // Only match first pattern per window
      }
    }

    // Check process name (for native apps without specific window titles)
    for (const { process, app } of MEETING_PROCESS_NAMES) {
      if (process.test(ProcessName)) {
        // Avoid duplicates
        const alreadyFound = results.find(
          (r) => r.pid === Id && r.app === app
        );
        if (!alreadyFound) {
          results.push({
            app,
            confidence: 60, // Lower confidence for process-only match
            processName: ProcessName,
            pid: Id,
            windowTitle: MainWindowTitle,
            matchType: 'process',
            pattern: process.toString(),
          });
        }
      }
    }
  }

  // Sort by confidence
  results.sort((a, b) => b.confidence - a.confidence);

  // Return highest confidence match per app
  const uniqueApps = new Map();
  for (const r of results) {
    if (!uniqueApps.has(r.app) || uniqueApps.get(r.app).confidence < r.confidence) {
      uniqueApps.set(r.app, r);
    }
  }

  return Array.from(uniqueApps.values());
}

function formatTime() {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

async function main() {
  console.clear();
  console.log(`${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.cyan}  MEETING DETECTION EXPERIMENT (Node)${colors.reset}`);
  console.log(`${colors.cyan}  Press Ctrl+C to stop${colors.reset}`);
  console.log(`${colors.cyan}========================================${colors.reset}`);
  console.log('');
  console.log(`${colors.yellow}Join a meeting to test detection...${colors.reset}`);
  console.log('');

  let lastMeetings = [];
  let iteration = 0;

  const poll = async () => {
    iteration++;
    const time = formatTime();

    try {
      const processes = await getWindowsWithTitles();
      const meetings = detectMeeting(processes);

      // Check for changes
      const currentIds = meetings.map((m) => `${m.app}|${m.pid}`).join(',');
      const lastIds = lastMeetings.map((m) => `${m.app}|${m.pid}`).join(',');

      if (currentIds !== lastIds) {
        console.log('');
        console.log(`${colors.magenta}[${time}] === STATE CHANGE ===${colors.reset}`);

        if (meetings.length > 0) {
          console.log(`${colors.green}${colors.bright}MEETINGS DETECTED:${colors.reset}`);
          for (const m of meetings) {
            const confColor =
              m.confidence >= 90
                ? colors.green
                : m.confidence >= 70
                ? colors.yellow
                : colors.gray;

            console.log(`  ${confColor}[${m.confidence}%]${colors.reset} ${colors.bright}${m.app}${colors.reset}`);
            console.log(`       ${colors.gray}Process: ${m.processName} (PID: ${m.pid})${colors.reset}`);
            console.log(`       ${colors.gray}Title: ${m.windowTitle}${colors.reset}`);
            console.log(`       ${colors.gray}Match: ${m.matchType} - ${m.pattern}${colors.reset}`);
          }
        } else {
          console.log(`${colors.red}NO MEETINGS DETECTED${colors.reset}`);
        }

        lastMeetings = meetings;
      }

      // Periodic status every 15 iterations
      if (iteration % 15 === 0) {
        console.log('');
        process.stdout.write(`${colors.cyan}[${time}] Status: ${colors.reset}`);
        if (meetings.length > 0) {
          console.log(`${colors.green}${meetings.length} meeting(s) active${colors.reset}`);
        } else {
          console.log(`${colors.gray}No meetings${colors.reset}`);
        }
      }
    } catch (error) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    }
  };

  // Initial check
  await poll();

  // Poll every second
  setInterval(poll, 1000);
}

// Run
main().catch(console.error);
