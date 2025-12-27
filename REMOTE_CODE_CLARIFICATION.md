# Remote Code Clarification for Chrome Web Store

## Question: "Does your extension use remote code?"

**Answer: NO**

## Explanation

### What is Remote Code?
Remote code refers to JavaScript code that is:
1. Loaded from external URLs (not bundled in the extension)
2. Dynamically executed using `eval()`, `Function()`, or similar methods
3. Injected from external servers at runtime

### Our Extension Does NOT Use Remote Code

✅ **All code is bundled locally**: The extension uses Vite to bundle all JavaScript code into the extension package. All code is present in the `dist/assets/` folder after build.

✅ **No dynamic code execution**: We do not use:
- `eval()`
- `Function()` constructor
- `setTimeout()` or `setInterval()` with string code
- `innerHTML` with script tags
- Dynamic script loading from URLs

✅ **No remote JavaScript loading**: We do not:
- Load `.js` files from external URLs
- Use `import()` with remote URLs for code
- Fetch and execute JavaScript from servers

### What We DO Use (These are NOT remote code):

#### 1. **JWKS Fetching** (in JWT Decoder)
- **What it does**: Fetches JSON Web Key Sets (JWKS) from URLs you provide
- **Is it remote code?**: **NO**
- **Why**: JWKS are JSON data files (keys), not executable JavaScript code
- **Location**: `src/utils/jwks.js` - Uses standard `fetch()` API to get JSON data
- **User-initiated**: Only fetches when user explicitly provides a JWKS URL

#### 2. **REST API Requests** (in REST API Tester)
- **What it does**: Makes HTTP requests to APIs the user specifies
- **Is it remote code?**: **NO**
- **Why**: These are HTTP requests (GET, POST, etc.) to APIs, not JavaScript code execution
- **Location**: `src/rest.jsx` - Uses standard `fetch()` API for HTTP requests
- **User-initiated**: Only makes requests when user explicitly clicks "Send Request"

#### 3. **All Libraries are Bundled**
- React, Tailwind CSS, Prism.js, etc. are all bundled into the extension
- No CDN dependencies
- No external script tags

### Code Bundling Process

1. **Build Process**: `npm run build` bundles all code using Vite
2. **Output**: All JavaScript is in `dist/assets/*.js` files
3. **No External Dependencies**: Everything is included in the extension package
4. **Static Files**: All HTML files reference local bundled assets

### Verification

You can verify by:
1. Looking at `dist/` folder after build - all code is there
2. Checking `manifest.json` - no external script sources
3. Searching the codebase - no `eval()`, `Function()`, or remote script loading

---

## For Chrome Web Store Reviewers

**Question**: "Does your extension use remote code?"

**Answer**: **NO**

**Additional Context**: 
- All JavaScript code is bundled locally in the extension package
- The extension only fetches JSON data (JWKS keys) and makes HTTP requests (REST API), which are user-initiated features, not remote code execution
- No dynamic code evaluation or remote script loading is used

---

**Last Updated**: December 2024

