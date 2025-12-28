# Troubleshooting 404 Error on GitHub Pages

## Quick Fix Steps

### Step 1: Check Actions Tab
1. Go to: https://github.com/complanboy2/nowassist/actions
2. Look for "Deploy to GitHub Pages" workflow
3. Check if it ran after the last push

**If you don't see any workflow runs:**
- The workflow needs to be manually triggered the first time
- Click "Deploy to GitHub Pages" → "Run workflow" button → Run

**If you see a failed workflow (red X):**
- Click on it to see the error
- Common errors:
  - Build failed (check build logs)
  - Permissions error (see Step 2)
  - Environment approval needed (see Step 3)

### Step 2: Fix Permissions
1. Go to: Settings → Actions → General
2. Scroll to "Workflow permissions"
3. Select: **"Read and write permissions"**
4. Check: **"Allow GitHub Actions to create and approve pull requests"**
5. Save

### Step 3: Approve Environment (if needed)
1. Go to: Settings → Environments
2. Click on "github-pages" environment
3. If you see "Required reviewers", add yourself or remove the requirement
4. Save

### Step 4: Manually Trigger Workflow
1. Go to: Actions tab
2. Click "Deploy to GitHub Pages" workflow
3. Click "Run workflow" button (top right)
4. Select "main" branch
5. Click "Run workflow"
6. Wait 2-3 minutes for it to complete

### Step 5: Verify Deployment
1. Go to: Settings → Pages
2. You should see a deployment listed
3. Check the URL shown
4. Wait a few more minutes if it just completed

---

## Alternative: Use Branch-based Deployment

If GitHub Actions continues to have issues, we can switch to deploying from a branch:

1. Build locally: `npm run build:web`
2. Create gh-pages branch and push dist folder
3. Set Pages source to gh-pages branch

Let me know if you want to try this approach.

---

## Still Not Working?

Check these:
- ✅ Repository is public (or you have GitHub Pro)
- ✅ Workflow completed successfully (green checkmark)
- ✅ Pages settings show "GitHub Actions" as source
- ✅ Deployment appears in Pages settings

Tell me what you see in the Actions tab, and I'll provide the exact fix!

