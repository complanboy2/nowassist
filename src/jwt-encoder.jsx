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
  Sparkles,
} from 'lucide-react';
import clsx from 'clsx';
import Navigation from './components/Navigation';
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

    if (algorithm.startsWith('HS')) {
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

    const token = `${message}.${signature}`;
    return { token, error: null };
  } catch (err) {
    return { token: null, error: err.message || 'Signing error' };
  }
};

const DEFAULT_HEADER = {
  alg: 'HS256',
  typ: 'JWT',
};

const DEFAULT_PAYLOAD = {
  sub: 'user@example.com',
  name: 'John Doe',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
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
    <div className="rounded-xl border-2 border-slate-200 bg-white shadow-sm flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between border-b-2 border-slate-200 bg-slate-50/50 px-4 py-2 rounded-t-xl flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: theme.primary }} />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-tight text-slate-900">{title}</h3>
            {description && <p className="text-xs text-slate-500 leading-tight mt-0.5">{description}</p>}
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
            'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-150 focus:outline-none border border-slate-200',
            copied 
              ? 'bg-success/20 border-success text-success' 
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          )}
          tabIndex={0}
        >
          {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <div className="overflow-auto bg-white rounded-b-xl" style={{ height: '300px' }}>
        <pre className="p-6 text-sm leading-relaxed">
          <code className="font-mono text-slate-800">
            {lines.map((line, index) => (
              <React.Fragment key={index}>
                <span className="inline-block w-10 select-none text-right text-slate-400 pr-4">{index + 1}</span>
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
  const [algorithm, setAlgorithm] = useState('HS256');
  const [key, setKey] = useState('');
  const [keyFormat, setKeyFormat] = useState('PEM');
  const [encodedToken, setEncodedToken] = useState('');
  const [error, setError] = useState('');
  const [isEncoding, setIsEncoding] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('servicenow');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const companyMenuRef = useRef(null);
  const headerTextareaRef = useRef(null);
  const payloadTextareaRef = useRef(null);

  const theme = COMPANY_THEMES[selectedCompany];
  const isHMAC = algorithm.startsWith('HS');

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
      if (e.key === 'Escape' && companyMenuOpen) {
        setCompanyMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [companyMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (companyMenuRef.current && !companyMenuRef.current.contains(event.target)) {
        setCompanyMenuOpen(false);
      }
    };
    if (companyMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [companyMenuOpen]);

  const handleGenerate = async () => {
    if (!header || !payload) {
      setError('Please fix JSON errors before generating');
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

  const handleLoadExample = () => {
    setHeaderJson(JSON.stringify(DEFAULT_HEADER, null, 2));
    setPayloadJson(JSON.stringify({
      ...DEFAULT_PAYLOAD,
      sub: selectedCompany === 'servicenow' ? 'veera@servicenow.com' : 'veera@salesforce.com',
      name: 'Veera Solutions',
      user_name: selectedCompany === 'servicenow' ? 'veera.solutions' : undefined,
      sys_id: selectedCompany === 'servicenow' ? 'a12b34c' : undefined,
      organization_id: selectedCompany === 'salesforce' ? '00D123456789' : undefined,
    }, null, 2));
    setAlgorithm('HS256');
    setKey('');
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

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <Navigation currentPageId="jwt-encoder" sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col" style={{ width: '100%', minWidth: 0 }}>
        <div className="mx-auto max-w-[1800px] w-full px-8 py-6 flex-1 flex flex-col min-h-0" style={{ width: '100%', maxWidth: '1800px' }}>
          {/* Compact Header */}
          <header className="mb-4 flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-slate-900">JSON Web Token (JWT) Encoder</h1>
              <p className="text-sm text-slate-600">
                Create and sign JSON Web Tokens. All processing happens in your browser—data never leaves your device.
              </p>
            </div>
            <div className="relative" ref={companyMenuRef}>
              <button
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] focus:outline-none"
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
                <span className="text-slate-900 whitespace-nowrap">{theme.name}</span>
                <ChevronDown className={clsx('h-3.5 w-3.5 text-slate-500 transition-transform duration-200 flex-shrink-0', companyMenuOpen && 'rotate-180')} />
              </button>
              {companyMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-40 rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
                  <button
                    onClick={() => {
                      setSelectedCompany('servicenow');
                      setCompanyMenuOpen(false);
                    }}
                    className={clsx('w-full px-3 py-2 text-left text-sm transition-colors active:scale-[0.98] focus:outline-none', selectedCompany === 'servicenow' ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-700 hover:bg-slate-50')}
                    tabIndex={0}
                  >
                    ServiceNow
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCompany('salesforce');
                      setCompanyMenuOpen(false);
                    }}
                    className={clsx('w-full px-3 py-2 text-left text-sm transition-colors active:scale-[0.98] focus:outline-none', selectedCompany === 'salesforce' ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-700 hover:bg-slate-50')}
                    tabIndex={0}
                  >
                    Salesforce
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Header Input */}
          <div className="rounded-xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden mb-4">
            <div className="relative border-b-2 border-slate-200 bg-slate-50/50 px-6 py-3 rounded-t-xl">
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: theme.primary }} />
              <label htmlFor="header-input" className="text-sm font-semibold text-slate-900">
                JWT Header
              </label>
            </div>
            <div className="relative">
              <textarea
                ref={headerTextareaRef}
                id="header-input"
                value={headerJson}
                onChange={(e) => setHeaderJson(e.target.value)}
                placeholder="Enter JWT header as JSON"
                className="h-40 w-full resize-none border-0 bg-white px-6 py-5 font-mono text-base leading-relaxed text-slate-900 placeholder:text-slate-500 focus:outline-none"
                tabIndex={0}
              />
            </div>
          </div>

          {/* Payload Input */}
          <div className="rounded-xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden mb-4">
            <div className="relative border-b-2 border-slate-200 bg-slate-50/50 px-6 py-3 rounded-t-xl">
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: theme.primary }} />
              <label htmlFor="payload-input" className="text-sm font-semibold text-slate-900">
                JWT Payload
              </label>
            </div>
            <div className="relative">
              <textarea
                ref={payloadTextareaRef}
                id="payload-input"
                value={payloadJson}
                onChange={(e) => setPayloadJson(e.target.value)}
                placeholder="Enter JWT payload as JSON"
                className="h-40 w-full resize-none border-0 bg-white px-6 py-5 font-mono text-base leading-relaxed text-slate-900 placeholder:text-slate-500 focus:outline-none"
                tabIndex={0}
              />
            </div>
          </div>

          {/* Algorithm and Key Selection */}
          <div className="rounded-xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden mb-4">
            <div className="relative border-b-2 border-slate-200 bg-slate-50/50 px-6 py-3 rounded-t-xl">
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: theme.primary }} />
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-900">
                  Signing Configuration
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLoadExample}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 active:scale-95 focus:outline-none"
                    tabIndex={0}
                  >
                    Load Example
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Algorithm
                  </label>
                  <select
                    value={algorithm}
                    onChange={(e) => {
                      setAlgorithm(e.target.value);
                      setKey('');
                      setEncodedToken('');
                      setError('');
                    }}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-slate-400 transition-colors cursor-pointer hover:bg-slate-50"
                    tabIndex={0}
                  >
                    <optgroup label="HMAC">
                      <option value="HS256">HS256</option>
                      <option value="HS384">HS384</option>
                      <option value="HS512">HS512</option>
                    </optgroup>
                    <optgroup label="RSA">
                      <option value="RS256">RS256</option>
                      <option value="RS384">RS384</option>
                      <option value="RS512">RS512</option>
                    </optgroup>
                    <optgroup label="ECDSA">
                      <option value="ES256">ES256</option>
                      <option value="ES384">ES384</option>
                      <option value="ES512">ES512</option>
                    </optgroup>
                  </select>
                </div>
                {!isHMAC && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Key Format
                    </label>
                    <select
                      value={keyFormat}
                      onChange={(e) => {
                        setKeyFormat(e.target.value);
                        setKey('');
                        setEncodedToken('');
                      }}
                      className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-slate-400 transition-colors cursor-pointer hover:bg-slate-50"
                      tabIndex={0}
                    >
                      <option value="PEM">PEM</option>
                      <option value="JWK">JWK</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {isHMAC ? 'Secret' : 'Private Key'}
                </label>
                <div className="flex items-center gap-2">
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
                    className="flex-1 h-32 resize-none rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-mono text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none transition-colors"
                    tabIndex={0}
                  />
                  {!isHMAC && (
                    <label className="flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 active:scale-95 cursor-pointer focus-within:outline-none focus-within:border-slate-400">
                      <Upload className="h-3.5 w-3.5" />
                      Upload
                      <input type="file" accept=".pem,.key,.json" onChange={handleFileUpload} className="hidden" tabIndex={0} />
                    </label>
                  )}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!header || !payload || (!isHMAC && !key.trim()) || (isHMAC && !key.trim()) || isEncoding}
                className="w-full rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-md active:scale-95 active:opacity-75 disabled:bg-slate-300 disabled:cursor-not-allowed focus:outline-none shadow-lg flex items-center justify-center gap-2"
                style={{ backgroundColor: theme.primary }}
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

          {error && (
            <div className="rounded-xl border-2 border-error/40 bg-error/10 px-6 py-4 mb-4">
              <div className="flex items-center gap-2 text-sm font-medium text-error">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Encoded Token Output */}
          {encodedToken && (
            <div className="rounded-xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="relative border-b-2 border-slate-200 bg-slate-50/50 px-6 py-3 rounded-t-xl">
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: theme.primary }} />
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-900">
                    Encoded JWT Token
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        await copyText(encodedToken);
                        setTokenCopied(true);
                        setTimeout(() => setTokenCopied(false), 2000);
                      }}
                      className={clsx(
                        'inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 active:scale-95 focus:outline-none',
                        tokenCopied && 'bg-success/20 border-success text-success'
                      )}
                      tabIndex={0}
                    >
                      {tokenCopied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {tokenCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="relative">
                <textarea
                  value={encodedToken}
                  readOnly
                  className="h-32 w-full resize-none border-0 bg-white px-6 py-5 font-mono text-base leading-relaxed text-slate-900 focus:outline-none"
                  tabIndex={0}
                />
                <div className="absolute inset-0 pointer-events-none px-6 py-5 font-mono text-base leading-relaxed overflow-hidden">
                  <pre className="whitespace-pre-wrap break-all">
                    {(() => {
                      const parts = encodedToken.split('.');
                      if (parts.length !== 3) return <span className="text-slate-700">{encodedToken}</span>;
                      return (
                        <>
                          <span className="text-blue-400">{parts[0]}</span>
                          <span className="text-slate-300">.</span>
                          <span className="text-purple-400">{parts[1]}</span>
                          <span className="text-slate-300">.</span>
                          <span className="text-emerald-400">{parts[2]}</span>
                        </>
                      );
                    })()}
                  </pre>
                </div>
              </div>
              <div className="border-t-2 border-slate-200 bg-slate-50 px-6 py-4 rounded-b-xl">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-slate-900">JWT generated successfully</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<JWTEncoder />);

