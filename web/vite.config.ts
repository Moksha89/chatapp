import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/auth': { target: 'http://localhost:3000', changeOrigin: true },
      '/users': { target: 'http://localhost:3000', changeOrigin: true },
      '/chats': { target: 'http://localhost:3000', changeOrigin: true },
      '/media': { target: 'http://localhost:3000', changeOrigin: true },
      '/status': { target: 'http://localhost:3000', changeOrigin: true },
      '/contacts': { target: 'http://localhost:3000', changeOrigin: true },
      '/calls': { target: 'http://localhost:3000', changeOrigin: true },
      '/version': { target: 'http://localhost:3000', changeOrigin: true },
      '/admin': { target: 'http://localhost:3000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3000', changeOrigin: true, ws: true },
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    target: 'es2020',
    sourcemap: false,
    // CDN-ready: content-hashed filenames for aggressive caching
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['lucide-react'],
          'charts': ['recharts'],
        },
      },
    },
  },
})

