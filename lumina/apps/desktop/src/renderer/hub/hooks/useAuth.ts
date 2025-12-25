/**
 * useAuth - Authentication state management hook
 * Handles auth check on mount, sign in/out, and dev mode bypass
 */

import { useState, useEffect, useCallback } from 'react';
import type { AuthUser } from '../types';

// Dev mode auth bypass
const BYPASS_AUTH = import.meta.env.VITE_BYPASS_AUTH === 'true';

// Mock user for dev mode (when VITE_BYPASS_AUTH=true)
const DEV_USER: AuthUser = {
  id: 'dev-user-00000000-0000-0000-0000-000000000000',
  email: 'dev@lumina.local',
  organization: {
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

  // Check auth on mount
  useEffect(() => {
    async function checkAuth() {
      // Dev mode bypass - skip auth entirely
      if (BYPASS_AUTH) {
        console.log('[Auth] Bypassing auth - using dev user');
        setAuthUser(DEV_USER);
        setAuthChecked(true);
        return;
      }

      try {
        const result = await window.lumina.auth.getUser();
        if (result.user && result.user.organization) {
          setAuthUser(result.user);
          // Set sync credentials
          await window.lumina.sync.setCredentials(
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
  }, []);

  // Handle auth complete (called after successful login)
  const handleAuthComplete = useCallback(async (user: AuthUser) => {
    setAuthUser(user);
    if (user.organization) {
      await window.lumina.sync.setCredentials(user.organization.id, user.id);
    }
  }, []);

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
