'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, HelpCircle, ChevronDown, Mail, MessageCircle, Book, Shield, Zap, Monitor } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  {
    category: 'Getting Started',
    question: 'How do I install the Lumina desktop app?',
    answer: 'Download the Lumina desktop app from your organization\'s admin portal or the link provided by your employer. Run the installer and follow the on-screen instructions. The app works on both Windows and macOS.',
  },
  {
    category: 'Getting Started',
    question: 'How does blink detection work?',
    answer: 'Lumina uses your webcam to detect blinks using AI-powered face tracking. All processing happens locally on your device - no images or video are ever sent to our servers. We only track metrics like blink rate to help you maintain healthy eye habits.',
  },
  {
    category: 'Privacy',
    question: 'Is my camera data private?',
    answer: 'Absolutely. Lumina processes all camera data locally on your device. No images or video ever leave your computer. Only anonymized wellness metrics (like blink counts) are synced to help generate reports. Your employer cannot see your camera feed.',
  },
  {
    category: 'Privacy',
    question: 'What data does my employer see?',
    answer: 'Your employer only sees aggregated wellness metrics like average blink rate, break compliance, and wellness scores. They cannot see your camera feed, specific timestamps of your activity, or any personal browsing data.',
  },
  {
    category: 'Features',
    question: 'What is the 20-20-20 rule?',
    answer: 'The 20-20-20 rule is a simple technique to reduce eye strain: every 20 minutes, look at something 20 feet away for 20 seconds. Lumina automatically reminds you to take these breaks based on your activity.',
  },
  {
    category: 'Features',
    question: 'How does posture detection work?',
    answer: 'Using the same face tracking technology, Lumina can detect if you\'re sitting too close to the screen, tilting your head, or leaning forward excessively. You\'ll get gentle reminders to adjust your posture.',
  },
  {
    category: 'Features',
    question: 'Can I pause monitoring during meetings?',
    answer: 'Yes! Lumina automatically detects when you\'re in video meetings and can adjust its behavior. You can also manually pause monitoring at any time from the system tray icon.',
  },
  {
    category: 'Troubleshooting',
    question: 'The app says my camera is not detected',
    answer: 'Make sure no other application is using your camera. Try closing video conferencing apps, then restart Lumina. If the issue persists, check your system\'s camera permissions for the Lumina app.',
  },
  {
    category: 'Troubleshooting',
    question: 'Blink detection seems inaccurate',
    answer: 'Ensure good lighting on your face (not backlit). Clean your camera lens. Make sure you\'re within 2-3 feet of the camera. If you wear glasses, try the calibration feature in Settings to improve accuracy.',
  },
  {
    category: 'Account',
    question: 'How do I change my organization?',
    answer: 'Contact your current organization\'s admin to remove you, then use a new invite code to join a different organization. Your historical wellness data stays with your account.',
  },
];

const categories = ['Getting Started', 'Privacy', 'Features', 'Troubleshooting', 'Account'];

export default function HelpPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredFaqs = selectedCategory
    ? faqs.filter(faq => faq.category === selectedCategory)
    : faqs;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Eye className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold">Lumina</span>
          </Link>
          <h1 className="text-3xl font-bold">Help Center</h1>
          <p className="text-muted-foreground mt-2">
            Find answers to common questions about Lumina
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="card p-6 hover:shadow-md transition-shadow">
            <Shield className="w-8 h-8 text-blue-600 mb-3" />
            <h3 className="font-semibold">Privacy First</h3>
            <p className="text-sm text-muted-foreground mt-1">
              All processing happens on your device. Your data stays private.
            </p>
          </div>
          <div className="card p-6 hover:shadow-md transition-shadow">
            <Zap className="w-8 h-8 text-amber-600 mb-3" />
            <h3 className="font-semibold">Quick Setup</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Get started in under 2 minutes with automatic calibration.
            </p>
          </div>
          <div className="card p-6 hover:shadow-md transition-shadow">
            <Monitor className="w-8 h-8 text-green-600 mb-3" />
            <h3 className="font-semibold">Works Everywhere</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Desktop app for Windows and macOS with web dashboard.
            </p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === null
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="space-y-3">
          {filteredFaqs.map((faq, index) => (
            <div key={index} className="card overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {faq.category}
                    </span>
                    <p className="font-medium mt-0.5">{faq.question}</p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-4 pb-4 pl-12">
                  <p className="text-muted-foreground">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="mt-12 card p-8 text-center bg-gray-50">
          <h2 className="text-xl font-semibold mb-2">Still need help?</h2>
          <p className="text-muted-foreground mb-6">
            Our support team is here to assist you
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:support@lumina.app"
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Email Support
            </a>
            <a
              href="#"
              className="btn btn-secondary inline-flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Live Chat
            </a>
            <a
              href="#"
              className="btn btn-secondary inline-flex items-center gap-2"
            >
              <Book className="w-4 h-4" />
              Documentation
            </a>
          </div>
        </div>

        {/* Back link */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          <Link href="/dashboard" className="text-primary hover:underline">
            Back to dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
