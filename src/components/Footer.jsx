import React from 'react';
import { Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 border-t border-gray-200 w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col items-center gap-4 sm:gap-6">
          {/* Main footer content */}
          <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4 sm:gap-6">
            {/* Left: Copyright */}
            <div className="flex items-center">
              <span className="text-sm text-gray-700">
                © {new Date().getFullYear()} NowAssist. All rights reserved.
              </span>
            </div>
            
            {/* Right: Version and tagline */}
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span>Version 0.1.0</span>
                <span className="hidden sm:inline text-gray-400">·</span>
                <span className="flex items-center gap-1.5 text-gray-700">
                  Made with <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500" /> for developers
                </span>
              </div>
            </div>
          </div>
          
          {/* Bottom divider - subtle separator */}
          <div className="w-full pt-4 border-t border-gray-300">
            <p className="text-xs text-center text-gray-600">
              Everything happens in your browser. Your data never leaves your device.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
