import Image from 'next/image';
import { Shield, Bell, BarChart3 } from 'lucide-react';

const features = [
  {
    image: '/images/illustrations/eye-icon.png',
    title: 'Smart Blink Detection',
    description: 'Lumina analyzes your blink patterns and sends gentle reminders to blink optimally, maintaining healthy eye moisture and comfort.',
  },
  {
    image: '/images/illustrations/neck-icon.png',
    title: 'Posture Monitoring',
    description: 'Track your sitting posture in real-time. Get quick tips to reduce neck, shoulder, and back strain before it becomes chronic.',
  },
  {
    image: '/images/illustrations/forehead-icon.png',
    title: 'Fatigue Detection',
    description: 'Advanced algorithms detect signs of drowsiness and eye fatigue, suggesting breaks before exhaustion sets in.',
  },
];

const additionalFeatures = [
  {
    icon: Shield,
    title: 'Privacy by Design',
    description: 'All camera feeds are processed locally on your device. No video is stored. No images leave your computer. Ever.',
  },
  {
    icon: Bell,
    title: 'Intelligent Reminders',
    description: 'Context-aware alerts that respect your focus. Syncs with your calendar to pause during meetings.',
  },
  {
    icon: BarChart3,
    title: 'Wellness Analytics',
    description: 'Track your daily, weekly, and monthly wellness trends. Understand your patterns over time.',
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-24">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Science-backed tools for healthier screen time
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Lumina uses advanced, privacy-centric computer vision to help you build
            better screen-use habits and reduce symptoms of digital eye strain.
          </p>
        </div>

        {/* Main features with illustrations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card hover:shadow-xl hover:border-primary/20 transition-all text-center"
            >
              <div className="relative z-10 p-8 pb-32">
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-foreground/80 font-medium leading-relaxed">{feature.description}</p>
              </div>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[30rem] h-72 opacity-40 group-hover:opacity-100 transition-opacity overflow-hidden">
                <Image
                  src={feature.image}
                  alt={feature.title}
                  fill
                  className="object-cover object-bottom"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Additional features with icons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {additionalFeatures.map((feature) => (
            <div
              key={feature.title}
              className="flex gap-4 p-6 rounded-xl border border-border bg-card/50 hover:bg-card transition-colors"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
