import React from 'react';
import { Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 border-t border-gray-700 mt-auto w-full">
      <div className="mx-auto max-w-[1600px] w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col items-center gap-4 sm:gap-6">
          {/* Main footer content */}
          <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4 sm:gap-6">
            {/* Left: Copyright */}
            <div className="flex items-center">
              <span className="text-sm text-gray-300">
                © {new Date().getFullYear()} NowAssist. All rights reserved.
              </span>
            </div>
            
            {/* Right: Version and tagline */}
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <span>Version 0.1.0</span>
                <span className="hidden sm:inline text-gray-600">·</span>
                <span className="flex items-center gap-1.5">
                  Made with <Heart className="h-3.5 w-3.5 text-red-400 fill-red-400" /> for developers
                </span>
              </div>
            </div>
          </div>
          
          {/* Bottom divider - subtle separator */}
          <div className="w-full pt-4 border-t border-gray-800">
            <p className="text-xs text-center text-gray-400">
              Everything happens in your browser. Your data never leaves your device.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
