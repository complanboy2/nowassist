# Dark Mode Implementation Analysis

## Summary
Based on JWT Decoder page fixes, here's the comprehensive analysis for all pages.

## Pages Status:

### ✅ 1. JWT Decoder (jwt.jsx) - COMPLETED
- All backgrounds fixed (dark:bg-gray-800, dark:bg-gray-700)
- All text colors fixed (dark:text-white)
- All buttons fixed (dark:text-white, dark:bg-gray-700)
- All inputs fixed (dark:bg-gray-800, dark:text-white)
- All labels fixed (dark:text-white)
- All tables fixed (dark:bg-gray-800, dark:text-white)
- All code/pre blocks fixed (dark:text-white)
- All badges fixed (dark mode colors)
- All dropdowns fixed (dark:bg-gray-800)

### 🔄 2. SAML Inspector (saml.jsx) - PARTIALLY DONE
**File size:** 1362 lines
**bg-white instances:** ~38
**Dark mode classes found:** Only 9

**What needs fixing:**
1. Main container background (line ~854): Already has dark:bg-gray-900 ✅
2. Header: Already has dark mode ✅
3. View mode toggle buttons: Need dark mode text colors
4. Refresh/Clear buttons: Need dark mode (background, text, icons)
5. Input textarea: Need dark mode
6. XML Viewer component: Partially done, needs completion
   - Header text colors
   - Copy button
   - Line wrap checkbox label
7. All white boxes/panels (38 instances):
   - Protocol Info sections
   - Certificate sections
   - Attribute sections
   - Status indicators
   - All dl/dt/dd elements
8. All text colors: Need to be white (dark:text-white)
9. All buttons: Need dark mode styling
10. All borders: Need dark:border-gray-700
11. Extension mode wrapper: Needs dark:bg-gray-900

### 🔄 3. About Page (about.jsx) - PARTIALLY DONE
**File size:** 307 lines
**bg-white instances:** ~12

**What needs fixing:**
1. Check all remaining white backgrounds
2. All text colors to white
3. All feature cards
4. All borders

### ⬜ 4. REST API Tester (rest.jsx) - NEEDS FULL IMPLEMENTATION
**File size:** 1014 lines
**bg-white instances:** ~38

**What needs fixing:**
1. Main container background
2. Header
3. Request section (method dropdown, URL input, headers, body)
4. Response section (status, headers, body)
5. All buttons (Send, Clear, Copy, etc.)
6. All input fields
7. All textareas
8. All dropdowns
9. All tables
10. History panel
11. All text colors

### ⬜ 5. JWT Encoder (jwt-encoder.jsx) - NEEDS FULL IMPLEMENTATION
**File size:** 1101 lines
**bg-white instances:** ~44

**What needs fixing:**
1. Main container
2. Header
3. All input sections (header, payload, secret)
4. All buttons
5. All inputs/textareas
6. All code blocks
7. All labels
8. Result section
9. All text colors

### ⬜ 6. Encoder-Decoder (encoder-decoder.jsx) - NEEDS FULL IMPLEMENTATION
**File size:** 527 lines
**bg-white instances:** ~20

**What needs fixing:**
1. Main container
2. Header
3. Input/output sections
4. All buttons
5. All inputs/textareas
6. Format selector dropdowns
7. All text colors

### ⬜ 7. HAR Analyzer (har-analyzer.jsx) - NEEDS FULL IMPLEMENTATION
**File size:** 1798 lines
**bg-white instances:** ~24

**What needs fixing:**
1. Main container
2. Header
3. Upload section
4. Filter/search sections
5. Table (headers, rows, cells)
6. All buttons
7. All inputs
8. All dropdowns
9. Detail panels
10. All text colors

### ⬜ 8. JSON Utility (json-utility.jsx) - NEEDS FULL IMPLEMENTATION
**File size:** 565 lines
**bg-white instances:** ~23

**What needs fixing:**
1. Main container
2. Header
3. Input/output sections
4. All buttons
5. All inputs/textareas
6. Code editor areas
7. All labels
8. All text colors

---

## Fix Order (recommended):
1. SAML Inspector (complete partial implementation)
2. About Page (complete partial implementation)
3. REST API Tester (largest, most complex)
4. JWT Encoder
5. Encoder-Decoder (smallest, start here if want quick win)
6. HAR Analyzer
7. JSON Utility

