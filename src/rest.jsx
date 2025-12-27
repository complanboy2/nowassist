import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Network,
  Play,
  Search,
  ShieldCheck,
  Key,
  Globe,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  FileCode,
  FileJson,
  History,
  Trash2,
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

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const AUTH_TYPES = ['None', 'Basic', 'Bearer Token', 'OAuth 2.0'];

const copyText = async (text) => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Copy failed', err);
  }
};

const RestTester = () => {
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [headers, setHeaders] = useState([{ key: '', value: '' }]);
  const [body, setBody] = useState('');
  const [authType, setAuthType] = useState('None');
  const [authValue, setAuthValue] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodMenuOpen, setMethodMenuOpen] = useState(false);
  const [authTypeMenuOpen, setAuthTypeMenuOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [codeGenOpen, setCodeGenOpen] = useState(false); // Collapsed by default
  const [selectedLanguage, setSelectedLanguage] = useState('javascript-fetch');
  const [codeLangMenuOpen, setCodeLangMenuOpen] = useState(false);
  const methodMenuRef = useRef(null);
  const authTypeMenuRef = useRef(null);
  const historyMenuRef = useRef(null);
  const codeLangMenuRef = useRef(null);

  const filteredFeatures = FEATURES.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.category.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const categories = [...new Set(FEATURES.map(f => f.category))];

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const updateHeader = (index, field, value) => {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;
    setHeaders(newHeaders);
  };

  const removeHeader = (index) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  // Keyboard navigation for dropdowns
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (methodMenuOpen) setMethodMenuOpen(false);
        if (authTypeMenuOpen) setAuthTypeMenuOpen(false);
        if (historyOpen) setHistoryOpen(false);
        if (codeLangMenuOpen) setCodeLangMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [methodMenuOpen, authTypeMenuOpen, historyOpen]);

  // Load history from storage on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        if (chrome?.storage?.local) {
          const result = await chrome.storage.local.get(['restApiHistory']);
          if (result.restApiHistory) {
            setHistory(result.restApiHistory);
          }
        } else {
          // Fallback to localStorage for development
          const saved = localStorage.getItem('restApiHistory');
          if (saved) {
            setHistory(JSON.parse(saved));
          }
        }
      } catch (err) {
        console.error('Failed to load history:', err);
      }
    };
    loadHistory();
  }, []);

  // Save history to storage
  const saveHistory = async (requestData) => {
    try {
      const newHistoryItem = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...requestData,
      };
      const updatedHistory = [newHistoryItem, ...history].slice(0, 100); // Keep last 100
      setHistory(updatedHistory);
      
      if (chrome?.storage?.local) {
        await chrome.storage.local.set({ restApiHistory: updatedHistory });
      } else {
        localStorage.setItem('restApiHistory', JSON.stringify(updatedHistory));
      }
    } catch (err) {
      console.error('Failed to save history:', err);
    }
  };

  // Load request from history
  const loadFromHistory = (historyItem) => {
    setUrl(historyItem.url || '');
    setMethod(historyItem.method || 'GET');
    setHeaders(historyItem.headers || [{ key: '', value: '' }]);
    setBody(historyItem.body || '');
    setAuthType(historyItem.authType || 'None');
    setAuthValue(historyItem.authValue || '');
    setHistoryOpen(false);
  };

  // Clear history
  const clearHistory = async () => {
    try {
      setHistory([]);
      if (chrome?.storage?.local) {
        await chrome.storage.local.remove('restApiHistory');
      } else {
        localStorage.removeItem('restApiHistory');
      }
      setHistoryOpen(false);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  // Click outside detection for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (methodMenuRef.current && !methodMenuRef.current.contains(event.target)) {
        setMethodMenuOpen(false);
      }
      if (authTypeMenuRef.current && !authTypeMenuRef.current.contains(event.target)) {
        setAuthTypeMenuOpen(false);
      }
      if (historyMenuRef.current && !historyMenuRef.current.contains(event.target)) {
        setHistoryOpen(false);
      }
      if (codeLangMenuRef.current && !codeLangMenuRef.current.contains(event.target)) {
        setCodeLangMenuOpen(false);
      }
    };
    if (methodMenuOpen || authTypeMenuOpen || historyOpen || codeLangMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [methodMenuOpen, authTypeMenuOpen, historyOpen, codeLangMenuOpen]);

  const sendRequest = async () => {
    if (!url.trim()) return;

    setLoading(true);
    setResponse(null);

    try {
      const requestHeaders = {};
      headers.forEach(({ key, value }) => {
        if (key && value) {
          requestHeaders[key] = value;
        }
      });

      if (authType === 'Basic' && authValue) {
        requestHeaders['Authorization'] = `Basic ${btoa(authValue)}`;
      } else if (authType === 'Bearer Token' && authValue) {
        requestHeaders['Authorization'] = `Bearer ${authValue}`;
      }

      const startTime = Date.now();
      const fetchOptions = {
        method,
        headers: requestHeaders,
      };

      if (method !== 'GET' && body) {
        fetchOptions.body = body;
        if (!requestHeaders['Content-Type']) {
          requestHeaders['Content-Type'] = 'application/json';
        }
      }

      const res = await fetch(url, fetchOptions);
      const endTime = Date.now();
      const latency = endTime - startTime;

      let responseBody;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseBody = await res.json();
      } else {
        responseBody = await res.text();
      }

      const responseData = {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        body: responseBody,
        latency,
        ok: res.ok,
      };
      setResponse(responseData);

      // Save to history
      await saveHistory({
        url,
        method,
        headers,
        body,
        authType,
        authValue,
        response: responseData,
      });
    } catch (error) {
      const errorResponse = {
        error: error.message,
        ok: false,
      };
      setResponse(errorResponse);

      // Save error to history too
      await saveHistory({
        url,
        method,
        headers,
        body,
        authType,
        authValue,
        response: errorResponse,
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(item => {
    if (!historySearchQuery) return true;
    const query = historySearchQuery.toLowerCase();
    return (
      item.url?.toLowerCase().includes(query) ||
      item.method?.toLowerCase().includes(query) ||
      JSON.stringify(item.headers || {}).toLowerCase().includes(query)
    );
  });

  // Generate code snippet
  const generateCode = (lang) => {
    const requestHeaders = {};
    headers.forEach(({ key, value }) => {
      if (key && value) {
        requestHeaders[key] = value;
      }
    });

    if (authType === 'Basic' && authValue) {
      requestHeaders['Authorization'] = `Basic ${btoa(authValue)}`;
    } else if (authType === 'Bearer Token' && authValue) {
      requestHeaders['Authorization'] = `Bearer ${authValue}`;
    }

    const headersStr = JSON.stringify(requestHeaders, null, 2);
    const bodyStr = body ? (body.trim().startsWith('{') ? body : JSON.stringify(body)) : '';

    switch (lang) {
      case 'javascript-fetch':
        return `fetch('${url}', {
  method: '${method}',
  headers: ${headersStr}${body && method !== 'GET' ? `,\n  body: ${bodyStr}` : ''}
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`;

      case 'javascript-axios':
        return `import axios from 'axios';

axios.${method.toLowerCase()}('${url}', ${body && method !== 'GET' ? bodyStr : '{}'}, {
  headers: ${headersStr}
})
  .then(response => console.log(response.data))
  .catch(error => console.error('Error:', error));`;

      case 'python-requests':
        return `import requests

headers = ${headersStr.replace(/\n/g, '\n  ').replace(/{/, '{').replace(/}/, '}  ')}
${body && method !== 'GET' ? `data = ${bodyStr.replace(/\n/g, '\n  ')}\n` : ''}
response = requests.${method.toLowerCase()}('${url}'${body && method !== 'GET' ? ', json=data' : ''}, headers=headers)
print(response.json())`;

      case 'curl':
        const curlHeaders = Object.entries(requestHeaders)
          .map(([k, v]) => `-H "${k}: ${v}"`)
          .join(' \\\n  ');
        const curlBody = body && method !== 'GET' ? `-d '${bodyStr.replace(/'/g, "'\\''")}'` : '';
        return `curl -X ${method} '${url}' \\
  ${curlHeaders}${curlBody ? ` \\\n  ${curlBody}` : ''}`;

      case 'go':
        const goHeaders = Object.entries(requestHeaders)
          .map(([k, v]) => `  req.Header.Set("${k}", "${v}")`)
          .join('\n');
        const goBody = body && method !== 'GET' 
          ? `  data := ${bodyStr.replace(/\n/g, '\n  ')}\n  jsonData, _ := json.Marshal(data)\n  `
          : '';
        return `package main

import (
  "bytes"
  "encoding/json"
  "net/http"
  "fmt"
)

func main() {
  url := "${url}"
${goBody}  req, _ := http.NewRequest("${method}", url, ${body && method !== 'GET' ? 'bytes.NewBuffer(jsonData)' : 'nil'})
${goHeaders}
  
  client := &http.Client{}
  resp, _ := client.Do(req)
  defer resp.Body.Close()
  
  var result map[string]interface{}
  json.NewDecoder(resp.Body).Decode(&result)
  fmt.Println(result)
}`;

      default:
        return '';
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'text-gray-500';
    if (status >= 200 && status < 300) return 'text-success';
    if (status >= 300 && status < 400) return 'text-warning';
    return 'text-error';
  };

  const getStatusIcon = (status) => {
    if (!status) return AlertCircle;
    if (status >= 200 && status < 300) return CheckCircle2;
    if (status >= 300 && status < 400) return AlertCircle;
    return XCircle;
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <Navigation currentPageId="rest" sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50" style={{ width: '100%', minWidth: 0 }}>
        <div className="mx-auto max-w-[1600px] w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-10">
          <div className="space-y-4 sm:space-y-6">
          {/* Professional Header with Border */}
          <header className="bg-white border border-gray-300 rounded-xl shadow-sm px-4 sm:px-6 lg:px-8 py-4 sm:py-6 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-1 sm:space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">REST API Tester</h1>
                <p className="text-sm sm:text-base text-gray-600">
                  Test REST APIs with custom headers, authentication, and request bodies. All requests are made from your browser.
                </p>
              </div>
            </div>
          </header>

          <div className="space-y-4 sm:space-y-6">
            {/* Request Panel */}
            <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-1.5 sm:h-2 w-1.5 sm:w-2 rounded-full flex-shrink-0 bg-gray-400" />
                    <h2 className="text-sm sm:text-base font-semibold text-gray-900">Request</h2>
                  </div>
                </div>
                <div className="p-4 sm:p-6 space-y-4">
                  <div>
                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setHistoryOpen(!historyOpen)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all focus:outline-none border-[0.5px] border-gray-300 rounded-lg shadow-sm text-gray-700 hover:bg-gray-50 hover:border-gray-400 bg-white hover:shadow"
                        tabIndex={0}
                        title="Request History"
                      >
                        <History className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">History</span>
                        {history.length > 0 && (
                          <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                            {history.length}
                          </span>
                        )}
                      </button>

                      {/* History Dropdown */}
                      {historyOpen && (
                        <div className="relative" ref={historyMenuRef}>
                          <div className="fixed inset-0 z-40" onClick={() => setHistoryOpen(false)} />
                          <div className="absolute left-0 top-full mt-2 w-full sm:w-96 max-w-[calc(100vw-2rem)] border border-gray-200 rounded-lg bg-white shadow-2xl z-50 max-h-[600px] flex flex-col">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                              <div className="flex items-center gap-2">
                                <History className="h-4 w-4 text-gray-600" />
                                <h3 className="text-sm font-semibold text-gray-900">Request History</h3>
                                {history.length > 0 && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                                    {history.length}
                                  </span>
                                )}
                              </div>
                              {history.length > 0 && (
                                <button
                                  onClick={clearHistory}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Clear all history"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">Clear</span>
                                </button>
                              )}
                            </div>
                            {history.length === 0 ? (
                              <div className="px-4 py-12 text-center text-gray-500">
                                <History className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                                <p className="text-sm">No request history yet</p>
                                <p className="text-xs mt-1">Your requests will appear here</p>
                              </div>
                            ) : (
                              <>
                                <div className="px-4 py-2 border-b border-gray-200">
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                    <input
                                      type="text"
                                      value={historySearchQuery}
                                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                                      placeholder="Search history..."
                                      className="w-full pl-8 pr-3 py-1.5 text-xs border-[0.5px] border-gray-300 rounded-lg focus:outline-none focus:border-sky-400/60"
                                    />
                                  </div>
                                </div>
                                <div className="overflow-y-auto flex-1">
                                  {filteredHistory.length === 0 ? (
                                    <div className="px-4 py-8 text-center text-gray-500 text-sm">
                                      No results found
                                    </div>
                                  ) : (
                                    <div className="divide-y divide-gray-100">
                                      {filteredHistory.map((item) => (
                                        <button
                                          key={item.id}
                                          onClick={() => loadFromHistory(item)}
                                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors group"
                                        >
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 mb-1">
                                                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 text-gray-700">
                                                  {item.method || 'GET'}
                                                </span>
                                                <span className="text-xs text-gray-500 truncate flex-1">
                                                  {new Date(item.timestamp).toLocaleString()}
                                                </span>
                                              </div>
                                              <div className="text-xs text-gray-700 truncate mb-1">
                                                {item.url || 'No URL'}
                                              </div>
                                              {item.response && (
                                                <div className="flex items-center gap-2">
                                                  {item.response.status ? (
                                                    <>
                                                      <span className={clsx(
                                                        'text-xs font-medium',
                                                        item.response.status >= 200 && item.response.status < 300
                                                          ? 'text-green-600'
                                                          : item.response.status >= 300 && item.response.status < 400
                                                          ? 'text-yellow-600'
                                                          : 'text-red-600'
                                                      )}>
                                                        {item.response.status}
                                                      </span>
                                                      {item.response.latency && (
                                                        <span className="text-xs text-gray-500 flex items-center gap-0.5">
                                                          <Clock className="h-3 w-3" />
                                                          {item.response.latency}ms
                                                        </span>
                                                      )}
                                                    </>
                                                  ) : (
                                                    <span className="text-xs text-red-600">Error</span>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="relative" ref={methodMenuRef}>
                        <button
                          type="button"
                          onClick={() => setMethodMenuOpen(!methodMenuOpen)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setMethodMenuOpen(!methodMenuOpen);
                            }
                          }}
                          className="rounded-lg border-[0.5px] border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:border-sky-400/60 cursor-pointer hover:bg-gray-50 flex items-center justify-between min-w-[100px]"
                          tabIndex={0}
                          aria-expanded={methodMenuOpen}
                        >
                          <span>{method}</span>
                          <ChevronDown className={clsx('h-4 w-4 text-gray-500 transition-transform duration-200 flex-shrink-0 ml-2', methodMenuOpen && 'rotate-180')} />
                        </button>
                        {methodMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setMethodMenuOpen(false)} />
                            <div className="absolute left-0 top-full mt-1 border border-gray-200 rounded-lg bg-white shadow-lg z-50 overflow-hidden min-w-[100px]">
                              {HTTP_METHODS.map((m) => (
                                <button
                                  key={m}
                                  onClick={() => {
                                    setMethod(m);
                                    setMethodMenuOpen(false);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      setMethod(m);
                                      setMethodMenuOpen(false);
                                    }
                                  }}
                                  className={clsx(
                                    'w-full px-3 py-2 text-left text-sm transition-colors',
                                    method === m 
                                      ? 'bg-gray-100 font-medium text-gray-900' 
                                      : 'text-gray-700 hover:bg-gray-50'
                                  )}
                                  tabIndex={0}
                                >
                                  {m}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://your-instance.service-now.com/api/now/table/incident"
                        className="flex-1 rounded-lg border-[0.5px] border-gray-300 bg-white px-3 sm:px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-sky-400/60"
                        tabIndex={0}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">Headers</label>
                      <button
                        onClick={addHeader}
                        className="text-xs text-gray-600 hover:text-gray-900 transition active:scale-95"
                        tabIndex={0}
                      >
                        + Add Header
                      </button>
                    </div>
                    <div className="space-y-2">
                      {headers.map((header, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={header.key}
                            onChange={(e) => updateHeader(index, 'key', e.target.value)}
                            placeholder="Header name"
                            className="flex-1 rounded-lg border-[0.5px] border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-sky-400/60"
                            tabIndex={0}
                          />
                          <input
                            type="text"
                            value={header.value}
                            onChange={(e) => updateHeader(index, 'value', e.target.value)}
                            placeholder="Header value"
                            className="flex-1 rounded-lg border-[0.5px] border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-sky-400/60"
                            tabIndex={0}
                          />
                          {headers.length > 1 && (
                            <button
                              onClick={() => removeHeader(index)}
                              className="rounded-lg px-2 text-gray-600 hover:bg-gray-100 transition active:scale-95"
                              tabIndex={0}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Authentication</label>
                    <div className="space-y-2">
                      <div className="relative" ref={authTypeMenuRef}>
                        <button
                          type="button"
                          onClick={() => setAuthTypeMenuOpen(!authTypeMenuOpen)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setAuthTypeMenuOpen(!authTypeMenuOpen);
                            }
                          }}
                          className="w-full text-left rounded-lg border-[0.5px] border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:border-sky-400/60 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                          tabIndex={0}
                          aria-expanded={authTypeMenuOpen}
                        >
                          <span>{authType}</span>
                          <ChevronDown className={clsx('h-4 w-4 text-gray-500 transition-transform duration-200 flex-shrink-0', authTypeMenuOpen && 'rotate-180')} />
                        </button>
                        {authTypeMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setAuthTypeMenuOpen(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1 border border-gray-200 rounded-lg bg-white shadow-lg z-50 overflow-hidden">
                              {AUTH_TYPES.map((type) => (
                                <button
                                  key={type}
                                  onClick={() => {
                                    setAuthType(type);
                                    setAuthTypeMenuOpen(false);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      setAuthType(type);
                                      setAuthTypeMenuOpen(false);
                                    }
                                  }}
                                  className={clsx(
                                    'w-full px-3 py-2 text-left text-sm transition-colors',
                                    authType === type 
                                      ? 'bg-gray-100 font-medium text-gray-900' 
                                      : 'text-gray-700 hover:bg-gray-50'
                                  )}
                                  tabIndex={0}
                                >
                                  {type}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      {authType !== 'None' && (
                        <input
                          type={authType === 'Basic' ? 'text' : 'password'}
                          value={authValue}
                          onChange={(e) => setAuthValue(e.target.value)}
                          placeholder={authType === 'Basic' ? 'username:password' : 'Token or key'}
                          className="w-full rounded-lg border-[0.5px] border-gray-300 bg-white px-3 sm:px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-sky-400/60"
                          tabIndex={0}
                        />
                      )}
                    </div>
                  </div>

                  {method !== 'GET' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Request Body</label>
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder='{"key": "value"}'
                        className="w-full min-h-[120px] rounded-lg border-[0.5px] border-gray-300 bg-white px-3 sm:px-4 py-2 sm:py-3 font-mono text-sm leading-relaxed text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-sky-400/60 focus:bg-sky-50/30 resize-none"
                        tabIndex={0}
                      />
                    </div>
                  )}

                  <button
                    onClick={sendRequest}
                    disabled={loading || !url.trim()}
                    className="w-full rounded-lg px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:bg-gray-300 focus:outline-none shadow-sm hover:shadow flex items-center justify-center gap-2"
                    tabIndex={0}
                  >
                    <Play className="h-4 w-4" />
                    {loading ? 'Sending...' : 'Send Request'}
                  </button>

                  {/* Code Generation Section */}
                  <div className="border border-gray-200 rounded-lg bg-white">
                    <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors rounded-lg">
                      <button
                        onClick={() => setCodeGenOpen(!codeGenOpen)}
                        className="flex items-center gap-2 flex-1"
                        tabIndex={0}
                      >
                        <FileCode className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-semibold text-gray-900">Generate Code</span>
                        <ChevronDown className={clsx('h-4 w-4 text-gray-500 transition-transform duration-200 ml-auto', codeGenOpen && 'rotate-180')} />
                      </button>
                      {codeGenOpen && (
                        <button
                          onClick={() => copyText(generateCode(selectedLanguage))}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold transition-all focus:outline-none border-[0.5px] border-gray-300 rounded-lg shadow-sm text-gray-700 hover:bg-gray-50 hover:border-gray-400 bg-white hover:shadow ml-2"
                          tabIndex={0}
                          title="Copy Code"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Copy</span>
                        </button>
                      )}
                    </div>
                    {codeGenOpen && (
                      <div className="border-t border-gray-200 p-4 space-y-3">
                        <div className="relative" ref={codeLangMenuRef}>
                          <button
                            type="button"
                            onClick={() => setCodeLangMenuOpen(!codeLangMenuOpen)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setCodeLangMenuOpen(!codeLangMenuOpen);
                              }
                            }}
                            className="w-full text-left rounded-lg border-[0.5px] border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:border-sky-400/60 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                            tabIndex={0}
                            aria-expanded={codeLangMenuOpen}
                          >
                            <span>
                              {selectedLanguage === 'javascript-fetch' && 'JavaScript (fetch)'}
                              {selectedLanguage === 'javascript-axios' && 'JavaScript (axios)'}
                              {selectedLanguage === 'python-requests' && 'Python (requests)'}
                              {selectedLanguage === 'curl' && 'cURL'}
                              {selectedLanguage === 'go' && 'Go'}
                            </span>
                            <ChevronDown className={clsx('h-4 w-4 text-gray-500 transition-transform duration-200 flex-shrink-0', codeLangMenuOpen && 'rotate-180')} />
                          </button>
                          {codeLangMenuOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setCodeLangMenuOpen(false)} />
                              <div className="absolute left-0 right-0 top-full mt-1 border border-gray-200 rounded-lg bg-white shadow-lg z-50 overflow-hidden">
                                {[
                                  { value: 'javascript-fetch', label: 'JavaScript (fetch)' },
                                  { value: 'javascript-axios', label: 'JavaScript (axios)' },
                                  { value: 'python-requests', label: 'Python (requests)' },
                                  { value: 'curl', label: 'cURL' },
                                  { value: 'go', label: 'Go' },
                                ].map((lang) => (
                                  <button
                                    key={lang.value}
                                    onClick={() => {
                                      setSelectedLanguage(lang.value);
                                      setCodeLangMenuOpen(false);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setSelectedLanguage(lang.value);
                                        setCodeLangMenuOpen(false);
                                      }
                                    }}
                                    className={clsx(
                                      'w-full px-3 py-2 text-left text-sm transition-colors',
                                      selectedLanguage === lang.value 
                                        ? 'bg-gray-100 font-medium text-gray-900' 
                                        : 'text-gray-700 hover:bg-gray-50'
                                    )}
                                    tabIndex={0}
                                  >
                                    {lang.label}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4 max-h-96 overflow-auto">
                          <pre className="text-sm font-mono text-gray-900 whitespace-pre-wrap leading-relaxed">
                            <code>{generateCode(selectedLanguage)}</code>
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Response Panel */}
            <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="h-1.5 sm:h-2 w-1.5 sm:w-2 rounded-full flex-shrink-0 bg-gray-400" />
                    <h2 className="text-sm sm:text-base font-semibold text-gray-900">Response</h2>
                    {response && !loading && (
                      <>
                        {(() => {
                          const StatusIcon = getStatusIcon(response.status);
                          return (
                            <StatusIcon className={clsx('h-4 w-4 sm:h-5 sm:w-5', getStatusColor(response.status))} />
                          );
                        })()}
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className={clsx('text-sm sm:text-lg font-semibold', getStatusColor(response.status))}>
                            {response.status || 'Error'}
                          </span>
                          {response.statusText && (
                            <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">{response.statusText}</span>
                          )}
                          {response.latency && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              <span>{response.latency}ms</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  {!response && !loading && (
                    <div className="text-center py-12 text-gray-500">
                      <Network className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">Send a request to see the response here</p>
                    </div>
                  )}
                  {loading && (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                      <p className="mt-3 text-sm text-gray-600">Sending request...</p>
                    </div>
                  )}
                  {response && !loading && (
                    <div className="space-y-4">
                      {response.error ? (
                        <div className="rounded-lg border border-error/20 bg-error/5 p-4 text-sm text-error">
                          {response.error}
                        </div>
                      ) : (
                        <>
                          {response.headers && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-semibold text-gray-700">Response Headers</h3>
                                <button
                                  onClick={() => copyText(JSON.stringify(response.headers, null, 2))}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none border-[0.5px] border-gray-300 rounded-lg shadow-sm text-gray-700 hover:bg-gray-50 hover:border-gray-400 bg-white hover:shadow"
                                  tabIndex={0}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                  Copy
                                </button>
                              </div>
                              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4 max-h-96 overflow-auto">
                                <pre className="text-sm font-mono text-gray-700 leading-relaxed">
                                  {JSON.stringify(response.headers, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-xs font-semibold text-gray-700">Response Body</h3>
                              <button
                                onClick={() => copyText(typeof response.body === 'string' ? response.body : JSON.stringify(response.body, null, 2))}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none border-[0.5px] border-gray-300 rounded-lg shadow-sm text-gray-700 hover:bg-gray-50 hover:border-gray-400 bg-white hover:shadow"
                                tabIndex={0}
                              >
                                <Copy className="h-3.5 w-3.5" />
                                Copy
                              </button>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4 max-h-96 overflow-auto">
                              <pre className="text-sm font-mono text-gray-700 leading-relaxed">
                                {typeof response.body === 'string' ? response.body : JSON.stringify(response.body, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<RestTester />);
