import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Node 25 exposes a separate Web Storage implementation; use the jsdom store.
if (typeof window !== 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: window.localStorage })
  afterEach(cleanup)
}
