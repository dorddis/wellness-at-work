import { Nav, Footer } from '@/components/landing';
import {
  CURRENT_PRIVACY_POLICY_VERSION,
  CURRENT_PRIVACY_POLICY_DATE,
} from '@lumina/ui';

export const metadata = {
  title: 'Privacy Policy | Lumina',
  description: 'How Lumina protects your privacy and handles your data.',
};

export default function PrivacyPage() {
  // Format date for display
  const formattedDate = new Date(CURRENT_PRIVACY_POLICY_DATE).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <article className="py-16 sm:py-20">
        <div className="container max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Privacy Policy
          </h1>
          <div className="flex items-center gap-3 text-muted-foreground mb-12">
            <p>Last updated: {formattedDate}</p>
            <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
              v{CURRENT_PRIVACY_POLICY_VERSION}
            </span>
          </div>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Our Privacy Commitment</h2>
              <p className="text-muted-foreground leading-relaxed">
                At Wellness at Work Pte. Ltd. (&quot;Lumina&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;),
                privacy is not just a policy &mdash; it&apos;s a core architectural decision. Lumina is designed
                to be <strong>privacy-first by default</strong>. All computer vision processing happens
                100% on your device. No images or video ever leave your computer.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">What We Collect</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Processed Locally (Never Transmitted)</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Camera feed for blink and posture detection</li>
                    <li>Screen captures for meeting mode detection</li>
                    <li>Raw wellness events (stored locally in SQLite)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Synced to Cloud (Aggregated Metrics Only)</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Blink counts per minute (not individual blinks)</li>
                    <li>Posture scores (not images or body data)</li>
                    <li>Break completion status</li>
                    <li>Account information (email, organization)</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">How We Use Your Data</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>To provide personalized wellness alerts and recommendations</li>
                <li>To generate team-level analytics for administrators</li>
                <li>To improve our detection algorithms (anonymized, aggregated data only)</li>
                <li>To communicate service updates and support</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Data Storage & Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                Cloud data is stored in Supabase infrastructure with row-level security (RLS) policies.
                All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Local data is stored
                in SQLite with WAL mode for performance and data integrity.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong>Access:</strong> Request a copy of your data at any time</li>
                <li><strong>Deletion:</strong> Request complete deletion of your account and data</li>
                <li><strong>Portability:</strong> Export your data in standard formats</li>
                <li><strong>Correction:</strong> Update or correct inaccurate data</li>
                <li><strong>Opt-out:</strong> Disable cloud sync entirely (local-only mode)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">What We Don&apos;t Do</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>We do NOT sell your data to third parties</li>
                <li>We do NOT perform emotion or sentiment analysis</li>
                <li>We do NOT record or store video/images</li>
                <li>We do NOT track your browsing or application usage</li>
                <li>We do NOT share individual data with employers (only aggregated team metrics)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Enterprise Customers</h2>
              <p className="text-muted-foreground leading-relaxed">
                Enterprise customers can configure custom data retention policies, request on-premise
                deployment, and establish custom data processing agreements (DPAs). Contact
                sales@lumina.app for enterprise privacy requirements.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                For privacy-related inquiries, contact us at{' '}
                <a href="mailto:privacy@wellnessatwork.ai" className="text-primary hover:underline">
                  privacy@wellnessatwork.ai
                </a>
              </p>
              <p className="text-muted-foreground mt-2">
                Wellness at Work Pte. Ltd.<br />
                Singapore
              </p>
            </section>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}
