// Construit la couche « sociale » : aide alimentaire (data·inclusion,
// Licence Ouverte) + fontaines et toilettes publiques (portails OpenDataSoft
// municipaux, ODbL). Émet du GeoJSONSeq (une Feature Point par ligne) pour
// tippecanoe. Usage : node scripts/fetch-social.mjs > social.geojsonseq
import { stdout, stderr } from 'node:process'
import { pathToFileURL } from 'node:url'

// ---------------------------------------------------------------------------
// data·inclusion — les ressources data.gouv sont datées (nouvelles URLs à
// chaque publication) : on résout la dernière ressource CSV « services » via
// l'API catalogue, puis on streame le CSV (~160 Mo) sans le garder en mémoire.
// ---------------------------------------------------------------------------
const DI_DATASET =
  'https://www.data.gouv.fr/api/1/datasets/referentiel-de-loffre-dinsertion-liste-des-structures-et-services-dinsertion/'
const DI_THEME = 'equipement-et-alimentation--alimentation'

export async function resolveDiServicesCsvUrl(catalogue) {
  const res = (catalogue.resources ?? []).filter(
    (r) => r.format === 'csv' && /^services-inclusion/.test(r.title ?? ''),
  )
  res.sort((a, b) => String(b.title).localeCompare(String(a.title))) // plus récent d'abord
  return res[0]?.latest ?? res[0]?.url ?? null
}

/** Parseur CSV RFC4180 en flux (guillemets, virgules et sauts de ligne inclus). */
export async function* csvRows(chunks) {
  const dec = new TextDecoder('utf-8')
  let field = ''
  let row = []
  let inQuotes = false
  let prevQuote = false
  for await (const chunk of chunks) {
    const text = typeof chunk === 'string' ? chunk : dec.decode(chunk, { stream: true })
    for (const c of text) {
      if (inQuotes) {
        if (prevQuote) {
          prevQuote = false
          if (c === '"') {
            field += '"'
            continue
          }
          inQuotes = false
          // retombe dans le traitement hors guillemets ci-dessous
        } else if (c === '"') {
          prevQuote = true
          continue
        } else {
          field += c
          continue
        }
      }
      if (c === '"' && field === '') inQuotes = true
      else if (c === ',') {
        row.push(field)
        field = ''
      } else if (c === '\n') {
        row.push(field.endsWith('\r') ? field.slice(0, -1) : field)
        yield row
        field = ''
        row = []
      } else field += c
    }
  }
  if (field !== '' || row.length) {
    row.push(field)
    yield row
  }
}

/** Mappe une ligne service data·inclusion → Feature (ou null si hors sujet). */
export function mapDiService(header, row) {
  const g = (k) => row[header.indexOf(k)] ?? ''
  if (!g('thematiques').includes(DI_THEME)) return null
  const lon = Number(g('longitude'))
  const lat = Number(g('latitude'))
  if (!Number.isFinite(lon) || !Number.isFinite(lat) || (lon === 0 && lat === 0)) return null
  if (lon < -180 || lon > 180 || lat < -85 || lat > 85) return null
  const props = {
    id: 'di-' + g('id'),
    categoryId: 'meal',
    iconId: 'meal',
    name: g('nom') || 'Aide alimentaire',
    source: 'data·inclusion',
    structureId: g('structure_id'),
  }
  if (g('horaires_accueil')) props.opening_hours = g('horaires_accueil').slice(0, 200)
  if (g('frais')) props.fee = g('frais')
  const desc = [g('adresse'), g('code_postal') + ' ' + g('commune'), g('description')]
    .map((s) => String(s).trim())
    .filter(Boolean)
    .join(' · ')
  if (desc) props.description = desc.slice(0, 300)
  if (g('lien_source')) props.website = g('lien_source')
  if (g('date_maj')) props.source_date = g('date_maj').slice(0, 10)
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [round6(lon), round6(lat)] },
    properties: props,
  }
}

