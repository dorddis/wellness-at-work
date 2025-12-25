import type { NextConfig } from 'next';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const webpack = require('webpack');

const nextConfig: NextConfig = {
  transpilePackages: ['@lumina/ui', '@lumina/api'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  // Skip type-checking during build (we run tsc separately)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Externalize desktop-only dependencies that break web builds
  webpack: (config) => {
    // Ignore desktop-only modules entirely
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /@mediapipe\/tasks-vision/,
      })
    );

    // Alias desktop-only imports to empty modules
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['@lumina/core/detection/faceLandmarker'] = false;

    return config;
  },
};

export default nextConfig;
