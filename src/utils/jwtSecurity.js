/**
 * JWT Security Validation & Linting Utilities
 * Comprehensive security analysis for JWT tokens
 */

export const SECURITY_SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info',
};

export const CLAIM_INFO = {
  // Standard JWT Claims
  iss: {
    name: 'Issuer',
    description: 'Identifies the principal that issued the JWT',
    required: false,
    category: 'Standard',
  },
  sub: {
    name: 'Subject',
    description: 'Identifies the subject of the JWT (usually the user)',
    required: false,
    category: 'Standard',
  },
  aud: {
    name: 'Audience',
    description: 'Identifies the recipients that the JWT is intended for. Should always be present in production tokens.',
    required: false,
    recommended: true,
    category: 'Standard',
  },
  exp: {
    name: 'Expiration Time',
    description: 'Identifies the expiration time on or after which the JWT must not be accepted for processing',
    required: false,
    recommended: true,
    category: 'Standard',
  },
  nbf: {
    name: 'Not Before',
    description: 'Identifies the time before which the JWT must not be accepted for processing',
    required: false,
    category: 'Standard',
  },
  iat: {
    name: 'Issued At',
    description: 'Identifies the time at which the JWT was issued',
    required: false,
    recommended: true,
    category: 'Standard',
  },
  jti: {
    name: 'JWT ID',
    description: 'Provides a unique identifier for the JWT. Can be used to prevent token replay attacks.',
    required: false,
    category: 'Standard',
  },
  
  // Common custom claims
  email: {
    name: 'Email',
    description: 'User email address',
    required: false,
    category: 'Custom',
  },
  name: {
    name: 'Name',
    description: 'User full name',
    required: false,
    category: 'Custom',
  },
  scope: {
    name: 'Scope',
    description: 'OAuth 2.0 scope values',
    required: false,
    category: 'OAuth',
  },
  
  // ServiceNow claims
  sys_id: {
    name: 'ServiceNow Sys ID',
    description: 'ServiceNow system record identifier',
    required: false,
    category: 'ServiceNow',
  },
  user_name: {
    name: 'ServiceNow Username',
    description: 'ServiceNow user name',
    required: false,
    category: 'ServiceNow',
  },
  instance: {
    name: 'ServiceNow Instance',
    description: 'ServiceNow instance identifier',
    required: false,
    category: 'ServiceNow',
  },
  
  // Salesforce claims
  organization_id: {
    name: 'Salesforce Organization ID',
    description: 'Salesforce organization identifier',
    required: false,
    category: 'Salesforce',
  },
  user_id: {
    name: 'Salesforce User ID',
    description: 'Salesforce user identifier',
    required: false,
    category: 'Salesforce',
  },
};

/**
 * Comprehensive security validation for JWT tokens
 */
