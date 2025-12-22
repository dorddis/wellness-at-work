'use client';

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Define AuthUser type locally to match API package
export interface AuthUser {
  id: string;
  email: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
    role: 'admin' | 'manager' | 'employee';
  };
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function loadUser() {
      try {
        console.log('[AuthContext] Loading user...');

        // Get auth user using the web app's Supabase client
        const { data: { user: authUser } } = await supabase.auth.getUser();
        console.log('[AuthContext] Auth user:', authUser?.id);

        if (!authUser) {
          console.log('[AuthContext] No user, redirecting to login');
          window.location.href = '/login';
          return;
        }

        // Get organization membership using the same client
        const { data: memberships, error } = await supabase
          .from('org_members')
          .select(`
            role,
            joined_at,
            organizations (
              id,
              name,
              slug
            )
          `)
          .eq('user_id', authUser.id)
          .order('joined_at', { ascending: false })
          .limit(1);

        console.log('[AuthContext] Memberships query result:', { memberships, error });

        const membership = memberships?.[0];
        // Supabase join returns single object for one-to-one relation
        const orgData = membership?.organizations;
        const org = (Array.isArray(orgData) ? orgData[0] : orgData) as {
          id: string;
          name: string;
          slug: string;
        } | null;

        const currentUser: AuthUser = {
          id: authUser.id,
          email: authUser.email ?? '',
          organization: org && membership
            ? {
                id: org.id,
                name: org.name,
                slug: org.slug,
                role: membership.role as 'admin' | 'manager' | 'employee',
              }
            : undefined,
        };

        console.log('[AuthContext] User loaded:', currentUser);
        setUser(currentUser);

        // If user but no org, redirect to onboarding
        if (!currentUser.organization) {
          console.log('[AuthContext] No organization found, redirecting to onboarding...');
          window.location.href = '/onboarding';
          return;
        }

        console.log('[AuthContext] User has org:', currentUser.organization.name);
      } catch (error) {
        console.error('[AuthContext] Failed to load user:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    loadUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          router.push('/login');
        } else if (event === 'SIGNED_IN' && session) {
          // Refresh user data without reloading (avoids infinite loop)
          loadUser();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
