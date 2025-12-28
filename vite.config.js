import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';
import { copyFileSync, existsSync } from 'fs';

// Detect if building for web or extension
const isWebBuild = process.env.BUILD_TARGET === 'web';

export default defineConfig({
  // For GitHub Pages: use /nowassist/, for custom domain: use /
  base: isWebBuild ? '/nowassist/' : '/',
  plugins: [
    react(),
    // Copy public/404.html to dist/404.html for GitHub Pages SPA routing
    ...(isWebBuild ? [{
      name: 'copy-404',
      closeBundle() {
        const public404Path = resolve(__dirname, 'public/404.html');
        const dist404Path = resolve(__dirname, 'dist/404.html');
        try {
          if (existsSync(public404Path)) {
            copyFileSync(public404Path, dist404Path);
            console.log('✓ Copied public/404.html to dist/404.html for GitHub Pages SPA routing');
          } else {
            // Fallback: copy index.html if public/404.html doesn't exist
            const indexPath = resolve(__dirname, 'dist/index.html');
            copyFileSync(indexPath, dist404Path);
            console.log('✓ Copied index.html to 404.html (fallback - public/404.html not found)');
          }
        } catch (err) {
          console.error('Failed to copy 404.html:', err);
        }
      }
    }] : []),
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
          start_url: '/nowassist/',
          icons: [
            {
              src: '/nowassist/icons/icon128.png',
              sizes: '128x128',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/nowassist/icons/icon48.png',
              sizes: '48x48',
              type: 'image/png'
            },
            {
              src: '/nowassist/icons/icon16.png',
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
      input: resolve(__dirname, 'index.html'),
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
    copyPublicDir: isWebBuild ? 'public' : true, // Copy icons from public for web build
  },
  publicDir: isWebBuild ? 'public' : 'public', // Keep publicDir so vite can reference icons
});
