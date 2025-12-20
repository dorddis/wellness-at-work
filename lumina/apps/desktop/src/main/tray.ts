/**
 * System Tray Manager
 * Creates system tray icon with menu
 */

import { Tray, Menu, app, nativeImage, NativeImage } from 'electron';
import path from 'path';
import { WindowManager } from './windows';

export class TrayManager {
  private tray: Tray | null = null;
  private windowManager: WindowManager;

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager;
    this.createTray();
  }

  /**
   * Create the system tray icon
   */
  private createTray(): void {
    // Create a simple icon (in production, use actual icon file)
    const iconPath = this.getIconPath();
    const icon = nativeImage.createFromPath(iconPath);

    // Fallback: create a simple colored icon if no file exists
    const trayIcon = icon.isEmpty() ? this.createDefaultIcon() : icon;

    this.tray = new Tray(trayIcon);
    this.tray.setToolTip('Lumina - Eye Wellness');

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
   * Get icon path based on platform
   */
  private getIconPath(): string {
    const iconName = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
    return path.join(__dirname, '../../assets', iconName);
  }

  /**
   * Create a default icon if no file exists
   */
  private createDefaultIcon(): NativeImage {
    // Create a 16x16 or 32x32 icon programmatically
    // This is a placeholder - in production, include actual icon files
    const size = process.platform === 'darwin' ? 22 : 16;
    const canvas = Buffer.alloc(size * size * 4);

    // Fill with a teal color (Lumina brand color)
    for (let i = 0; i < size * size; i++) {
      const offset = i * 4;
      canvas[offset] = 59;     // R
      canvas[offset + 1] = 130; // G
      canvas[offset + 2] = 246; // B
      canvas[offset + 3] = 255; // A
    }

    return nativeImage.createFromBuffer(canvas, { width: size, height: size });
  }

  /**
   * Update the tray menu
   */
  updateMenu(isDetecting: boolean = false, blinkRate: number = 0): void {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Lumina',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: isDetecting ? `Detecting - ${blinkRate.toFixed(0)} blinks/min` : 'Detection Paused',
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
        click: () => {
          const hub = this.windowManager.getHubWindow();
          if (hub) {
            hub.webContents.send('toggle-detection');
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Settings',
        click: () => {
          this.windowManager.showHubWindow();
          // Navigate to settings - will be handled by renderer
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
