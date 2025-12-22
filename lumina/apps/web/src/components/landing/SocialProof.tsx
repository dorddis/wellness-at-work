export function SocialProof() {
  return (
    <section className="py-12 border-y border-border bg-muted/30">
      <div className="container">
        <p className="text-center text-sm text-muted-foreground mb-8">
          Trusted by forward-thinking companies
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {/* Placeholder logos - replace with actual company logos */}
          {['TechCorp', 'InnovateCo', 'FutureLabs', 'ScaleUp', 'GrowthHQ'].map((company) => (
            <div
              key={company}
              className="text-xl font-semibold text-muted-foreground/50"
            >
              {company}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
