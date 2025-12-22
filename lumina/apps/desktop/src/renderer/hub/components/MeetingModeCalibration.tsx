/**
 * MeetingModeCalibration Component
 * Allows users to select the self-view region for meeting mode
 * Full-screen overlay with drag-to-select functionality
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useMeetingModeStore, type CaptureRegion } from '@lumina/ui';

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

/**
 * Full-screen overlay for selecting self-view region
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
  const overlayRef = useRef<HTMLDivElement>(null);

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

    setIsSelecting(true);
    const rect = overlayRef.current?.getBoundingClientRect();
    if (rect) {
      setStartPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      // Reset region on new selection
      setCurrentRegion(null);
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelecting || !overlayRef.current) return;

      const rect = overlayRef.current.getBoundingClientRect();
      const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

      setCurrentRegion({
        x: Math.round(Math.min(startPos.x, currentX)),
        y: Math.round(Math.min(startPos.y, currentY)),
        width: Math.round(Math.abs(currentX - startPos.x)),
        height: Math.round(Math.abs(currentY - startPos.y)),
      });
    },
    [isSelecting, startPos]
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

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
      {/* Instructions header */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl p-5 max-w-md">
        <h3 className="font-semibold text-lg text-gray-900">
          Calibrate Self-View for {appName}
        </h3>
        <p className="text-gray-600 text-sm mt-2">
          Draw a box around your self-view preview in the meeting app.
          This area will be captured for eye tracking.
        </p>
        <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
          <span className="px-2 py-0.5 bg-gray-100 rounded">Esc</span>
          <span>to cancel</span>
          <span className="px-2 py-0.5 bg-gray-100 rounded ml-2">Enter</span>
          <span>to save</span>
        </div>
      </div>

      {/* Selection overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Current selection box */}
        {currentRegion && (
          <>
            {/* Selection rectangle */}
            <div
              className={`absolute border-2 ${
                regionTooSmall
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-blue-500 bg-blue-500/10'
              } transition-colors`}
              style={{
                left: currentRegion.x,
                top: currentRegion.y,
                width: currentRegion.width,
                height: currentRegion.height,
              }}
            >
              {/* Corner handles */}
              <div className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-sm" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-sm" />
              <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-sm" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-sm" />

              {/* Dimensions label */}
              <div
                className={`absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-xs font-mono ${
                  regionTooSmall
                    ? 'bg-red-500 text-white'
                    : 'bg-blue-500 text-white'
                }`}
              >
                {currentRegion.width} x {currentRegion.height}
                {regionTooSmall && ' (too small)'}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
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
      <div className="absolute bottom-6 right-6 max-w-xs text-right">
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
