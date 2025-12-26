/**
 * useAuth - Authentication state management hook
 * Handles auth check on mount, sign in/out, and dev mode bypass
 */

import { useState, useEffect, useCallback } from 'react';
import { useSettingsStore } from '@lumina/ui';
import type { AuthUser } from '../types';
import { SyncService } from '../services';

// Dev mode auth bypass
const BYPASS_AUTH = import.meta.env.VITE_BYPASS_AUTH === 'true';

// Test org choice screen (set to true to show org-choice after bypass auth)
const TEST_ORG_CHOICE = import.meta.env.VITE_TEST_ORG_CHOICE === 'true';

// Force onboarding reset on every login (for demos)
// TODO: Set to false after demo period
const FORCE_ONBOARDING = true;

// Mock user for dev mode (when VITE_BYPASS_AUTH=true)
// If TEST_ORG_CHOICE=true, user has no org (triggers org-choice screen)
const DEV_USER: AuthUser = {
  id: 'dev-user-00000000-0000-0000-0000-000000000000',
  email: 'dev@lumina.local',
  organization: TEST_ORG_CHOICE ? null : {
    id: 'dev-org-00000000-0000-0000-0000-000000000000',
    name: 'Development Org',
    slug: 'dev-org',
    role: 'admin',
    department: null,
  },
};

export interface UseAuthReturn {
  authUser: AuthUser | null;
  authChecked: boolean;
  handleAuthComplete: (user: AuthUser) => Promise<void>;
  handleSignOut: () => Promise<void>;
}

/**
 * Hook for managing authentication state
 * - Checks auth on mount (or uses dev user if BYPASS_AUTH=true)
 * - Sets sync credentials when user authenticates
 * - Provides callbacks for auth complete and sign out
 */
export function useAuth(): UseAuthReturn {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const resetForNewUser = useSettingsStore((s) => s.resetForNewUser);

  // Check auth on mount
  useEffect(() => {
    async function checkAuth() {
      // Dev mode bypass - skip auth entirely
      if (BYPASS_AUTH) {
        console.log('[Auth] Bypassing auth - using dev user');
        // Force reset onboarding every time in dev mode (for demos)
        resetForNewUser(DEV_USER.id, true);
        setAuthUser(DEV_USER);
        setAuthChecked(true);
        return;
      }

      try {
        const result = await window.lumina.auth.getUser();
        if (result.user && result.user.organization) {
          // Reset onboarding for new user (or force for demos)
          resetForNewUser(result.user.id, FORCE_ONBOARDING);
          setAuthUser(result.user);
          // Set sync credentials
          await SyncService.setCredentials(
            result.user.organization.id,
            result.user.id
          );
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        setAuthChecked(true);
      }
    }
    checkAuth();
  }, [resetForNewUser]);

  // Handle auth complete (called after successful login)
  const handleAuthComplete = useCallback(async (user: AuthUser) => {
    // Reset onboarding for new user (or force for demos)
    resetForNewUser(user.id, FORCE_ONBOARDING);
    setAuthUser(user);
    if (user.organization) {
      await SyncService.setCredentials(user.organization.id, user.id);
    }
  }, [resetForNewUser]);

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    await window.lumina.auth.signOut();
    setAuthUser(null);
  }, []);

  return {
    authUser,
    authChecked,
    handleAuthComplete,
    handleSignOut,
  };
}
