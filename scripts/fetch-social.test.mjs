import { describe, it, expect } from 'vitest'
import {
  csvRows,
  mapDiService,
  odsCoords,
  resolveDiServicesCsvUrl,
  ODS_SOURCES,
} from './fetch-social.mjs'

async function collect(gen) {
  const out = []
  for await (const r of gen) out.push(r)
  return out
}

describe('csvRows', () => {
  it('parse les guillemets, virgules et sauts de ligne internes', async () => {
    const csv = 'a,b,c\n"x,1","ligne\ncoupée","avec ""quote"""\n'
    const rows = await collect(csvRows([csv]))
    expect(rows).toEqual([
      ['a', 'b', 'c'],
      ['x,1', 'ligne\ncoupée', 'avec "quote"'],
    ])
  })

  it('gère CRLF et dernière ligne sans saut final', async () => {
    const rows = await collect(csvRows(['a,b\r\n1,2\r\n3,4']))
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ])
  })
})

const HEADER = [
  'id', 'structure_id', 'source', 'nom', 'conditions_acces', 'description', 'type',
  'thematiques', 'frais', 'frais_precisions', 'publics', 'publics_precisions',
  'commune', 'code_postal', 'code_insee', 'adresse', 'complement_adresse',
  'longitude', 'latitude', 'horaires_accueil', 'lien_source', 'telephone',
  'courriel', 'contact_nom_prenom', 'date_maj',
]

function diRow(over = {}) {
  const base = {
    id: 'src--42', structure_id: 'st-1', nom: 'Distribution repas',
    thematiques: "['equipement-et-alimentation--alimentation']",
    frais: 'gratuit', commune: 'Narbonne', code_postal: '11100',
    adresse: '1 rue du Test', longitude: '3.003', latitude: '43.184',
    horaires_accueil: 'Lun-Ven 12h', lien_source: 'https://ex.fr',
    date_maj: '2026-06-01T00:00:00', description: 'Repas chauds',
  }
  const merged = { ...base, ...over }
  return HEADER.map((k) => merged[k] ?? '')
}

describe('mapDiService', () => {
  it('mappe un service alimentation en Feature meal', () => {
    const f = mapDiService(HEADER, diRow())
    expect(f?.properties).toMatchObject({
      id: 'di-src--42',
      categoryId: 'meal',
      iconId: 'meal',
      name: 'Distribution repas',
      fee: 'gratuit',
      opening_hours: 'Lun-Ven 12h',
      source: 'data·inclusion',
      source_date: '2026-06-01',
    })
    expect(f.geometry.coordinates).toEqual([3.003, 43.184])
    expect(f.properties.description).toContain('1 rue du Test')
  })

  it('écarte sans coordonnées ou hors thématique', () => {
    expect(mapDiService(HEADER, diRow({ longitude: '', latitude: '' }))).toBeNull()
    expect(mapDiService(HEADER, diRow({ longitude: '0', latitude: '0' }))).toBeNull()
    expect(mapDiService(HEADER, diRow({ thematiques: "['sante--soins']" }))).toBeNull()
  })
})

describe('odsCoords', () => {
  it('lit un Point, un MultiPoint (Toulouse) et geo_point_2d', () => {
    expect(odsCoords({ geometry: { type: 'Point', coordinates: [1, 2] }, properties: {} })).toEqual([1, 2])
    expect(
      odsCoords({ geometry: { type: 'MultiPoint', coordinates: [[3, 4]] }, properties: {} }),
    ).toEqual([3, 4])
    expect(
      odsCoords({ geometry: null, properties: { geo_point_2d: { lon: 5, lat: 6 } } }),
    ).toEqual([5, 6])
    expect(odsCoords({ geometry: null, properties: {} })).toBeNull()
  })
})

describe('mappers ODS', () => {
  const by = Object.fromEntries(ODS_SOURCES.map((s) => [s.code, s]))

  it('Paris : écarte fontaines indisponibles et sanisettes hors service', () => {
    expect(by['paris-eau'].map({ dispo: 'NON' })).toBeNull()
    expect(by['paris-eau'].map({ dispo: 'OUI', voie: 'PARC X' })?.categoryId).toBe('water')
    expect(by['paris-wc'].map({ statut: 'Hors service' })).toBeNull()
    const wc = by['paris-wc'].map({ statut: 'En service', horaire: '24h/24', acces_pmr: 'Oui' })
    expect(wc?.categoryId).toBe('toilets')
    expect(wc?.opening_hours).toBe('24h/24')
    expect(wc?.description).toContain('Accès PMR')
  })

  it('Bordeaux : fontaine non fonctionnelle écartée, date de contrôle gardée', () => {
    expect(by['bdx-eau'].map({ etat: 'en panne' })).toBeNull()
    const f = by['bdx-eau'].map({ etat: 'fonctionnelle', date_dernier_controle: '2026-03-05' })
    expect(f?.source_date).toBe('2026-03-05')
  })

  it('IDFM : réservé au public uniquement', () => {
    expect(by['idfm-wc'].map({ accessible_au_public: 'non' })).toBeNull()
    expect(by['idfm-wc'].map({ accessible_au_public: 'oui', station: 'Châtelet' })?.name).toContain(
      'Châtelet',
    )
  })
})

describe('resolveDiServicesCsvUrl', () => {
  it('choisit la ressource CSV services la plus récente', async () => {
    const url = await resolveDiServicesCsvUrl({
      resources: [
        { format: 'csv', title: 'structures-inclusion-2026-07-06.csv', latest: 'S' },
        { format: 'csv', title: 'services-inclusion-2026-06-29.csv', latest: 'OLD' },
        { format: 'csv', title: 'services-inclusion-2026-07-06.csv', latest: 'NEW' },
        { format: 'json', title: 'services-inclusion-2026-07-06.json', latest: 'J' },
      ],
    })
    expect(url).toBe('NEW')
  })
})
