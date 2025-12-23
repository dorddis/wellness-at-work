/**
 * MeetingModeCalibration Component
 * Allows users to select the self-view region for meeting mode
 * Shows a screenshot of the desktop so user can select the meeting app's self-view
 * Supports auto-detection using face detection + edge snapping
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { type CaptureRegion } from '@lumina/ui';
import { autoDetectSelfView, type DetectedRegion } from '../utils/smartDetection';

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
  /** Pre-captured screenshot (captured before window focus to avoid covering the meeting) */
  preCapturedScreenshot?: {
    dataUrl: string;
    width: number;
    height: number;
    scaleFactor: number;
  } | null;
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
  preCapturedScreenshot,
}: MeetingModeCalibrationProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentRegion, setCurrentRegion] = useState<CaptureRegion | null>(
    existingRegion ?? null
  );
  const [screenshot, setScreenshot] = useState<ScreenshotData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [autoDetectResult, setAutoDetectResult] = useState<DetectedRegion | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Use pre-captured screenshot if available, otherwise capture on mount
  // Pre-captured screenshot is taken BEFORE window focus to avoid covering the meeting
  useEffect(() => {
    async function captureScreen() {
      try {
        setIsLoading(true);
        setError(null);

        // Use pre-captured screenshot if available (captured before window was focused)
        if (preCapturedScreenshot) {
          console.log('[Calibration] Using pre-captured screenshot');
          setScreenshot(preCapturedScreenshot);
          setIsLoading(false);
          return;
        }

        // Fallback: capture now (meeting may be covered by this window)
        console.log('[Calibration] No pre-captured screenshot, capturing now...');

        // Small delay to ensure any UI transitions are complete
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Capture the screenshot (meeting app should already be visible)
        const result = await window.lumina.meetingMode.captureScreenshot();

        if (result) {
          setScreenshot(result);
        } else {
          setError('Failed to capture screen. Please try again.');
        }
      } catch (err) {
        console.error('[Calibration] Screenshot error:', err);
        setError('Failed to capture screen. Please check permissions.');
      } finally {
        setIsLoading(false);
      }
    }

    captureScreen();
  }, [preCapturedScreenshot]);

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
    // Reset region and auto-detect result on new manual selection
    setCurrentRegion(null);
    setAutoDetectResult(null);
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

  // Auto-detect self-view using face detection + edge snapping
  const handleAutoDetect = useCallback(async () => {
    if (!screenshot) return;

    setIsAutoDetecting(true);
    setAutoDetectResult(null);

    try {
      const result = await autoDetectSelfView(
        screenshot.dataUrl,
        screenshot.width,
        screenshot.height
      );

      if (result) {
        setAutoDetectResult(result);
        // Apply the detected region
        setCurrentRegion({
          x: result.x,
          y: result.y,
          width: result.width,
          height: result.height,
        });
      } else {
        // No face detected - show message
        setError('Could not detect your face. Please draw the region manually.');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error('[Calibration] Auto-detect error:', err);
      setError('Auto-detection failed. Please draw the region manually.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsAutoDetecting(false);
    }
  }, [screenshot]);

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
          {autoDetectResult
            ? `Auto-detected with ${Math.round(autoDetectResult.confidence * 100)}% confidence. Adjust if needed.`
            : 'Click "Auto-detect" or draw a box around your self-view preview.'}
        </p>
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={handleAutoDetect}
            disabled={isAutoDetecting}
            className="px-3 py-1.5 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
          >
            {isAutoDetecting ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Detecting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Auto-detect
              </>
            )}
          </button>
          <span className="text-xs text-gray-400">or draw manually</span>
        </div>
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
                    : autoDetectResult
                      ? 'border-green-500 bg-green-500/20'
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
                <div className={`absolute -top-1 -left-1 w-3 h-3 bg-white border-2 rounded-sm ${autoDetectResult ? 'border-green-500' : 'border-blue-500'}`} />
                <div className={`absolute -top-1 -right-1 w-3 h-3 bg-white border-2 rounded-sm ${autoDetectResult ? 'border-green-500' : 'border-blue-500'}`} />
                <div className={`absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 rounded-sm ${autoDetectResult ? 'border-green-500' : 'border-blue-500'}`} />
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 rounded-sm ${autoDetectResult ? 'border-green-500' : 'border-blue-500'}`} />

                {/* Auto-detect badge */}
                {autoDetectResult && (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-green-500 text-white rounded text-xs font-medium whitespace-nowrap flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Auto-detected
                  </div>
                )}

                {/* Dimensions label */}
                <div
                  className={`absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-xs font-mono whitespace-nowrap ${
                    regionTooSmall
                      ? 'bg-red-500 text-white'
                      : autoDetectResult
                        ? 'bg-green-500 text-white'
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
          className="px-5 py-2.5 bg-gray-800 text-white rounded-lg font-medium shadow-lg hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
