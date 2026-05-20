import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'pwa-192x192.png'],
      workbox: {
        globIgnores: ['**/ocr-*.js', '**/vendor-ocr-*.js', '**/pdf.worker-*.mjs']
      },
      manifest: {
        name: 'Makina Ime',
        short_name: 'Makina Ime',
        description: 'Premium Vehicle Management & Reminder System',
        theme_color: '#0B1120',
        background_color: '#0B1120',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        categories: ['utilities', 'productivity', 'finance'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor-react'
          if (id.includes('@firebase/auth') || id.includes('firebase/auth')) return 'vendor-firebase-auth'
          if (id.includes('@firebase/firestore') || id.includes('firebase/firestore')) return 'vendor-firebase-firestore'
          if (id.includes('@firebase') || id.includes('firebase/')) return 'vendor-firebase-core'
          if (id.includes('i18next') || id.includes('react-i18next')) return 'vendor-i18n'
          if (id.includes('lucide-react')) return 'vendor-icons'
          if (id.includes('pdfjs-dist') || id.includes('tesseract.js')) return 'vendor-ocr'
          return undefined
        }
      }
    }
  }
})
