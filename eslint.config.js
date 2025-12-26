import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        chrome: 'readonly',
        React: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        alert: 'readonly',
        fetch: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        TextDecoder: 'readonly',
        DOMParser: 'readonly',
        XMLSerializer: 'readonly',
        crypto: 'readonly',
        ResizeObserver: 'readonly',
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+
      'react/prop-types': 'off', // Using TypeScript would be better, but not set up
      'no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-control-regex': 'off', // Needed for binary data parsing
      'no-prototype-builtins': 'off', // hasOwnProperty is safe to use
      'no-useless-escape': 'warn', // Warn for unnecessary escapes
      'no-case-declarations': 'off', // Allow declarations in case blocks
      'react/display-name': 'warn', // Warn for missing display names
      'react/no-unescaped-entities': 'warn', // Warn for unescaped entities
      'react-hooks/set-state-in-effect': 'warn', // Warn instead of error
      'react-hooks/exhaustive-deps': 'warn', // Warn instead of error for missing deps
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**', '*.config.js'],
  },
];

