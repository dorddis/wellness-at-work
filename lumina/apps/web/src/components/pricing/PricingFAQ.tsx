'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'Is there a free trial?',
    answer:
      'Yes! All plans come with a 14-day free trial. No credit card required to get started. You can explore all features and cancel anytime.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards (Visa, Mastercard, American Express) and can also invoice annually for Enterprise customers.',
  },
  {
    question: 'Can I change plans later?',
    answer:
      'Absolutely. You can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Yes. All video processing happens locally on employee devices - no images ever leave the device. We only store anonymized wellness metrics. We are SOC 2 Type II compliant.',
  },
  {
    question: 'What happens when I add or remove team members?',
    answer:
      'Billing is prorated. When you add users, you pay for the remainder of the billing period. When you remove users, you receive credit toward future billing.',
  },
  {
    question: 'Do you offer discounts for annual billing?',
    answer:
      'Yes! Annual plans save you 20% compared to monthly billing. Contact sales for custom pricing on large teams.',
  },
];

export function PricingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => (
        <div
          key={index}
          className="border border-border rounded-lg overflow-hidden"
        >
          <button
            className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
          >
            <span className="font-medium">{faq.question}</span>
            <ChevronDown
              className={`w-5 h-5 text-muted-foreground transition-transform ${
                openIndex === index ? 'rotate-180' : ''
              }`}
            />
          </button>
          {openIndex === index && (
            <div className="px-6 pb-4 text-muted-foreground">
              {faq.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
