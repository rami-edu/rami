import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base path ensures assets work on GitHub Pages (any repo subpath) AND Capacitor (Android/iOS)
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'es2022'
  },
  server: {
    port: 5173
  }
});
