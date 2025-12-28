import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

// Detect if building for web or extension
const isWebBuild = process.env.BUILD_TARGET === 'web';

export default defineConfig({
  // For GitHub Pages: use /nowassist/, for custom domain: use /
  base: isWebBuild ? '/nowassist/' : '/',
  plugins: [
    react(),
    // PWA plugin only for web builds
    ...(isWebBuild ? [
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/*.png'],
        manifest: {
          name: 'NowAssist - Developer Tools',
          short_name: 'NowAssist',
          description: 'Professional developer toolkit for ServiceNow engineers',
          theme_color: '#0ea5e9',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: 'icons/icon128.png',
              sizes: '128x128',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: 'icons/icon48.png',
              sizes: '48x48',
              type: 'image/png'
            },
            {
              src: 'icons/icon16.png',
              sizes: '16x16',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 // 24 hours
                }
              }
            }
          ]
        }
      })
    ] : [])
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: isWebBuild ? {
      input: resolve(__dirname, 'public/index.html'),
    } : {
      input: {
        popup: resolve(__dirname, 'public/popup.html'),
        jwt: resolve(__dirname, 'public/jwt.html'),
        'jwt-encoder': resolve(__dirname, 'public/jwt-encoder.html'),
        saml: resolve(__dirname, 'public/saml.html'),
        rest: resolve(__dirname, 'public/rest.html'),
        logs: resolve(__dirname, 'public/logs.html'),
        'har-analyzer': resolve(__dirname, 'public/har-analyzer.html'),
        'json-utility': resolve(__dirname, 'public/json-utility.html'),
        'encoder-decoder': resolve(__dirname, 'public/encoder-decoder.html'),
        about: resolve(__dirname, 'public/about.html'),
      },
    },
    copyPublicDir: true,
  },
});


