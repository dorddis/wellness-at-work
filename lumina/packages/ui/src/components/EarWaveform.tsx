'use client';

import React, { useMemo, memo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import { cn } from '../lib/utils';
import { useSessionStore, EarDataPoint } from '../stores/sessionStore';

// Re-export for backward compatibility
export type { EarDataPoint };

export interface EarWaveformProps {
  /** Number of data points to display (window size) */
  windowSize?: number;
  /** EAR threshold for blink detection */
  threshold?: number;
  /** Height of the chart */
  height?: number;
  /** Show threshold line */
  showThreshold?: boolean;
  /** Show blink markers */
  showBlinkMarkers?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Pause rendering updates when not visible (performance optimization) */
  paused?: boolean;
  /** Display slope values instead of EAR values (for rate-of-change visualization) */
  useSlope?: boolean;
}

/**
 * Real-time EAR (Eye Aspect Ratio) Waveform Component
 * Displays a scrolling waveform like an ECG/heart monitor for eye data
 *
 * Data is read from the Zustand sessionStore, which persists across navigation.
 * Use the paused prop to skip rendering when the component is not visible.
 *
 * Memoized to prevent unnecessary re-renders from parent component updates.
 */
export const EarWaveform = memo(function EarWaveform({
  windowSize = 150, // ~5 seconds at 30fps
  threshold = 0.21,
  height = 120,
  showThreshold = true,
  showBlinkMarkers = true,
  className,
  paused = false,
  useSlope = false,
}: EarWaveformProps) {
  // Subscribe to update counter (triggers re-render when new data arrives)
  // This is throttled to ~10 updates/sec instead of 30 for performance
  const updateCounter = useSessionStore((state) => state.waveformUpdateCounter);
  const getWaveformData = useSessionStore((state) => state.getWaveformData);
  const getBlinkPositions = useSessionStore((state) => state.getBlinkPositions);

  // Read data from circular buffer (O(n) reconstruction, but only on UI updates)
  // useMemo ensures we only reconstruct when updateCounter changes
  const rawData = useMemo(() => {
    if (paused) return [];
    const data = getWaveformData();
    return data.slice(-windowSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, updateCounter, windowSize]);

  const blinkPositions = useMemo(() => {
    if (paused) return [];
    return getBlinkPositions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, updateCounter]);

  // If useSlope is true, map slope values to ear field for chart display
  const data = useSlope
    ? rawData.map((d) => ({ ...d, ear: d.slope ?? 0 }))
    : rawData;

  // Calculate y-axis domain with padding
  const earValues = data.map((d) => d.ear);
  const minEar = Math.min(...earValues, threshold - 0.05);
  const maxEar = Math.max(...earValues, threshold + 0.15);
  const yMin = Math.max(0, minEar - 0.02);
  const yMax = maxEar + 0.02;

  // Get current phase for status indicator
  const currentPhase = data.length > 0 ? data[data.length - 1].phase : 'open';
  const currentEar = data.length > 0 ? data[data.length - 1].ear : 0;

  // Phase colors
  const phaseColors: Record<string, string> = {
    open: 'text-green-500',
    closing: 'text-yellow-500',
    closed: 'text-red-500',
    opening: 'text-blue-500',
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Header with current values */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                'w-2 h-2 rounded-full animate-pulse',
                currentPhase === 'open'
                  ? 'bg-green-500'
                  : currentPhase === 'closed'
                    ? 'bg-red-500'
                    : 'bg-yellow-500'
              )}
            />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              {currentPhase || 'waiting'}
            </span>
          </div>
          <span className="text-sm font-mono font-medium">
            EAR: {currentEar.toFixed(3)}
          </span>
        </div>
        {showBlinkMarkers && blinkPositions.length > 0 && (
          <span className="text-xs text-muted-foreground/70">
            Last blink: {Math.round((Date.now() - blinkPositions[blinkPositions.length - 1]) / 1000)}s ago
          </span>
        )}
      </div>

      {/* Waveform chart */}
      <div className="bg-foreground rounded-lg p-2 relative overflow-hidden">
        {/* Scanline effect overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-5">
          <div
            className="absolute inset-0"
            style={{
              background:
                'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
            }}
          />
        </div>

        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart
              data={data}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              {/* Danger zone below threshold */}
              {showThreshold && (
                <ReferenceArea
                  y1={yMin}
                  y2={threshold}
                  fill="#ef4444"
                  fillOpacity={0.1}
                />
              )}

              <XAxis dataKey="timestamp" hide />

              <YAxis
                domain={[yMin, yMax]}
                hide
                tick={false}
                axisLine={false}
              />

              {/* Threshold line */}
              {showThreshold && (
                <ReferenceLine
                  y={threshold}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
              )}

              {/* Main EAR line */}
              <Line
                type="monotone"
                dataKey="ear"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div
            className="flex items-center justify-center text-muted-foreground/70 text-sm"
            style={{ height }}
          >
            <span className="animate-pulse">Waiting for data...</span>
          </div>
        )}

        {/* Blink flash effect - check if latest point is a blink */}
        {data.length > 0 && data[data.length - 1]?.isBlink && (
          <div className="absolute inset-0 bg-green-500/20 animate-ping pointer-events-none" />
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground/70">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-green-500 rounded" /> EAR Signal
        </span>
        {showThreshold && (
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-red-500 opacity-50" style={{ borderStyle: 'dashed' }} /> Blink Threshold
          </span>
        )}
      </div>
    </div>
  );
});
