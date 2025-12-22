'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// Singleton instance to ensure consistent auth state across app
let browserClient: SupabaseClient | null = null;

/**
 * Create a Supabase client for client-side operations
 * Use in Client Components
 * Returns singleton instance to ensure auth session is shared
 */
export function createClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}
