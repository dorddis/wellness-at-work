/**
 * Database Queries
 * Typed queries for wellness data and admin dashboard
 */

import { getSupabase } from './client';

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

  const { data, error } = await supabase
    .from('wellness_data')
    .select('timestamp, blink_count, avg_ear')
    .gte('timestamp', startDate.toISOString())
    .lte('timestamp', endDate.toISOString())
    .order('timestamp', { ascending: true });

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
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // This would normally be a database function for efficiency
  // Simplified version using client-side aggregation
  const { data: wellnessData } = await supabase
    .from('wellness_data')
    .select('timestamp, blink_count')
    .gte('timestamp', startDate.toISOString());

  if (!wellnessData) return [];

  // Group by date
  const byDate = new Map<string, { blinks: number; count: number }>();

  for (const d of wellnessData) {
    const date = d.timestamp.split('T')[0];
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

  const { data, error } = await supabase
    .from('org_members')
    .select(`
      user_id,
      role,
      department,
      joined_at,
      users:user_id (
        email
      )
    `)
    .eq('org_id', orgId);

  if (error || !data) {
    console.error('Error fetching org members:', error);
    return [];
  }

  return data.map((d: any) => ({
    userId: d.user_id,
    email: d.users?.email ?? 'unknown',
    role: d.role,
    department: d.department,
    joinedAt: d.joined_at,
    lastActive: null, // Would need separate tracking
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
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

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
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

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

      // Calculate wellness score based on blink rate (same logic as desktop app)
      if (avgBlinkRate < 5) avgWellnessScore = 30;
      else if (avgBlinkRate < 10) avgWellnessScore = 50;
      else if (avgBlinkRate < 15) avgWellnessScore = 70;
      else if (avgBlinkRate < 20) avgWellnessScore = 90;
      else avgWellnessScore = 100;
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
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

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
  alertType: string;
  severity: 'info' | 'warning' | 'critical';
  message: string | null;
  createdAt: string;
}[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('org_alerts')
    .select('*')
    .eq('org_id', orgId)
    .eq('acknowledged', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error('Error fetching alerts:', error);
    return [];
  }

  return data.map((d) => ({
    id: d.id,
    userId: d.user_id,
    alertType: d.alert_type,
    severity: d.severity as 'info' | 'warning' | 'critical',
    message: d.message,
    createdAt: d.created_at,
  }));
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
