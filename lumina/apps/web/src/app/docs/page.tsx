import Link from 'next/link';
import { ArrowLeft, Book, Download, Settings, Eye, Shield, Users, Code, ArrowRight, Search, Monitor, Zap } from 'lucide-react';
import { Nav } from '@/components/landing/Nav';
import { Footer } from '@/components/landing/Footer';

const quickLinks = [
  {
    icon: Download,
    title: 'Installation',
    description: 'Download and install Lumina on Windows or macOS',
    href: '#installation',
  },
  {
    icon: Settings,
    title: 'Configuration',
    description: 'Customize alerts, breaks, and monitoring settings',
    href: '#configuration',
  },
  {
    icon: Eye,
    title: 'Features',
    description: 'Learn about blink detection, posture monitoring, and more',
    href: '#features',
  },
  {
    icon: Code,
    title: 'API Reference',
    description: 'Integrate Lumina with your enterprise systems',
    href: '/docs/api',
  },
];

const sections = [
  {
    id: 'installation',
    icon: Download,
    title: 'Installation',
    content: [
      {
        subtitle: 'System Requirements',
        text: 'Lumina runs on Windows 10/11 and macOS 12+. You need a webcam (built-in or external) and at least 4GB RAM. The app uses less than 5% CPU during normal operation.',
      },
      {
        subtitle: 'Download',
        text: 'Visit our download page to get the latest version. Choose the installer for your operating system (.exe for Windows, .dmg for macOS).',
        link: { text: 'Download Lumina', href: '/download' },
      },
      {
        subtitle: 'First Launch',
        text: 'After installation, Lumina will ask for camera permissions. This is required for eye tracking. Remember: all processing happens locally - your camera feed never leaves your device.',
      },
    ],
  },
  {
    id: 'configuration',
    icon: Settings,
    title: 'Configuration',
    content: [
      {
        subtitle: 'Break Reminders',
        text: 'Configure how often you want break reminders. We recommend starting with 20-minute intervals. You can adjust based on your work style - some users prefer 15-minute intervals, others prefer 30.',
      },
      {
        subtitle: 'Alert Types',
        text: 'Choose between subtle notifications, desktop alerts, or sounds. You can also set "Do Not Disturb" hours when alerts are muted.',
      },
      {
        subtitle: 'Calibration',
        text: 'Lumina automatically calibrates to your blink patterns during the first 2 hours of use. You can also manually recalibrate from Settings > Calibration if your environment changes significantly.',
      },
    ],
  },
  {
    id: 'features',
    icon: Eye,
    title: 'Features',
    content: [
      {
        subtitle: 'Blink Detection',
        text: 'Using the Eye Aspect Ratio (EAR) algorithm, Lumina tracks your blink rate in real-time. When your rate drops below your personal baseline, you will receive a gentle reminder to blink more consciously.',
      },
      {
        subtitle: 'Posture Monitoring',
        text: 'Face landmarks help detect when you are sitting too close to the screen, tilting your head, or leaning forward. Get nudges to correct your posture before strain sets in.',
      },
      {
        subtitle: 'Break Timer',
        text: 'Intelligent break reminders that respect your flow state. Lumina detects natural pause points in your work rather than interrupting mid-task.',
      },
      {
        subtitle: 'Fatigue Detection',
        text: 'Using PERCLOS (percentage of eye closure) and yawn detection, Lumina can identify when you are getting tired and suggest a break or end of day.',
      },
    ],
  },
  {
    id: 'meeting-mode',
    icon: Monitor,
    title: 'Meeting Mode',
    content: [
      {
        subtitle: 'How It Works',
        text: 'During video calls, your camera is typically used by Zoom, Teams, or Meet. Lumina\'s Meeting Mode captures your self-view preview from the meeting app to continue monitoring.',
      },
      {
        subtitle: 'Setup',
        text: 'When a meeting app is detected, Lumina will prompt you to calibrate. Simply draw a box around your face in the self-view preview. This only needs to be done once per meeting app.',
      },
      {
        subtitle: 'Privacy',
        text: 'Meeting Mode only captures the small self-view area you designate - not your screen content or other participants. Processing remains fully local.',
      },
    ],
  },
  {
    id: 'enterprise',
    icon: Users,
    title: 'Enterprise Features',
    content: [
      {
        subtitle: 'Team Dashboard',
        text: 'Admins can view aggregated team wellness metrics - never individual employee data. See trends like average break compliance and team-wide strain patterns.',
      },
      {
        subtitle: 'SSO Integration',
        text: 'Connect with your identity provider (Okta, Azure AD, Google Workspace) for seamless employee onboarding.',
      },
      {
        subtitle: 'API Access',
        text: 'Integrate Lumina data with your HR systems, wellness platforms, or custom dashboards using our REST API.',
        link: { text: 'View API Reference', href: '/docs/api' },
      },
    ],
  },
  {
    id: 'privacy',
    icon: Shield,
    title: 'Privacy & Security',
    content: [
      {
        subtitle: 'Local Processing',
        text: 'All computer vision processing happens on your device. Video frames are analyzed and immediately discarded. Only derived metrics (blink counts, posture scores) are stored.',
      },
      {
        subtitle: 'Data Storage',
        text: 'Your data is stored in a local SQLite database on your machine. For enterprise users with cloud sync enabled, only aggregated minute-level data is transmitted.',
      },
      {
        subtitle: 'GDPR Compliance',
        text: 'Lumina is fully GDPR compliant. You can export all your data or request permanent deletion at any time from Settings > Privacy.',
      },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="pt-24 pb-16">
        <div className="container max-w-5xl">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          {/* Hero */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-4">
              <Book className="w-4 h-4" />
              Documentation
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              Lumina Documentation
            </h1>
            <p className="text-xl text-muted-foreground">
              Everything you need to get started with Lumina and make the most of its features.
            </p>
          </div>

          {/* Search (visual only) */}
          <div className="mb-12">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search documentation..."
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
            {quickLinks.map((link) => (
              <Link
                key={link.title}
                href={link.href}
                className="p-4 rounded-xl border border-border hover:shadow-lg hover:border-primary/50 transition-all group"
              >
                <link.icon className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors mb-3" />
                <h3 className="font-semibold mb-1">{link.title}</h3>
                <p className="text-sm text-muted-foreground">{link.description}</p>
              </Link>
            ))}
          </div>

          {/* Getting Started Banner */}
          <div className="mb-16 p-6 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">New to Lumina?</h3>
                <p className="text-sm text-muted-foreground">
                  Start with our 5-minute quickstart guide to get up and running.
                </p>
              </div>
              <Link href="/download" className="btn btn-primary flex items-center gap-2">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Documentation Sections */}
          <div className="space-y-16">
            {sections.map((section) => (
              <section key={section.id} id={section.id}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <section.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">{section.title}</h2>
                </div>
                <div className="space-y-6 pl-13">
                  {section.content.map((item, index) => (
                    <div key={index} className="p-6 rounded-xl border border-border">
                      <h3 className="font-semibold mb-2">{item.subtitle}</h3>
                      <p className="text-muted-foreground">{item.text}</p>
                      {item.link && (
                        <Link
                          href={item.link.href}
                          className="inline-flex items-center gap-1 mt-3 text-primary hover:underline"
                        >
                          {item.link.text}
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Help Section */}
          <section className="mt-20 p-8 rounded-xl bg-muted/50 border border-border">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">Need more help?</h3>
              <p className="text-muted-foreground mb-6">
                Can&apos;t find what you&apos;re looking for? Our support team is here to help.
              </p>
              <div className="flex justify-center gap-4">
                <Link href="/help" className="btn btn-primary">
                  Visit Help Center
                </Link>
                <a href="mailto:support@getlumina.io" className="btn btn-secondary">
                  Contact Support
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
