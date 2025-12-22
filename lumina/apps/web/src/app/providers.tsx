'use client';

import { useEffect, useState, useMemo } from 'react';
import { setSupabaseClient, isSupabaseInitialized } from '@lumina/api';
import { createClient } from '@/lib/supabase/client';

export function Providers({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  // Create browser client once - this has proper cookie/session support
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // Share the browser client with the API package
    // This ensures all queries use the authenticated session
    if (!isSupabaseInitialized()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSupabaseClient(supabase as any);
    }
    setIsReady(true);
  }, [supabase]);

  // Show nothing while initializing to prevent hydration mismatch
  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}

// Re-export AuthProvider for dashboard pages
export { AuthProvider, useAuth } from './contexts/auth-context';
