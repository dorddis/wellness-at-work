import React, { useState } from 'react';
import luminaLogo from './assets/lumina-logo.png';

type AuthStep = 'email' | 'verify' | 'join-org';

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
              className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Sending...' : 'Continue with Email'}
            </button>
            <p className="text-center text-sm text-gray-500">
              We'll send you a verification code
            </p>
          </form>
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
              className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
