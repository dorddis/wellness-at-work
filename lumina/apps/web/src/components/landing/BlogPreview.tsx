import Link from 'next/link';
import { ArrowRight, Calendar } from 'lucide-react';
import Image from 'next/image';

const blogPosts = [
  {
    title: 'Best Screen Settings for Eyes: A Science-Backed Guide',
    excerpt: 'Learn the science behind brightness, color temperature, and dark mode to create a custom visual comfort profile.',
    date: 'Oct 4, 2025',
    href: 'https://www.wellnessatwork.ai/post/best-screen-settings-for-eyes-a-science-backed-guide-to-visual-comfort-and-productivity',
    image: 'https://static.wixstatic.com/media/853d14_28b97f32114547e78c46ba2ccfb24242~mv2.png/v1/fill/w_600,h_400,al_c,q_85/853d14_28b97f32114547e78c46ba2ccfb24242~mv2.webp',
  },
  {
    title: 'Symptoms of CVS: A Deep Dive into Digital Eye Strain',
    excerpt: 'Understand Computer Vision Syndrome - from dry eyes and blurred vision to neck pain and what you can do about it.',
    date: 'Aug 22, 2025',
    href: 'https://www.wellnessatwork.ai/post/symptoms-of-cvs-a-deep-dive-into-digital-eye-strain',
    image: 'https://static.wixstatic.com/media/853d14_8b1234567890~mv2.png/v1/fill/w_600,h_400,al_c,q_85/digital-eye-strain.webp',
  },
  {
    title: 'How Smart Screen Settings Minimize Digital Eye Strain',
    excerpt: 'Eye health isn\'t about avoiding screens - it\'s about mastering your screen environment with the right settings.',
    date: 'Aug 12, 2025',
    href: 'https://www.wellnessatwork.ai/post/how-smart-screen-settings-can-help-you-minimize-digital-eye-strain',
    image: 'https://static.wixstatic.com/media/853d14_smart_screen~mv2.png/v1/fill/w_600,h_400,al_c,q_85/smart-screen.webp',
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
            href="https://www.wellnessatwork.ai/blog"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center text-primary hover:underline"
          >
            View all posts
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {blogPosts.map((post) => (
            <a
              key={post.title}
              href={post.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <article className="rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-muted relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 group-hover:from-primary/30 transition-colors" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-bold text-primary/20">
                      {post.title.charAt(0)}
                    </span>
                  </div>
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
            </a>
          ))}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link
            href="https://www.wellnessatwork.ai/blog"
            target="_blank"
            rel="noopener noreferrer"
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
