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
  // Native apps
  { process: 'Zoom', name: 'Zoom' },
  { process: 'Teams', name: 'Microsoft Teams' },
  { process: 'ms-teams', name: 'Microsoft Teams (New)' },
  { process: 'webex', name: 'Webex' },
  { process: 'Slack', name: 'Slack' },

  // Browser-based (need window title check)
  {
    process: 'chrome',
    name: 'Google Meet',
    titlePattern: /Meet\s*[-|]|Google Meet/i,
  },
  {
    process: 'msedge',
    name: 'Google Meet',
    titlePattern: /Meet\s*[-|]|Google Meet/i,
  },
  {
    process: 'firefox',
    name: 'Google Meet',
    titlePattern: /Meet\s*[-|]|Google Meet/i,
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

    // Check each known meeting app
    for (const app of MEETING_APPS) {
      const match = processes.find(
        (p) => p.ProcessName.toLowerCase() === app.process.toLowerCase()
      );

      if (match) {
        // For browser-based meetings, check window title
        if (app.titlePattern) {
          if (app.titlePattern.test(match.MainWindowTitle)) {
            return {
              isDetected: true,
              appName: app.name,
              processName: match.ProcessName,
            };
          }
        } else {
          // Native app - just process presence is enough
          return {
            isDetected: true,
            appName: app.name,
            processName: match.ProcessName,
          };
        }
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
