import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'public/popup.html'),
        jwt: resolve(__dirname, 'public/jwt.html'),
        'jwt-encoder': resolve(__dirname, 'public/jwt-encoder.html'),
        saml: resolve(__dirname, 'public/saml.html'),
        rest: resolve(__dirname, 'public/rest.html'),
        logs: resolve(__dirname, 'public/logs.html'),
        'har-analyzer': resolve(__dirname, 'public/har-analyzer.html'),
        'json-utility': resolve(__dirname, 'public/json-utility.html'),
        'encoder-decoder': resolve(__dirname, 'public/encoder-decoder.html'),
        about: resolve(__dirname, 'public/about.html'),
      },
    },
    copyPublicDir: true,
  },
});


