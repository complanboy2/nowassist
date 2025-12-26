# JWT Decoder/Encoder Enhancement Plan

Based on user feedback and gaps in jwt.io, this document outlines the comprehensive enhancement plan for the JWT tools.

## Priority 1: High-Impact Features (Immediate Implementation)

### 1.1 Security Validation & Linting ⚠️
**Status:** Planned  
**Impact:** High - Addresses common security issues

**Features:**
- [ ] Missing `exp` claim warning
- [ ] Missing `aud` claim warning  
- [ ] Weak signing algorithm detection (e.g., HS256 with weak secrets, none algorithm)
- [ ] Overly long expiry warnings (> 24 hours for access tokens)
- [ ] No `iat` claim (issued at) warning
- [ ] Token without signature (unsigned) detection
- [ ] Risk scoring system (Low/Medium/High/Critical)
- [ ] Security recommendations panel

**UI:**
- Security status badge in header
- Expandable security panel with all issues
- Color-coded severity (green/yellow/red)
- Actionable recommendations

### 1.2 Claim Intelligence & Smart UI 🧠
**Status:** Planned  
**Impact:** High - Makes tokens human-readable

**Features:**
- [ ] Human-readable claim explanations (tooltips)
- [ ] Visual time-to-live (TTL) progress bar
- [ ] Relative time formatting (e.g., "expires in 2 hours")
- [ ] Claim grouping (Standard claims, Custom claims, ServiceNow/Salesforce claims)
- [ ] Claim importance indicators (Required/Recommended/Optional)
- [ ] Auto-detection of common claim patterns

**UI:**
- Enhanced table view with explanations column
- Hover tooltips with claim descriptions
- Visual timeline for `iat`, `nbf`, `exp`
- Expandable claim details

### 1.3 JWKS (JSON Web Key Set) Support 🔑
**Status:** Planned  
**Impact:** High - Real-world key management

**Features:**
- [ ] Fetch keys from JWKS URL
- [ ] Auto-select key by `kid` (Key ID)
- [ ] Key rotation simulation
- [ ] Key history tracking
- [ ] JWKS endpoint validator
- [ ] Cache JWKS responses
- [ ] Support for multiple keys in set

**UI:**
- JWKS URL input field
- Key selector dropdown (when multiple keys)
- Key metadata display (algorithm, key ID, key type)
- Fetch status indicator

### 1.4 Token Lifecycle Testing ⏰
**Status:** Planned  
**Impact:** High - Debugging time-based issues

**Features:**
- [ ] Time simulation controls
- [ ] "Fast-forward time" slider
- [ ] Test expired tokens
- [ ] Test not-yet-valid tokens (`nbf`)
- [ ] Clock skew simulation (± minutes/hours)
- [ ] Visual timeline showing current time vs token times
- [ ] Auto-refresh token status

**UI:**
- Time control panel
- Current time display (simulated vs real)
- Token validity status based on simulated time
- Timeline visualization

### 1.5 Side-by-Side Token Comparison 🔄
**Status:** Planned  
**Impact:** Medium-High - Compare tokens easily

**Features:**
- [ ] Split view for two tokens
- [ ] Diff highlighting (added/removed/changed claims)
- [ ] Compare button to load second token
- [ ] Highlight differences in payload/header
- [ ] Export comparison report

**UI:**
- Two-column layout (like HAR Analyzer)
- Color-coded differences
- Summary panel showing differences count

### 1.6 Safe Token Handling (Redaction) 🔒
**Status:** Planned  
**Impact:** Medium - Privacy protection

**Features:**
- [ ] Redact mode toggle
- [ ] Mask sensitive claims (email, phone, SSN, etc.)
- [ ] Partial token sharing (specific claims only)
- [ ] Auto-detection of sensitive fields
- [ ] Custom claim masking
- [ ] Generate safe sharing link (local only)

**UI:**
- Redact toggle in header
- Checkboxes for individual claims
- Preview of redacted token
- Export redacted token

