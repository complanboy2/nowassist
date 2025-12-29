import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import EnhancedJsonEditor from './components/EnhancedJsonEditor';
import JsonTreeView from './components/JsonTreeView';
import JsonConvert from './components/JsonConvert';
import JsonDiff from './components/JsonDiff';
import { parseJsonError } from './utils/jsonErrorParser';
import { sortKeys, flattenJson, unflattenJson } from './utils/jsonUtils';
import { generateSampleJson, getDefaultSampleJson } from './utils/sampleJson';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  FileJson,
  Copy,
  Layers,
  GitMerge,
  Code,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ListTree,
} from 'lucide-react';
import clsx from 'clsx';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import './styles.css';

const FEATURES = [
  { id: 'jwt', name: 'JWT Decoder', category: 'Authentication', url: chrome.runtime?.getURL ? chrome.runtime.getURL('jwt.html') : 'jwt.html' },
  { id: 'saml', name: 'SAML Inspector', category: 'Authentication', url: chrome.runtime?.getURL ? chrome.runtime.getURL('saml.html') : 'saml.html' },
  { id: 'rest', name: 'REST API Tester', category: 'API Testing', url: chrome.runtime?.getURL ? chrome.runtime.getURL('rest.html') : 'rest.html' },
  { id: 'har', name: 'HAR Analyzer', category: 'Debugging', url: chrome.runtime?.getURL ? chrome.runtime.getURL('har-analyzer.html') : 'har-analyzer.html' },
  { id: 'json', name: 'JSON Utility', category: 'Utilities', url: chrome.runtime?.getURL ? chrome.runtime.getURL('json-utility.html') : 'json-utility.html' },
];

