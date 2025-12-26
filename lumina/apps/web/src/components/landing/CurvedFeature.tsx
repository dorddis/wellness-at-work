import Image from 'next/image';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function CurvedFeature() {
  return (
    <section className="py-24 bg-background overflow-hidden">
      <div className="container px-4 md:px-6">
        <div className="relative rounded-[2.5rem] bg-card border border-border/50 shadow-2xl overflow-hidden">
          <div className="flex flex-col lg:flex-row min-h-[600px]">
            
            {/* Left Content Section */}
            <div className="w-full lg:w-[55%] p-12 lg:p-16 flex flex-col justify-center relative z-10 bg-card">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  Live Demo
                </div>

                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6 text-foreground">
                  Your Wellness, <br/>
                  <span className="text-primary"> reimagined.</span>
                </h2>
                
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  Experience the seamless integration of wellness into your workflow. 
                  Our advanced detection system works silently in the background, 
                  providing timely nudges when you need them most.
                </p>

                <ul className="space-y-4 mb-10">
                  {[
                    'Real-time posture analysis',
                    'Intelligent blink rate monitoring',
                    'Privacy-first on-device processing'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-foreground/80 font-medium">{item}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/download"
                  className="inline-flex items-center justify-center px-8 py-4 text-base font-medium transition-colors rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 w-fit group shadow-lg shadow-primary/20"
                >
                  Download Free
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Right Image Section */}
            <div className="relative w-full lg:w-[45%] bg-muted min-h-[400px] lg:min-h-auto group">
              <Image
                src="/images/illustrations/hero-illustration.png"
                alt="Wellness Dashboard Preview"
                fill
                className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                priority
              />
              
              {/* Overlay Gradient for contrast if needed */}
              <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />

              {/* THE CURVE - Parabola opening left (White shape bulging right) */}
              <div className="absolute top-0 bottom-0 -left-1 w-24 lg:w-32 z-20 pointer-events-none text-card h-full hidden lg:block">
                <svg 
                  className="h-full w-full fill-current" 
                  viewBox="0 0 100 100" 
                  preserveAspectRatio="none"
                >
                  {/* 
                    Path explanation:
                    M 0 0: Start top-left
                    L 20 0: Move top, slightly right
                    Q 100 50 20 100: Curve to bottom, slightly right, using control point (100, 50) - extreme right center
                    L 0 100: Move bottom-left
                    Z: Close
                   */}
                  <path d="M -2 0 L 30 0 Q 100 50 30 100 L -2 100 Z" />
                </svg>
              </div>
              
              {/* Mobile Curve (Top to Bottom transition) */}
               <div className="absolute -top-1 left-0 right-0 h-16 z-20 pointer-events-none text-card w-full lg:hidden">
                <svg 
                  className="h-full w-full fill-current" 
                  viewBox="0 0 100 100" 
                  preserveAspectRatio="none"
                >
                  <path d="M 0 -2 L 0 30 Q 50 100 100 30 L 100 -2 Z" />
                </svg>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
