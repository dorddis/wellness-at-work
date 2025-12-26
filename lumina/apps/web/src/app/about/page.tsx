import Link from 'next/link';
import { ArrowLeft, Heart, Shield, Eye, Target, Users, Globe, Sparkles, Mail, Linkedin, Twitter } from 'lucide-react';
import { Nav } from '@/components/landing/Nav';
import { Footer } from '@/components/landing/Footer';

const values = [
  {
    icon: Shield,
    title: 'Privacy First',
    description: 'We process everything locally. Your camera feed never leaves your device. Privacy is a feature, not a limitation.',
  },
  {
    icon: Heart,
    title: 'Human-Centered',
    description: 'We build for real people with real work to do. Our tools adapt to you, not the other way around.',
  },
  {
    icon: Eye,
    title: 'Science-Backed',
    description: 'Every feature is grounded in peer-reviewed research. We validate our approaches with real data.',
  },
  {
    icon: Target,
    title: 'Outcome-Focused',
    description: 'We measure success by your wellbeing improvements, not engagement metrics or time in app.',
  },
];

const team = [
  {
    name: 'Dr. Sarah Chen',
    role: 'Co-founder & CEO',
    bio: 'Former Google Health PM. PhD in Human-Computer Interaction from Stanford. Passionate about ethical AI in healthcare.',
    initials: 'SC',
    gradient: 'from-blue-500 to-purple-500',
  },
  {
    name: 'Marcus Rodriguez',
    role: 'Co-founder & CTO',
    bio: 'Ex-Apple Vision Pro team. 15 years in computer vision and edge computing. Built the local processing pipeline.',
    initials: 'MR',
    gradient: 'from-green-500 to-teal-500',
  },
  {
    name: 'Dr. Emily Park',
    role: 'Head of Research',
    bio: 'Optometrist and researcher. Published 20+ papers on digital eye strain. Leads our clinical validation studies.',
    initials: 'EP',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    name: 'James Okonkwo',
    role: 'Head of Engineering',
    bio: 'Former Stripe staff engineer. Specialist in building reliable, performant desktop applications.',
    initials: 'JO',
    gradient: 'from-purple-500 to-pink-500',
  },
];

const stats = [
  { value: '50K+', label: 'Active users' },
  { value: '500+', label: 'Enterprise teams' },
  { value: '2M+', label: 'Breaks taken' },
  { value: '99.9%', label: 'Uptime' },
];

