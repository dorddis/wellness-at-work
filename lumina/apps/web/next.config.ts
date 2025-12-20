import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@lumina/ui', '@lumina/api'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
};

export default nextConfig;
