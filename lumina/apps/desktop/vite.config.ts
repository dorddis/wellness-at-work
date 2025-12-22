import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main process entry
        entry: 'src/main/index.ts',
        vite: {
          build: {
            outDir: 'dist/main',
            rollupOptions: {
              external: ['electron', 'better-sqlite3'],
            },
          },
        },
      },
      {
        // Preload script
        entry: 'src/preload/index.ts',
        vite: {
          build: {
            outDir: 'dist/preload',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
        onstart(options) {
          options.reload();
        },
      },
    ]),
  ],
  resolve: {
    alias: {
      '@lumina/ui': resolve(__dirname, '../../packages/ui/src'),
      '@lumina/core': resolve(__dirname, '../../packages/core/src'),
      '@lumina/api': resolve(__dirname, '../../packages/api/src'),
    },
  },
  build: {
    outDir: 'dist/renderer',
    rollupOptions: {
      input: {
        hub: resolve(__dirname, 'src/renderer/hub/index.html'),
        status: resolve(__dirname, 'src/renderer/status/index.html'),
        overlay: resolve(__dirname, 'src/renderer/overlay/index.html'),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true, // Fail if port in use instead of picking another
  },
});
