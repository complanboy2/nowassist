import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  // Provide a default if context is not available (for extension mode compatibility)
  if (!context) {
    // Return default light theme and no-op toggle
    return {
      theme: 'light',
      toggleTheme: () => {
        console.warn('ThemeProvider not available, dark mode toggle disabled');
      }
    };
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Check localStorage for saved theme preference, default to 'dark'
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nowassist-theme');
      // If user has a saved preference, use it; otherwise default to 'dark'
      return saved || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('nowassist-theme', theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

