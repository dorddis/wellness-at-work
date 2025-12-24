import { Metadata } from 'next';
import { Nav, Footer } from '@/components/landing';
import { Tag, Sparkles, Monitor, Apple, Shield, Zap, Eye, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Changelog - Lumina',
  description: 'See what\'s new in Lumina. Release notes, updates, and improvements to our AI-powered eye wellness platform.',
};

interface ReleaseNote {
  version: string;
  date: string;
  title: string;
  type: 'major' | 'minor' | 'patch';
  highlights: {
    icon: React.ReactNode;
    title: string;
    description: string;
  }[];
  changes: string[];
}

const releases: ReleaseNote[] = [
  {
    version: '1.2.0',
    date: 'December 2025',
    title: 'Cross-Platform Release',
    type: 'major',
    highlights: [
      {
        icon: <Apple className="w-5 h-5" />,
        title: 'macOS Support',
        description: 'Native macOS app with Apple Silicon optimization',
      },
      {
        icon: <Eye className="w-5 h-5" />,
        title: 'Enhanced Blink Detection',
        description: 'Improved accuracy in varying lighting conditions',
      },
      {
        icon: <Zap className="w-5 h-5" />,
        title: 'Performance Boost',
        description: 'Reduced CPU usage by 40% through optimized frame processing',
      },
    ],
    changes: [
      'Added native macOS build with .dmg installer',
      'Improved blink detection algorithm for better accuracy with glasses',
      'Fixed authentication flow for seamless sign-in',
      'Added sticky header in desktop app for quick access to controls',
      'Optimized MediaPipe initialization for faster startup',
    ],
  },
  {
    version: '0.1.9',
    date: 'December 2025',
    title: 'Stability & Distribution',
    type: 'minor',
    highlights: [
      {
        icon: <Shield className="w-5 h-5" />,
        title: 'Cloud Distribution',
        description: 'Fast global downloads via Cloudflare CDN',
      },
      {
        icon: <Monitor className="w-5 h-5" />,
        title: 'Windows Improvements',
        description: 'Fixed installer issues and improved compatibility',
      },
    ],
    changes: [
      'Migrated to Cloudflare R2 for fast global downloads',
      'Fixed Windows installer compatibility issues',
      'Added automatic version detection in downloads page',
      'Improved error handling for camera access',
    ],
  },
  {
    version: '0.1.5',
    date: 'December 2025',
    title: 'Authentication & Polish',
    type: 'minor',
    highlights: [
      {
        icon: <Shield className="w-5 h-5" />,
        title: 'Secure Authentication',
        description: 'Environment-aware auth redirects for seamless login',
      },
    ],
    changes: [
      'Fixed authentication redirects for Vercel deployment',
      'Added page transitions for smoother navigation',
      'Improved loading states across all pages',
      'Updated Node.js requirement to v22.12.0 for security',
    ],
  },
  {
    version: '0.1.2',
    date: 'November 2025',
    title: 'Dashboard Enhancements',
    type: 'minor',
    highlights: [
      {
        icon: <Sparkles className="w-5 h-5" />,
        title: 'Page Transitions',
        description: 'Smooth animations between pages',
      },
    ],
    changes: [
      'Added animated page transitions',
      'Synced workspace versions across monorepo',
      'Fixed Vite resolution issues in desktop app',
      'Improved electron-builder configuration',
    ],
  },
  {
    version: '0.1.0',
    date: 'November 2025',
    title: 'Initial Release',
    type: 'major',
    highlights: [
      {
        icon: <Eye className="w-5 h-5" />,
        title: 'AI Eye Tracking',
        description: 'Real-time blink detection using MediaPipe',
      },
      {
        icon: <Clock className="w-5 h-5" />,
        title: 'Smart Break Reminders',
        description: 'Personalized break suggestions based on your patterns',
      },
      {
        icon: <Shield className="w-5 h-5" />,
        title: '100% Private',
        description: 'All processing happens locally on your device',
      },
    ],
    changes: [
      'Electron desktop app with system tray support',
      'Real-time blink detection using MediaPipe Face Landmarker',
      'Local SQLite database for offline-first operation',
      'Smart break reminders with customizable intervals',
      'Next.js admin dashboard for team insights',
      'Supabase integration for cloud sync (optional)',
      'Beautiful landing page and pricing tiers',
    ],
  },
];

function getTypeColor(type: 'major' | 'minor' | 'patch') {
  switch (type) {
    case 'major':
      return 'bg-primary text-primary-foreground';
    case 'minor':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
    case 'patch':
      return 'bg-muted text-muted-foreground';
  }
}

function getTypeLabel(type: 'major' | 'minor' | 'patch') {
  switch (type) {
    case 'major':
      return 'Major Release';
    case 'minor':
      return 'Feature Update';
    case 'patch':
      return 'Bug Fixes';
  }
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-16 sm:py-24">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary mb-6">
                <Tag className="w-4 h-4" />
                Changelog
              </div>

              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                What's New in Lumina
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Track our progress as we build the future of workplace eye wellness.
                <br />
                New features, improvements, and bug fixes.
              </p>

              <div className="mt-8 flex items-center justify-center gap-4">
                <Link
                  href="/download"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Download Latest
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Background decoration */}
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        </section>

        {/* Timeline */}
        <section className="py-16 border-t border-border">
          <div className="container">
            <div className="mx-auto max-w-3xl">
              <div className="space-y-12">
                {releases.map((release, index) => (
                  <article
                    key={release.version}
                    className="relative pl-8 pb-12 border-l-2 border-border last:pb-0"
                  >
                    {/* Timeline dot */}
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary border-4 border-background" />

                    {/* Version header */}
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className="text-2xl font-bold">v{release.version}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(release.type)}`}>
                        {getTypeLabel(release.type)}
                      </span>
                      <span className="text-sm text-muted-foreground">{release.date}</span>
                    </div>

                    <h2 className="text-lg font-semibold mb-4">{release.title}</h2>

                    {/* Highlights */}
                    {release.highlights.length > 0 && (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {release.highlights.map((highlight) => (
                          <div
                            key={highlight.title}
                            className="p-4 rounded-lg border border-border bg-card"
                          >
                            <div className="p-2 rounded-lg bg-primary/10 text-primary w-fit mb-3">
                              {highlight.icon}
                            </div>
                            <h3 className="font-medium mb-1">{highlight.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {highlight.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Changes list */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Changes
                      </h3>
                      <ul className="space-y-2">
                        {release.changes.map((change, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-muted-foreground"
                          >
                            <span className="text-primary mt-1">-</span>
                            {change}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Subscribe CTA */}
        <section className="py-16 border-t border-border bg-muted/30">
          <div className="container">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-bold mb-4">Stay Updated</h2>
              <p className="text-muted-foreground mb-6">
                Check back here for the latest updates, or visit the download page for new releases.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link
                  href="/download"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  <Sparkles className="w-5 h-5" />
                  Download Latest
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
