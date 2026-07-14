import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      fastRefresh: true,
    }),
  ],
  base: './',
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'esbuild',
    esbuildOptions: {
      drop: ['console', 'debugger'],
      legalComments: 'none',
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'framer-motion': ['framer-motion'],
          'recharts': ['recharts'],
          'pdf-export': ['jspdf', 'jspdf-autotable'],
          'xlsx-export': ['xlsx', 'xlsx-js-style'],
          'lucide': ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
  },
  server: {
    port: 5174,
    allowedHosts: true,
  },
  esbuild: {
    treeShaking: true,
  },
})
