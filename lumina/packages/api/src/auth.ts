/**
 * Authentication Methods
 * Supabase Auth with organization membership
 */

import { getSupabase, Database } from './client';
import type { User, Session } from '@supabase/supabase-js';

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

/**
 * Sign up with email (magic link)
 */
export async function signUpWithEmail(email: string, redirectTo?: string): Promise<{ error: Error | null }> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo ?? (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined),
    },
  });
  return { error: error ? new Error(error.message) : null };
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(redirectTo?: string): Promise<{ error: Error | null }> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo ?? (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined),
    },
  });
  return { error: error ? new Error(error.message) : null };
}

/**
 * Sign out
 */
export async function signOut(): Promise<{ error: Error | null }> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();
  return { error: error ? new Error(error.message) : null };
}

/**
 * Get current session
 */
export async function getSession(): Promise<Session | null> {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Get current user with organization info
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = getSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  console.log('[getCurrentUser] Auth user:', user?.id);
  if (!user) return null;

  // Get organization membership (most recent if multiple)
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
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })
    .limit(1);

  console.log('[getCurrentUser] Memberships query result:', { memberships, error });

  const membership = memberships?.[0];
  console.log('[getCurrentUser] First membership:', membership);

  const org = membership?.organizations as {
    id: string;
    name: string;
    slug: string;
  } | null;
  console.log('[getCurrentUser] Org:', org);

  return {
    id: user.id,
    email: user.email ?? '',
    organization: org && membership
      ? {
          id: org.id,
          name: org.name,
          slug: org.slug,
          role: membership.role as 'admin' | 'manager' | 'employee',
        }
      : undefined,
  };
}

/**
 * Join an organization with invite code
 */
export async function joinOrganization(
  inviteCode: string
): Promise<{ orgId: string | null; error: Error | null }> {
  const supabase = getSupabase();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { orgId: null, error: new Error('Not authenticated') };
  }

  // Find organization by slug (invite code = slug for now)
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', inviteCode.toLowerCase())
    .single();

  if (orgError || !org) {
    return { orgId: null, error: new Error('Invalid invite code') };
  }

  // Add user to organization
  const { error: memberError } = await supabase.from('org_members').insert({
    org_id: org.id,
    user_id: user.id,
    role: 'employee',
    department: null,
  });

  if (memberError) {
    // Check if already a member
    if (memberError.code === '23505') {
      return { orgId: org.id, error: new Error('Already a member of this organization') };
    }
    return { orgId: null, error: new Error(memberError.message) };
  }

  return { orgId: org.id, error: null };
}

/**
 * Create a new organization (for admins)
 */
export async function createOrganization(
  name: string,
  slug: string
): Promise<{ orgId: string | null; error: Error | null }> {
  const supabase = getSupabase();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { orgId: null, error: new Error('Not authenticated') };
  }

  // Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name,
      slug: slug.toLowerCase(),
      privacy_mode: 'anonymous',
      subscription_tier: 'trial',
    })
    .select('id')
    .single();

  if (orgError) {
    if (orgError.code === '23505') {
      return { orgId: null, error: new Error('Organization slug already taken') };
    }
    return { orgId: null, error: new Error(orgError.message) };
  }

  // Add creator as admin
  await supabase.from('org_members').insert({
    org_id: org.id,
    user_id: user.id,
    role: 'admin',
    department: null,
  });

  return { orgId: org.id, error: null };
}

/**
 * Listen for auth state changes
 */
export function onAuthStateChange(
  callback: (user: User | null) => void
): () => void {
  const supabase = getSupabase();
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      callback(session?.user ?? null);
    }
  );
  return () => subscription.unsubscribe();
}
