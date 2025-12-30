# Cloudflare Workers Deployment Walkthrough

Since you already have Cloudflare set up, this is the easiest option! No CLI installation needed.

---

## Step 1: Create a Cloudflare Worker

1. **Go to Cloudflare Dashboard**
   - Visit: https://dash.cloudflare.com
   - Log in to your account

2. **Navigate to Workers**
   - Click **Workers & Pages** in the left sidebar
   - Click **Create application**
   - Click **Create Worker**

3. **Name Your Worker**
   - Name: `nowassist-issue-creator` (or any name you prefer)
   - Click **Deploy**

---

## Step 2: Add the Code

1. **In the Worker Editor**
   - Delete the default code
   - Copy the entire contents of `cloudflare-worker.js` from this repo
   - Paste it into the editor
   - Click **Save and deploy**

---

## Step 3: Set Environment Variables (Secrets)

1. **Go to Worker Settings**
   - In your Worker page, click **Settings** tab
   - Scroll down to **Variables and Secrets**

2. **Add Secrets** (Click "Add variable" → Select "Secret")

   **Secret 1:**
   - Variable name: `GITHUB_TOKEN`
   - Value: Your GitHub Personal Access Token (see Step 4)
   - Click **Encrypt**

   **Secret 2:**
   - Variable name: `ALLOWED_ORIGINS`
   - Value: `https://nowassist.app,https://complanboy2.github.io`
   - Click **Encrypt**

3. **Save**
   - Click **Save** after adding each secret

---

## Step 4: Create GitHub Personal Access Token

1. **Go to GitHub Settings**
   - Visit: https://github.com/settings/tokens
   - Click **Generate new token** → **Generate new token (classic)**

2. **Configure Token**
   - **Note:** `NowAssist Issue Creator`
   - **Expiration:** 90 days or No expiration
   - **Select scopes:**
     - ✅ `public_repo` (if repo is public)
     - OR ✅ `repo` (if repo is private)
   - Click **Generate token**

3. **Copy Token**
   - **COPY IMMEDIATELY** (you won't see it again!)
   - Paste it in Cloudflare Worker secrets (Step 3)

---

## Step 5: Get Your Worker URL

After deployment, your Worker URL will be:
```
https://nowassist-issue-creator.YOUR_SUBDOMAIN.workers.dev
```

Example:
```
https://nowassist-issue-creator.abc123.workers.dev
```

**Note:** You can also add a custom domain in Cloudflare Workers settings.

---

## Step 6: Configure Frontend

### Option A: Environment Variable (Recommended)

Create `.env` file in project root:
```bash
VITE_GITHUB_ISSUE_API=https://nowassist-issue-creator.YOUR_SUBDOMAIN.workers.dev
```

Then rebuild:
```bash
npm run build:web
```

### Option B: Update Code Directly

Edit `src/help-support.jsx` line 95:
```javascript
const API_ENDPOINT = 'https://nowassist-issue-creator.YOUR_SUBDOMAIN.workers.dev';
```

---

## Step 7: Test

1. Visit: `https://nowassist.app/help-support`
2. Fill out the form
3. Submit
4. Check if issue is created directly (no popup)
5. Verify in GitHub: https://github.com/complanboy2/nowassist/issues

---

## Optional: Add Custom Domain

1. **In Cloudflare Worker Settings**
   - Go to **Triggers** tab
   - Click **Add Custom Domain**
   - Enter: `api.nowassist.app` (or any subdomain)
   - Cloudflare will configure DNS automatically

2. **Update Frontend**
   - Use the custom domain instead of workers.dev URL

---

## Optional: Set Up KV for Better Rate Limiting

The current code works without KV, but KV provides persistent rate limiting across worker restarts.

1. **Create KV Namespace**
   - In Cloudflare Dashboard → Workers & Pages → KV
   - Click **Create a namespace**
   - Name: `RATE_LIMIT_KV`
   - Click **Add**

2. **Link to Worker**
   - Go to your Worker → Settings → Variables
   - Under **KV Namespace Bindings**, click **Add binding**
   - Variable name: `RATE_LIMIT_KV`
   - KV namespace: Select `RATE_LIMIT_KV`
   - Click **Save**

3. **Redeploy Worker**
   - The code will automatically use KV if available

---

## Troubleshooting

### "Server configuration error"
- Check that `GITHUB_TOKEN` is set in Worker secrets
- Check that `ALLOWED_ORIGINS` is set in Worker secrets
- Make sure secrets are saved (not just variables)

### "Origin not allowed"
- Verify `ALLOWED_ORIGINS` includes your domain exactly
- Check for typos (including `https://`)
- Ensure no trailing slashes

### CORS errors
- Verify `ALLOWED_ORIGINS` secret is set correctly
- Check browser console for exact error
- Ensure domain matches exactly

### Rate limiting not working
- This is normal without KV (in-memory resets on restart)
- Set up KV namespace for persistent rate limiting (optional)

---

## Cost

**Cloudflare Workers Free Tier includes:**
- ✅ 100,000 requests/day
- ✅ 10ms CPU time per request
- ✅ Perfect for this use case (free!)

**KV Free Tier:**
- ✅ 100,000 reads/day
- ✅ 1,000 writes/day
- ✅ More than enough for rate limiting

---

## Advantages of Cloudflare Workers

- ✅ **No CLI needed** - All done in browser
- ✅ **Fast deployment** - Deploy in seconds
- ✅ **Global edge network** - Fast worldwide
- ✅ **Free tier** - More than enough for this
- ✅ **Built-in security** - DDoS protection included
- ✅ **Easy management** - Dashboard interface

---

## Quick Reference

**Worker URL Format:**
```
https://YOUR_WORKER_NAME.YOUR_SUBDOMAIN.workers.dev
```

**Required Secrets:**
- `GITHUB_TOKEN` - Your GitHub token
- `ALLOWED_ORIGINS` - Your domains (comma-separated)

**Test Your Worker:**
```bash
curl -X POST https://YOUR_WORKER_URL \
  -H "Content-Type: application/json" \
  -H "Origin: https://nowassist.app" \
  -d '{"title":"Test","body":"Test body","issueType":"question"}'
```

---

**That's it! Cloudflare Workers is the easiest option since you're already set up!** 🚀

