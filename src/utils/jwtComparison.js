/**
 * JWT Comparison Utilities
 * Side-by-side token comparison and diff
 */

/**
 * Compare two JWT tokens
 */
export const compareTokens = (token1, token2) => {
  const parseToken = (token) => {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    try {
      const base64UrlDecode = (segment) => {
        const padded = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(
          segment.length + (segment.length % 4 ? 4 - (segment.length % 4) : 0), 
          '='
        );
        const decoded = atob(padded);
        try {
          return decodeURIComponent(
            decoded
              .split('')
              .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
              .join('')
          );
        } catch {
          return decoded;
        }
      };
      
      const headerRaw = base64UrlDecode(parts[0]);
      const payloadRaw = base64UrlDecode(parts[1]);
      
      return {
        header: JSON.parse(headerRaw),
        payload: JSON.parse(payloadRaw),
        signature: parts[2],
        headerRaw,
        payloadRaw,
      };
    } catch {
      return null;
    }
  };
  
  const t1 = parseToken(token1);
  const t2 = parseToken(token2);
  
  if (!t1 || !t2) {
    return {
      valid: false,
      error: 'One or both tokens are invalid',
    };
  }
  
  // Compare headers
  const headerDiff = diffObjects(t1.header, t2.header);
  
  // Compare payloads
  const payloadDiff = diffObjects(t1.payload, t2.payload);
  
  // Compare signatures
  const signaturesMatch = t1.signature === t2.signature;
  
  return {
    valid: true,
    token1: t1,
    token2: t2,
    headerDiff,
    payloadDiff,
    signaturesMatch,
    summary: {
      headerChanges: headerDiff.added.length + headerDiff.removed.length + headerDiff.changed.length,
      payloadChanges: payloadDiff.added.length + payloadDiff.removed.length + payloadDiff.changed.length,
      signaturesMatch,
    },
  };
};

/**
 * Diff two objects
 */
const diffObjects = (obj1, obj2) => {
  const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);
  const added = [];
  const removed = [];
  const changed = [];
  const unchanged = [];
  
  allKeys.forEach(key => {
    const val1 = obj1?.[key];
    const val2 = obj2?.[key];
    
    if (!(key in (obj1 || {}))) {
      added.push({ key, value: val2 });
    } else if (!(key in (obj2 || {}))) {
      removed.push({ key, value: val1 });
    } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
      changed.push({ key, oldValue: val1, newValue: val2 });
    } else {
      unchanged.push({ key, value: val1 });
    }
  });
  
  return { added, removed, changed, unchanged };
};

/**
 * Get diff summary text
 */
export const getDiffSummary = (comparison) => {
  if (!comparison.valid) {
    return comparison.error || 'Comparison failed';
  }
  
  const { headerDiff, payloadDiff, signaturesMatch } = comparison;
  
  const parts = [];
  
  if (headerDiff.added.length > 0) parts.push(`${headerDiff.added.length} header field(s) added`);
  if (headerDiff.removed.length > 0) parts.push(`${headerDiff.removed.length} header field(s) removed`);
  if (headerDiff.changed.length > 0) parts.push(`${headerDiff.changed.length} header field(s) changed`);
  
  if (payloadDiff.added.length > 0) parts.push(`${payloadDiff.added.length} claim(s) added`);
  if (payloadDiff.removed.length > 0) parts.push(`${payloadDiff.removed.length} claim(s) removed`);
  if (payloadDiff.changed.length > 0) parts.push(`${payloadDiff.changed.length} claim(s) changed`);
  
  if (signaturesMatch) {
    parts.push('Signatures match');
  } else {
    parts.push('Signatures differ');
  }
  
  return parts.join(', ') || 'Tokens are identical';
};

