'use client';

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

interface DataPoint {
  date: string;
  blinkRate: number;
}

interface BlinkRateTrendChartProps {
  data: DataPoint[];
  height?: number;
  showHealthyRange?: boolean;
}

export function BlinkRateTrendChart({
  data,
  height = 300,
  showHealthyRange = true,
}: BlinkRateTrendChartProps) {
  // If no data, show placeholder
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-secondary/30 rounded-lg"
        style={{ height }}
      >
        <p className="text-muted-foreground">No data available yet</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          stroke="#9ca3af"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#9ca3af"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          domain={[0, 30]}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '8px 12px',
          }}
          labelStyle={{ fontWeight: 500 }}
          formatter={(value) => [`${Number(value ?? 0).toFixed(1)}/min`, 'Blink Rate']}
        />
        {showHealthyRange && (
          <>
            {/* Healthy range indicator (15-20 blinks/min) */}
            <ReferenceLine
              y={15}
              stroke="#22c55e"
              strokeDasharray="5 5"
              label={{ value: 'Min Healthy', fill: '#22c55e', fontSize: 10 }}
            />
            <ReferenceLine
              y={20}
              stroke="#22c55e"
              strokeDasharray="5 5"
              label={{ value: 'Max Healthy', fill: '#22c55e', fontSize: 10 }}
            />
          </>
        )}
        <Line
          type="monotone"
          dataKey="blinkRate"
          stroke="#000"
          strokeWidth={2}
          dot={{ fill: '#000', r: 3 }}
          activeDot={{ r: 5, fill: '#000' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
