// DevTools panel creation script (runs in DevTools context)
chrome.devtools.panels.create(
  'NowAssist Logs',
  'icons/icon_64.png',
  'devtools-panel.html',
  (panel) => {
    // Panel created successfully
    console.log('NowAssist Logs panel created');
  }
);

