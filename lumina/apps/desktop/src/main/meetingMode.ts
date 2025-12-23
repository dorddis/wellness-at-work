/**
 * Meeting Mode - Detection and Screen Capture
 * Detects running meeting apps and provides screen capture sources
 */

import { desktopCapturer, screen } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Configuration for meeting apps to detect
 */
interface MeetingAppConfig {
  process: string; // Process name (e.g., 'Zoom.exe')
  name: string; // Display name (e.g., 'Zoom')
  titlePattern?: RegExp; // For browser-based meetings
}

/**
 * Result of meeting app detection
 */
export interface MeetingDetectionResult {
  isDetected: boolean;
  appName: string | null;
  processName?: string;
}

/**
 * Known meeting apps to detect (Windows)
 */
const MEETING_APPS: MeetingAppConfig[] = [
  // Native Zoom - check various process names AND window titles
  // Zoom can run as "Zoom", "Zoom Meetings", etc.
  { process: 'Zoom', name: 'Zoom', titlePattern: /Zoom|Meeting/i },
  { process: 'Zoom Meetings', name: 'Zoom', titlePattern: /Zoom|Meeting/i },
  { process: 'CptHost', name: 'Zoom', titlePattern: /Zoom/i }, // Zoom's capturer process

  // Native Teams
  { process: 'Teams', name: 'Microsoft Teams' },
  { process: 'ms-teams', name: 'Microsoft Teams (New)' },

  // Other native apps
  { process: 'webex', name: 'Webex' },
  { process: 'Slack', name: 'Slack' },

  // Browser-based: Zoom Web App (check BEFORE Google Meet since both can run in same browser)
  {
    process: 'chrome',
    name: 'Zoom',
    titlePattern: /Zoom\s*(Meeting|Webinar)?|app\.zoom\.us/i,
  },
  {
    process: 'msedge',
    name: 'Zoom',
    titlePattern: /Zoom\s*(Meeting|Webinar)?|app\.zoom\.us/i,
  },
  {
    process: 'firefox',
    name: 'Zoom',
    titlePattern: /Zoom\s*(Meeting|Webinar)?|app\.zoom\.us/i,
  },

  // Browser-based: Google Meet - use meeting code pattern (xxx-xxxx-xxx) for high accuracy
  // Title format: "Meet - abc-defg-hij - Google Chrome"
  {
    process: 'chrome',
    name: 'Google Meet',
    titlePattern: /Meet\s*[-–]\s*[a-z]{3}-[a-z]{4}-[a-z]{3}|Google Meet|meet\.google\.com/i,
  },
  {
    process: 'msedge',
    name: 'Google Meet',
    titlePattern: /Meet\s*[-–]\s*[a-z]{3}-[a-z]{4}-[a-z]{3}|Google Meet|meet\.google\.com/i,
  },
  {
    process: 'firefox',
    name: 'Google Meet',
    titlePattern: /Meet\s*[-–]\s*[a-z]{3}-[a-z]{4}-[a-z]{3}|Google Meet|meet\.google\.com/i,
  },

  // Browser-based: Microsoft Teams Web
  {
    process: 'chrome',
    name: 'Microsoft Teams',
    titlePattern: /Microsoft Teams|teams\.microsoft\.com/i,
  },
  {
    process: 'msedge',
    name: 'Microsoft Teams',
    titlePattern: /Microsoft Teams|teams\.microsoft\.com/i,
  },
  {
    process: 'firefox',
    name: 'Microsoft Teams',
    titlePattern: /Microsoft Teams|teams\.microsoft\.com/i,
  },

  // Browser-based: Webex Web
  {
    process: 'chrome',
    name: 'Webex',
    titlePattern: /Webex|webex\.com/i,
  },
  {
    process: 'msedge',
    name: 'Webex',
    titlePattern: /Webex|webex\.com/i,
  },
  {
    process: 'firefox',
    name: 'Webex',
    titlePattern: /Webex|webex\.com/i,
  },
];

/**
 * Detect if any meeting app is currently running
 * Uses PowerShell on Windows to check running processes
 */
