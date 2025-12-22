import Link from 'next/link';
import { Check } from 'lucide-react';

interface PricingTierProps {
  name: string;
  description: string;
  price: string;
  priceDetail: string;
  features: string[];
  cta: string;
  ctaHref: string;
  popular?: boolean;
}

export function PricingTierCard({
  name,
  description,
  price,
  priceDetail,
  features,
  cta,
  ctaHref,
  popular = false,
}: PricingTierProps) {
  return (
    <div
      className={`relative rounded-2xl border p-8 ${
        popular
          ? 'border-primary shadow-lg scale-105 bg-card'
          : 'border-border bg-card'
      }`}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-1.5 rounded-full">
            Most Popular
          </span>
        </div>
      )}

      <div className="text-center">
        <h3 className="text-xl font-semibold">{name}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>

        <div className="mt-6">
          <span className="text-4xl font-bold">{price}</span>
          <span className="text-muted-foreground">{priceDetail}</span>
        </div>
      </div>

      <ul className="mt-8 space-y-4">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href={ctaHref}
        className={`mt-8 block text-center py-3 px-6 rounded-lg font-medium transition-colors ${
          popular
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}
