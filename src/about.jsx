import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Key,
  Network,
  FileCode,
  FileJson,
  Sparkles,
  Code,
  Heart,
  Github,
  Globe,
  Lock,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import clsx from 'clsx';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import './styles.css';

const FEATURES = [
  {
    id: 'jwt',
    name: 'JWT Decoder',
    icon: ShieldCheck,
    category: 'Authentication',
    description: 'Decode, verify, and analyze JSON Web Tokens with comprehensive security insights. View token structure, validate signatures, check expiration, and understand key claims.',
    features: [
      'Decode JWT header, payload, and signature',
      'Verify signatures with HMAC, RSA, and ECDSA algorithms',
      'Time simulation for testing token validity',
      'Key claims extraction with ServiceNow and Salesforce insights',
      'JWKS support for automatic key retrieval',
      'Token comparison and redaction tools',
      'Security analysis with risk assessment',
    ],
  },
  {
    id: 'jwt-encoder',
    name: 'JWT Encoder',
    icon: Sparkles,
    category: 'Authentication',
    description: 'Create and encode JSON Web Tokens with custom headers and payloads. Generate signed tokens using various algorithms or create unsigned tokens for testing.',
    features: [
      'Custom header and payload configuration',
      'Support for HMAC, RSA, ECDSA, and unsigned algorithms',
      'PEM and JWK key format support',
      'Example tokens for all algorithms',
      'Copy headers, payloads, and generated tokens',
    ],
  },
  {
    id: 'saml',
    name: 'SAML Inspector',
    icon: Key,
    category: 'Authentication',
    description: 'Inspect and analyze SAML assertions and responses. Decode Base64-encoded SAML messages, view XML structure, extract attributes, and verify certificates.',
    features: [
      'Base64 decode SAML messages',
      'Pretty-print XML structure',
      'Extract SAML attributes and claims',
      'Certificate validation and expiration checks',
      'Clock skew detection',
      'Signature verification',
    ],
  },
  {
    id: 'rest',
    name: 'REST API Tester',
    icon: Network,
    category: 'API Testing',
    description: 'Test REST APIs directly from your browser. Send HTTP requests with custom headers, authentication, and request bodies. View responses with syntax highlighting and code generation.',
    features: [
      'All HTTP methods (GET, POST, PUT, PATCH, DELETE)',
      'Multiple authentication types (Basic, Bearer, OAuth 2.0)',
      'Custom headers and query parameters',
      'Request/response history',
      'Code generation for multiple languages',
      'Syntax-highlighted JSON responses',
      'Request latency tracking',
    ],
  },
  {
    id: 'har',
    name: 'HAR Analyzer',
    icon: FileCode,
    category: 'Debugging',
    description: 'Analyze HTTP Archive (HAR) files to debug network requests. Inspect request/response headers, payloads, timing, and performance metrics.',
    features: [
      'Upload and parse HAR files',
      'Filter and search requests',
      'View detailed request/response data',
      'Performance metrics and timing analysis',
      'Export filtered data',
    ],
  },
  {
    id: 'json',
    name: 'JSON Utility',
    icon: FileJson,
    category: 'Utilities',
    description: 'Comprehensive JSON toolkit for formatting, validating, transforming, and analyzing JSON data. Includes formatting, minification, sorting, flattening, and diffing capabilities.',
    features: [
      'Format and minify JSON',
      'Validate JSON syntax',
      'Sort keys alphabetically',
      'Flatten and unflatten JSON structures',
      'Tree view navigation',
      'JSON diff with inline highlighting',
      'Export differences',
    ],
  },
  {
    id: 'encoder-decoder',
    name: 'Encoder/Decoder',
    icon: Code,
    category: 'Utilities',
    description: 'Encode and decode text using various encoding schemes. Support for Base64, Base64URL, Base32, URL encoding, HTML entities, Hexadecimal, ASCII, and UTF-8.',
    features: [
      'Multiple encoding types (Base64, Base32, URL, HTML, Hex, ASCII, UTF-8)',
      'Bidirectional encode/decode',
      'Real-time conversion',
      'Copy input and output',
      'Clean, professional interface',
    ],
  },
];

const About = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <Navigation currentPageId="about" sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50" style={{ width: '100%', minWidth: 0 }}>
        <div className="mx-auto max-w-[1600px] w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="space-y-3 sm:space-y-4">
            {/* Header */}
            <header className="bg-white border border-gray-300 rounded-xl shadow-sm px-4 sm:px-5 py-3 mb-3">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">About NowAssist</h1>
            </header>

            {/* Main Motto Section */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 sm:p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-sky-100 rounded-xl">
                    <Zap className="h-8 w-8 text-sky-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                      Everything Happens in Your Browser
                    </h2>
                    <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
                      NowAssist is a powerful Chrome extension designed for developers who value privacy, speed, and convenience. 
                      All processing happens locally in your browser—no data is sent to external servers, ensuring your sensitive 
                      tokens, API keys, and credentials remain completely private and secure.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <Lock className="h-6 w-6 text-gray-700 mb-2" />
                    <h3 className="font-semibold text-gray-900 mb-1">100% Private</h3>
                    <p className="text-sm text-gray-600">All data stays in your browser. No cloud processing, no external servers.</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <Zap className="h-6 w-6 text-gray-700 mb-2" />
                    <h3 className="font-semibold text-gray-900 mb-1">Lightning Fast</h3>
                    <p className="text-sm text-gray-600">Instant results with no network latency. Process data in real-time.</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <Globe className="h-6 w-6 text-gray-700 mb-2" />
                    <h3 className="font-semibold text-gray-900 mb-1">Works Offline</h3>
                    <p className="text-sm text-gray-600">No internet connection required. Perfect for local development and debugging.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Features Section */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Features</h2>
                <p className="text-sm text-gray-600 mt-1">Comprehensive developer tools at your fingertips</p>
              </div>
              <div className="p-4 sm:p-6">
                <div className="space-y-6">
                  {FEATURES.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <div
                        key={feature.id}
                        className={clsx(
                          'border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow',
                          index !== FEATURES.length - 1 && 'mb-4'
                        )}
                      >
                        <div className="flex items-start gap-4 mb-4">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <Icon className="h-6 w-6 text-gray-700" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg sm:text-xl font-bold text-gray-900">{feature.name}</h3>
                              <span className="px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-100 rounded">
                                {feature.category}
                              </span>
                            </div>
                            <p className="text-sm sm:text-base text-gray-700 mb-4">{feature.description}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {feature.features.map((feat, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm text-gray-600">{feat}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Built with Love Section */}
            <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 sm:p-8 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Heart className="h-6 w-6 text-red-500 fill-red-500" />
                  <span className="text-xl sm:text-2xl font-bold text-gray-900">
                    Built with Love for Developers
                  </span>
                  <Heart className="h-6 w-6 text-red-500 fill-red-500" />
                </div>
                <p className="text-sm sm:text-base text-gray-700 max-w-2xl mx-auto">
                  NowAssist is crafted by developers, for developers. We understand the pain points of debugging, 
                  testing, and working with authentication tokens. Every feature is designed to save you time and 
                  make your workflow smoother.
                </p>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
};

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<About />);

