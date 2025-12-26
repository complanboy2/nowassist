# QA Checklist for Production Rollout

## Pre-Flight Checks
- [ ] Build succeeds: `npm run build`
- [ ] Lint passes: `npm run lint`
- [ ] No console errors on fresh install
- [ ] Extension loads in Chrome without errors
- [ ] All navigation links work between pages

---

## 1. JWT Decoder

### Functional Tests
- [ ] Valid JWT token decodes correctly
- [ ] Header section displays algorithm and type
- [ ] Payload section displays all claims
- [ ] Signature section displays when present
- [ ] Invalid/malformed JWT shows appropriate error
- [ ] Expired token shows expiration warning
- [ ] Token expiring soon (< 1 hour) shows warning
- [ ] Copy button works for all sections
- [ ] Clear button clears input
- [ ] Generate example button populates sample JWT

### Verification Tests
- [ ] HMAC verification works (HS256, HS384, HS512)
- [ ] RSA verification works (RS256, RS384, RS512)
- [ ] EC verification works (ES256, ES384, ES512)
- [ ] PEM key format accepted
- [ ] JWK format accepted
- [ ] Key file upload works
- [ ] Invalid key shows appropriate error
- [ ] Verification result displays clearly

### Company-Specific Tests
- [ ] ServiceNow theme displays correctly
- [ ] Salesforce theme displays correctly
- [ ] Company-specific claims highlighted
- [ ] Company dropdown works
- [ ] Auto-detection of company works

### UI/UX Tests
- [ ] Header height is consistent (not too tall)
- [ ] Layout doesn't shift when content loads
- [ ] Status badges display correctly
- [ ] Payload view mode toggle (JSON/Table) works
- [ ] All text is readable and properly aligned
- [ ] No layout issues on resize

### Error Handling
- [ ] Invalid token shows user-friendly error
- [ ] Missing key shows appropriate message
- [ ] Verification failure clearly indicated
- [ ] No uncaught exceptions in console

---

## 2. SAML Inspector

### Functional Tests
- [ ] Valid SAML assertion decodes correctly
- [ ] Base64 auto-decode works when enabled
- [ ] Manual input works
- [ ] Captured SAML messages load (if background script available)
- [ ] Refresh button loads captured messages
- [ ] Clear All button clears captured messages
- [ ] XML formatting displays correctly
- [ ] Line numbers display correctly
- [ ] Line wrap toggle works

### Parsing Tests
- [ ] SAML attributes extracted correctly
- [ ] Certificate information displays
- [ ] Subject, Issuer, Audience display correctly
- [ ] Timestamps formatted correctly
- [ ] Signature validation info displays
- [ ] Invalid SAML shows appropriate error
- [ ] Malformed XML handled gracefully

### UI/UX Tests
- [ ] Header height is consistent
- [ ] SAML Information panel displays correctly
- [ ] Color-coded sections display properly
- [ ] Copy button works for all sections
- [ ] View mode toggle works (Manual/Captured)
- [ ] All text is readable

### Error Handling
- [ ] Invalid SAML shows user-friendly error
- [ ] Missing certificate info handled gracefully
- [ ] No uncaught exceptions in console

---

## 3. REST API Tester

### Functional Tests
- [ ] GET request works
- [ ] POST request works
- [ ] PUT request works
- [ ] PATCH request works
- [ ] DELETE request works
- [ ] Custom headers can be added
- [ ] Custom headers can be removed
- [ ] Multiple headers work correctly
- [ ] Request body input works for POST/PUT/PATCH

### Authentication Tests
- [ ] None (no auth) works
- [ ] Basic authentication works
- [ ] Bearer token authentication works
- [ ] OAuth 2.0 option available (even if not fully implemented)
- [ ] Auth value input shows/hides correctly based on type

### Response Tests
- [ ] Successful responses (2xx) display correctly
- [ ] Error responses (4xx) display correctly
- [ ] Server errors (5xx) display correctly
- [ ] Response headers display correctly
- [ ] Response body displays correctly (JSON/text)
- [ ] Response time/latency displays
- [ ] Status code color coding works
- [ ] Status icon displays correctly

