import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Config de test séparée : on ne charge pas le plugin PWA (inutile en test et
// source de lenteur). jsdom fournit DOMParser/window pour les tests qui en ont
// besoin (parsing GPX, hooks navigateur).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
