import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function CTASection() {
  return (
    <section className="py-20 sm:py-24 bg-primary">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to improve your team's wellness?
          </h2>
          <p className="mt-4 text-lg text-primary-foreground/80">
            Join hundreds of companies using Lumina to reduce eye strain
            and boost productivity.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="btn bg-white text-primary hover:bg-white/90 px-8 py-3 text-lg w-full sm:w-auto"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link
              href="/pricing"
              className="btn border-2 border-white/30 text-white hover:bg-white/10 px-8 py-3 text-lg w-full sm:w-auto"
            >
              View Pricing
            </Link>
          </div>
          <p className="mt-6 text-sm text-primary-foreground/60">
            14-day free trial. No credit card required.
          </p>
        </div>
      </div>
    </section>
  );
}
