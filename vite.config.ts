import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

const BUILD_TIMESTAMP = Date.now().toString()

// Inject the build timestamp into the service worker so each deploy gets a
// fresh cache name and stale clients are forced to re-cache assets.
function injectSwTimestamp(): import('vite').Plugin {
  return {
    name: 'inject-sw-timestamp',
    writeBundle(options) {
      const outDir = options.dir ?? 'dist'
      const swPath = path.resolve(outDir, 'sw.js')
      if (!fs.existsSync(swPath)) return
      const original = fs.readFileSync(swPath, 'utf-8')
      const replaced = original.replace(
        /self\.__BUILD_TIMESTAMP__\s*\|\|\s*['"]v1['"]/,
        `'${BUILD_TIMESTAMP}'`,
      )
      fs.writeFileSync(swPath, replaced)
    },
  }
}

export default defineConfig({
  plugins: [react(), injectSwTimestamp()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          pdf: ['jspdf', 'jspdf-autotable'],
        },
      },
    },
  },
})
