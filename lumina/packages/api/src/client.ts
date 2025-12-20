/**
 * Supabase Client Configuration
 * Multi-tenant B2B setup
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// Re-export Database type
export type { Database };

// Type helpers for our tables (convenience aliases)
export type Organization = Database['public']['Tables']['organizations']['Row'];
export type OrgMember = Database['public']['Tables']['org_members']['Row'];
export type WellnessData = Database['public']['Tables']['wellness_data']['Row'];
export type OrgAlert = Database['public']['Tables']['org_alerts']['Row'];

let supabaseClient: SupabaseClient<Database> | null = null;

/**
 * Initialize Supabase client
 * Call this once at app startup with your project credentials
 */
export function initializeSupabase(url: string, anonKey: string): SupabaseClient<Database> {
  supabaseClient = createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return supabaseClient;
}

/**
 * Get the Supabase client instance
 * Throws if not initialized
 */
export function getSupabase(): SupabaseClient<Database> {
  if (!supabaseClient) {
    throw new Error(
      'Supabase client not initialized. Call initializeSupabase() first.'
    );
  }
  return supabaseClient;
}

/**
 * Check if Supabase is initialized
 */
export function isSupabaseInitialized(): boolean {
  return supabaseClient !== null;
}
