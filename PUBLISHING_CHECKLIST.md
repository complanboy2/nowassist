# Chrome Web Store Publishing Checklist

## Pre-Submission Checklist

### 1. Extension Files ✅
- [x] Extension builds successfully (`npm run build`)
- [x] All files present in `dist/` folder
- [x] `manifest.json` is valid and complete
- [x] Icons are present (16x16, 32x32, 48x48, 128x128)
- [x] All HTML entry points work correctly
- [x] No console errors in production build
- [x] Extension loads without errors in Chrome

### 2. Functionality Testing ✅
- [x] JWT Decoder works correctly
- [x] JWT Encoder works correctly
- [x] SAML Inspector works correctly
- [x] REST API Tester works correctly
- [x] HAR Analyzer works correctly
- [x] JSON Utility works correctly
- [x] Encoder/Decoder works correctly
- [x] Navigation sidebar works
- [x] All links and buttons functional
- [x] Responsive design works on different screen sizes

### 3. Code Quality ✅
- [x] No sensitive data in code
- [x] No hardcoded credentials
- [x] Error handling implemented
- [x] Code is clean and well-structured
- [x] No unnecessary console.log statements in production

### 4. Documentation ✅
- [x] `CHROME_STORE_LISTING.md` - Store listing description
- [x] `PRIVACY_POLICY.md` - Privacy policy content
- [x] `SCREENSHOTS_GUIDE.md` - Screenshot instructions
- [x] `STORE_LISTING_DETAILS.md` - Complete store listing info
- [x] `PUBLISHING_CHECKLIST.md` - This file

### 5. Store Listing Assets ⬜
- [ ] **Screenshots** (1-5 images, 1280x800 or 640x400)
  - [ ] Screenshot 1: Popup/Dashboard
  - [ ] Screenshot 2: JWT Decoder
  - [ ] Screenshot 3: REST API Tester
  - [ ] Screenshot 4: HAR Analyzer (optional)
  - [ ] Screenshot 5: JSON Utility (optional)
- [ ] **Promotional Images** (optional but recommended)
  - [ ] Small tile (440x280)
  - [ ] Large tile (920x680) - optional
  - [ ] Marquee tile (1400x560) - optional

### 6. Privacy & Legal ⬜
- [ ] Privacy policy hosted online (GitHub Pages, website, etc.)
- [ ] Privacy policy URL ready for store listing
- [ ] Privacy policy content matches extension functionality

### 7. Store Listing Information ⬜
- [ ] Name: "NowAssist"
- [ ] Short description (132 characters max)
- [ ] Detailed description (from `CHROME_STORE_LISTING.md`)
- [ ] Category: Developer Tools or Productivity
- [ ] Language: English (United States)
- [ ] Support email/website (if available)

### 8. Permissions Justification ⬜
- [ ] Ready to explain each permission if asked by reviewers
- [ ] Permissions are minimal and necessary
- [ ] Documentation explains why each permission is needed

---

## Submission Steps

### Step 1: Prepare ZIP File
```bash
cd dist
zip -r ../nowassist-v0.1.0.zip .
```

### Step 2: Chrome Web Store Developer Dashboard
1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Sign in with your Google account
3. Pay one-time $5 registration fee (if not already paid)
4. Click "New Item" or "Add new item"

### Step 3: Upload Extension
1. Upload the ZIP file (`nowassist-v0.1.0.zip`)
2. Wait for upload to complete
3. Review any warnings or errors

### Step 4: Fill Store Listing
1. **Basic Information**
   - Name: NowAssist
   - Short description: (from `CHROME_STORE_LISTING.md`)
   - Detailed description: (from `CHROME_STORE_LISTING.md`)
   - Category: Developer Tools
   - Language: English (United States)

2. **Graphics**
   - Upload screenshots (1-5)
   - Upload promotional images (optional)
   - Icons should auto-populate from manifest

3. **Privacy**
   - Privacy practices: Select appropriate options
   - Privacy policy URL: (your hosted privacy policy URL)
   - Single purpose: Yes
   - User data collection: No

4. **Support**
   - Support email (optional)
   - Support website (optional)

### Step 5: Content Rating
1. Complete the content rating questionnaire
2. Answer all questions accurately
3. Submit for rating

### Step 6: Submit for Review
1. Review all information
2. Check for any warnings
3. Click "Submit for Review"
4. Wait for review (typically 1-3 business days)

---

## Post-Submission

### If Approved ✅
- [ ] Extension is live in Chrome Web Store
- [ ] Monitor user reviews and feedback
- [ ] Plan for updates and improvements

### If Rejected ❌
- [ ] Read reviewer feedback carefully
- [ ] Address all concerns
- [ ] Update extension if needed
- [ ] Resubmit with changes

---

## Common Rejection Reasons

1. **Privacy Policy Missing**: Must have a hosted privacy policy URL
2. **Permissions Not Justified**: Be ready to explain each permission
3. **Screenshots Required**: At least 1 screenshot is mandatory
4. **Functionality Issues**: Extension must work as described
5. **Misleading Description**: Description must match functionality
6. **Violation of Policies**: Review Chrome Web Store policies

---

## Tips for Success

1. **Be Detailed**: Provide comprehensive descriptions
2. **Show Value**: Clearly explain what the extension does
3. **Quality Screenshots**: Use high-quality, clear screenshots
4. **Privacy First**: Be transparent about data handling
5. **Test Thoroughly**: Ensure everything works before submission
6. **Follow Guidelines**: Read Chrome Web Store policies carefully

---

## Resources

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Chrome Web Store Policies](https://developer.chrome.com/docs/webstore/program-policies/)
- [Publishing Your Extension](https://developer.chrome.com/docs/webstore/publish/)
- [Privacy Policy Requirements](https://developer.chrome.com/docs/webstore/user-data/)

---

## Version History Template

When updating, document changes:

```markdown
### Version 0.1.1 (Future)
- Bug fixes
- Performance improvements

### Version 0.1.0 (Initial Release)
- JWT Decoder
- JWT Encoder
- SAML Inspector
- REST API Tester
- HAR Analyzer
- JSON Utility
- Encoder/Decoder
```

---

**Ready to publish?** Follow the steps above and good luck! 🚀

