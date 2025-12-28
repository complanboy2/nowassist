import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, ShieldCheck, Key, Network, FileCode, FileJson, FileText, Sparkles, Code, Info, Home } from 'lucide-react';
import clsx from 'clsx';
import { getExtensionURL } from '../utils/chrome-polyfill';

const FEATURES = [
  { id: 'jwt', name: 'JWT Decoder', icon: ShieldCheck, category: 'Authentication', status: 'active', path: '/jwt', url: getExtensionURL('jwt.html') },
  { id: 'jwt-encoder', name: 'JWT Encoder', icon: Sparkles, category: 'Authentication', status: 'active', path: '/jwt-encoder', url: getExtensionURL('jwt-encoder.html') },
  { id: 'saml', name: 'SAML Inspector', icon: Key, category: 'Authentication', status: 'active', path: '/saml', url: getExtensionURL('saml.html') },
  { id: 'rest', name: 'REST API Tester', icon: Network, category: 'API Testing', status: 'active', path: '/rest', url: getExtensionURL('rest.html') },
  { id: 'har', name: 'HAR Analyzer', icon: FileCode, category: 'Debugging', status: 'active', path: '/har', url: getExtensionURL('har-analyzer.html') },
  { id: 'json', name: 'JSON Utility', icon: FileJson, category: 'Utilities', status: 'active', path: '/json', url: getExtensionURL('json-utility.html') },
  { id: 'encoder-decoder', name: 'Encoder/Decoder', icon: Code, category: 'Utilities', status: 'active', path: '/encoder-decoder', url: getExtensionURL('encoder-decoder.html') },
  // Browser Logs temporarily disabled - not ready for production
  // { id: 'logs', name: 'Browser Logs', icon: FileText, category: 'Debugging', status: 'active', path: '/logs', url: getExtensionURL('logs.html') },
];

// Professional category colors - muted, corporate-friendly
const CATEGORY_COLORS = {
  'Authentication': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  'API Testing': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Debugging': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  'Utilities': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
};

/**
 * Reusable Navigation Sidebar Component
 * Provides consistent navigation across all pages with colorful styling
 */
