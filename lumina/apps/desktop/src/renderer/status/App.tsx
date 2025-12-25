import React, { useEffect, useState } from 'react';
import { StatusIndicator } from '@lumina/ui';

// Read theme from localStorage (synced with settingsStore in hub)
function getThemeFromStorage(): 'light' | 'dark' | 'system' {
  try {
    const stored = localStorage.getItem('lumina-settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.theme || 'system';
    }
  } catch {
    // Ignore parse errors
  }
  return 'system';
}

// Apply theme to document
function applyTheme(theme: 'light' | 'dark' | 'system') {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', isDark);
}

interface DetectionState {
  blinkRate: number;
  wellnessScore: number;
  isDetecting: boolean;
  faceDetected: boolean;
}

export default function StatusApp() {
  const [state, setState] = useState<DetectionState>({
    blinkRate: 0,
    wellnessScore: 100,
    isDetecting: false,
    faceDetected: false,
  });

  // Apply theme on mount and when storage changes
  useEffect(() => {
    // Initial theme application
    applyTheme(getThemeFromStorage());

    // Listen for storage changes (when theme is changed in hub)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lumina-settings') {
        applyTheme(getThemeFromStorage());
      }
    };

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => applyTheme(getThemeFromStorage());

    window.addEventListener('storage', handleStorageChange);
    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, []);

  // Listen for updates from main process
  useEffect(() => {
    const unsubscribe = window.lumina?.status.onUpdate((data) => {
      setState(data);
    });

    return () => unsubscribe?.();
  }, []);

  // Double-click opens hub
  const handleDoubleClick = () => {
    window.lumina?.status.openHub();
  };

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className="h-full flex items-center justify-center cursor-pointer"
      title="Double-click to open dashboard"
    >
      <StatusIndicator
        blinkRate={state.blinkRate}
        wellnessScore={state.wellnessScore}
        isCompact
      />
    </div>
  );
}
