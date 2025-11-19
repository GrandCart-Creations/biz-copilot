import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: '/', // Explicit base for root deployment
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['otplib', 'qrcode'],
  },
  server: {
    port: 5173,
    strictPort: true,
    host: 'localhost',
  },
  build: {
    // Let Vite handle chunking automatically to avoid dependency issues
    // Manual chunking was causing React/recharts dependency problems
    chunkSizeWarningLimit: 600, // Increase limit slightly
  },
})
