'use client';

import React, { useEffect, useRef, useState } from 'react';
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

export interface EarDataPoint {
  timestamp: number;
  ear: number;
  isBlink?: boolean;
  phase?: 'open' | 'closing' | 'closed' | 'opening';
  /** Rate of change of EAR (for slope visualization) */
  slope?: number;
}

export interface EarWaveformProps {
  /** Current EAR data point to add */
  currentData?: EarDataPoint;
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
}

/**
 * Real-time EAR (Eye Aspect Ratio) Waveform Component
 * Displays a scrolling waveform like an ECG/heart monitor for eye data
 */
export function EarWaveform({
  currentData,
  windowSize = 150, // ~5 seconds at 30fps
  threshold = 0.21,
  height = 120,
  showThreshold = true,
  showBlinkMarkers = true,
  className,
}: EarWaveformProps) {
  const [data, setData] = useState<EarDataPoint[]>([]);
  const [blinkPositions, setBlinkPositions] = useState<number[]>([]);
  const lastTimestampRef = useRef<number>(0);

  // Add new data point when currentData changes
  useEffect(() => {
    if (!currentData || currentData.timestamp === lastTimestampRef.current) {
      return;
    }
    lastTimestampRef.current = currentData.timestamp;

    setData((prev) => {
      const newData = [...prev, currentData];
      // Keep only the last windowSize points
      if (newData.length > windowSize) {
        return newData.slice(-windowSize);
      }
      return newData;
    });

    // Track blink positions for markers
    if (currentData.isBlink) {
      setBlinkPositions((prev) => {
        const newPositions = [...prev, currentData.timestamp];
        // Keep only recent blinks
        return newPositions.slice(-10);
      });
    }
  }, [currentData, windowSize]);

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
            <span className="text-xs text-gray-500 uppercase tracking-wide">
              {currentPhase || 'waiting'}
            </span>
          </div>
          <span className="text-sm font-mono font-medium">
            EAR: {currentEar.toFixed(3)}
          </span>
        </div>
        {showBlinkMarkers && blinkPositions.length > 0 && (
          <span className="text-xs text-gray-400">
            Last blink: {Math.round((Date.now() - blinkPositions[blinkPositions.length - 1]) / 1000)}s ago
          </span>
        )}
      </div>

      {/* Waveform chart */}
      <div className="bg-gray-900 rounded-lg p-2 relative overflow-hidden">
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
            className="flex items-center justify-center text-gray-500 text-sm"
            style={{ height }}
          >
            <span className="animate-pulse">Waiting for data...</span>
          </div>
        )}

        {/* Blink flash effect */}
        {currentData?.isBlink && (
          <div className="absolute inset-0 bg-green-500/20 animate-ping pointer-events-none" />
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-400">
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
}
