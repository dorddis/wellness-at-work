import React, { useState, useEffect } from 'react';
import luminaLogo from './assets/lumina-logo.png';

type AuthStep = 'email' | 'verify' | 'join-org' | 'google-waiting';

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Listen for deep link auth (from Google OAuth callback)
  useEffect(() => {
    const unsubSuccess = window.lumina.auth.onDeepLinkSuccess(async () => {
      // Deep link completed, check if user has org
      const userResult = await window.lumina.auth.getUser();
      if (userResult.user?.organization) {
        onAuthComplete(userResult.user);
      } else if (userResult.user) {
        setStep('join-org');
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
          // Need to join an organization
          setStep('join-org');
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
    <div className="h-full flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={luminaLogo} alt="Lumina" className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Lumina</h1>
          <p className="text-gray-500 mt-2">AI-powered wellness for your team</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
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
              className="w-full py-3 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
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
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">or</span>
              </div>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Work Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-3 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Sending...' : 'Continue with Email'}
              </button>
              <p className="text-center text-sm text-gray-500">
                We'll send you a verification code
              </p>
            </form>
          </div>
        )}

        {/* Google auth waiting state */}
        {step === 'google-waiting' && (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-600">
              Complete sign in with Google in your browser...
            </p>
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setError(null);
              }}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Step 2: OTP verification */}
        {step === 'verify' && (
          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600">
                We sent a code to <span className="font-medium">{email}</span>
              </p>
            </div>
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none text-center text-xl tracking-widest font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading || otpCode.length < 6}
              className="w-full py-3 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              className="w-full py-2 text-gray-600 hover:text-gray-900 text-sm"
            >
              Use a different email
            </button>
          </form>
        )}

        {/* Step 3: Join organization */}
        {step === 'join-org' && (
          <form onSubmit={handleJoinOrg} className="space-y-4">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">
                Account verified! Now join your organization.
              </p>
            </div>
            <div>
              <label htmlFor="invite" className="block text-sm font-medium text-gray-700 mb-1">
                Organization Invite Code
              </label>
              <input
                id="invite"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toLowerCase().trim())}
                placeholder="acme-corp"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ask your admin for the invite code
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || !inviteCode}
              className="w-full py-3 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Joining...' : 'Join Organization'}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          <p>By continuing, you agree to our Terms of Service</p>
        </div>
      </div>
    </div>
  );
}
