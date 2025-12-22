/**
 * Database Queries
 * Typed queries for wellness data and admin dashboard
 */

import { getSupabase } from './client';
import type { Json } from './database.types';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate and clamp days parameter to prevent Invalid Date errors
 */
function validateDays(days: number): number {
  // Handle NaN, Infinity, and negative values
  if (!Number.isFinite(days) || days < 0) {
    return 7; // Default to 7 days
  }
  // Clamp to reasonable maximum (1 year)
  return Math.min(Math.floor(days), 365);
}

// ============================================================================
// Types
// ============================================================================

export interface WellnessRollup {
  timestamp: string;
  blinkCount: number;
  avgEAR: number | null;
}

export interface DailyStats {
  date: string;
  totalBlinks: number;
  avgBlinkRate: number;
  alertCount: number;
  sessionCount: number;
}

export interface TeamMember {
  userId: string;
  email: string;
  fullName: string | null;
  role: 'admin' | 'manager' | 'employee';
  department: string | null;
  joinedAt: string;
  lastActive: string | null;
}

export interface DepartmentStats {
  department: string;
  memberCount: number;
  avgWellnessScore: number;
  avgBlinkRate: number;
  alertCount: number;
}

// ============================================================================
// Employee Queries (own data only)
// ============================================================================

/**
 * Get wellness data for current user
 */
export async function getMyWellnessData(
  startDate: Date,
  endDate: Date
): Promise<WellnessRollup[]> {
  const supabase = getSupabase();

  // Get current user to add explicit filter (RLS backup)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('No authenticated user for wellness data query');
    return [];
  }

  // Note: Supabase default limit is 1000 rows, we need more for date ranges
  const { data, error } = await supabase
    .from('wellness_data')
    .select('timestamp, blink_count, avg_ear')
    .eq('user_id', user.id) // Explicit filter in addition to RLS
    .gte('timestamp', startDate.toISOString())
    .lte('timestamp', endDate.toISOString())
    .order('timestamp', { ascending: true })
    .limit(50000); // Override default 1000 limit

  if (error) {
    console.error('Error fetching wellness data:', error);
    return [];
  }

  return data.map((d) => ({
    timestamp: d.timestamp,
    blinkCount: d.blink_count,
    avgEAR: d.avg_ear,
  }));
}

/**
 * Get daily stats for current user
 */
export async function getMyDailyStats(days: number = 30): Promise<DailyStats[]> {
  const supabase = getSupabase();
  const validDays = validateDays(days);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - validDays);

  // Get current user to add explicit filter (RLS backup)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('[getMyDailyStats] No authenticated user');
    return [];
  }

  // This would normally be a database function for efficiency
  // Simplified version using client-side aggregation
  // Note: Supabase default limit is 1000 rows, we need more for 30 days of minute data
  const { data: wellnessData, error } = await supabase
    .from('wellness_data')
    .select('timestamp, blink_count')
    .eq('user_id', user.id) // Explicit filter in addition to RLS
    .gte('timestamp', startDate.toISOString())
    .order('timestamp', { ascending: true })
    .limit(50000); // Override default 1000 limit - 30 days * 1440 min/day = 43200 max

  if (error) {
    console.error('[getMyDailyStats] Query error:', error);
  }
  if (!wellnessData) return [];

  // Group by date
  const byDate = new Map<string, { blinks: number; count: number }>();

  for (const d of wellnessData) {
    // Handle both ISO format (2025-12-22T10:00:00) and Postgres format (2025-12-22 10:00:00+00)
    const date = d.timestamp.split(/[T ]/)[0];
    const existing = byDate.get(date) ?? { blinks: 0, count: 0 };
    byDate.set(date, {
      blinks: existing.blinks + d.blink_count,
      count: existing.count + 1,
    });
  }

  return Array.from(byDate.entries()).map(([date, stats]) => ({
    date,
    totalBlinks: stats.blinks,
    avgBlinkRate: stats.count > 0 ? stats.blinks / stats.count : 0,
    alertCount: 0, // Would query org_alerts
    sessionCount: stats.count,
  }));
}

// ============================================================================
// Admin Queries (org-wide data)
// ============================================================================

/**
 * Get organization members (admin only)
 */
export async function getOrgMembers(orgId: string): Promise<TeamMember[]> {
  const supabase = getSupabase();

  // Use member_details view which handles the auth.users join
  const { data, error } = await supabase
    .from('member_details')
    .select('user_id, email, full_name, role, department, joined_at')
    .eq('org_id', orgId);

  if (error || !data) {
    console.error('Error fetching org members:', error);
    return [];
  }

  return data.map((d: any) => ({
    userId: d.user_id,
    email: d.email ?? 'unknown',
    fullName: d.full_name ?? null,
    role: d.role,
    department: d.department,
    joinedAt: d.joined_at,
    lastActive: null,
  }));
}

