import Link from 'next/link';
import Image from 'next/image';

const footerLinks = {
  product: [
    { label: 'Features', href: '/#features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'Download', href: '/download' },
  ],
  resources: [
    { label: 'Blog', href: 'https://www.wellnessatwork.ai/blog', external: true },
    { label: 'Screen Settings Guide', href: 'https://www.wellnessatwork.ai/post/best-screen-settings-for-eyes-a-science-backed-guide-to-visual-comfort-and-productivity', external: true },
    { label: 'CVS Symptoms', href: 'https://www.wellnessatwork.ai/post/symptoms-of-cvs-a-deep-dive-into-digital-eye-strain', external: true },
    { label: 'Research', href: 'https://www.researchgate.net/publication/397122529_Lumina_AI_Real-Time_Eye_Wellness_Monitoring_Using_Advanced_Computer_Vision_and_Machine_Learning', external: true },
  ],
  company: [
    { label: 'About Us', href: 'https://www.wellnessatwork.ai/about-us', external: true },
    { label: 'Contact', href: 'mailto:hello@wellnessatwork.ai' },
    { label: 'Careers', href: '/careers' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Security', href: '/security' },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border py-12 sm:py-16 bg-muted/30">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/images/illustrations/logo-circular.png"
                alt="Lumina"
                width={40}
                height={40}
                className="w-10 h-10"
              />
              <span className="text-xl font-bold">Lumina</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              AI-powered wellness for knowledge workers.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Based in Singapore
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                    {link.external && (
                      <span className="ml-1 text-xs">↗</span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                    {link.external && (
                      <span className="ml-1 text-xs">↗</span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Wellness at Work Pte. Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a
              href="https://www.wellnessatwork.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              wellnessatwork.ai
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
