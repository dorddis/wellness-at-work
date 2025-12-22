import type { Config } from 'tailwindcss';
import sharedConfig from '@lumina/ui/tailwind.config';

const config: Config = {
  presets: [sharedConfig],
  content: [
    './src/**/*.{ts,tsx,html}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      keyframes: {
        wave: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(20deg)' },
          '75%': { transform: 'rotate(-10deg)' },
        },
      },
      animation: {
        wave: 'wave 2s ease-in-out infinite',
      },
    },
  },
};

export default config;
