'use client';

import { useEffect, useState } from 'react';
import { initializeSupabase, isSupabaseInitialized } from '@lumina/api';

// Supabase config - in production these would be environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://acvmkigubzldhpyrlail.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdm1raWd1YnpsZGhweXJsYWlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNDI0ODIsImV4cCI6MjA4MTcxODQ4Mn0.K9qSjNvjl1Nmro06J5pDbWaWK3jcSGWOgigxe35fZ0k';

export function Providers({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize Supabase client if not already initialized
    if (!isSupabaseInitialized()) {
      initializeSupabase(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    setIsReady(true);
  }, []);

  // Show nothing while initializing to prevent hydration mismatch
  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}

// Re-export AuthProvider for dashboard pages
export { AuthProvider, useAuth } from './contexts/auth-context';
