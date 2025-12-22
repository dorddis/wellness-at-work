import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

export function CTASection() {
  return (
    <section className="py-20 sm:py-24 bg-primary relative overflow-hidden">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Illustration in white card */}
          <div className="relative hidden lg:flex justify-center order-2 lg:order-1">
            <div className="relative bg-white rounded-3xl p-8 shadow-2xl">
              <Image
                src="/images/illustrations/happy-man-sketch.png"
                alt="Happy productive worker"
                width={400}
                height={400}
                className="w-full max-w-sm h-auto"
              />
            </div>
          </div>

          {/* Right: Content */}
          <div className="text-center lg:text-left order-1 lg:order-2">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to improve your team's wellness?
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/80">
              Join companies using Lumina to reduce eye strain, improve posture,
              and boost productivity across their teams.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4">
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
      </div>

      {/* Background decoration */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
    </section>
  );
}
