import { it, expect } from 'vitest'
import { safeExternalUrl } from './safeUrl'

it('rejects script, data, credentials, relative and lookalike-host links', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', '//evil.example', 'https://user:pass@example.org', 'http://example.org']) {
    expect(safeExternalUrl(url)).toBeNull()
  }
  expect(safeExternalUrl('https://www.refuges.info/point/123', 'refuges.info')).toBe('https://www.refuges.info/point/123')
  expect(safeExternalUrl('https://refuges.info.evil.example', 'refuges.info')).toBeNull()
})
