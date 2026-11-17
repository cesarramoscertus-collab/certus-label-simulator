import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Production builds use the GitHub Pages path: https://cesarramoscertus-collab.github.io/certus-label-simulator/
// `npm run package` overrides this with --base=./ so the Storyline / Rise / LMS zip keeps
// fully relative paths and runs from any folder. The dev server stays at /.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/certus-label-simulator/' : '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 2000,
    sourcemap: false,
  },
}));
