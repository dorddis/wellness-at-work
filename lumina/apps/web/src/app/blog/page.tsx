import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, Eye, Brain, Monitor, Sparkles } from 'lucide-react';
import { Nav } from '@/components/landing/Nav';
import { Footer } from '@/components/landing/Footer';

const blogPosts = [
  {
    title: 'The Science of Blink Rate: Why It Matters for Eye Health',
    excerpt: 'Research shows we blink 66% less when staring at screens. Learn how Lumina uses computer vision to help you maintain healthy blink patterns.',
    date: 'Dec 15, 2025',
    readTime: '8 min read',
    href: '/blog/science-of-blink-rate',
    icon: Eye,
    iconColor: 'text-blue-500',
    bgColor: 'from-blue-500/20 to-blue-500/5',
    category: 'Research',
  },
  {
    title: 'Privacy-First AI: How Lumina Processes Everything Locally',
    excerpt: 'Unlike cloud-based solutions, Lumina never sends your camera feed anywhere. Here is how we built a privacy-first wellness monitoring system.',
    date: 'Dec 8, 2025',
    readTime: '6 min read',
    href: '/blog/privacy-first-ai',
    icon: Brain,
    iconColor: 'text-purple-500',
    bgColor: 'from-purple-500/20 to-purple-500/5',
    category: 'Technology',
  },
  {
    title: 'The 20-20-20 Rule: Does It Actually Work?',
    excerpt: 'Eye doctors recommend looking at something 20 feet away for 20 seconds every 20 minutes. We tested the science behind this popular advice.',
    date: 'Nov 28, 2025',
    readTime: '7 min read',
    href: '/blog/20-20-20-rule',
    icon: Monitor,
    iconColor: 'text-green-500',
    bgColor: 'from-green-500/20 to-green-500/5',
    category: 'Wellness Tips',
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="pt-24 pb-16">
        <div className="container max-w-4xl">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-4">
              <Sparkles className="w-4 h-4" />
              Lumina Blog
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              Insights for Healthier Screen Time
            </h1>
            <p className="text-xl text-muted-foreground">
              Science-backed research, product updates, and wellness tips from the Lumina team.
            </p>
          </div>

          <div className="space-y-8">
            {blogPosts.map((post, index) => (
              <Link
                key={post.href}
                href={post.href}
                className="group block"
              >
                <article className={`rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all ${index === 0 ? 'md:flex' : ''}`}>
                  <div className={`${index === 0 ? 'md:w-2/5' : ''} aspect-video bg-gradient-to-br ${post.bgColor} relative overflow-hidden`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-2xl bg-card/80 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                        <post.icon className={`w-10 h-10 ${post.iconColor}`} />
                      </div>
                    </div>
                    <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10" />
                    <div className="absolute bottom-4 left-4 w-6 h-6 rounded-full bg-white/10" />
                  </div>
                  <div className={`p-6 ${index === 0 ? 'md:w-3/5 md:flex md:flex-col md:justify-center' : ''}`}>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium">
                        {post.category}
                      </span>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {post.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {post.readTime}
                      </div>
                    </div>
                    <h2 className={`font-semibold mb-2 group-hover:text-primary transition-colors ${index === 0 ? 'text-2xl' : 'text-xl'}`}>
                      {post.title}
                    </h2>
                    <p className="text-muted-foreground">
                      {post.excerpt}
                    </p>
                    <div className="mt-4 text-primary font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                      Read article
                      <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>

          <div className="mt-16 p-8 rounded-xl bg-muted/50 border border-border text-center">
            <h3 className="text-xl font-semibold mb-2">Subscribe to our newsletter</h3>
            <p className="text-muted-foreground mb-6">
              Get the latest wellness research and product updates delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="you@company.com"
                className="flex-1 px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button className="btn btn-primary whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
