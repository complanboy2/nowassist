import React, { useMemo, useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Fingerprint,
  Info,
  Key,
  Layers,
  ListTree,
  Network,
  Search,
  ShieldCheck,
  Trash2,
  RefreshCw,
  FileText,
  FileCode,
  FileJson,
} from 'lucide-react';
import clsx from 'clsx';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import './styles.css';

const FEATURES = [
  { id: 'jwt', name: 'JWT Decoder', icon: ShieldCheck, category: 'Authentication', status: 'active', url: chrome.runtime?.getURL ? chrome.runtime.getURL('jwt.html') : 'jwt.html' },
  { id: 'saml', name: 'SAML Inspector', icon: Key, category: 'Authentication', status: 'active', url: chrome.runtime?.getURL ? chrome.runtime.getURL('saml.html') : 'saml.html' },
  { id: 'rest', name: 'REST API Tester', icon: Network, category: 'API Testing', status: 'active', url: chrome.runtime?.getURL ? chrome.runtime.getURL('rest.html') : 'rest.html' },
  { id: 'har', name: 'HAR Analyzer', icon: FileCode, category: 'Debugging', status: 'active', url: chrome.runtime?.getURL ? chrome.runtime.getURL('har-analyzer.html') : 'har-analyzer.html' },
  { id: 'json', name: 'JSON Utility', icon: FileJson, category: 'Utilities', status: 'active', url: chrome.runtime?.getURL ? chrome.runtime.getURL('json-utility.html') : 'json-utility.html' },
  // Browser Logs temporarily disabled - not ready for production
  // { id: 'logs', name: 'Browser Logs', icon: FileText, category: 'Debugging', status: 'active', url: chrome.runtime?.getURL ? chrome.runtime.getURL('logs.html') : 'logs.html' },
];

const copyText = async (value) => {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch (err) {
    console.error('Unable to copy value', err);
  }
};

const formatXml = (xml) => {
  if (!xml) return '';
  const PADDING = '  ';
  let pad = 0;
  return xml
    .replace(/>\s+</g, '><')
    .replace(/</g, '~::~<')
    .split('~::~')
    .map((node) => {
      if (!node) return '';
      if (node.match(/^<\/\w/)) pad -= 1;
      const line = `${PADDING.repeat(Math.max(pad, 0))}${node}`;
      if (node.match(/^<\w([^>]*[^/])?>.*$/) && !node.includes('</')) pad += 1;
      return line;
    })
    .join('\n')
    .trim();
};

const decodeBase64 = (input) => {
  const cleaned = input.replace(/\s+/g, '');
  if (!cleaned) return '';
  const padLength = cleaned.length % 4 ? 4 - (cleaned.length % 4) : 0;
  const payload = cleaned + '='.repeat(padLength);
  try {
    return atob(payload);
  } catch {
    throw new Error('Could not Base64 decode payload');
  }
};

const getNodeText = (parent, selector) => parent?.querySelector(selector)?.textContent?.trim() || '';

