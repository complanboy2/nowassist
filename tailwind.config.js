/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./public/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        primary: 'hsl(222.2 47.4% 11.2%)',
        background: '#ffffff',
        muted: '#f9fafb',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['SF Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}

