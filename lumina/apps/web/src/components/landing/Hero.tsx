import Link from 'next/link';
import { ArrowRight, Play, Eye, Activity, Shield, Laptop } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-16 sm:py-24">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Your AI Wellness Companion
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Build healthier
              <br />
              <span className="text-primary">screen habits</span>
            </h1>

            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              Lumina uses advanced computer vision to analyze your blinks, monitor your posture,
              and send gentle reminders - helping you reduce eye strain and work more comfortably.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4">
              <Link
                href="/login"
                className="btn btn-primary px-8 py-3 text-lg w-full sm:w-auto"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link
                href="#how-it-works"
                className="btn btn-outline px-8 py-3 text-lg w-full sm:w-auto"
              >
                <Play className="w-5 h-5 mr-2" />
                See How It Works
              </Link>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              100% on-device processing. No video stored. Your privacy guaranteed.
            </p>

            {/* Trust indicators */}
            <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Privacy-first
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Science-backed
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Windows & Mac
              </div>
            </div>
          </div>

          {/* Right: Illustration - CSS-based design */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-md lg:max-w-lg">
              {/* Main illustration container */}
              <div className="relative aspect-square bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-3xl p-8">
                {/* Central laptop/monitor graphic */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4">
                  <div className="relative bg-card rounded-2xl shadow-2xl border border-border p-4">
                    {/* Screen */}
                    <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center mb-3">
                          <Eye className="w-8 h-8 text-primary" />
                        </div>
                        <div className="h-2 w-24 bg-primary/30 rounded mx-auto mb-2" />
                        <div className="h-2 w-16 bg-muted-foreground/20 rounded mx-auto" />
                      </div>
                    </div>
                    {/* Keyboard base */}
                    <div className="mt-2 h-6 bg-muted rounded-lg" />
                  </div>
                </div>

                {/* Floating feature badges */}
                <div className="absolute top-8 right-8 bg-card rounded-xl shadow-lg border border-border p-3 animate-bounce" style={{ animationDuration: '3s' }}>
                  <Activity className="w-6 h-6 text-green-500" />
                </div>

                <div className="absolute bottom-12 left-4 bg-card rounded-xl shadow-lg border border-border p-3 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>
                  <Shield className="w-6 h-6 text-primary" />
                </div>

                <div className="absolute top-1/4 left-8 bg-card rounded-xl shadow-lg border border-border p-3 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }}>
                  <Laptop className="w-6 h-6 text-blue-500" />
                </div>

                {/* Decorative circles */}
                <div className="absolute top-4 left-1/4 w-3 h-3 bg-primary/40 rounded-full" />
                <div className="absolute bottom-1/4 right-12 w-4 h-4 bg-primary/30 rounded-full" />
                <div className="absolute top-1/3 right-4 w-2 h-2 bg-primary/50 rounded-full" />
              </div>

              {/* Background glow */}
              <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-primary/5 rounded-full blur-3xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
    </section>
  );
}
