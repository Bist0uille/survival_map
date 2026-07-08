import { describe, it, expect } from 'vitest'
import { featurePopupHtml, checkinSectionHtml } from './popupHtml'
import type { CheckinRecord } from '../data/checkinLogic'

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

  it('affiche la source open data à la place de la fraîcheur OSM', () => {
    const html = featurePopupHtml({
      categoryId: 'meal',
      name: 'Resto solidaire',
      source: 'data·inclusion',
      source_date: '2026-06-01',
    })
    expect(html).toContain('Donnée data·inclusion · mise à jour le 01/06/2026')
    expect(html).not.toContain('data-freshness')
  })

  it('inclut le placeholder refuges.info', () => {
    expect(featurePopupHtml({ categoryId: 'refuge' })).toContain('data-refuges')
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

describe('checkinSectionHtml', () => {
  const NOW = 1_800_000_000_000
  const rec: CheckinRecord = { ok: 3, gone: 0, lastOk: NOW - 86_400_000, lastGone: null, lon: 3, lat: 43 }

  it('affiche l’état et les boutons en ligne', () => {
    const html = checkinSectionHtml('n12', 3, 43, rec, NOW, true)
    expect(html).toContain('Confirmé il y a 1 j (3 confirmations)')
    expect(html).toContain('data-checkin="ok"')
    expect(html).toContain('data-checkin="gone"')
    expect(html).toContain('data-checkin-id="n12"')
    expect(html).toContain('data-checkin-ll="3,43"')
  })

  it('masque les boutons hors-ligne mais garde l’état', () => {
    const html = checkinSectionHtml('n12', 3, 43, rec, NOW, false)
    expect(html).toContain('Confirmé')
    expect(html).not.toContain('data-checkin=')
  })

  it('invite au premier signalement sans historique', () => {
    const html = checkinSectionHtml('n12', 3, 43, null, NOW, true)
    expect(html).toContain("Personne n'a encore confirmé")
  })

  it('ne propose rien pour un id synthétique', () => {
    expect(checkinSectionHtml('x9', 3, 43, null, NOW, true)).toBe('')
  })
})
