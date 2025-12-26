import Link from 'next/link';

// Lumina Logo SVG Component
function LuminaLogo({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" className="stroke-primary" strokeWidth="2" fill="none" />
      <ellipse cx="20" cy="20" rx="10" ry="7" className="stroke-primary" strokeWidth="2" fill="none" />
      <circle cx="20" cy="20" r="4" className="fill-primary" />
      <circle cx="22" cy="18" r="1.5" className="fill-background" />
      <line x1="20" y1="2" x2="20" y2="6" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="34" x2="20" y2="38" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
      <line x1="2" y1="20" x2="6" y2="20" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
      <line x1="34" y1="20" x2="38" y2="20" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const footerLinks = {
  product: [
    { label: 'Features', href: '/#features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'Download', href: '/download' },
    { label: 'Changelog', href: '/changelog' },
  ],
  resources: [
    { label: 'Documentation', href: '/docs' },
    { label: 'API Reference', href: '/docs/api' },
    { label: 'Research Papers', href: 'https://www.researchgate.net/publication/397122529_Lumina_AI_Real-Time_Eye_Wellness_Monitoring_Using_Advanced_Computer_Vision_and_Machine_Learning', external: true },
    { label: 'Help Center', href: '/help' },
  ],
  company: [
    { label: 'About Us', href: '/about' },
    { label: 'Contact', href: 'mailto:hello@getlumina.io' },
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
              <LuminaLogo />
              <span className="text-xl font-bold">Lumina</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              AI-powered wellness for knowledge workers.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Built for the modern workplace
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
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
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
            &copy; {new Date().getFullYear()} Lumina Technologies. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/lumina-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://twitter.com/getlumina"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Twitter
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
