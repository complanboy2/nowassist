/**
 * JWKS (JSON Web Key Set) Utilities
 * Support for fetching and managing keys from JWKS endpoints
 */

/**
 * Fetch JWKS from URL
 */
export const fetchJWKS = async (jwksUrl) => {
  try {
    const response = await fetch(jwksUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const jwks = await response.json();
    
    if (!jwks.keys || !Array.isArray(jwks.keys)) {
      throw new Error('Invalid JWKS format: missing keys array');
    }
    
    return {
      success: true,
      jwks,
      keys: jwks.keys,
      count: jwks.keys.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to fetch JWKS',
      jwks: null,
      keys: [],
      count: 0,
    };
  }
};

/**
 * Find key by kid (Key ID)
 */
export const findKeyByKid = (jwks, kid) => {
  if (!jwks || !jwks.keys) return null;
  return jwks.keys.find(key => key.kid === kid) || null;
};

/**
 * Get key algorithm from JWK
 */
export const getKeyAlgorithm = (jwk) => {
  if (!jwk || !jwk.alg) return null;
  return jwk.alg;
};

/**
 * Import JWK to CryptoKey for verification
 */
export const importJWKForVerification = async (jwk) => {
  try {
    const algorithm = jwk.alg || 'RS256';
    
    // Determine algorithm type
    let algorithmDetails;
    if (algorithm.startsWith('RS')) {
      algorithmDetails = {
        name: 'RSASSA-PKCS1-v1_5',
        hash: algorithm === 'RS256' ? 'SHA-256' : algorithm === 'RS384' ? 'SHA-384' : 'SHA-512',
      };
    } else if (algorithm.startsWith('ES')) {
      algorithmDetails = {
        name: 'ECDSA',
        hash: algorithm === 'ES256' ? 'SHA-256' : algorithm === 'ES384' ? 'SHA-384' : 'SHA-512',
      };
      // Add named curve
      if (jwk.crv) {
        algorithmDetails.namedCurve = jwk.crv;
      } else if (algorithm === 'ES256') {
        algorithmDetails.namedCurve = 'P-256';
      } else if (algorithm === 'ES384') {
        algorithmDetails.namedCurve = 'P-384';
      } else if (algorithm === 'ES512') {
        algorithmDetails.namedCurve = 'P-521';
      }
    } else {
      throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
    
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      algorithmDetails,
      false,
      ['verify']
    );
    
    return { success: true, cryptoKey, algorithm: algorithmDetails };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to import JWK' };
  }
};

/**
 * Validate JWKS structure
 */
export const validateJWKS = (jwks) => {
  const errors = [];
  
  if (!jwks) {
    errors.push('JWKS is null or undefined');
    return { valid: false, errors };
  }
  
  if (!jwks.keys || !Array.isArray(jwks.keys)) {
    errors.push('JWKS must have a "keys" array');
    return { valid: false, errors };
  }
  
  if (jwks.keys.length === 0) {
    errors.push('JWKS keys array is empty');
    return { valid: false, errors };
  }
  
  jwks.keys.forEach((key, index) => {
    if (!key.kty) {
      errors.push(`Key ${index}: missing "kty" (key type)`);
    }
    if (!key.kid) {
      errors.push(`Key ${index}: missing "kid" (key ID)`);
    }
    if (!key.use && !key.alg) {
      errors.push(`Key ${index}: missing "use" or "alg" (key usage or algorithm)`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Cache JWKS responses (in-memory, for session)
 */
const jwksCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const getCachedJWKS = (url) => {
  const cached = jwksCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.jwks;
  }
  return null;
};

export const setCachedJWKS = (url, jwks) => {
  jwksCache.set(url, {
    jwks,
    timestamp: Date.now(),
  });
};

export const clearJWKSCache = (url = null) => {
  if (url) {
    jwksCache.delete(url);
  } else {
    jwksCache.clear();
  }
};

