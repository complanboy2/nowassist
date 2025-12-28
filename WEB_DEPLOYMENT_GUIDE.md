# Web Deployment Guide for NowAssist

## Overview

Deploy NowAssist as a standalone website that works offline using PWA (Progressive Web App) technology.

## Prerequisites

- Domain name (you mentioned you have one)
- Static site hosting (recommended: Netlify, Vercel, Cloudflare Pages, or GitHub Pages)
- HTTPS enabled (required for PWA/Service Workers)

---

## Deployment Options (Recommended)

### Option 1: Netlify (Recommended - Easiest)
**Pros:**
- Free tier with custom domain
- Automatic HTTPS
- Easy deployment from Git
- Built-in PWA support
- Edge functions if needed

**Steps:**
1. Push code to GitHub (already done)
2. Sign up at netlify.com
3. Connect GitHub repository
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Add custom domain in Netlify settings
6. Configure DNS

### Option 2: Vercel
**Pros:**
- Free tier
- Excellent performance
- Easy Git integration
- Automatic HTTPS

**Steps:**
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in project directory
3. Follow prompts
4. Connect custom domain

### Option 3: Cloudflare Pages
**Pros:**
- Free tier
- Excellent CDN
- Fast global distribution
- Easy custom domain setup

**Steps:**
1. Connect GitHub repo in Cloudflare Pages
2. Build: `npm run build`
3. Output: `dist`
4. Add custom domain

### Option 4: GitHub Pages
**Pros:**
- Free
- Simple setup
- Automatic deployment from Git

**Steps:**
1. Update `vite.config.js` base path
2. Add GitHub Actions workflow
3. Enable Pages in repo settings

---

## Required Code Changes for Web Deployment

### 1. Create Chrome API Polyfills

Create `src/utils/chrome-polyfill.js` to handle missing Chrome APIs in browser:

```javascript
// Polyfill for Chrome extension APIs when running as web app
export const getChromePolyfill = () => {
  const isChromeExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
  
  if (isChromeExtension) {
    return chrome; // Use real Chrome APIs
  }
  
  // Web app fallback
  return {
    runtime: {
      getURL: (path) => {
        // Return relative URL for web app
        return `/${path}`;
      },
      id: null,
    },
    storage: {
      local: {
        get: async (keys) => {
          // Use localStorage as fallback
          const result = {};
          const keysArray = Array.isArray(keys) ? keys : [keys];
          keysArray.forEach(key => {
            const value = localStorage.getItem(key);
            if (value) {
              try {
                result[key] = JSON.parse(value);
              } catch {
                result[key] = value;
              }
            }
          });
          return result;
        },
        set: async (data) => {
          Object.entries(data).forEach(([key, value]) => {
            localStorage.setItem(key, JSON.stringify(value));
          });
        },
      },
    },
    tabs: {
      query: async () => [],
      sendMessage: async () => {},
    },
    scripting: null,
    webRequest: null,
  };
};

export const chromePolyfill = getChromePolyfill();
```

### 2. Update All Components to Use Polyfill

Replace `chrome.runtime?.getURL` with `chromePolyfill.runtime.getURL` in:
- Navigation.jsx
- All page components (jwt.jsx, saml.jsx, rest.jsx, etc.)

### 3. Add PWA Configuration

**Create `public/manifest.web.json`:**

```json
{
  "name": "NowAssist - Developer Tools",
  "short_name": "NowAssist",
  "description": "Professional developer toolkit for ServiceNow engineers",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0ea5e9",
  "icons": [
    {
      "src": "/icons/icon16.png",
      "sizes": "16x16",
      "type": "image/png"
    },
    {
      "src": "/icons/icon48.png",
      "sizes": "48x48",
      "type": "image/png"
    },
    {
      "src": "/icons/icon128.png",
      "sizes": "128x128",
      "type": "image/png"
    }
  ]
}
```

### 4. Add Service Worker for Offline Support

**Create `public/sw.js`:**

```javascript
const CACHE_NAME = 'nowassist-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/styles.css',
  '/assets/app.js',
  // Add all static assets
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
```

### 5. Update vite.config.js for Web Deployment

Add base path and PWA plugin:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'NowAssist',
        short_name: 'NowAssist',
        description: 'Professional developer toolkit',
        theme_color: '#0ea5e9',
        icons: [
          {
            src: 'icons/icon128.png',
            sizes: '128x128',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  // ... rest of config
});
```

---

## Features That Work Offline

✅ **JWT Decoder** - Fully offline (local processing)
✅ **JWT Encoder** - Fully offline (local processing)
✅ **SAML Inspector** - Fully offline (local processing)
✅ **JSON Utility** - Fully offline (local processing)
✅ **Encoder/Decoder** - Fully offline (local processing)
✅ **HAR Analyzer** - Fully offline (file upload)

⚠️ **REST API Tester** - Requires internet (but works on website)
⚠️ **JWKS Fetcher** - Requires internet (but works on website)

---

## Step-by-Step Implementation

### Phase 1: Code Adaptations

1. **Install PWA plugin:**
   ```bash
   npm install -D vite-plugin-pwa
   ```

2. **Create chrome-polyfill.js** (see above)

3. **Update components** to use polyfill

4. **Update vite.config.js** for web build

5. **Add index.html** as main entry point

### Phase 2: Deployment Setup

1. **Choose hosting provider** (recommend Netlify)

2. **Configure build:**
   - Build command: `npm run build`
   - Output: `dist`

3. **Add custom domain:**
   - Update DNS records
   - Configure SSL certificate (automatic with Netlify/Vercel)

### Phase 3: Testing

1. Test offline functionality
2. Test PWA installation
3. Test all tools work without Chrome extension APIs
4. Verify REST API tester works
5. Test on mobile devices

---

## Recommended Approach

**Best Option: Netlify + PWA**

1. **Quick Setup** (30 minutes)
2. **Free Custom Domain** support
3. **Automatic HTTPS**
4. **Easy Git Integration**
5. **Built-in PWA support**

---

## Domain Configuration

After deploying to Netlify/Vercel/Cloudflare:

1. **Add Custom Domain:**
   - Go to site settings
   - Add your domain name

2. **Configure DNS:**
   - Add CNAME record: `@ CNAME your-site.netlify.app`
   - Or A record: Point to hosting provider IP

3. **SSL Certificate:**
   - Automatically provisioned by hosting provider

---

## Quick Start Commands

```bash
# Install PWA plugin
npm install -D vite-plugin-pwa

# Build for web
npm run build

# Test locally (simulate production)
npm run preview
```

---

## Limitations as Web App

- ❌ No access to browser tabs (extension-only feature)
- ❌ No webRequest API (extension-only)
- ❌ No background service worker (extension-only)
- ❌ SAML message interception won't work (requires extension)
- ✅ All other features work perfectly!

---

## Next Steps

Would you like me to:
1. Create the chrome-polyfill.js file?
2. Update all components to use polyfills?
3. Add PWA configuration?
4. Update vite.config.js for web deployment?

Let me know and I'll implement these changes!

