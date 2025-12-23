'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { cn } from '../lib/utils';

export interface BlinkRateDataPoint {
  time: string;       // Display label (e.g., "10:30")
  timestamp: number;  // Unix timestamp
  blinkRate: number;
}

export interface BlinkRateChartProps {
  data: BlinkRateDataPoint[];
  baseline?: {
    p25: number;
    p50: number;
    p75: number;
  };
  height?: number;
  showGrid?: boolean;
  className?: string;
}

/**
 * Blink Rate Chart Component
 * Displays blink rate over time with optional baseline reference lines
 */
export function BlinkRateChart({
  data,
  baseline,
  height = 200,
  showGrid = true,
  className,
}: BlinkRateChartProps) {
  // Calculate y-axis domain
  const rates = data.map((d) => d.blinkRate);
  const maxRate = Math.max(...rates, baseline?.p75 ?? 20);
  const minRate = Math.min(...rates, baseline?.p25 ?? 5);
  const yMax = Math.ceil(maxRate * 1.1);
  const yMin = Math.max(0, Math.floor(minRate * 0.9));

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
          )}

          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />

          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            width={30}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--radius)',
              fontSize: 12,
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={(value) => [`${Number(value ?? 0).toFixed(1)} blinks/min`]}
          />

          {/* Baseline reference lines */}
          {baseline && (
            <>
              <ReferenceLine
                y={baseline.p25}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                strokeOpacity={0.5}
              />
              <ReferenceLine
                y={baseline.p50}
                stroke="#22c55e"
                strokeDasharray="5 5"
                strokeOpacity={0.5}
              />
              <ReferenceLine
                y={baseline.p75}
                stroke="#22c55e"
                strokeDasharray="5 5"
                strokeOpacity={0.3}
              />
            </>
          )}

          <Line
            type="monotone"
            dataKey="blinkRate"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      {baseline && (
        <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-amber-500" /> Low threshold
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-green-500" /> Your baseline
          </span>
        </div>
      )}
    </div>
  );
}
