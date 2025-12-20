import Link from 'next/link';
import { Eye, BarChart3, Users, Shield, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Eye className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold">Lumina</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Sign In
            </Link>
            <Link href="/login" className="btn btn-primary text-sm">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          AI-Powered Wellness
          <br />
          <span className="text-primary">for Modern Teams</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Monitor eye strain, prevent fatigue, and boost productivity across your organization.
          Real-time insights powered by computer vision.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/login" className="btn btn-primary px-8 py-3 text-lg">
            Start Free Trial
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
          <Link href="#features" className="btn btn-outline px-8 py-3 text-lg">
            Learn More
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-24">
        <h2 className="text-3xl font-bold text-center mb-16">
          Everything you need for team wellness
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Eye className="w-8 h-8" />}
            title="Blink Detection"
            description="AI monitors blink rate using webcam. No images stored - only metrics. 100% on-device processing."
          />
          <FeatureCard
            icon={<BarChart3 className="w-8 h-8" />}
            title="Team Analytics"
            description="Real-time dashboards showing team wellness scores, trends, and actionable insights."
          />
          <FeatureCard
            icon={<Users className="w-8 h-8" />}
            title="Admin Controls"
            description="Configurable privacy levels. View team-wide or individual reports based on your org policy."
          />
          <FeatureCard
            icon={<Shield className="w-8 h-8" />}
            title="Privacy First"
            description="Choose anonymous, named, or manager-only modes. All processing happens locally on employee devices."
          />
          <FeatureCard
            icon={<BarChart3 className="w-8 h-8" />}
            title="Smart Alerts"
            description="Intelligent break reminders based on individual baselines. No alert fatigue."
          />
          <FeatureCard
            icon={<Users className="w-8 h-8" />}
            title="Easy Onboarding"
            description="Invite employees via link or domain matching. Desktop app installs in minutes."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary/5 py-24">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to improve your team's wellness?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Start your free 14-day trial. No credit card required.
          </p>
          <Link href="/login" className="btn btn-primary px-8 py-3 text-lg">
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Lumina</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built for enterprise wellness
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="card p-6">
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
