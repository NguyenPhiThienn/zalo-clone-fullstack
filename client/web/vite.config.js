import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()], build: { chunkSizeWarningLimit: 2000, rollupOptions: { output: { manualChunks(id) { if (id.includes('node_modules')) { return id.toString().split('node_modules/')[1].split('/')[0].toString(); } } } } },
  optimizeDeps: {
    include: ['sockjs-client'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