const JsonUtility = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inputJson, setInputJson] = useState(getDefaultSampleJson());
  const [outputJson, setOutputJson] = useState('');
  const [jsonError, setJsonError] = useState(null);
  const [activeTab, setActiveTab] = useState('editor');
  const [copied, setCopied] = useState({ input: false, output: false });
  const [errorExpanded, setErrorExpanded] = useState(false);
  const [outputViewMode, setOutputViewMode] = useState('editor'); // 'editor' | 'tree'

  // Validate JSON
  const validateJson = (jsonString) => {
    if (!jsonString || !jsonString.trim()) {
      setJsonError(null);
      return null;
    }

    try {
      const parsed = JSON.parse(jsonString);
      setJsonError(null);
      return parsed;
    } catch (err) {
      const errorInfo = parseJsonError(err, jsonString);
      setJsonError(errorInfo);
      return null;
    }
  };

  // Validate input JSON on change
  useMemo(() => {
    validateJson(inputJson);
  }, [inputJson]);

  const isValidJson = jsonError === null && inputJson.trim() !== '';

  // Utility functions
  const prettyPrint = () => {
    const parsed = validateJson(inputJson);
    if (parsed) {
      setOutputJson(JSON.stringify(parsed, null, 2));
      setOutputViewMode('editor');
    }
  };

  const minify = () => {
    const parsed = validateJson(inputJson);
    if (parsed) {
      setOutputJson(JSON.stringify(parsed));
      setOutputViewMode('editor');
    }
  };

  const sortKeysAsc = () => {
    const parsed = validateJson(inputJson);
    if (parsed && typeof parsed === 'object') {
      const sorted = sortKeys(parsed, 'asc');
      setOutputJson(JSON.stringify(sorted, null, 2));
      setOutputViewMode('editor');
    }
  };

  const sortKeysDesc = () => {
    const parsed = validateJson(inputJson);
    if (parsed && typeof parsed === 'object') {
      const sorted = sortKeys(parsed, 'desc');
      setOutputJson(JSON.stringify(sorted, null, 2));
      setOutputViewMode('editor');
    }
  };

  const flatten = () => {
    const parsed = validateJson(inputJson);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const flattened = flattenJson(parsed);
      setOutputJson(JSON.stringify(flattened, null, 2));
      setOutputViewMode('editor');
    } else {
      setJsonError({ message: 'Input must be a JSON object (not an array) to flatten', line: null });
    }
  };

  const unflatten = () => {
    const parsed = validateJson(inputJson);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      try {
        const unflattened = unflattenJson(parsed);
        setOutputJson(JSON.stringify(unflattened, null, 2));
        setOutputViewMode('editor');
      } catch (err) {
        setJsonError({ message: err.message || 'Failed to unflatten JSON', line: null });
      }
    } else {
      setJsonError({ message: 'Input must be a JSON object (not an array) to unflatten', line: null });
    }
  };

  const showTreeView = () => {
    const parsed = validateJson(inputJson);
    if (parsed) {
      setOutputViewMode('tree');
    }
  };

  const generateSample = () => {
    setInputJson(generateSampleJson());
    setOutputJson('');
    setOutputViewMode('editor');
  };

  const clearAll = () => {
    setInputJson('');
    setOutputJson('');
    setJsonError(null);
    setOutputViewMode('editor');
  };

  const copyToClipboard = async (text, type) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(prev => ({ ...prev, [type]: true }));
      setTimeout(() => {
        setCopied(prev => ({ ...prev, [type]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Handle tree view updates - when a value is edited in tree, update both input and output JSON
  const handleTreeUpdate = (updatedJson) => {
    const formatted = JSON.stringify(updatedJson, null, 2);
    setInputJson(formatted);
    setOutputJson(formatted);
  };

  const isRouterMode = typeof window !== 'undefined' && window.__ROUTER_MODE__;
  
  const content = (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 flex flex-col" style={{ width: '100%', minWidth: 0 }}>
        <div className="flex-1 flex flex-col">
          <div className="mx-auto max-w-[1600px] w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-10">
            <div className="space-y-4 sm:space-y-6">
          {/* Professional Header with Border */}
          <header className="bg-white border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm px-4 sm:px-6 lg:px-8 py-4 sm:py-6 mb-4 sm:mb-6 bg-white dark:bg-gray-800">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-1 sm:space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">JSON Utility</h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  Format, validate, transform, and analyze JSON data with ease
                </p>
              </div>
            </div>
          </header>

          {/* Action Buttons */}
          <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={generateSample}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold transition-all focus:outline-none border-[0.5px] border-gray-300 rounded-lg shadow-sm text-white bg-sky-500 hover:bg-sky-600 hover:border-gray-400 hover:shadow"
              title="Generate random sample JSON"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate Sample
            </button>
            <button
              onClick={prettyPrint}
              disabled={!isValidJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold transition-all focus:outline-none border-[0.5px] border-gray-300 rounded-lg shadow-sm text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-700"
              title="Format JSON with indentation"
            >
              <Code className="h-3.5 w-3.5" />
              Pretty Print
            </button>
            <button
              onClick={minify}
              disabled={!isValidJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold transition-all focus:outline-none border-[0.5px] border-gray-300 rounded-lg shadow-sm text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-700"
              title="Minify JSON (remove whitespace)"
            >
              <Code className="h-3.5 w-3.5" />
              Minify
            </button>
            <button
              onClick={showTreeView}
              disabled={!isValidJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold transition-all focus:outline-none border-[0.5px] border-gray-300 rounded-lg shadow-sm text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-700"
              title="Show JSON as tree view"
            >
              <ListTree className="h-3.5 w-3.5" />
              Tree View
            </button>
            <button
              onClick={sortKeysAsc}
              disabled={!isValidJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold transition-all focus:outline-none border-[0.5px] border-gray-300 rounded-lg shadow-sm text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-700"
              title="Sort keys alphabetically (A-Z)"
            >
              <Layers className="h-3.5 w-3.5" />
              Sort A-Z
            </button>
            <button
              onClick={sortKeysDesc}
              disabled={!isValidJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold transition-all focus:outline-none border-[0.5px] border-gray-300 rounded-lg shadow-sm text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-700"
              title="Sort keys reverse alphabetically (Z-A)"
            >
              <Layers className="h-3.5 w-3.5" />
              Sort Z-A
            </button>
            <button
              onClick={flatten}
              disabled={!isValidJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold transition-all focus:outline-none border-[0.5px] border-gray-300 rounded-lg shadow-sm text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-700"
              title="Flatten nested JSON object"
            >
              <Layers className="h-3.5 w-3.5" />
              Flatten
            </button>
            <button
              onClick={unflatten}
              disabled={!isValidJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold transition-all focus:outline-none border-[0.5px] border-gray-300 rounded-lg shadow-sm text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-700"
              title="Unflatten JSON object"
            >
              <Layers className="h-3.5 w-3.5" />
              Unflatten
            </button>
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold transition-all focus:outline-none border-[0.5px] border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-700 hover:shadow"
              title="Clear all content"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>

          {/* Expandable Error Information */}
          {jsonError && (
            <div className="rounded-xl border border-error/20 bg-error/5 overflow-hidden">
              <div 
                onClick={() => setErrorExpanded(!errorExpanded)}
                className="cursor-pointer px-4 sm:px-6 py-3 sm:py-4 hover:bg-error/10 transition-colors border-b border-error/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <AlertCircle className="h-5 w-5 text-error flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-error truncate">
                        {jsonError.message || 'Invalid JSON'}
                        {jsonError.line && ` (Line ${jsonError.line}${jsonError.column ? `, Column ${jsonError.column}` : ''})`}
                      </div>
                    </div>
                  </div>
                  <button className="text-error hover:text-error/80 flex-shrink-0">
                    {errorExpanded ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              
              {errorExpanded && (
                <div className="px-4 sm:px-6 py-4 border-t border-error/20">
                  <div className="space-y-2 text-sm">
                    {jsonError.originalMessage && (
                      <div>
                        <span className="font-semibold text-error">Error:</span>
                        <span className="text-error/90 ml-2">{jsonError.originalMessage}</span>
                      </div>
                    )}
                    {jsonError.line && (
                      <div>
                        <span className="font-semibold text-error">Location:</span>
                        <span className="text-error/90 ml-2">
                          Line {jsonError.line}
                          {jsonError.column && `, Column ${jsonError.column}`}
                        </span>
                      </div>
                    )}
                    {jsonError.suggestion && (
                      <div className="mt-3 p-3 bg-error/10 rounded border-l-2 border-error/40">
                        <div className="font-semibold text-error mb-1">💡 Suggestion:</div>
                        <div className="text-error/90">{jsonError.suggestion}</div>
                      </div>
                    )}
                    {jsonError.context && (
                      <div className="mt-3">
                        <div className="font-semibold text-error mb-1">Context:</div>
                        <div className="text-xs text-error/80 font-mono bg-error/10 rounded p-2">
                          {jsonError.context}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-0.5 bg-white dark:bg-gray-700 p-0.5 border border-gray-300 dark:border-gray-600 rounded-md">
            <button
              onClick={() => setActiveTab('editor')}
              className={clsx(
                'px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium transition-colors rounded',
                activeTab === 'editor'
                  ? 'bg-sky-500 text-white'
                  : 'text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-500'
              )}
            >
              Editor
            </button>
            <button
              onClick={() => setActiveTab('diff')}
              className={clsx(
                'px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium transition-colors rounded',
                activeTab === 'diff'
                  ? 'bg-sky-500 text-white'
                  : 'text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-500'
              )}
            >
              Diff
            </button>
            <button
              onClick={() => setActiveTab('convert')}
              disabled={!isValidJson}
              className={clsx(
                'px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium transition-colors rounded disabled:opacity-50 disabled:cursor-not-allowed',
                activeTab === 'convert'
                  ? 'bg-sky-500 text-white'
                  : 'text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-500'
              )}
            >
              Convert
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-h-0">
            {activeTab === 'editor' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
                {/* Input Panel */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="h-1.5 sm:h-2 w-1.5 sm:w-2 rounded-full bg-gray-400 flex-shrink-0"></div>
                      <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white whitespace-nowrap">Input JSON</h2>
                      {inputJson && (
                        <div className="flex items-center gap-2 ml-2">
                          {jsonError ? (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-100 border border-red-300 rounded text-xs">
                              <AlertCircle className="h-3 w-3 text-red-600" />
                              <span className="font-semibold text-red-900">Invalid</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-100 border border-green-300 rounded text-xs">
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                              <span className="font-semibold text-green-900">Valid</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => copyToClipboard(inputJson, 'input')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none border-[0.5px] border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-700 hover:shadow"
                      title="Copy input to clipboard"
                    >
                      {copied.input ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          <span className="hidden sm:inline">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex-1 min-h-0" style={{ minHeight: '400px' }}>
                    <EnhancedJsonEditor
                      value={inputJson}
                      onChange={setInputJson}
                      readOnly={false}
                      placeholder="Paste or type JSON here..."
                      errorLine={jsonError?.line || null}
                      errorMessage={jsonError?.message || null}
                    />
                  </div>
                </div>

                {/* Output Panel */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="h-1.5 sm:h-2 w-1.5 sm:w-2 rounded-full bg-gray-400 flex-shrink-0"></div>
                      <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                        {outputViewMode === 'tree' ? 'Tree View' : 'Output JSON'}
                      </h2>
                    </div>
                    {outputViewMode === 'editor' && (
                      <button
                        onClick={() => copyToClipboard(outputJson, 'output')}
                        disabled={!outputJson}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none border-[0.5px] border-gray-300 rounded-lg shadow-sm text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-700"
                        title="Copy output to clipboard"
                      >
                        {copied.output ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            <span className="hidden sm:inline">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="flex-1 min-h-0" style={{ minHeight: '400px' }}>
                    {outputViewMode === 'tree' ? (
                      isValidJson ? (
                        (() => {
                          try {
                            const parsed = JSON.parse(inputJson);
                            return (
                              <JsonTreeView 
                                jsonData={parsed}
                                onPathSelect={(path, value) => {
                                  // Only update output when explicitly selecting (single click), not when editing
                                  if (value !== undefined && typeof value !== 'object') {
                                    setOutputJson(JSON.stringify(value, null, 2));
                                    setOutputViewMode('editor');
                                  }
                                }}
                                onUpdate={handleTreeUpdate}
                                editable={true}
                              />
                            );
                          } catch (err) {
                            return (
                              <div className="p-12 text-center">
                                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
                                <div className="text-red-600 font-semibold mb-2 text-lg">Invalid JSON</div>
                                <div className="text-sm text-slate-600">Please fix errors to view tree.</div>
                              </div>
                            );
                          }
                        })()
                      ) : (
                        <div className="p-12 text-center">
                          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
                          <div className="text-red-600 font-semibold mb-2 text-lg">Invalid JSON</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Please fix errors to view tree.</div>
                        </div>
                      )
                    ) : (
                      <EnhancedJsonEditor
                        value={outputJson}
                        onChange={setOutputJson}
                        readOnly={false}
                        placeholder="Transformed JSON will appear here..."
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'diff' && (
              <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="h-full overflow-auto">
                  <JsonDiff onOutputUpdate={(output) => setOutputJson(output)} />
                </div>
              </div>
            )}

            {activeTab === 'convert' && isValidJson && (
              <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="h-full overflow-auto">
                  <JsonConvert
                    inputJson={inputJson}
                    isValidJson={isValidJson}
                    onOutputUpdate={(output) => setOutputJson(output)}
                  />
                </div>
              </div>
            )}
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
      <Navigation currentPageId="json" sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />
      {content}
    </div>
  );
};

// Initialize app
// Export component for Router, render directly for extension
const JsonUtilityComponent = () => <JsonUtility />;
export default JsonUtilityComponent;

// Render directly if running as standalone (extension mode)
if (typeof window !== 'undefined' && document.getElementById('root') && !window.__ROUTER_MODE__) {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(<JsonUtility />);
}
