import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Info,
  Key,
  ListChecks,
  Network,
  Search,
  ShieldCheck,
  Table,
  Upload,
  X,
  FileText,
  FileCode,
  FileJson,
  Clock,
  Eye,
  EyeOff,
  GitCompare,
  Download,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import clsx from 'clsx';
import Navigation from './components/Navigation';
import './styles.css';
import { 
  validateJWT, 
  getRiskLevel, 
  getClaimInfo, 
  formatRelativeTime, 
  calculateTTL, 
  groupClaims,
  SECURITY_SEVERITY 
} from './utils/jwtSecurity';
import {
  fetchJWKS,
  findKeyByKid,
  getCachedJWKS,
  setCachedJWKS,
  clearJWKSCache,
  validateJWKS,
  importJWKForVerification,
} from './utils/jwks';
import {
  redactClaims,
  isSensitiveClaim,
  generateRedactedJWT,
  exportRedactedToken,
} from './utils/jwtRedaction';
import {
  compareTokens,
  getDiffSummary,
} from './utils/jwtComparison';

// Company themes
const COMPANY_THEMES = {
  servicenow: {
    name: 'ServiceNow',
    primary: '#81B5A1',
    primaryDark: '#5A8F7A',
    primaryLight: '#A8D4C4',
    bgGradient: 'from-green-50 to-emerald-50',
    badgeBg: '#81B5A1',
    badgeText: '#FFFFFF',
  },
  salesforce: {
    name: 'Salesforce',
    primary: '#00A1E0',
    primaryDark: '#0070D2',
    primaryLight: '#4FC3F7',
    bgGradient: 'from-blue-50 to-cyan-50',
    badgeBg: '#00A1E0',
    badgeText: '#FFFFFF',
  },
};

// Company detection from payload
const detectCompany = (payload) => {
  if (!payload) return 'servicenow';
  
  if (payload.sys_id || payload.instance || payload.instance_url || 
      payload.user_name || (payload.email && payload.email.includes('servicenow'))) {
    return 'servicenow';
  }
  
  if (payload.organization_id || payload.user_id || payload.sfdc_instance_url ||
      payload.scope || (payload.email && payload.email.includes('salesforce'))) {
    return 'salesforce';
  }
  
  return 'servicenow';
};

const getCompanyHints = (payload, company) => {
  if (!payload) return [];
  const hints = [];
  
  if (company === 'servicenow') {
    if (payload.sys_id) hints.push('Contains ServiceNow sys_id');
    if (payload.user_name || payload.userName) hints.push('User principal claim detected');
    if (payload.instance || payload.instance_url) hints.push('Instance metadata present');
  } else if (company === 'salesforce') {
    if (payload.organization_id) hints.push('Contains Salesforce organization_id');
    if (payload.user_id) hints.push('User ID claim detected');
    if (payload.sfdc_instance_url) hints.push('Salesforce instance URL present');
    if (payload.scope) hints.push('OAuth scope defined');
  }
  
  return hints;
};

const getCompanyClaimSet = (payload, company) => {
  if (!payload) return new Set();
  const claimSet = new Set();
  
  if (company === 'servicenow') {
    if (payload.sys_id) claimSet.add('sys_id');
    if (payload.user_name || payload.userName) claimSet.add('user_name');
    if (payload.instance || payload.instance_url) {
      claimSet.add('instance');
      claimSet.add('instance_url');
    }
  } else if (company === 'salesforce') {
    if (payload.organization_id) claimSet.add('organization_id');
    if (payload.user_id) claimSet.add('user_id');
    if (payload.sfdc_instance_url) claimSet.add('sfdc_instance_url');
    if (payload.scope) claimSet.add('scope');
  }
  
  return claimSet;
};

const base64UrlDecode = (segment) => {
  if (!segment) return '';
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(segment.length + (segment.length % 4 ? 4 - (segment.length % 4) : 0), '=');
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

const pretty = (segment) => {
  if (!segment) return '';
  try {
    return JSON.stringify(JSON.parse(segment), null, 2);
  } catch {
    return segment;
  }
};

const formatTimestamp = (value) => {
  if (!value) return '—';
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return 'Invalid timestamp';
  const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const hours = Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60));
  return `${date.toLocaleString()} (${relative.format(hours, 'hour')})`;
};

const analyzeStatus = (payload) => {
  if (!payload?.exp) {
    return {
      tone: 'warning',
      icon: AlertCircle,
      message: 'Missing exp claim',
    };
  }
  const now = Date.now();
  const expMs = payload.exp * 1000;
  if (expMs < now) {
    const deltaDays = Math.floor((now - expMs) / (1000 * 60 * 60 * 24));
    return {
      tone: 'error',
      icon: AlertCircle,
      message: deltaDays > 0 ? `Expired ${deltaDays} day(s) ago` : 'Recently expired',
    };
  }
  const diffHours = (expMs - now) / (1000 * 60 * 60);
  if (diffHours <= 1) {
    return {
      tone: 'warning',
      icon: AlertCircle,
      message: `Expiring in ${Math.round(diffHours * 60)} minutes`,
    };
  }
  return {
    tone: 'success',
    icon: CheckCircle2,
    message: `Valid for ${Math.round(diffHours)} hour(s)`,
  };
};

const toneStyles = {
  success: { text: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
  warning: { text: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
  error: { text: 'text-error', bg: 'bg-error/10', border: 'border-error/20' },
};

const targetClaims = ['sub', 'name', 'email', 'user_name', 'sys_id', 'iat', 'exp'];

// Test RSA Public Key (corresponds to private key used for signing)
const TEST_RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4f5wg5l2hKsTeNem/V41
fGnJm6gOdrj8ym3rFkEjWT2bt1gNkZnjIe9E0HPR+ZaVCgLj3qMPWtHPF9hwlEU
jJ0OZJgI9V1PpQXl0+3qXEzZPJ2V0Y5J8TqFzXZQ7i3qW3+7r0G7jZQ1+3qW3+7
r0G7jZQ1+3qW3+7r0G7jZQ1+3qW3+7r0G7jZQ1+3qW3+7r0G7jZQ1+3qW3+7r0
G7jZQ1+3qW3+7r0G7jZQ1+3qW3+7r0G7jZQ1+3qW3+7r0G7jZQ1+3qW3+7r0G7
jZQ1+3qW3+7r0G7jZQ1+3qW3+7r0G7jZQ1+3qW3+7r0G7jZQ1+3qW3+7r0G7jZ
QwIDAQAB
-----END PUBLIC KEY-----`;

// Test ECDSA Public Key (P-256)
const TEST_ECDSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE2K2S7O8Z8Y7qY7qY7qY7qY7qY7q
Y7qY7qY7qY7qY7qY7qY7qY7qY7qY7qY7qY7qY7qY7qY7qY7qY7qY7qY7qY7qY
-----END PUBLIC KEY-----`;

// Generate random string for HMAC secret
const generateRandomSecret = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generate random JWT example
const generateJWTExample = async (algorithm = 'HS256') => {
  const firstNames = ['John', 'Jane', 'Alice', 'Bob', 'Charlie', 'David', 'Emma', 'Frank', 'Grace', 'Henry'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  const domains = ['example.com', 'test.com', 'demo.org', 'sample.net', 'dev.io'];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
  const userName = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  const sysId = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  
  const now = Math.floor(Date.now() / 1000);
  const iat = now - Math.floor(Math.random() * 3600); // Issued up to 1 hour ago
  const exp = now + Math.floor(Math.random() * 86400) + 3600; // Expires 1 hour to 1 day from now
  
  const header = {
    alg: algorithm,
    typ: 'JWT',
    ...(algorithm.startsWith('RS') || algorithm.startsWith('ES') ? { kid: Math.floor(Math.random() * 1000000).toString() } : {})
  };
  
  const payload = {
    sub: email,
    name: `${firstName} ${lastName}`,
    email: email,
    user_name: userName,
    sys_id: sysId,
    iat: iat,
    exp: exp,
    instance: `instance${Math.floor(Math.random() * 100)}.service-now.com`,
    instance_url: `https://instance${Math.floor(Math.random() * 100)}.service-now.com`
  };
  
  // Encode header and payload
  const base64UrlEncode = (str) => {
    const utf8 = encodeURIComponent(str)
      .replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16)));
    return btoa(utf8)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };
  
  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const message = `${headerEncoded}.${payloadEncoded}`;
  
  let signature;
  let keyForVerification = '';
  
  if (algorithm.startsWith('HS')) {
    // HMAC - generate random secret
    const secret = generateRandomSecret();
    keyForVerification = secret;
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const hashAlg = algorithm === 'HS256' ? 'SHA-256' : algorithm === 'HS384' ? 'SHA-384' : 'SHA-512';
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: hashAlg },
      false,
      ['sign']
    );
    
    const sigBytes = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
    signature = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } else if (algorithm.startsWith('RS')) {
    // RSA - generate key pair and sign
    const hashAlg = algorithm === 'RS256' ? 'SHA-256' : algorithm === 'RS384' ? 'SHA-384' : 'SHA-512';
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: hashAlg,
      },
      true,
      ['sign', 'verify']
    );
    
    // Sign with private key
    const encoder = new TextEncoder();
    const sigBytes = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      keyPair.privateKey,
      encoder.encode(message)
    );
    signature = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    // Export public key in SPKI format and convert to PEM
    const publicKeyData = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyData)));
    keyForVerification = `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;
  } else if (algorithm.startsWith('ES')) {
    // ECDSA - generate key pair and sign
    const hashAlg = algorithm === 'ES256' ? 'SHA-256' : algorithm === 'ES384' ? 'SHA-384' : 'SHA-512';
    const namedCurve = algorithm === 'ES256' ? 'P-256' : algorithm === 'ES384' ? 'P-384' : 'P-521';
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: namedCurve,
      },
      true,
      ['sign', 'verify']
    );
    
    // Sign with private key
    const encoder = new TextEncoder();
    const sigBytes = await crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: hashAlg,
      },
      keyPair.privateKey,
      encoder.encode(message)
    );
    signature = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    // Export public key in SPKI format and convert to PEM
    const publicKeyData = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyData)));
    keyForVerification = `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;
  }
  
  const token = `${message}.${signature}`;
  return { token, key: keyForVerification, algorithm };
};

