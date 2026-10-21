import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative base path ensures assets work on GitHub Pages (any repo subpath) AND Capacitor (Android/iOS)
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icon.svg',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'tree-of-knowledge.jpg',
        'forest-background.jpg',
        'minigame-background.jpg',
        'world.json'
      ],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,json}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      },
      manifest: {
        name: 'Rami — The Tree of Knowledge',
        short_name: 'Rami',
        description:
          'Single-player local-first educational world for children with animal instructors.',
        theme_color: '#162418',
        background_color: '#162418',
        display: 'fullscreen',
        orientation: 'any',
        start_url: './',
        scope: './',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'es2022'
  },
  server: {
    port: 5173
  }
});
