# Privacy Policy for NowAssist Chrome Extension

**Last Updated**: January 2025

## Introduction

NowAssist ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we handle information when you use the NowAssist Chrome extension.

## Data Collection

**We do not collect, store, or transmit any personal data or user information.**

### What We Don't Do:
- ❌ We don't collect personal information
- ❌ We don't track your browsing activity
- ❌ We don't store data on external servers
- ❌ We don't use analytics or tracking services
- ❌ We don't share data with third parties
- ❌ We don't use cookies for tracking

### What We Do:
- ✅ All processing happens locally in your browser
- ✅ Data stays on your device
- ✅ No network requests are made (except when you explicitly use REST API Tester or JWKS fetcher)
- ✅ No data is transmitted to external servers

## Local Storage

The extension may use Chrome's local storage API to:
- Store your preferences (if any)
- Cache JWKS keys temporarily for performance
- Save REST API request history locally on your device

All this data remains on your device and is never transmitted externally.

## Network Requests

The extension makes network requests only in the following scenarios:
1. **REST API Tester**: When you explicitly send HTTP requests using the REST API Tester feature
2. **JWKS Fetcher**: When you explicitly fetch JSON Web Key Sets from a URL you provide

These requests are made directly from your browser to the endpoints you specify. We do not intercept, log, or store these requests.

## Permissions

The extension requires the following permissions:
- **webRequest**: To enable REST API testing functionality
- **storage**: To save your preferences locally on your device
- **debugger**: For advanced debugging features
- **scripting**: To inject content scripts when needed
- **tabs**: To interact with browser tabs
- **host_permissions**: To allow REST API requests to any URL you specify

These permissions are used solely for the extension's functionality and not for data collection.

## Third-Party Services

We do not integrate with any third-party analytics, advertising, or tracking services.

## Data Security

Since we don't collect or transmit data, there's no data to secure. All processing happens locally in your browser using standard web technologies.

## Children's Privacy

Our extension does not knowingly collect information from children. Since we don't collect any information, this is not applicable.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last Updated" date at the top of this policy.

## Contact Us

If you have any questions about this Privacy Policy, please contact us through the Chrome Web Store listing or the extension's About page.

## Your Rights

Since we don't collect any data, there's no data to access, modify, or delete. You have complete control over your data as it never leaves your device.

---

**Summary**: NowAssist processes everything locally in your browser. Your data never leaves your device. We don't collect, store, or transmit any information.

