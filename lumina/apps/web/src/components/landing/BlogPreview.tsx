import Link from 'next/link';
import { ArrowRight, Calendar, Eye, Brain, Monitor } from 'lucide-react';

const blogPosts = [
  {
    title: 'The Science of Blink Rate: Why It Matters for Eye Health',
    excerpt: 'Research shows we blink 66% less when staring at screens. Learn how Lumina uses computer vision to help you maintain healthy blink patterns.',
    date: 'Dec 15, 2025',
    href: '/blog/science-of-blink-rate',
    icon: Eye,
    iconColor: 'text-blue-500',
    bgColor: 'from-blue-500/20 to-blue-500/5',
  },
  {
    title: 'Privacy-First AI: How Lumina Processes Everything Locally',
    excerpt: 'Unlike cloud-based solutions, Lumina never sends your camera feed anywhere. Here is how we built a privacy-first wellness monitoring system.',
    date: 'Dec 8, 2025',
    href: '/blog/privacy-first-ai',
    icon: Brain,
    iconColor: 'text-purple-500',
    bgColor: 'from-purple-500/20 to-purple-500/5',
  },
  {
    title: 'The 20-20-20 Rule: Does It Actually Work?',
    excerpt: 'Eye doctors recommend looking at something 20 feet away for 20 seconds every 20 minutes. We tested the science behind this popular advice.',
    date: 'Nov 28, 2025',
    href: '/blog/20-20-20-rule',
    icon: Monitor,
    iconColor: 'text-green-500',
    bgColor: 'from-green-500/20 to-green-500/5',
  },
];

export function BlogPreview() {
  return (
    <section className="py-20 sm:py-24">
      <div className="container">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Latest from our blog
            </h2>
            <p className="mt-2 text-muted-foreground">
              Science-backed insights for healthier screen habits
            </p>
          </div>
          <Link
            href="/blog"
            className="hidden sm:flex items-center text-primary hover:underline"
          >
            View all posts
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {blogPosts.map((post) => (
            <Link
              key={post.title}
              href={post.href}
              className="group"
            >
              <article className="rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow h-full">
                <div className={`aspect-video bg-gradient-to-br ${post.bgColor} relative overflow-hidden`}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-card/80 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                      <post.icon className={`w-8 h-8 ${post.iconColor}`} />
                    </div>
                  </div>
                  {/* Decorative elements */}
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10" />
                  <div className="absolute bottom-4 left-4 w-6 h-6 rounded-full bg-white/10" />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Calendar className="w-4 h-4" />
                    {post.date}
                  </div>
                  <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {post.excerpt}
                  </p>
                </div>
              </article>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/blog"
            className="text-primary hover:underline inline-flex items-center"
          >
            View all posts
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
