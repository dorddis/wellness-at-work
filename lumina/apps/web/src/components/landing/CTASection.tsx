import Link from 'next/link';
import { ArrowRight, CheckCircle2, Sparkles, Eye, TrendingUp, Zap, Heart } from 'lucide-react';

export function CTASection() {
  return (
    <section className="py-20 sm:py-28 bg-primary relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="container relative z-10">

        {/* The Card */}
        <div className="relative rounded-[3rem] bg-card shadow-2xl overflow-hidden mx-auto max-w-6xl">
          <div className="flex flex-col lg:flex-row min-h-[550px]">

            {/* Left: CSS-based Illustration Section */}
            <div className="relative w-full lg:w-[45%] bg-gradient-to-br from-primary/10 via-primary/5 to-blue-50/50 flex items-center justify-center group overflow-hidden p-8">
               {/* Abstract Background */}
               <div className="absolute inset-0 bg-gradient-to-tr from-blue-100/50 to-transparent" />
               <div className="absolute top-10 left-10 w-20 h-20 bg-blue-200/30 rounded-full blur-xl" />
               <div className="absolute bottom-20 right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />

               {/* CSS-based wellness illustration */}
               <div className="relative w-full max-w-xs aspect-square">
                 {/* Central circle with pulse */}
                 <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-32 h-32 rounded-full bg-primary/20 animate-pulse" />
                   <div className="absolute w-24 h-24 rounded-full bg-primary/30" />
                   <div className="absolute w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                     <Heart className="w-8 h-8 text-white" />
                   </div>
                 </div>

                 {/* Orbiting icons */}
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 bg-card rounded-xl shadow-lg p-3 animate-bounce" style={{ animationDuration: '3s' }}>
                   <Eye className="w-6 h-6 text-blue-500" />
                 </div>
                 <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 bg-card rounded-xl shadow-lg p-3 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }}>
                   <TrendingUp className="w-6 h-6 text-green-500" />
                 </div>
                 <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-2 bg-card rounded-xl shadow-lg p-3 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>
                   <Zap className="w-6 h-6 text-yellow-500" />
                 </div>
                 <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-2 bg-card rounded-xl shadow-lg p-3 animate-bounce" style={{ animationDuration: '3.2s', animationDelay: '1.5s' }}>
                   <Sparkles className="w-6 h-6 text-purple-500" />
                 </div>

                 {/* Decorative elements */}
                 <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-primary/50 rounded-full" />
                 <div className="absolute bottom-1/4 left-1/4 w-3 h-3 bg-blue-400/50 rounded-full" />
                 <div className="absolute top-1/3 left-1/6 w-2 h-2 bg-green-400/50 rounded-full" />
               </div>
            </div>

            {/* Right: Content Section */}
            <div className="relative w-full lg:w-[55%] bg-card flex flex-col justify-center">
              
              {/* DESKTOP CURVE: Absolute on the Left of the content panel */}
              {/* This SVG sits on the seam. It is white (matching text bg). It covers the blue image bg. */}
              <div className="absolute top-0 bottom-0 -left-24 w-24 hidden lg:block z-20 pointer-events-none text-card h-full">
                 <svg 
                    className="h-full w-full fill-current" 
                    viewBox="0 0 100 100" 
                    preserveAspectRatio="none"
                  >
                    {/* 
                      Rect covering everything: No.
                      We want the "White" shape.
                      The SVG is placed to the LEFT of the content block.
                      So the Right edge of SVG touches the Content block (White).
                      The Left edge of SVG touches the Image block (Blue).
                      
                      We need to fill the SVG with WHITE, but leave a transparent "Hole" on the left that looks like a curve.
                      
                      M 100 0 (Top Right - connects to content)
                      L 100 100 (Bottom Right - connects to content)
                      L 0 100 (Bottom Left)
                      Q 60 50 0 0 (Curve from Bottom Left to Top Left, bulging right into the white)
                      Z
                    */}
                    <path d="M 100 0 L 100 100 L 0 100 Q 60 50 0 0 Z" />
                 </svg>
              </div>

              {/* MOBILE CURVE: Absolute on the Top of the content panel */}
              {/* This SVG sits on the seam between Top Image and Bottom Text. */}
              <div className="absolute -top-16 left-0 right-0 h-16 w-full lg:hidden z-20 pointer-events-none text-card">
                  <svg 
                    className="h-full w-full fill-current" 
                    viewBox="0 0 100 100" 
                    preserveAspectRatio="none"
                  >
                    {/* 
                      We are at the TOP of the white box.
                      We want to extend the white UPWARDS into the blue.
                      So we fill the bottom (touching the box) and curve the top.
                      
                      M 0 100 (Bottom Left - touches box)
                      L 100 100 (Bottom Right - touches box)
                      L 100 0 (Top Right)
                      Q 50 60 0 0 (Curve from Top Right to Top Left, dipping down?)
                      
                      Wait, if we want "Parabola Opening Left" logic (concave white), 
                      on mobile vertical stack, maybe "Concave White" means "U" shape?
                      
                      Let's sticking to the "Bulge" design.
                      The white should Bulge UP into the image? Or Image bulge DOWN into white?
                      The desktop one has Image bulging into White.
                      So Mobile should have Image bulging DOWN into White.
                      
                      So the White shape should be "dented" at the top.
                      
                      M 0 100 (Bottom Left)
                      L 100 100 (Bottom Right)
                      L 100 0 (Top Right)
                      Q 50 100 0 0 (Curve Top Right -> Top Left, Control Point (50, 100) pulls it DEEP down)
                      Z
                      
                      This creates a deep valley in the top of the white SVG. 
                      The blue image will show through the valley.
                    */}
                    <path d="M 0 100 L 100 100 L 100 0 Q 50 80 0 0 Z" />
                  </svg>
              </div>

              <div className="p-10 lg:p-16 lg:pl-4 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 w-fit">
                  <Sparkles className="w-4 h-4" />
                  <span>Transform Your Workflow</span>
                </div>

                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6 text-foreground">
                  Ready to improve your <br/>
                  <span className="text-primary relative">
                    team's wellness?
                    <svg className="absolute w-full h-3 -bottom-1 left-0 text-primary/20" viewBox="0 0 100 10" preserveAspectRatio="none">
                      <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="3" fill="none" />
                    </svg>
                  </span>
                </h2>
                
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  Join forward-thinking companies using Lumina to reduce eye strain, 
                  improve posture, and boost productivity across their teams.
                </p>

                <div className="space-y-4 mb-10">
                  {[
                    'Enterprise-grade security & privacy',
                    'Seamless integration with your tools',
                    'Detailed wellness analytics & reports'
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-foreground/80 font-medium">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/login"
                    className="btn btn-primary px-8 py-4 text-base rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-0.5"
                  >
                    Start Free Trial
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                  <Link
                    href="/pricing"
                    className="btn btn-outline px-8 py-4 text-base rounded-xl hover:bg-muted transition-all"
                  >
                    View Pricing
                  </Link>
                </div>
                
                <p className="mt-6 text-sm text-muted-foreground">
                  No credit card required • 14-day free trial • Cancel anytime
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
