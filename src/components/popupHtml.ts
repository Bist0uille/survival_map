import { getCategory } from '../data/categories'
import type { PersonalPoint } from '../types'

/** Échappe le HTML pour éviter toute injection depuis les tags OSM. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const INTERESTING_TAGS = [
  'ele',
  'opening_hours',
  'access',
  'fee',
  'drinking_water',
  'description',
  'operator',
]

/** "2024-03-12" (ou ISO complet) → "12/03/2024" ; valeur brute sinon. */
function frDate(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s
}

/**
 * Popup d'un POI à partir des propriétés (plates) d'une feature de la
 * couche — fonctionne pour une source GeoJSON comme pour les tuiles PMTiles.
 */
export function featurePopupHtml(
  props: Record<string, unknown> | null,
): string {
  const p = props ?? {}
  const categoryId = String(p.categoryId ?? '')
  const cat = getCategory(categoryId)
  const name = String(p.name ?? '') || cat.label
  const rows = INTERESTING_TAGS.filter((k) => p[k] != null && p[k] !== '')
    .map(
      (k) =>
        `<div class="text-slate-500"><b>${esc(k)}</b> : ${esc(String(p[k]))}</div>`,
    )
    .join('')
  // Fraîcheur : check_date/survey:date voyagent dans les tuiles (offline) ;
  // sinon un placeholder que MapView remplit en async via l'API OSM (en ligne).
  const checked = p.check_date ?? p['survey:date']
  const fresh = checked
    ? `<div class="text-slate-500" style="font-size:0.72rem;margin-top:4px">✓ Vérifié sur le terrain le ${esc(frDate(String(checked)))}</div>`
    : `<div data-freshness class="text-slate-400" style="font-size:0.72rem;margin-top:4px"></div>`
  return `
    <div style="min-width:140px">
      <div style="color:${cat.color};font-weight:600">${esc(name)}</div>
      <div class="text-slate-400" style="font-size:0.72rem;margin-bottom:4px">${esc(cat.label)}</div>
      ${rows}
      ${fresh}
    </div>`
}

export function personalPopupHtml(p: PersonalPoint): string {
  const cat = getCategory(p.categoryId)
  const title = p.customLabel ?? cat.label
  return `
    <div style="min-width:140px">
      <div style="color:${cat.color};font-weight:600">${esc(title)}</div>
      <div class="text-slate-400" style="font-size:0.72rem;margin-bottom:4px">Point perso</div>
      ${p.note ? `<div class="text-slate-500">${esc(p.note)}</div>` : ''}
      <button data-delete-id="${esc(p.id)}" style="margin-top:6px;color:#dc2626;font-size:0.75rem;text-decoration:underline">Supprimer</button>
    </div>`
}
