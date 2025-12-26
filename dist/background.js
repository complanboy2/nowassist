// Background service worker for SAML message interception and log capture

const SAML_MESSAGES_KEY = 'saml_messages';
const MAX_MESSAGES = 50; // Keep last 50 messages
const LOG_STORAGE_KEY = 'browser_logs';
const MAX_LOGS_PER_TAB = 2000; // Max logs per tab (increased to show more history)
const MAX_TABS = 20; // Max number of tabs to track (reduced for performance)

// Per-tab log storage
const tabLogs = new Map(); // tabId -> logs array
const tabInfo = new Map(); // tabId -> { url, title, lastUpdate }

// Cache active logging tabs for performance (avoid storage reads on every request)
let activeLoggingTabsCache = new Set();
let cacheLastUpdate = 0;
const CACHE_TTL = 1000; // Refresh cache every 1 second

// Refresh active tabs cache
const refreshActiveTabsCache = async () => {
  const now = Date.now();
  if (now - cacheLastUpdate < CACHE_TTL && activeLoggingTabsCache.size >= 0) {
    return activeLoggingTabsCache; // Use cached value
  }
  
  try {
    const result = await chrome.storage.local.get(['activeLoggingTabs']);
    const activeTabs = result.activeLoggingTabs || [];
    activeLoggingTabsCache = new Set(activeTabs);
    cacheLastUpdate = now;
  } catch (e) {
    // Ignore errors
  }
  
  return activeLoggingTabsCache;
};

// Listen for storage changes to update cache immediately
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.activeLoggingTabs) {
    const newActiveTabs = changes.activeLoggingTabs.newValue || [];
    activeLoggingTabsCache = new Set(newActiveTabs);
    cacheLastUpdate = Date.now();
  }
});

// Initial cache load
refreshActiveTabsCache();

// Detect SAML in URL parameters or form data
const isSamlMessage = (url, requestBody) => {
  const urlLower = url.toLowerCase();
  const samlParams = ['samlrequest', 'samlresponse', 'saml_request', 'saml_response', 'wa', 'wresult', 'wsignin', 'wsignout'];
  
  // Check URL parameters
  try {
    const urlObj = new URL(url);
    for (const param of samlParams) {
      if (urlObj.searchParams.has(param) || urlObj.searchParams.has(param.toUpperCase())) {
        return true;
      }
    }
  } catch (e) {
    // Invalid URL, continue
  }
  
  // Check URL path for SAML-related endpoints
  const samlPaths = ['/saml', '/sso', '/acs', '/saml2', '/saml/sso', '/saml/acs', '/saml/slo', '/saml/logout'];
  for (const path of samlPaths) {
    if (urlLower.includes(path)) {
      return true;
    }
  }
  
  // Check request body for SAML
  if (requestBody) {
    let bodyStr = '';
    if (requestBody.formData) {
      // Form data
      for (const [key, values] of Object.entries(requestBody.formData)) {
        if (key.toLowerCase().includes('saml')) {
          return true;
        }
        bodyStr += values.join(' ');
      }
    } else if (requestBody.raw) {
      // Raw body - would need to decode, but we can check for SAML indicators
      return true; // Conservative approach
    }
    
    if (bodyStr) {
      const bodyLower = bodyStr.toLowerCase();
      if (bodyLower.includes('samlrequest') || bodyLower.includes('samlresponse') || 
          bodyLower.includes('saml:assertion') || bodyLower.includes('urn:oasis:names:tc:saml')) {
        return true;
      }
    }
  }
  
  return false;
};

// Extract SAML data from URL or body
const extractSamlData = (url, requestBody) => {
  let samlData = null;
  let type = 'unknown';
  
  try {
    const urlObj = new URL(url);
    
    // Check for SAMLRequest or SAMLResponse in URL (case insensitive)
    const samlRequest = urlObj.searchParams.get('SAMLRequest') || 
                       urlObj.searchParams.get('samlrequest') ||
                       urlObj.searchParams.get('SAML_REQUEST') ||
                       urlObj.searchParams.get('SAMLRequest');
    const samlResponse = urlObj.searchParams.get('SAMLResponse') || 
                        urlObj.searchParams.get('samlresponse') ||
                        urlObj.searchParams.get('SAML_RESPONSE') ||
                        urlObj.searchParams.get('SAMLResponse');
    
    if (samlRequest) {
      samlData = decodeURIComponent(samlRequest);
      type = 'request';
    } else if (samlResponse) {
      samlData = decodeURIComponent(samlResponse);
      type = 'response';
    }
  } catch (e) {
    // Invalid URL
  }
  
  // Check request body form data
  if (!samlData && requestBody && requestBody.formData) {
    for (const [key, values] of Object.entries(requestBody.formData)) {
      const keyLower = key.toLowerCase();
      if (keyLower.includes('samlrequest') || keyLower === 'samlrequest') {
        samlData = decodeURIComponent(values[0] || '');
        type = 'request';
        break;
      } else if (keyLower.includes('samlresponse') || keyLower === 'samlresponse') {
        samlData = decodeURIComponent(values[0] || '');
        type = 'response';
        break;
      }
    }
  }
  
  return { samlData, type };
};

