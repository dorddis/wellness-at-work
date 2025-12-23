import { Nav, Footer } from '@/components/landing';

export const metadata = {
  title: 'Security | Lumina',
  description: 'How Lumina keeps your data secure.',
};

const securityFeatures = [
  {
    title: 'On-Device Processing',
    description: 'All computer vision and AI processing happens locally on your device. No images or video are ever transmitted to our servers.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'Encryption in Transit',
    description: 'All data transmitted to our cloud services is encrypted using TLS 1.3, the latest transport layer security protocol.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: 'Encryption at Rest',
    description: 'All stored data is encrypted using AES-256 encryption. Local SQLite databases use WAL mode for data integrity.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    ),
  },
  {
    title: 'Row-Level Security',
    description: 'Database access is controlled by row-level security policies. Users can only access their own data.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'SOC 2 Type II',
    description: 'Our infrastructure provider (Supabase) is SOC 2 Type II certified, ensuring rigorous security controls.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    title: 'GDPR Compliant',
    description: 'We comply with GDPR and PDPA (Singapore) data protection regulations. Data subject rights are fully supported.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    ),
  },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* Hero */}
      <section className="py-20 sm:py-24 text-center">
        <div className="container">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Security First
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Your privacy and data security are fundamental to how we build Lumina.
            Here&apos;s how we protect you.
          </p>
        </div>
      </section>

      {/* Privacy Architecture */}
      <section className="pb-20">
        <div className="container">
          <div className="max-w-3xl mx-auto bg-card border border-border rounded-xl p-8">
            <h2 className="text-2xl font-semibold mb-6 text-center">
              Privacy by Architecture
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-semibold">1</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Camera captures video</p>
                  <p className="text-sm">Processed locally by MediaPipe face detection</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-semibold">2</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">AI extracts metrics only</p>
                  <p className="text-sm">Blink count, posture angle, fatigue score - no images</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-semibold">3</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Metrics aggregated locally</p>
                  <p className="text-sm">Raw events rolled up to minute-level summaries</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-semibold">4</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Only summaries synced to cloud</p>
                  <p className="text-sm">Encrypted, minimal data for team analytics</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-bold text-center mb-12">
            Security Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {securityFeatures.map((feature) => (
              <div
                key={feature.title}
                className="bg-card border border-border rounded-lg p-6"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-6">Enterprise Security</h2>
            <p className="text-muted-foreground mb-8">
              For organizations with advanced security requirements, we offer additional options:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="font-medium">SSO / SAML Integration</p>
                <p className="text-sm text-muted-foreground">Integrate with your identity provider</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="font-medium">On-Premise Deployment</p>
                <p className="text-sm text-muted-foreground">Run entirely within your infrastructure</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="font-medium">Custom Data Retention</p>
                <p className="text-sm text-muted-foreground">Configure retention policies to your needs</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="font-medium">Audit Logs</p>
                <p className="text-sm text-muted-foreground">Detailed logs for compliance requirements</p>
              </div>
            </div>
            <a
              href="mailto:security@wellnessatwork.ai"
              className="mt-8 inline-block btn bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3"
            >
              Contact Security Team
            </a>
          </div>
        </div>
      </section>

      {/* Report Vulnerability */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Report a Vulnerability</h2>
            <p className="text-muted-foreground mb-6">
              If you discover a security vulnerability, please report it responsibly
              to our security team. We appreciate your help in keeping Lumina secure.
            </p>
            <a
              href="mailto:security@wellnessatwork.ai"
              className="text-primary hover:underline font-medium"
            >
              security@wellnessatwork.ai
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
