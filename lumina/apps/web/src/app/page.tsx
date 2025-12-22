import {
  Nav,
  Hero,
  CurvedFeature,
  ProblemStats,
  Features,
  HowItWorks,
  BlogPreview,
  PricingPreview,
  CTASection,
  Footer,
} from '@/components/landing';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <Hero />
      <CurvedFeature />
      <ProblemStats />
      <Features />
      <HowItWorks />
      <BlogPreview />
      <PricingPreview />
      <CTASection />
      <Footer />
    </div>
  );
}
