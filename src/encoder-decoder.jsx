import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  RefreshCw,
  Code,
  Lock,
  FileCode,
  ShieldCheck,
  Key,
  Network,
  FileJson,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import clsx from 'clsx';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import './styles.css';

const FEATURES = [
  { id: 'jwt', name: 'JWT Decoder', icon: ShieldCheck, category: 'Authentication', status: 'active', url: chrome.runtime?.getURL ? chrome.runtime.getURL('jwt.html') : 'jwt.html' },
  { id: 'jwt-encoder', name: 'JWT Encoder', icon: Sparkles, category: 'Authentication', status: 'active', url: chrome.runtime?.getURL ? chrome.runtime.getURL('jwt-encoder.html') : 'jwt-encoder.html' },
  { id: 'saml', name: 'SAML Inspector', icon: Key, category: 'Authentication', status: 'active', url: chrome.runtime?.getURL ? chrome.runtime.getURL('saml.html') : 'saml.html' },
  { id: 'rest', name: 'REST API Tester', icon: Network, category: 'API Testing', status: 'active', url: chrome.runtime?.getURL ? chrome.runtime.getURL('rest.html') : 'rest.html' },
  { id: 'har', name: 'HAR Analyzer', icon: FileCode, category: 'Debugging', status: 'active', url: chrome.runtime?.getURL ? chrome.runtime.getURL('har-analyzer.html') : 'har-analyzer.html' },
  { id: 'json', name: 'JSON Utility', icon: FileJson, category: 'Utilities', status: 'active', url: chrome.runtime?.getURL ? chrome.runtime.getURL('json-utility.html') : 'json-utility.html' },
  { id: 'encoder-decoder', name: 'Encoder/Decoder', icon: Code, category: 'Utilities', status: 'active', url: chrome.runtime?.getURL ? chrome.runtime.getURL('encoder-decoder.html') : 'encoder-decoder.html' },
];

const ENCODING_TYPES = [
  { id: 'base64', name: 'Base64', description: 'Base64 encoding (RFC 4648)' },
  { id: 'base64url', name: 'Base64URL', description: 'Base64URL encoding (URL-safe)' },
  { id: 'base32', name: 'Base32', description: 'Base32 encoding (RFC 4648)' },
  { id: 'url', name: 'URL Encoding', description: 'Percent-encoding (RFC 3986)' },
  { id: 'html', name: 'HTML Entities', description: 'HTML entity encoding/decoding' },
  { id: 'hex', name: 'Hexadecimal', description: 'Hex encoding/decoding' },
  { id: 'ascii', name: 'ASCII', description: 'ASCII encoding' },
  { id: 'utf8', name: 'UTF-8', description: 'UTF-8 encoding/decoding' },
];

const copyText = async (text) => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Copy failed', err);
  }
};

// Base32 encoding/decoding
const base32Encode = (str) => {
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = new TextEncoder().encode(str);
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;

    while (bits >= 5) {
      output += base32Chars[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += base32Chars[(value << (5 - bits)) & 31];
  }

  // Add padding
  while (output.length % 8 !== 0) {
    output += '=';
  }

  return output;
};

const base32Decode = (str) => {
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = str.replace(/[^A-Z2-7=]/gi, '').toUpperCase();
  const padding = (cleaned.match(/=/g) || []).length;
  const validLength = cleaned.length - padding;

  if (validLength === 0) return '';

  let bits = 0;
  let value = 0;
  const bytes = [];

  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '=') continue;
    const charIndex = base32Chars.indexOf(cleaned[i]);
    if (charIndex === -1) throw new Error('Invalid Base32 character');

    value = (value << 5) | charIndex;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
};

// Hex encoding/decoding
const hexEncode = (str) => {
  const bytes = new TextEncoder().encode(str);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
};

const hexDecode = (hex) => {
  const cleaned = hex.replace(/[^0-9a-f]/gi, '');
  if (cleaned.length % 2 !== 0) throw new Error('Invalid hex string: odd length');
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleaned.substr(i * 2, 2), 16);
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
};

// HTML entity encoding/decoding
const htmlEncode = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

const htmlDecode = (str) => {
  const div = document.createElement('div');
  div.innerHTML = str;
  return div.textContent || div.innerText || '';
};

