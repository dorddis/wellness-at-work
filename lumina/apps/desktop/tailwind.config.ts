import type { Config } from 'tailwindcss';
import sharedConfig from '@lumina/ui/tailwind.config';

const config: Config = {
  presets: [sharedConfig],
  content: [
    './src/**/*.{ts,tsx,html}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};

export default config;
