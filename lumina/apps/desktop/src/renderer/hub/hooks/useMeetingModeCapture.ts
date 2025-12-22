/**
 * Meeting Mode Screen Capture Hook
 * Handles screen capture for meeting mode blink detection
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useMeetingModeStore, type CaptureRegion } from '@lumina/ui';

interface UseMeetingModeCaptureResult {
  /** Video element ref for screen capture stream */
  videoRef: React.RefObject<HTMLVideoElement>;
  /** Canvas element ref for cropping region */
  canvasRef: React.RefObject<HTMLCanvasElement>;
  /** Whether screen capture is currently active */
  isCapturing: boolean;
  /** Last error message, if any */
  error: string | null;
  /** Start screen capture for a display */
  startCapture: (displayId?: number) => Promise<boolean>;
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
   * Start screen capture for the specified display
   * Uses Electron's desktopCapturer via getUserMedia
   */
  const startCapture = useCallback(async (displayId?: number): Promise<boolean> => {
    try {
      setError(null);

      // Get the source ID for the display
      const sourceId = await window.lumina.meetingMode.getSourceId(displayId);

      if (!sourceId) {
        const message = 'Could not get screen capture source';
        setError(message);
        setStoreError(message);
        return false;
      }

      // Request screen capture stream using Electron's chromeMediaSource
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
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start screen capture';
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