const EncoderDecoder = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [selectedType, setSelectedType] = useState('base64');
  const [mode, setMode] = useState('encode'); // 'encode' or 'decode'
  const [error, setError] = useState('');
  const [copied, setCopied] = useState({ input: false, output: false });
  const [encodingTypeMenuOpen, setEncodingTypeMenuOpen] = useState(false);
  const encodingTypeMenuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (encodingTypeMenuRef.current && !encodingTypeMenuRef.current.contains(event.target)) {
        setEncodingTypeMenuOpen(false);
      }
    };

    if (encodingTypeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [encodingTypeMenuOpen]);

  // Auto encode/decode on input or mode change
  useEffect(() => {
    handleEncodeDecode();
  }, [inputText, selectedType, mode]);

  const handleEncodeDecode = () => {
    setError('');
    if (!inputText.trim()) {
      setOutputText('');
      return;
    }

    try {
      let result = '';
      const type = selectedType;

      if (mode === 'encode') {
        switch (type) {
          case 'base64':
            result = btoa(unescape(encodeURIComponent(inputText)));
            break;
          case 'base64url':
            result = btoa(unescape(encodeURIComponent(inputText)))
              .replace(/\+/g, '-')
              .replace(/\//g, '_')
              .replace(/=/g, '');
            break;
          case 'base32':
            result = base32Encode(inputText);
            break;
          case 'url':
            result = encodeURIComponent(inputText);
            break;
          case 'html':
            result = htmlEncode(inputText);
            break;
          case 'hex':
            result = hexEncode(inputText);
            break;
          case 'ascii':
            result = Array.from(inputText).map(c => c.charCodeAt(0)).join(' ');
            break;
          case 'utf8':
            result = new TextEncoder().encode(inputText).join(' ');
            break;
          default:
            result = inputText;
        }
      } else {
        // decode
        switch (type) {
          case 'base64':
            try {
              result = decodeURIComponent(escape(atob(inputText.replace(/\s+/g, ''))));
            } catch (e) {
              throw new Error('Invalid Base64 string');
            }
            break;
          case 'base64url':
            try {
              const base64 = inputText.replace(/-/g, '+').replace(/_/g, '/');
              const padLength = base64.length % 4 ? 4 - (base64.length % 4) : 0;
              result = decodeURIComponent(escape(atob(base64 + '='.repeat(padLength))));
            } catch (e) {
              throw new Error('Invalid Base64URL string');
            }
            break;
          case 'base32':
            result = base32Decode(inputText);
            break;
          case 'url':
            result = decodeURIComponent(inputText.replace(/\+/g, ' '));
            break;
          case 'html':
            result = htmlDecode(inputText);
            break;
          case 'hex':
            result = hexDecode(inputText);
            break;
          case 'ascii':
            result = inputText.split(/\s+/).map(num => String.fromCharCode(parseInt(num, 10))).join('');
            break;
          case 'utf8':
            const bytes = inputText.split(/\s+/).map(num => parseInt(num, 10));
            result = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
            break;
          default:
            result = inputText;
        }
      }

      setOutputText(result);
    } catch (err) {
      setError(err.message || 'Encoding/Decoding failed');
      setOutputText('');
    }
  };

  // Auto encode/decode on input or mode change
  useEffect(() => {
    handleEncodeDecode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText, selectedType, mode]);

  const handleCopy = async (text, type) => {
    await copyText(text);
    setCopied(prev => ({ ...prev, [type]: true }));
    setTimeout(() => {
      setCopied(prev => ({ ...prev, [type]: false }));
    }, 2000);
  };

  const clearAll = () => {
    setInputText('');
    setOutputText('');
    setError('');
  };

  const isRouterMode = typeof window !== 'undefined' && window.__ROUTER_MODE__;
  
  const content = (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 flex flex-col" style={{ width: '100%', minWidth: 0 }}>
        <div className="flex-1 flex flex-col">
          <div className="mx-auto max-w-[1600px] w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="space-y-3 sm:space-y-4">
            {/* Compact Header */}
            <header className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm px-4 sm:px-5 py-3 mb-3">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Encoder/Decoder</h1>
            </header>

            {/* Encoding Type and Mode Selection */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Configuration</h2>
              </div>
              <div className="p-3 space-y-3">
                {/* Encoding Type */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-white mb-2">
                    Encoding Type
                  </label>
                  <div className="relative" ref={encodingTypeMenuRef}>
                    <button
                      type="button"
                      onClick={() => setEncodingTypeMenuOpen(!encodingTypeMenuOpen)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setEncodingTypeMenuOpen(!encodingTypeMenuOpen);
                        }
                      }}
                      className="w-full text-left border-[0.5px] border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:border-sky-400/60 dark:focus:border-sky-500/60 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-between"
                      tabIndex={0}
                      aria-expanded={encodingTypeMenuOpen}
                    >
                      <span>{ENCODING_TYPES.find(t => t.id === selectedType)?.name || 'Select encoding type'}</span>
                      <ChevronDown className={clsx('h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 flex-shrink-0', encodingTypeMenuOpen && 'rotate-180')} />
                    </button>
                    {encodingTypeMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setEncodingTypeMenuOpen(false)} />
                        <div className="absolute left-0 right-0 top-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-lg z-[100] overflow-y-auto max-h-64">
                          {ENCODING_TYPES.map((type) => (
                            <button
                              key={type.id}
                              onClick={() => {
                                setSelectedType(type.id);
                                setOutputText('');
                                setError('');
                                setEncodingTypeMenuOpen(false);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setSelectedType(type.id);
                                  setOutputText('');
                                  setError('');
                                  setEncodingTypeMenuOpen(false);
                                }
                              }}
                              className={clsx(
                                'w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm transition-colors',
                                selectedType === type.id 
                                  ? 'bg-gray-100 dark:bg-gray-700 font-medium text-gray-900 dark:text-white' 
                                  : 'text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                              )}
                              tabIndex={0}
                            >
                              <div className="font-medium">{type.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{type.description}</div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Mode Toggle */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-white mb-2">
                    Mode
                  </label>
                  <div className="flex items-center gap-0.5 bg-white dark:bg-gray-700 p-0.5 border border-gray-300 dark:border-gray-600 rounded-md w-full">
                    <button
                      onClick={() => {
                        setMode('encode');
                        setOutputText('');
                        setError('');
                      }}
                      className={clsx(
                        'flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium transition-colors rounded',
                        mode === 'encode'
                          ? 'bg-sky-500 text-white'
                          : 'text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-500'
                      )}
                    >
                      Encode
                    </button>
                    <button
                      onClick={() => {
                        setMode('decode');
                        setOutputText('');
                        setError('');
                      }}
                      className={clsx(
                        'flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium transition-colors rounded',
                        mode === 'decode'
                          ? 'bg-sky-500 text-white'
                          : 'text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-500'
                      )}
                    >
                      Decode
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-xl border border-error/20 dark:border-error/40 bg-error/5 dark:bg-error/20 overflow-hidden">
                <div className="px-4 sm:px-6 py-3 sm:py-4">
                  <div className="flex items-center gap-2 text-error dark:text-red-400 text-sm">
                    <span className="font-semibold">Error:</span>
                    <span>{error}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Input and Output Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Input Panel */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm overflow-hidden flex flex-col">
                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-4 py-2.5 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-1.5 sm:h-2 w-1.5 sm:w-2 rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0"></div>
                    <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">Input</h2>
                  </div>
                  <button
                    onClick={() => handleCopy(inputText, 'input')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none border-[0.5px] border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-700 hover:shadow"
                    title="Copy input"
                  >
                    {copied.input ? (
                      <>
                        <Copy className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                        <span className="hidden sm:inline">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 dark:text-white" />
                        <span className="hidden sm:inline">Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="flex-1 min-h-0" style={{ minHeight: '400px' }}>
                  <textarea
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      setError('');
                    }}
                    placeholder="Enter text to encode/decode..."
                    className="w-full h-full resize-none border-0 bg-white dark:bg-gray-800 px-4 py-3 font-mono text-sm leading-relaxed text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:bg-sky-50/30 dark:focus:bg-sky-900/20"
                  />
                </div>
              </div>

              {/* Output Panel */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm overflow-hidden flex flex-col">
                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-4 py-2.5 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-1.5 sm:h-2 w-1.5 sm:w-2 rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0"></div>
                    <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">Output</h2>
                  </div>
                  {outputText && (
                    <button
                      onClick={() => handleCopy(outputText, 'output')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none border-[0.5px] border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-700 hover:shadow"
                      title="Copy output"
                    >
                      {copied.output ? (
                        <>
                          <Copy className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                          <span className="hidden sm:inline">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 dark:text-white" />
                          <span className="hidden sm:inline">Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="flex-1 min-h-0" style={{ minHeight: '400px' }}>
                  <textarea
                    value={outputText}
                    readOnly
                    placeholder="Output will appear here..."
                    className="w-full h-full resize-none border-0 bg-gray-50 dark:bg-gray-800 px-4 py-3 font-mono text-sm leading-relaxed text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none"
                  />
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
    <div className="flex h-screen bg-white dark:bg-gray-900 overflow-hidden">
      <Navigation currentPageId="encoder-decoder" sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />
      {content}
    </div>
  );
};

// Initialize app
// Export component for Router, render directly for extension
const EncoderDecoderComponent = () => <EncoderDecoder />;
export default EncoderDecoderComponent;

// Export named component as well
export { EncoderDecoder };

// Render directly if running as standalone (extension mode)
if (typeof window !== 'undefined' && document.getElementById('root') && !window.__ROUTER_MODE__) {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(<EncoderDecoder />);
}

