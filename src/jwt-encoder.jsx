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
  RefreshCw,
  Search,
  ShieldCheck,
  Table,
  Upload,
  X,
  FileText,
  FileCode,
  FileJson,
  Sparkles,
} from 'lucide-react';
import clsx from 'clsx';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import './styles.css';

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

const base64UrlEncode = (str) => {
  const utf8 = encodeURIComponent(str)
    .replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16)));
  return btoa(utf8)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

const pretty = (obj) => {
  if (!obj) return '';
  try {
    if (typeof obj === 'string') {
      return JSON.stringify(JSON.parse(obj), null, 2);
    }
    return JSON.stringify(obj, null, 2);
  } catch {
    return typeof obj === 'string' ? obj : JSON.stringify(obj);
  }
};

const copyText = async (text) => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Copy failed', err);
  }
};

const signJWT = async (header, payload, algorithm, key, keyFormat) => {
  try {
    // Encode header and payload
    const headerEncoded = base64UrlEncode(JSON.stringify(header));
    const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
    const message = `${headerEncoded}.${payloadEncoded}`;

    let signature;

    if (algorithm === 'none') {
      // Unsigned JWT
      signature = '';
    } else if (algorithm.startsWith('HS')) {
      // HMAC signing
      const encoder = new TextEncoder();
      const keyData = encoder.encode(key);
      
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
    } else if (algorithm.startsWith('RS') || algorithm.startsWith('ES')) {
      // RSA/ECDSA signing requires private key
      let cryptoKey;
      
      if (keyFormat === 'JWK') {
        const jwk = typeof key === 'string' ? JSON.parse(key) : key;
        // Ensure it's a private key
        if (!jwk.d) {
          return { error: 'Private key (JWK) required for signing. The key must include the "d" parameter.' };
        }
        cryptoKey = await crypto.subtle.importKey(
          'jwk',
          jwk,
          {
            name: algorithm.startsWith('RS') ? 'RSASSA-PKCS1-v1_5' : 'ECDSA',
            hash: algorithm === 'RS256' || algorithm === 'ES256' ? 'SHA-256' : algorithm === 'RS384' || algorithm === 'ES384' ? 'SHA-384' : 'SHA-512',
          },
          false,
          ['sign']
        );
      } else {
        // PEM format - extract private key
        const cleanKey = key
          .replace(/-----BEGIN PRIVATE KEY-----/g, '')
          .replace(/-----END PRIVATE KEY-----/g, '')
          .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
          .replace(/-----END RSA PRIVATE KEY-----/g, '')
          .replace(/\s+/g, '');

        const keyData = Uint8Array.from(atob(cleanKey), (c) => c.charCodeAt(0));

        if (algorithm.startsWith('RS')) {
          cryptoKey = await crypto.subtle.importKey(
            'pkcs8',
            keyData.buffer,
            {
              name: 'RSASSA-PKCS1-v1_5',
              hash: algorithm === 'RS256' ? 'SHA-256' : algorithm === 'RS384' ? 'SHA-384' : 'SHA-512',
            },
            false,
            ['sign']
          );
        } else if (algorithm.startsWith('ES')) {
          cryptoKey = await crypto.subtle.importKey(
            'pkcs8',
            keyData.buffer,
            {
              name: 'ECDSA',
              namedCurve: algorithm === 'ES256' ? 'P-256' : algorithm === 'ES384' ? 'P-384' : 'P-521',
            },
            false,
            ['sign']
          );
        } else {
          return { error: `Algorithm ${algorithm} not supported for signing` };
        }
      }

      const sigBytes = await crypto.subtle.sign(
        algorithm.startsWith('RS') ? 'RSASSA-PKCS1-v1_5' : 'ECDSA',
        cryptoKey,
        new TextEncoder().encode(message)
      );
      signature = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    } else {
      return { error: `Algorithm ${algorithm} not supported` };
    }

    const token = algorithm === 'none' ? `${message}.` : `${message}.${signature}`;
    return { token, error: null };
  } catch (err) {
    return { token: null, error: err.message || 'Signing error' };
  }
};

