# Hosting Privacy Policy for Chrome Web Store

## Current Status

✅ **Privacy Policy Created**: `PRIVACY_POLICY.md` file is ready in the project root.

## Option 1: GitHub Pages (Recommended)

### Steps to Host on GitHub Pages:

1. **Push your repository to GitHub** (if not already):
   ```bash
   git remote add origin <your-github-repo-url>
   git push -u origin master
   ```

2. **Enable GitHub Pages**:
   - Go to your GitHub repository
   - Settings → Pages
   - Source: Select "Deploy from a branch"
   - Branch: Select `master` (or `main`) and `/docs` folder (or root)
   - Click Save

3. **Rename/Move the Privacy Policy**:
   - Option A: Rename `PRIVACY_POLICY.md` to `privacy-policy.html` (GitHub Pages will serve it)
   - Option B: Create a `docs/` folder and put `privacy-policy.html` there
   - Option C: Use GitHub's markdown rendering (see below)

4. **Convert Markdown to HTML** (if needed):
   - GitHub Pages can serve markdown files directly
   - Or convert to HTML for better control

5. **Access the URL**:
   - Your privacy policy will be at: `https://<username>.github.io/<repo-name>/privacy-policy.html`
   - Or: `https://<username>.github.io/<repo-name>/PRIVACY_POLICY.md` (if serving markdown)

### Quick Setup (If using GitHub Pages with Markdown):

1. Create a `docs/` folder in your repo
2. Copy `PRIVACY_POLICY.md` to `docs/privacy-policy.md`
3. Enable GitHub Pages pointing to `/docs` folder
4. Access at: `https://<username>.github.io/<repo-name>/privacy-policy.html`

## Option 2: Convert to HTML and Host on GitHub Pages

### Convert Markdown to HTML:

```bash
# Using pandoc (if installed)
pandoc PRIVACY_POLICY.md -o privacy-policy.html --standalone --css github-markdown.css

# Or use online converter: https://dillinger.io/ or https://stackedit.io/
```

### Create a simple HTML version:

1. Copy content from `PRIVACY_POLICY.md`
2. Create `privacy-policy.html` with basic HTML structure
3. Upload to GitHub Pages or your website

## Option 3: Use Existing Website

If you have a website, simply:
1. Create a page (e.g., `/privacy-policy`)
2. Copy content from `PRIVACY_POLICY.md`
3. Format as HTML
4. Use the URL: `https://yourwebsite.com/privacy-policy`

## Option 4: GitHub Raw File (Temporary - Not Recommended)

**Note**: GitHub raw files work but are not ideal for privacy policies (plain markdown display).

- URL format: `https://raw.githubusercontent.com/<username>/<repo>/<branch>/PRIVACY_POLICY.md`
- **Better**: Use GitHub Pages for proper HTML rendering

## Recommended HTML Template

If converting to HTML, use this simple template:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - NowAssist</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1 { color: #2c3e50; }
        h2 { color: #34495e; margin-top: 30px; }
        strong { color: #2c3e50; }
    </style>
</head>
<body>
    <!-- Paste PRIVACY_POLICY.md content here, convert markdown to HTML -->
</body>
</html>
```

## For Chrome Web Store Listing

Once you have the URL, use it in:

1. **Chrome Web Store Developer Dashboard**
2. **Store Listing** → **Privacy**
3. **Privacy Policy URL**: Enter your hosted URL (e.g., `https://username.github.io/repo/privacy-policy.html`)

## Quick Reference

- ✅ Privacy Policy Document: `PRIVACY_POLICY.md` (already created)
- ⬜ Host the policy online (GitHub Pages recommended)
- ⬜ Get the URL
- ⬜ Add URL to Chrome Web Store listing

---

**Recommended Next Steps:**
1. Push repository to GitHub (if not already)
2. Enable GitHub Pages
3. Create `docs/privacy-policy.html` or `docs/PRIVACY_POLICY.md`
4. Access at: `https://<username>.github.io/<repo-name>/privacy-policy.html`
5. Use that URL in Chrome Web Store listing