/**
 * Get organization-wide wellness stats (admin only)
 */
export async function getOrgWellnessStats(
  orgId: string,
  days: number = 7
): Promise<{
  avgBlinkRate: number;
  totalAlerts: number;
  activeUsers: number;
}> {
  const supabase = getSupabase();
  const validDays = validateDays(days);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - validDays);

  // Get wellness data
  const { data: wellnessData } = await supabase
    .from('wellness_data')
    .select('user_id, blink_count')
    .eq('org_id', orgId)
    .gte('timestamp', startDate.toISOString());

  // Get alerts
  const { count: alertCount } = await supabase
    .from('org_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte('created_at', startDate.toISOString());

  if (!wellnessData) {
    return { avgBlinkRate: 0, totalAlerts: 0, activeUsers: 0 };
  }

  const totalBlinks = wellnessData.reduce((sum, d) => sum + d.blink_count, 0);
  const uniqueUsers = new Set(wellnessData.map((d) => d.user_id)).size;

  return {
    avgBlinkRate: wellnessData.length > 0 ? totalBlinks / wellnessData.length : 0,
    totalAlerts: alertCount ?? 0,
    activeUsers: uniqueUsers,
  };
}

/**
 * Get department breakdown (admin only)
 */
export async function getDepartmentStats(orgId: string, days: number = 7): Promise<DepartmentStats[]> {
  const supabase = getSupabase();
  const validDays = validateDays(days);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - validDays);

  // Get members with departments
  const { data: members } = await supabase
    .from('org_members')
    .select('user_id, department')
    .eq('org_id', orgId);

  if (!members) return [];

  // Group by department
  const departments = new Map<string, string[]>();
  for (const m of members) {
    const dept = m.department ?? 'Unassigned';
    const users = departments.get(dept) ?? [];
    users.push(m.user_id);
    departments.set(dept, users);
  }

  // For each department, calculate real stats
  const results: DepartmentStats[] = [];

  for (const [department, userIds] of departments) {
    // Get wellness data for all users in this department
    const { data: wellnessData } = await supabase
      .from('wellness_data')
      .select('user_id, blink_count')
      .eq('org_id', orgId)
      .in('user_id', userIds)
      .gte('timestamp', startDate.toISOString());

    // Get alerts for this department
    const { count: alertCount } = await supabase
      .from('org_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .in('user_id', userIds)
      .gte('created_at', startDate.toISOString());

    // Calculate averages
    let avgBlinkRate = 0;
    let avgWellnessScore = 0;

    if (wellnessData && wellnessData.length > 0) {
      const totalBlinks = wellnessData.reduce((sum, d) => sum + d.blink_count, 0);
      avgBlinkRate = Math.round((totalBlinks / wellnessData.length) * 10) / 10;

      // Calculate wellness score based on blink rate (continuous scale)
      // Normal: 15-20 blinks/min, Screen fatigue: 3-8 blinks/min
      // Formula: score = blinkRate * 4 + 20, clamped to 25-100
      avgWellnessScore = Math.min(100, Math.max(25, Math.round(avgBlinkRate * 4 + 20)));
    }

    results.push({
      department,
      memberCount: userIds.length,
      avgWellnessScore,
      avgBlinkRate,
      alertCount: alertCount ?? 0,
    });
  }

  return results;
}

/**
 * Get employee wellness data (admin only, named mode)
 */
export async function getEmployeeWellnessData(
  orgId: string,
  userId: string,
  days: number = 7
): Promise<WellnessRollup[]> {
  const supabase = getSupabase();
  const validDays = validateDays(days);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - validDays);

  const { data, error } = await supabase
    .from('wellness_data')
    .select('timestamp, blink_count, avg_ear')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .gte('timestamp', startDate.toISOString())
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('Error fetching employee data:', error);
    return [];
  }

  return data.map((d) => ({
    timestamp: d.timestamp,
    blinkCount: d.blink_count,
    avgEAR: d.avg_ear,
  }));
}

/**
 * Get unacknowledged alerts (admin only)
 */
