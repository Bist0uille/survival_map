import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'og-image.png'],
      manifest: {
        name: 'Survimap — eau, vélo et randonnée',
        short_name: 'Survimap',
        description:
          'Fontaines, ravitaillement à vélo, refuges et sentiers sur une carte gratuite.',
        theme_color: '#15803d',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Le worker MapLibre est un module .mjs, nécessaire aussi hors ligne.
        globPatterns: ['**/*.{js,mjs,wasm,css,html}'],
        // Les guides sont de vraies pages HTML, pas des écrans de l'application.
        // Évite que le service worker les remplace par la carte après une visite.
        navigateFallbackDenylist: [
          /^\/guides(?:\/|$)/,
          /^\/fontaines-eau-potable(?:\/|$)/,
          /^\/ravitaillement-velo(?:\/|$)/,
          /^\/randonnee-bivouac(?:\/|$)/,
          /^\/boulangeries-autour-de-moi(?:\/|$)/,
          /^\/refuges-abris-randonnee(?:\/|$)/,
          /^\/carte-randonnee-hors-ligne(?:\/|$)/,
          /^\/privacy\.html$/,
        ],
        // Cache runtime des tuiles topo + réponses Overpass déjà visitées
        // => premier niveau d'offline sur les zones déjà ouvertes.
        runtimeCaching: [
          {
            // Base statique des POI : servie depuis le cache, rafraîchie en fond.
            urlPattern: /\/data\/pois\.json$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'pois-data',
              expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/[abc]\.tile\.opentopomap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'opentopomap-tiles',
              // Pas de plugin d'expiration : il ralentit énormément le
              // téléchargement en masse (écriture IndexedDB par tuile). Le
              // cache grossit, mais c'est voulu pour le hors-ligne.
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/api\/interpreter/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'overpass-api',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24, // 24 h
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
