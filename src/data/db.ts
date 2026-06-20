import Dexie, { type Table } from 'dexie'
import type { CacheEntry, PersonalPoint } from '../types'

class SurvivalDB extends Dexie {
  cachePois!: Table<CacheEntry, string>
  personalPoints!: Table<PersonalPoint, string>

  constructor() {
    super('survival-map')
    this.version(1).stores({
      cachePois: 'key, fetchedAt',
      personalPoints: 'id, categoryId, createdAt',
    })
  }
}

export const db = new SurvivalDB()

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