export async function detectMeetingApp(): Promise<MeetingDetectionResult> {
  try {
    // PowerShell command to get process names and window titles
    // Using -EncodedCommand to avoid shell escaping issues with $_ variable
    const psScript = `Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object ProcessName, MainWindowTitle | ConvertTo-Json -Compress`;
    const encodedCommand = Buffer.from(psScript, 'utf16le').toString('base64');
    const { stdout } = await execAsync(
      `powershell -NoProfile -EncodedCommand ${encodedCommand}`,
      { timeout: 5000 }
    );

    if (!stdout.trim()) {
      return { isDetected: false, appName: null };
    }

    // Parse JSON output (can be array or single object)
    let processes: Array<{ ProcessName: string; MainWindowTitle: string }>;
    try {
      const parsed = JSON.parse(stdout);
      processes = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return { isDetected: false, appName: null };
    }

    // Debug: Log all processes with windows (useful for troubleshooting)
    const meetingRelated = processes.filter(
      (p) =>
        /zoom|teams|meet|webex|slack|chrome|msedge|firefox/i.test(p.ProcessName) ||
        /zoom|teams|meet|webex|call|conference/i.test(p.MainWindowTitle)
    );
    if (meetingRelated.length > 0) {
      console.log('[MeetingMode] Relevant processes found:', meetingRelated);
    }

    // Check each known meeting app
    // Use filter() instead of find() to check ALL processes with matching name
    // (Chrome has multiple processes, only one has the meeting tab title)
    for (const app of MEETING_APPS) {
      const matches = processes.filter(
        (p) => p.ProcessName.toLowerCase() === app.process.toLowerCase()
      );

      for (const match of matches) {
        // For apps with titlePattern, check window title
        if (app.titlePattern) {
          if (app.titlePattern.test(match.MainWindowTitle)) {
            console.log('[MeetingMode] Match found:', {
              app: app.name,
              process: match.ProcessName,
              title: match.MainWindowTitle,
            });
            return {
              isDetected: true,
              appName: app.name,
              processName: match.ProcessName,
            };
          }
        } else {
          // Native app without title pattern - just process presence is enough
          console.log('[MeetingMode] Match found (no title check):', {
            app: app.name,
            process: match.ProcessName,
            title: match.MainWindowTitle,
          });
          return {
            isDetected: true,
            appName: app.name,
            processName: match.ProcessName,
          };
        }
      }
    }

    // Fallback: Check by window title if no process match
    // This catches cases where process name varies (e.g., Zoom.exe vs ZoomIt)
    for (const proc of processes) {
      const title = proc.MainWindowTitle.toLowerCase();
      const procName = proc.ProcessName.toLowerCase();

      // Zoom detection by title
      if (
        (title.includes('zoom') && (title.includes('meeting') || title.includes('webinar'))) ||
        procName.includes('zoom')
      ) {
        console.log('[MeetingMode] Fallback match - Zoom:', {
          process: proc.ProcessName,
          title: proc.MainWindowTitle,
        });
        return {
          isDetected: true,
          appName: 'Zoom',
          processName: proc.ProcessName,
        };
      }

      // Teams detection by title
      if (title.includes('microsoft teams') || title.includes('teams meeting')) {
        console.log('[MeetingMode] Fallback match - Teams:', {
          process: proc.ProcessName,
          title: proc.MainWindowTitle,
        });
        return {
          isDetected: true,
          appName: 'Microsoft Teams',
          processName: proc.ProcessName,
        };
      }

      // Google Meet detection by title (browser-based)
      // Use meeting code pattern (xxx-xxxx-xxx) for high accuracy
      const meetCodePattern = /meet\s*[-–]\s*[a-z]{3}-[a-z]{4}-[a-z]{3}/i;
      if (
        meetCodePattern.test(proc.MainWindowTitle) ||
        title.includes('meet.google.com') ||
        title.includes('google meet')
      ) {
        console.log('[MeetingMode] Fallback match - Google Meet:', {
          process: proc.ProcessName,
          title: proc.MainWindowTitle,
        });
        return {
          isDetected: true,
          appName: 'Google Meet',
          processName: proc.ProcessName,
        };
      }
    }

    return { isDetected: false, appName: null };
  } catch (error) {
    console.error('[MeetingMode] Failed to detect meeting app:', error);
    return { isDetected: false, appName: null };
  }
}

/**
 * Get available screen capture sources
 */
export async function getScreenSources(): Promise<Electron.DesktopCapturerSource[]> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 150, height: 150 },
    });
    return sources;
  } catch (error) {
    console.error('[MeetingMode] Failed to get screen sources:', error);
    return [];
  }
}

/**
 * Get the source ID for a specific display
 * Used to create a MediaStream for screen capture
 */
export async function getSourceIdForDisplay(
  displayId?: number
): Promise<string | null> {
  try {
    const display = displayId
      ? screen.getAllDisplays().find((d) => d.id === displayId)
      : screen.getPrimaryDisplay();

    if (!display) {
      console.error('[MeetingMode] Display not found:', displayId);
      return null;
    }

    const sources = await desktopCapturer.getSources({ types: ['screen'] });

    // Match source to display
    // Electron formats display_id as string
    const source = sources.find((s) => s.display_id === String(display.id));

    if (!source) {
      // Fallback: use first screen source
      console.warn('[MeetingMode] Could not match display, using first source');
      return sources[0]?.id ?? null;
    }

    return source.id;
  } catch (error) {
    console.error('[MeetingMode] Failed to get source ID:', error);
    return null;
  }
}

/**
 * Get all available displays for multi-monitor setup
 */
export function getDisplays(): Array<{
  id: number;
  label: string;
  bounds: { x: number; y: number; width: number; height: number };
  isPrimary: boolean;
}> {
  const displays = screen.getAllDisplays();
  const primaryId = screen.getPrimaryDisplay().id;

  return displays.map((d, index) => ({
    id: d.id,
    label: d.label || `Display ${index + 1}`,
    bounds: d.bounds,
    isPrimary: d.id === primaryId,
  }));
}
