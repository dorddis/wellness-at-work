/**
 * @lumina/api
 * Supabase client and API methods for Lumina platform
 */

// Client
export {
  initializeSupabase,
  setSupabaseClient,
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
  // Existing
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
  type ExportFormat,
  type ExportDataResult,
  requestAccountDeletion,
  cancelAccountDeletion,
  // Privacy Consent
  getPrivacyConsent,
  recordPrivacyConsent,
  // Data Access Requests
  submitDataAccessRequest,
  getMyDataAccessRequests,
  type DataRequestType,
  type DataRequestStatus,
  type DataAccessRequest,
  // Break Events
  getMyBreakEvents,
  getMyBreakStats,
  createBreakEvent,
  updateBreakEvent,
  // Eye Exercises
  getEyeExercises,
  getMyExerciseSessions,
  startExerciseSession,
  completeExerciseSession,
  // Team Challenges
  getTeamChallenges,
  getChallengeLeaderboard,
  createTeamChallenge,
  joinChallenge,
  // Analytics
  getOrgAnalytics,
  // Integrations
  getOrgIntegrations,
  connectIntegration,
  updateIntegrationConfig,
  disconnectIntegration,
  // Types - Existing
  type WellnessRollup,
  type DailyStats,
  type TeamMember,
  type DepartmentStats,
  type OrgSettings,
  type AlertSettings,
  // Types - Break Events
  type BreakEvent,
  type BreakStats,
  // Types - Eye Exercises
  type EyeExercise,
  type ExerciseSession,
  // Types - Team Challenges
  type TeamChallenge,
  type ChallengeParticipant,
  // Types - Analytics
  type AnalyticsMetrics,
  // Billing
  getBillingInfo,
  hasActiveAccess,
  // Types - Integrations
  type Integration,
  // Types - Billing
  type BillingInfo,
} from './queries';
