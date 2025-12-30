import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';
import { copyFileSync, existsSync, unlinkSync, readdirSync, statSync, mkdirSync } from 'fs';

// Detect if building for web or extension
const isWebBuild = process.env.BUILD_TARGET === 'web';

export default defineConfig({
  // For GitHub Pages: use /nowassist/, for custom domain: use /
  base: isWebBuild ? '/' : '/',
  plugins: [
    react(),
    // For web builds: Copy only necessary files (404.html, icons) and clean up extension files
    ...(isWebBuild ? [{
      name: 'web-build-setup',
      closeBundle() {
        const distDir = resolve(__dirname, 'dist');
        const publicDir = resolve(__dirname, 'public');
        
        // Copy 404.html for GitHub Pages SPA routing
        const public404Path = resolve(publicDir, '404.html');
        const dist404Path = resolve(distDir, '404.html');
        try {
          if (existsSync(public404Path)) {
            copyFileSync(public404Path, dist404Path);
            console.log('✓ Copied public/404.html to dist/404.html');
          } else {
            const indexPath = resolve(distDir, 'index.html');
            copyFileSync(indexPath, dist404Path);
            console.log('✓ Copied index.html to 404.html (fallback)');
          }
        } catch (err) {
          console.error('Failed to copy 404.html:', err);
        }
        
        // Copy icons directory (needed for PWA and favicon)
        try {
          const iconsSource = resolve(publicDir, 'icons');
          const iconsDest = resolve(distDir, 'icons');
          if (existsSync(iconsSource)) {
            if (!existsSync(iconsDest)) {
              mkdirSync(iconsDest, { recursive: true });
            }
            const files = readdirSync(iconsSource);
            let copiedCount = 0;
            files.forEach(file => {
              const sourcePath = resolve(iconsSource, file);
              const destPath = resolve(iconsDest, file);
              try {
                if (statSync(sourcePath).isFile()) {
                  copyFileSync(sourcePath, destPath);
                  copiedCount++;
                }
              } catch (fileErr) {
                console.warn(`Failed to copy icon ${file}:`, fileErr.message);
              }
            });
            if (copiedCount > 0) {
              console.log(`✓ Copied ${copiedCount} icon(s)`);
            }
          }
        } catch (err) {
          console.error('Failed to copy icons:', err.message);
        }
        
        // Copy favicon files (if they exist)
        try {
          const faviconFiles = ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png'];
          faviconFiles.forEach(file => {
            const sourcePath = resolve(publicDir, file);
            const destPath = resolve(distDir, file);
            if (existsSync(sourcePath)) {
              copyFileSync(sourcePath, destPath);
              console.log(`✓ Copied ${file}`);
            }
          });
        } catch (err) {
          console.warn('No favicon files found or failed to copy:', err.message);
        }
        
        // Copy docs directory (for privacy policy and other documentation)
        try {
          const docsSource = resolve(__dirname, 'docs');
          const docsDest = resolve(distDir, 'docs');
          if (existsSync(docsSource)) {
            if (!existsSync(docsDest)) {
              mkdirSync(docsDest, { recursive: true });
            }
            const files = readdirSync(docsSource);
            let copiedCount = 0;
            files.forEach(file => {
              const sourcePath = resolve(docsSource, file);
              const destPath = resolve(docsDest, file);
              try {
                if (statSync(sourcePath).isFile()) {
                  copyFileSync(sourcePath, destPath);
                  copiedCount++;
                }
              } catch (fileErr) {
                console.warn(`Failed to copy doc file ${file}:`, fileErr.message);
              }
            });
            if (copiedCount > 0) {
              console.log(`✓ Copied ${copiedCount} doc file(s)`);
            }
          }
        } catch (err) {
          console.error('Failed to copy docs:', err);
        }
        
        // CRITICAL: Remove ALL extension HTML files that conflict with SPA routing
        // These should NEVER be in dist/ for web builds
        const extensionHtmlFiles = [
          'jwt.html', 'jwt-encoder.html', 'saml.html', 'rest.html', 'logs.html',
          'json-utility.html', 'har-analyzer.html', 'encoder-decoder.html',
          'about.html', 'popup.html', 'devtools.html', 'devtools-panel.html'
        ];
        
        extensionHtmlFiles.forEach(file => {
          const filePath = resolve(distDir, file);
          if (existsSync(filePath)) {
            unlinkSync(filePath);
            console.log(`✓ Removed ${file}`);
          }
        });
        
        // Remove extension-specific JS files (but keep manifest.json for PWA)
        const extensionFiles = ['background.js', 'content-script.js', 'devtools.js', 'devtools-panel.js'];
        extensionFiles.forEach(file => {
          const filePath = resolve(distDir, file);
          if (existsSync(filePath)) {
            unlinkSync(filePath);
            console.log(`✓ Removed ${file}`);
          }
        });
        
        console.log('✓ Web build cleanup complete - only index.html and 404.html remain');
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
          start_url: '/',
          icons: [
            {
              src: '/icons/icon128.png',
              sizes: '128x128',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/icons/icon64.png',
              sizes: '64x64',
              type: 'image/png'
            },
            {
              src: '/icons/icon16.png',
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
    // For web builds, we need to be selective about what we copy
    // We only want icons and 404.html, NOT the extension HTML files
    copyPublicDir: isWebBuild ? false : true, // Don't copy public dir for web build - we'll copy selectively
  },
  publicDir: isWebBuild ? false : 'public', // Disable publicDir for web build to prevent copying extension files
});
