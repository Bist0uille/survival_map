import { getOfflineBlob, saveOfflineBlob } from './db'
import type { CheckinRecord, Verdict } from './checkinLogic'

/**
 * Client des check-ins anonymes. Les lectures passent par /api/checkins
 * (cache CDN 5 min) avec une copie locale (IndexedDB) pour le hors-ligne ;
 * l'écriture exige le réseau.
 */

const OFFLINE_KEY = 'checkins'

export type CheckinMap = Record<string, CheckinRecord>

/** Blob → texte, avec repli FileReader (vieux navigateurs, jsdom des tests). */
function blobText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') return blob.text()
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = () => reject(fr.error ?? new Error('lecture impossible'))
    fr.readAsText(blob)
  })
}

/** Tous les check-ins ; en échec réseau, la dernière copie locale ; sinon {}. */
export async function fetchAllCheckins(): Promise<CheckinMap> {
  try {
    const r = await fetch('/api/checkins')
    if (!r.ok) throw new Error(String(r.status))
    const data = (await r.json()) as CheckinMap
    // Copie hors-ligne (best-effort) pour afficher les badges sans réseau.
    saveOfflineBlob(OFFLINE_KEY, new Blob([JSON.stringify(data)])).catch(() => {})
    return data
  } catch {
    try {
      const blob = await getOfflineBlob(OFFLINE_KEY)
      if (!blob) return {}
      return JSON.parse(await blobText(blob)) as CheckinMap
    } catch {
      return {}
    }
  }
}

/** Poste un check-in ; renvoie l'enregistrement à jour. Lève en cas d'échec. */
export async function postCheckin(
  id: string,
  verdict: Verdict,
  lon: number,
  lat: number,
): Promise<CheckinRecord> {
  const r = await fetch('/api/checkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, verdict, lon, lat }),
  })
  if (r.status === 429) throw new Error('Trop de signalements pour le moment, réessaie plus tard')
  if (!r.ok) throw new Error('Signalement impossible pour le moment')
  const j = (await r.json()) as { record: CheckinRecord }
  return j.record
}