// ---------------------------------------------------------------------------
// Portails OpenDataSoft (fontaines / toilettes) — connecteur générique.
// ---------------------------------------------------------------------------
export const ODS_SOURCES = [
  {
    code: 'paris-eau',
    portal: 'opendata.paris.fr',
    dataset: 'fontaines-a-boire',
    attribution: 'Ville de Paris',
    map(p) {
      if (p.dispo !== 'OUI') return null
      return {
        categoryId: 'water',
        iconId: 'water',
        name: 'Fontaine à boire',
        description: [p.voie, p.commune].filter(Boolean).join(', '),
      }
    },
  },
  {
    code: 'paris-wc',
    portal: 'opendata.paris.fr',
    dataset: 'sanisettesparis',
    attribution: 'Ville de Paris',
    map(p) {
      if (String(p.statut ?? '').toLowerCase().startsWith('hors')) return null
      return {
        categoryId: 'toilets',
        iconId: 'toilets',
        name: 'Sanisette',
        opening_hours: p.horaire ?? undefined,
        description: [p.adresse, p.arrondissement, p.acces_pmr === 'Oui' ? 'Accès PMR' : null]
          .filter(Boolean)
          .join(' · '),
        website: p.url_fiche_equipement ?? undefined,
      }
    },
  },
  {
    code: 'bdx-eau',
    portal: 'opendata.bordeaux-metropole.fr',
    dataset: 'bor_fontaines_eau_potable',
    attribution: 'Bordeaux Métropole',
    map(p) {
      if (p.etat && p.etat !== 'fonctionnelle') return null
      return {
        categoryId: 'water',
        iconId: 'water',
        name: p.nom_fontaine ? `Fontaine ${p.nom_fontaine}` : 'Fontaine à boire',
        description: p.adresse ?? undefined,
        source_date: p.date_dernier_controle ?? undefined,
      }
    },
  },
  {
    code: 'bdx-wc',
    portal: 'opendata.bordeaux-metropole.fr',
    dataset: 'bor_sigsanitaire',
    attribution: 'Bordeaux Métropole',
    map(p) {
      return {
        categoryId: 'toilets',
        iconId: 'toilets',
        name: 'Toilettes publiques',
        description: [p.adresse, p.handi === 'OUI' ? 'Accès PMR' : null].filter(Boolean).join(' · '),
        source_date: (p.mdate ?? '').slice(0, 10) || undefined,
      }
    },
  },
  {
    code: 'tls-eau',
    portal: 'data.toulouse-metropole.fr',
    dataset: 'fontaines-a-boire',
    attribution: 'Toulouse Métropole',
    map(p) {
      return {
        categoryId: 'water',
        iconId: 'water',
        name: 'Fontaine à boire',
        description: [p.adresse, p.commune].filter(Boolean).join(', '),
      }
    },
  },
  {
    code: 'idfm-wc',
    portal: 'data.iledefrance-mobilites.fr',
    dataset: 'sanitaires-reseau-ratp',
    attribution: 'Île-de-France Mobilités',
    map(p) {
      if (p.accessible_au_public !== 'oui') return null
      return {
        categoryId: 'toilets',
        iconId: 'toilets',
        name: p.station ? `Toilettes — ${p.station}` : 'Toilettes (réseau RATP)',
        fee: p.tarif_gratuit_payant ?? undefined,
        description: [
          p.ligne ? `Ligne ${p.ligne}` : null,
          p.accessibilite_pmr === 'oui' ? 'Accès PMR' : null,
          p.localisation,
        ]
          .filter(Boolean)
          .join(' · '),
      }
    },
  },
]

function round6(v) {
  return Math.round(Number(v) * 1e6) / 1e6
}

/** Coordonnée d'une feature ODS : geometry Point, sinon geo_point_2d (MultiPoint Toulouse…). */
export function odsCoords(feature) {
  const g = feature.geometry
  if (g?.type === 'Point' && Array.isArray(g.coordinates)) return g.coordinates
  const p2 = feature.properties?.geo_point_2d
  if (p2 && Number.isFinite(p2.lon) && Number.isFinite(p2.lat)) return [p2.lon, p2.lat]
  if (g?.type === 'MultiPoint' && Array.isArray(g.coordinates?.[0])) return g.coordinates[0]
  return null
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
/** Le flux de 160 Mo peut casser en route : on collecte d'abord, on émet après. */
async function fetchDataInclusion() {
  const cat = await (await fetch(DI_DATASET, { headers: { Accept: 'application/json' } })).json()
  const url = await resolveDiServicesCsvUrl(cat)
  if (!url) throw new Error('ressource CSV services introuvable')
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error('HTTP ' + res.status)
  let header = null
  let noCoords = 0
  let scanned = 0
  const seenStructures = new Set()
  const features = []
  for await (const row of csvRows(res.body)) {
    if (!header) {
      header = row
      continue
    }
    scanned++
    const themIdx = header.indexOf('thematiques')
    if (!String(row[themIdx] ?? '').includes(DI_THEME)) continue
    const f = mapDiService(header, row)
    if (!f) {
      noCoords++
      continue
    }
    // Une structure peut porter plusieurs services alimentation : un point suffit.
    const sid = f.properties.structureId
    if (sid && seenStructures.has(sid)) continue
    if (sid) seenStructures.add(sid)
    delete f.properties.structureId
    features.push(f)
  }
  return { features, noCoords, scanned }
}

async function main() {
  let total = 0

  // 1. data·inclusion (aide alimentaire) — 3 tentatives (gros flux fragile).
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { features, noCoords, scanned } = await fetchDataInclusion()
      for (const f of features) stdout.write(JSON.stringify(f) + '\n')
      total += features.length
      stderr.write(
        `data·inclusion : ${features.length} points d'aide alimentaire (${noCoords} écartés sans coordonnées, ${scanned} services lus)\n`,
      )
      break
    } catch (e) {
      stderr.write(`! data·inclusion : tentative ${attempt}/3 échouée (${e.message})\n`)
      if (attempt < 3) await new Promise((r) => setTimeout(r, 10_000))
    }
  }

  // 2. Portails OpenDataSoft
  for (const src of ODS_SOURCES) {
    try {
      const url = `https://${src.portal}/api/explore/v2.1/catalog/datasets/${src.dataset}/exports/geojson`
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const fc = await res.json()
      let kept = 0
      let i = 0
      for (const feat of fc.features ?? []) {
        i++
        const coords = odsCoords(feat)
        if (!coords) continue
        const mapped = src.map(feat.properties ?? {})
        if (!mapped) continue
        const props = {
          id: `${src.code}-${feat.properties?.gid ?? feat.properties?.gml_id ?? feat.properties?.id ?? i}`,
          source: src.attribution,
          ...mapped,
        }
        for (const k of Object.keys(props)) if (props[k] === undefined || props[k] === '') delete props[k]
        stdout.write(
          JSON.stringify({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [round6(coords[0]), round6(coords[1])] },
            properties: props,
          }) + '\n',
        )
        kept++
        total++
      }
      stderr.write(`${src.code} : ${kept} points\n`)
    } catch (e) {
      stderr.write(`! ${src.code} : échec (${e.message})\n`)
    }
  }

  stderr.write(`TOTAL ${total} points sociaux\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
