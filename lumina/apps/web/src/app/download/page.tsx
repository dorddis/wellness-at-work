import { Metadata } from 'next';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { Nav, Footer } from '@/components/landing';
import { DownloadButtons } from './DownloadButtons';
import { Monitor, Apple, CheckCircle, AlertCircle, Download, Sparkles, ChevronRight, Eye, Zap, Video, Terminal, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Download Lumina - Desktop App',
  description: 'Download Lumina for Windows or macOS. AI-powered eye wellness monitoring that runs silently in the background.',
};

interface Release {
  id: string;
  version: string;
  windows_url: string | null;
  windows_size: number | null;
  macos_url: string | null;
  macos_size: number | null;
  release_notes: string | null;
  created_at: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}


// Latest release highlights - update these when releasing new versions
const latestHighlights = [
  {
    icon: <Apple className="w-5 h-5" />,
    title: 'macOS Support',
    description: 'Native app with Apple Silicon optimization',
  },
  {
    icon: <Video className="w-5 h-5" />,
    title: 'Meeting Mode',
    description: 'Eye tracking during Zoom, Teams & Meet calls',
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: '40% Faster',
    description: 'Optimized frame processing for lower CPU usage',
  },
];

export default async function DownloadPage() {
  const supabase = await createServerClient();

  const { data: release } = await supabase
    .from('releases')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single<Release>();

  const hasRelease = release && (release.windows_url || release.macos_url);

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-16 sm:py-24">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary mb-6">
                <Download className="w-4 h-4" />
                Desktop App
              </div>

              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Download Lumina
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                AI-powered eye wellness that runs silently in the background.
                <br />
                Available for Windows and macOS.
              </p>

              {/* Download Buttons */}
              {hasRelease ? (
                <div className="mt-10">
                  <DownloadButtons
                    windowsUrl={release.windows_url}
                    windowsSize={release.windows_size ? formatBytes(release.windows_size) : null}
                    macosUrl={release.macos_url}
                    macosSize={release.macos_size ? formatBytes(release.macos_size) : null}
                  />
                  <p className="mt-4 text-sm text-muted-foreground">
                    Version {release.version}
                  </p>
                </div>
              ) : (
                <div className="mt-10 p-6 rounded-xl bg-muted/50 border border-border">
                  <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No releases available yet. Check back soon!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Background decoration */}
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        </section>

        {/* System Requirements */}
        <section className="py-16 border-t border-border">
          <div className="container">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-center mb-10">
                System Requirements
              </h2>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Windows */}
                <div className="p-6 rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Monitor className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">Windows</h3>
                  </div>
                  <ul className="space-y-3">
                    {[
                      'Windows 10 or later (64-bit)',
                      '4 GB RAM minimum',
                      '500 MB disk space',
                      'Webcam (built-in or external)',
                    ].map((req) => (
                      <li key={req} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* macOS */}
                <div className="p-6 rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Apple className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">macOS</h3>
                  </div>
                  <ul className="space-y-3">
                    {[
                      'macOS 11 Big Sur or later',
                      '4 GB RAM minimum',
                      '500 MB disk space',
                      'Webcam (built-in or external)',
                    ].map((req) => (
                      <li key={req} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Installation Instructions */}
        <section className="py-16 border-t border-border bg-muted/30">
          <div className="container">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-center mb-10">
                Installation Instructions
              </h2>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Windows */}
                <div className="p-6 rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Monitor className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">Windows</h3>
                  </div>
                  <ol className="space-y-3 list-decimal list-inside">
                    <li className="text-sm text-muted-foreground">
                      Download the .exe installer
                    </li>
                    <li className="text-sm text-muted-foreground">
                      If SmartScreen appears, click <strong className="text-foreground">More info</strong> then <strong className="text-foreground">Run anyway</strong>
                    </li>
                    <li className="text-sm text-muted-foreground">
                      Follow the installation wizard
                    </li>
                    <li className="text-sm text-muted-foreground">
                      Grant camera permission when prompted
                    </li>
                  </ol>
                </div>

                {/* macOS */}
                <div className="p-6 rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Apple className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">macOS</h3>
                  </div>
                  <ol className="space-y-3 list-decimal list-inside">
                    <li className="text-sm text-muted-foreground">
                      Download the .dmg file
                    </li>
                    <li className="text-sm text-muted-foreground">
                      Open Terminal and run:
                    </li>
                  </ol>
                  <div className="mt-3 p-3 rounded-lg bg-zinc-900 border border-zinc-700">
                    <code className="text-sm text-green-400 font-mono">
                      xattr -cr ~/Downloads/Lumina.dmg
                    </code>
                  </div>
                  <ol className="space-y-3 list-decimal list-inside mt-3" start={3}>
                    <li className="text-sm text-muted-foreground">
                      Open the .dmg and drag Lumina to Applications
                    </li>
                    <li className="text-sm text-muted-foreground">
                      Grant camera permission in System Settings
                    </li>
                  </ol>
                  <p className="mt-4 text-xs text-muted-foreground flex items-start gap-2">
                    <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    The xattr command removes the download quarantine. This is required because the app is not yet notarized with Apple.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Whats New Section */}
        <section className="py-16 border-t border-border">
          <div className="container">
            <div className="mx-auto max-w-3xl">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">Whats New</h2>
                </div>
                <Link
                  href="/changelog"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Full changelog
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                {latestHighlights.map((item) => (
                  <div
                    key={item.title}
                    className="p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-primary/10 text-primary w-fit mb-3">
                      {item.icon}
                    </div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Summary */}
        <section className="py-16 border-t border-border bg-muted/30">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-bold mb-4">
                What's Included
              </h2>
              <p className="text-muted-foreground mb-8">
                Everything you need to protect your eyes and boost productivity.
              </p>

              <div className="grid sm:grid-cols-3 gap-6 text-left">
                {[
                  {
                    title: 'Blink Detection',
                    description: 'AI-powered eye tracking to monitor blink rate in real-time.',
                  },
                  {
                    title: 'Smart Breaks',
                    description: 'Intelligent break reminders based on your work patterns.',
                  },
                  {
                    title: '100% Private',
                    description: 'All processing happens locally. No video leaves your device.',
                  },
                ].map((feature) => (
                  <div key={feature.title} className="p-4 rounded-lg bg-background border border-border">
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        
      </main>

      <Footer />
    </div>
  );
}
