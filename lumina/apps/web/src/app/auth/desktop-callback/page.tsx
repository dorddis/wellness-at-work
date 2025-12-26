'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

/**
 * Desktop OAuth Callback Page
 *
 * This page handles the OAuth callback for the desktop app.
 * Flow:
 * 1. User clicks "Sign in with Google" in desktop app
 * 2. Browser opens Google OAuth
 * 3. Google redirects here with tokens in URL hash
 * 4. This page shows "Open in Lumina?" prompt
 * 5. User clicks button to open desktop app via deep link
 */
export default function DesktopCallbackPage() {
  const [hasTokens, setHasTokens] = useState(false);
  const [deepLinkUrl, setDeepLinkUrl] = useState('');
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Extract tokens from URL hash (Supabase puts them there after OAuth)
    const hash = window.location.hash;

    if (!hash || hash.length < 2) {
      setError('No authentication data received. Please try again from the Lumina app.');
      return;
    }

    // Parse hash parameters
    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');

    if (!accessToken || !refreshToken) {
      setError('Invalid authentication response. Please try again from the Lumina app.');
      return;
    }

    // Build deep link URL with tokens
    const deepLink = `lumina://auth/callback#access_token=${accessToken}&refresh_token=${refreshToken}&type=${type || 'oauth'}`;
    setDeepLinkUrl(deepLink);
    setHasTokens(true);
  }, []);

  const handleOpenApp = () => {
    if (deepLinkUrl) {
      setOpened(true);
      window.location.href = deepLinkUrl;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {/* Logo */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto mb-4">
            <Image
              src="/icon.png"
              alt="Lumina"
              width={80}
              height={80}
              className="w-20 h-20"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Lumina</h1>
        </div>

        {error ? (
          <>
            <div className="mb-6">
              <div className="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Failed</h2>
              <p className="text-gray-600">{error}</p>
            </div>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Go to Homepage
            </a>
          </>
        ) : hasTokens ? (
          <>
            <div className="mb-6">
              <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {opened ? 'Opening Lumina...' : 'Authentication Successful!'}
              </h2>
              <p className="text-gray-600">
                {opened
                  ? 'The Lumina app should open now. You can close this tab.'
                  : 'Click the button below to open the Lumina desktop app and complete sign in.'}
              </p>
            </div>

            {!opened && (
              <button
                onClick={handleOpenApp}
                className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open Lumina App
              </button>
            )}

            {opened && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  Didn't work? Make sure Lumina is installed.
                </p>
                <button
                  onClick={handleOpenApp}
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Try again
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="py-8">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Processing authentication...</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            This page securely transfers your authentication to the Lumina desktop app.
          </p>
        </div>
      </div>
    </div>
  );
}
