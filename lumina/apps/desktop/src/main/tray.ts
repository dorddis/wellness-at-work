/**
 * System Tray Manager
 * Creates system tray icon with menu and dynamic icon states
 */

import { Tray, Menu, app, nativeImage, NativeImage } from 'electron';
import path from 'path';
import { WindowManager } from './windows';

/**
 * Tray icon states for visual feedback
 */
export type TrayIconState = 'active' | 'warning' | 'break' | 'paused' | 'dnd';

/**
 * Icon colors for each state (grayscale palette per design requirements)
 */
const ICON_COLORS: Record<TrayIconState, { r: number; g: number; b: number }> = {
  active: { r: 34, g: 197, b: 94 },   // Green - healthy state
  warning: { r: 234, g: 179, b: 8 },  // Yellow - needs attention
  break: { r: 59, g: 130, b: 246 },   // Blue - break time
  paused: { r: 156, g: 163, b: 175 }, // Gray - monitoring paused
  dnd: { r: 107, g: 114, b: 128 },    // Dark gray - do not disturb
};

/**
 * Tooltips for each state
 */
const STATE_TOOLTIPS: Record<TrayIconState, string> = {
  active: 'Lumina - Monitoring Active',
  warning: 'Lumina - Low Blink Rate',
  break: 'Lumina - Break Time!',
  paused: 'Lumina - Monitoring Paused',
  dnd: 'Lumina - Do Not Disturb',
};

