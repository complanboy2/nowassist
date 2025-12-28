# GitHub Pages Deployment Guide

## Quick Setup

### Option 1: GitHub Pages (Recommended for your setup)

**Pros:**
- ✅ Free
- ✅ Automatic deployment from Git
- ✅ Custom domain support
- ✅ Already have repo on GitHub

**Setup Steps:**

1. **Enable GitHub Pages:**
   - Go to your repo: https://github.com/complanboy2/nowassist
   - Settings → Pages
   - Source: GitHub Actions (the workflow will handle deployment)
   - Save

2. **Build and Test Locally:**
   ```bash
   npm run build:web
   npm run preview:web
   ```

3. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add web deployment support"
   git push origin main
   ```

4. **Add Custom Domain:**
   - After first deployment, go to Settings → Pages
   - Add your custom domain
   - Follow DNS configuration instructions
   - GitHub will create CNAME file automatically

5. **DNS Configuration:**
   - Add A records pointing to GitHub Pages IPs:
     - 185.199.108.153
     - 185.199.109.153
     - 185.199.110.153
     - 185.199.111.153
   - Or use CNAME: `your-domain.com` → `complanboy2.github.io`

### Option 2: Custom Domain Setup

If deploying to root domain (e.g., `nowassist.com` instead of `github.com/nowassist`):

1. **Update vite.config.js base path:**
   ```javascript
   base: isWebBuild ? '/' : '/',  // Change from '/nowassist/' to '/'
   ```

2. **Update app.jsx:**
   ```javascript
   <BrowserRouter basename="">  // Remove '/nowassist'
   ```

3. **Create CNAME file:**
   ```bash
   echo "your-domain.com" > public/CNAME
   ```

4. **Update workflow** (if using root domain):
   - The workflow will automatically use the CNAME file

## Deployment URLs

- **GitHub Pages (subdirectory)**: `https://complanboy2.github.io/nowassist`
- **Custom Domain**: `https://your-domain.com` (after DNS setup)

## After Deployment

1. **Test the site**: Visit your GitHub Pages URL
2. **Install as PWA**: Browser will prompt to install
3. **Test offline**: Turn off internet, verify tools work
4. **Verify HTTPS**: Check SSL certificate is active

## Troubleshooting

### 404 errors on refresh
- GitHub Pages serves static files, need proper routing
- The Router is configured with basename `/nowassist/`
- For root domain, remove basename

### Build fails
- Check Node version (18+)
- Ensure all dependencies are installed
- Check GitHub Actions logs

### Custom domain not working
- Verify DNS records are correct
- Wait for DNS propagation (up to 24 hours)
- Check GitHub Pages settings for domain status

## Next Steps

1. Enable GitHub Pages in repo settings
2. Push code to trigger deployment
3. Add custom domain
4. Test and verify!

