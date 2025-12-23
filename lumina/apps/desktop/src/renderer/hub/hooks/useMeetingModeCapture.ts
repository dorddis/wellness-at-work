/**
 * Meeting Mode Screen Capture Hook
 * Handles screen capture for meeting mode blink detection
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useMeetingModeStore, type CaptureRegion } from '@lumina/ui';

interface UseMeetingModeCaptureResult {
  /** Video element ref for screen capture stream */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Canvas element ref for cropping region */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Whether screen capture is currently active */
  isCapturing: boolean;
  /** Last error message, if any */
  error: string | null;
  /** Start capture - uses window capture when appName provided, otherwise screen capture */
  startCapture: (appName?: string, displayId?: number) => Promise<boolean>;
  /** Stop screen capture */
  stopCapture: () => void;
  /** Get cropped frame from the capture region */
  getCroppedCanvas: (region: CaptureRegion) => HTMLCanvasElement | null;
}

/**
 * Hook for managing screen capture in meeting mode
 * Provides video stream from screen and cropping utilities
 */
export function useMeetingModeCapture(): UseMeetingModeCaptureResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setActive, setError: setStoreError } = useMeetingModeStore();

  /**
   * Start capture for meeting mode
   * Uses window capture when appName is provided (coordinates match calibration)
   * Falls back to screen capture if window not found or appName not provided
   */
  const startCapture = useCallback(async (appName?: string, displayId?: number): Promise<boolean> => {
    try {
      setError(null);

      let sourceId: string | null = null;
      let isWindowCapture = false;

      // Try window capture first when appName is provided
      // This ensures coordinates match between calibration and capture
      if (appName) {
        console.log('[MeetingCapture] Trying window capture for:', appName);
        sourceId = await window.lumina.meetingMode.getWindowSourceId(appName);
        if (sourceId) {
          isWindowCapture = true;
          console.log('[MeetingCapture] Using window capture, sourceId:', sourceId);
        } else {
          console.log('[MeetingCapture] Window not found, falling back to screen capture');
        }
      }

      // Fall back to screen capture
      if (!sourceId) {
        sourceId = await window.lumina.meetingMode.getSourceId(displayId);
        console.log('[MeetingCapture] Using screen capture, sourceId:', sourceId);
      }

      if (!sourceId) {
        const message = 'Could not get capture source';
        setError(message);
        setStoreError(message);
        return false;
      }

      // Request capture stream using Electron's chromeMediaSource
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          // @ts-ignore - Electron-specific constraints
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            // Capture at reasonable resolution
            minWidth: 1280,
            maxWidth: 3840,
            minHeight: 720,
            maxHeight: 2160,
          },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCapturing(true);
      console.log('[MeetingCapture] Capture started, isWindowCapture:', isWindowCapture);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start capture';
      setError(message);
      setStoreError(message);
      setIsCapturing(false);
      return false;
    }
  }, [setStoreError]);

  /**
   * Stop screen capture and release resources
   */
  const stopCapture = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCapturing(false);
    setActive(false);
  }, [setActive]);

  /**
   * Get the cropped canvas for a specific region
   * Used to extract the self-view area for MediaPipe processing
   */
  const getCroppedCanvas = useCallback((region: CaptureRegion): HTMLCanvasElement | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !isCapturing) {
      return null;
    }

    // Ensure video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }

    // Set canvas size to region size
    canvas.width = region.width;
    canvas.height = region.height;

    // Draw the cropped region from video to canvas
    ctx.drawImage(
      video,
      region.x,
      region.y,
      region.width,
      region.height,
      0,
      0,
      region.width,
      region.height
    );

    return canvas;
  }, [isCapturing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    isCapturing,
    error,
    startCapture,
    stopCapture,
    getCroppedCanvas,
  };
}

/**
 * Hook for polling meeting app detection
 * Automatically detects when user joins/leaves a meeting
 */
export function useMeetingDetection(
  onMeetingStart: (appName: string) => void,
  onMeetingEnd: () => void,
  intervalMs: number = 30000
) {
  const { enabled, autoDetect } = useMeetingModeStore();
  const lastDetectedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !autoDetect) {
      return;
    }

    const checkMeeting = async () => {
      try {
        const result = await window.lumina.meetingMode.detectApp();

        if (result.isDetected && result.appName) {
          // Meeting started or continues
          if (lastDetectedRef.current !== result.appName) {
            lastDetectedRef.current = result.appName;
            onMeetingStart(result.appName);
          }
        } else {
          // No meeting detected
          if (lastDetectedRef.current !== null) {
            lastDetectedRef.current = null;
            onMeetingEnd();
          }
        }
      } catch (err) {
        console.error('[MeetingMode] Detection error:', err);
      }
    };

    // Initial check
    checkMeeting();

    // Set up interval
    const interval = setInterval(checkMeeting, intervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [enabled, autoDetect, intervalMs, onMeetingStart, onMeetingEnd]);
}
