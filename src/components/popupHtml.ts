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
  'description',
  'operator',
]

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
  return `
    <div style="min-width:140px">
      <div style="color:${cat.color};font-weight:600">${esc(name)}</div>
      <div class="text-slate-400" style="font-size:0.72rem;margin-bottom:4px">${esc(cat.label)}</div>
      ${rows}
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
