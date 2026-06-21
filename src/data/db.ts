import Dexie, { type Table } from 'dexie'
import type { CacheEntry, PersonalPoint, PersonalRoute } from '../types'

/** Fichier volumineux stocké hors-ligne (ex. la base POI pmtiles). */
interface OfflineFile {
  key: string
  blob: Blob
  savedAt: number
}

class SurvivalDB extends Dexie {
  cachePois!: Table<CacheEntry, string>
  personalPoints!: Table<PersonalPoint, string>
  offline!: Table<OfflineFile, string>
  personalRoutes!: Table<PersonalRoute, string>

  constructor() {
    super('survival-map')
    this.version(1).stores({
      cachePois: 'key, fetchedAt',
      personalPoints: 'id, categoryId, createdAt',
    })
    this.version(2).stores({
      offline: 'key',
    })
    this.version(3).stores({
      personalRoutes: 'id, createdAt',
    })
  }
}

export const db = new SurvivalDB()

/** Un fichier hors-ligne (clé 'pois' ou 'routes') est-il présent ? */
export async function hasOfflineBlob(key: string): Promise<boolean> {
  const keys = await db.offline.toCollection().primaryKeys()
  return keys.includes(key)
}

export async function getOfflineBlob(key: string): Promise<Blob | null> {
  const rec = await db.offline.get(key)
  return rec?.blob ?? null
}

export async function saveOfflineBlob(key: string, blob: Blob): Promise<void> {
  await db.offline.put({ key, blob, savedAt: Date.now() })
}

/** TTL du cache Overpass : 24 h */
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export async function getCache(key: string): Promise<CacheEntry | undefined> {
  const entry = await db.cachePois.get(key)
  if (!entry) return undefined
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    await db.cachePois.delete(key)
    return undefined
  }
  return entry
}

export async function putCache(entry: CacheEntry): Promise<void> {
  await db.cachePois.put(entry)
}

export async function getPersonalPoints(): Promise<PersonalPoint[]> {
  return db.personalPoints.toArray()
}

export async function addPersonalPoint(point: PersonalPoint): Promise<void> {
  await db.personalPoints.put(point)
}

export async function deletePersonalPoint(id: string): Promise<void> {
  await db.personalPoints.delete(id)
}

export async function getPersonalRoutes(): Promise<PersonalRoute[]> {
  return db.personalRoutes.toArray()
}

export async function addPersonalRoute(route: PersonalRoute): Promise<void> {
  await db.personalRoutes.put(route)
}

export async function deletePersonalRoute(id: string): Promise<void> {
  await db.personalRoutes.delete(id)
}
