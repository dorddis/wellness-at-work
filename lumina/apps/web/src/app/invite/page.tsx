'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Eye, Users, Copy, CheckCircle, Mail, Share2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function InvitePage() {
  const supabase = useMemo(() => createClient(), []);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOrgInfo() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Get user's organization
        const { data: member } = await supabase
          .from('org_members')
          .select('org_id, organizations(name, slug)')
          .eq('user_id', user.id)
          .single();

        if (member?.organizations) {
          const org = member.organizations as unknown as { name: string; slug: string };
          setOrgName(org.name);
          setInviteCode(org.slug.toUpperCase());
        }
      } catch (error) {
        console.error('Failed to load org info:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadOrgInfo();
  }, [supabase]);

  const handleCopyCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/join?code=${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const joinLink = inviteCode ? `${typeof window !== 'undefined' ? window.location.origin : ''}/join?code=${inviteCode}` : '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Eye className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold">Lumina</span>
          </Link>
          <h1 className="text-2xl font-bold">Invite your team</h1>
          <p className="text-muted-foreground mt-2">
            Share this code with colleagues to join your organization
          </p>
        </div>

        {isLoading ? (
          <div className="card p-8 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : inviteCode ? (
          <div className="space-y-6">
            {/* Organization Info */}
            <div className="card p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold">{orgName}</h2>
              <p className="text-sm text-muted-foreground mt-1">Your organization</p>
            </div>

            {/* Invite Code */}
            <div className="card p-6">
              <label className="text-sm font-medium text-muted-foreground">Invite Code</label>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 bg-gray-100 rounded-lg px-4 py-3 font-mono text-lg font-semibold tracking-wider">
                  {inviteCode}
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
              <h3 className="font-medium">Share via</h3>

              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Share2 className="w-5 h-5 text-gray-500" />
                <span className="flex-1 text-left">Copy invite link</span>
                {copied && <CheckCircle className="w-4 h-4 text-green-600" />}
              </button>

              <a
                href={`mailto:?subject=Join ${orgName} on Lumina&body=Join our team's wellness program on Lumina!%0A%0AUse invite code: ${inviteCode}%0A%0AOr click this link: ${joinLink}`}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Mail className="w-5 h-5 text-gray-500" />
                <span className="flex-1 text-left">Send via email</span>
              </a>
            </div>

            {/* Instructions */}
            <div className="text-sm text-muted-foreground text-center space-y-1">
              <p>Team members can join at:</p>
              <Link href="/join" className="text-primary hover:underline font-medium">
                {typeof window !== 'undefined' ? window.location.origin : ''}/join
              </Link>
            </div>
          </div>
        ) : (
          /* Not logged in */
          <div className="card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Sign in required</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Please sign in to access your organization's invite code
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
