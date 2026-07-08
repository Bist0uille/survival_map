/**
 * Logique pure du check-in anonyme (« ça existe toujours / n'existe plus »).
 * Partagée entre le client et les Vercel Functions (api/checkin*.ts) —
 * aucune dépendance, entièrement testable.
 */

export type Verdict = 'ok' | 'gone'

export interface CheckinRecord {
  ok: number // nombre total de confirmations
  gone: number // nombre total de signalements « disparu »
  lastOk: number | null // epoch ms de la dernière confirmation
  lastGone: number | null // epoch ms du dernier signalement disparu
  lon: number
  lat: number
}

/** confirmed = vert, stale = gris (vieux), gone = rouge. */
export type Freshness = 'confirmed' | 'stale' | 'gone'

export const SIX_MONTHS_MS = 183 * 24 * 60 * 60 * 1000

export interface CheckinBody {
  id: string
  verdict: Verdict
  lon: number
  lat: number
}

/** Valide le corps d'une requête POST /api/checkin. null si invalide. */
export function validateCheckinBody(b: unknown): CheckinBody | null {
  if (typeof b !== 'object' || b === null) return null
  const o = b as Record<string, unknown>
  const id = o.id
  const verdict = o.verdict
  const lon = o.lon
  const lat = o.lat
  if (typeof id !== 'string' || !/^[nwa]\d{1,12}$/.test(id)) return null
  if (verdict !== 'ok' && verdict !== 'gone') return null
  if (typeof lon !== 'number' || !Number.isFinite(lon) || lon < -180 || lon > 180) return null
  if (typeof lat !== 'number' || !Number.isFinite(lat) || lat < -85 || lat > 85) return null
  return { id, verdict, lon, lat }
}

/** Applique un check-in à un enregistrement (ou en crée un). */
export function applyCheckin(
  rec: CheckinRecord | null,
  verdict: Verdict,
  now: number,
  lon: number,
  lat: number,
): CheckinRecord {
  const base: CheckinRecord = rec ?? {
    ok: 0,
    gone: 0,
    lastOk: null,
    lastGone: null,
    lon,
    lat,
  }
  return {
    ...base,
    ok: base.ok + (verdict === 'ok' ? 1 : 0),
    gone: base.gone + (verdict === 'gone' ? 1 : 0),
    lastOk: verdict === 'ok' ? now : base.lastOk,
    lastGone: verdict === 'gone' ? now : base.lastGone,
    // On rafraîchit la position (utile si les tuiles bougent légèrement).
    lon,
    lat,
  }
}

/**
 * Fraîcheur d'un enregistrement : le dernier verdict l'emporte (une
 * confirmation postérieure à un « disparu » réhabilite le point) ; une
 * confirmation de moins de 6 mois est verte, plus ancienne grise.
 */
export function freshnessOf(rec: CheckinRecord, now: number): Freshness {
  if (rec.lastGone && rec.lastGone >= (rec.lastOk ?? 0)) return 'gone'
  if (rec.lastOk && now - rec.lastOk < SIX_MONTHS_MS) return 'confirmed'
  return 'stale'
}

/** « aujourd'hui », « il y a 3 j », « il y a 5 mois ». */
export function agoLabel(ts: number, now: number): string {
  const days = Math.floor((now - ts) / (24 * 60 * 60 * 1000))
  if (days <= 0) return "aujourd'hui"
  if (days < 60) return `il y a ${days} j`
  return `il y a ${Math.floor(days / 30)} mois`
}

/** Ligne d'état pour la fiche POI, ou null si aucun historique exploitable. */
export function freshnessLabel(rec: CheckinRecord, now: number): string | null {
  const f = freshnessOf(rec, now)
  if (f === 'gone' && rec.lastGone) return `⚠ Signalé disparu ${agoLabel(rec.lastGone, now)}`
  if (!rec.lastOk) return null
  const count = rec.ok > 1 ? ` (${rec.ok} confirmations)` : ''
  return f === 'confirmed'
    ? `✓ Confirmé ${agoLabel(rec.lastOk, now)}${count}`
    : `Confirmé ${agoLabel(rec.lastOk, now)}${count} — à revérifier`
}

/** FeatureCollection des badges de fraîcheur (cercles colorés sous les POI). */
export function checkinsToFC(
  all: Record<string, CheckinRecord>,
  now: number,
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: Object.entries(all).map(([id, rec]) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [rec.lon, rec.lat] },
      properties: { id, freshness: freshnessOf(rec, now) },
    })),
  }
}
