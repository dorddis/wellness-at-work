import { Nav, Footer } from '@/components/landing';
import Link from 'next/link';

export const metadata = {
  title: 'Careers | Lumina',
  description: 'Join our team building the future of workplace wellness.',
};

const openings = [
  {
    title: 'Senior Full-Stack Engineer',
    location: 'Remote (APAC)',
    type: 'Full-time',
    description: 'Build and scale our Electron desktop app and Next.js dashboard.',
  },
  {
    title: 'Computer Vision Engineer',
    location: 'Remote (Global)',
    type: 'Full-time',
    description: 'Improve our real-time face detection and wellness metrics algorithms.',
  },
  {
    title: 'Product Designer',
    location: 'Singapore / Remote',
    type: 'Full-time',
    description: 'Design beautiful, accessible interfaces for our desktop and web products.',
  },
];

const values = [
  {
    title: 'Privacy First',
    description: 'We believe wellness technology should never compromise privacy. Every feature starts with "how do we protect user data?"',
  },
  {
    title: 'Ship Fast, Learn Faster',
    description: 'We value iteration over perfection. Get features in front of users quickly and improve based on real feedback.',
  },
  {
    title: 'Remote by Default',
    description: 'Our team is distributed across time zones. We optimize for async communication and deep work time.',
  },
  {
    title: 'Health Matters',
    description: 'We build wellness tools because we believe in them. Unlimited PTO, no meetings Fridays, and we actually take breaks.',
  },
];

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* Hero */}
      <section className="py-20 sm:py-24 text-center">
        <div className="container">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Join Our Team
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Help us build technology that makes work healthier for millions of people.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="pb-20">
        <div className="container">
          <h2 className="text-2xl font-bold text-center mb-12">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {values.map((value) => (
              <div
                key={value.title}
                className="bg-card border border-border rounded-lg p-6"
              >
                <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-bold text-center mb-12">Open Positions</h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {openings.map((job) => (
              <div
                key={job.title}
                className="bg-card border border-border rounded-lg p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <h3 className="font-semibold text-lg">{job.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {job.location} &middot; {job.type}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {job.description}
                  </p>
                </div>
                <a
                  href={`mailto:careers@wellnessatwork.ai?subject=Application: ${encodeURIComponent(job.title)}`}
                  className="btn bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 whitespace-nowrap"
                >
                  Apply
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Don't see a role */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Don&apos;t see your role?</h2>
            <p className="text-muted-foreground mb-6">
              We&apos;re always looking for talented people who are passionate about
              wellness technology. Send us your resume and tell us how you&apos;d
              like to contribute.
            </p>
            <a
              href="mailto:careers@wellnessatwork.ai?subject=General Application"
              className="btn bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3"
            >
              Get in Touch
            </a>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-bold text-center mb-12">Benefits</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto text-center">
            <div>
              <div className="text-3xl mb-2">🌍</div>
              <p className="font-medium">Remote First</p>
              <p className="text-sm text-muted-foreground">Work from anywhere</p>
            </div>
            <div>
              <div className="text-3xl mb-2">🏖️</div>
              <p className="font-medium">Unlimited PTO</p>
              <p className="text-sm text-muted-foreground">Take time when you need it</p>
            </div>
            <div>
              <div className="text-3xl mb-2">💻</div>
              <p className="font-medium">Equipment Budget</p>
              <p className="text-sm text-muted-foreground">Get the tools you need</p>
            </div>
            <div>
              <div className="text-3xl mb-2">📈</div>
              <p className="font-medium">Equity</p>
              <p className="text-sm text-muted-foreground">Own a piece of what you build</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
