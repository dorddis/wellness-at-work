'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase, getCurrentUser, signOut as apiSignOut, type AuthUser } from '@lumina/api';

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

  useEffect(() => {
    async function loadUser() {
      try {
        const authUser = await getCurrentUser();
        setUser(authUser);

        // If no user, redirect to login
        if (!authUser) {
          router.push('/login');
          return;
        }

        // If user but no org, redirect to onboarding
        if (!authUser.organization) {
          router.push('/onboarding');
          return;
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    loadUser();

    // Listen for auth changes
    const supabase = getSupabase();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          router.push('/login');
        } else if (event === 'SIGNED_IN' && session) {
          const authUser = await getCurrentUser();
          setUser(authUser);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const signOut = async () => {
    try {
      await apiSignOut();
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
