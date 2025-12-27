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
        popup: resolve(__dirname, 'popup.html'),
        jwt: resolve(__dirname, 'jwt.html'),
        'jwt-encoder': resolve(__dirname, 'jwt-encoder.html'),
        saml: resolve(__dirname, 'saml.html'),
        rest: resolve(__dirname, 'rest.html'),
        logs: resolve(__dirname, 'logs.html'),
        'har-analyzer': resolve(__dirname, 'har-analyzer.html'),
        'json-utility': resolve(__dirname, 'json-utility.html'),
        'encoder-decoder': resolve(__dirname, 'encoder-decoder.html'),
        about: resolve(__dirname, 'about.html'),
      },
    },
    copyPublicDir: true,
  },
});


