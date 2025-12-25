import React from 'react';
import { Icons } from './Icons';

export interface StatCardProps {
  label: string;
  value: string;
  suffix?: string;
  subtext?: string;
  trend?: 'up' | 'down';
}

/**
 * Statistic card component for displaying metrics with optional trend indicator
 */
export function StatCard({
  label,
  value,
  suffix,
  subtext,
  trend,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">{value}</span>
        {suffix && <span className="text-gray-400">{suffix}</span>}
      </div>
      {subtext && (
        <p className={`text-sm mt-1 flex items-center gap-1 ${
          trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-yellow-600' : 'text-gray-500'
        }`}>
          {trend === 'up' && <Icons.TrendUp />}
          {trend === 'down' && <Icons.TrendDown />}
          {subtext}
        </p>
      )}
    </div>
  );
}

export default StatCard;
