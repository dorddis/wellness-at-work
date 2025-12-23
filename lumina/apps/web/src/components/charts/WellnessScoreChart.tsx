'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface DataPoint {
  date: string;
  score: number;
}

interface WellnessScoreChartProps {
  data: DataPoint[];
  height?: number;
}

export function WellnessScoreChart({
  data,
  height = 300,
}: WellnessScoreChartProps) {
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

  // Custom gradient
  const gradientOffset = () => {
    const dataMax = Math.max(...data.map((d) => d.score));
    const dataMin = Math.min(...data.map((d) => d.score));
    if (dataMax <= 0) return 0;
    if (dataMin >= 0) return 1;
    return dataMax / (dataMax - dataMin);
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#000" stopOpacity={0.1} />
            <stop offset="95%" stopColor="#000" stopOpacity={0} />
          </linearGradient>
        </defs>
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
          domain={[0, 100]}
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
          formatter={(value) => [`${value ?? 0}/100`, 'Wellness Score']}
        />
        {/* Good threshold */}
        <ReferenceLine
          y={70}
          stroke="#22c55e"
          strokeDasharray="5 5"
          label={{ value: 'Good', fill: '#22c55e', fontSize: 10, position: 'right' }}
        />
        <Area
          type="monotone"
          dataKey="score"
          stroke="#000"
          strokeWidth={2}
          fill="url(#colorScore)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
