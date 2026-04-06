import { resolve } from 'path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    build: {
      externalizeDeps: {
        exclude: [
          '@thinklish/core',
          '@thinklish/shared',
          'electron-updater',
          '@mozilla/readability'
        ]
      }
    },
    resolve: {
      alias: {
        '@thinklish/core': resolve(__dirname, '../core/src'),
        '@thinklish/shared': resolve(__dirname, '../shared/src')
      }
    }
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer/src'),
        '@thinklish/shared': resolve(__dirname, '../shared/src')
      }
    },
    plugins: [react()]
  }
});
