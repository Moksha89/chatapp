import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    proxy: {
      '/auth': { target: 'http://104.219.250.32:3000', changeOrigin: true },
      '/users': { target: 'http://104.219.250.32:3000', changeOrigin: true },
      '/chats': { target: 'http://104.219.250.32:3000', changeOrigin: true },
      '/health': { target: 'http://104.219.250.32:3000', changeOrigin: true },
      '/peer': { target: 'http://104.219.250.32:3000', changeOrigin: true, ws: true },
      '/socket.io': { target: 'http://104.219.250.32:3000', changeOrigin: true, ws: true },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
  },
})