export class TrayManager {
  private tray: Tray | null = null;
  private windowManager: WindowManager;
  private currentState: TrayIconState = 'paused';
  private iconCache: Map<TrayIconState, NativeImage> = new Map();
  private baseIcon: NativeImage | null = null;

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager;
    this.loadBaseIcon();
    this.initializeIconCache();
    this.createTray();
  }

  /**
   * Load the base Lumina icon from the build folder
   */
  private loadBaseIcon(): void {
    // Try multiple paths for dev vs production
    const iconPaths = [
      path.join(__dirname, '../../build/icon.png'),           // Dev
      path.join(__dirname, '../../../build/icon.png'),        // Production
      path.join(process.resourcesPath || '', 'icon.png'),     // Packaged
    ];

    for (const iconPath of iconPaths) {
      try {
        const icon = nativeImage.createFromPath(iconPath);
        if (!icon.isEmpty()) {
          // Resize for tray (16x16 Windows, 22x22 macOS)
          const size = process.platform === 'darwin' ? 22 : 16;
          this.baseIcon = icon.resize({ width: size, height: size });
          return;
        }
      } catch {
        // Try next path
      }
    }

    // Fallback: create a simple icon if file not found
    console.warn('Could not load tray icon from file, using fallback');
    this.baseIcon = null;
  }

  /**
   * Pre-generate icons for all states
   */
  private initializeIconCache(): void {
    const states: TrayIconState[] = ['active', 'warning', 'break', 'paused', 'dnd'];
    for (const state of states) {
      this.iconCache.set(state, this.createStateIcon(state));
    }
  }

  /**
   * Create the system tray icon
   */
  private createTray(): void {
    // Use base Lumina icon, fall back to generated icon
    const trayIcon = this.baseIcon || this.iconCache.get('paused') || this.createStateIcon('paused');

    this.tray = new Tray(trayIcon);
    this.tray.setToolTip(STATE_TOOLTIPS.paused);

    // Build context menu
    this.updateMenu();

    // Click behavior
    this.tray.on('click', () => {
      this.windowManager.showHubWindow();
    });

    // Double-click (Windows)
    this.tray.on('double-click', () => {
      this.windowManager.showHubWindow();
    });
  }

  /**
   * Create an icon for a specific state
   */
  private createStateIcon(state: TrayIconState): NativeImage {
    const size = process.platform === 'darwin' ? 22 : 16;
    const canvas = Buffer.alloc(size * size * 4);
    const color = ICON_COLORS[state];

    // Create a circular icon with the state color
    const center = size / 2;
    const radius = size / 2 - 1;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const offset = (y * size + x) * 4;
        const distance = Math.sqrt(Math.pow(x - center, 2) + Math.pow(y - center, 2));

        if (distance <= radius) {
          // Inside the circle
          canvas[offset] = color.r;     // R
          canvas[offset + 1] = color.g; // G
          canvas[offset + 2] = color.b; // B
          canvas[offset + 3] = 255;     // A (fully opaque)
        } else if (distance <= radius + 1) {
          // Anti-aliased edge
          const alpha = Math.max(0, 1 - (distance - radius)) * 255;
          canvas[offset] = color.r;
          canvas[offset + 1] = color.g;
          canvas[offset + 2] = color.b;
          canvas[offset + 3] = Math.round(alpha);
        } else {
          // Outside the circle (transparent)
          canvas[offset] = 0;
          canvas[offset + 1] = 0;
          canvas[offset + 2] = 0;
          canvas[offset + 3] = 0;
        }
      }
    }

    return nativeImage.createFromBuffer(canvas, { width: size, height: size });
  }

  /**
   * Update the tray icon state
   */
  setIconState(state: TrayIconState, customTooltip?: string): void {
    if (this.currentState === state && !customTooltip) return;

    this.currentState = state;
    // Use base icon if available, otherwise fall back to generated state icon
    const icon = this.baseIcon || this.iconCache.get(state) || this.createStateIcon(state);
    this.tray?.setImage(icon);
    this.tray?.setToolTip(customTooltip || STATE_TOOLTIPS[state]);
  }

  /**
   * Get the current icon state
   */
  getIconState(): TrayIconState {
    return this.currentState;
  }

  /**
   * Update the tray menu with current detection state
   */
  updateMenu(isDetecting: boolean = false, blinkRate: number = 0, isDnd: boolean = false): void {
    // Update icon state based on detection status
    if (isDnd) {
      this.setIconState('dnd');
    } else if (!isDetecting) {
      this.setIconState('paused');
    } else if (blinkRate < 10) {
      this.setIconState('warning', `Lumina - Low blink rate: ${blinkRate.toFixed(0)}/min`);
    } else {
      this.setIconState('active', `Lumina - ${blinkRate.toFixed(0)} blinks/min`);
    }

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Lumina',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: this.getStatusLabel(isDetecting, blinkRate, isDnd),
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Open Dashboard',
        click: () => this.windowManager.showHubWindow(),
      },
      {
        label: 'Toggle Status Bar',
        click: () => this.windowManager.toggleStatusWindow(),
      },
      { type: 'separator' },
      {
        label: isDetecting ? 'Pause Detection' : 'Start Detection',
        enabled: !isDnd,
        click: () => {
          const hub = this.windowManager.getHubWindow();
          if (hub) {
            hub.webContents.send('toggle-detection');
          }
        },
      },
      {
        label: isDnd ? 'Disable Do Not Disturb' : 'Enable Do Not Disturb',
        click: () => {
          const hub = this.windowManager.getHubWindow();
          if (hub) {
            hub.webContents.send('toggle-dnd');
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Take a Break Now',
        enabled: isDetecting && !isDnd,
        click: () => {
          const hub = this.windowManager.getHubWindow();
          if (hub) {
            hub.webContents.send('start-break');
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Settings',
        click: () => {
          this.windowManager.showHubWindow();
          const hub = this.windowManager.getHubWindow();
          if (hub) {
            hub.webContents.send('navigate', '/settings');
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit Lumina',
        click: () => {
          app.quit();
        },
      },
    ]);

    this.tray?.setContextMenu(contextMenu);
  }

  /**
   * Get status label for the menu
   */
  private getStatusLabel(isDetecting: boolean, blinkRate: number, isDnd: boolean): string {
    if (isDnd) {
      return 'Do Not Disturb Active';
    }
    if (!isDetecting) {
      return 'Detection Paused';
    }
    if (blinkRate < 10) {
      return `Low Blink Rate - ${blinkRate.toFixed(0)}/min`;
    }
    return `Healthy - ${blinkRate.toFixed(0)} blinks/min`;
  }

  /**
   * Set break mode icon
   */
  setBreakMode(isBreak: boolean): void {
    if (isBreak) {
      this.setIconState('break');
    }
  }

  /**
   * Update tray tooltip
   */
  setTooltip(text: string): void {
    this.tray?.setToolTip(text);
  }

  /**
   * Destroy the tray
   */
  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
  }
}
