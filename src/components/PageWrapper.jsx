import React from 'react';
import Navigation from './Navigation';

/**
 * Wrapper component that conditionally renders Navigation based on Router mode
 * In Router mode, Navigation is rendered in App.jsx, so we don't render it here
 */
export const PageWrapper = ({ children, currentPageId, sidebarOpen, onSidebarToggle }) => {
  const isRouterMode = typeof window !== 'undefined' && window.__ROUTER_MODE__;
  
  if (isRouterMode) {
    // In Router mode, just render children (Navigation is in App.jsx)
    return <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 flex flex-col" style={{ width: '100%', minWidth: 0 }}>{children}</div>;
  }
  
  // In extension mode, render with Navigation
  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Navigation currentPageId={currentPageId} sidebarOpen={sidebarOpen} onSidebarToggle={onSidebarToggle} />
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 flex flex-col" style={{ width: '100%', minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
};

