// Content script to capture console logs, errors, and network requests from web pages

(function() {
  'use strict';

  // Configuration
  const BATCH_INTERVAL = 50; // Send logs in batches every 50ms
  const MAX_BATCH_SIZE = 100; // Max logs per batch
  
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
    if (!chrome.runtime || !chrome.runtime.id) return;
    
    try {
      chrome.runtime.sendMessage({
        type: 'CONTENT_LOG',
        logs: logs,
        pageInfo: getPageInfo(),
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
    queueLog({
      type: 'console',
      level: level,
      message: serializeArgs(args).join(' '),
      data: Array.from(args).map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.parse(JSON.stringify(arg));
          } catch {
            return String(arg);
          }
        }
        return arg;
      }),
      timestamp: new Date().toISOString(),
    });
    
    // Call original console method
    originalConsole[level](...args);
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
    queueLog({
      type: 'error',
      level: 'error',
      message: event.reason ? String(event.reason) : 'Unhandled promise rejection',
      stack: event.reason?.stack || '',
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================
  // C. Network Logs Capture (Fetch)
  // ============================================
  
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const [url, options = {}] = args;
    const method = options.method || 'GET';
    const startTime = Date.now();
    const requestId = `fetch_${Date.now()}_${Math.random()}`;

    // Log request start
    queueLog({
      type: 'network',
      level: 'info',
      requestId: requestId,
      method: method,
      url: typeof url === 'string' ? url : url.toString(),
      status: 'pending',
      timestamp: new Date().toISOString(),
    });

    // Call original fetch
    return originalFetch.apply(this, args)
      .then(response => {
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        // Clone response to read body without consuming it
        const clonedResponse = response.clone();
        
        // Try to read response body (for size estimation)
        clonedResponse.text().then(body => {
          queueLog({
            type: 'network',
            level: response.ok ? 'info' : 'error',
            requestId: requestId,
            method: method,
            url: typeof url === 'string' ? url : url.toString(),
            status: response.status,
            statusText: response.statusText,
            latency: latency,
            responseSize: body.length,
            headers: Object.fromEntries(response.headers.entries()),
            timestamp: new Date().toISOString(),
          });
        }).catch(() => {
          // If we can't read body, still log the response
          queueLog({
            type: 'network',
            level: response.ok ? 'info' : 'error',
            requestId: requestId,
            method: method,
            url: typeof url === 'string' ? url : url.toString(),
            status: response.status,
            statusText: response.statusText,
            latency: latency,
            headers: Object.fromEntries(response.headers.entries()),
            timestamp: new Date().toISOString(),
          });
        });
        
        return response;
      })
      .catch(error => {
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        queueLog({
          type: 'network',
          level: 'error',
          requestId: requestId,
          method: method,
          url: typeof url === 'string' ? url : url.toString(),
          status: 'failed',
          error: error.message || 'Network request failed',
          latency: latency,
          timestamp: new Date().toISOString(),
        });
        
        throw error;
      });
  };

  // ============================================
  // D. Network Logs Capture (XMLHttpRequest)
  // ============================================
  
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  const xhrMap = new WeakMap();

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    const requestId = `xhr_${Date.now()}_${Math.random()}`;
    xhrMap.set(this, {
      requestId,
      method,
      url: typeof url === 'string' ? url : url.toString(),
      startTime: Date.now(),
    });
    
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    const xhrInfo = xhrMap.get(this);
    if (!xhrInfo) {
      return originalXHRSend.apply(this, args);
    }

    // Log request start
    queueLog({
      type: 'network',
      level: 'info',
      requestId: xhrInfo.requestId,
      method: xhrInfo.method,
      url: xhrInfo.url,
      status: 'pending',
      timestamp: new Date().toISOString(),
    });

    // Capture response
    this.addEventListener('loadend', function() {
      const latency = Date.now() - xhrInfo.startTime;
      const status = this.status || 0;
      
      queueLog({
        type: 'network',
        level: (status >= 200 && status < 300) ? 'info' : (status >= 400 ? 'error' : 'warn'),
        requestId: xhrInfo.requestId,
        method: xhrInfo.method,
        url: xhrInfo.url,
        status: status,
        statusText: this.statusText || '',
        latency: latency,
        responseSize: this.responseText?.length || 0,
        timestamp: new Date().toISOString(),
      });
    });

    this.addEventListener('error', function() {
      const latency = Date.now() - xhrInfo.startTime;
      
      queueLog({
        type: 'network',
        level: 'error',
        requestId: xhrInfo.requestId,
        method: xhrInfo.method,
        url: xhrInfo.url,
        status: 'failed',
        error: 'Network request failed',
        latency: latency,
        timestamp: new Date().toISOString(),
      });
    });

    return originalXHRSend.apply(this, args);
  };

  // ============================================
  // E. Performance-Based Logs (Optional)
  // ============================================
  
  // Capture resource timings
  if (window.PerformanceObserver) {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'resource') {
            queueLog({
              type: 'performance',
              level: entry.transferSize > 1000000 ? 'warn' : 'info', // Warn for > 1MB
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
  // Flush logs on page unload
  // ============================================
  
  window.addEventListener('beforeunload', () => {
    flushLogs();
  });

  // Also flush periodically to ensure no logs are lost
  setInterval(flushLogs, 1000);

})();