const FEATURES = [
  { id: 'jwt', name: 'JWT Decoder', icon: ShieldCheck, category: 'Authentication', status: 'active', url: chrome.runtime?.getURL ? chrome.runtime.getURL('jwt.html') : 'jwt.html' },
  { id: 'saml', name: 'SAML Inspector', icon: Key, category: 'Authentication', status: 'active', url: chrome.runtime?.getURL ? chrome.runtime.getURL('saml.html') : 'saml.html' },
  { id: 'rest', name: 'REST API Tester', icon: Network, category: 'API Testing', status: 'active', url: chrome.runtime?.getURL ? chrome.runtime.getURL('rest.html') : 'rest.html' },
  { id: 'har', name: 'HAR Analyzer', icon: FileCode, category: 'Debugging', status: 'active', url: chrome.runtime?.getURL ? chrome.runtime.getURL('har-analyzer.html') : 'har-analyzer.html' },
  { id: 'json', name: 'JSON Utility', icon: FileJson, category: 'Utilities', status: 'active', url: chrome.runtime?.getURL ? chrome.runtime.getURL('json-utility.html') : 'json-utility.html' },
  // Browser Logs temporarily disabled - not ready for production
  // { id: 'logs', name: 'Browser Logs', icon: FileText, category: 'Debugging', status: 'active', url: chrome.runtime?.getURL ? chrome.runtime.getURL('logs.html') : 'logs.html' },
];

const copyText = async (text) => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Copy failed', err);
  }
};

const verifySignature = async (token, key, algorithm, keyFormat) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { verified: false, error: 'Invalid JWT format' };

    const header = JSON.parse(base64UrlDecode(parts[0]));
    const alg = header.alg || algorithm || 'RS256';

    if (alg.startsWith('HS')) {
      const encoder = new TextEncoder();
      const message = `${parts[0]}.${parts[1]}`;
      const keyData = encoder.encode(key);
      
      const hashAlg = alg === 'HS256' ? 'SHA-256' : alg === 'HS384' ? 'SHA-384' : 'SHA-512';
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: hashAlg },
        false,
        ['sign']
      );

      const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
      const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      const verified = signatureBase64 === parts[2];
      return { verified, error: verified ? null : 'Signature verification failed' };
    }

    let cryptoKey;
    if (keyFormat === 'JWK') {
      const jwk = typeof key === 'string' ? JSON.parse(key) : key;
      cryptoKey = await crypto.subtle.importKey(
        'jwk',
        jwk,
        {
          name: alg.startsWith('RS') ? 'RSASSA-PKCS1-v1_5' : 'ECDSA',
          hash: alg === 'RS256' || alg === 'ES256' ? 'SHA-256' : alg === 'RS384' || alg === 'ES384' ? 'SHA-384' : 'SHA-512',
        },
        false,
        ['verify']
      );
    } else {
      const cleanKey = key
        .replace(/-----BEGIN PUBLIC KEY-----/g, '')
        .replace(/-----END PUBLIC KEY-----/g, '')
        .replace(/-----BEGIN RSA PUBLIC KEY-----/g, '')
        .replace(/-----END RSA PUBLIC KEY-----/g, '')
        .replace(/\s+/g, '');

      const keyData = Uint8Array.from(atob(cleanKey), (c) => c.charCodeAt(0));

      if (alg.startsWith('RS')) {
        cryptoKey = await crypto.subtle.importKey(
          'spki',
          keyData.buffer,
          {
            name: 'RSASSA-PKCS1-v1_5',
            hash: alg === 'RS256' ? 'SHA-256' : alg === 'RS384' ? 'SHA-384' : 'SHA-512',
          },
          false,
          ['verify']
        );
      } else if (alg.startsWith('ES')) {
        cryptoKey = await crypto.subtle.importKey(
          'spki',
          keyData.buffer,
          {
            name: 'ECDSA',
            namedCurve: alg === 'ES256' ? 'P-256' : alg === 'ES384' ? 'P-384' : 'P-521',
          },
          false,
          ['verify']
        );
      } else {
        return { verified: false, error: `Algorithm ${alg} not supported for verification` };
      }
    }

    const message = `${parts[0]}.${parts[1]}`;
    const signatureBase64 = parts[2].replace(/-/g, '+').replace(/_/g, '/');
    const padLength = signatureBase64.length % 4 ? 4 - (signatureBase64.length % 4) : 0;
    const paddedSignature = signatureBase64 + '='.repeat(padLength);
    const signatureBytes = Uint8Array.from(atob(paddedSignature), (c) => c.charCodeAt(0));

    // For ECDSA, we need to pass the algorithm object with hash
    const verifyAlgorithm = alg.startsWith('RS') 
      ? 'RSASSA-PKCS1-v1_5'
      : {
          name: 'ECDSA',
          hash: alg === 'ES256' ? 'SHA-256' : alg === 'ES384' ? 'SHA-384' : 'SHA-512',
        };

    const verified = await crypto.subtle.verify(
      verifyAlgorithm,
      cryptoKey,
      signatureBytes,
      new TextEncoder().encode(message)
    );

    return { verified, error: verified ? null : 'Signature verification failed' };
  } catch (err) {
    return { verified: false, error: err.message || 'Verification error' };
  }
};

const useDecoded = (token) =>
  useMemo(() => {
    if (!token.trim()) {
      return {
        error: '',
        header: null,
        payload: null,
        signature: '',
        headerRaw: '',
        payloadRaw: '',
      };
    }
    const segments = token.split('.');
    if (segments.length !== 3) {
      return {
        error: 'A JWT must contain three dot-separated segments.',
        header: null,
        payload: null,
        signature: '',
        headerRaw: '',
        payloadRaw: '',
      };
    }
    try {
      const headerRaw = base64UrlDecode(segments[0]);
      const payloadRaw = base64UrlDecode(segments[1]);
      const signature = segments[2];
      const header = JSON.parse(headerRaw);
      const payload = jwtDecode(token);
      return { error: '', header, payload, signature, headerRaw, payloadRaw };
    } catch (err) {
      return {
        error: err.message || 'Unable to decode token.',
        header: null,
        payload: null,
        signature: segments[2] || '',
        headerRaw: '',
        payloadRaw: '',
      };
    }
  }, [token]);