// Listen for web requests
chrome.webRequest.onBeforeRequest.addListener(
  async (details) => {
    if (details.method === 'GET' || details.method === 'POST') {
      const url = details.url;
      const requestBody = details.requestBody;
      
      if (isSamlMessage(url, requestBody)) {
        const { samlData, type } = extractSamlData(url, requestBody);
        
        if (samlData) {
          const message = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            type: type,
            url: url,
            method: details.method,
            samlData: samlData,
            tabId: details.tabId,
          };
          
          // Get existing messages
          const result = await chrome.storage.local.get([SAML_MESSAGES_KEY]);
          const messages = result[SAML_MESSAGES_KEY] || [];
          
          // Add new message at the beginning
          messages.unshift(message);
          
          // Keep only last MAX_MESSAGES
          if (messages.length > MAX_MESSAGES) {
            messages.splice(MAX_MESSAGES);
          }
          
          // Save messages
          await chrome.storage.local.set({ [SAML_MESSAGES_KEY]: messages });
          
          // Notify content script if needed
          try {
            chrome.tabs.sendMessage(details.tabId, {
              type: 'SAML_MESSAGE_CAPTURED',
              message: message
            }).catch(() => {
              // Tab might not have content script, ignore
            });
          } catch (e) {
            // Ignore errors
          }
        }
      }
    }
  },
  { urls: ['<all_urls>'] },
  ['requestBody']
);

