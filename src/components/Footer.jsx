import React from 'react';
import { Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-sky-100 to-blue-100 dark:from-gray-800 dark:to-gray-900 border-t-2 border-sky-300 dark:border-gray-700 w-full mt-auto">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col items-center gap-4 sm:gap-6">
          {/* Main footer content */}
          <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4 sm:gap-6">
            {/* Left: Copyright */}
            <div className="flex items-center">
              <span className="text-sm font-medium text-sky-900 dark:text-gray-100">
                © {new Date().getFullYear()} NowAssist. All rights reserved.
              </span>
            </div>
            
            {/* Right: Version and tagline */}
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-3 text-sm text-sky-800 dark:text-gray-300">
                <span className="font-medium">Version 0.1.0</span>
                <span className="hidden sm:inline text-sky-600 dark:text-gray-500">·</span>
                <span className="flex items-center gap-1.5 font-medium">
                  Made with <Heart className="h-3.5 w-3.5 text-red-500 dark:text-red-400 fill-red-500 dark:fill-red-400" /> for developers
                </span>
              </div>
            </div>
          </div>
          
          {/* Bottom divider - subtle separator */}
          <div className="w-full pt-4 border-t border-sky-300 dark:border-gray-600">
            <p className="text-xs text-center text-sky-700 dark:text-gray-400 font-medium">
              Everything happens in your browser. Your data never leaves your device.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
