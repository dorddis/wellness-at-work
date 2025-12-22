'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, Filter, TrendingUp, TrendingDown, Eye, Lock, Loader2, AlertCircle, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { getOrgSettings, getOrgMembers, getSupabase, type TeamMember } from '@lumina/api';
import { useAuth } from '../../../providers';
import { Select, type SelectOption } from '../../../../components/ui';

interface EmployeeStats {
  score: number;
  blinkRate: number;
  trend: 'up' | 'down' | 'stable';
  alertCount: number;
}

function calculateWellnessScore(blinkRate: number): number {
  // Continuous scale: score = blinkRate * 4 + 20, clamped to 25-100
  return Math.min(100, Math.max(25, Math.round(blinkRate * 4 + 20)));
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function EmployeesPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [privacyMode, setPrivacyMode] = useState<'anonymous' | 'named' | 'manager_only'>('anonymous');
  const [employees, setEmployees] = useState<TeamMember[]>([]);
  const [employeeStats, setEmployeeStats] = useState<Map<string, EmployeeStats>>(new Map());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const orgId = user?.organization?.id;
  const userRole = user?.organization?.role;

  useEffect(() => {
    async function loadData() {
      if (!orgId) return;

      try {
        setLoading(true);
        const settings = await getOrgSettings(orgId);
        if (settings) {
          setPrivacyMode(settings.privacyMode);
        }

        // Only load employees if privacy mode allows
        const canViewEmployees =
          settings?.privacyMode === 'named' ||
          (settings?.privacyMode === 'manager_only' && (userRole === 'admin' || userRole === 'manager'));

        if (canViewEmployees) {
          const members = await getOrgMembers(orgId);
          setEmployees(members);

          // Fetch wellness stats for all employees
          if (members.length > 0) {
            const supabase = getSupabase();
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const fourteenDaysAgo = new Date();
            fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

            // Get wellness data for last 14 days (to calculate trend)
            // Note: Supabase defaults to 1000 rows, need higher limit for many employees
            const { data: wellnessData } = await supabase
              .from('wellness_data')
              .select('user_id, blink_count, timestamp')
              .eq('org_id', orgId)
              .gte('timestamp', fourteenDaysAgo.toISOString())
              .limit(50000);

            // Get alerts for last 7 days
            const { data: alertsData } = await supabase
              .from('org_alerts')
              .select('user_id')
              .eq('org_id', orgId)
              .gte('created_at', sevenDaysAgo.toISOString());

            // Calculate stats per employee
            const statsMap = new Map<string, EmployeeStats>();

            for (const member of members) {
              const userWellness = wellnessData?.filter(d => d.user_id === member.userId) ?? [];
              const userAlerts = alertsData?.filter(a => a.user_id === member.userId) ?? [];

              // Split into current week and previous week for trend
              const currentWeek = userWellness.filter(d => new Date(d.timestamp) >= sevenDaysAgo);
              const previousWeek = userWellness.filter(d => new Date(d.timestamp) < sevenDaysAgo);

              // Calculate average blink rates
              const currentAvg = currentWeek.length > 0
                ? currentWeek.reduce((sum, d) => sum + d.blink_count, 0) / currentWeek.length
                : 0;
              const previousAvg = previousWeek.length > 0
                ? previousWeek.reduce((sum, d) => sum + d.blink_count, 0) / previousWeek.length
                : 0;

              // Determine trend
              let trend: 'up' | 'down' | 'stable' = 'stable';
              if (previousAvg > 0) {
                const diff = currentAvg - previousAvg;
                if (diff > 2) trend = 'up';
                else if (diff < -2) trend = 'down';
              }

              statsMap.set(member.userId, {
                score: currentWeek.length > 0 ? calculateWellnessScore(currentAvg) : 0,
                blinkRate: Math.round(currentAvg * 10) / 10,
                trend,
                alertCount: userAlerts.length,
              });
            }

            setEmployeeStats(statsMap);
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [orgId, userRole]);

  // Check if user can view individual data
  const canViewIndividuals =
    privacyMode === 'named' ||
    (privacyMode === 'manager_only' && (userRole === 'admin' || userRole === 'manager'));

  const departmentOptions: SelectOption[] = useMemo(() => {
    const uniqueDepts = [...new Set(employees.map((e) => e.department).filter(Boolean) as string[])];
    return [
      { value: 'all', label: 'All Departments', icon: <Building2 className="w-4 h-4 text-gray-400" /> },
      ...uniqueDepts.map((dept) => ({ value: dept, label: dept })),
    ];
  }, [employees]);

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      employee.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment =
      departmentFilter === 'all' || employee.department === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, departmentFilter, itemsPerPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  // Show restricted view if privacy mode doesn't allow individual access
  if (!canViewIndividuals) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Monitor individual employee wellness</p>
        </div>
        <div className="card p-12 text-center">
          <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Privacy Mode Enabled</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            {privacyMode === 'anonymous'
              ? 'Individual employee data is hidden. Only team-level aggregates are available.'
              : 'Individual employee data is only visible to their direct managers.'}
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Contact your admin to change privacy settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Monitor individual employee wellness</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select
            options={departmentOptions}
            value={departmentFilter}
            onChange={setDepartmentFilter}
            className="w-48"
          />
        </div>
      </div>

      {/* Employees table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Employee</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Department</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Score</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Blink Rate</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Trend</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Alerts</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Last Active</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedEmployees.map((employee) => {
                const stats = employeeStats.get(employee.userId);
                return (
                  <tr key={employee.userId} className="border-b border-border last:border-0 hover:bg-secondary/30">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{employee.email}</p>
                        <p className="text-sm text-muted-foreground">{employee.role}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{employee.department || 'Unassigned'}</td>
                    <td className="px-6 py-4">
                      {stats && stats.score > 0 ? (
                        <span className={`badge ${getScoreBadgeClass(stats.score)}`}>{stats.score}</span>
                      ) : (
                        <span className="badge badge-secondary">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                        {stats && stats.blinkRate > 0 ? `${stats.blinkRate}/min` : '--/min'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {stats && stats.blinkRate > 0 ? (
                        <TrendIndicator trend={stats.trend} />
                      ) : (
                        <span className="text-muted-foreground text-sm">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {stats && stats.alertCount > 0 ? (
                        <span className="flex items-center gap-1 text-amber-600">
                          <AlertCircle className="w-4 h-4" />
                          {stats.alertCount}
                        </span>
                      ) : (
                        <span className="text-green-600">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {employee.lastActive
                        ? new Date(employee.lastActive).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/employees/${employee.userId}`}
                        className="btn btn-outline py-1 px-3 text-xs"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredEmployees.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            No employees found matching your search.
          </div>
        )}

        {/* Pagination controls */}
        {filteredEmployees.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border">
            {/* Items per page selector */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Show</span>
              <Select
                options={PAGE_SIZE_OPTIONS.map((size) => ({ value: String(size), label: String(size) }))}
                value={String(itemsPerPage)}
                onChange={(val) => setItemsPerPage(Number(val))}
                size="sm"
                className="w-20"
              />
              <span className="text-muted-foreground">per page</span>
            </div>

            {/* Page info */}
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredEmployees.length)} of {filteredEmployees.length}
            </div>

            {/* Page navigation */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-outline px-2 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`btn min-w-[36px] px-2 py-1.5 text-sm ${
                        currentPage === pageNum
                          ? 'btn-primary'
                          : 'btn-outline'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-outline px-2 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Employees"
          value={employees.length}
        />
        <SummaryCard
          label="Admins"
          value={employees.filter((e) => e.role === 'admin').length}
        />
        <SummaryCard
          label="Managers"
          value={employees.filter((e) => e.role === 'manager').length}
        />
        <SummaryCard
          label="Employees"
          value={employees.filter((e) => e.role === 'employee').length}
        />
      </div>
    </div>
  );
}

function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') {
    return (
      <span className="flex items-center gap-1 text-green-600 text-sm">
        <TrendingUp className="w-4 h-4" />
        Up
      </span>
    );
  }
  if (trend === 'down') {
    return (
      <span className="flex items-center gap-1 text-red-600 text-sm">
        <TrendingDown className="w-4 h-4" />
        Down
      </span>
    );
  }
  return <span className="text-muted-foreground text-sm">Stable</span>;
}

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className={`card p-4 ${highlight ? 'border-red-200 bg-red-50' : ''}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${highlight ? 'text-red-600' : ''}`}>{value}</p>
    </div>
  );
}

function getScoreBadgeClass(score: number): string {
  if (score >= 80) return 'badge-success';
  if (score >= 60) return 'badge-warning';
  return 'badge-error';
}
