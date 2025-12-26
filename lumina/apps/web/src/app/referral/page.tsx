'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Gift, Copy, CheckCircle, Share2, Twitter, Linkedin } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

export default function ReferralPage() {
  const supabase = useMemo(() => createClient(), []);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUserInfo() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Generate referral code from user ID (first 8 chars)
        setReferralCode(`REF-${user.id.substring(0, 8).toUpperCase()}`);
        setUserName(user.email?.split('@')[0] || 'User');
      } catch (error) {
        console.error('Failed to load user info:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadUserInfo();
  }, [supabase]);

  const handleCopyCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const referralLink = referralCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${referralCode}`
    : '';

  const shareText = `I'm using Lumina to improve my eye health at work. Join with my referral code ${referralCode} and we both get a free month!`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Image
              src="/icon.png"
              alt="Lumina"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <span className="text-2xl font-bold">Lumina</span>
          </Link>
          <h1 className="text-2xl font-bold">Get a free month</h1>
          <p className="text-muted-foreground mt-2">
            Refer a friend and you both get 1 month free
          </p>
        </div>

        {isLoading ? (
          <div className="card p-8 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : referralCode ? (
          <div className="space-y-6">
            {/* Reward Info */}
            <div className="card p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Gift className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900">How it works</h3>
                  <ul className="text-sm text-amber-800 mt-2 space-y-1">
                    <li>1. Share your referral code with friends</li>
                    <li>2. They sign up using your code</li>
                    <li>3. You both get 1 month of Pro free!</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Referral Code */}
            <div className="card p-6">
              <label className="text-sm font-medium text-muted-foreground">Your Referral Code</label>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 bg-gray-100 rounded-lg px-4 py-3 font-mono text-lg font-semibold tracking-wider">
                  {referralCode}
                </div>
                <button
                  onClick={handleCopyCode}
                  className="btn btn-secondary p-3"
                  title="Copy code"
                >
                  {copied ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Share Options */}
            <div className="card p-6 space-y-4">
              <h3 className="font-medium">Share with friends</h3>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(referralLink);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Share2 className="w-5 h-5 text-gray-500" />
                <span className="flex-1 text-left">Copy referral link</span>
                {copied && <CheckCircle className="w-4 h-4 text-green-600" />}
              </button>

              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(referralLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Twitter className="w-5 h-5 text-gray-500" />
                <span className="flex-1 text-left">Share on Twitter</span>
              </a>

              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Linkedin className="w-5 h-5 text-gray-500" />
                <span className="flex-1 text-left">Share on LinkedIn</span>
              </a>
            </div>

            {/* Stats placeholder */}
            <div className="card p-6">
              <h3 className="font-medium mb-4">Your referrals</h3>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Referred</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Free months earned</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Not logged in */
          <div className="card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Sign in required</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Please sign in to access your referral code
            </p>
            <Link href="/login" className="btn btn-primary">
              Sign in
            </Link>
          </div>
        )}

        {/* Back link */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          <Link href="/dashboard" className="text-primary hover:underline">
            Back to dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
