'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Building2, Users, Loader2, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function OnboardingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create org state
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');

  // Join org state
  const [inviteCode, setInviteCode] = useState('');

  const supabase = createClient();

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName,
          slug: orgSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add user as admin
      const { error: memberError } = await supabase
        .from('org_members')
        .insert({
          org_id: org.id,
          user_id: user.id,
          role: 'admin',
        });

      if (memberError) throw memberError;

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Find organization by slug (invite code)
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', inviteCode.toLowerCase())
        .single();

      if (orgError || !org) throw new Error('Organization not found. Check your invite code.');

      // Add user as employee
      const { error: memberError } = await supabase
        .from('org_members')
        .insert({
          org_id: org.id,
          user_id: user.id,
          role: 'employee',
        });

      if (memberError) {
        if (memberError.code === '23505') {
          throw new Error('You are already a member of this organization');
        }
        throw memberError;
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join organization');
    } finally {
      setIsLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  if (mode === 'create') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <button
            onClick={() => setMode('choose')}
            className="text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            Back
          </button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Create your organization</h1>
            <p className="text-muted-foreground mt-2">
              Set up wellness tracking for your team
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateOrg} className="space-y-4">
            <div>
              <label htmlFor="orgName" className="label">Organization name</label>
              <input
                id="orgName"
                type="text"
                value={orgName}
                onChange={(e) => {
                  setOrgName(e.target.value);
                  setOrgSlug(generateSlug(e.target.value));
                }}
                placeholder="Acme Inc."
                required
                className="input"
              />
            </div>
            <div>
              <label htmlFor="orgSlug" className="label">
                Invite code (employees will use this to join)
              </label>
              <input
                id="orgSlug"
                type="text"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
                placeholder="acme-inc"
                required
                className="input"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Share this code with your team members
              </p>
            </div>
            <button
              type="submit"
              disabled={isLoading || !orgName || !orgSlug}
              className="btn btn-primary w-full py-3"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create Organization
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <button
            onClick={() => setMode('choose')}
            className="text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            Back
          </button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Join your organization</h1>
            <p className="text-muted-foreground mt-2">
              Enter the invite code from your admin
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleJoinOrg} className="space-y-4">
            <div>
              <label htmlFor="inviteCode" className="label">Invite code</label>
              <input
                id="inviteCode"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="acme-inc"
                required
                className="input"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !inviteCode}
              className="btn btn-primary w-full py-3"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  Join Organization
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <Eye className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold">Lumina</span>
          </div>
          <h1 className="text-2xl font-bold">Welcome!</h1>
          <p className="text-muted-foreground mt-2">
            How would you like to get started?
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setMode('create')}
            className="w-full p-6 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Create an organization</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Set up wellness tracking for your team. You will be the admin.
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setMode('join')}
            className="w-full p-6 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Join an organization</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your admin should have given you an invite code.
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
