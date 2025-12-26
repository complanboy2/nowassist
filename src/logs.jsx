import React, { useEffect, useState, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import {
  AlertCircle,
  CheckCircle2,
  Info,
  X,
  Search,
  Filter,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Network,
  FileText,
  AlertTriangle,
  RefreshCw,
  Clock,
  ShieldCheck,
  Key,
  BarChart3,
  Activity,
  Zap,
  CheckSquare,
  Square,
  FileJson,
  FileCode,
} from 'lucide-react';
import clsx from 'clsx';
import CustomDropdown from './CustomDropdown';
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

const LOG_STORAGE_KEY = 'browser_logs';
const MAX_LOGS = 1000;

const LogLevel = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  NETWORK: 'network',
};

const LogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [allTabs, setAllTabs] = useState([]); // All available tabs
  const [tabs, setTabs] = useState([]); // Displayed tabs (filtered based on selection)
  const [selectedTabId, setSelectedTabId] = useState(null);
  const [selectedTabIds, setSelectedTabIds] = useState(new Set()); // Multi-select for > 5 tabs
  const [tabSearchQuery, setTabSearchQuery] = useState('');
  const [showTabSelector, setShowTabSelector] = useState(false);
  const [allAvailableTabs, setAllAvailableTabs] = useState([]); // Store all tabs separately for dropdown
  const [showTabDropdown, setShowTabDropdown] = useState(false);
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'console' | 'network' | 'error' | 'performance'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | '2xx' | '4xx' | '5xx' | 'failed'
  const [filterResourceType, setFilterResourceType] = useState('all'); // 'all' | 'api' | 'static' - filter out images/fonts/CSS
  const [filterDomain, setFilterDomain] = useState(''); // Filter by domain
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('timestamp'); // 'timestamp' | 'level' | 'status' | 'method' | 'url' | 'latency'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [groupBy, setGroupBy] = useState('none'); // 'none' | 'level' | 'url' | 'type'
  const [showTimeDeltas, setShowTimeDeltas] = useState(true); // Show time deltas between logs
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [autoScroll, setAutoScroll] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const logsEndRef = useRef(null);
  const logsContainerRef = useRef(null);
  const userScrolledRef = useRef(false);
  const isAtBottomRef = useRef(true);

  const filteredFeatures = FEATURES.filter(f => 
    f.name.toLowerCase().includes(sidebarSearchQuery.toLowerCase()) ||
    f.category.toLowerCase().includes(sidebarSearchQuery.toLowerCase())
  );
  const categories = [...new Set(FEATURES.map(f => f.category))];

  // Check capture status on load
  useEffect(() => {
    if (chrome.storage) {
      chrome.storage.local.get(['activeLoggingTabs'], (result) => {
        const activeTabs = result.activeLoggingTabs || [];
        const currentTabs = selectedTabIds.size > 0 
          ? Array.from(selectedTabIds) 
          : selectedTabId 
            ? [selectedTabId] 
            : [];
        setIsCapturing(currentTabs.some(tabId => activeTabs.includes(tabId)));
      });
    }
  }, [selectedTabId, selectedTabIds]);

  // Load tabs and logs
  useEffect(() => {
    loadTabsAndLogs();
    
    // Listen for new logs
    if (chrome.runtime && chrome.runtime.id) {
      const listener = (message) => {
        if (message && message.type === 'NEW_LOG') {
          // If the new log is for the selected tab, reload
          if (!selectedTabId || message.tabId === selectedTabId) {
            loadTabsAndLogs();
          } else {
            // Just update tabs list
            loadTabs();
          }
        }
      };
      chrome.runtime.onMessage.addListener(listener);
      
      // Poll for updates every 1 second (more frequent for better responsiveness)
      const interval = setInterval(() => {
        loadTabs();
        loadLogsForSelectedTabs(); // Also reload logs
      }, 1000);
      
      return () => {
        try {
          chrome.runtime.onMessage.removeListener(listener);
        } catch (e) {
          // Ignore cleanup errors
        }
        clearInterval(interval);
      };
    }
  }, [selectedTabId, selectedTabIds]);

  // Auto-select tab from URL parameter (from DevTools)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabIdParam = urlParams.get('tabId');
    if (tabIdParam) {
      const tabId = parseInt(tabIdParam, 10);
      if (!isNaN(tabId)) {
        setSelectedTabId(tabId);
        setSelectedTabIds(new Set([tabId]));
        loadLogsForTab(tabId);
        return; // Don't auto-select if we have a tabId param
      }
    }
  }, []);

  // Auto-select current active tab on first load
  useEffect(() => {
    if (!selectedTabId && selectedTabIds.size === 0 && tabs.length > 0) {
      // Try to get current active tab
      if (chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
          if (activeTabs.length > 0) {
            const activeTabId = activeTabs[0].id;
            const foundTab = tabs.find(t => t.id === activeTabId);
            if (foundTab) {
              if (tabs.length > 5) {
                // Multi-select mode: select active tab
                setSelectedTabIds(new Set([activeTabId]));
              }
              setSelectedTabId(activeTabId);
              loadLogsForTab(activeTabId);
            } else {
              // Select first tab with logs, or first tab
              const firstTabWithLogs = tabs.find(t => t.hasLogs) || tabs[0];
              if (tabs.length > 5) {
                setSelectedTabIds(new Set([firstTabWithLogs.id]));
              }
              setSelectedTabId(firstTabWithLogs.id);
              loadLogsForTab(firstTabWithLogs.id);
            }
          } else {
            // Select first tab with logs, or first tab
            const firstTabWithLogs = tabs.find(t => t.hasLogs) || tabs[0];
            if (tabs.length > 5) {
              setSelectedTabIds(new Set([firstTabWithLogs.id]));
            }
            setSelectedTabId(firstTabWithLogs.id);
            loadLogsForTab(firstTabWithLogs.id);
          }
        });
      } else {
        // Select first tab with logs, or first tab
        const firstTabWithLogs = tabs.find(t => t.hasLogs) || tabs[0];
        if (tabs.length > 5) {
          setSelectedTabIds(new Set([firstTabWithLogs.id]));
        }
        setSelectedTabId(firstTabWithLogs.id);
        loadLogsForTab(firstTabWithLogs.id);
      }
    }
  }, [tabs]);

  // Check if user is at/near bottom of scroll container
  const checkIfAtBottom = () => {
    if (!logsContainerRef.current) return false;
    const container = logsContainerRef.current;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const threshold = 50; // pixels from bottom to consider "at bottom"
    
    const isAtBottom = scrollHeight - scrollTop - clientHeight < threshold;
    isAtBottomRef.current = isAtBottom;
    return isAtBottom;
  };

  // Handle scroll events to detect user scrolling
  useEffect(() => {
    const container = logsContainerRef.current;
    if (!container) return;

    let scrollTimeout;
    const handleScroll = () => {
      const wasAtBottom = isAtBottomRef.current;
      const isNowAtBottom = checkIfAtBottom();
      
      // If user scrolled away from bottom, disable auto-scroll
      if (wasAtBottom && !isNowAtBottom) {
        userScrolledRef.current = true;
        setAutoScroll(false);
      }
      // If user scrolled back to bottom, re-enable auto-scroll
      else if (!wasAtBottom && isNowAtBottom) {
        userScrolledRef.current = false;
        setAutoScroll(true);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, []);

  // Auto-scroll to bottom only if enabled and user is at/near bottom
  useEffect(() => {
    if (autoScroll && logsEndRef.current && isAtBottomRef.current) {
      // Small delay to ensure DOM is updated
      requestAnimationFrame(() => {
        if (logsEndRef.current && isAtBottomRef.current) {
          logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  }, [logs, autoScroll]);

  const loadTabs = async () => {
    if (!chrome.runtime || !chrome.runtime.id) return;
    try {
      // Get tabs with logs from background
      const logsResponse = await chrome.runtime.sendMessage({ 
        action: 'get_logs',
        tabId: null // Get tabs list
      });
      
      // Get all open tabs
      let allOpenTabs = [];
      if (chrome.tabs) {
        try {
          const tabs = await new Promise((resolve) => {
            chrome.tabs.query({}, resolve);
          });
          allOpenTabs = tabs
            .filter(tab => 
              tab.url && 
              !tab.url.startsWith('chrome://') && 
              !tab.url.startsWith('chrome-extension://') &&
              !tab.url.startsWith('moz-extension://') &&
              !tab.url.startsWith('edge://') &&
              !tab.url.startsWith('about:')
            )
            .map(tab => ({
              id: tab.id,
              url: tab.url,
              title: tab.title,
              active: tab.active,
              windowId: tab.windowId,
            }));
        } catch (e) {
          // Ignore errors
        }
      }
      
      // Merge: tabs with logs + all open tabs
      const tabsWithLogs = logsResponse?.tabs || [];
      const tabsMap = new Map();
      
      // Add tabs with logs
      tabsWithLogs.forEach(tab => {
        tabsMap.set(tab.id, { ...tab, hasLogs: true });
      });
      
      // Add all open tabs (even without logs)
      allOpenTabs.forEach(tab => {
        // Get a safe display name for the tab
        let displayName = tab.title;
        if (!displayName && tab.url) {
          try {
            const url = new URL(tab.url);
            displayName = url.hostname || tab.url;
          } catch {
            // Invalid URL (e.g., chrome://, extension pages)
            displayName = tab.url.length > 50 ? `${tab.url.substring(0, 50)}...` : tab.url;
          }
        }
        if (!displayName) {
          displayName = `Tab ${tab.id}`;
        }
        
        if (!tabsMap.has(tab.id)) {
          tabsMap.set(tab.id, { ...tab, hasLogs: false, logCount: 0, lastUpdate: 0, displayName });
        } else {
          tabsMap.set(tab.id, { ...tabsMap.get(tab.id), ...tab, displayName });
        }
      });
      
      // Store all tabs for selection
      const allTabs = Array.from(tabsMap.values());
      
      // Sort by: active first, then has logs, then by last update
      allTabs.sort((a, b) => {
        // Active tab first
        if (a.active && !b.active) return -1;
        if (!a.active && b.active) return 1;
        // Has logs second
        if (a.hasLogs && !b.hasLogs) return -1;
        if (!a.hasLogs && b.hasLogs) return 1;
        return (b.lastUpdate || 0) - (a.lastUpdate || 0);
      });
      
      // If a tab is selected, only show that tab (or selected tabs)
      // Otherwise, show all tabs for selection
      const selectedTabsArray = selectedTabIds.size > 0 
        ? Array.from(selectedTabIds) 
        : selectedTabId 
          ? [selectedTabId] 
          : [];
      
      // Always store all tabs for dropdown selection
      setAllAvailableTabs(allTabs);
      
      // If a tab is selected, only show that tab (or selected tabs) for display
      if (selectedTabsArray.length > 0) {
        // Only show selected tabs
        const selectedTabsOnly = allTabs.filter(tab => selectedTabsArray.includes(tab.id));
        setTabs(selectedTabsOnly);
      } else {
        // Keep previous tabs or empty - don't auto-populate
        if (tabs.length === 0) {
          setTabs([]);
        }
      }
    } catch (err) {
      // Ignore errors
    }
  };

  const [injecting, setInjecting] = useState(false);
  const [injectionStatus, setInjectionStatus] = useState('');
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const injectIntoSelectedTabs = async () => {
    if (!chrome.runtime || !chrome.runtime.id) {
      setInjectionStatus('✗ Chrome runtime not available');
      setTimeout(() => setInjectionStatus(''), 3000);
      return;
    }
    
    // Get selected tabs
    const tabIdsToInject = selectedTabIds.size > 0 
      ? Array.from(selectedTabIds) 
      : selectedTabId 
        ? [selectedTabId] 
        : [];
    
    if (tabIdsToInject.length === 0) {
      setInjectionStatus('✗ No tabs selected. Please select tabs first.');
      setTimeout(() => setInjectionStatus(''), 3000);
      return;
    }
    
    setInjecting(true);
    setInjectionStatus(`Injecting content script into ${tabIdsToInject.length} selected tab(s)...`);
    
    try {
      if (!chrome.scripting) {
        throw new Error('Chrome scripting API not available');
      }
      
      // Inject directly using chrome.scripting API
      let successCount = 0;
      let failCount = 0;
      
      for (const tabId of tabIdsToInject) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content-script.js'],
          });
          successCount++;
        } catch (err) {
          // Some tabs might fail (e.g., already injected, permissions, etc.)
          failCount++;
          console.debug(`Failed to inject into tab ${tabId}:`, err.message);
        }
      }
      
      setInjectionStatus(`✓ Injected into ${successCount} tab(s)${failCount > 0 ? ` (${failCount} skipped)` : ''}!`);
      
      // Note: Injection doesn't activate logging - user must click "Start Capture"
      
      // Reload tabs after injection
      setTimeout(() => {
        loadTabs();
        setInjectionStatus('');
        setInjecting(false);
      }, 1000);
    } catch (err) {
      console.error('Failed to inject into selected tabs', err);
      setInjectionStatus(`✗ Failed to inject: ${err.message || 'Unknown error'}`);
      setInjecting(false);
      setTimeout(() => setInjectionStatus(''), 5000);
    }
  };

  const injectIntoTab = async (tabId) => {
    if (!chrome.runtime || !chrome.runtime.id || !chrome.scripting) return;
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content-script.js'],
      });
    } catch (err) {
      // Silently fail - auto-injection will handle it
      console.debug('Injection failed (will auto-inject):', err.message);
    }
  };

  const startCapture = async () => {
    if (!chrome.runtime || !chrome.runtime.id) return;
    
    const tabIdsToActivate = selectedTabIds.size > 0 
      ? Array.from(selectedTabIds) 
      : selectedTabId 
        ? [selectedTabId] 
        : [];
    
    if (tabIdsToActivate.length === 0) {
      setInjectionStatus('✗ No tabs selected. Please select tabs first.');
      setTimeout(() => setInjectionStatus(''), 3000);
      return;
    }
    
    try {
      // First ensure content script is injected
      for (const tabId of tabIdsToActivate) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content-script.js'],
          });
        } catch (err) {
          // Script might already be injected, that's ok
          console.debug('Script injection (may already be injected):', err.message);
        }
      }
      
      // Then activate logging
      await chrome.runtime.sendMessage({
        action: 'activate_logging',
        tabIds: tabIdsToActivate
      });
      
      setIsCapturing(true);
      setInjectionStatus(`✓ Log capture activated for ${tabIdsToActivate.length} tab(s)! Make some console.log calls or network requests to see them here.`);
      
      // Reload logs after a short delay to show any immediate logs
      setTimeout(() => {
        loadLogsForSelectedTabs();
        setInjectionStatus('');
      }, 2000);
    } catch (err) {
      console.error('Failed to activate logging', err);
      setInjectionStatus(`✗ Failed to activate logging: ${err.message || 'Unknown error'}`);
      setTimeout(() => setInjectionStatus(''), 5000);
    }
  };

  const stopCapture = async () => {
    if (!chrome.runtime || !chrome.runtime.id) return;
    
    const tabIdsToDeactivate = selectedTabIds.size > 0 
      ? Array.from(selectedTabIds) 
      : selectedTabId 
        ? [selectedTabId] 
        : [];
    
    if (tabIdsToDeactivate.length === 0) {
      // Deactivate all
      chrome.storage.local.get(['activeLoggingTabs'], (result) => {
        const allActiveTabs = result.activeLoggingTabs || [];
        chrome.runtime.sendMessage({
          action: 'deactivate_logging',
          tabIds: allActiveTabs
        });
      });
    } else {
      await chrome.runtime.sendMessage({
        action: 'deactivate_logging',
        tabIds: tabIdsToDeactivate
      });
    }
    
    setIsCapturing(false);
    setInjectionStatus('✓ Log capture stopped - no new logs will be captured');
    setTimeout(() => setInjectionStatus(''), 5000);
    
    // Refresh to show updated state
    setTimeout(() => {
      loadTabs();
    }, 500);
  };

  const loadTabsAndLogs = async () => {
    await loadTabs();
    await loadLogsForSelectedTabs();
  };

  const loadLogsForSelectedTabs = async () => {
    if (!chrome.runtime || !chrome.runtime.id) return;
    
    // Determine which tabs to load
    const tabIdsToLoad = selectedTabIds.size > 0 
      ? Array.from(selectedTabIds) 
      : selectedTabId 
        ? [selectedTabId] 
        : [];
    
    if (tabIdsToLoad.length === 0) {
      setLogs([]);
      return;
    }
    
    try {
      // Load logs from all selected tabs
      const allLogs = [];
      for (const tabId of tabIdsToLoad) {
        const response = await chrome.runtime.sendMessage({ 
          action: 'get_logs',
          tabId: tabId
        });
        if (response && response.logs) {
          // Add tabId to each log for filtering
          allLogs.push(...response.logs.map(log => ({ ...log, sourceTabId: tabId })));
        }
      }
      
      // Sort by timestamp
      allLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      setLogs(allLogs);
    } catch (err) {
      console.error('Failed to load logs', err);
    }
  };

  const loadLogsForTab = async (tabId) => {
    // Legacy function - now uses loadLogsForSelectedTabs
    setSelectedTabId(tabId);
    setSelectedTabIds(new Set([tabId]));
    await loadLogsForSelectedTabs();
  };

  const clearLogs = async () => {
    if (!chrome.runtime || !chrome.runtime.id) return;
    try {
      await chrome.runtime.sendMessage({ 
        action: 'clear_logs',
        tabId: selectedTabId // Clear selected tab, or all if null
      });
      setLogs([]);
    } catch (err) {
      console.error('Failed to clear logs', err);
    }
  };

  const exportLogs = (format) => {
    const filteredLogs = getFilteredLogs();
    let content, mimeType, filename;

    if (format === 'json') {
      content = JSON.stringify(filteredLogs, null, 2);
      mimeType = 'application/json';
      filename = `logs-${new Date().toISOString().split('T')[0]}.json`;
    } else if (format === 'csv') {
      // CSV
      const headers = ['Timestamp', 'Level', 'Type', 'Message', 'URL', 'Status', 'Method', 'Latency', 'Response Size'];
      const rows = filteredLogs.map(log => [
        log.timestamp,
        log.level,
        log.type || 'console',
        JSON.stringify(log.message || log.data || ''),
        log.url || log.pageUrl || '',
        log.status || log.statusCode || '',
        log.method || '',
        log.latency || '',
        log.responseSize || '',
      ]);
      content = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      mimeType = 'text/csv';
      filename = `logs-${new Date().toISOString().split('T')[0]}.csv`;
    } else if (format === 'har') {
      // HAR format for network logs
      const networkLogs = filteredLogs.filter(log => log.type === 'network');
      const har = {
        log: {
          version: '1.2',
          creator: { name: 'NowAssist', version: '0.1.0' },
          entries: networkLogs.map(log => ({
            startedDateTime: log.timestamp,
            time: log.latency || 0,
            request: {
              method: log.method || 'GET',
              url: log.url || log.pageUrl || '',
              headers: log.headers ? Object.entries(log.headers).map(([name, value]) => ({ name, value })) : [],
            },
            response: {
              status: log.status || log.statusCode || 0,
              statusText: log.statusText || '',
              headers: log.responseHeaders ? Object.entries(log.responseHeaders).map(([name, value]) => ({ name, value })) : [],
              content: {
                size: log.responseSize || 0,
              },
            },
          })),
        },
      };
      content = JSON.stringify(har, null, 2);
      mimeType = 'application/json';
      filename = `logs-${new Date().toISOString().split('T')[0]}.har`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFilteredLogs = () => {
    let filtered = logs;

    // Filter by level
    if (filterLevel !== 'all') {
      filtered = filtered.filter(log => log.level === filterLevel);
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(log => {
        if (filterType === 'console') {
          // Console logs have type: 'console'
          return log.type === 'console';
        }
        if (filterType === 'network') {
          return log.type === 'network';
        }
        if (filterType === 'error') {
          // Error logs have type: 'error' OR level: 'error'
          return log.type === 'error' || log.level === 'error';
        }
        if (filterType === 'performance') {
          return log.type === 'performance';
        }
        return true;
      });
    }

    // Filter by HTTP status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(log => {
        if (log.type !== 'network' || !log.status) return false;
        if (filterStatus === '2xx') return log.status >= 200 && log.status < 300;
        if (filterStatus === '4xx') return log.status >= 400 && log.status < 500;
        if (filterStatus === '5xx') return log.status >= 500;
        if (filterStatus === 'failed') return log.status === 'failed' || log.status === 'pending';
        return true;
      });
    }

    // Filter by resource type (hide static assets like images/fonts/CSS/JS)
    if (filterResourceType === 'api') {
      filtered = filtered.filter(log => {
        if (log.type !== 'network') return true; // Keep all non-network logs
        const url = (log.url || '').toLowerCase();
        const extension = url.split('.').pop()?.split('?')[0] || '';
        const staticExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico', 'woff', 'woff2', 'ttf', 'eot', 'css', 'js', 'map'];
        return !staticExtensions.includes(extension);
      });
    } else if (filterResourceType === 'static') {
      filtered = filtered.filter(log => {
        if (log.type !== 'network') return false; // Hide non-network logs when showing only static
        const url = (log.url || '').toLowerCase();
        const extension = url.split('.').pop()?.split('?')[0] || '';
        const staticExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico', 'woff', 'woff2', 'ttf', 'eot', 'css', 'js', 'map'];
        return staticExtensions.includes(extension);
      });
    }
    
    // Filter by domain
    if (filterDomain) {
      filtered = filtered.filter(log => {
        const url = (log.url || log.pageUrl || '').toLowerCase();
        try {
          const urlObj = new URL(url);
          return urlObj.hostname.includes(filterDomain.toLowerCase());
        } catch {
          return url.includes(filterDomain.toLowerCase());
        }
      });
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log => {
        const message = JSON.stringify(log.message || log.data || '').toLowerCase();
        const url = (log.url || log.pageUrl || '').toLowerCase();
        const method = (log.method || '').toLowerCase();
        return message.includes(query) || url.includes(query) || method.includes(query);
      });
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aVal, bVal;
      if (sortBy === 'timestamp') {
        aVal = new Date(a.timestamp).getTime();
        bVal = new Date(b.timestamp).getTime();
      } else if (sortBy === 'level') {
        aVal = a.level || '';
        bVal = b.level || '';
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else if (sortBy === 'status') {
        aVal = a.status || a.statusCode || 0;
        bVal = b.status || b.statusCode || 0;
      } else if (sortBy === 'method') {
        aVal = (a.method || '').toLowerCase();
        bVal = (b.method || '').toLowerCase();
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else if (sortBy === 'url') {
        aVal = (a.url || a.pageUrl || '').toLowerCase();
        bVal = (b.url || b.pageUrl || '').toLowerCase();
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else if (sortBy === 'latency') {
        aVal = a.latency || 0;
        bVal = b.latency || 0;
      } else {
        // Default to level
        aVal = a.level || '';
        bVal = b.level || '';
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      // For numeric comparisons
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // For string comparisons (fallback)
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  };

  // Calculate insights/stats
  const logStats = useMemo(() => {
    const stats = {
      total: logs.length,
      errors: logs.filter(l => l.level === 'error' || l.type === 'error').length,
      warnings: logs.filter(l => l.level === 'warn').length,
      network: logs.filter(l => l.type === 'network').length,
      console: logs.filter(l => l.type === 'console').length,
      failedRequests: logs.filter(l => l.type === 'network' && (l.status >= 400 || !l.status)).length,
      avgLatency: 0,
      totalSize: 0,
    };
    
    const networkLogs = logs.filter(l => l.type === 'network' && l.latency);
    if (networkLogs.length > 0) {
      stats.avgLatency = Math.round(networkLogs.reduce((sum, l) => sum + (l.latency || 0), 0) / networkLogs.length);
    }
    
    const logsWithSize = logs.filter(l => l.responseSize);
    if (logsWithSize.length > 0) {
      stats.totalSize = logsWithSize.reduce((sum, l) => sum + (l.responseSize || 0), 0);
    }
    
    return stats;
  }, [logs]);

  const filteredLogs = useMemo(() => getFilteredLogs(), [logs, filterLevel, filterType, filterStatus, filterResourceType, filterDomain, searchQuery, sortBy, sortOrder]);

  const groupedLogs = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Logs': filteredLogs };
    }

    const groups = {};
    filteredLogs.forEach(log => {
      let key;
      if (groupBy === 'level') {
        key = log.level.toUpperCase();
      } else if (groupBy === 'url') {
        // Better URL pattern grouping
        try {
          const url = log.url || log.pageUrl || '';
          if (url) {
            const urlObj = new URL(url);
            // Group by origin + path pattern (e.g., /api/v1/users, /api/v1/posts)
            const pathParts = urlObj.pathname.split('/').filter(Boolean);
            if (pathParts.length >= 2) {
              // Group by origin + first 2 path segments
              key = `${urlObj.origin}/${pathParts.slice(0, 2).join('/')}`;
            } else {
              key = urlObj.origin;
            }
          } else {
            key = 'No URL';
          }
        } catch {
          // Fallback: extract domain from URL string
          const url = log.url || log.pageUrl || '';
          const match = url.match(/https?:\/\/([^\/]+)/);
          key = match ? match[1] : (url || 'Unknown');
        }
      } else if (groupBy === 'type') {
        key = (log.type || 'console').toUpperCase();
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
    });

    return groups;
  }, [filteredLogs, groupBy]);

  const toggleGroup = (key) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedGroups(newExpanded);
  };

  // Handle column sorting
  const handleSort = (column) => {
    if (sortBy === column) {
      // Toggle order if clicking same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to descending
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'network':
        return <Network className="h-4 w-4 text-purple-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'warn':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'network':
        return 'bg-purple-50 border-purple-200 text-purple-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString() + '.' + date.getMilliseconds().toString().padStart(3, '0');
  };

  // Calculate time delta between logs (for race condition detection)
  const calculateTimeDelta = (currentLog, previousLog) => {
    if (!previousLog || !currentLog?.timestamp || !previousLog?.timestamp) return null;
    const currentTime = new Date(currentLog.timestamp).getTime();
    const previousTime = new Date(previousLog.timestamp).getTime();
    const delta = currentTime - previousTime;
    
    if (delta < 1) return '<1ms';
    if (delta < 1000) return `${delta}ms`;
    return `${(delta / 1000).toFixed(2)}s`;
  };

  const formatMessage = (log) => {
    if (log.type === 'network') {
      const status = log.status || log.statusCode || 'Pending';
      const latency = log.latency ? ` (${log.latency}ms)` : '';
      return `${log.method || 'GET'} ${log.url || log.pageUrl || ''} - ${status}${latency}`;
    }
    if (log.type === 'performance') {
      return `${log.resourceType || 'Resource'} - ${log.url || ''} (${log.duration?.toFixed(2)}ms, ${(log.transferSize / 1024).toFixed(2)}KB)`;
    }
    // Better formatting for console logs
    if (log.type === 'console' || log.type === 'error') {
      const message = log.message || '';
      const data = log.data;
      
      // If there's structured data, show it nicely
      if (data && Array.isArray(data) && data.length > 0) {
        const formatted = data.map(item => {
          if (typeof item === 'object') {
            try {
              return JSON.stringify(item, null, 2);
            } catch {
              return String(item);
            }
          }
          return String(item);
        }).join(' ');
        return message ? `${message} ${formatted}` : formatted;
      }
      
      if (typeof message === 'object') {
        try {
          return JSON.stringify(message, null, 2);
        } catch {
          return String(message);
        }
      }
      
      return String(message || data || '');
    }
    return typeof log.message === 'object' ? JSON.stringify(log.message, null, 2) : String(log.message || log.data || '');
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <div className={clsx('border-r border-slate-200 bg-white transition-all duration-300', sidebarOpen ? 'w-64' : 'w-0 overflow-hidden')}>
        <div className="flex h-full flex-col p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">NowAssist</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSidebarOpen(false);
                }
              }}
              className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100 active:scale-95 focus:outline-none"
              tabIndex={0}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search features..."
                value={sidebarSearchQuery}
                onChange={(e) => setSidebarSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none"
                tabIndex={0}
              />
            </div>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto">
            {categories.map(category => {
              const categoryFeatures = filteredFeatures.filter(f => f.category === category);
              if (categoryFeatures.length === 0) return null;
              return (
                <div key={category}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{category}</h3>
                  <div className="space-y-1">
                    {categoryFeatures.map(feature => {
                      const Icon = feature.icon;
                      const isActive = feature.id === 'logs';
                      return (
                        <a
                          key={feature.id}
                          href={feature.url}
                          className={clsx(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                            isActive ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-600 hover:bg-slate-50',
                            feature.status === 'coming-soon' && 'pointer-events-none opacity-60'
                          )}
                          tabIndex={feature.status === 'coming-soon' ? -1 : 0}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="flex-1">{feature.name}</span>
                          {feature.status === 'coming-soon' && (
                            <span className="text-xs text-slate-400">Soon</span>
                          )}
                        </a>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Collapse button when sidebar is closed */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSidebarOpen(true);
            }
          }}
          className="fixed left-0 top-1/2 z-10 -translate-y-1/2 rounded-r-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-lg transition hover:bg-slate-50 active:scale-95 focus:outline-none"
          tabIndex={0}
          aria-label="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="w-full max-w-7xl mx-auto">
          {/* Professional Header Bar - Fixed at top */}
          <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                {/* Left: Title */}
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Browser Logs</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Monitor console logs, errors, and network requests</p>
                </div>
                
                {/* Right: Only Auto-scroll in header */}
                <div className="flex items-center gap-2">
                  {/* Auto-scroll Toggle */}
                  <button
                    onClick={() => {
                      const newAutoScroll = !autoScroll;
                      setAutoScroll(newAutoScroll);
                      if (newAutoScroll) {
                        setTimeout(() => {
                          const isAtBottom = checkIfAtBottom();
                          if (isAtBottom) {
                            userScrolledRef.current = false;
                            isAtBottomRef.current = true;
                          }
                        }, 100);
                      }
                    }}
                    className={clsx(
                      'rounded-lg border px-3 py-1.5 text-xs font-medium transition flex items-center gap-1.5',
                      autoScroll 
                        ? 'border-green-300 bg-green-50 text-green-700' 
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    )}
                    title={autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled'}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Auto-scroll
                  </button>
                  
                  {/* Clear */}
                  <button
                    onClick={clearLogs}
                    disabled={logs.length === 0}
                    className={clsx(
                      'rounded-lg border px-3 py-1.5 text-xs font-medium transition flex items-center gap-1.5',
                      logs.length === 0
                        ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                        : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                    )}
                    title="Clear all logs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Content Area - Equal width container */}
          <div className="p-6">
          {/* Info Section */}
          <div className="mb-4">
            <button
              onClick={() => setShowHowItWorks(!showHowItWorks)}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 transition"
            >
              <p className="text-xs text-blue-800 font-medium flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" />
                How Log Capture Works
              </p>
              {showHowItWorks ? (
                <ChevronUp className="h-4 w-4 text-blue-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-blue-600" />
              )}
            </button>
            {showHowItWorks && (
              <div className="mt-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside ml-1">
                  <li><strong>Content Script</strong> runs inside each webpage tab</li>
                  <li>It intercepts <code className="bg-blue-100 px-1 rounded text-blue-900">console.log</code>, errors, <code className="bg-blue-100 px-1 rounded text-blue-900">fetch</code>, and network requests</li>
                  <li>Logs are sent from the tab → <strong>Background Service Worker</strong> → stored per tab</li>
                  <li>This viewer displays logs in real-time</li>
                  <li><strong>Select tabs and click "Start Capture" to begin logging</strong></li>
                </ol>
              </div>
            )}
          </div>

          {/* Insights/Stats with Refresh/Export */}
          {logs.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-slate-700">Log Statistics</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadTabsAndLogs}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition flex items-center gap-1.5"
                    title="Refresh logs"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                  </button>
                  
                  {/* Export Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition flex items-center gap-1.5"
                      title="Export logs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    {showExportMenu && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowExportMenu(false)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
                          <button
                            onClick={() => {
                              exportLogs('json');
                              setShowExportMenu(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Export as JSON
                          </button>
                          <button
                            onClick={() => {
                              exportLogs('csv');
                              setShowExportMenu(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Export as CSV
                          </button>
                          <button
                            onClick={() => {
                              exportLogs('har');
                              setShowExportMenu(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Export as HAR
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
              <button
                onClick={() => {
                  setFilterLevel('all');
                  setFilterType('all');
                }}
                className="rounded-lg border border-slate-200 bg-white p-3 text-left hover:bg-slate-50 transition cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-slate-500" />
                  <span className="text-xs font-medium text-slate-600">Total</span>
                </div>
                <div className="text-lg font-bold text-slate-900">{logStats.total}</div>
              </button>
              <button
                onClick={() => {
                  setFilterLevel('error');
                  setFilterType('all');
                }}
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-left hover:bg-red-100 transition cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-xs font-medium text-red-700">Errors</span>
                </div>
                <div className="text-lg font-bold text-red-700">{logStats.errors}</div>
              </button>
              <button
                onClick={() => {
                  setFilterLevel('warn');
                  setFilterType('all');
                }}
                className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-left hover:bg-yellow-100 transition cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-xs font-medium text-yellow-700">Warnings</span>
                </div>
                <div className="text-lg font-bold text-yellow-700">{logStats.warnings}</div>
              </button>
              <button
                onClick={() => {
                  setFilterLevel('all');
                  setFilterType('network');
                }}
                className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-left hover:bg-blue-100 transition cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Network className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">Network</span>
                </div>
                <div className="text-lg font-bold text-blue-700">{logStats.network}</div>
              </button>
              <button
                onClick={() => {
                  setFilterLevel('all');
                  setFilterType('console');
                }}
                className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-left hover:bg-purple-100 transition cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-medium text-purple-700">Console</span>
                </div>
                <div className="text-lg font-bold text-purple-700">{logStats.console}</div>
              </button>
              <button
                onClick={() => {
                  setFilterLevel('all');
                  setFilterType('network');
                  setFilterStatus('failed');
                }}
                className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-left hover:bg-orange-100 transition cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <X className="h-4 w-4 text-orange-600" />
                  <span className="text-xs font-medium text-orange-700">Failed</span>
                </div>
                <div className="text-lg font-bold text-orange-700">{logStats.failedRequests}</div>
              </button>
              {logStats.avgLatency > 0 && (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-medium text-indigo-700">Avg Latency</span>
                  </div>
                  <div className="text-lg font-bold text-indigo-700">{logStats.avgLatency}ms</div>
                </div>
              )}
              {logStats.totalSize > 0 && (
                <div className="rounded-lg border border-teal-200 bg-teal-50 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="h-4 w-4 text-teal-600" />
                    <span className="text-xs font-medium text-teal-700">Data</span>
                  </div>
                  <div className="text-lg font-bold text-teal-700">
                    {(logStats.totalSize / 1024).toFixed(1)}KB
                  </div>
                </div>
              )}
              </div>
            </div>
          )}

          {/* Tab Selection */}
          <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <label className="text-sm font-semibold text-slate-900 block">
                  {selectedTabId || selectedTabIds.size > 0 
                    ? `Selected Tab${selectedTabIds.size > 1 ? 's' : ''} (${selectedTabIds.size || (selectedTabId ? 1 : 0)})` 
                    : 'Select Tab to Monitor'}
                </label>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedTabId || selectedTabIds.size > 0
                    ? `${isCapturing ? '✓ Capturing logs from' : 'Ready to capture'} ${selectedTabIds.size || (selectedTabId ? 1 : 0)} tab(s). ${isCapturing ? '' : 'Click "Start Capture" to begin logging.'}`
                    : 'Search and select tabs to monitor. Scripts are auto-injected but logging is inactive until you activate it.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowTabDropdown(!showTabDropdown)}
                    className="rounded-lg border-2 border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-sm"
                    title="Search and add tabs"
                  >
                    <Search className="h-3.5 w-3.5" />
                    {selectedTabId || selectedTabIds.size > 0 ? 'Add/Change Tab' : 'Search Tabs'}
                  </button>
                  
                  {/* Dropdown */}
                  {showTabDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-96 bg-white border-2 border-slate-200 rounded-lg shadow-xl z-50 max-h-[500px] flex flex-col">
                      <div className="p-3 border-b border-slate-200">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search tabs by title or URL..."
                            value={tabSearchQuery}
                            onChange={(e) => setTabSearchQuery(e.target.value)}
                            onFocus={() => setShowTabDropdown(true)}
                            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            autoFocus
                          />
                          {tabSearchQuery && (
                            <button
                              onClick={() => setTabSearchQuery('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                              title="Clear search"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="overflow-y-auto flex-1 p-2">
                        {(() => {
                          const filteredTabs = tabSearchQuery
                            ? allAvailableTabs.filter(tab => {
                                const query = tabSearchQuery.toLowerCase();
                                return (tab.title || '').toLowerCase().includes(query) ||
                                       (tab.url || '').toLowerCase().includes(query) ||
                                       (tab.displayName || '').toLowerCase().includes(query);
                              })
                            : allAvailableTabs.slice(0, 20); // Show first 20 when no search
                          
                          if (filteredTabs.length === 0) {
                            return (
                              <div className="text-center py-8 text-sm text-slate-500">
                                <Search className="h-6 w-6 mx-auto mb-2 text-slate-400" />
                                <p>No tabs found</p>
                                <p className="text-xs mt-1">Try a different search term</p>
                              </div>
                            );
                          }
                          
                          return (
                            <div className="space-y-1">
                              {filteredTabs.map(tab => {
                                const isSelected = selectedTabIds.has(tab.id) || selectedTabId === tab.id;
                                
                                return (
                                  <button
                                    key={tab.id}
                                    onClick={() => {
                                      if (isSelected) {
                                        // Remove from selection
                                        const newSelected = new Set(selectedTabIds);
                                        newSelected.delete(tab.id);
                                        setSelectedTabIds(newSelected);
                                        if (selectedTabId === tab.id) {
                                          setSelectedTabId(null);
                                        }
                                        if (newSelected.size === 0) {
                                          setTabs([]);
                                          setLogs([]);
                                        } else {
                                          loadLogsForSelectedTabs();
                                        }
                                      } else {
                                        // Add to selection
                                        const newSelected = new Set(selectedTabIds);
                                        newSelected.add(tab.id);
                                        setSelectedTabIds(newSelected);
                                        setSelectedTabId(tab.id);
                                        loadLogsForTab(tab.id);
                                      }
                                    }}
                                    className={clsx(
                                      'w-full text-left px-3 py-2 rounded-lg transition flex items-center gap-2 group',
                                      isSelected
                                        ? 'bg-primary/10 border-2 border-primary'
                                        : 'hover:bg-slate-50 border-2 border-transparent'
                                    )}
                                  >
                                    {isSelected ? (
                                      <CheckSquare className="h-4 w-4 text-primary flex-shrink-0" />
                                    ) : (
                                      <Square className="h-4 w-4 text-slate-400 group-hover:text-slate-600 flex-shrink-0" />
                                    )}
                                    {tab.active && <div className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />}
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-slate-900 truncate">
                                        {tab.title || tab.displayName || `Tab ${tab.id}`}
                                      </div>
                                      <div className="text-xs text-slate-500 truncate">{tab.url}</div>
                                      {tab.hasLogs && (
                                        <div className="text-xs text-slate-600 mt-0.5">
                                          {tab.logCount || 0} log{tab.logCount !== 1 ? 's' : ''}
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                      {!tabSearchQuery && allAvailableTabs.length > 20 && (
                        <div className="px-3 py-2 border-t border-slate-200 text-xs text-slate-500 text-center">
                          Showing first 20 tabs. Search to find more.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {isCapturing ? (
                  <button
                    onClick={stopCapture}
                    className="rounded-lg border-2 border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition flex items-center gap-1.5 shadow-sm"
                    title="Stop capturing logs"
                  >
                    <X className="h-3.5 w-3.5" />
                    Stop Capture
                  </button>
                ) : (
                  <button
                    onClick={startCapture}
                    disabled={selectedTabIds.size === 0 && !selectedTabId}
                    className={clsx(
                      'rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition flex items-center gap-1.5 shadow-sm',
                      (selectedTabIds.size === 0 && !selectedTabId)
                        ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'border-green-400 bg-green-500 text-white hover:bg-green-600'
                    )}
                    title="Start capturing logs from selected tabs"
                  >
                    <Activity className="h-3.5 w-3.5" />
                    Start Capture
                  </button>
                )}
              </div>
            </div>
            
            {/* Click outside to close dropdown */}
            {showTabDropdown && (
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowTabDropdown(false)}
              />
            )}
            
            {injectionStatus && (
              <div className={clsx(
                'mb-3 px-3 py-2 rounded-lg text-xs',
                injectionStatus.startsWith('✓') 
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : injectionStatus.startsWith('✗')
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              )}>
                {injectionStatus}
              </div>
            )}
            
            {/* Show selected tabs */}
            {selectedTabId || selectedTabIds.size > 0 ? (
              <div className="space-y-2">
                {(() => {
                  const selectedTabsList = selectedTabIds.size > 0 
                    ? Array.from(selectedTabIds).map(id => allAvailableTabs.find(t => t.id === id)).filter(Boolean)
                    : selectedTabId 
                      ? [allAvailableTabs.find(t => t.id === selectedTabId)].filter(Boolean)
                      : [];
                  
                  return selectedTabsList.map(tab => (
                    <div 
                      key={tab.id} 
                      className="rounded-lg border-2 border-primary/20 bg-primary/5 p-3 flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {tab.active && <div className="h-2.5 w-2.5 rounded-full bg-green-500 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 text-sm truncate">
                            {tab.title || tab.displayName || `Tab ${tab.id}`}
                          </div>
                          <div className="text-xs text-slate-500 truncate mt-0.5">{tab.url}</div>
                          {tab.hasLogs && (
                            <div className="text-xs text-slate-600 mt-1 font-medium">
                              {tab.logCount || 0} log{tab.logCount !== 1 ? 's' : ''} captured
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          // Remove this tab from selection
                          const newSelected = new Set(selectedTabIds);
                          newSelected.delete(tab.id);
                          setSelectedTabIds(newSelected);
                          if (selectedTabId === tab.id) {
                            setSelectedTabId(newSelected.size > 0 ? Array.from(newSelected)[0] : null);
                          }
                          if (newSelected.size === 0) {
                            setTabs([]);
                            setLogs([]);
                          } else {
                            loadLogsForSelectedTabs();
                          }
                        }}
                        className="ml-3 p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition flex-shrink-0 opacity-0 group-hover:opacity-100"
                        title="Remove tab"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <div className="text-sm text-slate-500 py-8 text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                <Search className="h-6 w-6 mx-auto mb-2 text-slate-400" />
                <p className="font-medium">No tabs selected</p>
                <p className="text-xs mt-1">Click "Search Tabs" above to find and select tabs to monitor</p>
              </div>
            )}
          </div>

          {/* Filters and Search - Improved UI */}
          <div className="mb-4 space-y-3">
            {/* Search Bar - Prominent */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search logs by message, URL, or method..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-200 bg-white pl-12 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Active Filters Pills */}
            {(filterLevel !== 'all' || filterType !== 'all' || filterStatus !== 'all' || filterResourceType !== 'all' || filterDomain || searchQuery) && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-600">Active Filters:</span>
                {filterLevel !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                    Level: {filterLevel}
                    <button onClick={() => setFilterLevel('all')} className="hover:text-red-900">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filterType !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                    Type: {filterType}
                    <button onClick={() => setFilterType('all')} className="hover:text-blue-900">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filterStatus !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">
                    Status: {filterStatus}
                    <button onClick={() => setFilterStatus('all')} className="hover:text-orange-900">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filterResourceType !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                    Resource: {filterResourceType}
                    <button onClick={() => setFilterResourceType('all')} className="hover:text-purple-900">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filterDomain && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                    Domain: {filterDomain}
                    <button onClick={() => setFilterDomain('')} className="hover:text-indigo-900">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                    Search: "{searchQuery.substring(0, 20)}{searchQuery.length > 20 ? '...' : ''}"
                    <button onClick={() => setSearchQuery('')} className="hover:text-slate-900">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setFilterLevel('all');
                    setFilterType('all');
                    setFilterStatus('all');
                    setFilterResourceType('all');
                    setFilterDomain('');
                    setSearchQuery('');
                  }}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 underline"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* Filter Controls - Organized Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Level Filter */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5" />
                  Level
                </label>
                <CustomDropdown
                  value={filterLevel}
                  onChange={setFilterLevel}
                  options={[
                    { value: 'all', label: 'All Levels' },
                    { value: 'error', label: '🔴 Errors' },
                    { value: 'warn', label: '🟡 Warnings' },
                    { value: 'info', label: '🔵 Info' },
                    { value: 'debug', label: '⚪ Debug' },
                  ]}
                  placeholder="All Levels"
                />
              </div>

              {/* Type Filter */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Type
                </label>
                <CustomDropdown
                  value={filterType}
                  onChange={setFilterType}
                  options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'console', label: '📝 Console' },
                    { value: 'network', label: '🌐 Network' },
                    { value: 'error', label: '❌ Errors' },
                    { value: 'performance', label: '⚡ Performance' },
                  ]}
                  placeholder="All Types"
                />
              </div>

              {/* Status Filter (shown when network type selected) */}
              {(filterType === 'network' || filterType === 'all') && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" />
                    HTTP Status
                  </label>
                  <CustomDropdown
                    value={filterStatus}
                    onChange={setFilterStatus}
                    options={[
                      { value: 'all', label: 'All Status' },
                      { value: '2xx', label: '✅ 2xx Success' },
                      { value: '4xx', label: '⚠️ 4xx Client Error' },
                      { value: '5xx', label: '❌ 5xx Server Error' },
                      { value: 'failed', label: '🔴 Failed/Pending' },
                    ]}
                    placeholder="All Status"
                  />
                </div>
              )}

              {/* Resource Type Filter */}
              {(filterType === 'all' || filterType === 'network') && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Network className="h-3.5 w-3.5" />
                    Resources
                  </label>
                  <CustomDropdown
                    value={filterResourceType}
                    onChange={setFilterResourceType}
                    options={[
                      { value: 'all', label: 'All Resources' },
                      { value: 'api', label: '🔌 API Only (Hide Static)' },
                      { value: 'static', label: '📦 Static Only' },
                    ]}
                    placeholder="All Resources"
                  />
                </div>
              )}
            </div>

            {/* Advanced Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Domain Filter */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5" />
                  Domain/URL
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g., api.example.com"
                    value={filterDomain}
                    onChange={(e) => setFilterDomain(e.target.value)}
                    className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {filterDomain && (
                    <button
                      onClick={() => setFilterDomain('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                      title="Clear domain filter"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Grouping */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Group By
                </label>
                <CustomDropdown
                  value={groupBy}
                  onChange={setGroupBy}
                  options={[
                    { value: 'none', label: 'No Grouping' },
                    { value: 'level', label: 'By Level' },
                    { value: 'type', label: 'By Type' },
                    { value: 'url', label: 'By URL Pattern' },
                  ]}
                  placeholder="No Grouping"
                />
              </div>

              {/* Sort */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <ChevronDown className="h-3.5 w-3.5" />
                  Sort
                </label>
                <div className="flex items-center gap-2">
                  <CustomDropdown
                    value={sortBy}
                    onChange={setSortBy}
                    options={[
                      { value: 'timestamp', label: 'By Time' },
                      { value: 'level', label: 'By Level' },
                    ]}
                    placeholder="By Time"
                    className="flex-1"
                  />
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
                    title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                  >
                    {sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Time Deltas Toggle */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Time Deltas
                </label>
                <button
                  onClick={() => setShowTimeDeltas(!showTimeDeltas)}
                  className={clsx(
                    'w-full rounded-lg border-2 px-3 py-2 text-sm font-medium transition flex items-center justify-center gap-1.5',
                    showTimeDeltas 
                      ? 'border-green-300 bg-green-50 text-green-700' 
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  )}
                  title="Show time deltas between logs"
                >
                  <Clock className="h-4 w-4" />
                  {showTimeDeltas ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>
        {/* Logs Table - Professional table view with sortable columns */}
        <div className="rounded-xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden w-full">
          <div ref={logsContainerRef} className="max-h-[calc(100vh-300px)] overflow-x-auto overflow-y-auto">
            {Object.entries(groupedLogs).map(([groupKey, groupLogs]) => {
              if (groupBy !== 'none') {
                const isExpanded = expandedGroups.has(groupKey);
                return (
                  <div key={groupKey} className="border-b border-slate-200 last:border-b-0">
                    <button
                      onClick={() => toggleGroup(groupKey)}
                      className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition"
                    >
                      <span className="font-semibold text-slate-900">{groupKey} ({groupLogs.length})</span>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {isExpanded && (
                      <TableLogsView 
                        logs={groupLogs}
                        showTimeDeltas={showTimeDeltas}
                        calculateTimeDelta={calculateTimeDelta}
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        handleSort={handleSort}
                        getLevelIcon={getLevelIcon}
                        formatTimestamp={formatTimestamp}
                        formatMessage={formatMessage}
                        allLogs={logs}
                      />
                    )}
                  </div>
                );
              }
              return (
                <TableLogsView 
                  key={groupKey}
                  logs={groupLogs}
                  showTimeDeltas={showTimeDeltas}
                  calculateTimeDelta={calculateTimeDelta}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  handleSort={handleSort}
                  getLevelIcon={getLevelIcon}
                  formatTimestamp={formatTimestamp}
                  formatMessage={formatMessage}
                  allLogs={filteredLogs}
                />
              );
            })}
            {filteredLogs.length === 0 && (
              <div className="p-12 text-center">
                <div className="max-w-md mx-auto">
                  {logs.length === 0 ? (
                    <>
                      <FileText className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                      <h3 className="text-lg font-semibold text-slate-700 mb-2">No Logs Captured Yet</h3>
                      <p className="text-sm text-slate-500 mb-4">
                        Select a tab and click "Start Capture" to begin logging console messages, network requests, and errors.
                      </p>
                      <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                        <Activity className="h-4 w-4" />
                        <span>Logs will appear here once capture is started</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Filter className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                      <h3 className="text-lg font-semibold text-slate-700 mb-2">No Logs Match Your Filters</h3>
                      <p className="text-sm text-slate-500 mb-4">
                        We have <span className="font-semibold text-slate-700">{logs.length}</span> log{logs.length !== 1 ? 's' : ''} total, but none match your current filter settings.
                      </p>
                      <button
                        onClick={() => {
                          setFilterLevel('all');
                          setFilterType('all');
                          setFilterStatus('all');
                          setFilterResourceType('all');
                          setFilterDomain('');
                          setSearchQuery('');
                        }}
                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition"
                      >
                        Clear All Filters
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Table view component for logs
const TableLogsView = ({ logs, showTimeDeltas, calculateTimeDelta, sortBy, sortOrder, handleSort, getLevelIcon, formatTimestamp, formatMessage, allLogs }) => {
  const [expandedRows, setExpandedRows] = useState(new Set());
  
  const toggleRow = (logId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusBadgeColor = (status) => {
    if (!status || status === 'pending' || status === 'failed') return 'bg-gray-500';
    if (status >= 200 && status < 300) return 'bg-green-500';
    if (status >= 300 && status < 400) return 'bg-blue-500';
    if (status >= 400 && status < 500) return 'bg-orange-500';
    if (status >= 500) return 'bg-red-500';
    return 'bg-gray-500';
  };

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
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b-2 border-slate-300 bg-slate-50">
          <SortableHeader column="timestamp" className="w-[140px]">Time</SortableHeader>
          <SortableHeader column="level" className="w-[120px]">Level</SortableHeader>
          <SortableHeader column="status" className="w-[100px]">Status</SortableHeader>
          <SortableHeader column="method" className="w-[100px]">Method</SortableHeader>
          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-50 z-10">URL / Message</th>
          <SortableHeader column="latency" className="w-[100px]">Latency</SortableHeader>
          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-50 z-10 w-[100px]">Size</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-50 z-10 w-[80px]">Actions</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log, idx) => {
          const previousLog = idx > 0 ? logs[idx - 1] : null;
          const timeDelta = showTimeDeltas ? calculateTimeDelta(log, previousLog) : null;
          const isExpanded = expandedRows.has(log.id || idx);
          
          return (
            <React.Fragment key={log.id || idx}>
              <tr 
                className={clsx(
                  'border-b border-slate-100 hover:bg-slate-50 transition',
                  log.level === 'error' && 'bg-red-50/30',
                  log.type === 'network' && (log.status >= 400 || log.status === 'failed') && 'bg-orange-50/30'
                )}
              >
                {/* Time Column */}
                <td className="px-4 py-2 text-xs font-mono text-slate-600">
                  <div className="flex flex-col gap-0.5">
                    <span>{formatTimestamp(log.timestamp)}</span>
                    {timeDelta && (
                      <span className="text-[10px] text-slate-400" title="Time since previous log">+{timeDelta}</span>
                    )}
                  </div>
                </td>
                
                {/* Level Column */}
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {getLevelIcon(log.level)}
                    <span className="text-xs font-semibold uppercase">{log.level}</span>
                  </div>
                </td>
                
                {/* Status Column */}
                <td className="px-4 py-2">
                  {log.type === 'network' && log.status ? (
                    <span className={clsx(
                      'inline-block px-2 py-0.5 rounded text-xs font-semibold text-white',
                      getStatusBadgeColor(log.status)
                    )}>
                      {log.status}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                
                {/* Method Column */}
                <td className="px-4 py-2">
                  {log.type === 'network' && log.method ? (
                    <span className="text-xs font-mono font-semibold text-slate-700">{log.method}</span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                
                {/* URL / Message Column */}
                <td className="px-4 py-2 max-w-md">
                  <div className="text-xs break-words font-mono">
                    {log.type === 'network' ? (
                      <span className="text-slate-700 truncate block" title={log.url || log.pageUrl || ''}>
                        {log.url || log.pageUrl || '—'}
                      </span>
                    ) : (
                      <span className="text-slate-700 line-clamp-2" title={formatMessage(log)}>
                        {formatMessage(log)}
                      </span>
                    )}
                  </div>
                </td>
                
                {/* Latency Column */}
                <td className="px-4 py-2">
                  {log.type === 'network' && log.latency !== undefined ? (
                    <span className="text-xs font-mono text-slate-600">{log.latency}ms</span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                
                {/* Size Column */}
                <td className="px-4 py-2">
                  {log.type === 'network' && log.responseSize !== undefined ? (
                    <span className="text-xs font-mono text-slate-600">
                      {(log.responseSize / 1024).toFixed(1)}KB
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                
                {/* Actions Column */}
                <td className="px-4 py-2">
                  <button
                    onClick={() => toggleRow(log.id || idx)}
                    className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                  >
                    {isExpanded ? 'Less' : 'More'}
                  </button>
                </td>
              </tr>
              
              {/* Expanded Details Row */}
              {isExpanded && (
                <tr>
                  <td colSpan={8} className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <LogItemDetails log={log} formatMessage={formatMessage} allLogs={allLogs} />
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
};

const LogItemDetails = ({ log, formatMessage, allLogs }) => {
  return (
    <div className="text-xs text-slate-600 space-y-2">
      {log.url && log.url !== log.pageUrl && <div><strong>Request URL:</strong> {log.url}</div>}
      {log.method && <div><strong>Method:</strong> {log.method}</div>}
      {log.status && <div><strong>Status:</strong> {log.status} {log.statusText || ''}</div>}
      {log.latency !== undefined && <div><strong>Latency:</strong> {log.latency}ms</div>}
      {log.responseSize !== undefined && <div><strong>Response Size:</strong> {(log.responseSize / 1024).toFixed(2)}KB</div>}
      {log.stack && <div><strong>Stack:</strong> <pre className="whitespace-pre-wrap text-[10px] bg-white p-2 rounded border">{log.stack}</pre></div>}
      {log.filename && <div><strong>File:</strong> {log.filename}:{log.lineno}:{log.colno}</div>}
      {log.requestHeaders && <div><strong>Request Headers:</strong> <pre className="whitespace-pre-wrap text-[10px] bg-white p-2 rounded border max-h-40 overflow-auto">{JSON.stringify(log.requestHeaders, null, 2)}</pre></div>}
      {log.responseHeaders && <div><strong>Response Headers:</strong> <pre className="whitespace-pre-wrap text-[10px] bg-white p-2 rounded border max-h-40 overflow-auto">{JSON.stringify(log.responseHeaders, null, 2)}</pre></div>}
      {log.responseBody && (
        <div>
          <strong>Response Body:</strong>
          <pre className="whitespace-pre-wrap text-[10px] bg-white p-2 rounded border max-h-60 overflow-auto">
            {typeof log.responseBody === 'string' 
              ? log.responseBody 
              : JSON.stringify(log.responseBody, null, 2)}
          </pre>
        </div>
      )}
      {!log.responseBody && log.responseData && (
        <div>
          <strong>Response Data:</strong>
          <pre className="whitespace-pre-wrap text-[10px] bg-white p-2 rounded border max-h-60 overflow-auto">
            {typeof log.responseData === 'string' 
              ? log.responseData 
              : JSON.stringify(log.responseData, null, 2)}
          </pre>
        </div>
      )}
      {!log.responseBody && !log.responseData && log.type === 'network' && (
        <div className="text-slate-400 italic text-[10px]">
          Response body not captured (may be too large or capture failed)
        </div>
      )}
      {log.data && typeof log.data === 'object' && <div><strong>Data:</strong> <pre className="whitespace-pre-wrap text-[10px] bg-white p-2 rounded border max-h-60 overflow-auto">{JSON.stringify(log.data, null, 2)}</pre></div>}
      {log.data && typeof log.data !== 'object' && log.data && <div><strong>Data:</strong> <span className="font-mono text-[10px]">{String(log.data)}</span></div>}
      {log.resourceType && <div><strong>Resource Type:</strong> {log.resourceType}</div>}
      {log.duration !== undefined && <div><strong>Duration:</strong> {log.duration.toFixed(2)}ms</div>}
      {log.transferSize !== undefined && <div><strong>Transfer Size:</strong> {(log.transferSize / 1024).toFixed(2)}KB</div>}
    </div>
  );
};

const LogItem = ({ log, previousLog, timeDelta, allLogs, getLevelIcon, getLevelColor, formatTimestamp, formatMessage }) => {
  const [expanded, setExpanded] = useState(false);
  
  // Find correlated logs (errors that happened around this network request, or console logs before/after)
  const getCorrelatedLogs = () => {
    if (!allLogs || !log.timestamp) return [];
    const logTime = new Date(log.timestamp).getTime();
    const timeWindow = 2000; // 2 seconds before/after
    
    return allLogs.filter(l => {
      if (l.id === log.id) return false;
      const lTime = new Date(l.timestamp).getTime();
      const timeDiff = Math.abs(lTime - logTime);
      
      // If this is a failed network request, find errors that happened around it
      if (log.type === 'network' && (log.status >= 400 || log.status === 'failed')) {
        if (l.type === 'error' || l.level === 'error') {
          return timeDiff < timeWindow;
        }
      }
      
      // Find console logs that happened just before this network request
      if (log.type === 'network' && l.type === 'console') {
        const diff = logTime - lTime;
        return diff > 0 && diff < timeWindow; // Console log happened before network request
      }
      
      return false;
    }).slice(0, 3); // Limit to 3 correlated logs
  };
  
  const correlatedLogs = getCorrelatedLogs();
  
  // Get status badge color
  const getStatusBadgeColor = (status) => {
    if (!status || status === 'pending' || status === 'failed') return 'bg-gray-500';
    if (status >= 200 && status < 300) return 'bg-green-500';
    if (status >= 300 && status < 400) return 'bg-blue-500';
    if (status >= 400 && status < 500) return 'bg-orange-500'; // Changed to orange for 4xx
    if (status >= 500) return 'bg-red-500';
    return 'bg-gray-500';
  };

  return (
    <div className={clsx(
      'border-b border-slate-100 last:border-b-0 px-4 py-3 hover:bg-slate-50 transition relative',
      getLevelColor(log.level),
      log.type === 'network' && (log.status >= 400 || log.status === 'failed') ? 'border-l-4 border-l-red-400' : '',
      log.level === 'error' ? 'border-l-4 border-l-red-400' : ''
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getLevelIcon(log.level)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase">{log.level}</span>
              <span className="text-xs text-slate-500">{formatTimestamp(log.timestamp)}</span>
              {timeDelta && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono" title="Time since previous log">
                  +{timeDelta}
                </span>
              )}
              {log.type === 'network' && log.status && (
                <span className={clsx(
                  'text-xs px-2 py-0.5 rounded text-white font-semibold',
                  getStatusBadgeColor(log.status)
                )}>
                  {log.status}
                </span>
              )}
              {correlatedLogs.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700" title={`${correlatedLogs.length} related log(s) nearby`}>
                  🔗 {correlatedLogs.length}
                </span>
              )}
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              {expanded ? 'Less' : 'More'}
            </button>
          </div>
          <div className="text-sm break-words">
            {log.type === 'console' && log.data && Array.isArray(log.data) ? (
              <div className="space-y-1">
                {log.message && <div className="font-medium text-slate-900">{String(log.message)}</div>}
                {log.data.map((item, idx) => (
                  <div key={idx} className="font-mono text-xs bg-slate-50 p-2 rounded border border-slate-200">
                    {typeof item === 'object' ? (
                      <pre className="whitespace-pre-wrap">{JSON.stringify(item, null, 2)}</pre>
                    ) : (
                      <span>{String(item)}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="font-mono">{formatMessage(log)}</div>
            )}
          </div>
          {expanded && (
            <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-600 space-y-2">
              {/* Show correlated logs */}
              {correlatedLogs.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded p-2">
                  <div className="font-semibold text-purple-900 mb-1">Related Logs ({correlatedLogs.length}):</div>
                  {correlatedLogs.map((relatedLog, idx) => (
                    <div key={relatedLog.id || idx} className="text-xs text-purple-700 mt-1 pl-2 border-l-2 border-purple-300">
                      <span className="font-medium">{relatedLog.type}/{relatedLog.level}:</span> {formatMessage(relatedLog).substring(0, 100)}
                      {formatMessage(relatedLog).length > 100 && '...'}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Failed request context */}
              {log.type === 'network' && (log.status >= 400 || log.status === 'failed') && (
                <div className="bg-red-50 border border-red-200 rounded p-2">
                  <div className="font-semibold text-red-900 mb-1">⚠️ Failed Request Details:</div>
                  <div className="text-xs text-red-800 space-y-0.5">
                    {log.status && <div><strong>Status:</strong> {log.status} {log.statusText || ''}</div>}
                    {log.error && <div><strong>Error:</strong> {log.error}</div>}
                    {log.url && <div><strong>URL:</strong> {log.url}</div>}
                    {log.method && <div><strong>Method:</strong> {log.method}</div>}
                  </div>
                </div>
              )}
              
              {/* Standard details */}
              {log.pageUrl && <div><strong>Page URL:</strong> {log.pageUrl}</div>}
              {log.url && log.url !== log.pageUrl && <div><strong>Request URL:</strong> {log.url}</div>}
              {log.method && <div><strong>Method:</strong> {log.method}</div>}
              {log.status && <div><strong>Status:</strong> {log.status} {log.statusText || ''}</div>}
              {log.latency !== undefined && <div><strong>Latency:</strong> {log.latency}ms</div>}
              {log.responseSize !== undefined && <div><strong>Response Size:</strong> {(log.responseSize / 1024).toFixed(2)}KB</div>}
              {log.stack && <div><strong>Stack:</strong> <pre className="whitespace-pre-wrap">{log.stack}</pre></div>}
              {log.filename && <div><strong>File:</strong> {log.filename}:{log.lineno}:{log.colno}</div>}
              {log.requestHeaders && <div><strong>Request Headers:</strong> <pre className="whitespace-pre-wrap">{JSON.stringify(log.requestHeaders, null, 2)}</pre></div>}
              {log.responseHeaders && <div><strong>Response Headers:</strong> <pre className="whitespace-pre-wrap">{JSON.stringify(log.responseHeaders, null, 2)}</pre></div>}
              {log.responseBody && <div><strong>Response Body:</strong> <pre className="whitespace-pre-wrap text-xs max-h-60 overflow-auto bg-slate-50 p-2 rounded border">{typeof log.responseBody === 'string' ? log.responseBody : JSON.stringify(log.responseBody, null, 2)}</pre></div>}
              {log.responseData && <div><strong>Response Data:</strong> <pre className="whitespace-pre-wrap text-xs max-h-60 overflow-auto bg-slate-50 p-2 rounded border">{typeof log.responseData === 'string' ? log.responseData : JSON.stringify(log.responseData, null, 2)}</pre></div>}
              {log.data && typeof log.data === 'object' && <div><strong>Data:</strong> <pre className="whitespace-pre-wrap text-xs max-h-60 overflow-auto bg-slate-50 p-2 rounded border">{JSON.stringify(log.data, null, 2)}</pre></div>}
              {log.data && typeof log.data !== 'object' && log.data && <div><strong>Data:</strong> <span className="font-mono text-xs">{String(log.data)}</span></div>}
              {log.resourceType && <div><strong>Resource Type:</strong> {log.resourceType}</div>}
              {log.duration !== undefined && <div><strong>Duration:</strong> {log.duration.toFixed(2)}ms</div>}
              {log.transferSize !== undefined && <div><strong>Transfer Size:</strong> {(log.transferSize / 1024).toFixed(2)}KB</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<LogViewer />);