const CodeSection = ({ title, content, description, onCopy, viewMode, onViewModeChange, theme, statusColor, isHeader = false, payload, targetClaims, getClaimInfo, companyClaimSet, currentCompany, currentTime, calculateTTL, editable, onContentChange, placeholder }) => {
  const [copied, setCopied] = useState(false);
  const lines = content ? content.split('\n') : ['—'];
  const parsedPayload = viewMode === 'table' && title?.startsWith('Payload:') ? (() => {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  })() : null;

  const borderColor = statusColor?.border || 'border-slate-200/80';
  const textColor = statusColor?.text || 'text-slate-900';

  const defaultBorder = 'border-slate-200/80';
  const defaultText = 'text-slate-900';
  const finalBorder = statusColor ? borderColor : defaultBorder;
  const finalText = statusColor ? textColor : defaultText;
  const dotColor = statusColor 
    ? (statusColor.text.includes('error') ? '#ef4444' : statusColor.text.includes('warning') ? '#f59e0b' : theme.primary)
    : theme.primary;

  const handleCopy = async () => {
    await onCopy(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Fixed height to prevent dynamic changes - Equal heights for Payload and Signature sections
  const contentHeight = title?.startsWith('Payload:') || title?.startsWith('Signature:') ? 'auto' : isHeader ? 'auto' : '280px';
  const isTableMode = viewMode === 'table' && parsedPayload && title?.startsWith('Payload:');

  return (
    <div className="border border-gray-200 rounded-xl bg-white flex flex-col overflow-hidden shadow-sm">
      <div className="flex items-center justify-between bg-gray-50 px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 lg:py-3.5 flex-shrink-0 border-b border-gray-200">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="h-1.5 sm:h-2 w-1.5 sm:w-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
          <div className="min-w-0 flex-1">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wide truncate">{title}</h3>
            {description && <p className="hidden sm:block text-xs text-gray-600 leading-tight mt-1">{description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {title?.startsWith('Payload:') && (
            <div className="flex items-center gap-0.5 bg-white p-0.5 border border-gray-300 rounded-md">
              <button
                onClick={() => onViewModeChange('json')}
                className={clsx('px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium transition-colors rounded', viewMode === 'json' ? 'bg-sky-500 text-white' : 'text-gray-700 hover:bg-gray-50')}
                tabIndex={0}
              >
                JSON
              </button>
              <button
                onClick={() => onViewModeChange('table')}
                className={clsx('px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium transition-colors rounded inline-flex items-center gap-1', viewMode === 'table' ? 'bg-sky-500 text-white' : 'text-gray-700 hover:bg-gray-50')}
                tabIndex={0}
              >
                <Table className="h-2.5 sm:h-3 w-2.5 sm:w-3" />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>
          )}
          <button
            onClick={handleCopy}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCopy();
              }
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
              e.currentTarget.style.backgroundColor = '#e2e8f0';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = '';
              e.currentTarget.style.backgroundColor = '';
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
              e.currentTarget.style.backgroundColor = '#e2e8f0';
            }}
            onTouchEnd={(e) => {
              setTimeout(() => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.backgroundColor = '';
              }, 150);
            }}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none border-[0.5px] border-gray-300 rounded-lg focus:outline-none shadow-sm',
              copied 
                ? 'bg-green-50 border-green-400 text-green-700' 
                : 'text-gray-700 hover:bg-gray-50 hover:border-gray-400 bg-white border-gray-300 hover:shadow'
            )}
            tabIndex={0}
          >
            {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>
      <div className={clsx('bg-white', isHeader || isTableMode ? 'overflow-visible' : 'overflow-auto')} style={isHeader || isTableMode || title?.startsWith('Signature:') ? {} : { height: contentHeight, maxHeight: contentHeight }}>
        {viewMode === 'table' && parsedPayload ? (
              <div className="p-3 sm:p-4 lg:p-5 w-full overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="px-3 sm:px-4 lg:px-5 py-2 sm:py-3 text-left font-semibold text-gray-900">Claim</th>
                  <th className="px-3 sm:px-4 lg:px-5 py-2 sm:py-3 text-left font-semibold text-gray-900">Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(parsedPayload).map(([key, value]) => (
                  <tr key={key} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-3 sm:px-4 lg:px-5 py-2 sm:py-3 font-mono text-gray-700 text-xs sm:text-sm">{key}</td>
                    <td className="px-3 sm:px-4 lg:px-5 py-2 sm:py-3 text-gray-900 text-xs sm:text-sm break-words">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : title?.startsWith('Signature:') || (editable && title?.startsWith('Verify Signature:')) ? (
          editable && title?.startsWith('Verify Signature:') ? (
            <div className="p-3 sm:p-4">
              <textarea
                value={content || ''}
                onChange={(e) => onContentChange?.(e.target.value)}
                placeholder={placeholder || ''}
                className="w-full h-full min-h-[180px] resize-none border-0 bg-transparent px-0 py-0 font-mono text-xs sm:text-sm leading-relaxed text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-sky-50/30"
                tabIndex={0}
              />
            </div>
          ) : (
            <div className="p-3 sm:p-4">
              <pre className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">
                <code className="font-mono text-gray-800">
                  {content || '—'}
                </code>
              </pre>
            </div>
          )
        ) : (
          <div className="flex bg-white" style={{ flex: '1 1 auto', minHeight: '100%' }}>
            {/* Line Numbers Banner - Left Side */}
            <div className="flex-shrink-0 bg-gray-50 border-r-2 border-gray-200 text-right pr-2 sm:pr-3 lg:pr-4 pl-2 sm:pl-3 lg:pl-4 py-3 sm:py-4 lg:py-5 flex flex-col" style={{ width: '45px', fontFamily: 'monospace', minHeight: '100%' }}>
              {lines.map((line, index) => (
                <div key={index} className="text-gray-400 text-[10px] sm:text-xs leading-relaxed select-none flex-shrink-0" style={{ minHeight: '18px' }}>
                  {index + 1}
                </div>
              ))}
            </div>
            
            {/* Content - Right Side */}
            <div className="flex-1 py-3 sm:py-4 lg:py-5 pl-3 sm:pl-4 lg:pl-6 pr-3 sm:pr-4 lg:pr-6 text-xs sm:text-sm leading-relaxed overflow-x-auto bg-white">
              <div className="font-mono text-gray-800">
                {lines.map((line, index) => {
                  // For Key Claims, check if this line contains a claim key
                  let claimInfo = null;
                  let hasCompanyBadge = false;
                  if (title?.startsWith('Key Claims:') && targetClaims && getClaimInfo && payload) {
                    // Try to extract claim name from line (e.g., "  \"sub\": ...")
                    const claimMatch = line.match(/^\s*"([^"]+)":\s*(.+)/);
                    if (claimMatch && targetClaims.includes(claimMatch[1])) {
                      const claimName = claimMatch[1];
                      claimInfo = getClaimInfo(claimName);
                      hasCompanyBadge = companyClaimSet?.has(claimName) || false;
                    }
                  }
                  
                  // For Key Claims with info, split line and show icon after value
                  if (title?.startsWith('Key Claims:') && claimInfo) {
                    const colonIndex = line.indexOf(':');
                    if (colonIndex !== -1) {
                      const keyPart = line.substring(0, colonIndex + 1);
                      const valuePart = line.substring(colonIndex + 1).trim();
                      return (
                        <div key={index} className="flex items-center gap-2" style={{ minHeight: '22.4px' }}>
                          <span className="text-slate-900 whitespace-pre">{keyPart}</span>
                          <span className="text-slate-900 whitespace-pre">{valuePart}</span>
                          {hasCompanyBadge && (
                            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold uppercase text-white flex-shrink-0" style={{ backgroundColor: theme.badgeBg }}>
                              {currentCompany === 'servicenow' ? 'SN' : 'SF'}
                            </span>
                          )}
                          <Tooltip
                            content={
                              <div className="max-w-sm">
                                <p className="font-semibold mb-1.5 text-sm text-white">{claimInfo.name}</p>
                                <p className="text-xs mb-2.5 text-slate-300 leading-relaxed">{claimInfo.description}</p>
                              </div>
                            }
                            position="left"
                          >
                            <Info className="h-3.5 w-3.5 text-sky-500 cursor-help flex-shrink-0" />
                          </Tooltip>
                        </div>
                      );
                    }
                  }
                  
                  return (
                    <div key={index} className="text-slate-900 whitespace-pre" style={{ minHeight: '22.4px' }}>
                      {line || ' '}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Tooltip = ({ children, content, position = 'top' }) => {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef(null);
  const triggerRef = useRef(null);

  const updatePosition = () => {
    if (triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      let top = 0;
      let left = 0;

      switch (position) {
        case 'right':
          top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
          left = triggerRect.right + 8;
          break;
        case 'left':
          top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
          left = triggerRect.left - tooltipRect.width - 8;
          break;
        case 'bottom':
          top = triggerRect.bottom + 8;
          left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
          break;
        default: // top
          top = triggerRect.top - tooltipRect.height - 8;
          left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
      }

      // Keep tooltip within viewport
      const padding = 8;
      if (left < padding) left = padding;
      if (left + tooltipRect.width > window.innerWidth - padding) {
        left = window.innerWidth - tooltipRect.width - padding;
      }
      if (top < padding) top = padding;
      if (top + tooltipRect.height > window.innerHeight - padding) {
        top = window.innerHeight - tooltipRect.height - padding;
      }

      setCoords({ top, left });
    }
  };

  useEffect(() => {
    if (show) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        updatePosition();
      });
      const handleResize = () => {
        requestAnimationFrame(() => {
          updatePosition();
        });
      };
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleResize, true);
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleResize, true);
      };
    }
  }, [show, position]);

  return (
    <>
      <div className="relative inline-block">
        <div ref={triggerRef} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} onFocus={() => setShow(true)} onBlur={() => setShow(false)} className="cursor-help" tabIndex={0}>
          {children}
        </div>
      </div>
      {show && (
        <>
          <div
            ref={tooltipRef}
            className="fixed z-[9999] w-64 max-w-[calc(100vw-2rem)] rounded-lg bg-gray-900 border border-gray-700 p-3 text-xs text-white shadow-2xl"
            style={{ top: `${coords.top}px`, left: `${coords.left}px`, pointerEvents: 'auto' }}
          >
            {content}
          </div>
        </>
      )}
    </>
  );
};

const JWTDecoder = () => {
  const [token, setToken] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [secret, setSecret] = useState('');
  const [keyFormat, setKeyFormat] = useState('PEM');
  const [keyFormatMenuOpen, setKeyFormatMenuOpen] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [payloadViewMode, setPayloadViewMode] = useState('json');
  const [selectedCompany, setSelectedCompany] = useState('servicenow');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);
  const [signatureCopied, setSignatureCopied] = useState(false);
  const [showSecurityPanel, setShowSecurityPanel] = useState(false);
  const [simulatedTime, setSimulatedTime] = useState(null); // For time simulation
  const [showTimeSimulation] = useState(true); // Always show panel, just control expansion
  const [showTimePanelExpanded, setShowTimePanelExpanded] = useState(false); // Collapsed by default
  const [showRedactionExpanded, setShowRedactionExpanded] = useState(false); // Collapsed by default
  const [showComparisonExpanded, setShowComparisonExpanded] = useState(false); // Collapsed by default
  const [showJWKSExpanded, setShowJWKSExpanded] = useState(false); // Collapsed by default

  const [jwksUrl, setJwksUrl] = useState('');
  const [jwks, setJwks] = useState(null);
  const [jwksLoading, setJwksLoading] = useState(false);
  const [jwksError, setJwksError] = useState(null);
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [showRedaction] = useState(true); // Always visible, controlled by expanded state
  const [redactedClaims, setRedactedClaims] = useState([]);
  const [redactedToken, setRedactedToken] = useState(null);
  const [showComparison] = useState(true); // Always visible, controlled by expanded state
  const [comparisonToken, setComparisonToken] = useState('');
  const [comparisonResult, setComparisonResult] = useState(null);
  const [exampleAlgorithm, setExampleAlgorithm] = useState('HS256');
  const [showExampleMenu, setShowExampleMenu] = useState(false);
  const companyMenuRef = useRef(null);
  const exampleMenuRef = useRef(null);
  const keyFormatMenuRef = useRef(null);
  const textareaRef = useRef(null);
  const tokenTextareaRef = useRef(null);
  const { error, header, payload, signature, headerRaw, payloadRaw } = useDecoded(token);
  const status = analyzeStatus(payload);
  
  // Security validation
  const currentTime = simulatedTime || Date.now();
  const securityValidation = useMemo(() => {
    if (!header || !payload) return null;
    return validateJWT(header, payload, signature, currentTime);
  }, [header, payload, signature, currentTime]);
  
  const riskLevel = useMemo(() => {
    if (!securityValidation) return null;
    return getRiskLevel(securityValidation.riskScore);
  }, [securityValidation]);
  
  const detectedCompany = useMemo(() => detectCompany(payload), [payload]);
  const currentCompany = selectedCompany || detectedCompany;
  const theme = COMPANY_THEMES[currentCompany];
  const companyHints = useMemo(() => getCompanyHints(payload, currentCompany), [payload, currentCompany]);
  const companyClaimSet = useMemo(() => getCompanyClaimSet(payload, currentCompany), [payload, currentCompany]);
  
  const StatusIcon = status.icon;
  const hasSignature = signature && signature.length > 0;
  const isHMAC = header?.alg?.startsWith('HS');

  // Auto-expand signature verification if signature detected
  useEffect(() => {
    if (hasSignature && !showVerification) {
      setShowVerification(true);
    }
  }, [hasSignature]);

  // Clear verification result when token changes
  useEffect(() => {
    setVerificationResult(null);
  }, [token]);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 400); // Max height 400px
      textarea.style.height = `${newHeight}px`;
    }
  }, [token]);


  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && companyMenuOpen) {
        setCompanyMenuOpen(false);
      }
      if (e.key === 'Escape' && showVerification) {
        setShowVerification(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [companyMenuOpen, showVerification]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (companyMenuRef.current && !companyMenuRef.current.contains(event.target)) {
        setCompanyMenuOpen(false);
      }
      if (exampleMenuRef.current && !exampleMenuRef.current.contains(event.target)) {
        setShowExampleMenu(false);
      }
      if (keyFormatMenuRef.current && !keyFormatMenuRef.current.contains(event.target)) {
        setKeyFormatMenuOpen(false);
      }
    };
    if (companyMenuOpen || showExampleMenu || keyFormatMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [companyMenuOpen, showExampleMenu, keyFormatMenuOpen]);

  const handleVerify = async () => {
    if (!token) return;
    setIsVerifying(true);
    const key = isHMAC ? secret : publicKey;
    const result = await verifySignature(token, key, header?.alg, keyFormat);
    setVerificationResult(result);
    setIsVerifying(false);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (keyFormat === 'JWK') {
        try {
          setPublicKey(JSON.stringify(JSON.parse(e.target.result), null, 2));
        } catch {
          setPublicKey(e.target.result);
        }
      } else {
        setPublicKey(e.target.result);
      }
    };
    reader.readAsText(file);
  };

  // JWKS handlers
  const handleFetchJWKS = async () => {
    if (!jwksUrl.trim()) return;
    
    setJwksLoading(true);
    setJwksError(null);
    
    // Check cache first
    const cached = getCachedJWKS(jwksUrl);
    if (cached) {
      setJwks(cached);
      setJwksLoading(false);
      return;
    }
    
    const result = await fetchJWKS(jwksUrl);
    if (result.success) {
      setJwks(result.jwks);
      setCachedJWKS(jwksUrl, result.jwks);
      
      // Auto-select key if token has kid in header
      if (header?.kid && result.keys.length > 0) {
        const matchingKey = findKeyByKid(result.jwks, header.kid);
        if (matchingKey) {
          setSelectedKeyId(header.kid);
        }
      }
    } else {
      setJwksError(result.error);
      setJwks(null);
    }
    setJwksLoading(false);
  };

  // Use selected JWK for verification
  useEffect(() => {
    if (jwks && selectedKeyId && !isHMAC) {
      const key = findKeyByKid(jwks, selectedKeyId);
      if (key) {
        setKeyFormat('JWK');
        setPublicKey(JSON.stringify(key, null, 2));
      }
    }
  }, [jwks, selectedKeyId, isHMAC]);

  // Auto-detect sensitive claims for redaction
  useEffect(() => {
    if (payload && showRedaction) {
      const sensitive = Object.keys(payload).filter(key => isSensitiveClaim(key));
      if (sensitive.length > 0 && redactedClaims.length === 0) {
        setRedactedClaims(sensitive);
      }
    }
  }, [payload, showRedaction]);

  // Redaction handlers
  const handleToggleRedaction = (claim) => {
    setRedactedClaims(prev => {
      if (prev.includes(claim)) {
        return prev.filter(c => c !== claim);
      } else {
        return [...prev, claim];
      }
    });
  };

  useEffect(() => {
    if (header && payload) {
      const redactedPayload = redactClaims(payload, redactedClaims);
      const redacted = generateRedactedJWT(header, redactedPayload, signature);
      setRedactedToken(redacted);
    }
  }, [header, payload, signature, redactedClaims]);

  // Comparison handler
  const handleCompareTokens = () => {
    if (!token || !comparisonToken) return;
    const result = compareTokens(token, comparisonToken);
    setComparisonResult(result);
  };

  // Get status-based colors for headers and borders (only show when there's an actual issue)
  const getStatusColor = (statusType) => {
    if (statusType === 'error') return { text: 'text-error', border: 'border-error/40' };
    if (statusType === 'warning') return { text: 'text-warning', border: 'border-warning/40' };
    return null; // Don't color success - use default
  };

  const overallStatus = useMemo(() => {
    if (error) return 'error';
    if (!payload) return null;
    // Only show error/warning if there's an actual problem
    if (status.tone === 'error') return 'error';
    if (verificationResult?.verified === false) return 'error';
    // Don't show warning for unverified - that's normal
    return null; // Default neutral styling
  }, [error, payload, status, verificationResult]);

  // Status banner items
  const statusItems = useMemo(() => {
    if (!payload) return [];
    const items = [];
    
    // Structure
    items.push({
      label: 'Structure',
      status: 'success',
      icon: CheckCircle2,
      message: 'Valid',
    });
    
    // Expiry
    items.push({
      label: 'Expiry',
      status: status.tone,
      icon: StatusIcon,
      message: status.message,
    });
    
    // Signature
    if (hasSignature) {
      if (verificationResult?.verified) {
        items.push({
          label: 'Signature',
          status: 'success',
          icon: CheckCircle2,
          message: 'Verified',
        });
      } else if (verificationResult?.verified === false) {
        items.push({
          label: 'Signature',
          status: 'error',
          icon: X,
          message: 'Invalid',
        });
      } else {
        items.push({
          label: 'Signature',
          status: 'warning',
          icon: AlertCircle,
          message: 'Not verified',
        });
      }
    } else {
      items.push({
        label: 'Signature',
        status: 'warning',
        icon: AlertCircle,
        message: 'Missing',
      });
    }
    
    return items;
  }, [payload, status, hasSignature, verificationResult]);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <Navigation currentPageId="jwt" sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto bg-gray-50" style={{ width: '100%', minWidth: 0 }} >
        <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-10">
          <div className="space-y-4 sm:space-y-6">
          {/* Professional Header with Border */}
          <header className="bg-white border border-gray-300 rounded-xl shadow-sm px-4 sm:px-6 lg:px-8 py-4 sm:py-6 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-1 sm:space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">JWT Debugger</h1>
                <p className="text-sm sm:text-base text-gray-600">
                  Decode, verify, and inspect JSON Web Tokens
                </p>
              </div>
              <div className="relative" ref={companyMenuRef}>
                <button
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-all border-[0.5px] border-gray-300 rounded-lg hover:border-gray-500 hover:bg-gray-50 focus:outline-none focus:outline-none"
                  onClick={() => setCompanyMenuOpen(!companyMenuOpen)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setCompanyMenuOpen(!companyMenuOpen);
                    }
                  }}
                  tabIndex={0}
                  aria-label="Select company"
                  aria-expanded={companyMenuOpen}
                >
                  <span className="whitespace-nowrap">{theme.name}</span>
                  <ChevronDown className={clsx('h-4 w-4 text-gray-500 transition-transform duration-200', companyMenuOpen && 'rotate-180')} />
                </button>
                {companyMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setCompanyMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                      <button
                        onClick={() => {
                          setSelectedCompany('servicenow');
                          setCompanyMenuOpen(false);
                        }}
                        className={clsx('w-full px-4 py-2.5 text-left text-sm transition-colors border-b border-gray-100 last:border-b-0 focus:outline-none', currentCompany === 'servicenow' ? 'bg-sky-50 text-sky-700 font-semibold' : 'text-gray-700 hover:bg-gray-50')}
                        tabIndex={0}
                      >
                        ServiceNow
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCompany('salesforce');
                          setCompanyMenuOpen(false);
                        }}
                        className={clsx('w-full px-4 py-2.5 text-left text-sm transition-colors border-b border-gray-100 last:border-b-0 focus:outline-none', currentCompany === 'salesforce' ? 'bg-sky-50 text-sky-700 font-semibold' : 'text-gray-700 hover:bg-gray-50')}
                        tabIndex={0}
                      >
                        Salesforce
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Token Input Section - No Box Around Header */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <label htmlFor="token-input" className="text-sm sm:text-base font-semibold text-gray-900">
                JSON Web Token (JWT)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowExampleMenu(!showExampleMenu)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setShowExampleMenu(!showExampleMenu);
                        }
                      }}
                      className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border-[0.5px] border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-500 focus:outline-none focus:outline-none transition-all shadow-sm hover:shadow inline-flex items-center gap-2"
                      tabIndex={0}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Generate example ({exampleAlgorithm})
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    {showExampleMenu && (
                      <div className="absolute right-0 top-full mt-2 w-40 border border-gray-200 rounded-lg bg-white shadow-lg z-50 overflow-y-auto max-h-64">
                        {['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512'].map((alg) => (
                          <button
                            key={alg}
                            onClick={async () => {
                              setExampleAlgorithm(alg);
                              setShowExampleMenu(false);
                              const { token, key, algorithm } = await generateJWTExample(alg);
                              setToken(token);
                              // Auto-fill the verification key
                              if (algorithm.startsWith('HS')) {
                                setSecret(key);
                                setPublicKey('');
                              } else {
                                setPublicKey(key);
                                setSecret('');
                                setKeyFormat('PEM');
                              }
                              // Show verification panel
                              if (!showVerification) {
                                setShowVerification(true);
                              }
                            }}
                            className={clsx(
                              'w-full px-3 py-2 text-left text-sm transition-colors active:scale-[0.98] focus:outline-none',
                              exampleAlgorithm === alg 
                                ? 'bg-slate-100 font-medium text-slate-900' 
                                : 'text-slate-700 hover:bg-slate-50'
                            )}
                            tabIndex={0}
                          >
                            {alg}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => copyText(token)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        copyText(token);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 bg-white border-[0.5px] border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-500 focus:outline-none focus:outline-none transition-all shadow-sm hover:shadow"
                    tabIndex={0}
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </button>
                  <button
                    onClick={() => setToken('')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setToken('');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-gray-700 bg-white border-[0.5px] border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-500 focus:outline-none focus:outline-none transition-all shadow-sm hover:shadow"
                    tabIndex={0}
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear
                  </button>
                </div>
              </div>
            </div>
            {/* Token Value Box - Border on textarea only */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                id="token-input"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  e.target.style.height = 'auto';
                  const newHeight = Math.min(e.target.scrollHeight, 400);
                  e.target.style.height = `${newHeight}px`;
                }}
                placeholder="Paste a JWT token here..."
                className="min-h-[100px] sm:min-h-[120px] max-h-[300px] sm:max-h-[400px] w-full resize-none border-[0.5px] border-gray-300 rounded-xl bg-white px-3 sm:px-5 py-3 sm:py-4 font-mono text-xs sm:text-sm leading-relaxed text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-sky-400/60 overflow-y-auto shadow-sm"
                style={{ color: 'transparent', caretColor: '#111827', height: 'auto' }}
                tabIndex={0}
              />
              {token && (
                <div className="absolute inset-0 pointer-events-none px-3 sm:px-5 py-3 sm:py-4 font-mono text-xs sm:text-sm leading-relaxed overflow-hidden rounded-xl" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <pre className="whitespace-pre-wrap break-all">
                    {(() => {
                      const parts = token.split('.');
                      if (parts.length !== 3) return <span className="text-gray-900">{token}</span>;
                      return (
                        <>
                          <span className="text-sky-600">{parts[0]}</span>
                          <span className="text-gray-400">.</span>
                          <span className="text-purple-600">{parts[1]}</span>
                          <span className="text-gray-400">.</span>
                          <span className="text-green-600">{parts[2]}</span>
                        </>
                      );
                    })()}
                  </pre>
                </div>
              )}
            </div>
            {error && (
              <div className="mt-4 flex items-center gap-3 text-sm text-red-700 bg-red-50 border border-red-200 px-5 py-3 rounded-lg">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}
            {!error && payload && (
              <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 lg:gap-6 text-xs sm:text-sm flex-wrap bg-green-50 border border-green-200 px-3 sm:px-5 py-2.5 sm:py-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="font-medium text-gray-900">Valid JWT</span>
                </div>
                {statusItems.map((item, index) => {
                  const ItemIcon = item.icon;
                  const itemStyles = toneStyles[item.status];
                  return (
                    <React.Fragment key={item.label}>
                      {index > 0 && <span className="hidden sm:inline text-gray-300 mx-2">·</span>}
                      <div className="flex items-center gap-2">
                        <ItemIcon className={clsx('h-3.5 sm:h-4 w-3.5 sm:w-4 flex-shrink-0', itemStyles.text)} />
                        <span className={clsx('font-medium', itemStyles.text)}>
                          <span className="hidden sm:inline">{item.label}: </span><span className="text-gray-600">{item.message}</span>
                        </span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
          
          {payload && (
            <>
              {/* Security Validation Panel */}
              {securityValidation && securityValidation.issues.length > 0 && (
                <div className="mb-4 sm:mb-6 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div 
                    className="flex items-start sm:items-center justify-between bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setShowSecurityPanel(!showSecurityPanel)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <ShieldCheck className="h-4 sm:h-5 w-4 sm:w-5 text-slate-600 flex-shrink-0" />
                        <span className="text-sm sm:text-base font-semibold text-slate-900">Security Analysis</span>
                        <span className={clsx('px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0', riskLevel?.bg, riskLevel?.color)}>
                          {securityValidation.issues.length} {securityValidation.issues.length === 1 ? 'Issue' : 'Issues'}
                        </span>
                      </div>
                      {!showSecurityPanel && (
                        <span className="text-xs text-slate-500">
                          • {securityValidation.issues.filter(i => i.severity === SECURITY_SEVERITY.CRITICAL).length > 0 && `${securityValidation.issues.filter(i => i.severity === SECURITY_SEVERITY.CRITICAL).length} Critical`}
                          {securityValidation.issues.filter(i => i.severity === SECURITY_SEVERITY.HIGH).length > 0 && `, ${securityValidation.issues.filter(i => i.severity === SECURITY_SEVERITY.HIGH).length} High`}
                          {securityValidation.issues.filter(i => i.severity === SECURITY_SEVERITY.MEDIUM).length > 0 && `, ${securityValidation.issues.filter(i => i.severity === SECURITY_SEVERITY.MEDIUM).length} Medium`}
                          • {riskLevel?.level} Risk ({securityValidation.riskScore}/100)
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSecurityPanel(!showSecurityPanel);
                      }}
                      className="p-1 text-gray-500 hover:text-gray-700 transition-colors focus:outline-none"
                      tabIndex={0}
                    >
                      {showSecurityPanel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                  {showSecurityPanel && (
                  <div className="p-6 space-y-4 bg-white">
                    {securityValidation.issues.map((issue, index) => {
                      const severityColors = {
                        [SECURITY_SEVERITY.CRITICAL]: { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: X },
                        [SECURITY_SEVERITY.HIGH]: { text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: AlertCircle },
                        [SECURITY_SEVERITY.MEDIUM]: { text: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: AlertCircle },
                        [SECURITY_SEVERITY.LOW]: { text: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200', icon: Info },
                        [SECURITY_SEVERITY.INFO]: { text: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200', icon: Info },
                      };
                      const colors = severityColors[issue.severity] || severityColors[SECURITY_SEVERITY.INFO];
                      const IssueIcon = colors.icon;
                      
                      return (
                        <div key={index} className={clsx('rounded p-3', colors.bg)}>
                          <div className="flex items-start gap-3">
                            <IssueIcon className={clsx('h-4 w-4 mt-0.5 flex-shrink-0', colors.text)} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={clsx('font-medium text-sm', colors.text)}>{issue.title}</span>
                                <span className={clsx('text-xs font-medium px-2 py-0.5 rounded uppercase', colors.bg, colors.text, colors.border, 'border')}>
                                  {issue.severity}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 mb-2">{issue.message}</p>
                              {issue.recommendation && (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <p className="text-xs font-medium text-gray-600 mb-1">Recommendation:</p>
                                  <p className="text-xs text-gray-700">{issue.recommendation}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  )}
                </div>
              )}
              
              {/* Two Column Layout: Token Structure | Signature + Verification */}
              <div className={clsx('grid gap-4 sm:gap-6 mb-4 sm:mb-6 items-stretch', hasSignature ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1')}>
                {/* Left Column: Unified Token Structure */}
                <div className={clsx('flex flex-col h-full', !hasSignature && 'lg:col-span-1')}>
                  <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden flex flex-col flex-1">
                  {/* Main Header */}
                  <div className="flex items-center justify-between bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900">JWT Token Structure</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5 bg-white p-0.5 border border-gray-300 rounded-md">
                        <button
                          onClick={() => setPayloadViewMode('json')}
                          className={clsx('px-2 py-1 text-xs font-medium transition-colors rounded', payloadViewMode === 'json' ? 'bg-sky-500 text-white' : 'text-gray-700 hover:bg-gray-50')}
                          tabIndex={0}
                        >
                          JSON
                        </button>
                        <button
                          onClick={() => setPayloadViewMode('table')}
                          className={clsx('px-2 py-1 text-xs font-medium transition-colors rounded inline-flex items-center gap-1', payloadViewMode === 'table' ? 'bg-sky-500 text-white' : 'text-gray-700 hover:bg-gray-50')}
                          tabIndex={0}
                        >
                          <Table className="h-3 w-3" />
                          <span className="hidden sm:inline">Table</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 py-3 sm:py-4 lg:py-5 px-4 sm:px-5 lg:px-6 text-xs sm:text-sm leading-relaxed bg-white space-y-4 overflow-y-auto min-h-0">
                      {/* Header Sub-section */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: theme.primary }} />
                            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wide">Header</h4>
                          </div>
                          <button
                            onClick={async () => {
                              await copyText(pretty(headerRaw));
                            }}
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold transition-all focus:outline-none border-[0.5px] border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-500 focus:outline-none shadow-sm"
                            tabIndex={0}
                          >
                            <Copy className="h-3 w-3" />
                            <span className="hidden sm:inline">Copy</span>
                          </button>
                        </div>
                        <div className="font-mono text-gray-800 whitespace-pre-wrap break-words">
                          {pretty(headerRaw)}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-gray-200 my-4" />

                      {/* Payload Sub-section */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: theme.primary }} />
                            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wide">Payload</h4>
                          </div>
                          <button
                            onClick={async () => {
                              await copyText(pretty(payloadRaw));
                            }}
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold transition-all focus:outline-none border-[0.5px] border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-500 focus:outline-none shadow-sm"
                            tabIndex={0}
                          >
                            <Copy className="h-3 w-3" />
                            <span className="hidden sm:inline">Copy</span>
                          </button>
                        </div>
                        {payloadViewMode === 'table' && payload ? (
                          <div className="w-full overflow-x-auto">
                            <table className="w-full text-xs sm:text-sm border-collapse">
                              <thead>
                                <tr className="border-b-2 border-gray-200">
                                  <th className="px-3 sm:px-4 py-2 text-left font-semibold text-gray-900">Claim</th>
                                  <th className="px-3 sm:px-4 py-2 text-left font-semibold text-gray-900">Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(payload).map(([key, value]) => {
                                  const claimInfo = targetClaims.includes(key) ? getClaimInfo(key) : null;
                                  const hasCompanyBadge = companyClaimSet?.has(key) || false;
                                  const isTimeClaim = key === 'iat' || key === 'exp' || key === 'nbf';
                                  const displayValue = isTimeClaim ? formatRelativeTime(value, currentTime) : (typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value));
                                  
                                  return (
                                    <tr key={key} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                      <td className="px-3 sm:px-4 py-2 font-mono text-gray-700 text-xs sm:text-sm">
                                        <div className="flex items-center gap-1.5">
                                          <span>{key}</span>
                                          {hasCompanyBadge && (
                                            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white flex-shrink-0" style={{ backgroundColor: theme.badgeBg }}>
                                              {currentCompany === 'servicenow' ? 'SN' : 'SF'}
                                            </span>
                                          )}
                                          {claimInfo && (
                                            <Tooltip
                                              content={
                                                <div className="max-w-sm">
                                                  <p className="font-semibold mb-1.5 text-sm text-white">{claimInfo.name}</p>
                                                  <p className="text-xs text-gray-300 leading-relaxed mb-2">{claimInfo.description}</p>
                                                  {claimInfo.example && (
                                                    <div className="mt-2 pt-2 border-t border-gray-600">
                                                      <p className="text-xs text-gray-400 mb-1">Example:</p>
                                                      <code className="text-xs text-gray-300 font-mono">{claimInfo.example}</code>
                                                    </div>
                                                  )}
                                                </div>
                                              }
                                              position="right"
                                            >
                                              <Info className="h-3.5 w-3.5 text-gray-500 hover:text-sky-600 cursor-help flex-shrink-0 transition-colors" />
                                            </Tooltip>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-3 sm:px-4 py-2 text-gray-900 text-xs sm:text-sm break-words">{displayValue}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="font-mono text-gray-800 whitespace-pre-wrap break-words">
                            {pretty(payloadRaw).split('\n').map((line, index) => {
                              const claimMatch = line.match(/^\s*"([^"]+)":\s*(.+)/);
                              let claimInfo = null;
                              let hasCompanyBadge = false;
                              if (claimMatch && targetClaims.includes(claimMatch[1])) {
                                const claimName = claimMatch[1];
                                claimInfo = getClaimInfo(claimName);
                                hasCompanyBadge = companyClaimSet?.has(claimName) || false;
                              }
                              
                              if (claimInfo || hasCompanyBadge) {
                                const colonIndex = line.indexOf(':');
                                if (colonIndex !== -1) {
                                  const keyPart = line.substring(0, colonIndex + 1);
                                  const valuePart = line.substring(colonIndex + 1).trim();
                                  return (
                                    <div key={index} className="flex items-center gap-2" style={{ minHeight: '18px' }}>
                                      <span className="text-gray-900 whitespace-pre">{keyPart}</span>
                                      <span className="text-gray-900 whitespace-pre">{valuePart}</span>
                                      {hasCompanyBadge && (
                                        <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white flex-shrink-0" style={{ backgroundColor: theme.badgeBg }}>
                                          {currentCompany === 'servicenow' ? 'SN' : 'SF'}
                                        </span>
                                      )}
                                      {claimInfo && (
                                        <Tooltip
                                          content={
                                            <div className="max-w-sm">
                                              <p className="font-semibold mb-1.5 text-sm text-white">{claimInfo.name}</p>
                                              <p className="text-xs text-gray-300 leading-relaxed mb-2">{claimInfo.description}</p>
                                              {claimInfo.example && (
                                                <div className="mt-2 pt-2 border-t border-gray-600">
                                                  <p className="text-xs text-gray-400 mb-1">Example:</p>
                                                  <code className="text-xs text-gray-300 font-mono">{claimInfo.example}</code>
                                                </div>
                                              )}
                                            </div>
                                          }
                                          position="right"
                                        >
                                          <Info className="h-3.5 w-3.5 text-gray-500 hover:text-sky-600 cursor-help flex-shrink-0 transition-colors" />
                                        </Tooltip>
                                      )}
                                    </div>
                                  );
                                }
                              }
                              return <div key={index} style={{ minHeight: '18px' }}>{line}</div>;
                            })}
                          </div>
                        )}
                      </div>
                  </div>
                  </div>
                </div>

                {/* Right Column: Signature + Verification */}
                {hasSignature && (
                  <div className="flex flex-col h-full">
                    {/* Signature - Compact */}
                    <div className="flex-shrink-0">
                      <CodeSection
                        title="Signature: Cryptographic Signature"
                        content={signature}
                        description=""
                        onCopy={copyText}
                        viewMode="json"
                        theme={theme}
                        statusColor={verificationResult?.verified === false ? getStatusColor('error') : null}
                        isHeader={true}
                      />
                    </div>
                    
                    {/* Signature Verification - Using CodeSection Pattern */}
                    <div className="mt-4 sm:mt-6 flex flex-col flex-1 min-h-0 border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
                      <div className="flex-1 min-h-0 [&>div]:border-0 [&>div]:rounded-none [&>div]:shadow-none">
                        <CodeSection
                          title={`Verify Signature: ${isHMAC ? 'Secret Key' : 'Public Key'}`}
                          content={isHMAC ? secret : publicKey || ''}
                          description=""
                          onCopy={copyText}
                          viewMode="json"
                          theme={theme}
                          statusColor={verificationResult?.verified === false ? getStatusColor('error') : verificationResult?.verified === true ? null : null}
                          isHeader={true}
                          editable={true}
                          onContentChange={(value) => {
                            if (isHMAC) {
                              setSecret(value);
                            } else {
                              setPublicKey(value);
                            }
                            setVerificationResult(null);
                          }}
                          placeholder={isHMAC ? 'Enter the secret used to sign the JWT' : keyFormat === 'PEM' ? '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...\n-----END PUBLIC KEY-----' : '{\n  "kty": "RSA",\n  "n": "...",\n  "e": "AQAB"\n}'}
                        />
                      </div>
                      {/* Bottom Banner with Options - Attached */}
                      <div className="flex items-center justify-between bg-gray-50 border-t border-gray-200 px-3 sm:px-4 py-2 sm:py-2.5">
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                          <label className="text-xs sm:text-sm font-medium text-gray-700">
                            {isHMAC ? 'Secret' : 'Public Key'} Format
                          </label>
                          {!isHMAC && (
                            <div className="relative" ref={keyFormatMenuRef}>
                              <button
                                type="button"
                                onClick={() => setKeyFormatMenuOpen(!keyFormatMenuOpen)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border-[0.5px] border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-500 focus:outline-none transition-all shadow-sm"
                                tabIndex={0}
                              >
                                <span>{keyFormat}</span>
                                <ChevronDown className={clsx('h-3.5 w-3.5 text-gray-500 transition-transform duration-200', keyFormatMenuOpen && 'rotate-180')} />
                              </button>
                              {keyFormatMenuOpen && (
                                <>
                                  <div className="fixed inset-0 z-[49]" onClick={() => setKeyFormatMenuOpen(false)} />
                                  <div className="absolute left-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-xl z-[100] overflow-hidden">
                                    <button
                                      onClick={() => {
                                        setKeyFormat('PEM');
                                        setPublicKey('');
                                        setVerificationResult(null);
                                        setKeyFormatMenuOpen(false);
                                      }}
                                      className={clsx('w-full px-3 py-2 text-left text-xs sm:text-sm transition-colors focus:outline-none border-b border-gray-100 last:border-b-0', keyFormat === 'PEM' ? 'bg-sky-50 text-sky-600 font-medium' : 'text-gray-700 hover:bg-gray-50')}
                                      tabIndex={0}
                                    >
                                      PEM
                                    </button>
                                    <button
                                      onClick={() => {
                                        setKeyFormat('JWK');
                                        setPublicKey('');
                                        setVerificationResult(null);
                                        setKeyFormatMenuOpen(false);
                                      }}
                                      className={clsx('w-full px-3 py-2 text-left text-xs sm:text-sm transition-colors focus:outline-none border-b border-gray-100 last:border-b-0', keyFormat === 'JWK' ? 'bg-sky-50 text-sky-600 font-medium' : 'text-gray-700 hover:bg-gray-50')}
                                      tabIndex={0}
                                    >
                                      JWK
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                          {!isHMAC && (
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border-[0.5px] border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-500 cursor-pointer transition-all focus-within:outline-none shadow-sm">
                              <Upload className="h-3.5 w-3.5" />
                              Upload
                              <input type="file" accept=".pem,.key,.crt,.pub,.json" onChange={handleFileUpload} className="hidden" tabIndex={0} />
                            </label>
                          )}
                          {(publicKey || secret) && (
                            <button
                              onClick={() => {
                                setPublicKey('');
                                setSecret('');
                                setVerificationResult(null);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border-[0.5px] border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-500 focus:outline-none transition-all shadow-sm hover:shadow"
                              tabIndex={0}
                            >
                              <X className="h-3.5 w-3.5" />
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {verificationResult && (
                            <div className={clsx('flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded text-xs font-medium flex-shrink-0', verificationResult.verified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                              {verificationResult.verified ? <CheckCircle2 className="h-3 sm:h-3.5 w-3 sm:w-3.5" /> : <X className="h-3 sm:h-3.5 w-3 sm:w-3.5" />}
                              <span className="hidden sm:inline">{verificationResult.verified ? 'Verified' : 'Failed'}</span>
                            </div>
                          )}
                          <button
                            onClick={handleVerify}
                            disabled={!token || (!isHMAC && !publicKey) || (isHMAC && !secret) || isVerifying}
                            className="px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-lg transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 shadow-sm hover:shadow"
                            tabIndex={0}
                          >
                            {isVerifying ? 'Verifying...' : 'Verify Signature'}
                          </button>
                        </div>
                      </div>
                      {verificationResult && !verificationResult.verified && (
                        <div className="mt-2 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-red-700 font-medium">
                            <X className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{verificationResult.error || 'Signature verification failed'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
              )}
              </div>

              {/* JWKS Panel */}
              {!isHMAC && (
                <div className="mb-4 sm:mb-6 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div 
                    className="flex items-center justify-between bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setShowJWKSExpanded(!showJWKSExpanded)}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Key className="h-4 sm:h-5 w-4 sm:w-5 text-gray-600 flex-shrink-0" />
                      <span className="text-sm sm:text-base font-semibold text-gray-900">JWKS (JSON Web Key Set)</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowJWKSExpanded(!showJWKSExpanded);
                      }}
                      className="p-1 text-gray-500 hover:text-gray-700 transition-colors focus:outline-none"
                      tabIndex={0}
                    >
                      {showJWKSExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                  {showJWKSExpanded && (
                    <div className="p-4 sm:px-6 sm:py-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={jwksUrl}
                        onChange={(e) => setJwksUrl(e.target.value)}
                        placeholder="https://example.com/.well-known/jwks.json"
                          className="flex-1 border-[0.5px] border-gray-300 rounded-lg bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-sky-400/60"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleFetchJWKS();
                          }
                        }}
                      />
                      <button
                        onClick={handleFetchJWKS}
                        disabled={jwksLoading || !jwksUrl.trim()}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-lg transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 shadow-sm hover:shadow"
                      >
                        {jwksLoading ? (
                          <>
                            <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4" />
                            Fetch
                          </>
                        )}
                      </button>
                    </div>
                    {jwksError && (
                      <div className="bg-red-50 border border-red-200 px-4 py-3 rounded-lg text-sm text-red-700 font-medium">
                        {jwksError}
                      </div>
                    )}
                    {jwks && jwks.keys && jwks.keys.length > 0 && (
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-700">Select Key:</label>
                        <select
                          value={selectedKeyId}
                          onChange={(e) => setSelectedKeyId(e.target.value)}
                          className="w-full border-[0.5px] border-gray-300 rounded-lg bg-white px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-sky-400/60 cursor-pointer hover:bg-gray-50"
                        >
                          <option value="">-- Select a key --</option>
                          {jwks.keys.map((key, index) => (
                            <option key={index} value={key.kid || index}>
                              {key.kid || `Key ${index + 1}`} ({key.alg || 'N/A'})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500">
                          Found {jwks.keys.length} key(s). {selectedKeyId ? 'Key selected for verification.' : 'Select a key to use for verification.'}
                        </p>
                      </div>
                    )}
                    </div>
                  )}
                </div>
              )}

              {/* Time Simulation Panel */}
              {showTimeSimulation && (
                <div className="mb-4 sm:mb-6 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div 
                    className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setShowTimePanelExpanded(!showTimePanelExpanded)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Clock className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">Time Simulation</span>
                      {!showTimePanelExpanded && (
                        <span className="text-xs text-gray-500 ml-2">
                          {simulatedTime ? `Simulated: ${new Date(simulatedTime).toLocaleString()}` : 'Real time'}
                          {payload?.exp && ` • Token ${payload.exp * 1000 < currentTime ? 'expired' : 'valid'}`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTimePanelExpanded(!showTimePanelExpanded);
                      }}
                        className="p-1 text-gray-500 hover:text-gray-700 transition-colors focus:outline-none"
                        tabIndex={0}
                      >
                        {showTimePanelExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {showTimePanelExpanded && (
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-4 flex-wrap">
                      <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Current Time:</label>
                      <input
                        type="datetime-local"
                        value={simulatedTime ? new Date(simulatedTime).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)}
                        onChange={(e) => {
                          const time = new Date(e.target.value).getTime();
                          setSimulatedTime(time);
                        }}
                        className="border-[0.5px] border-gray-300 rounded bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-sky-400/60"
                      />
                      <button
                        onClick={() => {
                          const now = Date.now();
                          const hoursOffset = prompt('Fast-forward hours (negative to go back):', '0');
                          if (hoursOffset !== null && !isNaN(parseFloat(hoursOffset))) {
                            setSimulatedTime(now + (parseFloat(hoursOffset) * 60 * 60 * 1000));
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 transition-colors focus:outline-none"
                      >
                        Fast Forward
                      </button>
                      <button
                        onClick={() => setSimulatedTime(null)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 transition-colors focus:outline-none"
                      >
                        Reset
                      </button>
                    </div>
                    {payload?.exp && (
                      <div className="pt-3 border-t border-gray-100">
                        <p className="text-sm">
                          <span className="text-gray-600">Token </span>
                          <span className={clsx('font-semibold', payload.exp * 1000 < currentTime ? 'text-red-600' : 'text-green-600')}>
                            {payload.exp * 1000 < currentTime ? 'expired' : 'valid'}
                          </span>
                          <span className="text-gray-600"> at simulated time</span>
                        </p>
                      </div>
                    )}
                  </div>
                  )}
                </div>
              )}

              {/* Redaction Panel */}
              {showRedaction && payload && (
                <div className="mb-4 sm:mb-6 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div 
                    className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setShowRedactionExpanded(!showRedactionExpanded)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Lock className="h-5 w-5 text-slate-600" />
                      <span className="text-base font-semibold text-slate-900">Redact Sensitive Claims</span>
                      {!showRedactionExpanded && (
                        <span className="text-xs text-slate-500 ml-2">
                          • {redactedClaims.length} claim{redactedClaims.length !== 1 ? 's' : ''} selected{redactedToken ? ' • Redacted token ready' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowRedactionExpanded(!showRedactionExpanded);
                        }}
                        className="p-1.5 hover:bg-slate-200 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-slate-300"
                        tabIndex={0}
                      >
                        {showRedactionExpanded ? <ChevronUp className="h-4 w-4 text-slate-600" /> : <ChevronDown className="h-4 w-4 text-slate-600" />}
                      </button>
                    </div>
                  </div>
                  {showRedactionExpanded && (
                  <div className="p-6 space-y-5">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">Select claims to redact:</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                        {Object.keys(payload).map((claim) => (
                          <label key={claim} className="flex items-center gap-2 p-2 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={redactedClaims.includes(claim)}
                              onChange={() => handleToggleRedaction(claim)}
                              className="rounded"
                            />
                            <span className={clsx('text-sm', isSensitiveClaim(claim) ? 'font-semibold text-red-700' : 'text-slate-700')}>
                              {claim}
                              {isSensitiveClaim(claim) && <span className="ml-1 text-xs text-red-500">(sensitive)</span>}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {redactedToken && (
                      <div className="pt-3 border-t border-gray-100">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Redacted Token:</label>
                        <textarea
                          value={redactedToken}
                          readOnly
                          className="w-full h-24 resize-none border-[0.5px] border-gray-300 rounded bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700 focus:outline-none focus:border-sky-400/60"
                        />
                        <button
                          onClick={() => copyText(redactedToken)}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 transition-colors focus:outline-none"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy Redacted Token
                        </button>
                      </div>
                    )}
                  </div>
                  )}
                </div>
              )}

              {/* Comparison Panel */}
              {showComparison && (
                <div className="mb-4 sm:mb-6 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div 
                    className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setShowComparisonExpanded(!showComparisonExpanded)}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <GitCompare className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">Compare Tokens</span>
                      {!showComparisonExpanded && (
                        <span className="text-xs text-gray-500 ml-2">
                          {comparisonResult 
                            ? `${comparisonResult.summary.headerChanges + comparisonResult.summary.payloadChanges} difference${comparisonResult.summary.headerChanges + comparisonResult.summary.payloadChanges !== 1 ? 's' : ''}`
                            : 'Paste second token to compare'}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowComparisonExpanded(!showComparisonExpanded);
                      }}
                      className="p-1 text-gray-500 hover:text-gray-700 transition-colors focus:outline-none"
                      tabIndex={0}
                    >
                      {showComparisonExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                  {showComparisonExpanded && (
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Second Token:</label>
                      <textarea
                        value={comparisonToken}
                        onChange={(e) => setComparisonToken(e.target.value)}
                        placeholder="Paste the second JWT token to compare"
                        className="w-full h-32 resize-none border-[0.5px] border-gray-300 rounded bg-white px-3 py-2 font-mono text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-sky-400/60"
                      />
                    </div>
                    <button
                      onClick={handleCompareTokens}
                      disabled={!token || !comparisonToken}
                              className="px-4 py-2 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1"
                    >
                      Compare Tokens
                    </button>
                    {comparisonResult && (
                      <div className="pt-3 border-t border-gray-100 space-y-3">
                        <div className="bg-gray-50 px-3 py-2 rounded">
                          <p className="text-sm font-medium text-gray-900 mb-1">Summary:</p>
                          <p className="text-sm text-gray-700">{comparisonResult ? getDiffSummary(comparisonResult) : ''}</p>
                        </div>
                        {comparisonResult.valid && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900 mb-2">Header Changes:</p>
                              <div className="space-y-1 text-xs">
                                {comparisonResult.headerDiff.added.length > 0 && (
                                  <div className="text-green-700">+ {comparisonResult.headerDiff.added.length} added</div>
                                )}
                                {comparisonResult.headerDiff.removed.length > 0 && (
                                  <div className="text-red-700">- {comparisonResult.headerDiff.removed.length} removed</div>
                                )}
                                {comparisonResult.headerDiff.changed.length > 0 && (
                                  <div className="text-yellow-700">~ {comparisonResult.headerDiff.changed.length} changed</div>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 mb-2">Payload Changes:</p>
                              <div className="space-y-1 text-xs">
                                {comparisonResult.payloadDiff.added.length > 0 && (
                                  <div className="text-green-700">+ {comparisonResult.payloadDiff.added.length} added</div>
                                )}
                                {comparisonResult.payloadDiff.removed.length > 0 && (
                                  <div className="text-red-700">- {comparisonResult.payloadDiff.removed.length} removed</div>
                                )}
                                {comparisonResult.payloadDiff.changed.length > 0 && (
                                  <div className="text-yellow-700">~ {comparisonResult.payloadDiff.changed.length} changed</div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<JWTDecoder />);
