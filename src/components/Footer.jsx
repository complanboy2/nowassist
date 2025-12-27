import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="mx-auto max-w-[1600px] w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            © {new Date().getFullYear()} NowAssist. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Version 0.1.0</span>
            <div className="h-4 w-px bg-gray-300"></div>
            <span className="text-sm text-gray-600">Made with ❤️ for developers</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