### UI/UX Tests
- [ ] Header height is consistent
- [ ] Request panel layout correct
- [ ] Response panel layout correct
- [ ] URL input accepts valid URLs
- [ ] Method dropdown works
- [ ] Loading state displays during request
- [ ] Copy button works

### Error Handling
- [ ] Invalid URL shows appropriate error
- [ ] Network errors handled gracefully
- [ ] CORS errors show user-friendly message
- [ ] Timeout errors handled
- [ ] No uncaught exceptions in console

---

## 4. HAR Analyzer

### Functional Tests
- [ ] HAR file upload works (.har, .json)
- [ ] File upload validation works
- [ ] HAR file parsing succeeds
- [ ] Request list displays all entries
- [ ] Virtualized scrolling works smoothly (5k+ entries)
- [ ] Large HAR files (5MB, 10MB, 20MB) load without freezing
- [ ] Entry selection works
- [ ] Details panel displays when entry selected

### Filtering Tests
- [ ] Filter by HTTP method works
- [ ] Filter by status code works (2xx, 4xx, 5xx, failed)
- [ ] Filter by content type works
- [ ] Filter by domain works
- [ ] Advanced search query works
- [ ] Field-specific search (URL="...", Status=400) works
- [ ] Multiple filters combine correctly
- [ ] Clear filters works

### Sorting Tests
- [ ] Sort by time works (asc/desc)
- [ ] Sort by method works
- [ ] Sort by status works
- [ ] Sort by size works
- [ ] Sort by duration works
- [ ] Sort indicator displays correctly

### Comparison Mode
- [ ] Upload second HAR file works
- [ ] Comparison view displays differences
- [ ] Added requests highlighted
- [ ] Removed requests highlighted
- [ ] Changed requests highlighted
- [ ] Comparison summary displays

### Sanitization Tests
- [ ] Sanitize toggle works
- [ ] Cookies redacted when enabled
- [ ] Authorization headers redacted
- [ ] Sensitive headers redacted
- [ ] Export with sanitization works

### Details Panel Tests
- [ ] Request headers display correctly
- [ ] Response headers display correctly
- [ ] Request body displays correctly
- [ ] Response body displays correctly
- [ ] Cookies display correctly
- [ ] Timing information displays correctly
- [ ] Copy button works for all sections
- [ ] Format button works for JSON bodies
- [ ] Search highlighting works in details
- [ ] Tab indicators show when search matches

### Performance Tests
- [ ] 5,000 entries: Smooth scrolling, no lag
- [ ] 10,000 entries: Smooth scrolling, no lag
- [ ] 15,000 entries: Smooth scrolling, no lag
- [ ] Memory usage stable during scrolling
- [ ] No UI freezing on large files
- [ ] Virtualized table renders only visible rows

### Export Tests
- [ ] Export HAR works
- [ ] Export JSON works
- [ ] Export CSV works
- [ ] Sanitized export works

### Error Handling
- [ ] Invalid HAR file shows appropriate error
- [ ] Empty HAR file handled gracefully
- [ ] Corrupted JSON handled gracefully
- [ ] Missing required fields handled
- [ ] No uncaught exceptions in console

---

## 5. JSON Utility

### Functional Tests
- [ ] Valid JSON displays correctly
- [ ] Invalid JSON shows error with line highlighting
- [ ] Error tooltip displays on hover over error icon
- [ ] Error information is expandable
- [ ] Pretty Print formats JSON correctly
- [ ] Minify removes whitespace correctly
- [ ] Sort keys (ascending) works
- [ ] Sort keys (descending) works
- [ ] Flatten JSON works
- [ ] Unflatten JSON works
- [ ] Tree View displays correctly
- [ ] Tree View inline editing works
- [ ] Double-click to edit in tree view works
- [ ] JSON Diff comparison works
- [ ] JSON to CSV conversion works
- [ ] CSV to JSON conversion works

### Input/Output Tests
- [ ] Input editor accepts paste
- [ ] Output editor displays formatted result
- [ ] Copy input button works
- [ ] Copy output button works
- [ ] Clear button works
- [ ] Generate Sample button works
- [ ] Generate creates different samples each time
- [ ] Line numbers display correctly
- [ ] Text alignment correct (cursor matches line numbers)

