import React from 'react';
import { Heart } from 'lucide-react';

const getIconURL = (filename) => {
  const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
  return isExtension ? chrome.runtime.getURL(`icons/${filename}`) : `/nowassist/icons/${filename}`;
};

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-800 border-t border-gray-300 dark:border-gray-700 w-full mt-auto">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col items-center gap-4 sm:gap-6">
          {/* Main footer content */}
          <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4 sm:gap-6">
            {/* Left: Copyright */}
            <div className="flex items-center gap-2">
              <img 
                src={getIconURL('icon32.png')} 
                alt="NowAssist" 
                className="h-5 w-5"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                © {new Date().getFullYear()} NowAssist. All rights reserved.
              </span>
            </div>
            
            {/* Right: Version and tagline */}
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Version 0.1.0</span>
                <span className="hidden sm:inline text-gray-400 dark:text-gray-500">·</span>
                <span className="flex items-center gap-1.5 font-medium">
                  Made with <Heart className="h-3.5 w-3.5 text-red-500 dark:text-red-400 fill-red-500 dark:fill-red-400" /> for developers
                </span>
              </div>
            </div>
          </div>
          
          {/* Bottom divider - subtle separator */}
          <div className="w-full pt-4 border-t border-gray-300 dark:border-gray-600">
            <p className="text-xs text-center text-gray-600 dark:text-gray-400 font-medium">
              Everything happens in your browser. Your data never leaves your device.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
