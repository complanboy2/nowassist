# Serverless Function Setup for GitHub Issue Creation

This guide explains how to set up a serverless function to enable direct POST requests to create GitHub issues (instead of opening a URL).

## Why Serverless Function?

GitHub's Issues API requires authentication. A serverless function allows us to:
- Keep the GitHub token secure (not exposed in frontend)
- Create issues directly via POST (no popup/new tab)
- Better user experience (instant feedback)

## Option 1: Vercel (Recommended)

### Step 1: Deploy to Vercel

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Deploy the function**:
   ```bash
   vercel
   ```

3. **Set Environment Variables** (REQUIRED):
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `GITHUB_TOKEN` with your GitHub Personal Access Token
   - Add: `ALLOWED_ORIGINS` with your domain(s), e.g.: `https://nowassist.app,https://complanboy2.github.io`
   - **IMPORTANT:** Do NOT use `*` for ALLOWED_ORIGINS - this is a security risk!
   - Redeploy after adding the variables

### Step 2: Get Your Function URL

After deployment, you'll get a URL like:
```
https://your-project.vercel.app/api/create-issue
```

### Step 3: Configure Frontend

Add to your `.env` file (or set in Vercel environment variables):
```
VITE_GITHUB_ISSUE_API=https://your-project.vercel.app/api/create-issue
```

Or update `src/help-support.jsx` line 95:
```javascript
const API_ENDPOINT = 'https://your-project.vercel.app/api/create-issue';
```

---

## Option 2: Netlify

### Step 1: Deploy to Netlify

1. **Install Netlify CLI**:
   ```bash
   npm i -g netlify-cli
   ```

2. **Deploy**:
   ```bash
   netlify deploy --prod
   ```

3. **Set Environment Variables** (REQUIRED):
   - Go to Netlify Dashboard → Site Settings → Environment Variables
   - Add: `GITHUB_TOKEN` with your GitHub Personal Access Token
   - Add: `ALLOWED_ORIGINS` with your domain(s), e.g.: `https://nowassist.app,https://complanboy2.github.io`
   - **IMPORTANT:** Do NOT use `*` for ALLOWED_ORIGINS - this is a security risk!
   - Redeploy after adding the variables

### Step 2: Get Your Function URL

Your function will be available at:
```
https://your-site.netlify.app/.netlify/functions/create-issue
```

### Step 3: Configure Frontend

Update `src/help-support.jsx` line 95:
```javascript
const API_ENDPOINT = 'https://your-site.netlify.app/.netlify/functions/create-issue';
```

---

## Option 3: Cloudflare Workers

1. Create a Cloudflare Worker
2. Copy the function code from `api/create-issue.js`
3. Set `GITHUB_TOKEN` in Cloudflare Workers environment variables
4. Update the frontend with your Worker URL

---

## Creating a GitHub Personal Access Token

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name (e.g., "NowAssist Issue Creator")
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - Or if public repo only: ✅ `public_repo`
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again)
7. Add it to your serverless function's environment variables

---

## Testing

1. Deploy the serverless function
2. Set the `VITE_GITHUB_ISSUE_API` environment variable
3. Rebuild your frontend: `npm run build:web`
4. Test the Help & Support form
5. Check that issues are created directly (no popup)

---

## Fallback Behavior

If the API endpoint is not configured or fails, the form will automatically fall back to the URL method (opening GitHub issue creation page in a new tab). This ensures the form always works.

---

## Security Features

### ✅ Token Security
- **GitHub token is stored server-side only** (never exposed to frontend)
- Token is in serverless function's environment variables (server-side)
- Frontend only calls the public endpoint URL
- Serverless function uses token server-side to call GitHub API
- Token never appears in browser, network requests from frontend, or client-side code

### ✅ Abuse Prevention (Protects Your GitHub Account)
- **Strict CORS** - REQUIRED: `ALLOWED_ORIGINS` must be set (rejects requests from unauthorized domains)
- **Rate limiting** - 3 requests per minute per IP + 20 requests per day per IP
- **Input validation** - Validates title/body length, type, and format
- **Spam detection** - Blocks suspicious patterns (repeated characters, etc.)
- **Request logging** - Logs requests for monitoring (without sensitive data)
- **Error handling** - Prevents token/GitHub API details exposure

### ✅ Protection Against GitHub Account Blocking
- **Daily limits** prevent mass issue creation
- **Per-minute limits** prevent rapid-fire spam
- **Input size limits** prevent huge payloads
- **Spam pattern detection** blocks obvious abuse
- **Origin validation** ensures only your site can create issues

### ⚠️ Required Configuration

**You MUST set `ALLOWED_ORIGINS` environment variable:**
```
ALLOWED_ORIGINS=https://nowassist.app,https://complanboy2.github.io
```

**Do NOT use `*`** - This would allow anyone to create issues from any domain!

### 📊 Rate Limits
- **Per IP per minute:** 3 requests
- **Per IP per day:** 20 requests
- **Body size limit:** 10,000 characters (reduced from 50k)
- **Title size limit:** 200 characters
- **Minimum body length:** 10 characters

---

## Troubleshooting

### "Server configuration error"
- Check that `GITHUB_TOKEN` is set in your serverless function environment variables
- Redeploy after adding the variable

### "Failed to create issue"
- Verify the GitHub token has the correct permissions
- Check serverless function logs for detailed error messages
- Ensure the repository name is correct (`complanboy2/nowassist`)

### CORS errors
- Verify CORS headers are set correctly in the serverless function
- Check that your domain is allowed

---

## Files Created

- `api/create-issue.js` - Vercel serverless function
- `netlify/functions/create-issue.js` - Netlify serverless function
- `vercel.json` - Vercel configuration

