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
    // Optimize chunk sizes
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React and routing
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
            return 'vendor-react';
          }
          // Firebase
          if (id.includes('firebase')) {
            return 'vendor-firebase';
          }
          // Charts
          if (id.includes('recharts')) {
            return 'vendor-charts';
          }
          // PDF libraries
          if (id.includes('jspdf') || id.includes('pdfjs')) {
            return 'vendor-pdf';
          }
          // Excel/Spreadsheet
          if (id.includes('xlsx') || id.includes('exceljs')) {
            return 'vendor-excel';
          }
          // Date utilities
          if (id.includes('date-fns')) {
            return 'vendor-date';
          }
          // Other utilities
          if (id.includes('node_modules')) {
            return 'vendor-utils';
          }
        }
      }
    },
    chunkSizeWarningLimit: 600, // Increase limit slightly
  },
})
