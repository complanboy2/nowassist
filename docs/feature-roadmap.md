# NowAssist Tool Rollout Plan

## SAML Inspector (Week 2)

- **Decoder pipeline**: Base64 decode → XML pretty print (use `DOMParser` + `vkBeautify`-style formatter or custom indent util).
- **Attribute explorer**: Extract `AttributeStatement > Attribute` nodes into key/value tables with search + copy.
- **Certificate insights**: Parse `ds:X509Certificate`, show signature algorithm, expiration, and validity chips.
- **Clock skew detection**: Compare `NotBefore` / `NotOnOrAfter` with `Date.now() ± configurable skew`, show warning banner.
- **UI flow**:
  1. Input textarea with auto-decode toggle.
  2. Status panel (Valid / Expiring / Invalid) referencing signature + time checks.
  3. Tabs for Assertion, Attributes, Certificates.
  4. Error rail for parser + schema issues.

## REST API Tester (Week 3)

- **Request builder**: Method selector, URL validation (must match ServiceNow domains by default), dynamic query params.
- **Authentication presets**:
  - Basic Auth: secure credential modal stored via `chrome.storage.local`.
  - OAuth 2.0: token manager + quick paste from JWT decoder history.
  - API Key: header injection helper with masking.
- **Headers & body**: Key/value grid with Tailwind data table pattern, JSON body editor with auto-format + schema hints.
- **Response viewer**: Status badge, latency, raw headers, pretty JSON/HTML/Raw tabs, save-to-history option.
- **History & templates**:
  - Persist last 10 requests offline.
  - Built-in templates: Table API, GlideRecord API, Attachment API.
- **Testing hooks**: Provide mock ServiceNow instance config + `chrome.storage.sync` backup for Pro tier.

## Shared Considerations

- Componentize banners, tabs, copy buttons for reuse across JWT/SAML/REST pages.
- Central utility module for time deltas, clipboard, and theme tokens.
- Extend Tailwind theme with semantic colors for status + brand alignment.
- Maintain perf budget: lazy-load heavy XML/JSON helpers only on the respective tool pages.


