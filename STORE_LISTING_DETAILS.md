# Chrome Web Store Listing Details

## Store Listing Information

### Category
**Developer Tools** or **Productivity**

### Language
**English (United States)**

### Regions
**All regions** (or select specific regions if needed)

---

## Detailed Store Listing

### Name
```
NowAssist
```

### Short Description (132 characters)
```
Professional developer toolkit for ServiceNow engineers. JWT decoder, SAML inspector, REST API tester, HAR analyzer, and JSON utilities.
```

### Detailed Description
See `CHROME_STORE_LISTING.md` for the full detailed description.

### Promotional Images

#### Small Promotional Tile (440 x 280 pixels)
- **Purpose**: Appears in the Chrome Web Store homepage and category pages
- **Content**: NowAssist logo/branding with tagline
- **Text**: "NowAssist - Developer Toolkit"

#### Large Promotional Tile (920 x 680 pixels) - Optional
- **Purpose**: Featured placement on Chrome Web Store
- **Content**: Professional design showcasing key features

#### Marquee Promotional Tile (1400 x 560 pixels) - Optional
- **Purpose**: Large promotional banner
- **Content**: High-quality visual with key features highlighted

### Icon
- **128x128 pixels**: Already included in `dist/icons/icon128.png`
- **48x48 pixels**: Already included in `dist/icons/icon48.png`
- **16x16 pixels**: Already included in `dist/icons/icon16.png`

### Screenshots
- **Minimum**: 1 screenshot (1280 x 800 or 640 x 400)
- **Maximum**: 5 screenshots
- See `SCREENSHOTS_GUIDE.md` for detailed instructions

---

## Additional Information

### Privacy Practices
- **Single Purpose**: Yes - Developer tools
- **Host Permissions**: Yes - Required for REST API testing
- **Collection of User Data**: No
- **Privacy Policy**: Required - See `PRIVACY_POLICY.md`

### Content Rating
- **Category**: Developer Tools
- **Content**: Suitable for all ages
- **No mature content**

### Support Information

#### Website (Optional)
```
(Add your website URL if available)
```

#### Support Email (Optional)
```
(Add your support email if available)
```

#### Support URL (Optional)
```
(Add your support page URL if available)
```

#### Privacy Policy URL (Required)
```
(Your hosted privacy policy URL - see HOSTING_PRIVACY_POLICY.md for instructions)
Example: https://username.github.io/repo-name/privacy-policy.html
```

---

## Permissions Justification

### webRequest
**Why**: Required for REST API Tester to send HTTP requests to any URL the user specifies.

### storage
**Why**: Used to save user preferences and REST API request history locally on the device.

### debugger
**Why**: Required for advanced debugging features and HAR file analysis.

### scripting
**Why**: Used to inject content scripts when needed for extension functionality.

### tabs
**Why**: Required to interact with browser tabs for certain features.

### host_permissions (<all_urls>)
**Why**: Required for REST API Tester to allow users to test APIs on any domain they specify.

**Justification for Reviewers**:
- REST API Tester: Users need to test APIs across different domains (their own servers, third-party APIs, internal services, etc.). All requests are user-initiated.
- JWKS Fetcher: Users need to fetch public keys from JWKS endpoints on any identity provider domain (Auth0, Okta, Azure AD, custom providers, etc.). Only fetches JSON data, never executes code.
- Cannot use `activeTab`: API requests are made from extension context, not tied to a specific tab.
- Cannot specify specific sites: Users test their own APIs and services which vary by organization.
- All network activity is user-initiated. No automatic requests. No data is collected or transmitted externally.

---

## Publishing Checklist

### Before Submission
- [x] Extension builds successfully
- [x] All features tested and working
- [x] No console errors
- [x] Privacy policy created
- [ ] Screenshots prepared (1-5 images)
- [ ] Promotional images created (optional but recommended)
- [ ] Description finalized
- [ ] Icons are high quality (128x128, 48x48, 16x16)
- [ ] manifest.json is correct
- [ ] Version number is set correctly

### Store Listing
- [ ] Name: "NowAssist"
- [ ] Short description (132 chars max)
- [ ] Detailed description
- [ ] Category selected
- [ ] Language set
- [ ] Screenshots uploaded
- [ ] Promotional images uploaded (optional)
- [ ] Privacy policy URL provided
- [ ] Support information provided (if available)

### Content Rating
- [ ] Content rating questionnaire completed
- [ ] All questions answered accurately

### Review Process
- [ ] Extension submitted for review
- [ ] Ready to respond to reviewer feedback if needed

---

## Version Information

### Current Version
**0.1.0**

### Version History
- **0.1.0** (Initial Release)
  - JWT Decoder with signature verification
  - JWT Encoder
  - SAML Inspector
  - REST API Tester
  - HAR Analyzer
  - JSON Utility
  - Encoder/Decoder tool

---

## Keywords for Discovery

- ServiceNow
- JWT
- SAML
- REST API
- Developer Tools
- API Testing
- JSON
- HAR Analyzer
- Authentication
- Debugging
- Token Decoder
- API Client

---

## Notes

1. **Privacy Policy**: You'll need to host the privacy policy online and provide the URL in the store listing.

2. **Screenshots**: Take high-quality screenshots showing the extension's main features. See `SCREENSHOTS_GUIDE.md` for detailed instructions.

3. **Promotional Images**: While optional, promotional images can significantly improve visibility in the Chrome Web Store.

4. **Support**: Consider setting up a support email or website before publishing.

5. **Updates**: Plan for regular updates to fix bugs and add features based on user feedback.

---

## Quick Start Checklist

1. ✅ Read `CHROME_STORE_LISTING.md` for description
2. ✅ Read `PRIVACY_POLICY.md` for privacy policy
3. ✅ Read `SCREENSHOTS_GUIDE.md` for screenshot instructions
4. ⬜ Take screenshots (1-5 images)
5. ⬜ Create promotional images (optional)
6. ⬜ Host privacy policy online
7. ⬜ Prepare store listing details
8. ⬜ Submit to Chrome Web Store

---

**Good luck with your Chrome Web Store submission!** 🚀

