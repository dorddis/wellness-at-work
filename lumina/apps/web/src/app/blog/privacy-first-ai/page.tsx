import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, Brain, Share2, BookmarkPlus, Shield, Lock, Server, Cpu, Eye, CheckCircle } from 'lucide-react';
import { Nav } from '@/components/landing/Nav';
import { Footer } from '@/components/landing/Footer';

export default function PrivacyFirstAIArticle() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="pt-24 pb-16">
        <article className="container max-w-3xl">
          <Link href="/blog" className="inline-flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to blog
          </Link>

          {/* Header */}
          <header className="mb-12">
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 text-xs font-medium">
                Technology
              </span>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Dec 8, 2025
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                6 min read
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              Privacy-First AI: How Lumina Processes Everything Locally
            </h1>
            <p className="text-xl text-muted-foreground">
              Unlike cloud-based solutions, Lumina never sends your camera feed anywhere. Here is how we built a privacy-first wellness monitoring system.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                  LT
                </div>
                <div>
                  <p className="font-medium">Lumina Engineering Team</p>
                  <p className="text-sm text-muted-foreground">Privacy & Security</p>
                </div>
              </div>
              <div className="flex-1" />
              <button className="p-2 rounded-lg hover:bg-muted transition-colors" title="Share">
                <Share2 className="w-5 h-5 text-muted-foreground" />
              </button>
              <button className="p-2 rounded-lg hover:bg-muted transition-colors" title="Bookmark">
                <BookmarkPlus className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </header>

          {/* Hero Image */}
          <div className="aspect-video bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-xl mb-12 relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-2xl bg-card/80 backdrop-blur flex items-center justify-center">
                <Brain className="w-12 h-12 text-purple-500" />
              </div>
            </div>
            <div className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10" />
            <div className="absolute bottom-6 left-6 w-8 h-8 rounded-full bg-white/10" />
          </div>

          {/* Content */}
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="lead text-lg">
              When we started building Lumina, we faced a fundamental question: How do you create an AI-powered wellness tool that monitors something as personal as your face without compromising privacy? The answer was clear - we had to process everything locally.
            </p>

            <h2>The Privacy Problem with Wellness Apps</h2>
            <p>
              Most wellness applications that use computer vision follow a familiar pattern: capture data on the user&apos;s device, send it to cloud servers for processing, and return the results. This approach has several advantages for developers - centralized computing resources, easier model updates, and the ability to aggregate data for improvement.
            </p>
            <p>
              But for users, especially in workplace settings, this creates significant concerns:
            </p>
            <ul>
              <li><strong>Employer surveillance:</strong> If video data leaves the device, who else might access it?</li>
              <li><strong>Data breaches:</strong> Cloud storage creates attack surfaces for malicious actors</li>
              <li><strong>Regulatory compliance:</strong> GDPR, HIPAA, and other regulations place strict requirements on biometric data</li>
              <li><strong>Trust erosion:</strong> Users may disable features or uninstall apps entirely over privacy concerns</li>
            </ul>

            <div className="not-prose my-8 p-6 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-start gap-4">
                <Server className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-red-500 mb-2">The Cloud Approach (Not Lumina)</h4>
                  <p className="text-sm text-muted-foreground">
                    Camera &rarr; Network Upload &rarr; Cloud Servers &rarr; AI Processing &rarr; Database Storage &rarr; Results
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Risk: Video data passes through multiple systems, creating privacy vulnerabilities
                  </p>
                </div>
              </div>
            </div>

            <h2>Our Solution: Edge AI Processing</h2>
            <p>
              Lumina takes a fundamentally different approach. Every piece of computer vision processing happens directly on your device - what&apos;s known as &quot;edge computing.&quot; Your camera feed never leaves your computer.
            </p>

            <div className="not-prose my-8 p-6 rounded-xl bg-green-500/10 border border-green-500/20">
              <div className="flex items-start gap-4">
                <Cpu className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-green-500 mb-2">The Lumina Approach</h4>
                  <p className="text-sm text-muted-foreground">
                    Camera &rarr; Local MediaPipe &rarr; Blink/Posture Metrics &rarr; Local SQLite &rarr; Optional: Aggregate Sync
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Benefit: Only anonymous metrics (blinks per minute, not images) ever leave your device
                  </p>
                </div>
              </div>
            </div>

            <h3>How It Works Technically</h3>
            <p>
              Our desktop application uses MediaPipe, Google&apos;s open-source framework for building perception pipelines. The key component is the FaceLandmarker model, which:
            </p>
            <ol>
              <li>Runs entirely within the Electron application using WebAssembly</li>
              <li>Processes each video frame in approximately 10-15ms</li>
              <li>Extracts 478 facial landmarks as coordinate points</li>
              <li>Immediately discards the original video frame</li>
            </ol>
            <p>
              What we keep are just the derived metrics: blink counts, eye openness ratios, head position angles. These numbers tell us about your wellness patterns without retaining any visual data that could identify you.
            </p>

            <div className="not-prose my-8">
              <h4 className="font-semibold mb-4">Data Processing Comparison</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="w-24 text-sm font-medium">Video Frame</div>
                  <div className="flex-1 h-3 rounded-full bg-red-500/20 overflow-hidden">
                    <div className="h-full w-full bg-red-500 animate-pulse" />
                  </div>
                  <div className="text-sm text-muted-foreground">Immediately discarded</div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="w-24 text-sm font-medium">Landmarks</div>
                  <div className="flex-1 h-3 rounded-full bg-yellow-500/20 overflow-hidden">
                    <div className="h-full w-1/2 bg-yellow-500" />
                  </div>
                  <div className="text-sm text-muted-foreground">Used for calculation only</div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="w-24 text-sm font-medium">Metrics</div>
                  <div className="flex-1 h-3 rounded-full bg-green-500/20 overflow-hidden">
                    <div className="h-full w-1/4 bg-green-500" />
                  </div>
                  <div className="text-sm text-muted-foreground">Stored locally in SQLite</div>
                </div>
              </div>
            </div>

            <h2>What Data We Actually Store</h2>
            <p>
              Transparency is essential to trust. Here&apos;s exactly what Lumina stores on your device:
            </p>
            <ul>
              <li><strong>Blink events:</strong> Timestamp and duration of each detected blink</li>
              <li><strong>Minute rollups:</strong> Aggregated blink counts, average EAR values per minute</li>
              <li><strong>Posture events:</strong> When poor posture is detected (distance, angle)</li>
              <li><strong>Break records:</strong> When you take breaks and their duration</li>
              <li><strong>Application state:</strong> Settings, preferences, calibration data</li>
            </ul>
            <p>
              What we explicitly <strong>never</strong> store:
            </p>
            <ul>
              <li>Video frames or images</li>
              <li>Facial recognition data</li>
              <li>Biometric templates that could identify you</li>
              <li>Screenshots of your work</li>
              <li>Keyboard or mouse activity</li>
            </ul>

            <h2>Optional Cloud Sync</h2>
            <p>
              For enterprise users who want team analytics and admin dashboards, Lumina offers optional cloud synchronization. But even here, we maintain strict privacy controls:
            </p>

            <div className="not-prose my-8 grid gap-4">
              <div className="flex items-start gap-4 p-4 rounded-lg border border-border">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Aggregated data only</h4>
                  <p className="text-sm text-muted-foreground">We sync minute-level rollups, not raw events. Your employer sees &quot;15 blinks in the last minute,&quot; not a timeline of each blink.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-lg border border-border">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold">User controls sync</h4>
                  <p className="text-sm text-muted-foreground">You can disable cloud sync entirely and still use all local features. Your data stays on your machine.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-lg border border-border">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Row-level security</h4>
                  <p className="text-sm text-muted-foreground">Even in multi-tenant databases, your data is cryptographically isolated. Admins see team averages, not individual patterns.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-lg border border-border">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold">GDPR compliant</h4>
                  <p className="text-sm text-muted-foreground">Full data export and deletion capabilities. You can request all your data or have it permanently removed.</p>
                </div>
              </div>
            </div>

            <h2>Why Local Processing Matters for Adoption</h2>
            <p>
              Privacy isn&apos;t just an ethical imperative - it&apos;s essential for product adoption. Our research showed that 73% of employees are uncomfortable with workplace wellness tools that transmit video data, even with privacy policies in place.
            </p>
            <p>
              By processing everything locally, Lumina achieves:
            </p>
            <ul>
              <li><strong>&gt;80% camera opt-in rates</strong> - compared to industry average of ~40% for cloud-based tools</li>
              <li><strong>IT security approval</strong> - no firewall changes needed, no data egress to audit</li>
              <li><strong>Works offline</strong> - full functionality without internet connection</li>
              <li><strong>Zero latency</strong> - real-time feedback without network round-trips</li>
            </ul>

            <h2>The Technical Trade-offs</h2>
            <p>
              Local processing isn&apos;t without challenges. Running AI models on user devices means:
            </p>
            <ul>
              <li><strong>Hardware constraints:</strong> We optimize for older machines, targeting &lt;5% CPU usage</li>
              <li><strong>Model updates:</strong> New features require app updates rather than server-side changes</li>
              <li><strong>No centralized learning:</strong> We can&apos;t improve models from aggregated user data</li>
            </ul>
            <p>
              We consider these acceptable trade-offs. Privacy is a feature, not a limitation. And with WebAssembly optimization, modern devices handle our processing with room to spare.
            </p>

            <h2>Looking Forward</h2>
            <p>
              As AI capabilities grow, the temptation to move processing to the cloud will increase. More powerful models could detect more subtle wellness signals. But we believe the future of workplace wellness must be privacy-first.
            </p>
            <p>
              We&apos;re investing in:
            </p>
            <ul>
              <li>Smaller, more efficient on-device models</li>
              <li>Federated learning approaches that improve accuracy without sharing raw data</li>
              <li>Hardware acceleration to enable more sophisticated local processing</li>
              <li>Industry standards for privacy-preserving wellness technology</li>
            </ul>

            <h2>Conclusion</h2>
            <p>
              Building privacy-first AI requires intentional architectural decisions from day one. At Lumina, we made the choice to process everything locally, accept the technical constraints, and build trust through transparency.
            </p>
            <p>
              Your wellness data is yours. We&apos;re just here to help you understand it.
            </p>

            <div className="not-prose mt-12 p-6 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-4">
                <Shield className="w-8 h-8 text-primary flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-2">Privacy by Design</h4>
                  <p className="text-muted-foreground mb-4">
                    Read our full privacy policy and security documentation to learn more about how we protect your data.
                  </p>
                  <div className="flex gap-3">
                    <Link href="/privacy" className="btn btn-primary">
                      Privacy Policy
                    </Link>
                    <Link href="/security" className="btn btn-secondary">
                      Security
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Related Articles */}
          <div className="mt-16 pt-12 border-t border-border">
            <h3 className="text-xl font-semibold mb-6">Related Articles</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <Link href="/blog/science-of-blink-rate" className="group p-4 rounded-xl border border-border hover:shadow-lg transition-all">
                <h4 className="font-semibold group-hover:text-primary transition-colors">The Science of Blink Rate</h4>
                <p className="text-sm text-muted-foreground mt-1">Why we blink 66% less when staring at screens.</p>
              </Link>
              <Link href="/blog/20-20-20-rule" className="group p-4 rounded-xl border border-border hover:shadow-lg transition-all">
                <h4 className="font-semibold group-hover:text-primary transition-colors">The 20-20-20 Rule: Does It Actually Work?</h4>
                <p className="text-sm text-muted-foreground mt-1">We tested the science behind this popular advice.</p>
              </Link>
            </div>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
