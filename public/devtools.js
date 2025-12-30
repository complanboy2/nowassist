// DevTools panel script
let currentTabId = null;
let isInjected = false;

// Create DevTools panel
chrome.devtools.panels.create(
  'NowAssist Logs',
  'icons/icon64.png',
  'devtools.html',
  (panel) => {
    // Panel created
    panel.onShown.addListener((window) => {
      // Panel is shown - get tab ID and initialize
      getCurrentTabId();
    });
  }
);

// Get current tab ID using chrome.tabs API
function getCurrentTabId() {
  // Get the inspected window's tab ID
  chrome.devtools.inspectedWindow.eval('window.location.href', (result, isException) => {
    if (!isException && result) {
      // Use chrome.tabs API to find the tab
      chrome.tabs.query({}, (tabs) => {
        // Find tab matching the inspected window URL
        const inspectedUrl = result;
        const matchingTab = tabs.find(tab => tab.url === inspectedUrl || 
          (tab.url && inspectedUrl && tab.url.split('?')[0] === inspectedUrl.split('?')[0]));
        
        if (matchingTab && matchingTab.id) {
          currentTabId = matchingTab.id;
          initializePanel();
        } else {
          // Fallback: try active tab
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
              currentTabId = tabs[0].id;
              initializePanel();
            }
          });
        }
      });
    }
  });
}

// Alternative: Get tab ID from chrome.devtools
chrome.devtools.network.onNavigated.addListener(() => {
  // Page navigated, refresh
  isInjected = false;
  getCurrentTabId();
});

function initializePanel() {
  // Inject content script when panel opens
  if (!isInjected && currentTabId) {
    injectContentScript();
  }
  
  // Setup button click handler
  document.getElementById('openInTab').addEventListener('click', () => {
    if (currentTabId) {
      openLogsInNewTab(currentTabId);
    } else {
      // Fallback: try to get current tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          openLogsInNewTab(tabs[0].id);
        }
      });
    }
  });
  
  // Update status
  updateStatus();
}

function injectContentScript() {
  if (!currentTabId) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        currentTabId = tabs[0].id;
        doInject();
      }
    });
  } else {
    doInject();
  }
}

function doInject() {
  if (currentTabId && chrome.scripting) {
    chrome.scripting.executeScript({
      target: { tabId: currentTabId },
      files: ['content-script.js'],
    }).then(() => {
      isInjected = true;
      updateStatus();
      // Auto-activate logging when DevTools panel opens
      activateLogging();
    }).catch((err) => {
      console.error('Failed to inject content script:', err);
      isInjected = false;
      updateStatus();
    });
  }
}

function activateLogging() {
  if (currentTabId && chrome.runtime) {
    chrome.runtime.sendMessage({
      action: 'activate_logging',
      tabIds: [currentTabId]
    });
  }
}

function updateStatus() {
  const statusEl = document.getElementById('status');
  if (isInjected) {
    statusEl.textContent = 'Active';
    statusEl.className = 'status';
  } else {
    statusEl.textContent = 'Inactive';
    statusEl.className = 'status inactive';
  }
}

function openLogsInNewTab(tabId) {
  const targetTabId = tabId || currentTabId;
  if (targetTabId) {
    const logsUrl = chrome.runtime.getURL(`logs.html?tabId=${targetTabId}`);
    chrome.tabs.create({ url: logsUrl });
  }
}

// Auto-inject when panel is opened
chrome.devtools.network.onRequestFinished.addListener(() => {
  if (!isInjected) {
    injectContentScript();
  }
});

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePanel);
} else {
  initializePanel();
}

