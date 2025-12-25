import React, { useRef, useEffect } from 'react';
import { EarWaveform, Select, type SelectOption } from '@lumina/ui';
import { Icons } from '../components';

export interface MonitorViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  meetingVideoRef: React.RefObject<HTMLVideoElement | null>;
  meetingCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  isDetecting: boolean;
  faceDetected: boolean;
  blinkCount: number;
  blinkRate: number;
  wellnessScore: number;
  onToggleDetection: () => void;
  onReset: () => void;
  meetingModeActive?: boolean;
  meetingAppName?: string | null;
  cameras?: MediaDeviceInfo[];
  selectedCameraId?: string;
  onCameraChange?: (cameraId: string) => void;
}

/**
 * Monitor View - real-time camera view with detection status
 * Note: EarWaveform now reads from Zustand store, no need to pass currentEarData
 */
export function MonitorView({
  videoRef,
  meetingVideoRef,
  meetingCanvasRef,
  isDetecting,
  faceDetected,
  blinkCount,
  blinkRate,
  wellnessScore,
  onToggleDetection,
  onReset,
  meetingModeActive = false,
  meetingAppName = null,
  cameras = [],
  selectedCameraId = '',
  onCameraChange,
}: MonitorViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw video/cropped canvas to visible canvas
  // Priority: camera video > meeting canvas > meeting video > nothing (keep last frame)
  useEffect(() => {
    if (!isDetecting || !canvasRef.current) {
      return;
    }

    const cameraVideo = videoRef.current;
    const meetingVideo = meetingVideoRef.current;
    const meetingCanvas = meetingCanvasRef.current;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    let animationFrameId: number;
    const draw = () => {
      // Priority 1: Camera video when ready (normal mode, or transitioning from meeting)
      if (!meetingModeActive && cameraVideo && cameraVideo.readyState >= 2 && cameraVideo.videoWidth > 0) {
        canvas.width = cameraVideo.videoWidth;
        canvas.height = cameraVideo.videoHeight;
        ctx.drawImage(cameraVideo, 0, 0);
      }
      // Priority 2: Meeting mode with cropped canvas (active meeting mode)
      else if (meetingModeActive && meetingCanvas && meetingCanvas.width > 0 && meetingCanvas.height > 0) {
        canvas.width = meetingCanvas.width;
        canvas.height = meetingCanvas.height;
        ctx.drawImage(meetingCanvas, 0, 0);
      }
      // Priority 3: Fallback to meeting canvas during transition (camera not ready yet)
      else if (!meetingModeActive && meetingCanvas && meetingCanvas.width > 0 && meetingCanvas.height > 0) {
        // Keep showing meeting canvas while camera is starting
        canvas.width = meetingCanvas.width;
        canvas.height = meetingCanvas.height;
        ctx.drawImage(meetingCanvas, 0, 0);
      }
      // Priority 4: Meeting video directly (if no cropped canvas available)
      else if (meetingModeActive && meetingVideo && meetingVideo.readyState >= 2 && meetingVideo.videoWidth > 0) {
        canvas.width = meetingVideo.videoWidth;
        canvas.height = meetingVideo.videoHeight;
        ctx.drawImage(meetingVideo, 0, 0);
      }
      // If nothing is ready, keep the last frame (don't draw)

      // Continue draw loop while detecting
      if (isDetecting) {
        animationFrameId = requestAnimationFrame(draw);
      }
    };
    draw();

    // Cleanup: Cancel animation frame when effect re-runs or unmounts
    // This prevents multiple draw loops from running simultaneously
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isDetecting, videoRef, meetingVideoRef, meetingCanvasRef, meetingModeActive]);

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera view */}
        <div className="lg:col-span-2">
          <div className="bg-black rounded-xl overflow-hidden aspect-video relative">
            {isDetecting ? (
              <canvas ref={canvasRef} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/60">
                <div className="text-center">
                  <Icons.Camera />
                  <p className="mt-2">Camera paused</p>
                </div>
              </div>
            )}

            {/* Overlay indicators */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isDetecting ? (faceDetected ? 'bg-green-500' : 'bg-yellow-500') : 'bg-gray-500'}`} />
              <span className="text-white text-sm bg-black/50 px-2 py-1 rounded">
                {isDetecting ? (faceDetected ? 'Detecting' : 'No face') : 'Paused'}
              </span>
            </div>

            {/* Meeting mode indicator */}
            {meetingModeActive && (
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-purple-600/90 px-3 py-1.5 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-white text-sm font-medium">
                  Meeting Mode: {meetingAppName || 'Active'}
                </span>
              </div>
            )}

            <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-2 rounded-lg">
              <span className="text-white text-lg font-bold">Blinks: {blinkCount}</span>
            </div>
          </div>

          {/* Camera selection dropdown - only when not in meeting mode and cameras available */}
          {!meetingModeActive && cameras.length > 1 && onCameraChange && (
            <div className="mt-4">
              <Select
                label="Camera"
                options={cameras.map((camera, index): SelectOption => ({
                  value: camera.deviceId,
                  label: camera.label || `Camera ${index + 1}`,
                }))}
                value={selectedCameraId || cameras[0]?.deviceId || ''}
                onChange={onCameraChange}
                placeholder="Select camera..."
              />
            </div>
          )}

          {/* Start/Stop button */}
          <button
            onClick={onToggleDetection}
            className={`w-full mt-4 py-3 rounded-lg font-medium transition-colors ${
              isDetecting
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}
          >
            {isDetecting ? 'Stop Detection' : 'Start Detection'}
          </button>

          {/* Reset button - troubleshooting for video issues */}
          <button
            onClick={onReset}
            className="w-full mt-2 py-2 rounded-lg text-sm font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
          >
            Video not showing correctly? Click to reset
          </button>

          {/* EAR Waveform - Real-time eye signal visualization */}
          {/* Data now persists in Zustand store across navigation */}
          <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Eye Signal (EAR)</h3>
              <span className="text-xs text-gray-400">Eye Aspect Ratio over time</span>
            </div>
            <EarWaveform
              windowSize={150}
              threshold={0.21}
              height={100}
              showThreshold={true}
              showBlinkMarkers={true}
            />
          </div>

          {/* Slope Waveform - Rate of change visualization */}
          <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Eye Movement (Slope)</h3>
              <span className="text-xs text-gray-400">Rate of change - dips show blinks</span>
            </div>
            <EarWaveform
              windowSize={150}
              threshold={0}
              height={80}
              showThreshold={true}
              showBlinkMarkers={false}
              useSlope={true}
            />
          </div>
        </div>

        {/* Stats panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500 mb-1">Wellness Score</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{wellnessScore}</span>
              <span className="text-gray-400">/100</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500 mb-1">Blink Rate</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{blinkRate.toFixed(1)}</span>
              <span className="text-gray-400">/min</span>
            </div>
            <p className={`text-sm mt-1 ${blinkRate >= 15 ? 'text-green-600' : 'text-yellow-600'}`}>
              {blinkRate >= 15 ? 'Great job!' : 'Eyes working hard'}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500 mb-1">Status</p>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="font-medium">{faceDetected ? 'Face Detected' : 'No Face'}</span>
            </div>
          </div>

          <div className="bg-gray-100 rounded-xl p-4 text-sm text-gray-600">
            <p className="font-medium mb-2">Detection Info</p>
            <p>Algorithm: Multi-stage adaptive</p>
            <p>Frame Rate: 30 FPS</p>
            <p>Processing: GPU</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MonitorView;
