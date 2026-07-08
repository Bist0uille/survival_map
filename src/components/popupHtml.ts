import { getCategory } from '../data/categories'
import { freshnessLabel, freshnessOf, type CheckinRecord } from '../data/checkinLogic'
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
  // Fraîcheur : données open data (props.source) → ligne source + date de mise
  // à jour ; données OSM → check_date des tuiles (offline) ou placeholder que
  // MapView remplit en async via l'API OSM (en ligne).
  const checked = p.check_date ?? p['survey:date']
  const fresh = p.source
    ? `<div class="text-slate-400" style="font-size:0.72rem;margin-top:4px">Donnée ${esc(String(p.source))}${p.source_date ? ' · mise à jour le ' + esc(frDate(String(p.source_date))) : ''}</div>`
    : checked
      ? `<div class="text-slate-500" style="font-size:0.72rem;margin-top:4px">✓ Vérifié sur le terrain le ${esc(frDate(String(checked)))}</div>`
      : `<div data-freshness class="text-slate-400" style="font-size:0.72rem;margin-top:4px"></div>`
  return `
    <div style="min-width:140px">
      <div style="color:${cat.color};font-weight:600">${esc(name)}</div>
      <div class="text-slate-400" style="font-size:0.72rem;margin-bottom:4px">${esc(cat.label)}</div>
      ${rows}
      ${fresh}
      <div data-refuges class="text-slate-500" style="font-size:0.72rem"></div>
    </div>`
}

/**
 * Section « check-in » de la fiche POI : état communautaire du point +
 * boutons de signalement (en ligne uniquement — l'écriture exige le réseau).
 * Les data-attributes sont gérés par le listener délégué de MapView.
 */
export function checkinSectionHtml(
  id: string,
  lon: number,
  lat: number,
  rec: CheckinRecord | null,
  now: number,
  online: boolean,
): string {
  if (!/^[nwa]\d+$/.test(id)) return '' // ids synthétiques : pas de check-in
  const label = rec ? freshnessLabel(rec, now) : null
  const color = rec && freshnessOf(rec, now) === 'gone' ? '#dc2626' : '#16a34a'
  const status = label
    ? `<div style="font-size:0.72rem;color:${color};font-weight:600">${esc(label)}</div>`
    : `<div class="text-slate-400" style="font-size:0.72rem">Personne n'a encore confirmé ce point</div>`
  const btn = (verdict: string, txt: string, clr: string) =>
    `<button data-checkin="${verdict}" data-checkin-id="${esc(id)}" data-checkin-ll="${lon},${lat}"
      style="flex:1;border:1px solid ${clr};color:${clr};border-radius:8px;padding:3px 6px;font-size:0.72rem;font-weight:600;background:white">${txt}</button>`
  const buttons = online
    ? `<div style="display:flex;gap:6px;margin-top:5px">${btn('ok', '✓ Ça existe', '#15803d')}${btn('gone', '✗ Disparu', '#b91c1c')}</div>`
    : ''
  return `<div style="margin-top:7px;border-top:1px solid #e2e8f0;padding-top:6px">${status}${buttons}</div>`
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
