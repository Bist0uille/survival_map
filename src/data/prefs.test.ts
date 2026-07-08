import { describe, it, expect, vi, afterEach } from 'vitest'
import { getPref, setPref, WELCOME_SEEN } from './prefs'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('prefs', () => {
  it('écrit puis relit une préférence', () => {
    expect(getPref(WELCOME_SEEN)).toBeNull()
    setPref(WELCOME_SEEN, '1')
    expect(getPref(WELCOME_SEEN)).toBe('1')
  })

  it('ne lève pas si localStorage est indisponible', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('privé')
    })
    expect(() => setPref('k', 'v')).not.toThrow()
    expect(getPref('k')).toBeNull()
  })
})
