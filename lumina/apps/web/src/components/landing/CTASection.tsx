import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

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
            
            {/* Left: Image Section (Blue/Image Area) */}
            <div className="relative w-full lg:w-[45%] bg-blue-50/50 min-h-[300px] lg:min-h-auto flex items-end justify-center group">
               {/* Abstract Background behind image */}
               <div className="absolute inset-0 bg-gradient-to-tr from-blue-100/50 to-transparent" />
               <div className="absolute top-10 left-10 w-20 h-20 bg-blue-200/30 rounded-full blur-xl" />
               
               <Image
                src="/images/illustrations/happy-man-sketch.png"
                alt="Happy productive worker"
                width={500}
                height={600}
                className="relative z-10 w-auto h-[90%] object-contain object-bottom transition-transform duration-700 group-hover:scale-105"
              />
            </div>

            {/* The Curve Separator - Desktop */}
            {/* 
              Parabola opening Left: 
              The white shape (Text side) is on the Right.
              It needs to have a "mouth" on the left.
              So the Left Edge of the White shape should be concave (curving inwards to the right).
              This allows the Image section to "bulge" into the text area.
            */}
            <div className="absolute top-0 bottom-0 left-[45%] w-24 hidden lg:block z-20 pointer-events-none text-card transform -translate-x-1/2">
               <svg 
                  className="h-full w-full fill-current drop-shadow-xl" 
                  viewBox="0 0 100 100" 
                  preserveAspectRatio="none"
                  style={{ filter: 'drop-shadow(-4px 0 4px rgba(0,0,0,0.05))' }}
                >
                  {/* 
                    Path:
                    Starts at Top Right (100,0) -> stays there? No, we are drawing the LEFT edge of the White box.
                    The White box is to the right of this SVG.
                    Actually, let's make the SVG part of the White background?
                    
                    Easier: This SVG IS the transition. 
                    It should be the color of the CARD BG (White).
                    
                    Shape:
                    M 100 0 (Top Right)
                    L 100 100 (Bottom Right)
                    L 50 100 (Bottom Middle)
                    Q 0 50 50 0 (Curve to Top Middle, control point at 0,50 - extreme left center)
                    Z
                    
                    This draws a shape that is flat on the right (connecting to the white text area)
                    and curved on the left (bulging left? No Q 0 50 means control point is Left. So it bulges Left).
                    Wait, if I want it "Opening Left", the mouth is on the left. The curve is on the right.
                    
                    If the PARABOLA opens Left, it looks like C.
                    So the White Shape (on the right) should be the "Back" of the C? No, the White Shape IS the C?
                    
                    User: "Parabola that is opening towards the left and is white".
                    This implies the White Shape corresponds to the curve `x = y^2` (opening right) or `x = -y^2` (opening left).
                    
                    If the White Shape is the "Parabola":
                    And it opens Left.
                    It looks like a `C` facing left? No, `C` faces right (opens right).
                    `(` faces right. `)` faces left.
                    
                    Let's assume "Opening Left" means the "Cup" is open to the left.
                    So the White shape is concave on the left side.
                    Like:  |   (   |
                           | Text  |
                           
                    This means the Image (Left) bulges into the Text (Right).
                    
                    Path for the SVG (placed on the seam):
                    We need to fill the RIGHT side of the SVG box with White.
                    The Left edge of this fill should be curved.
                    
                    M 100 0 (Top Right)
                    L 100 100 (Bottom Right)
                    L 0 100 (Bottom Left - Start of curve?)
                    
                    If we want it concave (bulging right, into the white):
                    Start Bottom Left (0, 100).
                    Curve to Top Left (0, 0).
                    Control point (100, 50).
                    This would make a shape that goes 0,100 -> curve -> 0,0.
                    The control point 100,50 pulls the curve to the RIGHT.
                    So the "Void" is on the Left. The "White" is on the Right, but it's "dented".
                    
                    This matches "Opening Left" (The void/cup is on the left).
                    
                    Let's try: 
                    M 100 0
                    L 100 100
                    L 0 100
                    Q 80 50 0 0  (Curve from 0,100 to 0,0 with control point 80,50 pulling it right)
                    Z
                  */}
                  <path d="M 100 0 L 100 100 L 0 100 Q 60 50 0 0 Z" />
               </svg>
            </div>

            {/* Mobile Curve (Top to Bottom) */}
            <div className="absolute top-[300px] left-0 right-0 h-16 z-20 pointer-events-none text-card w-full lg:hidden transform -translate-y-1/2">
                <svg 
                  className="h-full w-full fill-current" 
                  viewBox="0 0 100 100" 
                  preserveAspectRatio="none"
                >
                  <path d="M 0 100 L 100 100 L 100 0 Q 50 60 0 0 Z" />
                </svg>
            </div>


            {/* Right: Content Section */}
            <div className="w-full lg:w-[55%] p-10 lg:p-16 flex flex-col justify-center relative z-10 bg-card lg:pl-16">
              
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
                <br className="hidden lg:block" />
                Start your journey to a healthier workspace today.
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
    </section>
  );
}