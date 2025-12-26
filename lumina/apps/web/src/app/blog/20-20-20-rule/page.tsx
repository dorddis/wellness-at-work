import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, Monitor, Share2, BookmarkPlus, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Nav } from '@/components/landing/Nav';
import { Footer } from '@/components/landing/Footer';

export default function TwentyRuleArticle() {
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
              <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-xs font-medium">
                Wellness Tips
              </span>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Nov 28, 2025
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                7 min read
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              The 20-20-20 Rule: Does It Actually Work?
            </h1>
            <p className="text-xl text-muted-foreground">
              Eye doctors recommend looking at something 20 feet away for 20 seconds every 20 minutes. We tested the science behind this popular advice.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white font-semibold">
                  LT
                </div>
                <div>
                  <p className="font-medium">Lumina Research Team</p>
                  <p className="text-sm text-muted-foreground">Eye Health & Wellness</p>
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
          <div className="aspect-video bg-gradient-to-br from-green-500/20 to-green-500/5 rounded-xl mb-12 relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-2xl bg-card/80 backdrop-blur flex items-center justify-center">
                <Monitor className="w-12 h-12 text-green-500" />
              </div>
            </div>
            <div className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10" />
            <div className="absolute bottom-6 left-6 w-8 h-8 rounded-full bg-white/10" />
          </div>

          {/* Content */}
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="lead text-lg">
              If you&apos;ve ever complained about eye strain to a doctor, you&apos;ve probably heard the 20-20-20 rule: Every 20 minutes, look at something 20 feet away for 20 seconds. It&apos;s become the go-to advice for digital eye strain. But does this simple rule actually work? We dove into the research to find out.
            </p>

            <h2>Origins of the Rule</h2>
            <p>
              The 20-20-20 rule was popularized by California optometrist Dr. Jeffrey Anshel in the 1990s. It wasn&apos;t based on a single study but rather on his clinical observations and understanding of how the eye&apos;s focusing system works.
            </p>
            <p>
              The logic is straightforward:
            </p>
            <ul>
              <li><strong>20 minutes:</strong> The approximate time before the ciliary muscles (which control focus) begin to fatigue during near work</li>
              <li><strong>20 feet:</strong> The distance at which the eye is effectively focused at infinity, allowing the ciliary muscles to fully relax</li>
              <li><strong>20 seconds:</strong> The minimum time needed for the focusing muscles to relax and reset</li>
            </ul>

            <h2>What the Science Says</h2>
            <p>
              We analyzed peer-reviewed studies on the 20-20-20 rule and related break strategies. Here&apos;s what the evidence shows:
            </p>

            <h3>The Supporting Evidence</h3>
            <div className="not-prose my-8 space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Reduced accommodation strain</h4>
                  <p className="text-sm text-muted-foreground">A 2013 study in Ophthalmic and Physiological Optics found that looking at distant objects for 15+ seconds allowed ciliary muscles to return to baseline tension levels.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Improved tear film stability</h4>
                  <p className="text-sm text-muted-foreground">Research in Contact Lens and Anterior Eye (2019) showed that brief breaks increased blink rate by 40%, helping restore tear film that degrades during concentrated screen work.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Subjective symptom reduction</h4>
                  <p className="text-sm text-muted-foreground">A clinical trial at the University of Waterloo (2020) found that participants following the rule reported 25% fewer symptoms of digital eye strain compared to controls.</p>
                </div>
              </div>
            </div>

            <h3>The Limitations</h3>
            <div className="not-prose my-8 space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Compliance is difficult</h4>
                  <p className="text-sm text-muted-foreground">Studies consistently show that fewer than 20% of people who learn the rule actually follow it consistently. Mental load and work interruption concerns are the main barriers.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold">20 feet may not be practical</h4>
                  <p className="text-sm text-muted-foreground">Many office environments don&apos;t have 20 feet of clear sight line. However, research suggests that looking at anything beyond 6 feet provides most of the benefit.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Doesn&apos;t address all causes</h4>
                  <p className="text-sm text-muted-foreground">Digital eye strain has multiple causes - glare, poor lighting, incorrect viewing distance, uncorrected vision. The 20-20-20 rule only addresses accommodation fatigue, not these other factors.</p>
                </div>
              </div>
            </div>

            <h2>What Actually Matters: The Core Principles</h2>
            <p>
              After reviewing the research, we identified the key principles that make break strategies effective:
            </p>

            <div className="not-prose my-8 p-6 rounded-xl bg-muted/50 border border-border">
              <h4 className="font-semibold mb-4">The Science-Backed Break Formula</h4>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">1</div>
                  <div>
                    <h5 className="font-medium">Regular intervals matter more than exact timing</h5>
                    <p className="text-sm text-muted-foreground">Breaks every 15-30 minutes all showed benefits. The exact timing matters less than consistency.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">2</div>
                  <div>
                    <h5 className="font-medium">Distance relaxes focus</h5>
                    <p className="text-sm text-muted-foreground">Looking at anything beyond arm&apos;s length helps. 20 feet is ideal but 6+ feet provides significant benefit.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">3</div>
                  <div>
                    <h5 className="font-medium">Blinking is often forgotten</h5>
                    <p className="text-sm text-muted-foreground">Conscious blinking during breaks compounds the benefit by restoring tear film.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">4</div>
                  <div>
                    <h5 className="font-medium">Movement amplifies benefits</h5>
                    <p className="text-sm text-muted-foreground">Standing, stretching, or walking during breaks adds musculoskeletal and circulatory benefits.</p>
                  </div>
                </div>
              </div>
            </div>

            <h2>Why Traditional Reminders Fail</h2>
            <p>
              If the 20-20-20 rule works, why don&apos;t more people follow it? The research points to several factors:
            </p>
            <ul>
              <li><strong>Flow state interruption:</strong> Timers that interrupt focused work create frustration and are quickly disabled</li>
              <li><strong>Notification fatigue:</strong> After a few days, fixed-interval reminders become background noise</li>
              <li><strong>Rigid timing:</strong> A reminder at minute 20 might hit during a critical thought or meeting</li>
              <li><strong>No personalization:</strong> Everyone&apos;s work patterns and eye fatigue rates differ</li>
            </ul>

            <h2>A Better Approach: Adaptive Breaks</h2>
            <p>
              Based on the research, effective break systems need to be smarter than a simple timer. They should:
            </p>
            <ul>
              <li><strong>Detect natural pause points:</strong> Trigger reminders when you&apos;ve just completed a task, not during deep focus</li>
              <li><strong>Adapt to your patterns:</strong> Learn when your eyes actually need rest based on blink rate and posture changes</li>
              <li><strong>Respect calendar events:</strong> Never interrupt during meetings or presentations</li>
              <li><strong>Progressive urgency:</strong> Gentle nudges that escalate only if consistently ignored</li>
            </ul>
            <p>
              This is exactly how we designed Lumina&apos;s break reminder system. Rather than rigid 20-minute intervals, we monitor your actual eye strain indicators and suggest breaks when your body signals it needs one.
            </p>

            <h2>Our Recommendation: The Adaptive 20-20-20</h2>
            <p>
              Based on our research review and user testing, here&apos;s our recommended approach:
            </p>

            <div className="not-prose my-8 grid gap-4 md:grid-cols-3">
              <div className="p-6 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                <p className="text-3xl font-bold text-blue-500">15-30</p>
                <p className="text-sm text-muted-foreground mt-1">minutes between breaks</p>
                <p className="text-xs text-muted-foreground mt-2">Flexible window, not rigid timer</p>
              </div>
              <div className="p-6 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                <p className="text-3xl font-bold text-green-500">6+ feet</p>
                <p className="text-sm text-muted-foreground mt-1">minimum distance to look</p>
                <p className="text-xs text-muted-foreground mt-2">Window, hallway, or across room</p>
              </div>
              <div className="p-6 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                <p className="text-3xl font-bold text-purple-500">20-60</p>
                <p className="text-sm text-muted-foreground mt-1">seconds of rest</p>
                <p className="text-xs text-muted-foreground mt-2">Include conscious blinking</p>
              </div>
            </div>

            <h2>Practical Tips for Implementation</h2>
            <ol>
              <li>
                <strong>Find your distance target:</strong> Identify something at least 6 feet away from your desk - a window view, a plant, a poster. This will be your go-to focus point.
              </li>
              <li>
                <strong>Pair with existing habits:</strong> Take your break when you reach for water, finish an email, or complete a task. Habit stacking increases compliance.
              </li>
              <li>
                <strong>Make it a full reset:</strong> Stand up, look away, blink deliberately 5-10 times, take a breath. Full resets are more effective than quick glances.
              </li>
              <li>
                <strong>Use smart reminders:</strong> Tools like Lumina that understand your work context and eye strain levels are more effective than simple timers.
              </li>
              <li>
                <strong>Track your patterns:</strong> Notice when your eyes feel most strained. Most people find late afternoon more challenging. Increase break frequency then.
              </li>
            </ol>

            <h2>The Verdict</h2>
            <p>
              Does the 20-20-20 rule work? <strong>Yes, but with caveats.</strong>
            </p>
            <p>
              The underlying science is sound: regular breaks, distance focusing, and increased blinking all demonstrably reduce digital eye strain. The specific numbers (20-20-20) are more guidelines than strict requirements.
            </p>
            <p>
              The real challenge is compliance. A rule that&apos;s physiologically perfect but followed by no one helps no one. That&apos;s why at Lumina, we focus on adaptive, context-aware reminders that work with your natural rhythms rather than against them.
            </p>
            <p>
              The best break is the one you actually take.
            </p>

            <div className="not-prose mt-12 p-6 rounded-xl bg-primary/5 border border-primary/20">
              <h4 className="font-semibold mb-2">Take smarter breaks with Lumina</h4>
              <p className="text-muted-foreground mb-4">
                Lumina monitors your eye strain indicators and suggests breaks when you actually need them - not on a rigid timer.
              </p>
              <Link href="/download" className="btn btn-primary">
                Download Lumina
              </Link>
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
              <Link href="/blog/privacy-first-ai" className="group p-4 rounded-xl border border-border hover:shadow-lg transition-all">
                <h4 className="font-semibold group-hover:text-primary transition-colors">Privacy-First AI: How Lumina Processes Everything Locally</h4>
                <p className="text-sm text-muted-foreground mt-1">Here is how we built a privacy-first wellness system.</p>
              </Link>
            </div>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