export const validateJWT = (header, payload, signature, currentTime = Date.now()) => {
  const issues = [];
  
  if (!header) {
    issues.push({
      severity: SECURITY_SEVERITY.CRITICAL,
      code: 'MISSING_HEADER',
      title: 'Missing Header',
      message: 'JWT header is missing or invalid',
      recommendation: 'Ensure the token has a valid header segment',
    });
    return { issues, riskScore: 100 };
  }
  
  if (!payload) {
    issues.push({
      severity: SECURITY_SEVERITY.CRITICAL,
      code: 'MISSING_PAYLOAD',
      title: 'Missing Payload',
      message: 'JWT payload is missing or invalid',
      recommendation: 'Ensure the token has a valid payload segment',
    });
    return { issues, riskScore: 100 };
  }
  
  const alg = header.alg;
  
  // Critical: None algorithm
  if (alg === 'none' || alg === 'None' || alg === 'NONE') {
    issues.push({
      severity: SECURITY_SEVERITY.CRITICAL,
      code: 'NONE_ALGORITHM',
      title: 'None Algorithm Detected',
      message: 'Token uses the "none" algorithm, which provides no security',
      recommendation: 'Never use the "none" algorithm in production. Use HS256, RS256, or ES256.',
      riskScore: 100,
    });
  }
  
  // High: Missing signature
  if (!signature || signature.length === 0) {
    issues.push({
      severity: SECURITY_SEVERITY.HIGH,
      code: 'MISSING_SIGNATURE',
      title: 'Missing Signature',
      message: 'Token has no signature (unsigned token)',
      recommendation: 'Always sign tokens in production to ensure integrity and authenticity',
      riskScore: 80,
    });
  }
  
  // High: Missing expiration
  if (!payload.exp) {
    issues.push({
      severity: SECURITY_SEVERITY.HIGH,
      code: 'MISSING_EXP',
      title: 'Missing Expiration Claim',
      message: 'Token has no expiration time (exp claim)',
      recommendation: 'Always include an expiration time to limit token lifetime and reduce risk if compromised',
      riskScore: 70,
    });
  } else {
    // Check if expired
    const expMs = payload.exp * 1000;
    if (expMs < currentTime) {
      const deltaDays = Math.floor((currentTime - expMs) / (1000 * 60 * 60 * 24));
      issues.push({
        severity: SECURITY_SEVERITY.HIGH,
        code: 'EXPIRED_TOKEN',
        title: 'Token Expired',
        message: `Token expired ${deltaDays > 0 ? `${deltaDays} day(s)` : 'recently'} ago`,
        recommendation: 'Do not accept expired tokens. Request a new token from the identity provider',
        riskScore: 60,
      });
    }
  }
  
  // High: Missing audience
  if (!payload.aud) {
    issues.push({
      severity: SECURITY_SEVERITY.HIGH,
      code: 'MISSING_AUD',
      title: 'Missing Audience Claim',
      message: 'Token has no audience (aud claim)',
      recommendation: 'Include an audience claim to ensure tokens are only used by intended recipients',
      riskScore: 65,
    });
  }
  
  // Medium: Missing issued at
  if (!payload.iat) {
    issues.push({
      severity: SECURITY_SEVERITY.MEDIUM,
      code: 'MISSING_IAT',
      title: 'Missing Issued At Claim',
      message: 'Token has no issued at time (iat claim)',
      recommendation: 'Include iat claim to track when the token was issued',
      riskScore: 30,
    });
  } else {
    // Check if issued in the future (clock skew)
    const iatMs = payload.iat * 1000;
    const skewMinutes = (iatMs - currentTime) / (1000 * 60);
    if (skewMinutes > 5) {
      issues.push({
        severity: SECURITY_SEVERITY.MEDIUM,
        code: 'FUTURE_IAT',
        title: 'Future Issued At Time',
        message: `Token appears to be issued ${Math.round(skewMinutes)} minutes in the future`,
        recommendation: 'Check system clocks for clock skew between issuer and validator',
        riskScore: 40,
      });
    }
  }
  
  // Medium: Long expiration time
  if (payload.exp && payload.iat) {
    const lifetimeHours = (payload.exp - payload.iat) / 3600;
    if (lifetimeHours > 24) {
      issues.push({
        severity: SECURITY_SEVERITY.MEDIUM,
        code: 'LONG_EXPIRY',
        title: 'Long Token Lifetime',
        message: `Token lifetime is ${Math.round(lifetimeHours)} hours (${Math.round(lifetimeHours / 24)} days)`,
        recommendation: 'Access tokens should typically expire within 1 hour. Use refresh tokens for longer sessions',
        riskScore: 45,
      });
    }
  }
  
  // Medium: Weak algorithm
  if (alg === 'HS256') {
    issues.push({
      severity: SECURITY_SEVERITY.MEDIUM,
      code: 'WEAK_ALGORITHM',
      title: 'HMAC Algorithm Used',
      message: 'Token uses HMAC (symmetric) signing algorithm',
      recommendation: 'Consider using RS256 or ES256 (asymmetric) for better key management in distributed systems',
      riskScore: 35,
      note: 'HS256 is acceptable if secret is properly managed',
    });
  }
  
  // Low: Missing JWT ID
  if (!payload.jti) {
    issues.push({
      severity: SECURITY_SEVERITY.LOW,
      code: 'MISSING_JTI',
      title: 'Missing JWT ID',
      message: 'Token has no unique identifier (jti claim)',
      recommendation: 'Include jti claim to enable token revocation and prevent replay attacks',
      riskScore: 20,
    });
  }
  
  // Low: Not Before claim validation
  if (payload.nbf) {
    const nbfMs = payload.nbf * 1000;
    if (nbfMs > currentTime) {
      const deltaMinutes = Math.round((nbfMs - currentTime) / (1000 * 60));
      issues.push({
        severity: SECURITY_SEVERITY.INFO,
        code: 'NOT_YET_VALID',
        title: 'Token Not Yet Valid',
        message: `Token will be valid in ${deltaMinutes} minutes`,
        recommendation: 'Wait until nbf time before accepting this token',
        riskScore: 10,
      });
    }
  }
  
  // Calculate overall risk score (0-100)
  const riskScore = Math.min(100, Math.max(0, 
    issues.reduce((score, issue) => score + (issue.riskScore || 0), 0) / Math.max(issues.length, 1)
  ));
  
  return { issues, riskScore };
};