// Parse X.509 certificate - synchronous initial parse, async enhancement
const parseCertificate = (certRaw) => {
  if (!certRaw) return null;
  try {
    // Format PEM certificate
    const cleaned = certRaw.replace(/\s+/g, '');
    const pem = `-----BEGIN CERTIFICATE-----\n${cleaned.match(/.{1,64}/g)?.join('\n') || cleaned}\n-----END CERTIFICATE-----`;
    
    // Decode base64 to binary
    const binaryString = atob(cleaned);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Parse ASN.1 DER structure to extract certificate fields
    // X.509 certificate is: SEQUENCE { tbsCertificate, signatureAlgorithm, signature }
    // tbsCertificate contains: version, serialNumber, signature, issuer, validity, subject, ...
    
    let subject = '—';
    let serialNumber = '—';
    let thumbprint = '—';
    
    // Use TextDecoder to convert bytes to string for pattern matching
    const decoder = new TextDecoder('latin1', { fatal: false });
    const certStr = decoder.decode(bytes);
    
    // Extract Subject DN - improved ASN.1 parsing
    // Subject is encoded as a SEQUENCE of SET of SEQUENCE { OID, value }
    // The CN value appears as readable text in the decoded certificate
    
    // Method 1: Look for CN= pattern (most common)
    let cnMatch = certStr.match(/CN\s*=\s*([^,\x00\n<>]+)/i);
    if (!cnMatch) {
      // Method 2: Look for common name without = sign
      cnMatch = certStr.match(/(?:^|[^A-Za-z])CN\s+([A-Za-z0-9._-]+)/i);
    }
    if (!cnMatch) {
      // Method 3: Look for domain-like patterns that might be CN
      cnMatch = certStr.match(/([a-z0-9][a-z0-9.-]+\.[a-z]{2,})/i);
    }
    
    if (cnMatch) {
      const cnValue = cnMatch[1] || cnMatch[0];
      // Try to extract full Distinguished Name
      const cnIndex = certStr.indexOf(cnMatch[0]);
      if (cnIndex > 0) {
        // Look in a wider window to find full DN
        const windowStart = Math.max(0, cnIndex - 200);
        const windowEnd = Math.min(certStr.length, cnIndex + 400);
        const window = certStr.substring(windowStart, windowEnd);
        
        // Try multiple DN patterns
        const dnPatterns = [
          /(?:CN|OU|O|L|ST|C|DC|EMAIL|E|UID)\s*=\s*[^,\x00\n<>]+(?:\s*,\s*(?:CN|OU|O|L|ST|C|DC|EMAIL|E|UID)\s*=\s*[^,\x00\n<>]+)*/i,
          /(?:CN|OU|O|L|ST|C|DC|EMAIL|E|UID)=[^,\x00\n<>]+(?:,\s*[A-Z]+=[^,\x00\n<>]+)*/i,
        ];
        
        let fullDnMatch = null;
        for (const pattern of dnPatterns) {
          fullDnMatch = window.match(pattern);
          if (fullDnMatch) break;
        }
        
        if (fullDnMatch) {
          subject = fullDnMatch[0]
            .replace(/\x00/g, '')
            .replace(/\s+/g, ' ')
            .replace(/,/g, ', ')
            .trim();
        } else {
          // Just CN with the found value
          subject = `CN=${cnValue.replace(/\x00/g, '').trim()}`;
        }
      } else {
        subject = `CN=${cnValue.replace(/\x00/g, '').trim()}`;
      }
    }
    
    // Extract Serial Number from ASN.1 structure
    // X.509 certificate structure: SEQUENCE { tbsCertificate, signatureAlgorithm, signature }
    // tbsCertificate: SEQUENCE { [0] EXPLICIT Version (optional), INTEGER serialNumber, ... }
    // Note: Version is context-specific tag (0xa0 or 0xa1), not INTEGER
    // Serial number is the FIRST INTEGER in tbsCertificate
    
    // Find the start of tbsCertificate (first SEQUENCE, tag 0x30)
    let tbsStart = -1;
    let tbsLength = 0;
    for (let i = 0; i < bytes.length - 5; i++) {
      if (bytes[i] === 0x30) {
        // Found SEQUENCE tag
        let len = bytes[i + 1];
        let lenBytes = 1;
        if (len & 0x80) {
          lenBytes = len & 0x7F;
          if (lenBytes > 0 && lenBytes <= 4 && i + 2 + lenBytes < bytes.length) {
            len = 0;
            for (let j = 0; j < lenBytes; j++) {
              len = (len << 8) | bytes[i + 2 + j];
            }
            tbsLength = len;
          }
        } else {
          tbsLength = len;
        }
        tbsStart = i;
        break;
      }
    }
    
    if (tbsStart >= 0) {
      // Parse tbsCertificate to find serial number
      // Skip the SEQUENCE tag and length
      let pos = tbsStart;
      if (bytes[pos] === 0x30) {
        pos++;
        let len = bytes[pos];
        if (len & 0x80) {
          const lenBytes = len & 0x7F;
          pos += 1 + lenBytes;
        } else {
          pos += 1;
        }
      }
      
      // Skip optional version field (context-specific tag 0xa0 or 0xa1)
      if (pos < bytes.length && (bytes[pos] === 0xa0 || bytes[pos] === 0xa1)) {
        pos++; // Skip context tag
        let len = bytes[pos];
        let lenBytes = 1;
        if (len & 0x80) {
          lenBytes = len & 0x7F;
          if (lenBytes > 0 && lenBytes <= 4 && pos + 1 + lenBytes < bytes.length) {
            len = 0;
            for (let j = 0; j < lenBytes; j++) {
              len = (len << 8) | bytes[pos + 1 + j];
            }
            pos += 1 + lenBytes + len; // Skip version field
          } else {
            pos += 1 + len; // Single byte length
          }
        } else {
          pos += 1 + len; // Skip version field
        }
      }
      
      // Now look for the first INTEGER (serial number)
      if (pos < bytes.length && bytes[pos] === 0x02) {
        // Found INTEGER tag (serial number)
        pos++;
        let length = bytes[pos];
        let valueStart = pos + 1;
        
        // Handle ASN.1 length encoding
        if (length & 0x80) {
          const lengthBytes = length & 0x7F;
          if (lengthBytes > 0 && lengthBytes <= 4 && pos + 1 + lengthBytes < bytes.length) {
            length = 0;
            for (let j = 0; j < lengthBytes; j++) {
              length = (length << 8) | bytes[pos + 1 + j];
            }
            valueStart = pos + 1 + lengthBytes;
          } else {
            length = 0; // Invalid
          }
        }
        
        // Extract serial number bytes
        if (length > 0 && length <= 20 && valueStart + length < bytes.length) {
          const serialBytes = bytes.slice(valueStart, valueStart + length);
          
          // Convert to hex string (lowercase, no delimiters, preserve leading zeros)
          serialNumber = Array.from(serialBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
            .toLowerCase();
        }
      }
    }
    
    // Fallback: if we didn't find it, try finding all INTEGERs and pick the most likely one
    if (serialNumber === '—') {
      const candidates = [];
      for (let i = 0; i < bytes.length - 10; i++) {
        if (bytes[i] === 0x02) {
          let length = bytes[i + 1];
          let valueStart = i + 2;
          
          if (length & 0x80) {
            const lengthBytes = length & 0x7F;
            if (lengthBytes > 0 && lengthBytes <= 4 && i + 2 + lengthBytes < bytes.length) {
              length = 0;
              for (let j = 0; j < lengthBytes; j++) {
                length = (length << 8) | bytes[i + 2 + j];
              }
              valueStart = i + 2 + lengthBytes;
            } else {
              continue;
            }
          }
          
          if (length > 0 && length <= 20 && valueStart + length < bytes.length) {
            const serialBytes = bytes.slice(valueStart, valueStart + length);
            const hasNonZero = serialBytes.some(b => b !== 0);
            if (hasNonZero && length >= 4 && length <= 16) {
              candidates.push({
                bytes: serialBytes,
                length: length,
                position: i
              });
            }
          }
        }
      }
      
      // Pick the candidate that's most likely the serial number
      // Usually it's one of the first few INTEGERs and has reasonable size
      if (candidates.length > 0) {
        // Prefer candidates that are early in the certificate and have 8-16 bytes
        const best = candidates.find(c => c.length >= 8 && c.length <= 16) || candidates[0];
        serialNumber = Array.from(best.bytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .toLowerCase();
      }
    }
    
    // Calculate thumbprint (SHA-1 hash) synchronously using a simple approach
    // For accurate SHA-1, we'll enhance it async, but provide a placeholder
    // The thumbprint will be calculated async and updated
    
    return {
      pem,
      raw: cleaned,
      snippet: cleaned ? `${cleaned.slice(0, 32)}…${cleaned.slice(-16)}` : '',
      subject,
      serialNumber,
      thumbprint, // Will be enhanced async
      bytes, // Store bytes for async thumbprint calculation
    };
  } catch (error) {
    console.error('Certificate parsing error:', error);
    return null;
  }
};

// Enhance certificate with thumbprint (async)
const enhanceCertificate = async (cert) => {
  if (!cert || !cert.bytes) return cert;
  try {
    // Calculate SHA-1 thumbprint
    const hashBuffer = await crypto.subtle.digest('SHA-1', cert.bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const thumbprint = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    return { ...cert, thumbprint };
  } catch (error) {
    console.error('Thumbprint calculation error:', error);
    return cert;
  }
};

const parseSaml = (xml) => {
  if (!xml.trim()) {
    return { error: '', assertionXml: '', attributes: [], certificates: [], meta: {}, samlInfo: {}, signature: {} };
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    return { error: 'XML parser error - check for malformed assertion.', assertionXml: xml, attributes: [], certificates: [], meta: {}, samlInfo: {}, signature: {} };
  }

  const assertion = doc.getElementsByTagNameNS('*', 'Assertion')[0];
  const request = doc.getElementsByTagNameNS('*', 'AuthnRequest')[0] || doc.getElementsByTagNameNS('*', 'LogoutRequest')[0];
  const response = doc.getElementsByTagNameNS('*', 'Response')[0];
  
  // Determine message type
  const messageType = response ? 'Response' : request ? 'Request' : 'Assertion';
  const responseId = response?.getAttribute('ID') || '';
  const assertionId = assertion?.getAttribute('ID') || '';
  
  const issuer = getNodeText(doc, 'Issuer') || request?.getAttribute('Issuer') || response?.getAttribute('Issuer') || '';
  const subject = getNodeText(doc, 'Subject NameID');
  const audience = getNodeText(doc, 'AudienceRestriction Audience');
  const issueInstant = assertion?.getAttribute('IssueInstant') || request?.getAttribute('IssueInstant') || response?.getAttribute('IssueInstant') || '';
  const conditions = assertion?.getElementsByTagNameNS('*', 'Conditions')[0];
  const notBefore = conditions?.getAttribute('NotBefore') || '';
  const notOnOrAfter = conditions?.getAttribute('NotOnOrAfter') || '';

  // Subject Confirmation
  const subjectConfirmation = doc.querySelector('SubjectConfirmation')?.getAttribute('Method') || '';
  
  // Digest and Signature Methods
  const signatureMethod = doc.querySelector('[Algorithm*="SignatureMethod"]')?.getAttribute('Algorithm') || '';
  const digestMethod = doc.querySelector('[Algorithm*="DigestMethod"]')?.getAttribute('Algorithm') || '';

  // SAML Protocol Info
  const samlVersion = assertion?.getAttribute('Version') || request?.getAttribute('Version') || response?.getAttribute('Version') || '2.0';
  const samlProtocol = assertion?.namespaceURI || request?.namespaceURI || response?.namespaceURI || '';
  const binding = request?.getAttribute('ProtocolBinding') || '';
  const destination = request?.getAttribute('Destination') || response?.getAttribute('Destination') || '';
  const acsUrl = request?.getAttribute('AssertionConsumerServiceURL') || '';
  const nameIdFormat = doc.querySelector('NameID')?.getAttribute('Format') || '';

  // Attributes with full claim URLs - search in all namespaces
  let attributeNodes = [];
  if (assertion) {
    // Try multiple approaches to find attributes
    attributeNodes = Array.from(assertion.getElementsByTagName('Attribute'));
    if (attributeNodes.length === 0) {
      // Try with namespace
      const attrStmt = assertion.getElementsByTagNameNS('*', 'AttributeStatement')[0] || assertion.getElementsByTagName('AttributeStatement')[0];
      if (attrStmt) {
        attributeNodes = Array.from(attrStmt.getElementsByTagName('Attribute'));
      }
    }
  }
  
  const attributes = attributeNodes.map((node) => {
    const name = node.getAttribute('Name') || node.getAttribute('FriendlyName') || 'Attribute';
    const valueNodes = Array.from(node.getElementsByTagName('AttributeValue'));
    const values = valueNodes.map((attr) => attr.textContent?.trim() || '');
    return { name, values };
  });

  // Certificates - parse synchronously, will be enhanced async in component
  const certificateNodes = Array.from(doc.getElementsByTagNameNS('*', 'X509Certificate'));
  const certificates = certificateNodes.map((node) => {
    const raw = node.textContent?.replace(/\s+/g, '') ?? '';
    const parsed = parseCertificate(raw);
    if (parsed) {
      // Remove bytes from the returned object to avoid storing large binary data
      const { bytes, ...cert } = parsed;
      return cert;
    }
    return { raw, snippet: raw ? `${raw.slice(0, 32)}…${raw.slice(-16)}` : '', pem: '', subject: '—', serialNumber: '—', thumbprint: '—' };
  });

  // Signature status
  const responseSignature = response?.getElementsByTagNameNS('*', 'Signature')[0];
  const assertionSignature = assertion?.getElementsByTagNameNS('*', 'Signature')[0];
  const responseSigned = !!responseSignature;
  const assertionSigned = !!assertionSignature;

  return {
    error: '',
    assertionXml: new XMLSerializer().serializeToString(assertion || request || response || doc),
    fullXml: xml,
    attributes,
    certificates,
    meta: { 
      issuer, 
      subject, 
      audience, 
      issueInstant, 
      notBefore, 
      notOnOrAfter, 
      signatureMethod,
      digestMethod,
      subjectConfirmation,
      assertionId,
      responseId,
    },
    samlInfo: { 
      messageType,
      samlVersion, 
      samlProtocol, 
      binding, 
      destination, 
      acsUrl, 
      nameIdFormat 
    },
    signature: {
      responseSigned,
      assertionSigned,
    },
  };
};

// XML Syntax Highlighter
const highlightXml = (xml) => {
  if (!xml) return '';
  // Escape HTML first
  let escaped = xml
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Highlight XML tags
  escaped = escaped.replace(/(&lt;)(\/?)([\w:]+)([^&]*?)(\/?&gt;)/g, (match, open, slash, tag, attrs, close) => {
    let highlighted = `<span class="text-blue-400">${open}${slash}</span><span class="text-blue-400 font-semibold">${tag}</span>`;
    
    // Highlight attributes
    if (attrs) {
      highlighted += attrs.replace(/(\w+)(=)(".*?"|'.*?')/g, (m, name, eq, value) => {
        return `<span class="text-cyan-400">${name}</span><span class="text-gray-400">${eq}</span><span class="text-orange-400">${value}</span>`;
      });
    }
    
    highlighted += `<span class="text-blue-400">${close}</span>`;
    return highlighted;
  });
  
  return escaped;
};

const evaluateStatus = ({ meta, certificates, parseError, decodeError, warnings, signature }) => {
  if (decodeError) {
    return { status: 'error', message: 'Decode failed', details: decodeError };
  }
  if (parseError) {
    return { status: 'error', message: 'Invalid XML', details: parseError };
  }
  const now = Date.now();
  const skewMs = 5 * 60 * 1000;

  const notBefore = meta.notBefore ? Date.parse(meta.notBefore) : null;
  const notOnOrAfter = meta.notOnOrAfter ? Date.parse(meta.notOnOrAfter) : null;

  if (notBefore && now + skewMs < notBefore) {
    return { status: 'warning', message: 'Not yet valid', details: `Starts ${new Date(notBefore).toLocaleString()}` };
  }

  if (notOnOrAfter && now - skewMs > notOnOrAfter) {
    return { status: 'error', message: 'Expired', details: `Expired ${new Date(notOnOrAfter).toLocaleString()}` };
  }

  if (certificates.length === 0 && signature.assertionSigned) {
    return { status: 'warning', message: 'Missing certificate', details: 'Signature present but no certificate found.' };
  }

  if (warnings && warnings.length > 0) {
    return { status: 'warning', message: 'Validation warnings', details: `${warnings.length} issue(s) found.` };
  }

  return { status: 'success', message: 'Successful', details: 'SAML message is valid.' };
};

const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffYears = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));
    if (diffYears > 0) return `${dateString} (${diffYears} year${diffYears > 1 ? 's' : ''} ago)`;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 0) return `${dateString} (${diffDays} day${diffDays > 1 ? 's' : ''} ago)`;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours > 0) return `${dateString} (${diffHours} hour${diffHours > 1 ? 's' : ''} ago)`;
    return dateString;
  } catch {
    return dateString;
  }
};

