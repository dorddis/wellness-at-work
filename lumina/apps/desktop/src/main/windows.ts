/**
 * Window Manager
 * Creates and manages Electron BrowserWindows
 */

import { BrowserWindow, screen, shell } from 'electron';
import path from 'path';

export class WindowManager {
  private hubWindow: BrowserWindow | null = null;
  private statusWindow: BrowserWindow | null = null;
  private overlayWindow: BrowserWindow | null = null;
  private isDev: boolean;

  constructor(isDev: boolean) {
    this.isDev = isDev;
  }

  /**
   * Get the URL for a renderer window
   */
  private getRendererURL(window: string): string {
    if (this.isDev) {
      return `http://localhost:5173/src/renderer/${window}/index.html`;
    }
    return `file://${path.join(__dirname, `../renderer/src/renderer/${window}/index.html`)}`;
  }

  /**
   * Get preload script path
   */
  private getPreloadPath(): string {
    return path.join(__dirname, '../preload/index.js');
  }

  /**
   * Create the main Hub window
   */
  async createHubWindow(): Promise<BrowserWindow> {
    if (this.hubWindow && !this.hubWindow.isDestroyed()) {
      this.hubWindow.focus();
      return this.hubWindow;
    }

    this.hubWindow = new BrowserWindow({
      width: 900,
      height: 700,
      minWidth: 600,
      minHeight: 500,
      show: false,
      frame: true,
      titleBarStyle: 'hiddenInset', // macOS: hidden title bar with traffic lights
      trafficLightPosition: { x: 15, y: 15 },
      backgroundColor: '#ffffff',
      webPreferences: {
        preload: this.getPreloadPath(),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false, // Required for some native modules
        webSecurity: this.isDev ? false : true, // Allow WASM in dev
      },
    });

    // Set CSP to allow WebAssembly for MediaPipe
    this.hubWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://storage.googleapis.com; " +
            "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net; " +
            "connect-src 'self' https://cdn.jsdelivr.net https://storage.googleapis.com blob:; " +
            "img-src 'self' data: blob:; " +
            "media-src 'self' blob:; " +
            "worker-src 'self' blob:;"
          ]
        }
      });
    });

    // Load the renderer
    await this.hubWindow.loadURL(this.getRendererURL('hub'));

    // Show when ready
    this.hubWindow.once('ready-to-show', () => {
      this.hubWindow?.show();
    });

    // Open external links in browser
    this.hubWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // Handle close - hide instead of destroy
    this.hubWindow.on('close', (event) => {
      if (!this.hubWindow?.isDestroyed()) {
        event.preventDefault();
        this.hubWindow?.hide();
      }
    });

    // Open DevTools in development
    if (this.isDev) {
      this.hubWindow.webContents.openDevTools({ mode: 'detach' });
    }

    return this.hubWindow;
  }

  /**
   * Create the floating Status window
   */
  async createStatusWindow(): Promise<BrowserWindow> {
    if (this.statusWindow && !this.statusWindow.isDestroyed()) {
      this.statusWindow.show();
      return this.statusWindow;
    }

    // Position in bottom-right of primary display
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    const windowWidth = 200;
    const windowHeight = 40;
    const padding = 20;

    this.statusWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x: screenWidth - windowWidth - padding,
      y: screenHeight - windowHeight - padding,
      show: false,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: true,
      hasShadow: false,
      webPreferences: {
        preload: this.getPreloadPath(),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // Make it click-through except for the actual content
    this.statusWindow.setIgnoreMouseEvents(false);

    await this.statusWindow.loadURL(this.getRendererURL('status'));

    this.statusWindow.once('ready-to-show', () => {
      this.statusWindow?.show();
    });

    return this.statusWindow;
  }

  /**
   * Create the Alert overlay window
   */
  async createOverlayWindow(): Promise<BrowserWindow> {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      return this.overlayWindow;
    }

    // Position in top-right of primary display
    const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
    const windowWidth = 380;
    const windowHeight = 150;
    const padding = 20;

    this.overlayWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x: screenWidth - windowWidth - padding,
      y: padding,
      show: false,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      focusable: true,
      webPreferences: {
        preload: this.getPreloadPath(),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    await this.overlayWindow.loadURL(this.getRendererURL('overlay'));

    return this.overlayWindow;
  }

  /**
   * Show an alert in the overlay window
   */
  async showAlert(alert: {
    id: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    action?: string;
  }): Promise<void> {
    const overlay = await this.createOverlayWindow();
    overlay.webContents.send('show-alert', alert);
    overlay.show();

    // Auto-hide after 10 seconds for info alerts
    if (alert.severity === 'info') {
      setTimeout(() => {
        if (!overlay.isDestroyed()) {
          overlay.hide();
        }
      }, 10000);
    }
  }

  /**
   * Hide the alert overlay
   */
  hideAlert(): void {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.hide();
    }
  }

  /**
   * Show the hub window
   */
  showHubWindow(): void {
    if (this.hubWindow && !this.hubWindow.isDestroyed()) {
      this.hubWindow.show();
      this.hubWindow.focus();
    } else {
      this.createHubWindow();
    }
  }

  /**
   * Hide the hub window
   */
  hideHubWindow(): void {
    if (this.hubWindow && !this.hubWindow.isDestroyed()) {
      this.hubWindow.hide();
    }
  }

  /**
   * Toggle status window visibility
   */
  toggleStatusWindow(): void {
    if (this.statusWindow && !this.statusWindow.isDestroyed()) {
      if (this.statusWindow.isVisible()) {
        this.statusWindow.hide();
      } else {
        this.statusWindow.show();
      }
    } else {
      this.createStatusWindow();
    }
  }

  /**
   * Send message to hub window
   */
  sendToHub(channel: string, ...args: any[]): void {
    if (this.hubWindow && !this.hubWindow.isDestroyed()) {
      this.hubWindow.webContents.send(channel, ...args);
    }
  }

  /**
   * Send message to status window
   */
  sendToStatus(channel: string, ...args: any[]): void {
    if (this.statusWindow && !this.statusWindow.isDestroyed()) {
      this.statusWindow.webContents.send(channel, ...args);
    }
  }

  /**
   * Get hub window reference
   */
  getHubWindow(): BrowserWindow | null {
    return this.hubWindow;
  }

  /**
   * Cleanup all windows
   */
  destroyAll(): void {
    this.hubWindow?.destroy();
    this.statusWindow?.destroy();
    this.overlayWindow?.destroy();
    this.hubWindow = null;
    this.statusWindow = null;
    this.overlayWindow = null;
  }
}
