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
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {suffix && <span className="text-muted-foreground/70">{suffix}</span>}
      </div>
      {subtext && (
        <p className={`text-sm mt-1 flex items-center gap-1 ${
          trend === 'up' ? 'text-green-600 dark:text-green-400' : trend === 'down' ? 'text-yellow-600 dark:text-yellow-400' : 'text-muted-foreground'
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
