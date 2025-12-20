'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, Users, Loader2, CheckCircle } from 'lucide-react';
import { getSupabase, isSupabaseInitialized, initializeSupabase } from '@lumina/api';

export default function JoinPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgInfo, setOrgInfo] = useState<{ id: string; name: string; memberCount: number } | null>(null);

  const handleVerifyCode = async () => {
    if (!inviteCode) return;

    setIsLoading(true);
    setError(null);

    try {
      // Initialize Supabase if needed
      if (!isSupabaseInitialized()) {
        initializeSupabase(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
      }

      const supabase = getSupabase();

      // Query organization by slug (invite code = slug in uppercase)
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .ilike('slug', inviteCode.toLowerCase())
        .single();

      if (orgError || !org) {
        throw new Error('Invalid invite code. Please check and try again.');
      }

      // Count members in this organization
      const { count } = await supabase
        .from('org_members')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', org.id);

      setOrgInfo({
        id: org.id,
        name: org.name,
        memberCount: count ?? 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid invite code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgInfo) return;

    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabase();

      // Send magic link (OTP) to email
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          data: {
            org_id: orgInfo.id,
            org_name: orgInfo.name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?org_id=${orgInfo.id}`,
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      // Show success message and redirect to check email page
      router.push(`/auth/check-email?email=${encodeURIComponent(email)}&org=${encodeURIComponent(orgInfo.name)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join organization');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Eye className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold">Lumina</span>
          </Link>
          <h1 className="text-2xl font-bold">Join your organization</h1>
          <p className="text-muted-foreground mt-2">
            Enter the invite code from your employer
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!orgInfo ? (
          /* Invite Code Input */
          <div className="space-y-4">
            <div>
              <label htmlFor="code" className="label">
                Invite Code
              </label>
              <div className="flex gap-2">
                <input
                  id="code"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="ACME-2024"
                  className="input flex-1 font-mono uppercase"
                />
                <button
                  onClick={handleVerifyCode}
                  disabled={isLoading || !inviteCode}
                  className="btn btn-primary"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Verify'
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Organization Found */
          <div className="space-y-6">
            <div className="card p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold">{orgInfo.name}</h2>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                <Users className="w-4 h-4" />
                {orgInfo.memberCount} members
              </p>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label htmlFor="email" className="label">
                  Your work email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="input"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !email}
                className="btn btn-primary w-full py-3"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  'Join Organization'
                )}
              </button>
            </form>

            <button
              onClick={() => setOrgInfo(null)}
              className="w-full text-sm text-muted-foreground hover:text-foreground"
            >
              Use a different code
            </button>
          </div>
        )}

        {/* Sign in link */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