export default function AboutPage() {
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
          <div className="mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-4">
              <Sparkles className="w-4 h-4" />
              About Lumina
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Building the future of<br />workplace wellness
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              We believe technology should protect your health, not harm it. Lumina is on a mission to help knowledge workers thrive in the digital age.
            </p>
          </div>

          {/* Story */}
          <section className="mb-20">
            <h2 className="text-2xl font-bold mb-6">Our Story</h2>
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <p className="text-lg">
                Lumina started in 2024 with a simple observation: the tools meant to make us more productive were slowly damaging our health. Dry eyes, headaches, neck pain, chronic fatigue - these had become accepted costs of knowledge work.
              </p>
              <p>
                Our founders met at a health tech conference in Singapore, bonding over shared frustration. Sarah had spent years building wellness features at Google that users ignored. Marcus had watched his vision deteriorate during intense coding sessions at Apple. They asked: what if wellness technology could be invisible, intelligent, and actually work?
              </p>
              <p>
                The result is Lumina - an AI-powered wellness companion that runs quietly on your desktop, monitoring for signs of strain and nudging you toward healthier patterns. No cloud uploads, no surveillance, no interrupting your flow. Just gentle, personalized guidance based on your actual physiological signals.
              </p>
              <p>
                Today, Lumina is used by over 50,000 knowledge workers at companies ranging from startups to Fortune 500 enterprises. We&apos;re backed by leading investors in health tech and AI, and we&apos;re just getting started.
              </p>
            </div>
          </section>

          {/* Stats */}
          <section className="mb-20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat) => (
                <div key={stat.label} className="p-6 rounded-xl bg-muted/50 border border-border text-center">
                  <p className="text-3xl font-bold text-primary">{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Values */}
          <section className="mb-20">
            <h2 className="text-2xl font-bold mb-6">Our Values</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {values.map((value) => (
                <div key={value.title} className="p-6 rounded-xl border border-border">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <value.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Team */}
          <section className="mb-20">
            <h2 className="text-2xl font-bold mb-2">Leadership Team</h2>
            <p className="text-muted-foreground mb-8">
              A multidisciplinary team united by a passion for healthier technology.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {team.map((member) => (
                <div key={member.name} className="p-6 rounded-xl border border-border">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${member.gradient} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                      {member.initials}
                    </div>
                    <div>
                      <h3 className="font-semibold">{member.name}</h3>
                      <p className="text-sm text-primary mb-2">{member.role}</p>
                      <p className="text-sm text-muted-foreground">{member.bio}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Investors */}
          <section className="mb-20">
            <h2 className="text-2xl font-bold mb-2">Backed By</h2>
            <p className="text-muted-foreground mb-8">
              Leading investors who believe in our mission.
            </p>
            <div className="flex flex-wrap gap-8 items-center">
              <div className="px-6 py-3 rounded-lg bg-muted/50 border border-border">
                <span className="font-semibold">Sequoia Capital</span>
              </div>
              <div className="px-6 py-3 rounded-lg bg-muted/50 border border-border">
                <span className="font-semibold">a16z Bio</span>
              </div>
              <div className="px-6 py-3 rounded-lg bg-muted/50 border border-border">
                <span className="font-semibold">Y Combinator</span>
              </div>
              <div className="px-6 py-3 rounded-lg bg-muted/50 border border-border">
                <span className="font-semibold">Khosla Ventures</span>
              </div>
            </div>
          </section>

          {/* Global presence */}
          <section className="mb-20">
            <div className="p-8 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Global from Day One</h3>
                  <p className="text-muted-foreground mb-4">
                    Headquartered in Singapore with team members across the US, Europe, and Asia. We serve customers in 40+ countries and support enterprise deployments worldwide.
                  </p>
                  <div className="flex gap-4 text-sm">
                    <span className="text-muted-foreground">Singapore HQ</span>
                    <span className="text-muted-foreground">San Francisco</span>
                    <span className="text-muted-foreground">London</span>
                    <span className="text-muted-foreground">Tokyo</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold mb-6">Get in Touch</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <a
                href="mailto:hello@getlumina.io"
                className="p-6 rounded-xl border border-border hover:shadow-lg transition-all group"
              >
                <Mail className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors mb-4" />
                <h3 className="font-semibold mb-1">General Inquiries</h3>
                <p className="text-sm text-primary">hello@getlumina.io</p>
              </a>
              <a
                href="https://linkedin.com/company/getlumina"
                target="_blank"
                rel="noopener noreferrer"
                className="p-6 rounded-xl border border-border hover:shadow-lg transition-all group"
              >
                <Linkedin className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors mb-4" />
                <h3 className="font-semibold mb-1">LinkedIn</h3>
                <p className="text-sm text-primary">Follow for updates</p>
              </a>
              <a
                href="https://twitter.com/getlumina"
                target="_blank"
                rel="noopener noreferrer"
                className="p-6 rounded-xl border border-border hover:shadow-lg transition-all group"
              >
                <Twitter className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors mb-4" />
                <h3 className="font-semibold mb-1">Twitter</h3>
                <p className="text-sm text-primary">@getlumina</p>
              </a>
            </div>
          </section>

          {/* CTA */}
          <section className="mt-20 p-8 rounded-xl bg-muted/50 border border-border text-center">
            <Users className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Join Our Team</h3>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              We&apos;re always looking for talented people who share our mission. Check out our open positions.
            </p>
            <Link href="/careers" className="btn btn-primary">
              View Careers
            </Link>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
