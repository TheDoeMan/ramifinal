import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: '.',
  publicDir: 'public',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    hmr: {
      port: 5000,
    },
    allowedHosts: [
      'ramifinal-1.onrender.com',
      '8b6d3beb-3da8-4a12-8d97-d339c289b320-00-1iqb5e6mlt4nk.kirk.replit.dev',
    ],
  },
  preview: {
    port: 5000,
    allowedHosts: [
      'ramifinal-1.onrender.com',
      '8b6d3beb-3da8-4a12-8d97-d339c289b320-00-1iqb5e6mlt4nk.kirk.replit.dev',
    ],
  },
  build: {
    outDir: 'dist',
  },
})
