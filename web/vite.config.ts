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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            // Keep React ecosystem together (react + react-dom + scheduler + radix)
            // to avoid circular dependency issues with code splitting
            if (
              id.includes('react-dom') ||
              id.includes('/react/') ||
              id.includes('scheduler') ||
              id.includes('@radix-ui') ||
              id.includes('react-remove-scroll') ||
              id.includes('react-style-singleton') ||
              id.includes('aria-hidden')
            ) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('socket.io') || id.includes('engine.io')) {
              return 'vendor-socket';
            }
            if (id.includes('@noble')) {
              return 'vendor-crypto';
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})

