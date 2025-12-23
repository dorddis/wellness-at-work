/**
 * Electron Main Process
 * Entry point for Lumina Desktop App
 */

import { app, BrowserWindow, ipcMain, Menu, nativeImage, session, systemPreferences } from 'electron';
import path from 'path';
import { WindowManager } from './windows';
import { TrayManager } from './tray';
import { setupIPC, handleDeepLink } from './ipc';
import { DatabaseManager } from './database';
import { SyncService } from './sync';

// Handle creating/removing shortcuts on Windows when installing/uninstalling
// Only needed for production builds with Squirrel installer
try {
  if (require('electron-squirrel-startup')) {
    app.quit();
  }
} catch {
  // electron-squirrel-startup not installed (dev mode)
}

// Keep references to prevent garbage collection
let windowManager: WindowManager;
let trayManager: TrayManager;
let database: DatabaseManager;
let syncService: SyncService;

// Determine if we're in development
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Register custom protocol for deep links (magic link auth)
const PROTOCOL = 'lumina';
if (process.defaultApp) {
  // Development: need to register with path to electron
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  // Production: just register the protocol
  app.setAsDefaultProtocolClient(PROTOCOL);
}

async function createApp() {
  // Remove default menu bar (File, Edit, View, etc.)
  Menu.setApplicationMenu(null);

  // Initialize database
  database = new DatabaseManager();
  await database.initialize();

  // Initialize sync service
  syncService = new SyncService(database);
  await syncService.initialize();

  // NOTE: Auto-sync is NOT started here - it's controlled by the renderer
  // based on cloudSyncEnabled setting (GDPR local-only mode support).
  // The renderer calls sync:start-auto after login if cloudSyncEnabled is true.

  // Setup permission handler for camera/microphone access
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'mediaKeySystem', 'clipboard-read', 'clipboard-write'];
    if (allowedPermissions.includes(permission)) {
      console.log(`Permission granted: ${permission}`);
      callback(true);
    } else {
      console.log(`Permission denied: ${permission}`);
      callback(false);
    }
  });

  // On macOS, request camera access at system level
  if (process.platform === 'darwin') {
    systemPreferences.askForMediaAccess('camera').then((granted) => {
      console.log(`macOS camera access: ${granted ? 'granted' : 'denied'}`);
    });
  }

  // Create window manager
  windowManager = new WindowManager(isDev);

  // Create tray
  trayManager = new TrayManager(windowManager);

  // Setup IPC handlers
  setupIPC(windowManager, database, syncService);

  // Create initial windows
  await windowManager.createHubWindow();

  // Show status window by default
  await windowManager.createStatusWindow();
}

// App lifecycle
app.whenReady().then(createApp);

app.on('window-all-closed', () => {
  // On macOS, apps typically stay open until explicitly quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    windowManager?.createHubWindow();
  }
});

app.on('before-quit', () => {
  // Cleanup
  syncService?.stopAutoSync();
  database?.close();
  trayManager?.destroy();
});

// Force quit on SIGINT/SIGTERM (dev server stopped)
process.on('SIGINT', () => {
  console.log('SIGINT received, quitting...');
  app.quit();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, quitting...');
  app.quit();
  process.exit(0);
});

// Windows: handle CTRL+C
if (process.platform === 'win32') {
  process.on('message', (msg) => {
    if (msg === 'graceful-exit') {
      app.quit();
      process.exit(0);
    }
  });
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  // Windows/Linux: deep links come through second-instance
  app.on('second-instance', (_, commandLine) => {
    // Focus hub window
    windowManager?.showHubWindow();

    // Check for deep link URL in command line args
    const deepLinkUrl = commandLine.find(arg => arg.startsWith(`${PROTOCOL}://`));
    if (deepLinkUrl) {
      console.log('Deep link received (second-instance):', deepLinkUrl);
      handleDeepLink(deepLinkUrl, windowManager);
    }
  });
}

// macOS: deep links come through open-url event
app.on('open-url', (event, url) => {
  event.preventDefault();
  console.log('Deep link received (open-url):', url);
  handleDeepLink(url, windowManager);
});

// Security: Disable navigation to external URLs
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    // Allow dev server URLs in development
    if (isDev && url.startsWith('http://localhost')) {
      return;
    }
    // Block all other navigation
    event.preventDefault();
  });
});