const DEFAULT_HEADER = {
  alg: 'none',
  typ: 'JWT',
};

const DEFAULT_PAYLOAD = {
  sub: 'user@example.com',
  name: 'John Doe',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
};

// Generate random secret for HMAC
const generateRandomSecret = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generate key pair for RSA/ECDSA and export private key
const generateKeyPairForExample = async (algorithm) => {
  try {
    if (algorithm.startsWith('RS')) {
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
      
      // Export private key in PKCS#8 format and convert to PEM
      const privateKeyData = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
      const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKeyData)));
      const pem = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;
      return pem;
    } else if (algorithm.startsWith('ES')) {
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
      
      // Export private key in PKCS#8 format and convert to PEM
      const privateKeyData = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
      const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKeyData)));
      const pem = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;
      return pem;
    }
    return null;
  } catch (err) {
    console.error('Error generating key pair:', err);
    return null;
  }
};

const CodeSection = ({ title, content, description, onCopy, theme }) => {
  const [copied, setCopied] = useState(false);
  const lines = content ? content.split('\n') : ['—'];

  const handleCopy = async () => {
    await onCopy(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border-2 border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-gray-600 bg-slate-50/50 dark:bg-gray-700/50 px-4 py-2 rounded-t-xl flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: theme.primary }} />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-tight text-slate-900 dark:text-white">{title}</h3>
            {description && <p className="text-xs text-slate-500 dark:text-gray-400 leading-tight mt-0.5">{description}</p>}
          </div>
        </div>
        <button
          onClick={handleCopy}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCopy();
            }
          }}
          className={clsx(
            'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-150 focus:outline-none border border-slate-200 dark:border-gray-600',
            copied 
              ? 'bg-success/20 dark:bg-success/30 border-success dark:border-green-500 text-success dark:text-green-400' 
              : 'text-slate-600 dark:text-white hover:bg-slate-100 dark:hover:bg-gray-600 hover:text-slate-900 dark:hover:text-white'
          )}
          tabIndex={0}
        >
          {copied ? <CheckCircle2 className="h-3.5 w-3.5 dark:text-green-400" /> : <Copy className="h-3.5 w-3.5 dark:text-white" />}
          <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <div className="overflow-auto bg-white dark:bg-gray-800 rounded-b-xl" style={{ height: '300px' }}>
        <pre className="p-6 text-sm leading-relaxed">
          <code className="font-mono text-slate-800 dark:text-white">
            {lines.map((line, index) => (
              <React.Fragment key={index}>
                <span className="inline-block w-10 select-none text-right text-slate-400 dark:text-gray-500 pr-4">{index + 1}</span>
                <span>{line || ' '}</span>
                {'\n'}
              </React.Fragment>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
};

const JWTEncoder = () => {
  const [headerJson, setHeaderJson] = useState(JSON.stringify(DEFAULT_HEADER, null, 2));
  const [payloadJson, setPayloadJson] = useState(JSON.stringify(DEFAULT_PAYLOAD, null, 2));
  const [algorithm, setAlgorithm] = useState('none');
  const [key, setKey] = useState('');
  const [keyFormat, setKeyFormat] = useState('PEM');
  const [encodedToken, setEncodedToken] = useState('');
  const [error, setError] = useState('');
  const [isEncoding, setIsEncoding] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('servicenow');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [headerCopied, setHeaderCopied] = useState(false);
  const [payloadCopied, setPayloadCopied] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [exampleAlgorithm, setExampleAlgorithm] = useState('none');
  const [showExampleMenu, setShowExampleMenu] = useState(false);
  const [algorithmMenuOpen, setAlgorithmMenuOpen] = useState(false);
  const [keyFormatMenuOpen, setKeyFormatMenuOpen] = useState(false);
  const companyMenuRef = useRef(null);
  const exampleMenuRef = useRef(null);
  const algorithmMenuRef = useRef(null);
  const keyFormatMenuRef = useRef(null);
  const headerTextareaRef = useRef(null);
  const payloadTextareaRef = useRef(null);
  const encodedTokenRef = useRef(null);

  const theme = COMPANY_THEMES[selectedCompany];
  const currentCompany = selectedCompany;
  const isHMAC = algorithm.startsWith('HS');
  const isNone = algorithm === 'none';

  // Parse and validate JSON
  const header = useMemo(() => {
    try {
      const parsed = JSON.parse(headerJson);
      setError('');
      return parsed;
    } catch (err) {
      setError(`Header JSON error: ${err.message}`);
      return null;
    }
  }, [headerJson]);

  const payload = useMemo(() => {
    try {
      const parsed = JSON.parse(payloadJson);
      setError('');
      return parsed;
    } catch (err) {
      setError(`Payload JSON error: ${err.message}`);
      return null;
    }
  }, [payloadJson]);

  // Update header algorithm when algorithm changes
  useEffect(() => {
    if (header && header.alg !== algorithm) {
      const updatedHeader = { ...header, alg: algorithm };
      setHeaderJson(JSON.stringify(updatedHeader, null, 2));
    }
  }, [algorithm, header]);

  // Auto-show key input for non-HMAC algorithms or when key is needed
  useEffect(() => {
    if (!isHMAC && !showKeyInput) {
      setShowKeyInput(true);
    }
  }, [algorithm, isHMAC]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (companyMenuOpen) setCompanyMenuOpen(false);
        if (showExampleMenu) setShowExampleMenu(false);
        if (algorithmMenuOpen) setAlgorithmMenuOpen(false);
        if (keyFormatMenuOpen) setKeyFormatMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [companyMenuOpen, showExampleMenu, algorithmMenuOpen, keyFormatMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (companyMenuRef.current && !companyMenuRef.current.contains(event.target)) {
        setCompanyMenuOpen(false);
      }
      if (exampleMenuRef.current && !exampleMenuRef.current.contains(event.target)) {
        setShowExampleMenu(false);
      }
      if (algorithmMenuRef.current && !algorithmMenuRef.current.contains(event.target)) {
        setAlgorithmMenuOpen(false);
      }
      if (keyFormatMenuRef.current && !keyFormatMenuRef.current.contains(event.target)) {
        setKeyFormatMenuOpen(false);
      }
    };
    if (companyMenuOpen || showExampleMenu || algorithmMenuOpen || keyFormatMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [companyMenuOpen, showExampleMenu, algorithmMenuOpen, keyFormatMenuOpen]);

  const handleGenerate = async () => {
    if (!header || !payload) {
      setError('Please fix JSON errors before generating');
      return;
    }

    // For "none" algorithm, no key is needed
    if (algorithm === 'none') {
      setIsEncoding(true);
      setError('');
      const result = await signJWT(header, payload, algorithm, '', keyFormat);
      if (result.error) {
        setError(result.error);
        setEncodedToken('');
      } else {
        setEncodedToken(result.token);
        setError('');
      }
      setIsEncoding(false);
      return;
    }

    if (!isHMAC && !key.trim()) {
      setError('Private key or secret is required for signing');
      return;
    }

    if (isHMAC && !key.trim()) {
      setError('Secret is required for HMAC signing');
      return;
    }

    setIsEncoding(true);
    setError('');
    const result = await signJWT(header, payload, algorithm, key, keyFormat);
    
    if (result.error) {
      setError(result.error);
      setEncodedToken('');
    } else {
      setEncodedToken(result.token);
      setError('');
    }
    setIsEncoding(false);
  };

  const handleLoadExample = async (algorithm = exampleAlgorithm) => {
    const updatedHeader = { ...DEFAULT_HEADER, alg: algorithm };
    setHeaderJson(JSON.stringify(updatedHeader, null, 2));
    
    const examplePayload = {
      ...DEFAULT_PAYLOAD,
      sub: selectedCompany === 'servicenow' ? 'user@example.com' : 'user@example.com',
      name: 'John Doe',
      user_name: selectedCompany === 'servicenow' ? 'john.doe' : undefined,
      sys_id: selectedCompany === 'servicenow' ? 'a12b34c' : undefined,
      organization_id: selectedCompany === 'salesforce' ? '00D123456789' : undefined,
    };
    setPayloadJson(JSON.stringify(examplePayload, null, 2));
    
    setAlgorithm(algorithm);
    
    // Generate key based on algorithm
    if (algorithm.startsWith('HS')) {
      const secret = generateRandomSecret();
      setKey(secret);
    } else if (algorithm.startsWith('RS') || algorithm.startsWith('ES')) {
      const privateKey = await generateKeyPairForExample(algorithm);
      if (privateKey) {
        setKey(privateKey);
        setKeyFormat('PEM');
      }
    } else {
      setKey('');
    }
    
    setEncodedToken('');
    setError('');
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (keyFormat === 'JWK') {
        try {
          setKey(JSON.stringify(JSON.parse(e.target.result), null, 2));
        } catch {
          setKey(e.target.result);
        }
      } else {
        setKey(e.target.result);
      }
    };
    reader.readAsText(file);
  };

  const isRouterMode = typeof window !== 'undefined' && window.__ROUTER_MODE__;
  
  const content = (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 flex flex-col" style={{ width: '100%', minWidth: 0 }}>
        <div className="flex-1 flex flex-col">
          <div className="mx-auto max-w-[1600px] w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-10">
            <div className="space-y-4 sm:space-y-6">
          {/* Professional Header with Border */}
          <header className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm px-4 sm:px-6 lg:px-8 py-4 sm:py-6 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-1 sm:space-y-2">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-8 w-8 text-gray-900 dark:text-white" />
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">JWT Encoder</h1>
                </div>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 dark:text-gray-400">
                  Create and sign JSON Web Tokens. All processing happens in your browser—data never leaves your device.
                </p>
              </div>
              <div className="relative" ref={companyMenuRef}>
                <button
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-white hover:text-gray-900 dark:hover:text-white border-[0.5px] border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-500 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none shadow-sm bg-white dark:bg-gray-800"
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
                  <ChevronDown className={clsx('h-4 w-4 text-gray-500 dark:text-gray-400 dark:text-gray-400 transition-transform duration-200', companyMenuOpen && 'rotate-180')} />
                </button>
                {companyMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setCompanyMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                      <button
                        onClick={() => {
                          setSelectedCompany('servicenow');
                          setCompanyMenuOpen(false);
                        }}
                        className={clsx('w-full px-4 py-2.5 text-left text-sm transition-colors border-b border-gray-100 dark:border-gray-700 dark:border-gray-700 last:border-b-0 focus:outline-none', currentCompany === 'servicenow' ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-semibold' : 'text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700')}
                        tabIndex={0}
                      >
                        ServiceNow
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCompany('salesforce');
                          setCompanyMenuOpen(false);
                        }}
                        className={clsx('w-full px-4 py-2.5 text-left text-sm transition-colors border-b border-gray-100 dark:border-gray-700 dark:border-gray-700 last:border-b-0 focus:outline-none', currentCompany === 'salesforce' ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-semibold' : 'text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700')}
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

          {/* Two Column Layout: Header + Payload | Signing Configuration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch mb-4 sm:mb-6">
            {/* Left Column: Header + Payload */}
            <div className="flex flex-col gap-4 sm:gap-6">
              {/* Header Input */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm overflow-hidden flex flex-col flex-1">
                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-1.5 sm:h-2 w-1.5 sm:w-2 rounded-full flex-shrink-0" style={{ backgroundColor: theme.primary }} />
                    <label htmlFor="header-input" className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                      JWT Header
                    </label>
                  </div>
                  <button
                    onClick={async () => {
                      await copyText(headerJson);
                      setHeaderCopied(true);
                      setTimeout(() => setHeaderCopied(false), 2000);
                    }}
                    className={clsx(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none border-[0.5px] border-gray-300 rounded-lg shadow-sm',
                      headerCopied 
                        ? 'bg-green-50 dark:bg-green-900/30 border-green-400 dark:border-green-500 text-green-700 dark:text-green-400' 
                        : 'text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:shadow'
                    )}
                    tabIndex={0}
                  >
                    {headerCopied ? <CheckCircle2 className="h-3.5 w-3.5 dark:text-white" /> : <Copy className="h-3.5 w-3.5 dark:text-white" />}
                    <span className="hidden sm:inline">{headerCopied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <textarea
                  ref={headerTextareaRef}
                  id="header-input"
                  value={headerJson}
                  onChange={(e) => setHeaderJson(e.target.value)}
                  placeholder="Enter JWT header as JSON"
                  className="w-full flex-1 min-h-[160px] resize-none border-0 bg-white dark:bg-gray-800 px-4 sm:px-5 lg:px-6 py-3 sm:py-4 font-mono text-xs sm:text-sm leading-relaxed text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 dark:text-gray-400 focus:outline-none focus:bg-sky-50/30 dark:focus:bg-sky-900/20"
                  tabIndex={0}
                />
              </div>

              {/* Payload Input */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm overflow-hidden flex flex-col flex-1">
                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-1.5 sm:h-2 w-1.5 sm:w-2 rounded-full flex-shrink-0" style={{ backgroundColor: theme.primary }} />
                    <label htmlFor="payload-input" className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                      JWT Payload
                    </label>
                  </div>
                  <button
                    onClick={async () => {
                      await copyText(payloadJson);
                      setPayloadCopied(true);
                      setTimeout(() => setPayloadCopied(false), 2000);
                    }}
                    className={clsx(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none border-[0.5px] border-gray-300 rounded-lg shadow-sm',
                      payloadCopied 
                        ? 'bg-green-50 dark:bg-green-900/30 border-green-400 dark:border-green-500 text-green-700 dark:text-green-400' 
                        : 'text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:shadow'
                    )}
                    tabIndex={0}
                  >
                    {payloadCopied ? <CheckCircle2 className="h-3.5 w-3.5 dark:text-white" /> : <Copy className="h-3.5 w-3.5 dark:text-white" />}
                    <span className="hidden sm:inline">{payloadCopied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <textarea
                  ref={payloadTextareaRef}
                  id="payload-input"
                  value={payloadJson}
                  onChange={(e) => setPayloadJson(e.target.value)}
                  placeholder="Enter JWT payload as JSON"
                  className="w-full flex-1 min-h-[200px] resize-none border-0 bg-white dark:bg-gray-800 px-4 sm:px-5 lg:px-6 py-3 sm:py-4 font-mono text-xs sm:text-sm leading-relaxed text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 dark:text-gray-400 focus:outline-none focus:bg-sky-50/30 dark:focus:bg-sky-900/20"
                  tabIndex={0}
                />
              </div>
            </div>

            {/* Right Column: Signing Configuration */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm overflow-hidden flex flex-col flex-1">
            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-1.5 sm:h-2 w-1.5 sm:w-2 rounded-full flex-shrink-0" style={{ backgroundColor: theme.primary }} />
                <label className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                  Signing Configuration
                </label>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative" ref={exampleMenuRef}>
                  <button
                    onClick={() => setShowExampleMenu(!showExampleMenu)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setShowExampleMenu(!showExampleMenu);
                      }
                    }}
                    className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-white bg-white dark:bg-gray-700 border-[0.5px] border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-500 dark:hover:border-gray-500 focus:outline-none shadow-sm hover:shadow inline-flex items-center gap-2"
                    tabIndex={0}
                  >
                    <RefreshCw className="h-3.5 w-3.5 dark:text-white" />
                    Load Example {exampleAlgorithm === 'none' ? '(none)' : `(${exampleAlgorithm})`}
                    <ChevronDown className={clsx('h-3 w-3 transition-transform duration-200', showExampleMenu && 'rotate-180')} />
                  </button>
                  {showExampleMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowExampleMenu(false)} />
                      <div className="absolute right-0 top-full mt-2 w-40 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-lg z-50 overflow-y-auto max-h-64">
                        {['none', 'HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512'].map((alg) => (
                          <button
                            key={alg}
                            onClick={async () => {
                              setExampleAlgorithm(alg);
                              setShowExampleMenu(false);
                              if (alg === 'none') {
                                // For "none", we'll still use a default algorithm but show it as selected
                                await handleLoadExample('none');
                              } else {
                                await handleLoadExample(alg);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setExampleAlgorithm(alg);
                                setShowExampleMenu(false);
                                if (alg === 'none') {
                                  handleLoadExample('none');
                                } else {
                                  handleLoadExample(alg);
                                }
                              }
                            }}
                            className={clsx(
                              'w-full px-3 py-2 text-left text-sm transition-colors active:scale-[0.98] focus:outline-none',
                              exampleAlgorithm === alg 
                                ? 'bg-gray-100 dark:bg-gray-700 font-medium text-gray-900 dark:text-white' 
                                : 'text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                            )}
                            tabIndex={0}
                          >
                            {alg === 'none' ? 'none (Unsecured)' : alg}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6 flex flex-col flex-1 min-h-0">
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                      Algorithm
                    </label>
                    <div className="relative" ref={algorithmMenuRef}>
                      <button
                        type="button"
                        onClick={() => setAlgorithmMenuOpen(!algorithmMenuOpen)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setAlgorithmMenuOpen(!algorithmMenuOpen);
                          }
                        }}
                        className="w-full text-left border-[0.5px] border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-sky-400/60 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                        tabIndex={0}
                        aria-expanded={algorithmMenuOpen}
                      >
                        <span>{algorithm === 'none' ? 'none (Unsecured)' : algorithm}</span>
                        <ChevronDown className={clsx('h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 flex-shrink-0', algorithmMenuOpen && 'rotate-180')} />
                      </button>
                      {algorithmMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setAlgorithmMenuOpen(false)} />
                          <div className="absolute left-0 right-0 top-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-lg z-50 overflow-y-auto max-h-64">
                            <div className="py-1">
                              <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unsigned</div>
                              <button
                                onClick={() => {
                                  setAlgorithm('none');
                                  setKey('');
                                  setEncodedToken('');
                                  setError('');
                                  setAlgorithmMenuOpen(false);
                                }}
                                className={clsx(
                                  'w-full px-3 py-2 text-left text-sm transition-colors',
                                  algorithm === 'none' 
                                    ? 'bg-gray-100 dark:bg-gray-700 font-medium text-gray-900 dark:text-white' 
                                    : 'text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                                )}
                                tabIndex={0}
                              >
                                none (Unsecured)
                              </button>
                            </div>
                            <div className="py-1 border-t border-gray-100">
                              <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">HMAC</div>
                              {['HS256', 'HS384', 'HS512'].map((alg) => (
                                <button
                                  key={alg}
                                  onClick={() => {
                                    setAlgorithm(alg);
                                    setKey('');
                                    setEncodedToken('');
                                    setError('');
                                    setAlgorithmMenuOpen(false);
                                  }}
                                  className={clsx(
                                    'w-full px-3 py-2 text-left text-sm transition-colors',
                                    algorithm === alg 
                                      ? 'bg-gray-100 dark:bg-gray-700 font-medium text-gray-900 dark:text-white' 
                                      : 'text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                                  )}
                                  tabIndex={0}
                                >
                                  {alg}
                                </button>
                              ))}
                            </div>
                            <div className="py-1 border-t border-gray-100">
                              <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">RSA</div>
                              {['RS256', 'RS384', 'RS512'].map((alg) => (
                                <button
                                  key={alg}
                                  onClick={() => {
                                    setAlgorithm(alg);
                                    setKey('');
                                    setEncodedToken('');
                                    setError('');
                                    setAlgorithmMenuOpen(false);
                                  }}
                                  className={clsx(
                                    'w-full px-3 py-2 text-left text-sm transition-colors',
                                    algorithm === alg 
                                      ? 'bg-gray-100 dark:bg-gray-700 font-medium text-gray-900 dark:text-white' 
                                      : 'text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                                  )}
                                  tabIndex={0}
                                >
                                  {alg}
                                </button>
                              ))}
                            </div>
                            <div className="py-1 border-t border-gray-100">
                              <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ECDSA</div>
                              {['ES256', 'ES384', 'ES512'].map((alg) => (
                                <button
                                  key={alg}
                                  onClick={() => {
                                    setAlgorithm(alg);
                                    setKey('');
                                    setEncodedToken('');
                                    setError('');
                                    setAlgorithmMenuOpen(false);
                                  }}
                                  className={clsx(
                                    'w-full px-3 py-2 text-left text-sm transition-colors',
                                    algorithm === alg 
                                      ? 'bg-gray-100 dark:bg-gray-700 font-medium text-gray-900 dark:text-white' 
                                      : 'text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                                  )}
                                  tabIndex={0}
                                >
                                  {alg}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {!isHMAC && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                        Key Format
                      </label>
                      <div className="relative" ref={keyFormatMenuRef}>
                        <button
                          type="button"
                          onClick={() => setKeyFormatMenuOpen(!keyFormatMenuOpen)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setKeyFormatMenuOpen(!keyFormatMenuOpen);
                            }
                          }}
                          className="w-full text-left border-[0.5px] border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-sky-400/60 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                          tabIndex={0}
                          aria-expanded={keyFormatMenuOpen}
                        >
                          <span>{keyFormat}</span>
                          <ChevronDown className={clsx('h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 flex-shrink-0', keyFormatMenuOpen && 'rotate-180')} />
                        </button>
                        {keyFormatMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setKeyFormatMenuOpen(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-lg z-50 overflow-hidden">
                              {['PEM', 'JWK'].map((format) => (
                                <button
                                  key={format}
                                  onClick={() => {
                                    setKeyFormat(format);
                                    setKey('');
                                    setEncodedToken('');
                                    setKeyFormatMenuOpen(false);
                                  }}
                                  className={clsx(
                                    'w-full px-3 py-2 text-left text-sm transition-colors',
                                    keyFormat === format 
                                      ? 'bg-gray-100 dark:bg-gray-700 font-medium text-gray-900 dark:text-white' 
                                      : 'text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                                  )}
                                  tabIndex={0}
                                >
                                  {format}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {!isNone && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-white">
                        {isHMAC ? 'Secret' : 'Private Key'}
                      </label>
                      {key.trim() && (
                        <button
                          onClick={async () => {
                            await copyText(key);
                            setKeyCopied(true);
                            setTimeout(() => setKeyCopied(false), 2000);
                          }}
                          className={clsx(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none border-[0.5px] border-gray-300 rounded-lg shadow-sm',
                            keyCopied 
                              ? 'bg-green-50 dark:bg-green-900/30 border-green-400 dark:border-green-500 text-green-700 dark:text-green-400' 
                              : 'text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:shadow'
                          )}
                          tabIndex={0}
                        >
                          {keyCopied ? <CheckCircle2 className="h-3.5 w-3.5 dark:text-white" /> : <Copy className="h-3.5 w-3.5 dark:text-white" />}
                          <span className="hidden sm:inline">{keyCopied ? 'Copied!' : 'Copy'}</span>
                        </button>
                      )}
                    </div>
                    <textarea
                      value={key}
                      onChange={(e) => {
                        setKey(e.target.value);
                        setEncodedToken('');
                        setError('');
                      }}
                      placeholder={isHMAC 
                        ? 'Enter the secret used to sign the JWT' 
                        : keyFormat === 'PEM' 
                          ? '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----'
                          : '{\n  "kty": "RSA",\n  "n": "...",\n  "e": "AQAB",\n  "d": "...",\n  ...\n}'}
                      className="w-full min-h-[180px] resize-none border-[0.5px] border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 px-3 sm:px-4 py-2 sm:py-2.5 font-mono text-xs sm:text-sm leading-relaxed text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-sky-400/60 dark:focus:border-sky-500/60 mb-2"
                      tabIndex={0}
                    />
                    {!isHMAC && (
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-white bg-white dark:bg-gray-700 border-[0.5px] border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-500 dark:hover:border-gray-500 cursor-pointer focus-within:outline-none shadow-sm">
                        <Upload className="h-3.5 w-3.5 dark:text-white" />
                        Upload
                        <input type="file" accept=".pem,.key,.json" onChange={handleFileUpload} className="hidden" tabIndex={0} />
                      </label>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={handleGenerate}
                disabled={!header || !payload || (!isNone && !isHMAC && !key.trim()) || (!isNone && isHMAC && !key.trim()) || isEncoding}
                className="w-full px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-lg transition-all disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-300 dark:disabled:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-700 focus:ring-offset-2 shadow-sm hover:shadow flex items-center justify-center gap-2 mt-4"
                tabIndex={0}
              >
                {isEncoding ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Encoding...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate JWT
                  </>
                )}
              </button>
            </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-red-700 dark:text-red-400 font-medium">
                <AlertCircle className="h-4 w-4 flex-shrink-0 dark:text-red-400" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Encoded Token Output */}
          <div ref={encodedTokenRef} className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-1.5 sm:h-2 w-1.5 sm:w-2 rounded-full flex-shrink-0" style={{ backgroundColor: theme.primary }} />
                <label className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                  Encoded JWT Token
                </label>
              </div>
              {encodedToken && (
                <button
                  onClick={async () => {
                    await copyText(encodedToken);
                    setTokenCopied(true);
                    setTimeout(() => setTokenCopied(false), 2000);
                  }}
                  className={clsx(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none border-[0.5px] border-gray-300 rounded-lg shadow-sm',
                    tokenCopied 
                      ? 'bg-green-50 dark:bg-green-900/30 border-green-400 dark:border-green-500 text-green-700 dark:text-green-400' 
                      : 'text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:shadow'
                  )}
                  tabIndex={0}
                >
                  {tokenCopied ? <CheckCircle2 className="h-3.5 w-3.5 dark:text-white" /> : <Copy className="h-3.5 w-3.5 dark:text-white" />}
                  <span className="hidden sm:inline">{tokenCopied ? 'Copied!' : 'Copy'}</span>
                </button>
              )}
            </div>
            <div className="relative">
              <textarea
                value={encodedToken || ''}
                readOnly
                placeholder={encodedToken ? '' : 'Generated JWT token will appear here...'}
                className="w-full min-h-[120px] resize-none border-0 bg-white dark:bg-gray-800 px-4 sm:px-5 lg:px-6 py-3 sm:py-4 font-mono text-xs sm:text-sm leading-relaxed text-gray-900 placeholder:text-gray-400 focus:outline-none token-input-textarea"
                style={encodedToken ? { color: 'transparent' } : {}}
                tabIndex={0}
              />
              {encodedToken && (
                <div className="absolute inset-0 pointer-events-none px-4 sm:px-5 lg:px-6 py-3 sm:py-4 font-mono text-xs sm:text-sm leading-relaxed overflow-hidden">
                  <pre className="whitespace-pre-wrap break-all">
                    {(() => {
                      const parts = encodedToken.split('.');
                      if (parts.length < 2) return <span className="text-gray-700 dark:text-white">{encodedToken}</span>;
                      return (
                        <>
                          <span className="text-blue-400">{parts[0]}</span>
                          <span className="text-gray-300 dark:text-gray-400">.</span>
                          <span className="text-purple-400">{parts[1]}</span>
                          {parts[2] && (
                            <>
                              <span className="text-gray-300 dark:text-gray-400">.</span>
                              <span className="text-emerald-400">{parts[2]}</span>
                            </>
                          )}
                        </>
                      );
                    })()}
                  </pre>
                </div>
              )}
            </div>
              <div className={clsx('border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-3 sm:py-4', !encodedToken && 'opacity-0 pointer-events-none')}>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-gray-900 dark:text-white">JWT generated successfully</span>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
  );
  
  if (isRouterMode) {
    return content;
  }
  
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-gray-900 overflow-hidden">
      <Navigation currentPageId="jwt-encoder" sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />
      {content}
    </div>
  );
};

// Export component for Router, render directly for extension
const JWTEncoderComponent = () => <JWTEncoder />;
export default JWTEncoderComponent;

// Render directly if running as standalone (extension mode)
if (typeof window !== 'undefined' && document.getElementById('root') && !window.__ROUTER_MODE__) {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(<JWTEncoder />);
}