// Listen for response headers to capture SAML responses
chrome.webRequest.onCompleted.addListener(
  async (details) => {
    if (details.statusCode === 200 && details.method === 'POST') {
      // For POST responses, we'd need to intercept response body
      // This is limited in MV3, so we focus on request interception
      // Response body interception requires declarativeNetRequest or content scripts
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// Store log entry per tab (optimized for performance)
const storeLog = (logEntry, tabId, pageInfo) => {
  // Make this synchronous for better performance - no async/await overhead
  try {
    if (!tabId) {
      return; // Can't determine tab - skip
    }

    // Initialize tab log buffer if needed
    if (!tabLogs.has(tabId)) {
      tabLogs.set(tabId, []);
    }

    const logs = tabLogs.get(tabId);
    
    // Add tab info to log entry
    const enrichedLog = {
      ...logEntry,
      id: `${tabId}_${Date.now()}_${Math.random()}`,
      tabId: tabId,
      pageUrl: pageInfo?.url || '',
      pageTitle: pageInfo?.title || '',
    };

    // Filter out ONLY truly noisy duplicate logs (less aggressive)
    // Only skip if the EXACT same message appears 5+ times in last 20 logs
    if (enrichedLog.type === 'console' && enrichedLog.level === 'info' && logs.length > 10) {
      const recentLogs = logs.slice(0, 20); // Check last 20 logs
      const duplicateCount = recentLogs.filter(l => {
        if (l.type !== 'console' || l.level !== 'info' || l.message !== enrichedLog.message) {
          return false;
        }
        // Check if within 1 second (handle both ISO string and number timestamps)
        if (l.timestamp && enrichedLog.timestamp) {
          const lTime = typeof l.timestamp === 'string' ? new Date(l.timestamp).getTime() : l.timestamp;
          const eTime = typeof enrichedLog.timestamp === 'string' ? new Date(enrichedLog.timestamp).getTime() : enrichedLog.timestamp;
          return Math.abs(lTime - eTime) < 1000;
        }
        return false;
      }).length;
      
      // Only skip if same message appears 5+ times within 1 second (spam detection)
      if (duplicateCount >= 5) {
        return; // Skip spam duplicate log
      }
    }
    
    // Keep all errors, warnings, and network requests - never filter those
    
    logs.unshift(enrichedLog);
    
    // Limit logs per tab (use splice which is faster than slice)
    if (logs.length > MAX_LOGS_PER_TAB) {
      logs.length = MAX_LOGS_PER_TAB; // Faster than splice
    }

    // Update tab info (simplified)
    const existingInfo = tabInfo.get(tabId);
    if (!existingInfo || Date.now() - (existingInfo.lastUpdate || 0) > 5000) {
      // Only update tab info every 5 seconds to reduce overhead
      tabInfo.set(tabId, {
        url: pageInfo?.url || existingInfo?.url || '',
        title: pageInfo?.title || existingInfo?.title || '',
        lastUpdate: Date.now(),
      });
    }

    // Schedule persistence (throttled - doesn't block)
    persistTabLogs(false).catch(() => {}); // Fire and forget

    // No notifications - logs will be polled by viewer
  } catch (err) {
    // Silently fail to avoid performance impact
  }
};

// Persist tab logs to storage (throttled for performance)
let persistTimer = null;
let persistPending = false;
const PERSIST_DEBOUNCE = 5000; // Persist every 5 seconds, not on every log

const persistTabLogs = async (immediate = false) => {
  if (persistPending && !immediate) {
    // Already queued, will persist soon
    return;
  }
  
  persistPending = true;
  
  const doPersist = async () => {
    try {
      const logsByTab = {};
      tabLogs.forEach((logs, tabId) => {
        logsByTab[tabId] = logs.slice(0, 500); // Only persist last 500 per tab (reduced from 1000)
      });
      await chrome.storage.local.set({ [LOG_STORAGE_KEY]: logsByTab });
      persistPending = false;
    } catch (err) {
      console.error('Failed to persist logs', err);
      persistPending = false;
    }
  };
  
  if (immediate) {
    await doPersist();
  } else {
    // Clear existing timer
    if (persistTimer) {
      clearTimeout(persistTimer);
    }
    // Schedule persistence
    persistTimer = setTimeout(doPersist, PERSIST_DEBOUNCE);
  }
};

// Load tab logs from storage
const loadTabLogs = async () => {
  try {
    const result = await chrome.storage.local.get([LOG_STORAGE_KEY]);
    const logsByTab = result[LOG_STORAGE_KEY] || {};
    
    Object.entries(logsByTab).forEach(([tabId, logs]) => {
      tabLogs.set(parseInt(tabId), logs);
    });
  } catch (err) {
    console.error('Failed to load logs', err);
  }
};

// Cleanup logs for closed tabs
const cleanupTabLogs = (tabId) => {
  tabLogs.delete(tabId);
  tabInfo.delete(tabId);
};

// Initialize: Load persisted logs
loadTabLogs();

// Cleanup when tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  cleanupTabLogs(tabId);
  persistTabLogs();
});

// Capture network requests (optional - content script handles most of this)
// Only capture if logging is active for this tab
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.method && details.url && details.tabId > 0) {
      // Fast synchronous check using cached active tabs
      if (!activeLoggingTabsCache.has(details.tabId)) {
        return; // Skip if logging not active - fast exit
      }
      
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'info',
        type: 'network',
        method: details.method,
        url: details.url,
        requestId: details.requestId,
        status: 'pending',
      };
      storeLog(logEntry, details.tabId, null); // No await - synchronous and fast
    }
  },
  { urls: ['<all_urls>'] },
  ['requestBody']
);

// Capture network responses
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.statusCode !== undefined && details.tabId > 0) {
      // Fast synchronous check using cached active tabs
      if (!activeLoggingTabsCache.has(details.tabId)) {
        return; // Skip if logging not active - fast exit
      }
      
      // Extract response size from headers
      let responseSize = 0;
      if (details.responseHeaders) {
        const contentLength = details.responseHeaders.find(h => h.name.toLowerCase() === 'content-length');
        if (contentLength) {
          responseSize = parseInt(contentLength.value) || 0;
        }
      }
      
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: details.statusCode >= 400 ? 'error' : 'info',
        type: 'network',
        method: details.method,
        url: details.url,
        status: details.statusCode,
        statusText: '',
        requestId: details.requestId,
        responseSize: responseSize,
      };
      storeLog(logEntry, details.tabId, null); // No await - synchronous and fast
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// Capture network errors
chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    if (details.tabId > 0) {
      // Fast synchronous check using cached active tabs
      if (!activeLoggingTabsCache.has(details.tabId)) {
        return; // Skip if logging not active - fast exit
      }
      
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'error',
        type: 'network',
        method: details.method,
        url: details.url,
        error: details.error,
        status: 'failed',
        requestId: details.requestId,
      };
      storeLog(logEntry, details.tabId, null); // No await - synchronous and fast
    }
  },
  { urls: ['<all_urls>'] }
);

