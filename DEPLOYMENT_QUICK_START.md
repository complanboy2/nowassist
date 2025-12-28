# Quick Start: Deploy NowAssist as Website

## Best Option: Netlify (Recommended)

### Why Netlify?
- ✅ Free custom domain support
- ✅ Automatic HTTPS
- ✅ Easy Git integration
- ✅ Built-in PWA support
- ✅ Zero configuration needed

---

## Deployment Steps

### 1. Install PWA Dependencies
```bash
npm install react-router-dom vite-plugin-pwa workbox-window
```

### 2. Build for Web
```bash
BUILD_TARGET=web npm run build
```

### 3. Deploy to Netlify

#### Option A: Via Git (Automatic)
1. Push code to GitHub (already done ✅)
2. Go to https://app.netlify.com
3. Click "Add new site" → "Import an existing project"
4. Connect GitHub → Select `complanboy2/nowassist` repository
5. Build settings:
   - **Build command**: `BUILD_TARGET=web npm run build`
   - **Publish directory**: `dist`
   - **Node version**: 18 (or latest)
6. Click "Deploy site"

#### Option B: Via Netlify CLI
```bash
npm install -g netlify-cli
netlify login
BUILD_TARGET=web npm run build
netlify deploy --prod --dir=dist
```

### 4. Add Custom Domain
1. Go to Site settings → Domain management
2. Click "Add custom domain"
3. Enter your domain name
4. Follow DNS configuration instructions:
   - **Option 1 (CNAME)**: Add CNAME record `@ → your-site.netlify.app`
   - **Option 2 (A record)**: Point to Netlify's IP addresses
5. Netlify automatically provisions SSL certificate (takes a few minutes)

---

## Alternative: Vercel

### Deploy to Vercel
```bash
npm install -g vercel
BUILD_TARGET=web npm run build
vercel --prod
```

Then add custom domain in Vercel dashboard.

---

## Alternative: Cloudflare Pages

1. Go to Cloudflare Dashboard → Pages
2. Connect GitHub repository
3. Build settings:
   - **Framework preset**: Vite
   - **Build command**: `BUILD_TARGET=web npm run build`
   - **Build output directory**: `dist`
4. Add custom domain in Pages settings

---

## Features That Work Offline

✅ **100% Offline:**
- JWT Decoder
- JWT Encoder  
- SAML Inspector
- JSON Utility
- Encoder/Decoder
- HAR Analyzer

⚠️ **Requires Internet:**
- REST API Tester (makes HTTP requests)
- JWKS Fetcher (fetches keys from URLs)

---

## After Deployment

1. **Test the website**: Visit your domain
2. **Test offline**: 
   - Install as PWA (browser will prompt)
   - Turn off internet
   - Verify tools still work
3. **Verify HTTPS**: Ensure SSL certificate is active

---

## Package.json Scripts (To Add)

```json
{
  "scripts": {
    "build": "vite build",
    "build:web": "BUILD_TARGET=web vite build",
    "build:extension": "vite build",
    "preview": "vite preview"
  }
}
```

---

## Troubleshooting

### Build fails
- Ensure `react-router-dom` and `vite-plugin-pwa` are installed
- Check Node version (18+ recommended)

### PWA not working
- Verify HTTPS is enabled
- Check browser console for Service Worker errors
- Ensure manifest.json is accessible

### Navigation not working
- Verify react-router-dom is installed
- Check that routes are configured in app.jsx

---

## Next Steps

Would you like me to:
1. ✅ Implement the code changes (chrome polyfills, routing, PWA)?
2. ✅ Update all components to use polyfills?
3. ✅ Create build scripts for web vs extension?

Let me know and I'll implement everything!

