import { Eye, Clock, AlertTriangle, TrendingDown } from 'lucide-react';

const stats = [
  {
    icon: Eye,
    stat: '69%',
    label: 'of digital workers',
    description: 'experience Computer Vision Syndrome (CVS)',
  },
  {
    icon: Clock,
    stat: '8+ hours',
    label: 'daily screen time',
    description: 'for knowledge workers and students',
  },
  {
    icon: AlertTriangle,
    stat: '50-70%',
    label: 'of heavy users',
    description: 'suffer chronic neck, shoulder & back pain',
  },
  {
    icon: TrendingDown,
    stat: '30-40%',
    label: 'report poor sleep',
    description: 'due to disrupted circadian rhythm',
  },
];

export function ProblemStats() {
  return (
    <section className="py-20 sm:py-24 bg-foreground text-background">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            The hidden cost of screen time
          </h2>
          <p className="mt-4 text-lg text-background/70 max-w-2xl mx-auto">
            Persistent digital eye strain leads to chronic discomfort, reduced vision quality,
            and degenerative changes in the cervical spine over time.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((item) => (
            <div key={item.label} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 mb-4">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="text-4xl font-bold text-primary mb-1">{item.stat}</div>
              <div className="text-sm font-medium mb-1">{item.label}</div>
              <div className="text-sm text-background/60">{item.description}</div>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-background/50 mt-12">
          Sources:{' '}
          <a
            href="https://pmc.ncbi.nlm.nih.gov/articles/PMC6020759/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-background/70"
          >
            PMC
          </a>
          {', '}
          <a
            href="https://smartergo.com/december-2024-digital-eye-strain-prevalence-and-mitigation-into-2025/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-background/70"
          >
            SmartErgo 2024
          </a>
        </p>
      </div>
    </section>
  );
}
