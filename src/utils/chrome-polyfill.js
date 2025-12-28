/**
 * Chrome Extension API Polyfill for Web Deployment
 * Provides fallback implementations when Chrome extension APIs are not available
 */

// Detect if running as Chrome extension
const isChromeExtension = typeof chrome !== 'undefined' && 
                          chrome.runtime && 
                          chrome.runtime.id;

/**
 * Get Chrome API polyfill - returns real Chrome APIs if extension, otherwise polyfills
 */
export const getChromePolyfill = () => {
  if (isChromeExtension) {
    // Running as Chrome extension - return real Chrome APIs
    return chrome;
  }

  // Running as web app - provide polyfills
  return {
    runtime: {
      getURL: (path) => {
        // For web app, return relative URL
        // Remove leading slash if path already has one
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `/${cleanPath}`;
      },
      id: null,
      sendMessage: async (message, callback) => {
        // No-op for web app
        if (callback) callback({ success: false, error: 'Not available in web app' });
      },
      onMessage: {
        addListener: () => {},
        removeListener: () => {},
      },
    },
    storage: {
      local: {
        get: async (keys) => {
          // Use localStorage as fallback
          const result = {};
          const keysArray = Array.isArray(keys) ? keys : (keys ? Object.keys(keys) : []);
          
          if (keysArray.length === 0) {
            // Get all keys from localStorage
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key) {
                try {
                  result[key] = JSON.parse(localStorage.getItem(key));
                } catch {
                  result[key] = localStorage.getItem(key);
                }
              }
            }
          } else {
            keysArray.forEach(key => {
              const value = localStorage.getItem(key);
              if (value !== null) {
                try {
                  result[key] = JSON.parse(value);
                } catch {
                  result[key] = value;
                }
              }
            });
          }
          
          return result;
        },
        set: async (data) => {
          Object.entries(data).forEach(([key, value]) => {
            localStorage.setItem(key, JSON.stringify(value));
          });
        },
        remove: async (keys) => {
          const keysArray = Array.isArray(keys) ? keys : [keys];
          keysArray.forEach(key => {
            localStorage.removeItem(key);
          });
        },
        clear: async () => {
          localStorage.clear();
        },
      },
      onChanged: {
        addListener: () => {},
        removeListener: () => {},
      },
    },
    tabs: {
      query: async (queryInfo, callback) => {
        // No tabs available in web app
        if (callback) callback([]);
        return [];
      },
      get: async (tabId, callback) => {
        if (callback) callback(null);
        return null;
      },
      sendMessage: async (tabId, message, callback) => {
        if (callback) callback({ success: false });
        return { success: false };
      },
    },
    scripting: null,
    webRequest: null,
    devtools: null,
  };
};

// Export the polyfill instance
export const chromePolyfill = getChromePolyfill();

// Export helper to get URL safely
export const getExtensionURL = (path) => {
  return chromePolyfill.runtime.getURL(path);
};

// Export helper for storage
export const storage = chromePolyfill.storage.local;

// Export detection helper
export const isRunningAsExtension = () => isChromeExtension;

