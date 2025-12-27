# Host Permissions Justification for Chrome Web Store Review

## Current Permission

```json
"host_permissions": ["<all_urls>"]
```

## Why This Permission Is Required

Our extension requires `<all_urls>` host permission for the following **user-initiated** features:

### 1. REST API Tester
- **Purpose**: Allows users to test REST APIs on **any domain they specify**
- **User Action**: User explicitly enters a URL and clicks "Send Request"
- **Why `<all_urls>` is needed**: Users need to test APIs across different domains (their own servers, third-party APIs, internal services, etc.)
- **Security**: All requests are user-initiated and explicit - no automatic requests

### 2. JWKS (JSON Web Key Set) Fetcher
- **Purpose**: Fetches public keys from JWKS endpoints for JWT verification
- **User Action**: User explicitly provides a JWKS URL and clicks to fetch
- **Why `<all_urls>` is needed**: JWKS endpoints can be on any domain (different identity providers, services, etc.)
- **Security**: Only fetches JSON data (keys), not executable code. User-initiated only.

### 3. SAML Message Interception (Background)
- **Purpose**: Captures SAML requests/responses for inspection
- **User Action**: Automatic capture for user to inspect later
- **Why `<all_urls>` is needed**: SAML flows can occur on any domain
- **Security**: Only captures data for display to user, never transmits externally

## Why Alternative Options Don't Work

### ❌ Cannot Use `activeTab`
- REST API requests are made from the extension's background context, not from a specific tab
- User may want to test an API that's different from the current tab's URL
- JWKS fetching is independent of the current tab

### ❌ Cannot Specify Specific Sites
- Users need to test APIs on their own domains, internal servers, or any third-party service
- JWKS endpoints vary by identity provider (Auth0, Okta, Azure AD, custom providers, etc.)
- SAML flows can occur on any SSO provider domain

## Security Measures

1. **All requests are user-initiated** - No automatic network activity
2. **No data collection** - All data stays local, never transmitted externally
3. **No remote code execution** - Only fetches JSON/data, never executes code
4. **Privacy-focused** - Everything happens in the browser (see Privacy Policy)

## Recommendation

**Keep `<all_urls>` permission** with the following justification in the store listing:

> "This extension requires access to all URLs to enable the REST API Tester (users can test APIs on any domain they specify) and JWKS fetcher (fetches public keys from any identity provider). All requests are user-initiated and no data is collected or transmitted externally."

## Alternative Consideration (Optional)

If you want to reduce review time, you could use `optional_host_permissions`, but this requires users to approve each domain, which significantly degrades the user experience for a developer tool.

---

**For Chrome Web Store Reviewers**: This is a developer utility tool that requires broad permissions to allow users to test APIs and fetch keys from any domain. All network activity is user-initiated and no data leaves the user's device.

