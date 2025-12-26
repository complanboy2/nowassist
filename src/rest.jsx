import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import clsx from 'clsx';
import Navigation from './components/Navigation';
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

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        body: responseBody,
        latency,
        ok: res.ok,
      });
    } catch (error) {
      setResponse({
        error: error.message,
        ok: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'text-slate-500';
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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <Navigation currentPageId="rest" sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col" style={{ width: '100%', minWidth: 0 }}>
        <div className="mx-auto max-w-[1400px] w-full px-6 py-8 flex-1 flex flex-col min-h-0 bg-white">
          {/* Clean Header */}
          <header className="pb-4 border-b border-gray-200 mb-4">
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">REST API Tester</h1>
            <p className="text-sm text-slate-600 mt-1">Test REST APIs with custom headers, authentication, and request bodies. All requests are made from your browser.</p>
          </header>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-6">

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Request Panel */}
            <div className="space-y-6">
              <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 rounded-t-lg">
                  <h2 className="text-sm font-semibold text-slate-900">Request</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <div className="flex gap-2 mb-2">
                      <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition"
                        tabIndex={0}
                      >
                        {HTTP_METHODS.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://your-instance.service-now.com/api/now/table/incident"
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition"
                        tabIndex={0}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-slate-700">Headers</label>
                      <button
                        onClick={addHeader}
                        className="text-xs text-slate-600 hover:text-slate-900 transition active:scale-95"
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
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-300 transition"
                            tabIndex={0}
                          />
                          <input
                            type="text"
                            value={header.value}
                            onChange={(e) => updateHeader(index, 'value', e.target.value)}
                            placeholder="Header value"
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-300 transition"
                            tabIndex={0}
                          />
                          {headers.length > 1 && (
                            <button
                              onClick={() => removeHeader(index)}
                              className="rounded-lg px-2 text-slate-600 hover:bg-slate-100 transition active:scale-95"
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
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Authentication</label>
                    <div className="space-y-2">
                      <select
                        value={authType}
                        onChange={(e) => setAuthType(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition"
                        tabIndex={0}
                      >
                        {AUTH_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      {authType !== 'None' && (
                        <input
                          type={authType === 'Basic' ? 'text' : 'password'}
                          value={authValue}
                          onChange={(e) => setAuthValue(e.target.value)}
                          placeholder={authType === 'Basic' ? 'username:password' : 'Token or key'}
                          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition"
                          tabIndex={0}
                        />
                      )}
                    </div>
                  </div>

                  {method !== 'GET' && (
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Request Body</label>
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder='{"key": "value"}'
                        className="w-full h-32 rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-300 transition resize-none"
                        tabIndex={0}
                      />
                    </div>
                  )}

                  <button
                    onClick={sendRequest}
                    disabled={loading || !url.trim()}
                    className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed focus:outline-none shadow-sm flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#81B5A1' }}
                    tabIndex={0}
                  >
                    <Play className="h-4 w-4" />
                    {loading ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </div>
            </div>

            {/* Response Panel */}
            <div className="space-y-6">
              <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 rounded-t-lg">
                  <h2 className="text-sm font-semibold text-slate-900">Response</h2>
                </div>
                <div className="p-6">
                  {!response && !loading && (
                    <div className="text-center py-12 text-slate-500">
                      <Network className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-sm">Send a request to see the response here</p>
                    </div>
                  )}
                  {loading && (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                      <p className="mt-3 text-sm text-slate-600">Sending request...</p>
                    </div>
                  )}
                  {response && !loading && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const StatusIcon = getStatusIcon(response.status);
                            return (
                              <StatusIcon className={clsx('h-5 w-5', getStatusColor(response.status))} />
                            );
                          })()}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={clsx('text-lg font-semibold', getStatusColor(response.status))}>
                                {response.status || 'Error'}
                              </span>
                              {response.statusText && (
                                <span className="text-sm text-slate-600">{response.statusText}</span>
                              )}
                            </div>
                            {response.latency && (
                              <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                <Clock className="h-3 w-3" />
                                <span>{response.latency}ms</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => copyText(JSON.stringify(response.body, null, 2))}
                          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus:outline-none"
                          tabIndex={0}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </button>
                      </div>

                      {response.error ? (
                        <div className="rounded-lg border border-error/20 bg-error/5 p-4 text-sm text-error">
                          {response.error}
                        </div>
                      ) : (
                        <>
                          {response.headers && (
                            <div>
                              <h3 className="text-xs font-semibold text-slate-700 mb-2">Response Headers</h3>
                              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 max-h-32 overflow-auto">
                                <pre className="text-xs font-mono text-slate-700">
                                  {JSON.stringify(response.headers, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                          <div>
                            <h3 className="text-xs font-semibold text-slate-700 mb-2">Response Body</h3>
                            <div className="rounded-lg border border-slate-200 bg-slate-950 p-4 max-h-96 overflow-auto">
                              <pre className="text-xs font-mono text-slate-100">
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
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<RestTester />);
