// Content script to capture console logs, errors, and network requests from web pages

(function() {
  'use strict';

  // Configuration - Performance optimized
  const BATCH_INTERVAL = 500; // Send logs in batches every 500ms (balanced performance)
  const MAX_BATCH_SIZE = 50; // Max logs per batch (increased to capture more)
  const MAX_CONSOLE_LOGS_PER_SECOND = 50; // Rate limit console logs (increased to capture more)
  const SKIP_RESPONSE_BODY = true; // Don't read response bodies (performance)
  const ENABLE_PERFORMANCE_OBSERVER = false; // Disable by default (performance)
  
  // Activation state - logging is inactive by default
  let isLoggingActive = false;
  let tabId = null;
  
  // Get current tab ID - will be set when we send first message to background
  // The background script will know our tab ID from sender.tab.id
  
  // Check activation state from storage
  function checkActivationState() {
    if (!chrome.storage) return;
    
    chrome.storage.local.get(['activeLoggingTabs'], (result) => {
      const activeTabs = result.activeLoggingTabs || [];
      // Check if this tab is active (use tabId if available, otherwise try to get it)
      if (tabId) {
        isLoggingActive = activeTabs.includes(tabId);
      } else {
        // If we don't have tabId yet, try to get it
        if (chrome.runtime && chrome.runtime.id) {
          chrome.runtime.sendMessage({ type: 'REGISTER_TAB' }, (response) => {
            if (response && response.tabId) {
              tabId = response.tabId;
              isLoggingActive = activeTabs.includes(tabId);
            }
          });
        }
      }
    });
  }
  
  // Listen for activation changes (set up once)
  if (chrome.storage) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.activeLoggingTabs) {
        const newActiveTabs = changes.activeLoggingTabs.newValue || [];
        if (tabId) {
          const wasActive = isLoggingActive;
          isLoggingActive = newActiveTabs.includes(tabId);
          
          // If logging just became active, flush any queued logs
          if (!wasActive && isLoggingActive && logBuffer.length > 0) {
            flushLogs();
          }
          
          // Set up network interception if it wasn't set up yet
          if (isLoggingActive) {
            setupNetworkInterception();
          }
        } else {
          // Refresh tabId and check again
          checkActivationState();
        }
      }
    });
  }
  
  // Initialize tab ID by sending a registration message
  if (chrome.runtime && chrome.runtime.id) {
    chrome.runtime.sendMessage({ type: 'REGISTER_TAB' }, (response) => {
      if (response && response.tabId) {
        tabId = response.tabId;
        checkActivationState();
      }
    });
    
    // Also listen for messages from background (for activation commands)
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'ACTIVATE_LOGGING') {
        isLoggingActive = true;
        setupNetworkInterception(); // Set up network interception when activated
        sendResponse({ success: true });
      } else if (message.type === 'DEACTIVATE_LOGGING') {
        isLoggingActive = false;
        sendResponse({ success: true });
      }
    });
  }
  
  // Initial activation check
  checkActivationState();
  
  // Re-check activation state periodically (in case storage listener didn't fire)
  setInterval(() => {
    if (!isLoggingActive) {
      checkActivationState();
    }
  }, 2000);
  
  // Rate limiting
  let consoleLogCount = 0;
  let consoleLogResetTime = Date.now();
  
  // Log buffer
  let logBuffer = [];
  let batchTimer = null;

  // Get current page info
  const getPageInfo = () => ({
    url: window.location.href,
    title: document.title,
    timestamp: new Date().toISOString(),
  });

  // Send logs to background script
  const sendLogs = (logs) => {
    if (!chrome.runtime || !chrome.runtime.id || logs.length === 0) return;
    
    // Always check activation state before sending (it might have changed)
    checkActivationState();
    
    if (!isLoggingActive) {
      // If not active, don't send but logs are already removed from buffer
      // They will be captured again on next console call if activation happens
      return;
    }
    
    try {
      chrome.runtime.sendMessage({
        type: 'CONTENT_LOG',
        logs: logs,
        pageInfo: getPageInfo(),
      }, (response) => {
        // If we don't have tabId yet, try to get it from the response
        if (!tabId && response && response.tabId) {
          tabId = response.tabId;
          checkActivationState();
        }
      }).catch(() => {
        // Ignore errors (background might not be ready)
      });
    } catch (e) {
      // Ignore errors
    }
  };

  // Batch and send logs
  const queueLog = (logEntry) => {
    logBuffer.push(logEntry);
    
    // Send immediately if buffer is full
    if (logBuffer.length >= MAX_BATCH_SIZE) {
      flushLogs();
      return;
    }
    
    // Schedule batch send
    if (!batchTimer) {
      batchTimer = setTimeout(() => {
        flushLogs();
      }, BATCH_INTERVAL);
    }
  };

  const flushLogs = () => {
    if (logBuffer.length === 0) return;
    
    // Check activation state before flushing
    checkActivationState();
    
    // Only flush if active, otherwise keep logs in buffer
    if (!isLoggingActive) {
      // Don't clear buffer - keep logs for when activation happens
      // But still clear timer so we can retry later
      if (batchTimer) {
        clearTimeout(batchTimer);
        batchTimer = null;
      }
      // Schedule retry in case activation happens
      setTimeout(() => {
        if (logBuffer.length > 0) {
          flushLogs();
        }
      }, 1000);
      return;
    }
    
    const logsToSend = [...logBuffer];
    logBuffer = [];
    
    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }
    
    sendLogs(logsToSend);
  };

  // Serialize arguments for console logs
  const serializeArgs = (args) => {
    return Array.from(args).map(arg => {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'function') return '[Function]';
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    });
  };

  // ============================================
  // A. Console Logs Capture
  // ============================================
  
  const originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
    info: console.info.bind(console),
  };

  const captureConsole = (level, args) => {
    // Call original console method first (always) - this is fast
    originalConsole[level](...args);
    
    // Ensure we have tabId first (critical for activation check)
    if (!tabId && chrome.runtime && chrome.runtime.id) {
      chrome.runtime.sendMessage({ type: 'REGISTER_TAB' }, (response) => {
        if (response && response.tabId) {
          tabId = response.tabId;
          checkActivationState();
        }
      });
      // Skip this log if we don't have tabId yet - it will be captured on next call
      return;
    }
    
    // Always check activation state (it might have changed)
    checkActivationState();
    
    // Skip if not active
    if (!isLoggingActive) {
      return;
    }
    
    // Lightweight rate limiting
    const now = Date.now();
    if (now - consoleLogResetTime > 1000) {
      consoleLogCount = 0;
      consoleLogResetTime = now;
    }
    
    if (consoleLogCount >= MAX_CONSOLE_LOGS_PER_SECOND) {
      return; // Skip if rate limit exceeded
    }
    
    consoleLogCount++;
    
    // Serialize message properly
    const message = serializeArgs(args).join(' ').substring(0, 2000);
    
    // Serialize data (limited for performance, but keep structure)
    const data = Array.from(args).slice(0, 5).map(arg => {
      if (arg === null) return null;
      if (arg === undefined) return undefined;
      if (typeof arg === 'function') return '[Function]';
      if (typeof arg === 'object') {
        try {
          // Keep object structure but limit size
          const str = JSON.stringify(arg);
          if (str.length > 2000) {
            // Try to parse truncated version - might fail, that's ok
            try {
              return JSON.parse(str.substring(0, 2000) + '...');
            } catch {
              return '[Object (too large)]';
            }
          }
          return JSON.parse(str);
        } catch {
          return String(arg).substring(0, 2000);
        }
      }
      return String(arg).substring(0, 2000);
    });
    
    queueLog({
      type: 'console',
      level: level,
      message: message,
      data: data,
      timestamp: new Date().toISOString(),
    });
  };

  // Override console methods
  console.log = (...args) => captureConsole('info', args);
  console.warn = (...args) => captureConsole('warn', args);
  console.error = (...args) => captureConsole('error', args);
  console.debug = (...args) => captureConsole('debug', args);
  console.info = (...args) => captureConsole('info', args);

  // ============================================
  // B. JavaScript Errors Capture
  // ============================================
  
  // Capture window errors
  window.addEventListener('error', (event) => {
    if (!isLoggingActive) return;
    
    queueLog({
      type: 'error',
      level: 'error',
      message: event.message || 'Unknown error',
      filename: event.filename || '',
      lineno: event.lineno || 0,
      colno: event.colno || 0,
      stack: event.error?.stack || '',
      timestamp: new Date().toISOString(),
    });
  }, true);

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (!isLoggingActive) return;
    
    queueLog({
      type: 'error',
      level: 'error',
      message: event.reason ? String(event.reason) : 'Unhandled promise rejection',
      stack: event.reason?.stack || '',
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================
  // C. Network Logs Capture - Response Bodies
  // ============================================
  // We capture response bodies via fetch/XHR interception (only when active)
  // Background script handles request metadata via webRequest API
  // Content script handles response bodies for active tabs only
  
  // Track network requests to capture response bodies
  const networkRequests = new Map(); // requestId -> { url, method, timestamp }
  
  // Intercept fetch to capture response bodies (only when active)
  // We'll set this up dynamically when logging becomes active
  let fetchIntercepted = false;
  let xhrIntercepted = false;
  
  const setupNetworkInterception = () => {
    // Always set up interception - it checks isLoggingActive internally
    // This ensures it's ready when logging becomes active
    
    // Intercept fetch to capture response bodies
    if (window.fetch && !fetchIntercepted) {
      fetchIntercepted = true;
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
      const [url, options = {}] = args;
      const method = options.method || 'GET';
      const requestId = `${Date.now()}_${Math.random()}`;
      const startTime = Date.now();
      
      // Store request info
      networkRequests.set(requestId, {
        url: typeof url === 'string' ? url : url.toString(),
        method: method,
        timestamp: new Date().toISOString(),
      });
      
      return originalFetch.apply(this, args)
        .then(response => {
          const endTime = Date.now();
          const latency = endTime - startTime;
          
          // Clone response to read body without consuming it
          const clonedResponse = response.clone();
          
          // Always try to read response body (will check isLoggingActive before sending)
          // This ensures response bodies are captured even if activation changes
          clonedResponse.text().then(body => {
            // Always check activation state before sending (it might have changed)
            checkActivationState();
            
            // Send response body if logging is active
            if (isLoggingActive && chrome.runtime && chrome.runtime.id) {
              chrome.runtime.sendMessage({
                type: 'NETWORK_RESPONSE',
                requestId: requestId,
                url: typeof url === 'string' ? url : url.toString(),
                method: method,
                status: response.status,
                statusText: response.statusText,
                latency: latency,
                responseBody: body.length > 50000 ? body.substring(0, 50000) + '... [truncated]' : body, // Limit to 50KB
                responseSize: body.length,
                timestamp: new Date().toISOString(),
              }).catch(() => {
                // Ignore errors
              });
            }
          }).catch(() => {
            // If we can't read body, still send metadata if active
            checkActivationState();
            if (isLoggingActive && chrome.runtime && chrome.runtime.id) {
              chrome.runtime.sendMessage({
                type: 'NETWORK_RESPONSE',
                requestId: requestId,
                url: typeof url === 'string' ? url : url.toString(),
                method: method,
                status: response.status,
                statusText: response.statusText,
                latency: latency,
                timestamp: new Date().toISOString(),
              }).catch(() => {});
            }
          });
          }
          
          return response;
        })
        .catch(error => {
          // Send error info
          if (isLoggingActive && chrome.runtime && chrome.runtime.id) {
            chrome.runtime.sendMessage({
              type: 'NETWORK_ERROR',
              requestId: requestId,
              url: typeof url === 'string' ? url : url.toString(),
              method: method,
              error: error.message || String(error),
              timestamp: new Date().toISOString(),
            }).catch(() => {});
          }
          throw error;
        });
    };
    }
    
    // Intercept XMLHttpRequest to capture response bodies
    if (window.XMLHttpRequest && !xhrIntercepted) {
      xhrIntercepted = true;
    const OriginalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {
      const xhr = new OriginalXHR();
      const requestId = `${Date.now()}_${Math.random()}`;
      const startTime = Date.now();
      let url = '';
      let method = 'GET';
      
      const originalOpen = xhr.open;
      xhr.open = function(m, u, ...rest) {
        method = m;
        url = u;
        networkRequests.set(requestId, { url, method, timestamp: new Date().toISOString() });
        return originalOpen.apply(this, [m, u, ...rest]);
      };
      
      const originalSend = xhr.send;
      xhr.send = function(...args) {
        xhr.addEventListener('load', function() {
          if (isLoggingActive && xhr.responseText) {
            const endTime = Date.now();
            const latency = endTime - startTime;
            
            if (chrome.runtime && chrome.runtime.id) {
              chrome.runtime.sendMessage({
                type: 'NETWORK_RESPONSE',
                requestId: requestId,
                url: url,
                method: method,
                status: xhr.status,
                statusText: xhr.statusText,
                latency: latency,
                responseBody: xhr.responseText.length > 50000 ? xhr.responseText.substring(0, 50000) + '... [truncated]' : xhr.responseText,
                responseSize: xhr.responseText.length,
                timestamp: new Date().toISOString(),
              }).catch(() => {});
            }
          }
        });
        
        xhr.addEventListener('error', function() {
          if (isLoggingActive && chrome.runtime && chrome.runtime.id) {
            chrome.runtime.sendMessage({
              type: 'NETWORK_ERROR',
              requestId: requestId,
              url: url,
              method: method,
              error: 'Network error',
              timestamp: new Date().toISOString(),
            }).catch(() => {});
          }
        });
        
        return originalSend.apply(this, args);
      };
      
      return xhr;
    };
    }
  };
  
  // Always set up network interception immediately (it checks isLoggingActive internally)
  // This ensures it's ready when logging becomes active
  setupNetworkInterception();
  
  // Also ensure it's set up if activation state changes
  setInterval(() => {
    if (!fetchIntercepted && !xhrIntercepted) {
      setupNetworkInterception();
    }
  }, 2000);

  // ============================================
  // E. Performance-Based Logs (Optional - Disabled by default)
  // ============================================
  
  // Capture resource timings (disabled by default for performance)
  if (ENABLE_PERFORMANCE_OBSERVER && window.PerformanceObserver) {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        // Only log slow resources (> 1s) or large resources (> 1MB)
        entries.forEach(entry => {
          if (entry.entryType === 'resource' && 
              (entry.duration > 1000 || entry.transferSize > 1000000)) {
            queueLog({
              type: 'performance',
              level: entry.transferSize > 1000000 ? 'warn' : 'info',
              resourceType: entry.initiatorType,
              url: entry.name,
              duration: entry.duration,
              transferSize: entry.transferSize,
              decodedBodySize: entry.decodedBodySize,
              timestamp: new Date().toISOString(),
            });
          }
        });
      });
      
      observer.observe({ entryTypes: ['resource'] });
    } catch (e) {
      // PerformanceObserver not supported or failed
    }
  }

  // ============================================
  // Flush logs on page unload (only if active)
  // ============================================
  
  window.addEventListener('beforeunload', () => {
    if (isLoggingActive && logBuffer.length > 0) {
      flushLogs();
    }
  });

  // Also flush periodically to ensure no logs are lost (only if active and has logs)
  setInterval(() => {
    if (isLoggingActive && logBuffer.length > 0) {
      flushLogs();
    }
  }, 5000); // Every 5 seconds

})();

