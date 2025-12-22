'use client';

import { useState, useEffect, useMemo } from 'react';
import { Eye, Building2, Users, Loader2, ArrowLeft, User, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Step = 'loading' | 'choice' | 'individual' | 'team-choice' | 'team-join' | 'team-create';

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDashboardLink, setShowDashboardLink] = useState(false); // Show "Go to Dashboard" on certain errors
  const [userEmail, setUserEmail] = useState<string>('');

  // Existing org check
  const [hasExistingOrg, setHasExistingOrg] = useState(false);
  const [existingOrgName, setExistingOrgName] = useState<string | null>(null);

  // Team create state
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');

  // Team join state
  const [inviteCode, setInviteCode] = useState('');

  const supabase = useMemo(() => createClient(), []);

  // Check auth and existing org on mount
  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = '/login';
          return;
        }

        setUserEmail(user.email || '');

        // Check for existing org membership
        const { data: memberships } = await supabase
          .from('org_members')
          .select(`org_id, organizations (name)`)
          .eq('user_id', user.id)
          .order('joined_at', { ascending: false })
          .limit(1);

        if (memberships && memberships.length > 0) {
          setHasExistingOrg(true);
          const orgData = memberships[0].organizations;
          const org = (Array.isArray(orgData) ? orgData[0] : orgData) as { name: string } | null;
          setExistingOrgName(org?.name || 'your workspace');
        }

        setStep('choice');
      } catch (err) {
        console.error('Init error:', err);
        setStep('choice');
      }
    }

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  // Create personal workspace for individual users
  const handleIndividualSetup = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create a personal workspace
      const personalName = `${user.email?.split('@')[0]}'s Workspace`;
      const personalSlug = `personal-${user.id.slice(0, 8)}`;

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: personalName,
          slug: personalSlug,
          privacy_mode: 'named', // Individual doesn't need anonymity
        })
        .select()
        .single();

      if (orgError) {
        // If personal workspace already exists, just go to dashboard
        if (orgError.code === '23505') {
          window.location.href = '/dashboard';
          return;
        }
        throw orgError;
      }

      const { error: memberError } = await supabase
        .from('org_members')
        .insert({
          org_id: org.id,
          user_id: user.id,
          role: 'admin',
        });

      if (memberError) {
        // If already a member, just go to dashboard
        if (memberError.code === '23505') {
          window.location.href = '/dashboard';
          return;
        }
        throw memberError;
      }

      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
      setShowDashboardLink(true); // Show dashboard link on any error for individual
      setIsLoading(false);
    }
  };

  // Create team organization
  const handleTeamCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName,
          slug: orgSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        })
        .select()
        .single();

      if (orgError) {
        if (orgError.code === '23505') throw new Error('This team URL is already taken');
        throw orgError;
      }

      const { error: memberError } = await supabase
        .from('org_members')
        .insert({
          org_id: org.id,
          user_id: user.id,
          role: 'admin',
        });

      if (memberError) throw memberError;

      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team');
      setIsLoading(false);
    }
  };

  // Join existing team
  const handleTeamJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('slug', inviteCode.toLowerCase().trim())
        .single();

      if (orgError || !org) throw new Error('Invalid invite code. Please check and try again.');

      const { error: memberError } = await supabase
        .from('org_members')
        .insert({
          org_id: org.id,
          user_id: user.id,
          role: 'employee',
        });

      if (memberError) {
        if (memberError.code === '23505') {
          setError('You are already a member of this team');
          setShowDashboardLink(true);
          setIsLoading(false);
          return;
        }
        throw memberError;
      }

      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join team');
      setShowDashboardLink(false);
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const goBack = () => {
    setError(null);
    setShowDashboardLink(false);
    if (step === 'team-join' || step === 'team-create') {
      setStep('team-choice');
    } else if (step === 'team-choice' || step === 'individual') {
      setStep('choice');
    }
  };

  // Loading state
  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Individual setup confirmation
  if (step === 'individual') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <button onClick={goBack} className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Personal Wellness Tracking</h1>
            <p className="text-muted-foreground mt-2">
              We'll create a personal workspace just for you.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <p>{error}</p>
              {showDashboardLink && (
                <button
                  onClick={() => { window.location.href = '/dashboard'; }}
                  className="inline-block mt-3 text-primary font-medium hover:underline"
                >
                  Go to Dashboard →
                </button>
              )}
            </div>
          )}

          {!showDashboardLink && (
            <>
              <div className="card p-6 mb-6">
                <h3 className="font-medium mb-2">What you'll get:</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>* Track your blink rate and eye wellness</li>
                  <li>* Get personalized break reminders</li>
                  <li>* View your wellness trends over time</li>
                  <li>* All data stays private to you</li>
                </ul>
              </div>

              <button
                onClick={handleIndividualSetup}
                disabled={isLoading}
                className="btn btn-primary w-full py-3"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating workspace...</>
                ) : (
                  'Get Started'
                )}
              </button>
            </>
          )}

          {showDashboardLink && (
            <button
              onClick={() => { window.location.href = '/dashboard'; }}
              className="btn btn-primary w-full py-3 text-center block"
            >
              Open Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  // Team choice: join or create
  if (step === 'team-choice') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <button onClick={goBack} className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Team Setup</h1>
            <p className="text-muted-foreground mt-2">
              Join your team or create a new one
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => { setStep('team-join'); setError(null); }}
              className="w-full p-5 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
            >
              <h3 className="font-semibold">Join existing team</h3>
              <p className="text-sm text-muted-foreground mt-1">
                I have an invite code from my admin
              </p>
            </button>

            <button
              onClick={() => { setStep('team-create'); setError(null); }}
              className="w-full p-5 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
            >
              <h3 className="font-semibold">Create new team</h3>
              <p className="text-sm text-muted-foreground mt-1">
                I'm setting up wellness tracking for my organization
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Team join form
  if (step === 'team-join') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <button onClick={goBack} className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Join Your Team</h1>
            <p className="text-muted-foreground mt-2">
              Enter the invite code from your admin
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <p>{error}</p>
              {showDashboardLink && (
                <button
                  onClick={() => { window.location.href = '/dashboard'; }}
                  className="inline-block mt-3 text-primary font-medium hover:underline"
                >
                  Go to Dashboard →
                </button>
              )}
            </div>
          )}

          {!showDashboardLink && (
            <form onSubmit={handleTeamJoin} className="space-y-4">
              <div>
                <label htmlFor="inviteCode" className="label">Invite Code</label>
                <input
                  id="inviteCode"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="e.g., acme-inc"
                  required
                  className="input"
                  autoFocus
                />
              </div>
              <button type="submit" disabled={isLoading || !inviteCode.trim()} className="btn btn-primary w-full py-3">
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Joining...</>
                ) : (
                  'Join Team'
                )}
              </button>
            </form>
          )}

          {showDashboardLink && (
            <button
              onClick={() => { window.location.href = '/dashboard'; }}
              className="btn btn-primary w-full py-3 text-center block"
            >
              Open Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  // Team create form
  if (step === 'team-create') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <button onClick={goBack} className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Create Your Team</h1>
            <p className="text-muted-foreground mt-2">
              Set up wellness tracking for your organization
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleTeamCreate} className="space-y-4">
            <div>
              <label htmlFor="orgName" className="label">Team Name</label>
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
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="orgSlug" className="label">Team URL / Invite Code</label>
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
                Share this code with your team members to join
              </p>
            </div>
            <button type="submit" disabled={isLoading || !orgName || !orgSlug} className="btn btn-primary w-full py-3">
              {isLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
              ) : (
                'Create Team'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main choice screen
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <Eye className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold">Lumina</span>
          </div>
          <h1 className="text-2xl font-bold">Welcome!</h1>
          <p className="text-muted-foreground mt-2">
            How will you be using Lumina?
          </p>
        </div>

        {/* Existing org shortcut */}
        {hasExistingOrg && (
          <>
            <button
              onClick={() => { window.location.href = '/dashboard'; }}
              className="w-full p-5 rounded-lg border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-colors text-left block mb-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Eye className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-primary">Continue to Dashboard</h3>
                  <p className="text-sm text-muted-foreground">{existingOrgName}</p>
                </div>
              </div>
            </button>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-background text-muted-foreground">Or set up a new workspace</span>
              </div>
            </div>
          </>
        )}

        {/* Main options */}
        <div className="space-y-4">
          <button
            onClick={() => setStep('individual')}
            className="w-full p-5 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Just for me</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Personal wellness tracking for individual use
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setStep('team-choice')}
            className="w-full p-5 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">For my team</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Join or create an organization for team wellness
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Signed in as {userEmail}</p>
          <button onClick={handleSignOut} className="text-primary hover:underline mt-1">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
