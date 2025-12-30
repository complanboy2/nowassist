# Serverless Functions

This folder contains serverless function implementations for creating GitHub issues from the Help & Support form.

## Structure

- `api/create-issue.js` - Vercel serverless function
- `netlify/create-issue.js` - Netlify serverless function
- `cloudflare/cloudflare-worker.js` - Cloudflare Worker implementation
- `vercel.json` - Vercel configuration

## Current Status

The application currently uses the **URL method** for creating GitHub issues (pre-filling the GitHub issue form). These serverless functions are kept here for future use if you decide to switch to direct server-side issue creation.

## Deployment

If you want to use these serverless functions instead of the URL method:

1. Deploy the appropriate function to your chosen platform (Vercel, Netlify, or Cloudflare)
2. Set the `VITE_GITHUB_ISSUE_API` environment variable in your frontend build
3. Update the Help & Support form to use the API endpoint

See the individual function files for deployment instructions.

