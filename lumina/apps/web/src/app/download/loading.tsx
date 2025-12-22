import { Nav, Footer } from '@/components/landing';
import { Download } from 'lucide-react';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded ${className}`} />;
}

export default function DownloadLoading() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-16 sm:py-24">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary mb-6">
                <Download className="w-4 h-4" />
                Desktop App
              </div>

              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Download Lumina
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                AI-powered eye wellness that runs silently in the background.
                <br />
                Available for Windows and macOS.
              </p>

              {/* Download Buttons Skeleton */}
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Skeleton className="h-16 w-full sm:w-[200px]" />
                <Skeleton className="h-16 w-full sm:w-[200px]" />
              </div>
              <Skeleton className="h-4 w-24 mx-auto mt-4" />
            </div>
          </div>
        </section>

        {/* System Requirements Skeleton */}
        <section className="py-16 border-t border-border">
          <div className="container">
            <div className="mx-auto max-w-3xl">
              <Skeleton className="h-8 w-64 mx-auto mb-10" />
              <div className="grid md:grid-cols-2 gap-8">
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
