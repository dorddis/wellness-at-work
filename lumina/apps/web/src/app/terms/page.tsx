import { Nav, Footer } from '@/components/landing';

export const metadata = {
  title: 'Terms of Service | Lumina',
  description: 'Terms and conditions for using Lumina wellness platform.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <article className="py-16 sm:py-20">
        <div className="container max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Terms of Service
          </h1>
          <p className="text-muted-foreground mb-12">
            Last updated: December 22, 2024
          </p>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using Lumina (&quot;the Service&quot;), provided by Lumina Technologies
                (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you agree to be bound by
                these Terms of Service. If you do not agree to these terms, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                Lumina is an AI-powered wellness platform that monitors eye health, posture, and fatigue
                to help knowledge workers maintain healthy work habits. The Service includes desktop
                applications, web dashboards, and related features.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>You must provide accurate and complete registration information</li>
                <li>You are responsible for maintaining the security of your account</li>
                <li>You must notify us immediately of any unauthorized access</li>
                <li>You may not share your account credentials with others</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You agree not to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Use the Service for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Reverse engineer or decompile the software</li>
                <li>Use the Service to monitor others without their consent</li>
                <li>Resell or redistribute the Service without authorization</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Subscription & Billing</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Free trials are available for 14 days</li>
                <li>Paid subscriptions are billed monthly or annually</li>
                <li>You may cancel at any time; access continues until the end of the billing period</li>
                <li>Refunds are available within 30 days of initial purchase</li>
                <li>Prices may change with 30 days notice</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service, including all content, features, and functionality, is owned by
                Lumina Technologies and is protected by international copyright, trademark,
                and other intellectual property laws. You are granted a limited, non-exclusive license
                to use the Service for its intended purpose.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Health Disclaimer</h2>
              <p className="text-muted-foreground leading-relaxed">
                Lumina is a wellness tool, not a medical device. The Service is not intended to diagnose,
                treat, cure, or prevent any disease. Alerts and recommendations are informational only.
                If you have health concerns, consult a qualified healthcare professional.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                To the maximum extent permitted by law, Lumina Technologies shall not be liable
                for any indirect, incidental, special, consequential, or punitive damages, or any loss
                of profits or revenues, whether incurred directly or indirectly.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may terminate or suspend your access to the Service immediately, without prior notice,
                for conduct that we believe violates these Terms or is harmful to other users, us, or
                third parties. Upon termination, your right to use the Service will cease immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these terms at any time. We will notify users of significant
                changes via email or in-app notification. Continued use of the Service after changes
                constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be governed by and construed in accordance with applicable local laws,
                without regard to conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about these Terms, contact us at{' '}
                <a href="mailto:legal@getlumina.io" className="text-primary hover:underline">
                  legal@getlumina.io
                </a>
              </p>
              <p className="text-muted-foreground mt-2">
                Lumina Technologies
              </p>
            </section>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}
