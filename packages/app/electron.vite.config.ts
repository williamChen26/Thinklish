import { resolve } from 'path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    build: {
      externalizeDeps: {
        exclude: ['@english-studio/core', '@english-studio/shared']
      }
    },
    resolve: {
      alias: {
        '@english-studio/core': resolve(__dirname, '../core/src'),
        '@english-studio/shared': resolve(__dirname, '../shared/src')
      }
    }
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer/src'),
        '@english-studio/shared': resolve(__dirname, '../shared/src')
      }
    },
    plugins: [react()]
  }
});
