'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface DataPoint {
  name: string;
  score: number;
  blinkRate: number;
}

interface DepartmentComparisonChartProps {
  data: DataPoint[];
  height?: number;
  metric?: 'score' | 'blinkRate';
}

export function DepartmentComparisonChart({
  data,
  height = 300,
  metric = 'score',
}: DepartmentComparisonChartProps) {
  // If no data, show placeholder
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-secondary/30 rounded-lg"
        style={{ height }}
      >
        <p className="text-muted-foreground">No department data available</p>
      </div>
    );
  }

  // Color based on value
  const getBarColor = (value: number, isScore: boolean) => {
    if (isScore) {
      if (value >= 80) return '#22c55e'; // green
      if (value >= 60) return '#eab308'; // yellow
      return '#ef4444'; // red
    } else {
      // Blink rate - healthy is 15-20
      if (value >= 15 && value <= 20) return '#22c55e';
      if (value >= 10 && value <= 25) return '#eab308';
      return '#ef4444';
    }
  };

  const dataKey = metric === 'score' ? 'score' : 'blinkRate';
  const label = metric === 'score' ? 'Wellness Score' : 'Blink Rate';
  const domain = metric === 'score' ? [0, 100] : [0, 30];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 10, right: 30, left: 80, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
        <XAxis
          type="number"
          stroke="#9ca3af"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          domain={domain}
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke="#9ca3af"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={70}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '8px 12px',
          }}
          labelStyle={{ fontWeight: 500 }}
          formatter={(value: number) => [
            metric === 'score' ? `${value}/100` : `${value}/min`,
            label,
          ]}
        />
        <Bar dataKey={dataKey} radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getBarColor(entry[dataKey], metric === 'score')}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
