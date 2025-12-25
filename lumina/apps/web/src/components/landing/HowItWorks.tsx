import { Download, Zap, TrendingUp, Play } from 'lucide-react';

const YOUTUBE_VIDEO_ID = 'RTUituy28T0';

const steps = [
  {
    icon: Download,
    step: '01',
    title: 'Install the Desktop App',
    description: 'Employees download Lumina and complete a quick 2-minute calibration. Works on Windows and Mac.',
  },
  {
    icon: Zap,
    step: '02',
    title: 'AI Monitors Wellness',
    description: 'Lumina runs silently in the background, tracking blink rate, posture, and fatigue using on-device AI.',
  },
  {
    icon: TrendingUp,
    step: '03',
    title: 'Get Actionable Insights',
    description: 'Admins see team-wide trends. Employees get personalized tips. Everyone stays healthy.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-24 bg-muted/30">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Get started in minutes, not days
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((item, index) => (
            <div key={item.step} className="relative text-center">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-border" />
              )}

              <div className="relative z-10 inline-flex items-center justify-center w-24 h-24 rounded-full bg-background border-2 border-primary mb-6">
                <item.icon className="w-10 h-10 text-primary" />
              </div>

              <div className="text-sm font-medium text-primary mb-2">
                Step {item.step}
              </div>
              <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
              <p className="text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>

        {/* Video Demo Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-primary font-medium mb-2">
              <Play className="w-5 h-5" />
              Watch the full demo
            </div>
            <p className="text-muted-foreground">
              See Lumina in action - a complete walkthrough of all features
            </p>
          </div>
          <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl border border-border">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?rel=0&modestbranding=1`}
              title="Lumina Demo Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
