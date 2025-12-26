/**
 * JWT Redaction Utilities
 * Safe token handling - mask sensitive claims before sharing
 */

const SENSITIVE_CLAIMS = [
  'password',
  'secret',
  'token',
  'access_token',
  'refresh_token',
  'api_key',
  'apikey',
  'auth',
  'authorization',
  'credit_card',
  'ssn',
  'social_security',
  'pin',
  'pii',
  'phi',
];

const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /auth/i,
  /credential/i,
  /passphrase/i,
  /private/i,
];

/**
 * Check if a claim name is sensitive
 */
export const isSensitiveClaim = (claimName) => {
  const lower = claimName.toLowerCase();
  
  // Direct match
  if (SENSITIVE_CLAIMS.some(sensitive => lower.includes(sensitive))) {
    return true;
  }
  
  // Pattern match
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(claimName));
};

/**
 * Redact sensitive claims from payload
 */
export const redactClaims = (payload, claimsToRedact = [], maskChar = '*', maskLength = 8) => {
  if (!payload) return payload;
  
  const redacted = { ...payload };
  const toRedact = new Set(claimsToRedact);
  
  // Auto-detect sensitive claims if none specified
  if (claimsToRedact.length === 0) {
    Object.keys(payload).forEach(key => {
      if (isSensitiveClaim(key)) {
        toRedact.add(key);
      }
    });
  }
  
  // Redact specified claims
  toRedact.forEach(claim => {
    if (claim in redacted) {
      const value = redacted[claim];
      if (typeof value === 'string') {
        redacted[claim] = maskChar.repeat(Math.min(maskLength, value.length)) + (value.length > maskLength ? '...' : '');
      } else if (typeof value === 'object' && value !== null) {
        redacted[claim] = '[REDACTED]';
      } else {
        redacted[claim] = maskChar.repeat(maskLength);
      }
    }
  });
  
  return redacted;
};

/**
 * Generate redacted JWT (header.payload.[REDACTED])
 */
export const generateRedactedJWT = (header, redactedPayload, originalSignature = '') => {
  try {
    const base64UrlEncode = (str) => {
      const utf8 = encodeURIComponent(str)
        .replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16)));
      return btoa(utf8)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    };
    
    const headerEncoded = base64UrlEncode(JSON.stringify(header));
    const payloadEncoded = base64UrlEncode(JSON.stringify(redactedPayload));
    
    return `${headerEncoded}.${payloadEncoded}.${originalSignature.substring(0, 10)}...REDACTED`;
  } catch (error) {
    return null;
  }
};

/**
 * Export redacted token info for sharing
 */
export const exportRedactedToken = (header, payload, redactedClaims, options = {}) => {
  const {
    includeHeader = true,
    includePayload = true,
    maskChar = '*',
    maskLength = 8,
  } = options;
  
  const redacted = redactClaims(payload, redactedClaims, maskChar, maskLength);
  
  return {
    header: includeHeader ? header : null,
    payload: includePayload ? redacted : null,
    redactedClaims: Array.from(redactedClaims),
    timestamp: new Date().toISOString(),
    note: 'This token has been redacted for safe sharing. Sensitive claims have been masked.',
  };
};