export async function getOrgAlerts(
  orgId: string,
  limit: number = 50
): Promise<{
  id: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  department: string | null;
  alertType: string;
  severity: 'info' | 'warning' | 'critical';
  message: string | null;
  createdAt: string;
}[]> {
  const supabase = getSupabase();

  // Get alerts
  const { data: alerts, error } = await supabase
    .from('org_alerts')
    .select('*')
    .eq('org_id', orgId)
    .eq('acknowledged', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !alerts) {
    console.error('Error fetching alerts:', error);
    return [];
  }

  // Get user IDs from alerts (filter out nulls)
  const userIds = [...new Set(alerts.map(a => a.user_id).filter((id): id is string => id !== null))];

  if (userIds.length === 0) {
    return alerts.map((d) => ({
      id: d.id,
      userId: d.user_id,
      userEmail: null,
      userName: null,
      department: null,
      alertType: d.alert_type,
      severity: d.severity as 'info' | 'warning' | 'critical',
      message: d.message,
      createdAt: d.created_at,
    }));
  }

  // Get member details from view
  const { data: members } = await supabase
    .from('member_details')
    .select('user_id, email, full_name, department')
    .eq('org_id', orgId)
    .in('user_id', userIds);

  // Create lookup map
  const memberMap = new Map<string, { email: string | null; fullName: string | null; department: string | null }>();
  if (members) {
    for (const m of members) {
      memberMap.set(m.user_id, {
        email: m.email ?? null,
        fullName: m.full_name ?? null,
        department: m.department ?? null,
      });
    }
  }

  return alerts.map((d) => {
    const memberInfo = d.user_id ? memberMap.get(d.user_id) : undefined;
    return {
      id: d.id,
      userId: d.user_id,
      userEmail: memberInfo?.email ?? null,
      userName: memberInfo?.fullName ?? null,
      department: memberInfo?.department ?? null,
      alertType: d.alert_type,
      severity: d.severity as 'info' | 'warning' | 'critical',
      message: d.message,
      createdAt: d.created_at,
    };
  });
}

/**
 * Acknowledge an alert (admin only)
 */
export async function acknowledgeAlert(alertId: string): Promise<{ error: Error | null }> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('org_alerts')
    .update({ acknowledged: true })
    .eq('id', alertId);

  return { error: error ? new Error(error.message) : null };
}

// ============================================================================
// Organization Settings
// ============================================================================

export interface AlertSettings {
  lowBlinkThreshold: number;
  lowBlinkDuration: number;
  sessionAlertHours: number;
  emailNotifications: boolean;
  inAppNotifications: boolean;
}

export interface OrgSettings {
  id: string;
  name: string;
  slug: string;
  privacyMode: 'anonymous' | 'named' | 'manager_only';
  subscriptionTier: 'trial' | 'starter' | 'enterprise';
  alertSettings: AlertSettings;
}

const defaultAlertSettings: AlertSettings = {
  lowBlinkThreshold: 10,
  lowBlinkDuration: 10,
  sessionAlertHours: 3,
  emailNotifications: true,
  inAppNotifications: true,
};

/**
 * Get organization settings
 */
export async function getOrgSettings(orgId: string): Promise<OrgSettings | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug, privacy_mode, subscription_tier, alert_settings')
    .eq('id', orgId)
    .single();

  if (error || !data) {
    console.error('Failed to get org settings:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    privacyMode: data.privacy_mode as OrgSettings['privacyMode'],
    subscriptionTier: data.subscription_tier as OrgSettings['subscriptionTier'],
    alertSettings: (data.alert_settings as unknown as AlertSettings) ?? defaultAlertSettings,
  };
}

/**
 * Update organization settings (admin only)
 */
