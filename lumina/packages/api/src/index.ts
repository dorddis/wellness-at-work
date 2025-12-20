/**
 * @lumina/api
 * Supabase client and API methods for Lumina platform
 */

// Client
export {
  initializeSupabase,
  getSupabase,
  isSupabaseInitialized,
  type Database,
} from './client';

// Auth
export {
  signUpWithEmail,
  signInWithGoogle,
  signOut,
  getSession,
  getCurrentUser,
  joinOrganization,
  createOrganization,
  onAuthStateChange,
  type AuthUser,
} from './auth';

// Sync
export {
  syncWellnessData,
  syncAlert,
  isOnline,
  SyncQueue,
  type MinuteRollup,
  type SyncResult,
} from './sync';

// Queries
export {
  getMyWellnessData,
  getMyDailyStats,
  getOrgMembers,
  getOrgWellnessStats,
  getDepartmentStats,
  getEmployeeWellnessData,
  getOrgAlerts,
  acknowledgeAlert,
  getOrgSettings,
  updateOrgSettings,
  exportUserData,
  requestAccountDeletion,
  cancelAccountDeletion,
  type WellnessRollup,
  type DailyStats,
  type TeamMember,
  type DepartmentStats,
  type OrgSettings,
  type AlertSettings,
} from './queries';