// Inject content script to capture logs
const injectContentScript = (tabId) => {
  if (!tabId) return;
  
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) return;
    
    if (tab.url && 
        !tab.url.startsWith('chrome://') && 
        !tab.url.startsWith('chrome-extension://') &&
        !tab.url.startsWith('moz-extension://') &&
        !tab.url.startsWith('edge://')) {
      
      // Inject the content script
      chrome.scripting.executeScript({
        target: { tabId },
        files: ['content-script.js'],
      }).catch(() => {
        // Ignore errors (e.g., chrome:// pages, extension pages)
      });
    }
  });
};

// REMOVED: Auto-injection is now manual only for performance
// Scripts are injected only when user explicitly requests it from logs page
// This prevents the extension from running on every tab and slowing down the browser

// Function to inject content script into all open tabs
const injectIntoAllTabs = () => {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        injectContentScript(tab.id);
      }
    });
  });
};

// Handle manual injection request
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle async responses properly
  const handleAsync = (promise) => {
    promise.then(() => {
      sendResponse({ success: true });
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true; // Indicates we will send a response asynchronously
  };
  
  if (request.action === 'inject_all_tabs') {
    try {
      injectIntoAllTabs();
      sendResponse({ success: true });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'inject_tab') {
    try {
      injectContentScript(request.tabId);
      sendResponse({ success: true });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
    return true;
  }
  
  if (request.action === 'activate_logging') {
    // Activate logging for specific tabs
    const tabIds = request.tabIds || [];
    chrome.storage.local.get(['activeLoggingTabs'], (result) => {
      const activeTabs = new Set(result.activeLoggingTabs || []);
      tabIds.forEach(tabId => activeTabs.add(tabId));
      const newActiveTabs = Array.from(activeTabs);
      chrome.storage.local.set({ activeLoggingTabs: newActiveTabs }, () => {
        // Update cache immediately
        activeLoggingTabsCache = new Set(newActiveTabs);
        cacheLastUpdate = Date.now();
        sendResponse({ success: true });
      });
    });
    return true;
  }
  
  if (request.action === 'deactivate_logging') {
    // Deactivate logging for specific tabs
    const tabIds = request.tabIds || [];
    chrome.storage.local.get(['activeLoggingTabs'], (result) => {
      const activeTabs = new Set(result.activeLoggingTabs || []);
      tabIds.forEach(tabId => activeTabs.delete(tabId));
      const newActiveTabs = Array.from(activeTabs);
      chrome.storage.local.set({ activeLoggingTabs: newActiveTabs }, () => {
        // Update cache immediately
        activeLoggingTabsCache = new Set(newActiveTabs);
        cacheLastUpdate = Date.now();
        sendResponse({ success: true });
      });
    });
    return true;
  }
  
  if (request.action === 'get_all_tabs') {
    chrome.tabs.query({}, (tabs) => {
      const tabInfo = tabs.map(tab => ({
        id: tab.id,
        url: tab.url,
        title: tab.title,
        active: tab.active,
        windowId: tab.windowId,
      }));
      sendResponse({ tabs: tabInfo });
    });
    return true; // Keep channel open for async response
  }
  
  if (request.type === 'GET_TAB_ID') {
    // Return tab ID for content script
    sendResponse({ tabId: sender.tab?.id });
    return true;
  }
  
  if (request.type === 'REGISTER_TAB') {
    // Register tab and return tab ID
    const tabId = sender.tab?.id;
    if (tabId) {
      sendResponse({ tabId: tabId });
    }
    return true;
  }
  
  // Also return tabId in CONTENT_LOG responses
  if (request.type === 'CONTENT_LOG') {
    const tabId = sender.tab?.id;
    // Response will be sent by the CONTENT_LOG handler below
    // But we can include tabId in the response
    return false; // Let the other handler process it
  }
  
  return false;
});

// Handle log messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CONTENT_LOG') {
    // Handle batched logs from content script - optimized for performance
    const tabId = sender.tab?.id;
    const pageInfo = request.pageInfo;
    
    if (request.logs && Array.isArray(request.logs) && request.logs.length > 0) {
      // Process all logs synchronously (storeLog is now sync and fast)
      request.logs.forEach(logEntry => {
        storeLog(logEntry, tabId, pageInfo);
      });
    }
    
    sendResponse({ success: true, tabId: tabId });
    return true;
  }
  
  if (request.type === 'NETWORK_RESPONSE') {
    // Handle response body from content script
    const tabId = sender.tab?.id;
    if (tabId && request.url) {
      // Find the matching network log and update it with response body
      const logs = tabLogs.get(tabId) || [];
      
      // Normalize URLs for matching (remove fragments, normalize query params)
      const normalizeUrl = (url) => {
        try {
          const u = new URL(url);
          return u.origin + u.pathname + u.search; // Exclude hash
        } catch {
          return url.split('#')[0].split('?')[0]; // Fallback
        }
      };
      
      const normalizedRequestUrl = normalizeUrl(request.url);
      
      // Find log by URL (normalized) and timestamp (within 10 seconds, most recent first)
      const matchingLog = logs
        .filter(log => {
          if (log.type !== 'network' || !log.url) return false;
          const normalizedLogUrl = normalizeUrl(log.url);
          if (normalizedLogUrl !== normalizedRequestUrl) return false;
          
          // Check timestamp match (within 10 seconds)
          const logTime = new Date(log.timestamp).getTime();
          const responseTime = new Date(request.timestamp).getTime();
          return Math.abs(logTime - responseTime) < 10000; // Within 10 seconds
        })
        .sort((a, b) => {
          // Most recent first
          const aTime = new Date(a.timestamp).getTime();
          const bTime = new Date(b.timestamp).getTime();
          return bTime - aTime;
        })[0]; // Take the most recent match
      
      if (matchingLog) {
        // Update existing log with response body
        matchingLog.responseBody = request.responseBody;
        matchingLog.responseData = request.responseBody; // Also set responseData for compatibility
        if (request.latency !== undefined) matchingLog.latency = request.latency;
        if (request.responseSize !== undefined) matchingLog.responseSize = request.responseSize;
        if (request.statusText) matchingLog.statusText = request.statusText;
      } else {
        // Create new log entry if no match found
        const logEntry = {
          timestamp: request.timestamp || new Date().toISOString(),
          level: request.status >= 400 ? 'error' : 'info',
          type: 'network',
          method: request.method || 'GET',
          url: request.url,
          status: request.status,
          statusText: request.statusText || '',
          latency: request.latency,
          responseSize: request.responseSize,
          responseBody: request.responseBody,
          responseData: request.responseBody,
        };
        storeLog(logEntry, tabId, { url: sender.tab?.url, title: '' });
      }
    }
    sendResponse({ success: true });
    return true;
  }
  
  if (request.type === 'NETWORK_ERROR') {
    // Handle network errors from content script
    const tabId = sender.tab?.id;
    if (tabId) {
      const logEntry = {
        timestamp: request.timestamp || new Date().toISOString(),
        level: 'error',
        type: 'network',
        method: request.method || 'GET',
        url: request.url,
        status: 'failed',
        statusText: request.error || 'Network error',
      };
      storeLog(logEntry, tabId, { url: sender.tab?.url, title: '' });
    }
    sendResponse({ success: true });
    return true;
  }
  
  if (request.type === 'CONSOLE_LOG') {
    // Legacy single log handler
    const logEntry = {
      timestamp: request.timestamp || new Date().toISOString(),
      level: request.level || 'info',
      type: 'console',
      message: request.message,
      data: request.data,
      stack: request.stack,
      filename: request.filename,
      lineno: request.lineno,
      colno: request.colno,
    };
    storeLog(logEntry, sender.tab?.id, { url: sender.tab?.url, title: '' });
    sendResponse({ success: true });
    return true;
  }

  // Handle log requests from viewer
  if (request.action === 'get_logs') {
    const tabId = request.tabId;
    const logs = tabId ? (tabLogs.get(tabId) || []) : [];
    const tabs = Array.from(tabInfo.entries()).map(([id, info]) => ({
      id,
      url: info.url,
      title: info.title,
      lastUpdate: info.lastUpdate,
      logCount: tabLogs.get(id)?.length || 0,
    }));
    
    sendResponse({ 
      logs: logs,
      tabs: tabs,
      currentTabId: tabId 
    });
    return true;
  }

  if (request.action === 'clear_logs') {
    const tabId = request.tabId;
    if (tabId) {
      tabLogs.set(tabId, []);
    } else {
      tabLogs.clear();
      tabInfo.clear();
    }
    persistTabLogs();
    sendResponse({ success: true });
    return true;
  }

  return false;
});

// Clear messages on request
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'clear_saml_messages') {
    chrome.storage.local.set({ [SAML_MESSAGES_KEY]: [] }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'get_saml_messages') {
    chrome.storage.local.get([SAML_MESSAGES_KEY], (result) => {
      sendResponse({ messages: result[SAML_MESSAGES_KEY] || [] });
    });
    return true;
  }
});

