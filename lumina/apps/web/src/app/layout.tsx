import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import NextTopLoader from 'nextjs-toploader';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Lumina - AI Wellness Platform',
  description: 'B2B AI wellness platform for enterprises. Track eye strain, prevent fatigue, and boost team productivity.',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NextTopLoader
          color="#000"
          showSpinner={false}
          height={2}
          crawlSpeed={200}
          speed={200}
          shadow={false}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