const Navigation = ({ currentPageId = null, sidebarOpen: controlledSidebarOpen = null, onSidebarToggle = null }) => {
  const [internalSidebarOpen, setInternalSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

  // Use controlled state if provided, otherwise use internal state
  const sidebarOpen = controlledSidebarOpen !== null ? controlledSidebarOpen : internalSidebarOpen;
  const setSidebarOpen = onSidebarToggle || setInternalSidebarOpen;

  const filteredFeatures = FEATURES.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.category.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const categories = [...new Set(FEATURES.map(f => f.category))];

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={clsx(
          'bg-white border-r-2 border-slate-200 transition-all duration-300 flex flex-col overflow-hidden z-50',
          // Mobile: overlay positioning
          'fixed lg:static inset-y-0 left-0',
          // Desktop: inline sidebar, Mobile: overlay
          sidebarOpen 
            ? 'w-64 lg:w-64' 
            : 'w-0 lg:w-0 -translate-x-full lg:translate-x-0'
        )}
      >
        {sidebarOpen && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="p-3 lg:p-4 border-b-2 border-slate-200 flex items-center justify-between">
              <h2 className="text-base lg:text-lg font-bold text-slate-900">NowAssist Tools</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition"
                aria-label="Close sidebar"
              >
                <ChevronLeft className="h-4 w-4 text-slate-600" />
              </button>
            </div>
            <div className="p-3 lg:p-4 border-b-2 border-slate-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 lg:p-4">
              {/* Home Link */}
              <div className="mb-4 lg:mb-6">
                {isExtension ? (
                  <a
                    href={getExtensionURL('index.html')}
                    onClick={() => {
                      if (window.innerWidth < 1024) {
                        setSidebarOpen(false);
                      }
                    }}
                    className={clsx(
                      'flex items-center gap-2 lg:gap-3 px-2 lg:px-3 py-2 rounded-lg transition text-sm',
                      currentPageId === 'home' || (!isExtension && location.pathname === '/')
                        ? 'bg-primary/10 text-primary'
                        : 'text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <Home className="h-4 w-4 flex-shrink-0" />
                    <span>Home</span>
                  </a>
                ) : (
                  <Link
                    to="/"
                    onClick={() => {
                      if (window.innerWidth < 1024) {
                        setSidebarOpen(false);
                      }
                    }}
                    className={clsx(
                      'flex items-center gap-2 lg:gap-3 px-2 lg:px-3 py-2 rounded-lg transition text-sm',
                      location.pathname === '/' || location.pathname === ''
                        ? 'bg-primary/10 text-primary'
                        : 'text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <Home className="h-4 w-4 flex-shrink-0" />
                    <span>Home</span>
                  </Link>
                )}
              </div>
              
              {/* Separator */}
              <div className="border-t border-gray-200 my-4 lg:my-6"></div>
              
              {categories.map((category, categoryIndex) => {
                const categoryFeatures = filteredFeatures.filter(f => f.category === category);
                if (categoryFeatures.length === 0) return null;
                return (
                  <div key={category}>
                    {categoryIndex > 0 && (
                      <div className="border-t border-gray-200 my-4 lg:my-6"></div>
                    )}
                    <div className="mb-4 lg:mb-6">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        {category}
                      </h3>
                      <div className="space-y-1">
                        {categoryFeatures.map(feature => {
                          const Icon = feature.icon;
                          const isActive = currentPageId === feature.id || (!isExtension && location.pathname === feature.path);
                          const linkClasses = clsx(
                            'flex items-center gap-2 lg:gap-3 px-2 lg:px-3 py-2 rounded-lg transition text-sm',
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-slate-700 hover:bg-slate-100'
                          );
                          const onClick = () => {
                            if (window.innerWidth < 1024) {
                              setSidebarOpen(false);
                            }
                          };
                          
                          if (isExtension) {
                            return (
                              <a
                                key={feature.id}
                                href={feature.url}
                                onClick={onClick}
                                className={linkClasses}
                              >
                                <Icon className="h-4 w-4 flex-shrink-0" />
                                <span>{feature.name}</span>
                              </a>
                            );
                          } else {
                            return (
                              <Link
                                key={feature.id}
                                to={feature.path || '#'}
                                onClick={onClick}
                                className={linkClasses}
                              >
                                <Icon className="h-4 w-4 flex-shrink-0" />
                                <span>{feature.name}</span>
                              </Link>
                            );
                          }
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* About Link */}
              <div className="border-t border-gray-200 my-4 lg:my-6"></div>
              <div>
                {isExtension ? (
                  <a
                    href={getExtensionURL('about.html')}
                    onClick={() => {
                      if (window.innerWidth < 1024) {
                        setSidebarOpen(false);
                      }
                    }}
                    className={clsx(
                      'flex items-center gap-2 lg:gap-3 px-2 lg:px-3 py-2 rounded-lg transition text-sm',
                      currentPageId === 'about'
                        ? 'bg-primary/10 text-primary'
                        : 'text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <Info className="h-4 w-4 flex-shrink-0" />
                    <span>About</span>
                  </a>
                ) : (
                  <Link
                    to="/about"
                    onClick={() => {
                      if (window.innerWidth < 1024) {
                        setSidebarOpen(false);
                      }
                    }}
                    className={clsx(
                      'flex items-center gap-2 lg:gap-3 px-2 lg:px-3 py-2 rounded-lg transition text-sm',
                      location.pathname === '/about'
                        ? 'bg-primary/10 text-primary'
                        : 'text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <Info className="h-4 w-4 flex-shrink-0" />
                    <span>About</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Collapsed sidebar button */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-0 top-4 z-50 rounded-r-lg bg-white p-2 shadow-lg border-r border-t border-b border-slate-200 transition hover:bg-slate-50"
          aria-label="Open sidebar"
        >
          <ChevronRight className="h-4 w-4 text-slate-600" />
        </button>
      )}
    </>
  );
};

export default Navigation;
