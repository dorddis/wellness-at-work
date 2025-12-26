import React, { useState, useEffect } from 'react';
import luminaLogo from './assets/lumina-logo.png';

type AuthStep = 'email' | 'verify' | 'org-choice' | 'join-org' | 'create-org' | 'google-waiting';

interface AuthScreenProps {
  onAuthComplete: (user: AuthUser) => void;
}

interface AuthUser {
  id: string;
  email: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    role: 'admin' | 'manager' | 'employee';
    department: string | null;
  } | null;
}

export default function AuthScreen({ onAuthComplete }: AuthScreenProps) {
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if user is already authenticated but has no org (e.g., from previous session)
  useEffect(() => {
    async function checkExistingSession() {
      try {
        const userResult = await window.lumina.auth.getUser();
        if (userResult.user && !userResult.user.organization) {
          // User is authenticated but has no org - go to org choice
          setStep('org-choice');
        }
      } catch {
        // No session or error - stay on email step
      }
    }
    checkExistingSession();
  }, []);

  // Listen for deep link auth (from Google OAuth callback)
  useEffect(() => {
    const unsubSuccess = window.lumina.auth.onDeepLinkSuccess(async () => {
      // Deep link completed, check if user has org
      const userResult = await window.lumina.auth.getUser();
      if (userResult.user?.organization) {
        onAuthComplete(userResult.user);
      } else if (userResult.user) {
        setStep('org-choice');
      }
    });

    const unsubError = window.lumina.auth.onDeepLinkError((data) => {
      setError(data.error);
      setStep('email');
    });

    return () => {
      unsubSuccess();
      unsubError();
    };
  }, [onAuthComplete]);

  // Handle Google sign in
  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await window.lumina.auth.signInWithGoogle();
      if (result.success) {
        setStep('google-waiting');
      } else {
        setError(result.error ?? 'Failed to start Google sign in');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Handle email submission - send OTP
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await window.lumina.auth.sendOtp(email);
      if (result.success) {
        setStep('verify');
      } else {
        setError(result.error ?? 'Failed to send verification code');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP verification
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await window.lumina.auth.verifyOtp(email, otpCode);
      if (result.success) {
        // Check if user has an organization
        const userResult = await window.lumina.auth.getUser();
        if (userResult.user?.organization) {
          // User already in an org - complete auth
          onAuthComplete(userResult.user);
        } else {
          // Need to choose organization option
          setStep('org-choice');
        }
      } else {
        setError(result.error ?? 'Invalid verification code');
      }
    } catch (err) {
      setError('Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  // Handle personal use
  const handleUsePersonal = async () => {
    setError(null);
    setLoading(true);

    try {
      const result = await window.lumina.auth.usePersonal();
      if (result.success) {
        const userResult = await window.lumina.auth.getUser();
        if (userResult.user) {
          onAuthComplete(userResult.user);
        } else {
          setError('Failed to load user data');
        }
      } else {
        setError(result.error ?? 'Failed to set up personal space');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Handle organization creation
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await window.lumina.auth.createOrg(orgName);
      if (result.success) {
        const userResult = await window.lumina.auth.getUser();
        if (userResult.user) {
          onAuthComplete(userResult.user);
        } else {
          setError('Failed to load user data');
        }
      } else {
        setError(result.error ?? 'Failed to create organization');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Handle organization join
  const handleJoinOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await window.lumina.auth.joinOrg(inviteCode);
      if (result.success) {
        // Fetch updated user with org info
        const userResult = await window.lumina.auth.getUser();
        if (userResult.user) {
          onAuthComplete(userResult.user);
        } else {
          setError('Failed to load user data');
        }
      } else {
        setError(result.error ?? 'Invalid invite code');
      }
    } catch (err) {
      setError('Failed to join organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={luminaLogo} alt="Lumina" className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Welcome to Lumina</h1>
          <p className="text-muted-foreground mt-2">AI-powered wellness for your team</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Email input */}
        {step === 'email' && (
          <div className="space-y-4">
            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 bg-card border border-border rounded-lg font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {loading ? 'Opening...' : 'Continue with Google'}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-background text-muted-foreground">or</span>
              </div>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-3 border border-border bg-background rounded-lg focus:ring-2 focus:ring-foreground/20 focus:border-foreground/50 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-3 bg-neutral-900 dark:bg-neutral-200 text-white dark:text-neutral-900 rounded-lg font-medium hover:bg-neutral-800 dark:hover:bg-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Sending...' : 'Continue with Email'}
              </button>
              <p className="text-center text-sm text-muted-foreground">
                We'll send you a verification code
              </p>
            </form>
          </div>
        )}

        {/* Google auth waiting state */}
        {step === 'google-waiting' && (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-border border-t-foreground rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">
              Complete sign in with Google in your browser...
            </p>
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setError(null);
              }}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Step 2: OTP verification */}
        {step === 'verify' && (
          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">
                We sent a code to <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>
            <div>
              <label htmlFor="otp" className="block text-sm font-medium mb-1">
                Verification Code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="12345678"
                required
                autoFocus
                className="w-full px-4 py-3 border border-border bg-background rounded-lg focus:ring-2 focus:ring-foreground/20 focus:border-foreground/50 outline-none text-center text-xl tracking-widest font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading || otpCode.length < 6}
              className="w-full py-3 bg-neutral-900 dark:bg-neutral-200 text-white dark:text-neutral-900 rounded-lg font-medium hover:bg-neutral-800 dark:hover:bg-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setOtpCode('');
                setError(null);
              }}
              className="w-full py-2 text-muted-foreground hover:text-foreground text-sm"
            >
              Use a different email
            </button>
          </form>
        )}

        {/* Step 3: Organization choice */}
        {step === 'org-choice' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-950/50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">
                Account verified! How would you like to use Lumina?
              </p>
            </div>

            {/* Option 1: Personal Use */}
            <button
              type="button"
              onClick={handleUsePersonal}
              disabled={loading}
              className="w-full p-4 border border-border rounded-lg hover:bg-muted transition-colors text-left group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium group-hover:text-foreground">Use Personally</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    For individual use, freelancers, or trying out Lumina
                  </p>
                </div>
                <svg className="w-5 h-5 text-muted-foreground group-hover:text-foreground mt-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Option 2: Create Organization */}
            <button
              type="button"
              onClick={() => setStep('create-org')}
              disabled={loading}
              className="w-full p-4 border border-border rounded-lg hover:bg-muted transition-colors text-left group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-950/50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium group-hover:text-foreground">Create Organization</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Set up Lumina for your team or company
                  </p>
                </div>
                <svg className="w-5 h-5 text-muted-foreground group-hover:text-foreground mt-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Option 3: Join Organization */}
            <button
              type="button"
              onClick={() => setStep('join-org')}
              disabled={loading}
              className="w-full p-4 border border-border rounded-lg hover:bg-muted transition-colors text-left group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-950/50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium group-hover:text-foreground">Join Organization</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Join your team with an invite code from your admin
                  </p>
                </div>
                <svg className="w-5 h-5 text-muted-foreground group-hover:text-foreground mt-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {loading && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-border border-t-foreground rounded-full animate-spin"></div>
                Setting up your account...
              </div>
            )}
          </div>
        )}

        {/* Step 3a: Create organization form */}
        {step === 'create-org' && (
          <form onSubmit={handleCreateOrg} className="space-y-4">
            <div className="text-center mb-4">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-950/50 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="font-medium">Create Your Organization</h2>
              <p className="text-sm text-muted-foreground mt-1">
                You'll be the admin and can invite your team
              </p>
            </div>
            <div>
              <label htmlFor="orgName" className="block text-sm font-medium mb-1">
                Organization Name
              </label>
              <input
                id="orgName"
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Corporation"
                required
                autoFocus
                className="w-full px-4 py-3 border border-border bg-background rounded-lg focus:ring-2 focus:ring-foreground/20 focus:border-foreground/50 outline-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your team members will use this name to find your organization
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || !orgName.trim()}
              className="w-full py-3 bg-neutral-900 dark:bg-neutral-200 text-white dark:text-neutral-900 rounded-lg font-medium hover:bg-neutral-800 dark:hover:bg-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create Organization'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('org-choice');
                setOrgName('');
                setError(null);
              }}
              className="w-full py-2 text-muted-foreground hover:text-foreground text-sm"
            >
              Back to options
            </button>
          </form>
        )}

        {/* Step 3b: Join organization form */}
        {step === 'join-org' && (
          <form onSubmit={handleJoinOrg} className="space-y-4">
            <div className="text-center mb-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-950/50 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="font-medium">Join Your Organization</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enter the invite code from your admin
              </p>
            </div>
            <div>
              <label htmlFor="invite" className="block text-sm font-medium mb-1">
                Organization Invite Code
              </label>
              <input
                id="invite"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toLowerCase().trim())}
                placeholder="acme-corp"
                required
                autoFocus
                className="w-full px-4 py-3 border border-border bg-background rounded-lg focus:ring-2 focus:ring-foreground/20 focus:border-foreground/50 outline-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ask your admin for the invite code if you don't have one
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || !inviteCode}
              className="w-full py-3 bg-neutral-900 dark:bg-neutral-200 text-white dark:text-neutral-900 rounded-lg font-medium hover:bg-neutral-800 dark:hover:bg-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Joining...' : 'Join Organization'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('org-choice');
                setInviteCode('');
                setError(null);
              }}
              className="w-full py-2 text-muted-foreground hover:text-foreground text-sm"
            >
              Back to options
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>By continuing, you agree to our Terms of Service</p>
        </div>
      </div>
    </div>
  );
}
