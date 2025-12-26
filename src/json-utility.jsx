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

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <Navigation currentPageId="json" sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col" style={{ width: '100%', minWidth: 0 }}>
        <div className="mx-auto max-w-[1400px] w-full px-6 py-8 flex-1 flex flex-col min-h-0 bg-white">
          {/* Clean Header */}
          <header className="pb-4 border-b border-gray-200 mb-4">
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">JSON Utility</h1>
          </header>

          {/* Action Buttons - Centered, No Groups */}
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={generateSample}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition shadow-sm text-sm"
              title="Generate random sample JSON"
            >
              <Sparkles className="h-4 w-4" />
              Generate Sample
            </button>
            <button
              onClick={prettyPrint}
              disabled={!isValidJson}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title="Format JSON with indentation"
            >
              <Code className="h-4 w-4" />
              Pretty Print
            </button>
            <button
              onClick={minify}
              disabled={!isValidJson}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title="Minify JSON (remove whitespace)"
            >
              <Code className="h-4 w-4" />
              Minify
            </button>
            <button
              onClick={showTreeView}
              disabled={!isValidJson}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title="Show JSON as tree view"
            >
              <ListTree className="h-4 w-4" />
              Tree View
            </button>
            <button
              onClick={sortKeysAsc}
              disabled={!isValidJson}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title="Sort keys alphabetically (A-Z)"
            >
              <Layers className="h-4 w-4" />
              Sort A-Z
            </button>
            <button
              onClick={sortKeysDesc}
              disabled={!isValidJson}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title="Sort keys reverse alphabetically (Z-A)"
            >
              <Layers className="h-4 w-4" />
              Sort Z-A
            </button>
            <button
              onClick={flatten}
              disabled={!isValidJson}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title="Flatten nested JSON object"
            >
              <Layers className="h-4 w-4" />
              Flatten
            </button>
            <button
              onClick={unflatten}
              disabled={!isValidJson}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title="Unflatten JSON object"
            >
              <Layers className="h-4 w-4" />
              Unflatten
            </button>
            <button
              onClick={clearAll}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition shadow-sm text-sm"
              title="Clear all content"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </button>
          </div>

          {/* Expandable Error Information */}
          {jsonError && (
            <div className="mb-4">
              <div 
                onClick={() => setErrorExpanded(!errorExpanded)}
                className="cursor-pointer p-3 bg-red-50 border-2 border-red-300 rounded-lg hover:bg-red-100 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-red-900 truncate">
                        {jsonError.message || 'Invalid JSON'}
                        {jsonError.line && ` (Line ${jsonError.line}${jsonError.column ? `, Column ${jsonError.column}` : ''})`}
                      </div>
                    </div>
                  </div>
                  <button className="text-red-600 hover:text-red-700 flex-shrink-0">
                    {errorExpanded ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              
              {errorExpanded && (
                <div className="mt-2 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                  <div className="space-y-2 text-sm">
                    {jsonError.originalMessage && (
                      <div>
                        <span className="font-semibold text-red-900">Error:</span>
                        <span className="text-red-700 ml-2">{jsonError.originalMessage}</span>
                      </div>
                    )}
                    {jsonError.line && (
                      <div>
                        <span className="font-semibold text-red-900">Location:</span>
                        <span className="text-red-700 ml-2">
                          Line {jsonError.line}
                          {jsonError.column && `, Column ${jsonError.column}`}
                        </span>
                      </div>
                    )}
                    {jsonError.suggestion && (
                      <div className="mt-3 p-3 bg-red-100/50 rounded border-l-2 border-red-400">
                        <div className="font-semibold text-red-900 mb-1">💡 Suggestion:</div>
                        <div className="text-red-800">{jsonError.suggestion}</div>
                      </div>
                    )}
                    {jsonError.context && (
                      <div className="mt-3">
                        <div className="font-semibold text-red-900 mb-1">Context:</div>
                        <div className="text-xs text-red-700 font-mono bg-red-100/30 rounded p-2">
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
          <div className="mb-4 border-b-2 border-slate-200 flex-shrink-0">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('editor')}
                className={clsx(
                  'px-6 py-2.5 text-sm font-semibold transition border-b-2 -mb-0.5',
                  activeTab === 'editor'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                )}
              >
                Editor
              </button>
              <button
                onClick={() => setActiveTab('diff')}
                className={clsx(
                  'px-6 py-2.5 text-sm font-semibold transition border-b-2 -mb-0.5',
                  activeTab === 'diff'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                )}
              >
                Diff
              </button>
              <button
                onClick={() => setActiveTab('convert')}
                disabled={!isValidJson}
                className={clsx(
                  'px-6 py-2.5 text-sm font-semibold transition border-b-2 -mb-0.5 disabled:opacity-50 disabled:cursor-not-allowed',
                  activeTab === 'convert'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                )}
              >
                Convert
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden min-h-0">
            {activeTab === 'editor' && (
              <div className="grid grid-cols-2 gap-6 h-full" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
                {/* Input Panel */}
                <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-hidden flex flex-col" style={{ height: '100%', minHeight: 0, minWidth: 0, maxWidth: '100%' }}>
                  <div className="border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/50 px-6 py-3 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                      <h2 className="text-base font-semibold text-slate-900 whitespace-nowrap">Input JSON</h2>
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
                      className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg transition"
                      title="Copy input to clipboard"
                    >
                      {copied.input ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
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
                <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-hidden flex flex-col" style={{ height: '100%', minHeight: 0, minWidth: 0, maxWidth: '100%' }}>
                  <div className="border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/50 px-6 py-3 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0"></div>
                      <h2 className="text-base font-semibold text-slate-900 whitespace-nowrap">
                        {outputViewMode === 'tree' ? 'Tree View' : 'Output JSON'}
                      </h2>
                    </div>
                    {outputViewMode === 'editor' && (
                      <button
                        onClick={() => copyToClipboard(outputJson, 'output')}
                        disabled={!outputJson}
                        className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        title="Copy output to clipboard"
                      >
                        {copied.output ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
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
                          <div className="text-sm text-slate-600">Please fix errors to view tree.</div>
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
              <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-hidden h-full">
                <div className="h-full overflow-auto">
                  <JsonDiff onOutputUpdate={(output) => setOutputJson(output)} />
                </div>
              </div>
            )}

            {activeTab === 'convert' && isValidJson && (
              <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-hidden h-full">
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
  );
};

// Initialize app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<JsonUtility />);
