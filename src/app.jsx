import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import {
  ShieldCheck,
  Sparkles,
  Key,
  Network,
  FileCode,
  FileJson,
  Code,
  Info,
} from 'lucide-react';
// Mark that we're in Router mode
if (typeof window !== 'undefined') {
  window.__ROUTER_MODE__ = true;
  
  // Handle GitHub Pages 404.html redirect with path in query string
  // This MUST run synchronously before React Router initializes
  // The 404.html redirects to: /index.html?/jwt (for root domain)
  // We need to restore it to: /jwt
  // Note: URLSearchParams doesn't parse ?/jwt correctly, so we extract it manually
  (function() {
    try {
      const search = window.location.search;
      
      // Check if search string starts with ?/ (standard GitHub Pages SPA format)
      if (search && search.startsWith('?/')) {
        // Extract the path from the query string (remove ?/ prefix)
        const pathFromQuery = search.slice(2); // Remove '?/'
        
        if (pathFromQuery) {
          // Decode the path (replace ~& back to &, ~/ back to /)
          const decodedPath = pathFromQuery.replace(/~&/g, '&').replace(/~/g, '/');
          
          // Build the correct path: /[path] (root domain)
          const basePath = '';
          const newPath = basePath + '/' + decodedPath;
          const newUrl = newPath + window.location.hash;
          
          // CRITICAL: Replace URL BEFORE React Router reads window.location
          // Use replaceState (not pushState) to avoid adding to history
          window.history.replaceState(null, '', newUrl);
        }
      }
    } catch (error) {
      console.error('Error restoring path from 404.html redirect:', error);
    }
  })();
}

import JWTDecoder from './jwt';
import JWTEncoder from './jwt-encoder';
import SAMLInspector from './saml';
import RestTester from './rest';
import HarAnalyzer from './har-analyzer';
import JsonUtility from './json-utility';
import EncoderDecoder from './encoder-decoder';
import About from './about';
import HelpSupport from './help-support';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import { getExtensionURL } from './utils/chrome-polyfill';
import './styles.css';

// Home/Landing page
const Home = () => {
  const tools = [
    { id: 'jwt', name: 'JWT Decoder', icon: ShieldCheck, category: 'Authentication', description: 'Decode, verify, and analyze JWT tokens', path: '/jwt' },
    { id: 'jwt-encoder', name: 'JWT Encoder', icon: Sparkles, category: 'Authentication', description: 'Create and encode custom JWTs', path: '/jwt-encoder' },
    { id: 'saml', name: 'SAML Inspector', icon: Key, category: 'Authentication', description: 'Inspect and analyze SAML assertions', path: '/saml' },
    { id: 'rest', name: 'REST API Tester', icon: Network, category: 'API Testing', description: 'Test REST APIs with custom headers', path: '/rest' },
    { id: 'har', name: 'HAR Analyzer', icon: FileCode, category: 'Debugging', description: 'Analyze HTTP Archive files', path: '/har' },
    { id: 'json', name: 'JSON Utility', icon: FileJson, category: 'Utilities', description: 'Format, validate, and manipulate JSON', path: '/json' },
    { id: 'encoder-decoder', name: 'Encoder/Decoder', icon: Code, category: 'Utilities', description: 'Encode and decode using multiple formats', path: '/encoder-decoder' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="flex-1 flex flex-col">
        <div className="mx-auto max-w-[1600px] w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          <div className="space-y-6">
            <header className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm px-6 py-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">NowAssist</h1>
              <p className="text-base text-gray-600 dark:text-gray-300">
                Professional developer toolkit for ServiceNow engineers and developers. 
                Everything runs locally in your browser - your data never leaves your device.
              </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.id}
                    to={tool.path}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-md dark:hover:shadow-lg transition-shadow block"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <Icon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{tool.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{tool.description}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

                <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Info className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">100% Local Processing</h2>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                All operations happen locally in your browser. No data is sent to external servers. 
                REST API Tester and JWKS fetcher require internet, but all other tools work completely offline.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Use empty basename for root domain (nowassist.app)
  const basename = '';
  
  return (
    <ThemeProvider>
      <BrowserRouter basename={basename}>
        <div className="flex h-screen bg-white dark:bg-gray-900 overflow-hidden">
          <Navigation sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/jwt" element={<JWTDecoder />} />
          <Route path="/jwt-encoder" element={<JWTEncoder />} />
          <Route path="/saml" element={<SAMLInspector />} />
          <Route path="/rest" element={<RestTester />} />
          <Route path="/har" element={<HarAnalyzer />} />
          <Route path="/json" element={<JsonUtility />} />
          <Route path="/encoder-decoder" element={<EncoderDecoder />} />
          <Route path="/about" element={<About />} />
          <Route path="/help-support" element={<HelpSupport />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
