import React, { useEffect, useState } from 'react';
import { StatusIndicator } from '@lumina/ui';

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