## Priority 2: Enhanced Debugging Features

### 2.1 Signature Verification Trace 🔍
**Status:** Planned  
**Impact:** Medium - Educational and debugging

**Features:**
- [ ] Step-by-step signature verification
- [ ] Show algorithm details
- [ ] Display message being signed
- [ ] Show signature bytes (hex/base64)
- [ ] Verification result explanation
- [ ] Common failure reasons

**UI:**
- Expandable verification trace panel
- Step-by-step visualization
- Code examples for verification

### 2.2 Malformed Token Diagnostics 🩺
**Status:** Planned  
**Impact:** Medium - Better error messages

**Features:**
- [ ] Identify which segment failed (header/payload/signature)
- [ ] Specific error messages for common issues
- [ ] Base64 decode validation
- [ ] JSON parse error details
- [ ] Segment length validation
- [ ] Suggestions for fixing errors

**UI:**
- Detailed error panel
- Highlight problematic segment
- Fix suggestions

## Priority 3: Developer Utilities

### 3.1 Token Templates 📋
**Status:** Planned  
**Impact:** Medium - Quick start

**Features:**
- [ ] ServiceNow template
- [ ] Salesforce template
- [ ] OAuth 2.0 template
- [ ] OpenID Connect template
- [ ] Custom template save/load
- [ ] Template variables (auto-fill timestamps, etc.)

**UI:**
- Template selector dropdown
- Template preview
- Custom template editor

### 3.2 Bulk Token Generation 🏭
**Status:** Planned  
**Impact:** Low-Medium - Testing utilities

**Features:**
- [ ] Generate multiple tokens with variations
- [ ] Random claim generation
- [ ] Export as JSON array
- [ ] Use cases: load testing, batch processing

## Priority 4: UX Enhancements

### 4.1 Keyboard Navigation ⌨️
**Status:** Planned  
**Impact:** Medium - Power user experience

**Features:**
- [ ] Keyboard shortcuts for common actions
- [ ] Tab navigation between sections
- [ ] Quick search/filter claims
- [ ] Command palette (Cmd/Ctrl+K)

### 4.2 Enhanced Table View 📊
**Status:** Planned  
**Impact:** Medium - Better data presentation

**Features:**
- [ ] Sortable columns
- [ ] Filterable claims
- [ ] Search within claims
- [ ] Export to CSV
- [ ] Column visibility toggles

## Priority 5: Enterprise Features (Future)

### 5.1 JWE (JSON Web Encryption) Support 🔐
**Status:** Future  
**Impact:** Low - Advanced use case

**Features:**
- [ ] Decrypt JWE tokens
- [ ] Encrypt JWT to JWE
- [ ] Support encryption algorithms
- [ ] Key management for encryption

### 5.2 Nested JWT Support 📦
**Status:** Future  
**Impact:** Low - Advanced use case

**Features:**
- [ ] Decode nested tokens
- [ ] Visualize token nesting
- [ ] Verify nested signatures

## Implementation Phases

### Phase 1: Security & Intelligence (Week 1)
1. Security validation & linting
2. Claim intelligence (explanations, TTL)
3. Enhanced error messages

### Phase 2: Key Management (Week 2)
1. JWKS support
2. Key rotation simulation
3. Enhanced key input UI

### Phase 3: Testing & Comparison (Week 3)
1. Token lifecycle testing
2. Side-by-side comparison
3. Time simulation

### Phase 4: Developer Tools (Week 4)
1. Token templates
2. Redaction mode
3. Signature verification trace

### Phase 5: Polish (Week 5)
1. Keyboard navigation
2. Enhanced table view
3. Performance optimization

## Notes

- **Privacy First:** All features run 100% in-browser, no network calls for token processing
- **Open Source:** Extension is self-hostable and auditable
- **Real-World Focus:** Prioritize features developers actually need based on Reddit/community feedback

