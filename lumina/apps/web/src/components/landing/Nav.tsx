'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

// Lumina Logo SVG Component
function LuminaLogo({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer circle */}
      <circle cx="20" cy="20" r="18" className="stroke-primary" strokeWidth="2" fill="none" />
      {/* Eye shape */}
      <ellipse cx="20" cy="20" rx="10" ry="7" className="stroke-primary" strokeWidth="2" fill="none" />
      {/* Iris */}
      <circle cx="20" cy="20" r="4" className="fill-primary" />
      {/* Shine */}
      <circle cx="22" cy="18" r="1.5" className="fill-background" />
      {/* Rays */}
      <line x1="20" y1="2" x2="20" y2="6" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="34" x2="20" y2="38" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
      <line x1="2" y1="20" x2="6" y2="20" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
      <line x1="34" y1="20" x2="38" y2="20" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const navLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Download', href: '/download' },
];

export function Nav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <LuminaLogo />
          <span className="text-xl font-bold">Lumina</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Sign In
          </Link>
          <Link href="/login" className="btn btn-primary text-sm">
            Get Started
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="container py-4 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-border space-y-3">
              <Link
                href="/login"
                className="block text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
              <Link
                href="/login"
                className="btn btn-primary text-sm w-full text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
