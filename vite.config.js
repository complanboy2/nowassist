import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'public/popup.html'),
        jwt: resolve(__dirname, 'public/jwt.html'),
      }
    },
    outDir: 'dist',
    emptyOutDir: true
  },
  publicDir: 'public'
})