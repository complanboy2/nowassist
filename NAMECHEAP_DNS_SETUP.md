# Namecheap DNS Setup for nowassist.app

## Step-by-Step Instructions

### Step 1: Configure DNS Records in Namecheap

1. **Log in to Namecheap**
   - Go to https://www.namecheap.com
   - Sign in to your account

2. **Access Domain List**
   - Click on **Domain List** from the left sidebar
   - Find `nowassist.app` and click **Manage**

3. **Go to Advanced DNS**
   - Click on the **Advanced DNS** tab

4. **Add DNS Records**
   
   You have **TWO options** - choose ONE:

   **Option A: Use A Records (Recommended)**
   
   Add these 4 A records (one for each IP):
   
   | Type | Host | Value | TTL |
   |------|------|-------|-----|
   | A Record | @ | 185.199.108.153 | Automatic (or 30 min) |
   | A Record | @ | 185.199.109.153 | Automatic (or 30 min) |
   | A Record | @ | 185.199.110.153 | Automatic (or 30 min) |
   | A Record | @ | 185.199.111.153 | Automatic (or 30 min) |
   
   **How to add:**
   - Click **Add New Record**
   - Select **A Record**
   - **Host**: `@` (or leave blank if @ is not available)
   - **Value**: `185.199.108.153`
   - **TTL**: Automatic (or 30 min)
   - Click **Save** (green checkmark)
   - Repeat for the other 3 IP addresses
   
   **Option B: Use CNAME Record (Alternative)**
   
   | Type | Host | Value | TTL |
   |------|------|-------|-----|
   | CNAME Record | @ | complanboy2.github.io | Automatic (or 30 min) |
   
   **Note:** Some registrars don't allow CNAME on root domain (@). If Namecheap doesn't allow it, use Option A (A Records).

5. **Remove Existing Records (if any)**
   - If you have any existing A records or CNAME records for `@`, delete them first
   - Only keep the new records you just added

6. **Save Changes**
   - Make sure all changes are saved
   - DNS propagation can take 5 minutes to 24 hours (usually 1-2 hours)

---

### Step 2: Configure Domain in GitHub

1. **Go to GitHub Repository**
   - Visit: https://github.com/complanboy2/nowassist
   - Click **Settings** (top right of repository page)

2. **Go to Pages Settings**
   - Scroll down to **Pages** in the left sidebar
   - Click on **Pages**

3. **Add Custom Domain**
   - In the **Custom domain** section, enter: `nowassist.app`
   - Click **Save**

4. **Wait for Verification**
   - GitHub will automatically verify your domain
   - This may take a few minutes
   - You'll see a green checkmark when verified
   - GitHub will automatically provision SSL certificate (HTTPS)

5. **Enable HTTPS (if not automatic)**
   - Check the box **Enforce HTTPS** (if available)
   - This ensures your site always uses HTTPS

---

### Step 3: Verify DNS Propagation

You can check if DNS has propagated using these tools:

1. **Online DNS Checker:**
   - https://dnschecker.org
   - Enter: `nowassist.app`
   - Select record type: `A`
   - Check if all 4 IPs appear globally

2. **Command Line (Mac/Linux):**
   ```bash
   dig nowassist.app A
   ```
   
   You should see the 4 GitHub Pages IPs:
   - 185.199.108.153
   - 185.199.109.153
   - 185.199.110.153
   - 185.199.111.153

3. **Windows Command Prompt:**
   ```cmd
   nslookup nowassist.app
   ```

---

### Step 4: Test Your Site

1. **Wait for DNS Propagation** (1-24 hours, usually 1-2 hours)
2. **Visit your domain:** https://nowassist.app
3. **Check HTTPS:** Make sure the padlock icon appears
4. **Test all pages:** Navigate through different tools

---

## Troubleshooting

### Domain not working after 24 hours?

1. **Check DNS Records:**
   - Verify all 4 A records are correct in Namecheap
   - Make sure there are no conflicting records

2. **Check GitHub Pages:**
   - Go to Settings → Pages
   - Verify domain shows as "Verified" with green checkmark
   - Check if there are any error messages

3. **Clear Browser Cache:**
   - Try incognito/private browsing mode
   - Clear DNS cache: `sudo dscacheutil -flushcache` (Mac) or `ipconfig /flushdns` (Windows)

4. **Check SSL Certificate:**
   - GitHub should automatically provision SSL
   - If not working, wait a bit longer (can take up to 24 hours)

### Still having issues?

- **Namecheap Support:** https://www.namecheap.com/support/
- **GitHub Pages Docs:** https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site

---

## Quick Reference

**GitHub Pages IPs:**
- 185.199.108.153
- 185.199.109.153
- 185.199.110.153
- 185.199.111.153

**Your Domain:** nowassist.app
**GitHub Repository:** complanboy2/nowassist
**GitHub Pages URL:** https://complanboy2.github.io/nowassist (will redirect to your domain once configured)

---

## What We Changed in Code

✅ Updated `vite.config.js` - Changed base path from `/nowassist/` to `/`
✅ Updated `src/app.jsx` - Changed basename from `/nowassist` to `''`
✅ Updated PWA manifest - Changed start_url to `/`
✅ Created `public/CNAME` - Added `nowassist.app`
✅ Updated `public/404.html` - Fixed for root domain routing
✅ Updated Footer icons - Changed paths from `/nowassist/icons/` to `/icons/`

All changes are ready to deploy! 🚀

