import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function SubscriptionExpiredPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-amber-600" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Subscription Required</h1>
          <p className="text-muted-foreground">
            Your organization&apos;s trial has expired or subscription is inactive.
            Please contact your organization admin to subscribe and restore access.
          </p>
        </div>

        <div className="pt-4">
          <Link
            href="/login"
            className="text-sm text-primary hover:underline"
          >
            Sign in with a different account
          </Link>
        </div>
      </div>
    </div>
  );
}
