import { Nav, Footer } from '@/components/landing';
import {
  PricingTierCard,
  FeatureComparison,
  PricingFAQ,
} from '@/components/pricing';

const tiers = [
  {
    name: 'Starter',
    description: 'Perfect for small teams getting started with wellness',
    price: '$4',
    priceDetail: '/user/mo',
    features: [
      'Blink detection & smart alerts',
      'Basic team analytics',
      'Email support',
      'Up to 25 users',
    ],
    cta: 'Start Free Trial',
    ctaHref: '/login',
    popular: false,
  },
  {
    name: 'Pro',
    description: 'For growing teams that want the full wellness suite',
    price: '$8',
    priceDetail: '/user/mo',
    features: [
      'Everything in Starter',
      'Posture & fatigue monitoring',
      'Team challenges & gamification',
      'Slack & Teams integration',
      'Calendar-aware alerts',
      'Priority support',
      'Up to 200 users',
    ],
    cta: 'Start Free Trial',
    ctaHref: '/login',
    popular: true,
  },
  {
    name: 'Enterprise',
    description: 'Custom solutions for large organizations',
    price: 'Custom',
    priceDetail: '',
    features: [
      'Everything in Pro',
      'SSO / SAML authentication',
      'Custom privacy policies',
      'Dedicated success manager',
      'Custom SLA',
      'On-premise deployment option',
      'Unlimited users',
    ],
    cta: 'Contact Sales',
    ctaHref: 'mailto:sales@lumina.app',
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* Header */}
      <section className="py-20 sm:py-24 text-center">
        <div className="container">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your team. All plans include a 14-day free trial.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
            {tiers.map((tier) => (
              <PricingTierCard key={tier.name} {...tier} />
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-bold text-center mb-12">
            Compare plans
          </h2>
          <div className="max-w-4xl mx-auto bg-card rounded-xl border border-border p-8">
            <FeatureComparison />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="container">
          <h2 className="text-2xl font-bold text-center mb-12">
            Frequently asked questions
          </h2>
          <div className="max-w-3xl mx-auto">
            <PricingFAQ />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary">
        <div className="container text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Ready to get started?
          </h2>
          <p className="mt-4 text-primary-foreground/80">
            Start your 14-day free trial today. No credit card required.
          </p>
          <a
            href="/login"
            className="mt-8 inline-block btn bg-white text-primary hover:bg-white/90 px-8 py-3 text-lg"
          >
            Start Free Trial
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
