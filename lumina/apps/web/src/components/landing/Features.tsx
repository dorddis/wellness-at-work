import { Eye, Activity, Shield, Bell, BarChart3, Smile } from 'lucide-react';

const features = [
  {
    icon: Eye,
    title: 'Smart Blink Detection',
    description: 'Lumina analyzes your blink patterns and sends gentle reminders to blink optimally, maintaining healthy eye moisture and comfort.',
  },
  {
    icon: Activity,
    title: 'Posture Monitoring',
    description: 'Track your sitting posture in real-time. Get quick tips to reduce neck, shoulder, and back strain before it becomes chronic.',
  },
  {
    icon: Shield,
    title: 'Privacy by Design',
    description: 'All camera feeds are processed locally on your device. No video is stored. No images leave your computer. Ever.',
  },
  {
    icon: Bell,
    title: 'Intelligent Reminders',
    description: 'Context-aware alerts that respect your focus. Syncs with your calendar to pause during meetings and important work.',
  },
  {
    icon: BarChart3,
    title: 'Wellness Analytics',
    description: 'Track your daily, weekly, and monthly wellness trends. Understand your patterns and see improvement over time.',
  },
  {
    icon: Smile,
    title: 'Fatigue Detection',
    description: 'Advanced algorithms detect signs of drowsiness and eye fatigue, suggesting breaks before exhaustion sets in.',
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="relative p-6 rounded-2xl border border-border bg-card hover:shadow-lg hover:border-primary/20 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
