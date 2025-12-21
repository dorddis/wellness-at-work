/**
 * Electron Mock for Unit Testing
 *
 * Provides mock implementations of Electron APIs used in the app.
 * This allows testing main process code without running Electron.
 */

import os from 'os'
import path from 'path'

// Mock user data path - use temp directory for tests
const mockUserDataPath = path.join(os.tmpdir(), 'lumina-test-' + process.pid)

export const app = {
  getPath: (name: string): string => {
    switch (name) {
      case 'userData':
        return mockUserDataPath
      case 'home':
        return os.homedir()
      case 'temp':
        return os.tmpdir()
      case 'appData':
        return path.join(os.homedir(), 'AppData', 'Roaming')
      default:
        return os.tmpdir()
    }
  },
  getName: () => 'Lumina Test',
  getVersion: () => '0.0.0-test',
  isReady: () => true,
  whenReady: () => Promise.resolve(),
  quit: () => {},
  on: () => {},
  once: () => {},
}

export const ipcMain = {
  on: () => {},
  once: () => {},
  handle: () => {},
  removeHandler: () => {},
}

export const ipcRenderer = {
  on: () => {},
  once: () => {},
  send: () => {},
  invoke: () => Promise.resolve(),
  removeListener: () => {},
}

export const BrowserWindow = class MockBrowserWindow {
  constructor() {}
  loadURL() {}
  loadFile() {}
  show() {}
  hide() {}
  close() {}
  on() {}
  once() {}
  webContents = {
    send: () => {},
    on: () => {},
  }
}

export const Tray = class MockTray {
  constructor() {}
  setToolTip() {}
  setContextMenu() {}
  on() {}
}

export const Menu = {
  buildFromTemplate: () => ({}),
  setApplicationMenu: () => {},
}

export const nativeImage = {
  createFromPath: () => ({}),
  createEmpty: () => ({}),
}

export const shell = {
  openExternal: () => Promise.resolve(),
}

export const dialog = {
  showMessageBox: () => Promise.resolve({ response: 0 }),
  showOpenDialog: () => Promise.resolve({ canceled: true, filePaths: [] }),
}

export default {
  app,
  ipcMain,
  ipcRenderer,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  shell,
  dialog,
}
