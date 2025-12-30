# Vercel Deployment Walkthrough - Step by Step

## Prerequisites
- GitHub account
- Vercel account (free tier works)
- Node.js installed (for Vercel CLI)

---

## Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

Verify installation:
```bash
vercel --version
```

---

## Step 2: Login to Vercel

```bash
vercel login
```

This will:
- Open your browser
- Ask you to authorize Vercel
- Link your Vercel account

---

## Step 3: Navigate to Your Project

```bash
cd /Users/veerasekharbab.golla/Documents/apw/extn/nowassist
```

---

## Step 4: Deploy to Vercel

```bash
vercel
```

**First time deployment prompts:**
1. **Set up and deploy?** → Type `Y` and press Enter
2. **Which scope?** → Select your account (usually just press Enter)
3. **Link to existing project?** → Type `N` (new project)
4. **What's your project's name?** → Type `nowassist` (or press Enter for default)
5. **In which directory is your code located?** → Press Enter (current directory `./`)
6. **Want to override the settings?** → Type `N` (use defaults)

**Vercel will:**
- Detect your project
- Deploy the serverless function
- Give you a URL like: `https://nowassist-xxxxx.vercel.app`

---

## Step 5: Set Environment Variables

### Option A: Via Vercel Dashboard (Recommended)

1. Go to https://vercel.com/dashboard
2. Click on your project (`nowassist`)
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Add these two variables:

   **Variable 1:**
   - Name: `GITHUB_TOKEN`
   - Value: `your_github_personal_access_token` (see Step 6)
   - Environment: Select **Production**, **Preview**, and **Development**
   - Click **Save**

   **Variable 2:**
   - Name: `ALLOWED_ORIGINS`
   - Value: `https://nowassist.app,https://complanboy2.github.io`
   - Environment: Select **Production**, **Preview**, and **Development**
   - Click **Save**

### Option B: Via CLI

```bash
vercel env add GITHUB_TOKEN
# Paste your token when prompted
# Select: Production, Preview, Development

vercel env add ALLOWED_ORIGINS
# Enter: https://nowassist.app,https://complanboy2.github.io
# Select: Production, Preview, Development
```

---

## Step 6: Create GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click **Generate new token** → **Generate new token (classic)**
3. **Note:** `NowAssist Issue Creator`
4. **Expiration:** Choose 90 days or No expiration (your choice)
5. **Select scopes:**
   - ✅ `public_repo` (if repo is public)
   - OR ✅ `repo` (if repo is private, gives full access)
6. Click **Generate token**
7. **COPY THE TOKEN IMMEDIATELY** (you won't see it again!)
8. Paste it in Vercel environment variables (Step 5)

---

## Step 7: Redeploy After Setting Environment Variables

After adding environment variables, you need to redeploy:

```bash
vercel --prod
```

Or trigger a redeploy from Vercel Dashboard:
- Go to **Deployments** tab
- Click **...** (three dots) on latest deployment
- Click **Redeploy**

---

## Step 8: Get Your Function URL

After deployment, your function will be at:
```
https://your-project-name.vercel.app/api/create-issue
```

Example:
```
https://nowassist-abc123.vercel.app/api/create-issue
```

---

## Step 9: Configure Frontend

### Option A: Environment Variable (Recommended)

Create `.env` file in project root:
```bash
VITE_GITHUB_ISSUE_API=https://your-project-name.vercel.app/api/create-issue
```

Then rebuild:
```bash
npm run build:web
```

### Option B: Update Code Directly

Edit `src/help-support.jsx` line 95:
```javascript
const API_ENDPOINT = 'https://your-project-name.vercel.app/api/create-issue';
```

---

## Step 10: Test

1. Visit your site: `https://nowassist.app/help-support`
2. Fill out the form
3. Submit
4. Check if issue is created directly (no popup)
5. Verify issue appears in GitHub: https://github.com/complanboy2/nowassist/issues

---

## Troubleshooting

### "Server configuration error"
- Check that `GITHUB_TOKEN` is set in Vercel
- Check that `ALLOWED_ORIGINS` is set in Vercel
- Redeploy after adding variables

### "Origin not allowed"
- Verify `ALLOWED_ORIGINS` includes your domain
- Check for typos in the domain
- Make sure it matches exactly (including `https://`)

### Function not found
- Check that `api/create-issue.js` exists
- Verify `vercel.json` is in root directory
- Check Vercel deployment logs

### CORS errors
- Verify `ALLOWED_ORIGINS` is set correctly
- Check browser console for exact error
- Ensure domain matches exactly (no trailing slashes)

---

## Quick Commands Reference

```bash
# Deploy
vercel

# Deploy to production
vercel --prod

# View environment variables
vercel env ls

# View logs
vercel logs

# Remove deployment
vercel remove
```

---

## Cost

**Vercel Free Tier includes:**
- ✅ 100GB bandwidth/month
- ✅ Unlimited serverless function invocations
- ✅ Perfect for this use case (free!)

---

## Next Steps After Deployment

1. ✅ Test the form
2. ✅ Monitor Vercel logs for any issues
3. ✅ Check GitHub issues are being created
4. ✅ Verify rate limiting works (try submitting multiple times)

---

**That's it! Your serverless function is now live and secure.** 🚀