const CertificateSection = ({ certificate }) => {
  const [showPem, setShowPem] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyPem = async () => {
    await copyText(certificate.pem || certificate.raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border-2 bg-white p-5 shadow-sm" style={{ borderColor: '#fef3c7', backgroundColor: '#fffbeb' }}>
      <div className="mb-4 flex items-center gap-2">
        <Fingerprint className="h-5 w-5" style={{ color: '#f59e0b' }} />
        <h4 className="text-sm font-bold" style={{ color: '#d97706' }}>CERTIFICATE</h4>
      </div>
      <dl className="space-y-2.5">
        {[
          { label: 'Subject', value: certificate.subject || 'CN=...', fullWidth: true },
          { label: 'SerialNumber', value: certificate.serialNumber || '—', fullWidth: true },
          { label: 'Thumbprint', value: certificate.thumbprint || '—', fullWidth: true },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
            <div className="flex items-start gap-3">
              <span className="font-semibold text-gray-700 text-sm flex-shrink-0 min-w-[110px]">{item.label}:</span>
              <div className="flex-1 min-w-0">
                <div className="text-right">
                  <span className="font-mono font-semibold text-gray-900 text-sm break-words whitespace-normal inline-block" style={{ textAlign: 'right', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{item.value}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        <div className="mt-3">
          <button
            onClick={() => setShowPem(!showPem)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowPem(!showPem);
              }
            }}
            className="w-full text-left rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition flex items-center justify-between active:scale-[0.98] focus:outline-none focus:ring-2 focus:outline-none300"
            tabIndex={0}
          >
            <span>Pem</span>
            <ChevronDown className={clsx('h-3 w-3 transition-transform duration-200', showPem && 'rotate-180')} />
          </button>
          {showPem && (
            <div className="mt-2 rounded-lg border border-gray-200 bg-gray-950 p-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Certificate PEM</span>
                <button
                  onClick={handleCopyPem}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCopyPem();
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition active:scale-95 focus:outline-none focus:ring-2 focus:outline-none600"
                  tabIndex={0}
                >
                  {copied ? <CheckCircle2 className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-words overflow-auto max-h-48 leading-tight">
                {certificate.pem || certificate.raw}
              </pre>
            </div>
          )}
        </div>
      </dl>
    </div>
  );
};

const XmlViewer = ({ xml, onCopy }) => {
  const [copied, setCopied] = useState(false);
  const [lineWrap, setLineWrap] = useState(true);
  const formatted = useMemo(() => formatXml(xml), [xml]);
  const lines = formatted.split('\n');

  const handleCopy = async () => {
    await onCopy(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">DECODED</h3>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={lineWrap}
              onChange={(e) => setLineWrap(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span>Line wrap</span>
          </label>
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
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = '';
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition active:scale-95 border border-gray-200 focus:outline-none focus:ring-2 focus:outline-none300"
            tabIndex={0}
          >
            {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>
      <div className="overflow-auto bg-gray-950" style={{ maxHeight: '500px' }}>
        <pre className={clsx('p-6 text-sm leading-tight text-gray-100 font-mono', lineWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre')}>
          <code>
            {lines.map((line, index) => (
              <React.Fragment key={index}>
                <span className="inline-block w-10 select-none text-right text-gray-500 pr-4 flex-shrink-0">{index + 1}</span>
                <span 
                  className="text-gray-100"
                  dangerouslySetInnerHTML={{ __html: highlightXml(line) }}
                />
                {'\n'}
              </React.Fragment>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
};

const SAMLInspector = () => {
  const [input, setInput] = useState('');
  const [autoDecode, setAutoDecode] = useState(true);
  const [capturedMessages, setCapturedMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [viewMode, setViewMode] = useState('manual');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadCapturedMessages = async () => {
    if (!chrome.runtime) return;
    setLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({ action: 'get_saml_messages' });
      if (chrome.runtime.lastError) {
        // Background script not available or connection error - this is expected in some cases
        // Silently handle - don't log as error
        return;
      }
      if (response && response.messages) {
        setCapturedMessages(response.messages);
        if (response.messages.length > 0 && !selectedMessage) {
          setSelectedMessage(response.messages[0]);
          setInput(response.messages[0].samlData);
          setViewMode('captured');
        }
      }
    } catch (err) {
      // Only log if it's not a connection error
      if (err.message && !err.message.includes('Receiving end does not exist') && !err.message.includes('Could not establish connection')) {
        console.error('Failed to load messages', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = async () => {
    if (!chrome.runtime) return;
    try {
      await chrome.runtime.sendMessage({ action: 'clear_saml_messages' });
      if (chrome.runtime.lastError) {
        // Background script not available - clear local state anyway
        setCapturedMessages([]);
        setSelectedMessage(null);
        setInput('');
        setViewMode('manual');
        return;
      }
      setCapturedMessages([]);
      setSelectedMessage(null);
      setInput('');
      setViewMode('manual');
    } catch (err) {
      // Only log if it's not a connection error
      if (err.message && !err.message.includes('Receiving end does not exist') && !err.message.includes('Could not establish connection')) {
        console.error('Failed to clear messages', err);
      }
      // Clear local state anyway
      setCapturedMessages([]);
      setSelectedMessage(null);
      setInput('');
      setViewMode('manual');
    }
  };

  useEffect(() => {
    // Only try to load messages if chrome.runtime is available
    if (chrome.runtime && chrome.runtime.id) {
      loadCapturedMessages();
      const listener = (message, sender, sendResponse) => {
        if (message && message.type === 'SAML_MESSAGE_CAPTURED') {
          loadCapturedMessages();
        }
        return true; // Keep channel open for async response
      };
      try {
        chrome.runtime.onMessage.addListener(listener);
        return () => {
          try {
            chrome.runtime.onMessage.removeListener(listener);
          } catch (e) {
            // Ignore cleanup errors
          }
        };
      } catch (e) {
        // Ignore listener setup errors
      }
    }
  }, []);

  useEffect(() => {
    // Only set up interval if chrome.runtime is available
    if (!chrome.runtime || !chrome.runtime.id) return;
    
    const interval = setInterval(() => {
      if (viewMode === 'captured') {
        loadCapturedMessages();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [viewMode]);

  const decodeResult = useMemo(() => {
    if (!input.trim()) return { text: '', error: '' };
    if (!autoDecode) return { text: input, error: '' };
    try {
      return { text: decodeBase64(input), error: '' };
    } catch (err) {
      return { text: input, error: err.message || 'Base64 decode failed' };
    }
  }, [input, autoDecode]);

  const parsed = useMemo(() => parseSaml(decodeResult.text), [decodeResult.text]);
  
  // Enhance certificates with thumbprint async
  const [enhancedCertificates, setEnhancedCertificates] = useState(parsed.certificates);
  
  useEffect(() => {
    const enhanceCerts = async () => {
      if (parsed.certificates.length > 0) {
        const enhanced = await Promise.all(
          parsed.certificates.map(async (cert) => {
            if (cert.raw && cert.thumbprint === '—') {
              try {
                const cleaned = cert.raw.replace(/\s+/g, '');
                const binaryString = atob(cleaned);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                const hashBuffer = await crypto.subtle.digest('SHA-1', bytes);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const thumbprint = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
                return { ...cert, thumbprint };
              } catch {
                return cert;
              }
            }
            return cert;
          })
        );
        setEnhancedCertificates(enhanced);
      } else {
        setEnhancedCertificates(parsed.certificates);
      }
    };
    enhanceCerts();
  }, [parsed.certificates]);
  
  const warnings = [];
  if (decodeResult.error) warnings.push(decodeResult.error);
  if (parsed.error) warnings.push(parsed.error);
  if (!parsed.meta.notBefore || !parsed.meta.notOnOrAfter) warnings.push('Conditions (NotBefore/NotOnOrAfter) missing.');
  if (!parsed.meta.signatureMethod) warnings.push('Signature method not specified.');

  const status = evaluateStatus({
    meta: parsed.meta,
    certificates: enhancedCertificates,
    parseError: parsed.error,
    decodeError: decodeResult.error,
    warnings,
    signature: parsed.signature,
  });

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <Navigation currentPageId="saml" sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50" style={{ width: '100%', minWidth: 0 }}>
        <div className="mx-auto max-w-[1600px] w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-10">
          <div className="space-y-4 sm:space-y-6">
          {/* Professional Header with Border */}
          <header className="bg-white border border-gray-300 rounded-xl shadow-sm px-4 sm:px-6 lg:px-8 py-4 sm:py-6 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-1 sm:space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">SAML Inspector</h1>
                <p className="text-sm sm:text-base text-gray-600">
                  Decode base64 responses, inspect assertions, and automatically trace SAML requests/responses from your browser.
                </p>
              </div>
            </div>
          </header>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-0.5 bg-white p-0.5 border border-gray-300 rounded-md">
              <button
                onClick={() => {
                  setViewMode('manual');
                  setSelectedMessage(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setViewMode('manual');
                    setSelectedMessage(null);
                  }
                }}
                className={clsx(
                  'px-2 py-1 text-xs font-medium transition-colors rounded',
                  viewMode === 'manual' 
                    ? 'bg-sky-500 text-white' 
                    : 'text-gray-700 hover:bg-gray-50'
                )}
                tabIndex={0}
              >
                Manual Input
              </button>
              <button
                onClick={() => {
                  setViewMode('captured');
                  loadCapturedMessages();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setViewMode('captured');
                    loadCapturedMessages();
                  }
                }}
                className={clsx(
                  'px-2 py-1 text-xs font-medium transition-colors rounded inline-flex items-center gap-1',
                  viewMode === 'captured' 
                    ? 'bg-sky-500 text-white' 
                    : 'text-gray-700 hover:bg-gray-50'
                )}
                tabIndex={0}
              >
                <Network className="h-4 w-4" />
                Captured Messages
                {capturedMessages.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs bg-white/20 rounded-full">
                    {capturedMessages.length}
                  </span>
                )}
              </button>
            </div>
            {viewMode === 'captured' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={loadCapturedMessages}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !loading) {
                      e.preventDefault();
                      loadCapturedMessages();
                    }
                  }}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 bg-white border-[0.5px] border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-500 focus:outline-none shadow-sm hover:shadow transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:bg-gray-300"
                  tabIndex={loading ? -1 : 0}
                >
                  <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
                  Refresh
                </button>
                <button
                  onClick={clearMessages}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      clearMessages();
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 bg-white border-[0.5px] border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-500 hover:text-red-600 focus:outline-none shadow-sm hover:shadow transition-all"
                  tabIndex={0}
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All
                </button>
              </div>
            )}
          </div>

          {/* Captured Messages List */}
          {viewMode === 'captured' && (
            <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                <h2 className="text-sm sm:text-base font-semibold text-gray-900">Captured SAML Messages</h2>
              </div>
              <div className="p-4">
                {capturedMessages.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Network className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No SAML messages captured yet.</p>
                    <p className="text-xs mt-2 text-gray-400">Navigate to a SAML SSO flow to automatically capture messages.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {capturedMessages.map((msg) => (
                      <button
                        key={msg.id}
                        onClick={() => {
                          setSelectedMessage(msg);
                          setInput(msg.samlData);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedMessage(msg);
                            setInput(msg.samlData);
                          }
                        }}
                        className={clsx(
                          'w-full text-left border-[0.5px] p-4 rounded-lg transition focus:outline-none focus:border-sky-400/60',
                          selectedMessage?.id === msg.id
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        )}
                        tabIndex={0}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={clsx(
                              'px-2.5 py-1 rounded-lg text-xs font-semibold',
                              msg.type === 'request' 
                                ? 'bg-blue-100 text-blue-700' 
                                : msg.type === 'response'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            )}>
                              {msg.type.toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{msg.method} Request</p>
                              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-md">{msg.url}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(msg.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Input Section */}
          <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-1.5 sm:h-2 w-1.5 sm:w-2 rounded-full flex-shrink-0 bg-gray-400" />
                <label htmlFor="saml-input" className="text-sm sm:text-base font-semibold text-gray-900">
                  SAML TOKEN
                </label>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-gray-700">
                    <input 
                      type="checkbox" 
                      checked={autoDecode} 
                      onChange={() => setAutoDecode((prev) => !prev)} 
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" 
                    />
                    Auto Base64 Decode
                  </label>
                  <button 
                    onClick={() => {
                      setInput('');
                      setSelectedMessage(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setInput('');
                        setSelectedMessage(null);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = 'scale(0.95)';
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = '';
                    }}
                    className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border-[0.5px] border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-500 focus:outline-none shadow-sm hover:shadow transition-all inline-flex items-center gap-2"
                    tabIndex={0}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
            <textarea 
              id="saml-input"
              value={input} 
              onChange={(event) => setInput(event.target.value)} 
              placeholder="Paste SAML response (Base64 encoded) or let the extension capture it automatically" 
              className="w-full min-h-[160px] resize-none border-0 bg-white px-4 sm:px-5 lg:px-6 py-3 sm:py-4 font-mono text-xs sm:text-sm leading-relaxed text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-sky-50/30" 
            />
            {input && (
              <div className={clsx('border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4', 
                status.status === 'success' ? 'bg-success/10 border-success/40 text-success' :
                status.status === 'warning' ? 'bg-warning/10 border-warning/40 text-warning' :
                'bg-error/10 border-error/40 text-error'
              )}>
                <div className="flex items-center gap-3">
                  <span className={clsx(
                    'h-2.5 w-2.5 rounded-full',
                    status.status === 'success' ? 'bg-success' :
                    status.status === 'warning' ? 'bg-warning' : 'bg-error'
                  )} />
                  <div>
                    <p className="font-semibold text-sm">{status.message}</p>
                    <p className="text-xs text-gray-700 mt-0.5">{status.details}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Decoded XML - Full Width */}
          {input && decodeResult.text && (
            <XmlViewer xml={decodeResult.text} onCopy={copyText} />
          )}

          {/* SAML Information Panel */}
          {input && (
            <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-1.5 sm:h-2 w-1.5 sm:w-2 rounded-full flex-shrink-0 bg-gray-400" />
                  <h3 className="text-sm font-bold text-gray-900">SAML Information</h3>
                </div>
              </div>
              <div className="p-6">
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Left: SAML Claims */}
                  {parsed.attributes.length > 0 && (
                    <div className="lg:col-span-1">
                      <div className="rounded-lg border-2 bg-gradient-to-br p-5 h-full shadow-sm" style={{ borderColor: '#dbeafe', backgroundColor: '#eff6ff', background: 'linear-gradient(to bottom right, #eff6ff, #ffffff)' }}>
                          <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ListTree className="h-5 w-5" style={{ color: '#60a5fa' }} />
                              <h4 className="text-sm font-bold" style={{ color: '#3b82f6' }}>SAML Claims</h4>
                            </div>
                          <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-xs font-semibold text-gray-700">
                            {parsed.attributes.length}
                          </span>
                        </div>
                        <div className="space-y-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                          {parsed.attributes.map((attribute) => (
                            <div 
                              key={attribute.name} 
                              className="rounded-lg border border-gray-200 bg-white p-3 hover:border-gray-300 transition"
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="font-mono text-sm font-semibold text-gray-900 break-words flex-1">
                                  {attribute.name}
                                </div>
                                <button 
                                  onClick={() => copyText(attribute.values.join(', '))} 
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      copyText(attribute.values.join(', '));
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
                                  className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition active:scale-95 flex-shrink-0 focus:outline-none focus:ring-2 focus:outline-none300"
                                  tabIndex={0}
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                              <div className="space-y-1.5">
                                {attribute.values.map((value, vIdx) => (
                                  <div 
                                    key={vIdx}
                                    className="text-sm text-gray-700 bg-gray-50 rounded px-2.5 py-2 break-words leading-tight font-medium"
                                  >
                                    {value || '—'}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Right: Protocol Info & Metadata */}
                  <div className={clsx('space-y-6', parsed.attributes.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3')}>
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* COMMON / Protocol Info */}
                      <div className="rounded-lg border-2 bg-white p-5 shadow-sm" style={{ borderColor: '#e0e7ff', backgroundColor: '#f8fafc' }}>
                        <div className="mb-4 flex items-center gap-2">
                          <Info className="h-5 w-5" style={{ color: '#6366f1' }} />
                          <h4 className="text-sm font-bold" style={{ color: '#4f46e5' }}>COMMON</h4>
                        </div>
                        <dl className="space-y-2.5">
                          {[
                            { label: 'Type', value: parsed.samlInfo.messageType, fullWidth: false },
                            { label: 'Version', value: parsed.samlInfo.samlVersion, fullWidth: false },
                            { label: 'Issuer', value: parsed.meta.issuer, fullWidth: true },
                            { label: 'Destination', value: parsed.samlInfo.destination || '—', fullWidth: true },
                            { label: 'IssueInstant', value: formatRelativeTime(parsed.meta.issueInstant) || '—', fullWidth: true },
                          ].map((item) => (
                            <div key={item.label} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                              <div className="flex items-start gap-3">
                                <span className="font-semibold text-gray-700 text-sm flex-shrink-0 min-w-[110px]">{item.label}:</span>
                                <div className="flex-1 text-right">
                                  <span 
                                    className={clsx(
                                      'font-semibold text-gray-900 text-sm break-words whitespace-normal inline-block',
                                      item.fullWidth ? '' : 'truncate max-w-[140px]'
                                    )}
                                    style={{ textAlign: 'right', width: '100%' }}
                                  >
                                    {item.value}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </dl>
                      </div>

                      {/* SIGNATURE */}
                      <div className="rounded-lg border-2 bg-white p-5 shadow-sm" style={{ borderColor: '#d1fae5', backgroundColor: '#f0fdf4' }}>
                        <div className="mb-4 flex items-center gap-2">
                          <ShieldCheck className="h-5 w-5" style={{ color: '#10b981' }} />
                          <h4 className="text-sm font-bold" style={{ color: '#059669' }}>SIGNATURE</h4>
                        </div>
                        <dl className="space-y-2.5">
                          {[
                            { label: 'SAML Response', value: parsed.signature.responseSigned ? 'Signed' : 'Not signed', fullWidth: false },
                            { label: 'SAML Assertion', value: parsed.signature.assertionSigned ? 'Valid Signature' : 'Not signed', fullWidth: false },
                            { label: 'Signature Method', value: parsed.meta.signatureMethod || '—', fullWidth: true },
                            { label: 'Digest Method', value: parsed.meta.digestMethod || '—', fullWidth: true },
                          ].map((item) => (
                            <div key={item.label} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                              <div className="flex items-start gap-3">
                                <span className="font-semibold text-gray-700 text-sm flex-shrink-0 min-w-[130px]">{item.label}:</span>
                                <div className="flex-1 text-right">
                                  <span 
                                    className={clsx(
                                      'font-semibold text-sm break-words whitespace-normal inline-block',
                                      item.value === 'Valid Signature' ? 'text-success' :
                                      item.value === 'Signed' ? 'text-gray-900' : 'text-gray-600',
                                      item.fullWidth ? '' : 'truncate max-w-[140px]'
                                    )}
                                    style={{ textAlign: 'right', width: '100%' }}
                                  >
                                    {item.value}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </dl>
                      </div>
                    </div>

                      {/* CERTIFICATE & ASSERTION METADATA */}
                      <div className="grid gap-6 lg:grid-cols-2">
                        {/* CERTIFICATE */}
                        {enhancedCertificates.length > 0 && (
                          <CertificateSection certificate={enhancedCertificates[0]} />
                        )}

                      {/* ASSERTION METADATA */}
                      <div className="rounded-lg border-2 bg-white p-5 shadow-sm" style={{ borderColor: '#e9d5ff', backgroundColor: '#faf5ff' }}>
                        <div className="mb-4 flex items-center gap-2">
                          <Layers className="h-5 w-5" style={{ color: '#a855f7' }} />
                          <h4 className="text-sm font-bold" style={{ color: '#9333ea' }}>ASSERTION</h4>
                        </div>
                        <dl className="space-y-2.5">
                          {[
                            { label: 'NameID', value: parsed.meta.subject || '—', fullWidth: true },
                            { label: 'Subject Confirmation', value: parsed.meta.subjectConfirmation || '—', fullWidth: false },
                            { label: 'Audience', value: parsed.meta.audience || '—', fullWidth: true },
                            { label: 'Assertion ID', value: parsed.meta.assertionId || '—', fullWidth: true },
                          ].map((item) => (
                            <div key={item.label} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                              <div className="flex items-start gap-3">
                                <span className="font-semibold text-gray-700 text-sm flex-shrink-0 min-w-[130px]">{item.label}:</span>
                                <div className="flex-1 text-right">
                                  <span 
                                    className={clsx(
                                      'font-semibold text-gray-900 text-sm break-words whitespace-normal inline-block',
                                      item.fullWidth ? '' : 'truncate max-w-[140px]'
                                    )}
                                    style={{ textAlign: 'right', width: '100%' }}
                                  >
                                    {item.value}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </dl>
                      </div>
                    </div>

                    {/* CONDITIONS */}
                    <div className="rounded-lg border-2 bg-white p-5 shadow-sm" style={{ borderColor: '#cfe2ff', backgroundColor: '#eff6ff' }}>
                      <div className="mb-4 flex items-center gap-2">
                        <Clock className="h-5 w-5" style={{ color: '#3b82f6' }} />
                        <h4 className="text-sm font-bold" style={{ color: '#2563eb' }}>CONDITIONS</h4>
                      </div>
                      <dl className="space-y-2.5">
                        {[
                          { label: 'NotBefore', value: formatRelativeTime(parsed.meta.notBefore) || '—' },
                          { label: 'NotOnOrAfter', value: formatRelativeTime(parsed.meta.notOnOrAfter) || '—' },
                        ].map((item) => (
                          <div key={item.label} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                            <div className="flex items-start gap-3">
                              <span className="font-semibold text-gray-700 text-sm flex-shrink-0 min-w-[130px]">{item.label}:</span>
                              <div className="flex-1 text-right">
                                <span className="font-semibold text-gray-900 text-sm break-words whitespace-normal inline-block" style={{ textAlign: 'right', width: '100%' }}>{item.value}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<SAMLInspector />);
