# Screenshots Guide for Chrome Web Store

## Required Screenshots

Chrome Web Store requires at least **1 screenshot** and allows up to **5 screenshots**.

### Screenshot Specifications:
- **Dimensions**: 1280 x 800 pixels (recommended) or 640 x 400 pixels (minimum)
- **Format**: PNG or JPEG
- **File Size**: Maximum 1 MB per image
- **Content**: Should showcase the extension's main features

## Recommended Screenshots

### Screenshot 1: Main Dashboard / Popup (Required)
**What to capture**: The extension popup showing all available tools
- Open the extension popup
- Show the list of tools (JWT Decoder, SAML Inspector, REST API Tester, etc.)
- Make sure the UI is clean and professional

**File name**: `screenshot-1-popup.png`

### Screenshot 2: JWT Decoder
**What to capture**: JWT Decoder with a decoded token
- Navigate to JWT Decoder
- Paste a sample JWT token
- Show the decoded header, payload, and signature verification
- Highlight the clean, professional UI

**File name**: `screenshot-2-jwt-decoder.png`

### Screenshot 3: REST API Tester
**What to capture**: REST API Tester with a successful request/response
- Navigate to REST API Tester
- Show a GET request to a public API (e.g., https://api.github.com)
- Display the request configuration and response
- Show the code generation feature

**File name**: `screenshot-3-rest-api-tester.png`

### Screenshot 4: HAR Analyzer
**What to capture**: HAR Analyzer showing network request analysis
- Navigate to HAR Analyzer
- Show the request list with filtering options
- Display detailed request/response view
- Highlight the professional layout

**File name**: `screenshot-4-har-analyzer.png`

### Screenshot 5: JSON Utility
**What to capture**: JSON Utility with formatted JSON and diff view
- Navigate to JSON Utility
- Show JSON formatting and diff comparison
- Display the clean, organized interface

**File name**: `screenshot-5-json-utility.png`

## How to Take Screenshots

### Option 1: Browser Screenshot Extension
1. Install a screenshot extension (e.g., "Full Page Screen Capture")
2. Navigate to each tool page
3. Take a screenshot of the full page
4. Crop to 1280x800 if needed

### Option 2: Chrome DevTools
1. Open Chrome DevTools (F12)
2. Press Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows)
3. Type "Capture screenshot"
4. Select "Capture node screenshot" for specific sections
5. Or use "Capture full size screenshot" for full page

### Option 3: Screen Capture Tool
1. Use macOS Screenshot (Cmd+Shift+4) or Windows Snipping Tool
2. Capture the browser window
3. Resize to 1280x800 using an image editor

## Screenshot Tips

1. **Use Real Data**: Use realistic but non-sensitive sample data
2. **Clean UI**: Make sure the UI is clean, no errors visible
3. **Highlight Features**: Show the most impressive features
4. **Consistent Theme**: Use the same browser theme across all screenshots
5. **Professional Look**: Ensure the extension looks polished and professional
6. **No Personal Info**: Don't include any personal or sensitive information

## Sample Data for Screenshots

### JWT Token (Safe to use):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### REST API Endpoint:
- `https://api.github.com/users/octocat`
- `https://jsonplaceholder.typicode.com/posts/1`

### HAR File:
- Export a HAR file from Chrome DevTools Network tab
- Use a simple website like `https://example.com`

## Image Editing

If you need to edit screenshots:
- **macOS**: Preview, Pixelmator, or Photoshop
- **Windows**: Paint, GIMP, or Photoshop
- **Online**: Canva, Photopea, or remove.bg

## Final Checklist

- [ ] At least 1 screenshot (1280x800 or 640x400)
- [ ] All screenshots are under 1 MB
- [ ] Screenshots show the extension's main features
- [ ] No personal or sensitive information visible
- [ ] UI looks clean and professional
- [ ] Screenshots are in PNG or JPEG format

