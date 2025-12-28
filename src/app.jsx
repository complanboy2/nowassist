import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
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
}

import JWTDecoder from './jwt';
import JWTEncoder from './jwt-encoder';
import SAMLInspector from './saml';
import RestTester from './rest';
import HarAnalyzer from './har-analyzer';
import JsonUtility from './json-utility';
import EncoderDecoder from './encoder-decoder';
import About from './about';
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
    <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col">
      <div className="flex-1 flex flex-col">
        <div className="mx-auto max-w-[1600px] w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          <div className="space-y-6">
            <header className="bg-white border border-gray-300 rounded-xl shadow-sm px-6 py-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-3">NowAssist</h1>
              <p className="text-base text-gray-600">
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
                    className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow block"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-gray-100 rounded-lg">
                        <Icon className="h-6 w-6 text-gray-700" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{tool.name}</h3>
                        <p className="text-sm text-gray-600">{tool.description}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Info className="h-6 w-6 text-sky-600" />
                <h2 className="text-xl font-bold text-gray-900">100% Local Processing</h2>
              </div>
              <p className="text-sm text-gray-700">
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
  // Use basename for GitHub Pages subdirectory
  const basename = '/nowassist';
  
  return (
    <BrowserRouter basename={basename}>
      <div className="flex h-screen bg-white overflow-hidden">
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
