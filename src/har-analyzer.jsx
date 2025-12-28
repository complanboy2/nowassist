import React, { useState, useRef, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import {
  Upload,
  FileText,
  Search,
  Filter,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Network,
  Clock,
  ShieldCheck,
  Key,
  Info,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  GitCompare,
  BarChart3,
  Globe,
  Zap,
  AlertTriangle,
  Layers,
  FileCode,
  Lock,
  Unlock,
  HelpCircle,
  Code,
  GripVertical,
  Lightbulb,
  FileJson,
} from 'lucide-react';
import clsx from 'clsx';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import './styles.css';
import CustomDropdown from './CustomDropdown';
import VirtualizedHarTable from './components/VirtualizedHarTable';

const FEATURES = [
  { id: 'jwt', name: 'JWT Decoder', icon: ShieldCheck, category: 'Authentication', status: 'active', url: chrome.runtime?.getURL ? chrome.runtime.getURL('jwt.html') : 'jwt.html' },
  { id: 'saml', name: 'SAML Inspector', icon: Key, category: 'Authentication', status: 'active', url: chrome.runtime?.getURL ? chrome.runtime.getURL('saml.html') : 'saml.html' },
  { id: 'rest', name: 'REST API Tester', icon: Network, category: 'API Testing', status: 'active', url: chrome.runtime?.getURL ? chrome.runtime.getURL('rest.html') : 'rest.html' },
  { id: 'har', name: 'HAR Analyzer', icon: FileCode, category: 'Debugging', status: 'active', url: chrome.runtime?.getURL ? chrome.runtime.getURL('har-analyzer.html') : 'har-analyzer.html' },
  { id: 'json', name: 'JSON Utility', icon: FileJson, category: 'Utilities', status: 'active', url: chrome.runtime?.getURL ? chrome.runtime.getURL('json-utility.html') : 'json-utility.html' },
  // Browser Logs temporarily disabled - not ready for production
  // { id: 'logs', name: 'Browser Logs', icon: FileText, category: 'Debugging', status: 'active', url: chrome.runtime?.getURL ? chrome.runtime.getURL('logs.html') : 'logs.html' },
];

const HarAnalyzer = () => {
  const [harData, setHarData] = useState(null);
  const [harData2, setHarData2] = useState(null); // For comparison
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState('single'); // 'single' | 'compare'
  const [filterMethod, setFilterMethod] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterContentType, setFilterContentType] = useState('all');
  const [filterDomain, setFilterDomain] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('startedDateTime');
  const [sortOrder, setSortOrder] = useState('asc');
  const [groupBy, setGroupBy] = useState('none');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [expandedEntries, setExpandedEntries] = useState(new Set());
  const [selectedEntryIndex, setSelectedEntryIndex] = useState(null); // For side panel view
  const [sanitizeEnabled, setSanitizeEnabled] = useState(false);
  const [sanitizeFields, setSanitizeFields] = useState({
    cookies: true,
    headers: ['authorization', 'cookie', 'x-api-key', 'x-auth-token'],
    body: false, // Don't sanitize body by default (can contain useful data)
  });
  const [showHelp, setShowHelp] = useState(false);
  const [showSearchHelp, setShowSearchHelp] = useState(false);
  const [panelWidth, setPanelWidth] = useState(50); // Percentage for left panel (50% = equal split)
  const [isResizing, setIsResizing] = useState(false);
  const fileInputRef = useRef(null);
  const fileInputRef2 = useRef(null);

  // Handle panel resizing
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      // Find the container using a more flexible approach
      const resizeHandle = document.querySelector('[data-resize-handle]');
      if (!resizeHandle) return;
      
      const container = resizeHandle.parentElement;
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      
      // Constrain between 20% and 80%
      const constrainedWidth = Math.max(20, Math.min(80, newWidth));
      setPanelWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);


  // Parse HAR file
  const parseHAR = (text) => {
    try {
      const har = JSON.parse(text);
      if (!har.log || !har.log.entries) {
        throw new Error('Invalid HAR format: missing log.entries');
      }
      return har;
    } catch (err) {
      throw new Error(`Failed to parse HAR file: ${err.message}`);
    }
  };

  // Handle file upload
  const handleFileUpload = async (file, setData) => {
    if (!file) return;
    
    if (!file.name.endsWith('.har') && !file.name.endsWith('.json')) {
      alert('Please upload a .har or .json file');
      return;
    }

    try {
      const text = await file.text();
      const har = parseHAR(text);
      setData(har);
    } catch (err) {
      alert(`Error loading HAR file: ${err.message}`);
    }
  };

  // Get entries from HAR data
  const getEntries = (data) => {
    if (!data || !data.log || !data.log.entries) return [];
    return data.log.entries || [];
  };

  const entries = useMemo(() => getEntries(harData), [harData]);
  const entries2 = useMemo(() => getEntries(harData2), [harData2]);

  // Extract unique values for filters
  const uniqueMethods = useMemo(() => {
    const methods = new Set();
    entries.forEach(entry => {
      if (entry.request && entry.request.method) {
        methods.add(entry.request.method);
      }
    });
    return Array.from(methods).sort();
  }, [entries]);

  const uniqueContentTypes = useMemo(() => {
    const types = new Set();
    entries.forEach(entry => {
      if (entry.response && entry.response.content) {
        const contentType = entry.response.content.mimeType || '';
        const baseType = contentType.split(';')[0].split('/')[0];
        if (baseType) types.add(baseType);
      }
    });
    return Array.from(types).sort();
  }, [entries]);

  const uniqueDomains = useMemo(() => {
    const domains = new Set();
    entries.forEach(entry => {
      if (entry.request && entry.request.url) {
        try {
          const url = new URL(entry.request.url);
          domains.add(url.hostname);
        } catch {
          // Invalid URL
        }
      }
    });
    return Array.from(domains).sort();
  }, [entries]);

  // Filter and sort entries
  const filteredEntries = useMemo(() => {
    let filtered = [...entries];

    // Filter by method
    if (filterMethod !== 'all') {
      filtered = filtered.filter(entry => 
        entry.request && entry.request.method === filterMethod
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(entry => {
        const status = entry.response?.status || 0;
        if (filterStatus === '2xx') return status >= 200 && status < 300;
        if (filterStatus === '4xx') return status >= 400 && status < 500;
        if (filterStatus === '5xx') return status >= 500;
        if (filterStatus === 'failed') return status === 0 || status >= 400;
        return true;
      });
    }

    // Filter by content type
    if (filterContentType !== 'all') {
      filtered = filtered.filter(entry => {
        const contentType = entry.response?.content?.mimeType || '';
        return contentType.startsWith(filterContentType);
      });
    }

    // Filter by domain
    if (filterDomain) {
      filtered = filtered.filter(entry => {
        if (!entry.request || !entry.request.url) return false;
        try {
          const url = new URL(entry.request.url);
          return url.hostname.includes(filterDomain.toLowerCase());
        } catch {
          return entry.request.url.toLowerCase().includes(filterDomain.toLowerCase());
        }
      });
    }

    // Advanced Search Query Parser
    const parseSearchQuery = (queryString) => {
      if (!queryString) return { general: null, fields: {} };

      // Parse field-specific queries: URL="abc", Status=400, Response="text", etc.
      // Supports both = and : syntax, with or without quotes
      const fieldPattern = /(\w+)[:=]\s*"?([^"=,]+)"?/gi;
      const fields = {};
      let generalQuery = queryString;
      
      let match;
      while ((match = fieldPattern.exec(queryString)) !== null) {
        const fieldName = match[1].toLowerCase();
        const fieldValue = match[2].trim();
        fields[fieldName] = fieldValue;
        // Remove matched field query from general query
        generalQuery = generalQuery.replace(match[0], '').trim();
      }

      // Clean up general query (remove extra spaces, commas)
      generalQuery = generalQuery.replace(/[,\s]+/g, ' ').trim();
      if (generalQuery === '') generalQuery = null;

      return {
        general: generalQuery,
        fields: fields
      };
    };

    // Search query - supports advanced field-specific search
    if (searchQuery) {
      const parsedQuery = parseSearchQuery(searchQuery);
      const hasFieldFilters = Object.keys(parsedQuery.fields).length > 0;
      
      filtered = filtered.filter(entry => {
        let matches = true;
        
        // Apply field-specific filters first
        if (hasFieldFilters) {
          for (const [fieldName, fieldValue] of Object.entries(parsedQuery.fields)) {
            const value = fieldValue.toLowerCase();
            let fieldMatches = false;

            switch(fieldName) {
              case 'url':
                fieldMatches = (entry.request?.url || '').toLowerCase().includes(value);
                break;
              case 'method':
                fieldMatches = (entry.request?.method || '').toLowerCase() === value;
                break;
              case 'status':
                // Support both numeric and text search (e.g., Status=400 or Status=404)
                const status = String(entry.response?.status || '');
                fieldMatches = status === value || status.toLowerCase().includes(value);
                break;
              case 'response':
              case 'responsebody':
                const responseBody = (entry.response?.content?.text || '').toLowerCase();
                fieldMatches = responseBody.includes(value);
                break;
              case 'request':
              case 'requestbody':
                const requestBody = (entry.request?.postData?.text || '').toLowerCase();
                const requestParams = JSON.stringify(entry.request?.postData?.params || {}).toLowerCase();
                fieldMatches = requestBody.includes(value) || requestParams.includes(value);
                break;
              case 'header':
              case 'headers':
                const allHeaders = [
                  ...(entry.request?.headers || []),
                  ...(entry.response?.headers || [])
                ];
                fieldMatches = allHeaders.some(h => 
                  h.name.toLowerCase().includes(value) || h.value.toLowerCase().includes(value)
                );
                break;
              case 'requestheader':
              case 'requestheaders':
                const requestHeaders = entry.request?.headers || [];
                fieldMatches = requestHeaders.some(h => 
                  h.name.toLowerCase().includes(value) || h.value.toLowerCase().includes(value)
                );
                break;
              case 'responseheader':
              case 'responseheaders':
                const responseHeaders = entry.response?.headers || [];
                fieldMatches = responseHeaders.some(h => 
                  h.name.toLowerCase().includes(value) || h.value.toLowerCase().includes(value)
                );
                break;
              case 'domain':
                try {
                  const urlObj = new URL(entry.request?.url || '');
                  fieldMatches = urlObj.hostname.toLowerCase().includes(value);
                } catch {
                  fieldMatches = (entry.request?.url || '').toLowerCase().includes(value);
                }
                break;
              case 'type':
              case 'contenttype':
                fieldMatches = (entry.response?.content?.mimeType || '').toLowerCase().includes(value);
                break;
              default:
                // Unknown field - skip this filter
                fieldMatches = true;
            }
            
            if (!fieldMatches) {
              matches = false;
              break;
            }
          }
        }
        
        // If field filters matched (or no field filters), check general search
        if (matches && parsedQuery.general) {
          const query = parsedQuery.general.toLowerCase();
          const url = (entry.request?.url || '').toLowerCase();
          const method = (entry.request?.method || '').toLowerCase();
          const statusText = (entry.response?.statusText || '').toLowerCase();
          const contentType = (entry.response?.content?.mimeType || '').toLowerCase();
          
          const requestHeaders = entry.request?.headers?.map(h => 
            `${h.name}:${h.value}`
          ).join(' ').toLowerCase() || '';
          
          const responseHeaders = entry.response?.headers?.map(h => 
            `${h.name}:${h.value}`
          ).join(' ').toLowerCase() || '';
          
          const requestBody = (entry.request?.postData?.text || '').toLowerCase();
          const requestParams = JSON.stringify(entry.request?.postData?.params || {}).toLowerCase();
          
          const responseBody = (entry.response?.content?.text || '').toLowerCase();
          
          const requestCookies = entry.request?.cookies?.map(c => 
            `${c.name}=${c.value}`
          ).join(' ').toLowerCase() || '';
          const responseCookies = entry.response?.cookies?.map(c => 
            `${c.name}=${c.value}`
          ).join(' ').toLowerCase() || '';
          
          matches = url.includes(query) || 
                   method.includes(query) || 
                   statusText.includes(query) || 
                   contentType.includes(query) ||
                   requestHeaders.includes(query) ||
                   responseHeaders.includes(query) ||
                   requestBody.includes(query) ||
                   requestParams.includes(query) ||
                   responseBody.includes(query) ||
                   requestCookies.includes(query) ||
                   responseCookies.includes(query);
        }
        
        return matches;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      if (sortBy === 'startedDateTime') {
        aVal = new Date(a.startedDateTime).getTime();
        bVal = new Date(b.startedDateTime).getTime();
      } else if (sortBy === 'time') {
        aVal = a.time || 0;
        bVal = b.time || 0;
      } else if (sortBy === 'size') {
        aVal = a.response?.content?.size || 0;
        bVal = b.response?.content?.size || 0;
      } else if (sortBy === 'status') {
        aVal = a.response?.status || 0;
        bVal = b.response?.status || 0;
      } else if (sortBy === 'method') {
        aVal = (a.request?.method || '').toLowerCase();
        bVal = (b.request?.method || '').toLowerCase();
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else if (sortBy === 'url') {
        aVal = (a.request?.url || '').toLowerCase();
        bVal = (b.request?.url || '').toLowerCase();
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else {
        return 0;
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [entries, filterMethod, filterStatus, filterContentType, filterDomain, searchQuery, sortBy, sortOrder]);

  // Group entries
  const groupedEntries = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Requests': filteredEntries };
    }

    const groups = {};
    filteredEntries.forEach(entry => {
      let key;
      if (groupBy === 'domain') {
        try {
          const url = new URL(entry.request?.url || '');
          key = url.hostname;
        } catch {
          key = 'Unknown';
        }
      } else if (groupBy === 'method') {
        key = entry.request?.method || 'Unknown';
      } else if (groupBy === 'status') {
        const status = entry.response?.status || 0;
        if (status >= 200 && status < 300) key = '2xx Success';
        else if (status >= 300 && status < 400) key = '3xx Redirect';
        else if (status >= 400 && status < 500) key = '4xx Client Error';
        else if (status >= 500) key = '5xx Server Error';
        else key = 'Failed/Unknown';
      } else if (groupBy === 'contentType') {
        key = entry.response?.content?.mimeType?.split(';')[0] || 'Unknown';
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });

    return groups;
  }, [filteredEntries, groupBy]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!harData || entries.length === 0) return null;

    const totalRequests = entries.length;
    const totalSize = entries.reduce((sum, e) => sum + (e.response?.content?.size || 0), 0);
    const totalTime = entries.reduce((sum, e) => sum + (e.time || 0), 0);
    const avgTime = totalTime / totalRequests;
    const failed = entries.filter(e => !e.response || e.response.status >= 400 || e.response.status === 0).length;
    const slow = entries.filter(e => e.time > 1000).length;
    const domains = uniqueDomains.length;
    const methods = uniqueMethods.length;

    return {
      totalRequests,
      totalSize,
      totalTime,
      avgTime,
      failed,
      slow,
      domains,
      methods,
    };
  }, [harData, entries, uniqueDomains, uniqueMethods]);

  // Sanitize HAR data
  const sanitizeHAR = (har) => {
    if (!har || !sanitizeEnabled) return har;

    const sanitized = JSON.parse(JSON.stringify(har)); // Deep clone

    sanitized.log.entries.forEach(entry => {
      // Sanitize cookies
      if (sanitizeFields.cookies) {
        if (entry.request?.cookies) {
          entry.request.cookies = entry.request.cookies.map(c => ({
            ...c,
            value: '[REDACTED]',
          }));
        }
        if (entry.response?.cookies) {
          entry.response.cookies = entry.response.cookies.map(c => ({
            ...c,
            value: '[REDACTED]',
          }));
        }
      }

      // Sanitize headers
      if (sanitizeFields.headers && sanitizeFields.headers.length > 0) {
        const headersToSanitize = sanitizeFields.headers.map(h => h.toLowerCase());
        
        if (entry.request?.headers) {
          entry.request.headers = entry.request.headers.map(h => ({
            ...h,
            value: headersToSanitize.includes(h.name.toLowerCase()) ? '[REDACTED]' : h.value,
          }));
        }
        if (entry.response?.headers) {
          entry.response.headers = entry.response.headers.map(h => ({
            ...h,
            value: headersToSanitize.includes(h.name.toLowerCase()) ? '[REDACTED]' : h.value,
          }));
        }
      }

      // Sanitize body (optional - can be useful for debugging)
      if (sanitizeFields.body) {
        if (entry.request?.postData) {
          entry.request.postData.text = '[REDACTED - Request Body]';
        }
        if (entry.response?.content?.text) {
          entry.response.content.text = '[REDACTED - Response Body]';
        }
      }
    });

    return sanitized;
  };

  // Export HAR
  const exportHAR = (data, filename) => {
    const sanitized = sanitizeHAR(data);
    const blob = new Blob([JSON.stringify(sanitized, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'har-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Format bytes
  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Format time
  const formatTime = (ms) => {
    if (!ms) return '0 ms';
    if (ms < 1000) return `${Math.round(ms)} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  // Get status color
  const getStatusColor = (status) => {
    if (!status || status === 0) return 'bg-gray-500';
    if (status >= 200 && status < 300) return 'bg-green-500';
    if (status >= 300 && status < 400) return 'bg-blue-500';
    if (status >= 400 && status < 500) return 'bg-orange-500';
    if (status >= 500) return 'bg-red-500';
    return 'bg-gray-500';
  };

  // Toggle group
  const toggleGroup = (key) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedGroups(newExpanded);
  };

  // Toggle entry expansion
  const toggleEntry = (index) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedEntries(newExpanded);
  };

  // Handle column sort
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Sortable header component
  const SortableHeader = ({ column, children, className = '' }) => (
    <th 
      onClick={() => handleSort(column)}
      className={clsx(
        'px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition select-none sticky top-0 bg-white z-10',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span>{children}</span>
        {sortBy === column && (
          sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        )}
      </div>
    </th>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <Navigation currentPageId="har" sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />

    <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col" style={{ width: '100%', minWidth: 0 }}>
        <div className="flex-1 flex flex-col">
          <div className="mx-auto max-w-[1600px] w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-10">
          {/* Clean Header */}
          <header className="pb-4 border-b border-gray-200 mb-4">
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">HAR Analyzer</h1>
            <p className="text-sm text-slate-600 mt-1">Analyze HTTP Archive (HAR) files with filtering, sanitization, comparison, and powerful insights</p>
          </header>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-6">

          {/* Upload Section */}
          {!harData && (
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
              <Upload className="h-16 w-16 mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload HAR File</h3>
              <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
                Upload a HAR file exported from Chrome DevTools, Firefox, or any HAR-compatible tool to analyze network requests, responses, and performance metrics.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".har,.json"
                onChange={(e) => handleFileUpload(e.target.files[0], setHarData)}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition"
              >
                Choose HAR File
              </button>
              <div className="mt-6 text-xs text-slate-500">
                <p className="mb-2 font-semibold">How to export HAR file:</p>
                <ol className="list-decimal list-inside space-y-1 max-w-md mx-auto text-left">
                  <li>Open Chrome DevTools (F12)</li>
                  <li>Go to Network tab</li>
                  <li>Right-click on any request → "Save all as HAR with content"</li>
                  <li>Or use the Network tab menu → "Save all as HAR with content"</li>
                </ol>
              </div>
            </div>
          )}

          {/* HAR Analysis Interface */}
          {harData && (
            <>
              {/* View Mode Toggle & Actions */}
              <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('single')}
                    className={clsx(
                      'px-4 py-2 rounded-lg font-medium transition',
                      viewMode === 'single' 
                        ? 'bg-primary text-white' 
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    Single File
                  </button>
                  <button
                    onClick={() => setViewMode('compare')}
                    className={clsx(
                      'px-4 py-2 rounded-lg font-medium transition',
                      viewMode === 'compare' 
                        ? 'bg-primary text-white' 
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    <GitCompare className="h-4 w-4 inline mr-2" />
                    Compare
                  </button>
                </div>

              </div>

              {/* Help Section */}
              {showHelp && (
                <div className="mb-6 rounded-xl border-2 border-blue-200 bg-blue-50 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      HAR Analyzer Guide
                    </h3>
                    <button
                      onClick={() => setShowHelp(false)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
                    <div>
                      <h4 className="font-semibold mb-2">Getting Started:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Export HAR from DevTools (Network tab → Save as HAR)</li>
                        <li>Upload the .har file here</li>
                        <li>Use filters to find specific requests</li>
                        <li>Click "More" to see full request/response details</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Features:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Filtering:</strong> By method, status, content type, domain</li>
                        <li><strong>Search:</strong> Search URLs, methods, status codes</li>
                        <li><strong>Sanitization:</strong> Remove sensitive data before sharing</li>
                        <li><strong>Comparison:</strong> Compare two HAR files side-by-side</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Privacy & Security:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        <li>HAR files contain cookies, tokens, and sensitive data</li>
                        <li>Enable sanitization before sharing with external teams</li>
                        <li>Check headers and request bodies for PII</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Best Practices:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Start recording before the action</li>
                        <li>Export "HAR with content" to include response bodies</li>
                        <li>Use filters to reduce noise (static assets, etc.)</li>
                        <li>Compare before/after HARs to detect regressions</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Statistics Dashboard */}
              {stats && (
                <div className="mb-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                  <button
                    onClick={() => {
                      setFilterMethod('all');
                      setFilterStatus('all');
                      setSearchQuery('');
                    }}
                    className="rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50 transition cursor-pointer text-left"
                  >
                    <div className="text-xs text-slate-500 mb-0.5">Total Requests</div>
                    <div className="text-lg font-bold text-slate-900">{stats.totalRequests}</div>
                  </button>
                  <button
                    onClick={() => {
                      setFilterStatus('failed');
                      setSearchQuery('');
                    }}
                    className="rounded-lg border border-red-200 bg-red-50 p-3 hover:bg-red-100 transition cursor-pointer text-left"
                  >
                    <div className="text-xs text-red-600 mb-0.5">Failed</div>
                    <div className="text-lg font-bold text-red-700">{stats.failed}</div>
                  </button>
                  <button
                    onClick={() => {
                      setFilterStatus('all');
                      setSearchQuery('time>1000');
                    }}
                    className="rounded-lg border border-orange-200 bg-orange-50 p-3 hover:bg-orange-100 transition cursor-pointer text-left"
                  >
                    <div className="text-xs text-orange-600 mb-0.5">Slow (&gt;1s)</div>
                    <div className="text-lg font-bold text-orange-700">{stats.slow}</div>
                  </button>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <div className="text-xs text-blue-600 mb-0.5">Avg Time</div>
                    <div className="text-lg font-bold text-blue-700">{formatTime(stats.avgTime)}</div>
                  </div>
                  <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
                    <div className="text-xs text-purple-600 mb-0.5">Total Size</div>
                    <div className="text-lg font-bold text-purple-700">{formatBytes(stats.totalSize)}</div>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                    <div className="text-xs text-green-600 mb-0.5">Domains</div>
                    <div className="text-lg font-bold text-green-700">{stats.domains}</div>
                  </div>
                  <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                    <div className="text-xs text-indigo-600 mb-0.5">Methods</div>
                    <div className="text-lg font-bold text-indigo-700">{stats.methods}</div>
                  </div>
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                    <div className="text-xs text-yellow-600 mb-0.5">Total Time</div>
                    <div className="text-lg font-bold text-yellow-700">{formatTime(stats.totalTime)}</div>
                  </div>
                </div>
              )}

              {/* Comparison Mode - Second File Upload */}
              {viewMode === 'compare' && !harData2 && (
                <div className="mb-6 rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
                  <GitCompare className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Second HAR File</h3>
                  <p className="text-sm text-slate-600 mb-4">Upload another HAR file to compare with the first one</p>
                  <input
                    ref={fileInputRef2}
                    type="file"
                    accept=".har,.json"
                    onChange={(e) => handleFileUpload(e.target.files[0], setHarData2)}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef2.current?.click()}
                    className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition"
                  >
                    Choose Second HAR File
                  </button>
                </div>
              )}

              {/* Filters */}
              <div className="mb-6 rounded-xl border-2 border-slate-200 bg-white p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Search */}
                  <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">Search</label>
                      <button
                        onClick={() => setShowSearchHelp(!showSearchHelp)}
                        className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                        title="Show search syntax help"
                      >
                        <Lightbulb className="h-3.5 w-3.5" />
                        Advanced
                      </button>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder='Search all fields, or use: URL="api", Status=400, Response="error"'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border-2 border-slate-200 bg-white pl-10 pr-10 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1 rounded hover:bg-slate-100"
                          title="Clear search"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {showSearchHelp && (
                      <div className="mt-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
                        <p className="font-semibold mb-2">Advanced Search Syntax:</p>
                        <ul className="space-y-1.5 list-disc list-inside">
                          <li><code className="bg-blue-100 px-1 rounded">URL="api"</code> or <code className="bg-blue-100 px-1 rounded">url:api</code> - Search only in URLs</li>
                          <li><code className="bg-blue-100 px-1 rounded">Status=400</code> - Filter by status code</li>
                          <li><code className="bg-blue-100 px-1 rounded">Response="error"</code> - Search only in response bodies</li>
                          <li><code className="bg-blue-100 px-1 rounded">Request="data"</code> - Search only in request bodies</li>
                          <li><code className="bg-blue-100 px-1 rounded">Method=POST</code> - Filter by HTTP method</li>
                          <li><code className="bg-blue-100 px-1 rounded">Domain="example.com"</code> - Filter by domain</li>
                          <li><code className="bg-blue-100 px-1 rounded">Header="authorization"</code> - Search in all headers (request + response)</li>
                          <li><code className="bg-blue-100 px-1 rounded">RequestHeader="Content-Type"</code> - Search in request headers only</li>
                          <li><code className="bg-blue-100 px-1 rounded">ResponseHeader="Set-Cookie"</code> - Search in response headers only</li>
                          <li>Combine multiple: <code className="bg-blue-100 px-1 rounded">Status=400 URL="api" Header="bearer"</code></li>
                          <li>General search without field: <code className="bg-blue-100 px-1 rounded">error</code> searches all fields</li>
                          <li className="mt-2 text-blue-800"><strong>Note:</strong> All searches are case-insensitive and use "contains" matching. Search terms are highlighted in yellow in the results.</li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Method Filter */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Method</label>
                    <CustomDropdown
                      options={[
                        { value: 'all', label: 'All Methods' },
                        ...uniqueMethods.map(m => ({ value: m, label: m })),
                      ]}
                      value={filterMethod}
                      onChange={setFilterMethod}
                      placeholder="All Methods"
                    />
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
                    <CustomDropdown
                      options={[
                        { value: 'all', label: 'All Status' },
                        { value: '2xx', label: '2xx Success' },
                        { value: '4xx', label: '4xx Client Error' },
                        { value: '5xx', label: '5xx Server Error' },
                        { value: 'failed', label: 'Failed' },
                      ]}
                      value={filterStatus}
                      onChange={setFilterStatus}
                      placeholder="All Status"
                    />
                  </div>

                  {/* Domain Filter */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Domain</label>
                    <CustomDropdown
                      options={[
                        { value: '', label: 'All Domains' },
                        ...uniqueDomains.map(d => ({ value: d, label: d })),
                      ]}
                      value={filterDomain}
                      onChange={setFilterDomain}
                      placeholder="All Domains"
                    />
                  </div>
                </div>

                {/* Sanitization Toggle */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSanitizeEnabled(!sanitizeEnabled)}
                        className={clsx(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition',
                          sanitizeEnabled ? 'bg-green-500' : 'bg-slate-300'
                        )}
                      >
                        <span
                          className={clsx(
                            'inline-block h-4 w-4 transform rounded-full bg-white transition',
                            sanitizeEnabled ? 'translate-x-6' : 'translate-x-1'
                          )}
                        />
                      </button>
                      <div>
                        <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                          {sanitizeEnabled ? <Lock className="h-4 w-4 text-green-600" /> : <Unlock className="h-4 w-4 text-slate-400" />}
                          Sanitize Sensitive Data
                        </div>
                        <div className="text-xs text-slate-500">Remove cookies, tokens, and sensitive headers before export</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowHelp(!showHelp)}
                        className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition flex items-center gap-2 text-sm"
                      >
                        <HelpCircle className="h-4 w-4" />
                        Help
                      </button>
                      <button
                        onClick={() => exportHAR(harData, 'har-analysis.json')}
                        className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition flex items-center gap-2 text-sm"
                      >
                        <Download className="h-4 w-4" />
                        Export
                      </button>
                      <button
                        onClick={() => {
                          setHarData(null);
                          setHarData2(null);
                          setFilterMethod('all');
                          setFilterStatus('all');
                          setFilterContentType('all');
                          setFilterDomain('');
                          setSearchQuery('');
                        }}
                        className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition flex items-center gap-2 text-sm"
                      >
                        <X className="h-4 w-4" />
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Two-Panel Layout: Table + Details */}
              <div className={clsx(
                "flex gap-0 h-[calc(100vh-450px)] transition-all duration-300 relative",
                selectedEntryIndex !== null ? "" : ""
              )}>
                {/* Left Panel: Requests Table */}
                <div 
                  className="rounded-l-xl border-2 border-r-0 border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col transition-all"
                  style={{ width: selectedEntryIndex !== null ? `${panelWidth}%` : '100%' }}
                >
                  <div className="flex-1 overflow-hidden">
                    {filteredEntries.length === 0 && entries.length > 0 ? (
                      <div className="p-12 text-center h-full flex items-center justify-center">
                        <div>
                          <Filter className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Requests Match Your Filters</h3>
                          <p className="text-sm text-slate-500 mb-4">
                            We have <span className="font-semibold text-slate-700">{entries.length}</span> request{entries.length !== 1 ? 's' : ''} total, but none match your current filter settings.
                          </p>
                          <button
                            onClick={() => {
                              setFilterMethod('all');
                              setFilterStatus('all');
                              setFilterContentType('all');
                              setFilterDomain('');
                              setSearchQuery('');
                            }}
                            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition"
                          >
                            Clear All Filters
                          </button>
                        </div>
                      </div>
                    ) : (
                      <VirtualizedHarTable
                        filteredEntries={filteredEntries}
                        groupedEntries={groupedEntries}
                        groupBy={groupBy}
                        expandedGroups={expandedGroups}
                        toggleGroup={toggleGroup}
                        selectedEntryIndex={selectedEntryIndex}
                        setSelectedEntryIndex={setSelectedEntryIndex}
                        getStatusColor={getStatusColor}
                        formatBytes={formatBytes}
                        formatTime={formatTime}
                        searchQuery={searchQuery}
                        highlightText={highlightText}
                        handleSort={handleSort}
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        entries={entries}
                      />
                    )}
                  </div>
                </div>

                {/* Resize Handle */}
                {selectedEntryIndex !== null && filteredEntries[selectedEntryIndex] && (
                  <div
                    data-resize-handle
                    className={clsx(
                      "w-1 bg-slate-300 hover:bg-primary cursor-col-resize transition-colors relative z-10 flex items-center justify-center",
                      isResizing && "bg-primary"
                    )}
                    onMouseDown={(e) => {
                      setIsResizing(true);
                      e.preventDefault();
                    }}
                    style={{ minWidth: '4px' }}
                  >
                    <div className="absolute inset-y-0 w-full flex items-center justify-center">
                      <GripVertical className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                )}

                {/* Right Panel: Entry Details - Only show when entry is selected */}
                {selectedEntryIndex !== null && filteredEntries[selectedEntryIndex] && (
                  <div 
                    className="rounded-r-xl border-2 border-l-0 border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col transition-all"
                    style={{ width: `${100 - panelWidth}%` }}
                  >
                    <HarEntryDetails 
                      entry={filteredEntries[selectedEntryIndex]} 
                      formatBytes={formatBytes} 
                      formatTime={formatTime}
                      onClose={() => setSelectedEntryIndex(null)}
                      searchQuery={searchQuery}
                    />
                  </div>
                )}
              </div>
            </>
          )}
          </div>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
};

// HAR Entry Row Component
const HarEntryRow = ({ entry, index, isSelected, onSelect, getStatusColor, formatBytes, formatTime, searchQuery = '' }) => {
  const status = entry.response?.status || 0;
  const method = entry.request?.method || 'GET';
  const url = entry.request?.url || '';
  const contentType = entry.response?.content?.mimeType || '';
  const size = entry.response?.content?.size || 0;
  const time = entry.time || 0;

  return (
    <tr 
      className={clsx(
        'border-b border-slate-100 transition cursor-pointer',
        isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-slate-50'
      )}
      onClick={onSelect}
    >
      <td className="px-4 py-2">
        <span className="text-xs font-mono font-semibold text-slate-700">{method}</span>
      </td>
      <td className="px-4 py-2">
        {status ? (
          <span className={clsx('inline-block px-2 py-0.5 rounded text-xs font-semibold text-white', getStatusColor(status))}>
            {status}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-2 max-w-md">
        <div className="text-xs font-mono text-slate-700 truncate" title={url}>
          {highlightText(url, searchQuery)}
        </div>
      </td>
      <td className="px-4 py-2">
        <div className="text-xs text-slate-600 truncate" title={contentType}>
          {highlightText(contentType.split(';')[0] || '—', searchQuery)}
        </div>
      </td>
      <td className="px-4 py-2">
        <span className="text-xs font-mono text-slate-600">{formatBytes(size)}</span>
      </td>
      <td className="px-4 py-2">
        <span className="text-xs font-mono text-slate-600">{formatTime(time)}</span>
      </td>
    </tr>
  );
};

// Extract search terms from advanced search query for highlighting
// This should match the same parsing logic as parseSearchQuery above
const extractSearchTerms = (searchQuery) => {
  if (!searchQuery || !searchQuery.trim()) return [];
  
  const terms = [];
  let remainingQuery = searchQuery;
  
  // Use the same pattern as parseSearchQuery for consistency
  // Pattern: Field="value" or Field:value or Field=value
  const fieldPattern = /(\w+)[:=]\s*"?([^"=,]+)"?/gi;
  
  // Track which parts we've extracted to remove from remaining query
  const extractedRanges = [];
  let match;
  
  // Reset regex lastIndex to ensure we start from beginning
  fieldPattern.lastIndex = 0;
  
  while ((match = fieldPattern.exec(searchQuery)) !== null) {
    const fieldValue = match[2].trim();
    if (fieldValue && fieldValue.length > 0) {
      terms.push(fieldValue);
      extractedRanges.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0]
      });
    }
  }
  
  // Remove extracted field queries from remaining query
  if (extractedRanges.length > 0) {
    // Sort by position (descending) to remove from end to start
    extractedRanges.sort((a, b) => b.start - a.start);
    
    let modifiedQuery = searchQuery;
    extractedRanges.forEach(range => {
      modifiedQuery = 
        modifiedQuery.substring(0, range.start) + 
        ' ' + 
        modifiedQuery.substring(range.end);
    });
    remainingQuery = modifiedQuery;
  }
  
  // Extract general search terms from remaining text
  remainingQuery = remainingQuery
    .replace(/["',=:]+/g, ' ')  // Remove operators
    .replace(/\s+/g, ' ')        // Normalize spaces
    .trim();
  
  // Split remaining query into words (if any)
  if (remainingQuery && remainingQuery.length > 0) {
    const words = remainingQuery
      .split(/\s+/)
      .filter(w => {
        const trimmed = w.trim();
        return trimmed.length > 0 && 
               !trimmed.match(/^(and|or|not)$/i) &&  // Skip boolean operators
               !trimmed.match(/^[=:"']+$/);           // Skip pure operators/symbols
      });
    terms.push(...words);
  }
  
  // If nothing was extracted (simple search), use the whole query
  if (terms.length === 0 && searchQuery.trim()) {
    const simpleQuery = searchQuery.trim();
    // Only use if it doesn't look like a field query
    if (!simpleQuery.match(/^\w+[:=]/)) {
      terms.push(simpleQuery);
    }
  }
  
  // Remove duplicates and filter invalid terms
  const uniqueTerms = [...new Set(terms.filter(t => {
    const trimmed = t.trim();
    return trimmed.length > 0 && 
           trimmed.length < 100 &&  // Skip extremely long terms
           trimmed.length >= 1;      // At least 1 character
  }))];
  
  // Sort by length (longer first) for better highlighting
  return uniqueTerms.sort((a, b) => b.length - a.length);
};

// Highlight search term(s) in text
const highlightText = (text, searchQuery) => {
  if (!searchQuery || !text) return text;
  
  // Convert to string if not already
  const textStr = String(text);
  if (!textStr || textStr.length === 0) return textStr;
  
  // Extract all search terms (from advanced syntax or general search)
  let searchTerms = extractSearchTerms(searchQuery);
  
  // If no terms extracted, use the whole query (for simple searches)
  if (searchTerms.length === 0) {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      searchTerms = [trimmedQuery];
    } else {
      return textStr;
    }
  }
  
  // Create regex pattern for all terms (escape special regex chars)
  const patterns = searchTerms
    .map(term => {
      const trimmed = term.trim();
      // Escape special regex characters
      return trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .filter(pattern => pattern.length > 0);
  
  if (patterns.length === 0) return textStr;
  
  // Create combined regex pattern
  // Sort patterns by length (longer first) to match longer phrases first
  const sortedPatterns = patterns.sort((a, b) => b.length - a.length);
  const combinedPattern = new RegExp(`(${sortedPatterns.join('|')})`, 'gi');
  
  // Split text by matches
  const parts = textStr.split(combinedPattern);
  
  // Highlight matching parts
  return parts.map((part, index) => {
    if (!part || part.length === 0) return part;
    
    // Check if this part matches any search term (case-insensitive)
    const matches = sortedPatterns.some(pattern => {
      try {
        const regex = new RegExp(`^${pattern}$`, 'i');
        return regex.test(part);
      } catch {
        // If regex fails, do simple case-insensitive comparison
        return part.toLowerCase().includes(pattern.toLowerCase());
      }
    });
    
    return matches ? (
      <mark key={index} className="bg-yellow-300 text-yellow-900 px-0.5 rounded font-semibold">
        {part}
      </mark>
    ) : part;
  });
};

// Check if search query exists in tab content (for tab indicator dots)
const hasSearchMatch = (tab, entry, searchQuery) => {
  if (!searchQuery) return false;
  
  const request = entry.request || {};
  const response = entry.response || {};
  
  // Extract search terms for matching (same logic as highlightText)
  const searchTerms = extractSearchTerms(searchQuery);
  
  // If no terms extracted, check the whole query
  const termsToCheck = searchTerms.length > 0 ? searchTerms : [searchQuery.trim()];
  
  // Check if any search term matches content in this tab
  const checkMatches = (text) => {
    if (!text) return false;
    const textLower = String(text).toLowerCase();
    return termsToCheck.some(term => textLower.includes(term.toLowerCase()));
  };
  
  switch (tab) {
    case 'requestHeaders':
      return request.headers?.some(h => 
        checkMatches(h.name) || checkMatches(h.value)
      ) || false;
    case 'responseHeaders':
      return response.headers?.some(h => 
        checkMatches(h.name) || checkMatches(h.value)
      ) || false;
    case 'request':
      return (
        checkMatches(request.url) ||
        checkMatches(request.postData?.text) ||
        checkMatches(JSON.stringify(request.postData?.params || {})) ||
        checkMatches(request.cookies?.map(c => `${c.name}=${c.value}`).join(' '))
      );
    case 'response':
      return (
        checkMatches(response.content?.text) ||
        checkMatches(response.cookies?.map(c => `${c.name}=${c.value}`).join(' '))
      );
    case 'timing':
      // Check timing-related fields
      const timingStr = JSON.stringify(entry.timings || {}).toLowerCase();
      const size = response.content?.size || 0;
      const summaryStr = `${entry.time || 0} ${size} ${response.status || 0} ${response.statusText || ''}`.toLowerCase();
      return checkMatches(timingStr) || checkMatches(summaryStr);
    default:
      return false;
  }
};

// HAR Entry Details Component
const HarEntryDetails = ({ entry, formatBytes, formatTime, onClose, searchQuery = '' }) => {
  const [activeTab, setActiveTab] = useState('requestHeaders');
  const [formattedBodies, setFormattedBodies] = useState({ request: false, response: false });
  const request = entry.request || {};
  const response = entry.response || {};

  // Store raw texts and reset format state when entry changes
  useEffect(() => {
    setFormattedBodies({ request: false, response: false });
  }, [entry]);

  // Store raw texts using useMemo to preserve original format
  const rawRequestText = useMemo(() => {
    // Always get the raw, unformatted text
    if (request.postData?.text) {
      // Return raw text as-is (could be JSON, XML, form data, etc.)
      return request.postData.text;
    }
    if (request.postData?.params) {
      // Convert params to JSON string (minified for raw view)
      return JSON.stringify(request.postData.params);
    }
    return '';
  }, [request.postData]);

  const rawResponseText = useMemo(() => {
    return response.content?.text || '';
  }, [response.content]);

  if (!entry) {
    return (
      <div className="p-6 text-center text-slate-500">
        <p>No entry selected</p>
      </div>
    );
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const formatBody = (text) => {
    if (!text || typeof text !== 'string') return text;
    const trimmed = text.trim();
    if (!trimmed) return text;
    
    try {
      // Try to parse as JSON
      const json = JSON.parse(trimmed);
      // If successful, return formatted JSON with 2-space indentation
      return JSON.stringify(json, null, 2);
    } catch (e) {
      // If not valid JSON, return as-is (could be XML, form data, plain text, etc.)
      return text;
    }
  };

  const toggleFormat = (type) => {
    setFormattedBodies(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const getBodyText = (type) => {
    if (type === 'request') {
      return formattedBodies.request ? formatBody(rawRequestText) : rawRequestText;
    } else {
      return formattedBodies.response ? formatBody(rawResponseText) : rawResponseText;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tabs as Header - Matching Left Table Header Style Exactly */}
      <div className="border-b-2 border-slate-300 bg-slate-50">
        <div className="flex items-center">
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700 transition p-2 rounded hover:bg-slate-100 ml-2 mr-1"
              title="Close details"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setActiveTab('requestHeaders')}
            className={clsx(
              'px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider transition whitespace-nowrap relative hover:bg-slate-100 cursor-pointer',
              activeTab === 'requestHeaders' && 'bg-slate-100'
            )}
          >
            Request Headers {request.headers && `(${request.headers.length})`}
            {hasSearchMatch('requestHeaders', entry, searchQuery) && (
              <span className="absolute top-2 right-2 h-2 w-2 bg-yellow-400 rounded-full border border-yellow-600"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('responseHeaders')}
            className={clsx(
              'px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider transition whitespace-nowrap relative hover:bg-slate-100 cursor-pointer',
              activeTab === 'responseHeaders' && 'bg-slate-100'
            )}
          >
            Response Headers {response.headers && `(${response.headers.length})`}
            {hasSearchMatch('responseHeaders', entry, searchQuery) && (
              <span className="absolute top-2 right-2 h-2 w-2 bg-yellow-400 rounded-full border border-yellow-600"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('request')}
            className={clsx(
              'px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider transition whitespace-nowrap relative hover:bg-slate-100 cursor-pointer',
              activeTab === 'request' && 'bg-slate-100'
            )}
          >
            Request
            {hasSearchMatch('request', entry, searchQuery) && (
              <span className="absolute top-2 right-2 h-2 w-2 bg-yellow-400 rounded-full border border-yellow-600"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('response')}
            className={clsx(
              'px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider transition whitespace-nowrap relative hover:bg-slate-100 cursor-pointer',
              activeTab === 'response' && 'bg-slate-100'
            )}
          >
            Response
            {hasSearchMatch('response', entry, searchQuery) && (
              <span className="absolute top-2 right-2 h-2 w-2 bg-yellow-400 rounded-full border border-yellow-600"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('timing')}
            className={clsx(
              'px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider transition whitespace-nowrap relative hover:bg-slate-100 cursor-pointer',
              activeTab === 'timing' && 'bg-slate-100'
            )}
          >
            Timing
            {hasSearchMatch('timing', entry, searchQuery) && (
              <span className="absolute top-2 right-2 h-2 w-2 bg-yellow-400 rounded-full border border-yellow-600"></span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: activeTab === 'requestHeaders' || activeTab === 'responseHeaders' ? '0' : '1rem' }}>

      {/* Tab Content - Request Headers */}
      {activeTab === 'requestHeaders' && (
        <div className="w-full h-full">
          <table className="w-full border-collapse h-full">
            <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 border-b border-slate-200">
                    Header Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 border-b border-slate-200">
                    Value
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700 border-b border-slate-200 w-20">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {request.headers && request.headers.length > 0 ? (
                  request.headers.map((h, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="px-4 py-2.5">
                        <span className="text-sm font-semibold text-slate-700 font-mono">
                          {highlightText(h.name, searchQuery)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-sm text-slate-900 font-mono break-all">
                          {highlightText(h.value || '—', searchQuery)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => copyToClipboard(h.value || '')}
                          className="text-slate-500 hover:text-slate-700 transition p-1 rounded hover:bg-slate-100"
                          title="Copy value"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-500">
                      No request headers available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
        </div>
      )}

      {/* Tab Content - Response Headers */}
      {activeTab === 'responseHeaders' && (
        <div className="w-full h-full">
          <table className="w-full border-collapse h-full">
            <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 border-b border-slate-200">
                    Header Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 border-b border-slate-200">
                    Value
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700 border-b border-slate-200 w-20">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {response.headers && response.headers.length > 0 ? (
                      response.headers.map((h, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="px-4 py-2.5">
                            <span className="text-sm font-semibold text-slate-700 font-mono">
                              {highlightText(h.name, searchQuery)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-sm text-slate-900 font-mono break-all">
                              {highlightText(h.value || '—', searchQuery)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              onClick={() => copyToClipboard(h.value || '')}
                              className="text-slate-500 hover:text-slate-700 transition p-1 rounded hover:bg-slate-100"
                              title="Copy value"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-500">
                      No response headers available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
        </div>
      )}

      {activeTab === 'request' && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-slate-900">Request URL</h4>
              <button
                onClick={() => copyToClipboard(request.url || '')}
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 transition"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-3 text-sm font-mono break-all">
              {highlightText(request.url || '—', searchQuery)}
            </div>
          </div>
          {request.postData && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-slate-900">Request Body</h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleFormat('request')}
                    className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 transition"
                    title={formattedBodies.request ? 'Show raw' : 'Format JSON'}
                  >
                    <Code className="h-4 w-4" />
                    {formattedBodies.request ? 'Raw' : 'Format'}
                  </button>
                  <button
                    onClick={() => copyToClipboard(getBodyText('request'))}
                    className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 transition"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </button>
                </div>
              </div>
              <pre className="bg-white rounded-lg border border-slate-200 p-3 text-sm font-mono whitespace-pre-wrap">
                {highlightText(getBodyText('request'), searchQuery)}
              </pre>
            </div>
          )}
          {request.cookies && request.cookies.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-2">Cookies</h4>
              <div className="bg-white rounded-lg border border-slate-200 p-3">
                {request.cookies.map((c, i) => (
                  <div key={i} className="text-sm font-mono mb-2 py-1 border-b border-slate-100 last:border-0">
                    <span className="font-semibold text-slate-700">{highlightText(c.name, searchQuery)}</span> = <span className="text-slate-900">{highlightText(c.value, searchQuery)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'response' && (
        <div className="space-y-4">
          {response.content && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-slate-900">Response Body</h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleFormat('response')}
                    className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 transition"
                    title={formattedBodies.response ? 'Show raw' : 'Format JSON'}
                  >
                    <Code className="h-4 w-4" />
                    {formattedBodies.response ? 'Raw' : 'Format'}
                  </button>
                  <button
                    onClick={() => copyToClipboard(getBodyText('response'))}
                    className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 transition"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </button>
                </div>
              </div>
              <pre className="bg-white rounded-lg border border-slate-200 p-3 text-sm font-mono whitespace-pre-wrap">
                {highlightText(getBodyText('response'), searchQuery)}
              </pre>
            </div>
          )}
          {response.cookies && response.cookies.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-2">Response Cookies</h4>
              <div className="bg-white rounded-lg border border-slate-200 p-3">
                {response.cookies.map((c, i) => (
                  <div key={i} className="text-sm font-mono mb-2 py-1 border-b border-slate-100 last:border-0">
                    <span className="font-semibold text-slate-700">{highlightText(c.name, searchQuery)}</span> = <span className="text-slate-900">{highlightText(c.value, searchQuery)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'timing' && (
        <div className="space-y-4">
          {/* Summary - First */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-2">Summary</h4>
            <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
              <div className="flex justify-between text-sm py-1 border-b border-slate-100 last:border-0">
                <span className="text-slate-600 font-medium">Total Time:</span>
                <span className="font-mono text-slate-900 font-semibold">{entry.time || 0} ms</span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b border-slate-100 last:border-0">
                <span className="text-slate-600 font-medium">Size:</span>
                <span className="font-mono text-slate-900 font-semibold">{formatBytes(response.content?.size || 0)}</span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b border-slate-100 last:border-0">
                <span className="text-slate-600 font-medium">Status:</span>
                <span className="font-mono text-slate-900 font-semibold">{response.status || 0} {response.statusText || ''}</span>
              </div>
            </div>
          </div>
          {/* Request Timing - Second */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-2">Request Timing</h4>
            <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
              {entry.timings && Object.entries(entry.timings).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm py-1 border-b border-slate-100 last:border-0">
                  <span className="text-slate-600 capitalize font-medium">{key}:</span>
                  <span className="font-mono text-slate-900 font-semibold">{value !== -1 ? `${value} ms` : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    );
  };

// Initialize React app
// Export component for Router, render directly for extension
const HarAnalyzerComponent = () => <HarAnalyzer />;
export default HarAnalyzerComponent;

// Render directly if running as standalone (extension mode)
if (typeof window !== 'undefined' && document.getElementById('root') && !window.__ROUTER_MODE__) {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(<HarAnalyzer />);
}

