import React, { useState, useEffect } from 'react';
import { HistorySkeleton, Icons } from '../components';
import type { DailyData } from '../types';
import { DatabaseService } from '../services';

/**
 * History View - displays blink tracking history and stats
 */
export function HistoryView() {
  const [stats, setStats] = useState<{
    totalBlinks: number;
    avgEar: number;
    minuteCount: number;
  } | null>(null);
  const [weeklyData, setWeeklyData] = useState<DailyData[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Load today's stats
      const result = await DatabaseService.getSessionStats(today.getTime());
      if (result) {
        setStats(result);
      }

      // Load last 7 days of data
      const days: DailyData[] = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(today);
        dayStart.setDate(dayStart.getDate() - i);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const rollups = await DatabaseService.getRollups(
          dayStart.getTime(),
          dayEnd.getTime()
        );

        if (rollups && rollups.length > 0) {
          const totalBlinks = rollups.reduce((sum, r) => sum + r.blink_count, 0);
          const avgEar = rollups.reduce((sum, r) => sum + (r.avg_ear ?? 0), 0) / rollups.length;
          days.push({
            date: dayStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            totalBlinks,
            minuteCount: rollups.length,
            avgBlinkRate: rollups.length > 0 ? totalBlinks / rollups.length : 0,
            avgEar,
          });
        } else {
          days.push({
            date: dayStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            totalBlinks: 0,
            minuteCount: 0,
            avgBlinkRate: 0,
            avgEar: 0,
          });
        }
      }
      setWeeklyData(days);
      setIsLoading(false);
    }
    loadData();
  }, []);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      // Get all data from last 30 days
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const rollups = await DatabaseService.getRollups(
        thirtyDaysAgo.getTime(),
        today.getTime()
      );

      if (!rollups || rollups.length === 0) {
        alert('No data to export');
        return;
      }

      // Generate CSV content
      const headers = ['Timestamp', 'Blink Count', 'Eye Openness', 'Synced'];
      const rows = rollups.map((r) => [
        new Date(r.timestamp).toISOString(),
        r.blink_count.toString(),
        r.avg_ear?.toFixed(4) ?? '',
        r.synced ? 'Yes' : 'No',
      ]);

      const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');

      // Show save dialog
      const result = await window.lumina?.system.showSaveDialog({
        title: 'Export Wellness Data',
        defaultPath: `lumina-wellness-${new Date().toISOString().split('T')[0]}.csv`,
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      });

      if (result && !result.canceled && result.filePath) {
        // Write to file
        const writeResult = await window.lumina?.system.writeFile(result.filePath, csvContent);
        if (writeResult?.success) {
          alert(`Data exported successfully! ${rollups.length} records saved to:\n${result.filePath}`);
        } else {
          // Fallback to clipboard
          await navigator.clipboard.writeText(csvContent);
          alert(`File write failed, but data copied to clipboard. ${rollups.length} records.`);
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate max for bar chart scaling
  const maxBlinks = Math.max(...weeklyData.map((d) => d.totalBlinks), 1);

  // Show skeleton while loading
  if (isLoading) {
    return (
      <div className="p-6">
        <HistorySkeleton />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Action bar */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleExportCSV}
          disabled={isExporting}
          className="px-4 py-2 bg-foreground text-background rounded-lg hover:bg-foreground/90 disabled:opacity-50 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {isExporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Today's Blinks</p>
          <p className="text-2xl font-bold text-foreground mt-1">{stats?.totalBlinks ?? 0}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Eye Openness</p>
          <p className="text-2xl font-bold text-foreground mt-1">{stats?.avgEar?.toFixed(3) ?? '0.000'}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Minutes Tracked</p>
          <p className="text-2xl font-bold text-foreground mt-1">{stats?.minuteCount ?? 0}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <h3 className="font-semibold text-foreground mb-4">Weekly Activity</h3>
        <div className="flex items-end justify-between gap-2 h-40">
          {weeklyData.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div className="flex-1 w-full flex items-end">
                <div
                  className="w-full bg-foreground rounded-t transition-all"
                  style={{
                    height: `${Math.max((day.totalBlinks / maxBlinks) * 100, 2)}%`,
                    minHeight: day.totalBlinks > 0 ? '8px' : '2px',
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 truncate w-full text-center">
                {day.date.split(' ')[0]}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Total: {weeklyData.reduce((sum, d) => sum + d.totalBlinks, 0)} blinks this week
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">Daily Breakdown</h3>
        {weeklyData.some((d) => d.totalBlinks > 0) ? (
          <div className="space-y-2">
            <div className="grid grid-cols-5 gap-2 text-xs text-muted-foreground font-medium px-2">
              <span>Date</span>
              <span className="text-right">Blinks</span>
              <span className="text-right">Minutes</span>
              <span className="text-right">Rate/min</span>
              <span className="text-right">Openness</span>
            </div>
            {weeklyData.filter((d) => d.totalBlinks > 0).map((day, i) => (
              <div
                key={i}
                className="grid grid-cols-5 gap-2 text-sm text-foreground py-2 px-2 hover:bg-muted/50 rounded"
              >
                <span className="font-medium">{day.date}</span>
                <span className="text-right">{day.totalBlinks}</span>
                <span className="text-right">{day.minuteCount}</span>
                <span className="text-right">{day.avgBlinkRate.toFixed(1)}</span>
                <span className="text-right">{day.avgEar.toFixed(3)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Icons.Clock />
            <p className="mt-2">No data recorded yet. Start monitoring to see your history.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default HistoryView;