/**
 * Get risk level from score
 */
export const getRiskLevel = (riskScore) => {
  if (riskScore >= 80) return { level: 'Critical', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
  if (riskScore >= 60) return { level: 'High', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
  if (riskScore >= 40) return { level: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' };
  if (riskScore >= 20) return { level: 'Low', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
  return { level: 'Info', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
};

/**
 * Get claim information
 */
export const getClaimInfo = (claimName) => {
  return CLAIM_INFO[claimName] || {
    name: claimName,
    description: 'Custom claim',
    required: false,
    category: 'Custom',
  };
};

/**
 * Format relative time
 */
export const formatRelativeTime = (timestamp, currentTime = Date.now()) => {
  if (!timestamp) return '—';
  const ts = typeof timestamp === 'number' ? timestamp * 1000 : timestamp;
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return 'Invalid timestamp';
  
  const seconds = Math.floor((ts - currentTime) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  
  if (Math.abs(days) > 0) {
    return `${date.toLocaleString()} (${relative.format(days, 'day')})`;
  } else if (Math.abs(hours) > 0) {
    return `${date.toLocaleString()} (${relative.format(hours, 'hour')})`;
  } else if (Math.abs(minutes) > 0) {
    return `${date.toLocaleString()} (${relative.format(minutes, 'minute')})`;
  } else {
    return `${date.toLocaleString()} (${relative.format(seconds, 'second')})`;
  }
};

/**
 * Calculate time to live
 */
export const calculateTTL = (exp, currentTime = Date.now()) => {
  if (!exp) return null;
  const expMs = exp * 1000;
  const ttlMs = expMs - currentTime;
  const ttlPercentage = Math.max(0, Math.min(100, (ttlMs / (expMs - (currentTime - 86400000))) * 100));
  return {
    ms: ttlMs,
    seconds: Math.floor(ttlMs / 1000),
    minutes: Math.floor(ttlMs / (1000 * 60)),
    hours: Math.floor(ttlMs / (1000 * 60 * 60)),
    days: Math.floor(ttlMs / (1000 * 60 * 60 * 24)),
    percentage: ttlPercentage,
    expired: ttlMs < 0,
  };
};

/**
 * Group claims by category
 */
export const groupClaims = (payload) => {
  if (!payload) return {};
  
  const groups = {
    Standard: {},
    Custom: {},
    OAuth: {},
    ServiceNow: {},
    Salesforce: {},
  };
  
  Object.entries(payload).forEach(([key, value]) => {
    const info = getClaimInfo(key);
    const category = info.category || 'Custom';
    if (groups[category]) {
      groups[category][key] = value;
    } else {
      groups.Custom[key] = value;
    }
  });
  
  return groups;
};

