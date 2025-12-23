/**
 * MeetingModeCalibration Component
 * Allows users to select the self-view region for meeting mode
 * Shows a screenshot of the desktop so user can select the meeting app's self-view
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { type CaptureRegion } from '@lumina/ui';

interface MeetingModeCalibrationProps {
  /** Name of the meeting app being calibrated */
  appName: string;
  /** Display ID being captured */
  displayId: number;
  /** Callback when calibration is complete */
  onComplete: (region: CaptureRegion) => void;
  /** Callback when calibration is cancelled */
  onCancel: () => void;
  /** Optional existing region to show as starting point */
  existingRegion?: CaptureRegion;
}

interface ScreenshotData {
  dataUrl: string;
  width: number;
  height: number;
  scaleFactor: number;
}

/**
 * Full-screen overlay for selecting self-view region
 * Shows a screenshot of the desktop for accurate region selection
 */
export function MeetingModeCalibration({
  appName,
  displayId,
  onComplete,
  onCancel,
  existingRegion,
}: MeetingModeCalibrationProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentRegion, setCurrentRegion] = useState<CaptureRegion | null>(
    existingRegion ?? null
  );
  const [screenshot, setScreenshot] = useState<ScreenshotData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Capture screenshot on mount - minimize app first so meeting app is visible
  useEffect(() => {
    async function captureScreen() {
      try {
        setIsLoading(true);
        setError(null);

        // Step 1: Minimize the Lumina window so it doesn't cover the meeting app
        await window.lumina.window.minimize();

        // Step 2: Wait for window to minimize
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Step 3: Capture the screenshot (meeting app should now be visible)
        const result = await window.lumina.meetingMode.captureScreenshot();

        // Step 4: Restore the window to show calibration UI
        await window.lumina.window.maximize();

        if (result) {
          setScreenshot(result);
        } else {
          setError('Failed to capture screen. Please try again.');
        }
      } catch (err) {
        console.error('[Calibration] Screenshot error:', err);
        setError('Failed to capture screen. Please check permissions.');
        // Try to restore window even on error
        try {
          await window.lumina.window.maximize();
        } catch {}
      } finally {
        setIsLoading(false);
      }
    }

    captureScreen();
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && currentRegion && isValidRegion(currentRegion)) {
        onComplete(currentRegion);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentRegion, onComplete, onCancel]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click

    const image = imageRef.current;
    if (!image) return;

    const rect = image.getBoundingClientRect();

    setIsSelecting(true);
    setStartPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    // Reset region on new selection
    setCurrentRegion(null);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelecting) return;

      const image = imageRef.current;
      if (!image || !screenshot) return;

      const rect = image.getBoundingClientRect();
      const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

      // Calculate the scale between displayed image and actual screenshot
      const scaleX = screenshot.width / rect.width;
      const scaleY = screenshot.height / rect.height;

      // Convert to actual screen coordinates
      setCurrentRegion({
        x: Math.round(Math.min(startPos.x, currentX) * scaleX),
        y: Math.round(Math.min(startPos.y, currentY) * scaleY),
        width: Math.round(Math.abs(currentX - startPos.x) * scaleX),
        height: Math.round(Math.abs(currentY - startPos.y) * scaleY),
      });
    },
    [isSelecting, startPos, screenshot]
  );

  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
  }, []);

  const handleSave = useCallback(() => {
    if (currentRegion && isValidRegion(currentRegion)) {
      onComplete(currentRegion);
    }
  }, [currentRegion, onComplete]);

  const isValidRegion = (region: CaptureRegion): boolean => {
    return region.width >= 80 && region.height >= 80;
  };

  const regionTooSmall = currentRegion && !isValidRegion(currentRegion);

  // Calculate display region for the selection box (convert back from screen coords to display coords)
  const getDisplayRegion = useCallback(() => {
    if (!currentRegion || !screenshot || !imageRef.current) return null;

    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = rect.width / screenshot.width;
    const scaleY = rect.height / screenshot.height;

    return {
      x: currentRegion.x * scaleX,
      y: currentRegion.y * scaleY,
      width: currentRegion.width * scaleX,
      height: currentRegion.height * scaleY,
    };
  }, [currentRegion, screenshot]);

  const displayRegion = getDisplayRegion();

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Preparing calibration...</p>
          <p className="text-gray-400 text-sm mt-2">
            Minimizing window to capture your screen.
            <br />
            Make sure {appName} is visible.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-white text-lg mb-2">{error}</p>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-white text-black rounded-lg font-medium mt-4"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Instructions header */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl p-4 max-w-lg z-10">
        <h3 className="font-semibold text-lg text-gray-900">
          Calibrate Self-View for {appName}
        </h3>
        <p className="text-gray-600 text-sm mt-2">
          Draw a box around your self-view preview in {appName}.
          This is typically in a corner of the meeting window.
        </p>
        <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
          <span className="px-2 py-0.5 bg-gray-100 rounded">Esc</span>
          <span>to cancel</span>
          <span className="px-2 py-0.5 bg-gray-100 rounded ml-2">Enter</span>
          <span>to save</span>
        </div>
      </div>

      {/* Screenshot as background with selection overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {screenshot && (
          <div className="relative">
            <img
              ref={imageRef}
              src={screenshot.dataUrl}
              alt="Desktop screenshot"
              className="max-w-full max-h-screen object-contain cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              draggable={false}
            />

            {/* Selection box overlay */}
            {displayRegion && (
              <div
                className={`absolute border-2 pointer-events-none ${
                  regionTooSmall
                    ? 'border-red-500 bg-red-500/20'
                    : 'border-blue-500 bg-blue-500/20'
                }`}
                style={{
                  left: displayRegion.x,
                  top: displayRegion.y,
                  width: displayRegion.width,
                  height: displayRegion.height,
                }}
              >
                {/* Corner handles */}
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-sm" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-sm" />
                <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-sm" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-sm" />

                {/* Dimensions label */}
                <div
                  className={`absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-xs font-mono whitespace-nowrap ${
                    regionTooSmall
                      ? 'bg-red-500 text-white'
                      : 'bg-blue-500 text-white'
                  }`}
                >
                  {currentRegion?.width} x {currentRegion?.height}
                  {regionTooSmall && ' (too small)'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-10">
        <button
          onClick={onCancel}
          className="px-5 py-2.5 bg-white text-gray-700 rounded-lg font-medium shadow-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!currentRegion || !!regionTooSmall}
          className="px-5 py-2.5 bg-black text-white rounded-lg font-medium shadow-lg hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save for {appName}
        </button>
      </div>

      {/* Privacy notice */}
      <div className="absolute bottom-6 right-6 max-w-xs text-right z-10">
        <p className="text-white/70 text-xs">
          Only this region will be captured.
          <br />
          No images are saved or transmitted.
        </p>
      </div>
    </div>
  );
}

/**
 * Status indicator for when meeting mode is active
 */
interface MeetingModeStatusProps {
  appName: string;
  onStop: () => void;
}

export function MeetingModeStatus({ appName, onStop }: MeetingModeStatusProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-lg text-sm">
      <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
      <span className="font-medium">Meeting Mode: {appName}</span>
      <button
        onClick={onStop}
        className="ml-1 p-1 hover:bg-purple-200 rounded transition-colors"
        title="Stop meeting mode"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
