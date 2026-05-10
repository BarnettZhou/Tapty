import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/ws': {
        target: 'ws://localhost:3456',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
            socket.on('error', (err: any) => {
              if (err.code === 'ECONNRESET') return
              console.error('WS proxy socket error:', err)
            })
          })
        },
      },
    },
  },
  build: {
    outDir: '../server/dist/public',
    emptyOutDir: true,
  },
})