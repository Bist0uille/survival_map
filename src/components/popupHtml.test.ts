import { describe, it, expect } from 'vitest'
import { featurePopupHtml } from './popupHtml'

describe('featurePopupHtml', () => {
  it('affiche la vérification terrain quand check_date est présent', () => {
    const html = featurePopupHtml({ categoryId: 'water', name: 'Fontaine', check_date: '2024-03-12' })
    expect(html).toContain('Vérifié sur le terrain le 12/03/2024')
    expect(html).not.toContain('data-freshness')
  })

  it('accepte survey:date comme équivalent', () => {
    const html = featurePopupHtml({ categoryId: 'water', 'survey:date': '2023-08-01' })
    expect(html).toContain('Vérifié sur le terrain le 01/08/2023')
  })

  it('pose un placeholder de fraîcheur sinon', () => {
    const html = featurePopupHtml({ categoryId: 'water', name: 'Fontaine' })
    expect(html).toContain('data-freshness')
    expect(html).not.toContain('Vérifié sur le terrain')
  })

  it('échappe le HTML des tags OSM', () => {
    const html = featurePopupHtml({
      categoryId: 'water',
      name: '<script>alert(1)</script>',
      check_date: '<b>x</b>',
    })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<b>x</b>')
  })
})