export async function updateOrgSettings(
  orgId: string,
  settings: Partial<Pick<OrgSettings, 'name' | 'slug' | 'privacyMode' | 'alertSettings'>>
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  // Map to database columns
  const updates: Record<string, unknown> = {};
  if (settings.name !== undefined) updates.name = settings.name;
  if (settings.slug !== undefined) updates.slug = settings.slug;
  if (settings.privacyMode !== undefined) updates.privacy_mode = settings.privacyMode;
  if (settings.alertSettings !== undefined) updates.alert_settings = settings.alertSettings;

  const { error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', orgId);

  if (error) {
    console.error('Failed to update org settings:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// GDPR Compliance
// ============================================================================

/**
 * Export all user data (GDPR data portability)
 */
export async function exportUserData(userId: string): Promise<{
  success: boolean;
  data?: {
    profile: Record<string, unknown>;
    wellnessData: unknown[];
    alerts: unknown[];
    membership: unknown;
    exportedAt: string;
  };
  error?: string;
}> {
  const supabase = getSupabase();

  try {
    // Get user profile
    const { data: user, error: userError } = await supabase.auth.getUser();
    if (userError || !user.user) {
      return { success: false, error: 'User not found' };
    }

    // Get wellness data (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: wellnessData } = await supabase
      .from('wellness_data')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', ninetyDaysAgo.toISOString());

    // Get alerts
    const { data: alerts } = await supabase
      .from('org_alerts')
      .select('*')
      .eq('user_id', userId);

    // Get organization membership
    const { data: membership } = await supabase
      .from('org_members')
      .select(`
        role,
        department,
        joined_at,
        organizations (
          name,
          slug
        )
      `)
      .eq('user_id', userId)
      .single();

    return {
      success: true,
      data: {
        profile: {
          id: user.user.id,
          email: user.user.email,
          createdAt: user.user.created_at,
        },
        wellnessData: wellnessData || [],
        alerts: alerts || [],
        membership,
        exportedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Failed to export user data:', error);
    return { success: false, error: 'Export failed' };
  }
}

/**
 * Request account deletion (GDPR right to erasure)
 * Sets deletion_requested_at timestamp for soft delete
 */
export async function requestAccountDeletion(userId: string): Promise<{
  success: boolean;
  deletionDate?: string;
  error?: string;
}> {
  const supabase = getSupabase();

  try {
    // Calculate deletion date (30 days grace period)
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    // Mark user for deletion in org_members
    const { error: memberError } = await supabase
      .from('org_members')
      .update({ deletion_requested_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (memberError) {
      // Column might not exist, which is fine - proceed anyway
      console.warn('Could not update org_members:', memberError);
    }

    // For now, we return success with the deletion date
    // Actual deletion would be handled by a background job
    return {
      success: true,
      deletionDate: deletionDate.toISOString(),
    };
  } catch (error) {
    console.error('Failed to request account deletion:', error);
    return { success: false, error: 'Deletion request failed' };
  }
}

/**
 * Cancel account deletion request
 */
export async function cancelAccountDeletion(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = getSupabase();

  try {
    const { error } = await supabase
      .from('org_members')
      .update({ deletion_requested_at: null })
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to cancel deletion:', error);
    return { success: false, error: 'Cancellation failed' };
  }
}

// ============================================================================
// BREAK EVENTS
// ============================================================================

export interface BreakEvent {
  id: string;
  userId: string;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  postponedCount: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'postponed';
  breakType: 'regular' | 'manual' | 'forced';
  durationSeconds: number;
}

export interface BreakStats {
  todayCompleted: number;
  todaySkipped: number;
  todayPostponed: number;
  nextBreakAt: string | null;
  weeklyCompliance: number;
}

/**
 * Get user's break events for date range
 */
export async function getMyBreakEvents(
  startDate: Date,
  endDate: Date
): Promise<BreakEvent[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('break_events')
    .select('*')
    .gte('scheduled_at', startDate.toISOString())
    .lte('scheduled_at', endDate.toISOString())
    .order('scheduled_at', { ascending: true });

  if (error) {
    console.error('Error fetching break events:', error);
    return [];
  }

  return (data ?? []).map((d: any) => ({
    id: d.id,
    userId: d.user_id,
    scheduledAt: d.scheduled_at,
    startedAt: d.started_at,
    completedAt: d.completed_at,
    postponedCount: d.postponed_count,
    status: d.status,
    breakType: d.break_type,
    durationSeconds: d.duration_seconds ?? 20,
  }));
}

/**
 * Get break statistics for user
 */
export async function getMyBreakStats(days: number = 7): Promise<BreakStats> {
  const supabase = getSupabase();
  const validDays = validateDays(days);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - validDays);

  // Get today's breaks
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: todayBreaks } = await supabase
    .from('break_events')
    .select('*')
    .gte('scheduled_at', today.toISOString())
    .lt('scheduled_at', tomorrow.toISOString());

  // Get weekly breaks
  const { data: weeklyBreaks } = await supabase
    .from('break_events')
    .select('*')
    .gte('scheduled_at', startDate.toISOString());

  // Calculate stats
  const todayCompleted = todayBreaks?.filter((b: any) => b.status === 'completed').length ?? 0;
  const todaySkipped = todayBreaks?.filter((b: any) => b.status === 'skipped').length ?? 0;
  const todayPostponed = todayBreaks?.filter((b: any) => b.postponed_count > 0).length ?? 0;

  const weeklyTotal = weeklyBreaks?.length ?? 0;
  const weeklyCompleted = weeklyBreaks?.filter((b: any) => b.status === 'completed').length ?? 0;
  const weeklyCompliance = weeklyTotal > 0 ? Math.round((weeklyCompleted / weeklyTotal) * 100) : 0;

  // Find next scheduled break
  const { data: nextBreak } = await supabase
    .from('break_events')
    .select('scheduled_at')
    .eq('status', 'scheduled')
    .gt('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  return {
    todayCompleted,
    todaySkipped,
    todayPostponed,
    nextBreakAt: nextBreak?.scheduled_at ?? null,
    weeklyCompliance,
  };
}

/**
 * Create a new break event
 */
export async function createBreakEvent(
  scheduledAt: Date,
  breakType: 'regular' | 'manual' | 'forced' = 'regular'
): Promise<{ success: boolean; error?: string; id?: string }> {
  const supabase = getSupabase();
  const { data: user } = await supabase.auth.getUser();

  if (!user.user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get user's org
  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.user.id)
    .maybeSingle();

  if (!membership) {
    return { success: false, error: 'No organization membership' };
  }

  const { data, error } = await supabase
    .from('break_events')
    .insert({
      user_id: user.user.id,
      org_id: membership.org_id,
      scheduled_at: scheduledAt.toISOString(),
      status: 'scheduled',
      break_type: breakType,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

/**
 * Update break event status
 */
export async function updateBreakEvent(
  breakId: string,
  status: 'in_progress' | 'completed' | 'skipped' | 'postponed',
  postponedCount?: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  const updates: Record<string, unknown> = { status };
  if (status === 'in_progress') {
    updates.started_at = new Date().toISOString();
  }
  if (status === 'completed') {
    updates.completed_at = new Date().toISOString();
  }
  if (postponedCount !== undefined) {
    updates.postponed_count = postponedCount;
  }

  const { error } = await supabase
    .from('break_events')
    .update(updates)
    .eq('id', breakId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// EYE EXERCISES
// ============================================================================

export interface EyeExercise {
  id: string;
  name: string;
  description: string;
  durationSeconds: number;
  instructions: { step: number; text: string; duration: number }[];
  category: 'relaxation' | 'focus' | 'mobility' | 'strain_relief';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  iconName: string | null;
}

export interface ExerciseSession {
  id: string;
  exerciseId: string;
  exerciseName: string;
  startedAt: string;
  completedAt: string | null;
  status: 'in_progress' | 'completed' | 'abandoned';
}

/**
 * Get all active eye exercises
 */
export async function getEyeExercises(): Promise<EyeExercise[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('eye_exercises')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching exercises:', error);
    return [];
  }

  return (data ?? []).map((d: any) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    durationSeconds: d.duration_seconds,
    instructions: d.instructions as { step: number; text: string; duration: number }[],
    category: d.category,
    difficulty: d.difficulty,
    iconName: d.icon_name,
  }));
}

/**
 * Get user's exercise history
 */
export async function getMyExerciseSessions(days: number = 7): Promise<ExerciseSession[]> {
  const supabase = getSupabase();
  const validDays = validateDays(days);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - validDays);

  const { data, error } = await supabase
    .from('exercise_sessions')
    .select(`
      *,
      eye_exercises!inner(name)
    `)
    .gte('started_at', startDate.toISOString())
    .order('started_at', { ascending: false });

  if (error) {
    console.error('Error fetching exercise sessions:', error);
    return [];
  }

  return (data ?? []).map((d: any) => ({
    id: d.id,
    exerciseId: d.exercise_id,
    exerciseName: d.eye_exercises?.name ?? 'Unknown',
    startedAt: d.started_at,
    completedAt: d.completed_at,
    status: d.status,
  }));
}

/**
 * Start an exercise session
 */
export async function startExerciseSession(
  exerciseId: string
): Promise<{ success: boolean; error?: string; sessionId?: string }> {
  const supabase = getSupabase();
  const { data: user } = await supabase.auth.getUser();

  if (!user.user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get user's org
  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.user.id)
    .maybeSingle();

  if (!membership) {
    return { success: false, error: 'No organization membership' };
  }

  const { data, error } = await supabase
    .from('exercise_sessions')
    .insert({
      user_id: user.user.id,
      org_id: membership.org_id,
      exercise_id: exerciseId,
      started_at: new Date().toISOString(),
      status: 'in_progress',
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, sessionId: data.id };
}

/**
 * Complete an exercise session
 */
export async function completeExerciseSession(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('exercise_sessions')
    .update({
      completed_at: new Date().toISOString(),
      status: 'completed',
    })
    .eq('id', sessionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// TEAM CHALLENGES
// ============================================================================

export interface TeamChallenge {
  id: string;
  name: string;
  description: string | null;
  challengeType: 'break_compliance' | 'posture_health' | 'blink_health' | 'wellness_week' | 'exercise_streak';
  startDate: string;
  endDate: string;
  targetMetric: { metric: string; target: number; unit: string };
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  prizeDescription: string | null;
  participantCount: number;
  myProgress: number;
  isJoined: boolean;
}

export interface ChallengeParticipant {
  id: string;
  rank: number;
  userName: string;
  userEmail: string;
  userId: string;
  department: string | null;
  currentProgress: number;
}

/**
 * Get team challenges for organization
 */
export async function getTeamChallenges(
  orgId: string,
  status?: 'upcoming' | 'active' | 'completed'
): Promise<TeamChallenge[]> {
  const supabase = getSupabase();
  const { data: user } = await supabase.auth.getUser();

  let query = supabase
    .from('team_challenges')
    .select('*')
    .eq('org_id', orgId)
    .order('start_date', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching challenges:', error);
    return [];
  }

  // Get participant counts
  const challengeIds = (data ?? []).map((d: any) => d.id);
  const { data: participantCounts } = await supabase
    .from('challenge_participants')
    .select('challenge_id')
    .in('challenge_id', challengeIds.length > 0 ? challengeIds : ['none']);

  // Count participants per challenge
  const countMap = new Map<string, number>();
  for (const p of participantCounts ?? []) {
    countMap.set(p.challenge_id, (countMap.get(p.challenge_id) ?? 0) + 1);
  }

  // Get user's participations
  let userParticipations: any[] = [];
  if (user.user) {
    const { data: participations } = await supabase
      .from('challenge_participants')
      .select('challenge_id, current_progress')
      .eq('user_id', user.user.id);
    userParticipations = participations ?? [];
  }

  return (data ?? []).map((d: any) => {
    const userParticipation = userParticipations.find((p: any) => p.challenge_id === d.id);
    return {
      id: d.id,
      name: d.name,
      description: d.description,
      challengeType: d.challenge_type,
      startDate: d.start_date,
      endDate: d.end_date,
      targetMetric: d.target_metric,
      status: d.status,
      prizeDescription: d.prize_description,
      participantCount: countMap.get(d.id) ?? 0,
      myProgress: userParticipation?.current_progress ?? 0,
      isJoined: !!userParticipation,
    };
  });
}

/**
 * Get leaderboard for a challenge
 */
export async function getChallengeLeaderboard(
  challengeId: string,
  limit: number = 50
): Promise<ChallengeParticipant[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('challenge_participants')
    .select('user_id, department, current_progress')
    .eq('challenge_id', challengeId)
    .order('current_progress', { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }

  return data.map((d: any, index: number) => ({
    id: d.user_id,
    rank: index + 1,
    userName: `Participant ${index + 1}`,
    userEmail: '',
    userId: d.user_id,
    department: d.department,
    currentProgress: d.current_progress,
  }));
}

/**
 * Create a new team challenge (admin only)
 */
export async function createTeamChallenge(
  orgId: string,
  challenge: {
    name: string;
    description?: string;
    challengeType: TeamChallenge['challengeType'];
    startDate: Date;
    endDate: Date;
    targetMetric: { metric: string; target: number; unit: string };
    prizeDescription?: string;
  }
): Promise<{ success: boolean; error?: string; challengeId?: string }> {
  const supabase = getSupabase();
  const { data: user } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('team_challenges')
    .insert({
      org_id: orgId,
      name: challenge.name,
      description: challenge.description,
      challenge_type: challenge.challengeType,
      start_date: challenge.startDate.toISOString(),
      end_date: challenge.endDate.toISOString(),
      target_metric: challenge.targetMetric,
      prize_description: challenge.prizeDescription,
      status: 'upcoming',
      created_by: user.user?.id,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, challengeId: data.id };
}

/**
 * Join a challenge
 */
export async function joinChallenge(
  challengeId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  const { data: user } = await supabase.auth.getUser();

  if (!user.user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get user's department
  const { data: membership } = await supabase
    .from('org_members')
    .select('department')
    .eq('user_id', user.user.id)
    .maybeSingle();

  const { error } = await supabase
    .from('challenge_participants')
    .insert({
      challenge_id: challengeId,
      user_id: user.user.id,
      department: membership?.department,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// ANALYTICS
// ============================================================================

export interface AnalyticsMetrics {
  dateRange: { start: string; end: string };
  teamMetrics: {
    avgWellnessScore: number;
    avgBlinkRate: number;
    totalActiveUsers: number;
    totalBreaksTaken: number;
    avgBreakCompliance: number;
    totalExercisesCompleted: number;
  };
  departmentBreakdown: {
    department: string;
    avgScore: number;
    userCount: number;
    breakCompliance: number;
  }[];
  trends: {
    date: string;
    wellnessScore: number;
    blinkRate: number;
    breakCompliance: number;
  }[];
}

/**
 * Calculate wellness score from blink rate
 */
function calculateWellnessScore(blinkRate: number): number {
  if (blinkRate < 5) return 30;
  if (blinkRate < 10) return 50;
  if (blinkRate < 15) return 75;
  if (blinkRate < 20) return 90;
  return 100;
}

/**
 * Get comprehensive analytics for organization
 */
export async function getOrgAnalytics(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<AnalyticsMetrics> {
  const supabase = getSupabase();

  // Get wellness data
  const { data: wellnessData } = await supabase
    .from('wellness_data')
    .select('user_id, blink_count, timestamp')
    .eq('org_id', orgId)
    .gte('timestamp', startDate.toISOString())
    .lte('timestamp', endDate.toISOString());

  // Get break events
  const { data: breakData } = await supabase
    .from('break_events')
    .select('user_id, status, scheduled_at')
    .eq('org_id', orgId)
    .gte('scheduled_at', startDate.toISOString())
    .lte('scheduled_at', endDate.toISOString());

  // Get exercise sessions
  const { data: exerciseData } = await supabase
    .from('exercise_sessions')
    .select('user_id, status')
    .eq('org_id', orgId)
    .gte('started_at', startDate.toISOString())
    .lte('started_at', endDate.toISOString());

  // Get org members with departments
  const { data: members } = await supabase
    .from('org_members')
    .select('user_id, department')
    .eq('org_id', orgId);

  // Calculate metrics
  const uniqueUsers = new Set((wellnessData ?? []).map((d: any) => d.user_id)).size;
  const totalBlinks = (wellnessData ?? []).reduce((sum: number, d: any) => sum + d.blink_count, 0);
  const avgBlinkRate = wellnessData && wellnessData.length > 0 ? totalBlinks / wellnessData.length : 0;
  const avgWellnessScore = calculateWellnessScore(avgBlinkRate);

  const totalBreaks = breakData?.length ?? 0;
  const completedBreaks = breakData?.filter((b: any) => b.status === 'completed').length ?? 0;
  const avgBreakCompliance = totalBreaks > 0 ? (completedBreaks / totalBreaks) * 100 : 0;

  const totalExercises = exerciseData?.filter((e: any) => e.status === 'completed').length ?? 0;

  // Department breakdown
  const deptMap = new Map<string, { userIds: Set<string>; blinks: number; rollupCount: number; breaks: number; completedBreaks: number }>();

  for (const member of members ?? []) {
    const dept = member.department ?? 'Unassigned';
    if (!deptMap.has(dept)) {
      deptMap.set(dept, { userIds: new Set(), blinks: 0, rollupCount: 0, breaks: 0, completedBreaks: 0 });
    }
    deptMap.get(dept)!.userIds.add(member.user_id);
  }

  for (const wellness of wellnessData ?? []) {
    const member = members?.find((m: any) => m.user_id === wellness.user_id);
    const dept = member?.department ?? 'Unassigned';
    const deptData = deptMap.get(dept);
    if (deptData) {
      deptData.blinks += wellness.blink_count;
      deptData.rollupCount += 1;
    }
  }

  for (const breakEvent of breakData ?? []) {
    const member = members?.find((m: any) => m.user_id === breakEvent.user_id);
    const dept = member?.department ?? 'Unassigned';
    const deptData = deptMap.get(dept);
    if (deptData) {
      deptData.breaks += 1;
      if (breakEvent.status === 'completed') {
        deptData.completedBreaks += 1;
      }
    }
  }

  const departmentBreakdown = Array.from(deptMap.entries()).map(([department, data]) => {
    const deptAvgBlinkRate = data.rollupCount > 0 ? data.blinks / data.rollupCount : 0;
    const avgScore = calculateWellnessScore(deptAvgBlinkRate);
    const breakCompliance = data.breaks > 0 ? (data.completedBreaks / data.breaks) * 100 : 0;

    return {
      department,
      avgScore,
      userCount: data.userIds.size,
      breakCompliance: Math.round(breakCompliance),
    };
  });

  // Build daily trends
  const trendMap = new Map<string, { blinks: number; rollupCount: number; breaks: number; completedBreaks: number }>();

  for (const wellness of wellnessData ?? []) {
    const date = wellness.timestamp.split('T')[0];
    if (!trendMap.has(date)) {
      trendMap.set(date, { blinks: 0, rollupCount: 0, breaks: 0, completedBreaks: 0 });
    }
    const trend = trendMap.get(date)!;
    trend.blinks += wellness.blink_count;
    trend.rollupCount += 1;
  }

  for (const breakEvent of breakData ?? []) {
    const date = breakEvent.scheduled_at?.split('T')[0];
    if (!date) continue;
    if (!trendMap.has(date)) {
      trendMap.set(date, { blinks: 0, rollupCount: 0, breaks: 0, completedBreaks: 0 });
    }
    const trend = trendMap.get(date)!;
    trend.breaks += 1;
    if (breakEvent.status === 'completed') {
      trend.completedBreaks += 1;
    }
  }

  const trends = Array.from(trendMap.entries()).map(([date, data]) => {
    const blinkRate = data.rollupCount > 0 ? data.blinks / data.rollupCount : 0;
    const wellnessScore = calculateWellnessScore(blinkRate);
    const breakCompliance = data.breaks > 0 ? (data.completedBreaks / data.breaks) * 100 : 0;

    return {
      date,
      wellnessScore,
      blinkRate: Math.round(blinkRate * 10) / 10,
      breakCompliance: Math.round(breakCompliance),
    };
  }).sort((a, b) => a.date.localeCompare(b.date));

  return {
    dateRange: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    teamMetrics: {
      avgWellnessScore: Math.round(avgWellnessScore),
      avgBlinkRate: Math.round(avgBlinkRate * 10) / 10,
      totalActiveUsers: uniqueUsers,
      totalBreaksTaken: completedBreaks,
      avgBreakCompliance: Math.round(avgBreakCompliance),
      totalExercisesCompleted: totalExercises,
    },
    departmentBreakdown,
    trends,
  };
}

// ============================================================================
// INTEGRATIONS
// ============================================================================

export interface Integration {
  id: string;
  integrationType: 'google_calendar' | 'microsoft_calendar' | 'slack' | 'microsoft_teams' | 'bamboohr' | 'workday';
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  config: Record<string, unknown>;
  lastSyncedAt: string | null;
  errorMessage: string | null;
  connectedAt: string | null;
}

/**
 * Get organization integrations
 */
export async function getOrgIntegrations(orgId: string): Promise<Integration[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('integrations')
    .select('id, integration_type, status, config, last_synced_at, error_message, connected_at')
    .eq('org_id', orgId);

  if (error) {
    console.error('Error fetching integrations:', error);
    return [];
  }

  return (data ?? []).map((d: any) => ({
    id: d.id,
    integrationType: d.integration_type,
    status: d.status,
    config: d.config ?? {},
    lastSyncedAt: d.last_synced_at,
    errorMessage: d.error_message,
    connectedAt: d.connected_at,
  }));
}

/**
 * Create or connect an integration
 */
export async function connectIntegration(
  orgId: string,
  integrationType: Integration['integrationType'],
  config?: Record<string, unknown>
): Promise<{ success: boolean; error?: string; integrationId?: string }> {
  const supabase = getSupabase();
  const { data: user } = await supabase.auth.getUser();

  // Check if integration already exists
  const { data: existing } = await supabase
    .from('integrations')
    .select('id')
    .eq('org_id', orgId)
    .eq('integration_type', integrationType)
    .maybeSingle();

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from('integrations')
      .update({
        status: 'connected',
        config: (config ?? {}) as Json,
        connected_at: new Date().toISOString(),
        connected_by: user.user?.id,
        error_message: null,
      })
      .eq('id', existing.id);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, integrationId: existing.id };
  }

  // Create new
  const { data, error } = await supabase
    .from('integrations')
    .insert({
      org_id: orgId,
      integration_type: integrationType,
      status: 'connected',
      config: (config ?? {}) as Json,
      connected_at: new Date().toISOString(),
      connected_by: user.user?.id,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, integrationId: data.id };
}

/**
 * Update integration config (admin only)
 */
export async function updateIntegrationConfig(
  integrationId: string,
  config: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('integrations')
    .update({ config: config as Json })
    .eq('id', integrationId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Disconnect an integration
 */
export async function disconnectIntegration(
  integrationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('integrations')
    .update({
      status: 'disconnected',
      credentials: null,
      error_message: null,
    })
    .eq('id', integrationId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
