'use client';

import { useState, useEffect } from 'react';
import {
  CreditCard,
  Users,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Loader2,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { CreemCheckout, CreemPortal } from '@creem_io/nextjs';
import { getBillingInfo, type BillingInfo } from '@lumina/api';
import { useAuth } from '../../../providers';

const CREEM_PRODUCT_STARTER = 'prod_56nknnNggE72huMOUqTjfe';
const CREEM_PRODUCT_PRO = 'prod_76B3Bss2pIZmPSTVEqJJud';

function StatusBadge({ status }: { status: BillingInfo['subscriptionStatus'] }) {
  const config = {
    trialing: { icon: Clock, label: 'Trial', className: 'bg-blue-100 text-blue-800' },
    active: { icon: CheckCircle2, label: 'Active', className: 'bg-green-100 text-green-800' },
    past_due: { icon: AlertTriangle, label: 'Past Due', className: 'bg-amber-100 text-amber-800' },
    canceled: { icon: XCircle, label: 'Canceled', className: 'bg-red-100 text-red-800' },
    expired: { icon: XCircle, label: 'Expired', className: 'bg-red-100 text-red-800' },
    paused: { icon: Clock, label: 'Paused', className: 'bg-gray-100 text-gray-800' },
    unpaid: { icon: AlertTriangle, label: 'Unpaid', className: 'bg-red-100 text-red-800' },
  }[status] ?? { icon: Clock, label: status, className: 'bg-gray-100 text-gray-800' };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.className}`}>
      <Icon className="w-4 h-4" />
      {config.label}
    </span>
  );
}

function PlanCard({
  name,
  price,
  priceDetail,
  features,
  productId,
  orgId,
  userEmail,
  isCurrent,
  isUpgrade,
  seatCount,
}: {
  name: string;
  price: string;
  priceDetail: string;
  features: string[];
  productId: string;
  orgId: string;
  userEmail: string;
  isCurrent: boolean;
  isUpgrade: boolean;
  seatCount: number;
}) {
  return (
    <div className={`rounded-xl border p-6 ${isCurrent ? 'border-primary bg-primary/5' : 'border-border'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{name}</h3>
        {isCurrent && (
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary text-primary-foreground">
            Current Plan
          </span>
        )}
      </div>
      <div className="mb-4">
        <span className="text-3xl font-bold">{price}</span>
        <span className="text-muted-foreground">{priceDetail}</span>
      </div>
      <ul className="space-y-2 mb-6">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      {!isCurrent && (
        <CreemCheckout
          productId={productId}
          units={seatCount || 1}
          referenceId={orgId}
          customer={{ email: userEmail, name: '' }}
          successUrl="/admin/billing?success=true"
          metadata={{ orgId, plan: name.toLowerCase() }}
        >
          <button className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-colors ${
            isUpgrade
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-secondary text-foreground hover:bg-secondary/80'
          }`}>
            {isUpgrade ? 'Upgrade' : 'Switch Plan'}
          </button>
        </CreemCheckout>
      )}
    </div>
  );
}

export default function BillingPage() {
  const { user } = useAuth();
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  const orgId = user?.organization?.id;

  useEffect(() => {
    // Check for success param
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('success') === 'true') {
        setShowSuccess(true);
        // Clean URL
        window.history.replaceState({}, '', '/admin/billing');
      }
    }
  }, []);

  useEffect(() => {
    async function loadBilling() {
      if (!orgId) return;
      try {
        const info = await getBillingInfo(orgId);
        setBilling(info);
      } catch (err) {
        console.error('Failed to load billing info:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadBilling();
  }, [orgId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!billing || !orgId) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Failed to load billing information.
      </div>
    );
  }

  const userEmail = user?.email ?? '';
  const isTrialing = billing.subscriptionStatus === 'trialing';
  const isActive = billing.subscriptionStatus === 'active';
  const needsPayment = !isActive && !isTrialing;
  const trialExpired = isTrialing && billing.trialDaysLeft !== null && billing.trialDaysLeft <= 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground mt-1">Manage your subscription and billing details.</p>
      </div>

      {/* Success banner */}
      {showSuccess && (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Payment successful!</p>
            <p className="text-sm">Your subscription is now active. It may take a moment to update.</p>
          </div>
        </div>
      )}

      {/* Trial warning */}
      {isTrialing && !trialExpired && billing.trialDaysLeft !== null && billing.trialDaysLeft <= 5 && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Your trial ends in {billing.trialDaysLeft} day{billing.trialDaysLeft !== 1 ? 's' : ''}</p>
            <p className="text-sm">Subscribe to keep access to all features.</p>
          </div>
        </div>
      )}

      {/* Trial expired */}
      {trialExpired && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-center gap-3">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Your trial has expired</p>
            <p className="text-sm">Subscribe below to restore access.</p>
          </div>
        </div>
      )}

      {/* Current plan overview */}
      <div className="rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Current Plan
          </h2>
          <StatusBadge status={billing.subscriptionStatus} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Plan</p>
            <p className="text-lg font-semibold capitalize">{billing.subscriptionTier}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Seats
            </p>
            <p className="text-lg font-semibold">
              {billing.seatCount} / {billing.seatLimit}
            </p>
            {billing.seatCount >= billing.seatLimit && (
              <p className="text-xs text-amber-600 mt-0.5">At limit - upgrade for more seats</p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {isTrialing ? 'Trial Ends' : 'Next Billing'}
            </p>
            <p className="text-lg font-semibold">
              {isTrialing && billing.trialEndsAt
                ? new Date(billing.trialEndsAt).toLocaleDateString()
                : billing.currentPeriodEnd
                  ? new Date(billing.currentPeriodEnd).toLocaleDateString()
                  : 'N/A'}
            </p>
          </div>
        </div>

        {/* Manage billing button (only if they have a Creem customer ID) */}
        {billing.creemCustomerId && (
          <div className="mt-6 pt-6 border-t border-border">
            <CreemPortal customerId={billing.creemCustomerId}>
              <button className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                <ExternalLink className="w-4 h-4" />
                Manage billing, invoices & payment method
              </button>
            </CreemPortal>
          </div>
        )}
      </div>

      {/* Plan selection */}
      {(isTrialing || needsPayment || trialExpired) && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            {trialExpired || needsPayment ? 'Choose a Plan' : 'Upgrade Your Plan'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PlanCard
              name="Starter"
              price="$4"
              priceDetail="/user/mo"
              features={[
                'Up to 25 users',
                'Blink detection & smart alerts',
                'Basic team analytics',
                'Email support',
              ]}
              productId={CREEM_PRODUCT_STARTER}
              orgId={orgId}
              userEmail={userEmail}
              isCurrent={billing.subscriptionTier === 'starter' && isActive}
              isUpgrade={false}
              seatCount={billing.seatCount}
            />
            <PlanCard
              name="Pro"
              price="$12"
              priceDetail="/user/mo"
              features={[
                'Up to 200 users',
                'Everything in Starter',
                'Slack & Teams integration',
                'Team challenges & gamification',
                'Priority support',
              ]}
              productId={CREEM_PRODUCT_PRO}
              orgId={orgId}
              userEmail={userEmail}
              isCurrent={billing.subscriptionTier === 'pro' && isActive}
              isUpgrade={true}
              seatCount={billing.seatCount}
            />
          </div>
        </div>
      )}

      {/* Active plan - upgrade option */}
      {isActive && billing.subscriptionTier === 'starter' && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Need more? Upgrade to Pro
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Up to 200 users, Slack/Teams integration, team challenges, and priority support.
              </p>
            </div>
            <CreemCheckout
              productId={CREEM_PRODUCT_PRO}
              units={billing.seatCount || 1}
              referenceId={orgId}
              customer={{ email: userEmail, name: '' }}
              successUrl="/admin/billing?success=true"
              metadata={{ orgId, plan: 'pro' }}
            >
              <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 whitespace-nowrap">
                Upgrade to Pro
              </button>
            </CreemCheckout>
          </div>
        </div>
      )}
    </div>
  );
}
