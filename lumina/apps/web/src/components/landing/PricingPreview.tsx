import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function PricingPreview() {
  return (
    <section className="py-20 sm:py-24">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free, scale as you grow. No hidden fees.
          </p>

          <div className="mt-10 p-8 rounded-2xl border border-border bg-card">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
              <div>
                <div className="text-sm text-muted-foreground">Starting at</div>
                <div className="text-4xl font-bold">
                  $4<span className="text-lg font-normal text-muted-foreground">/user/mo</span>
                </div>
              </div>

              <div className="hidden sm:block w-px h-16 bg-border" />

              <div className="text-left">
                <div className="text-sm font-medium mb-2">Includes:</div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Blink detection & alerts</li>
                  <li>Basic team analytics</li>
                  <li>Email support</li>
                </ul>
              </div>
            </div>

            <div className="mt-8">
              <Link
                href="/pricing"
                className="btn btn-outline px-8 py-3"
              >
                View All Plans
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