### UI/UX Tests
- [ ] Header height is consistent
- [ ] Valid/Invalid indicator displays correctly
- [ ] Buttons are visible and clickable
- [ ] Button alignment correct
- [ ] Editor panels resize correctly
- [ ] Split view works (50/50)
- [ ] Full-width view works when collapsed
- [ ] No layout shifts when buttons clicked
- [ ] No layout shifts with different sample sizes

### Error Handling
- [ ] Invalid JSON shows clear error message
- [ ] Error line highlighted correctly
- [ ] Error tooltip displays full error info
- [ ] Syntax errors caught and displayed
- [ ] No uncaught exceptions in console

---

## 6. Navigation & Layout

### Sidebar Tests
- [ ] Sidebar opens/closes correctly
- [ ] Collapsed button appears when sidebar closed
- [ ] Search in sidebar works
- [ ] Category headers display correctly
- [ ] Active page highlighted correctly
- [ ] Navigation links work between pages
- [ ] Sidebar styling consistent across all pages

### Layout Consistency
- [ ] All pages use same sidebar design
- [ ] All pages use same header height (text-2xl, mb-3)
- [ ] All pages use same max-width (max-w-[1800px])
- [ ] All pages use same padding (px-8 py-6)
- [ ] All pages use same spacing (space-y-6)
- [ ] Colors consistent across pages
- [ ] No layout shifts when navigating

### Responsive Tests
- [ ] Layout works on different screen sizes
- [ ] Sidebar collapses appropriately
- [ ] Content scrolls correctly
- [ ] No horizontal scrolling issues

---

## 7. Performance Tests

### Memory Tests
- [ ] Memory usage stable during normal use
- [ ] No memory leaks when switching between pages
- [ ] Large HAR files don't cause memory spikes
- [ ] Clearing data releases memory

### CPU Tests
- [ ] Scrolling in HAR analyzer is smooth (60fps)
- [ ] Typing in JSON editor is responsive
- [ ] Filtering/searching doesn't cause lag
- [ ] No excessive re-renders

### Load Time Tests
- [ ] Extension loads quickly
- [ ] Pages load quickly
- [ ] Large files process without hanging

---

## 8. Error Handling (Global)

### Error Display
- [ ] All errors show user-friendly messages
- [ ] No technical error messages exposed to users
- [ ] Error states don't break UI layout
- [ ] Users can recover from errors

### Console Checks
- [ ] No uncaught exceptions
- [ ] No console errors in normal operation
- [ ] Warnings are minimal and acceptable
- [ ] No CSP violations
- [ ] No permission errors

---

## 9. Browser Compatibility

- [ ] Chrome (latest) - Full functionality
- [ ] Chrome (previous version) - Full functionality
- [ ] Edge (Chromium) - Full functionality
- [ ] Extension doesn't break on browser updates

---

## 10. Security Checks

- [ ] No sensitive data logged to console
- [ ] All processing happens client-side (where applicable)
- [ ] No external API calls without user consent
- [ ] CSP policies respected
- [ ] Input validation prevents XSS
- [ ] File uploads validated

---

## 11. Accessibility

- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Screen reader compatible (basic)
- [ ] Color contrast sufficient
- [ ] Text readable at default zoom
- [ ] Interactive elements accessible

---

## Checklist Summary

### Critical (Must Pass)
- Build succeeds
- No console errors
- All navigation works
- Basic functionality of each tool works
- Error handling works

### Important (Should Pass)
- Performance with large files
- UI consistency
- All features functional
- Memory/CPU usage reasonable

### Nice to Have
- Perfect accessibility
- Edge case handling
- Optimized performance

---

## Testing Notes

1. Test on fresh Chrome profile
2. Test with extension disabled/enabled
3. Test with browser logs open (Console tab)
4. Test with Performance tab open for large operations
5. Test with different network conditions for REST API tester
6. Document any issues found with steps to reproduce

---

## Sign-off

**QA Tester**: _______________  
**Date**: _______________  
**Status**: [ ] Ready for Production [ ] Needs Fixes

**Issues Found**:
1. 
2. 
3. 

**Recommendations**:
1. 
2. 
3. 

