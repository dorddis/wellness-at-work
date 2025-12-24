/**
 * Global Window type augmentation for Lumina API
 * This file extends the Window interface to include the lumina API
 * exposed via contextBridge in the preload script.
 */

import type { LuminaAPI } from '../preload/index';

declare global {
  interface Window {
    lumina: LuminaAPI;
  }
}

export {};
