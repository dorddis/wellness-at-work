'use client';

/**
 * CameraStep Component
 * Camera selection with live preview
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';

export interface CameraStepProps {
  onNext: (selectedCameraId: string) => void;
  onBack: () => void;
  hasPermission: boolean;
}

interface CameraDevice {
  deviceId: string;
  label: string;
}

export function CameraStep({ onNext, onBack, hasPermission }: CameraStepProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(hasPermission);

  // Request permission and enumerate cameras
  useEffect(() => {
    async function initCameras() {
      try {
        setIsLoading(true);
        setError(null);

        // Request camera access to get labels
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        setPermissionGranted(true);

        // Enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices
          .filter(d => d.kind === 'videoinput')
          .map((d, i) => ({
            deviceId: d.deviceId,
            label: d.label || `Camera ${i + 1}`,
          }));

        setCameras(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedCameraId(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error('Camera init error:', err);
        setError('Camera access denied. Please allow camera access to continue.');
      } finally {
        setIsLoading(false);
      }
    }

    initCameras();

    return () => {
      // Cleanup stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Start preview when camera is selected
  useEffect(() => {
    async function startPreview() {
      if (!selectedCameraId || !videoRef.current) return;

      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedCameraId } },
        });
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
      } catch (err) {
        console.error('Preview error:', err);
      }
    }

    startPreview();
  }, [selectedCameraId]);

  const handleContinue = () => {
    // Stop preview stream before continuing
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    onNext(selectedCameraId);
  };

  return (
    <div className="h-full flex flex-col px-8 py-6">
      <div className="flex-1 flex flex-col items-center justify-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-foreground mb-2"
        >
          Select Your Camera
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground mb-6 text-center max-w-md"
        >
          Choose the camera you want to use for wellness tracking.
          All processing happens locally on your device.
        </motion.p>

        {/* Camera preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative w-full max-w-md aspect-video bg-foreground rounded-xl overflow-hidden mb-4"
        >
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <svg className="w-12 h-12 text-red-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-white text-sm">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 px-4 py-2 bg-card/10 hover:bg-card/20 rounded-lg text-white text-sm transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Privacy indicator */}
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-white font-medium">Local only</span>
              </div>
            </>
          )}
        </motion.div>

        {/* Camera selector */}
        {cameras.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-md mb-4"
          >
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Camera
            </label>
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="w-full px-4 py-3 bg-secondary border-0 rounded-lg text-foreground focus:ring-2 focus:ring-foreground focus:outline-none"
            >
              {cameras.map((camera) => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label}
                </option>
              ))}
            </select>
          </motion.div>
        )}

        {/* Single camera message */}
        {cameras.length === 1 && !isLoading && !error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-muted-foreground mb-4"
          >
            Using: {cameras[0].label}
          </motion.p>
        )}

        {/* What we detect - compact */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-6 text-sm text-muted-foreground"
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Blinks
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Posture
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            No recording
          </span>
        </motion.div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex-1 py-3 px-6 bg-secondary text-foreground/80 rounded-lg font-medium hover:bg-muted transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!permissionGranted || cameras.length === 0}
          className="flex-1 py-3 px-6 bg-foreground text-background rounded-lg font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export default CameraStep;
