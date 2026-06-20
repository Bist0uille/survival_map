import type { Source, RangeResponse } from 'pmtiles'
import { saveOfflineBlob } from '../data/db'

/**
 * Source pmtiles qui lit les octets depuis un Blob local (téléchargé pour le
 * hors-ligne) s'il est présent, sinon via des requêtes range réseau.
 */
export class CachedPmtilesSource implements Source {
  private url: string
  private blob: Blob | null

  constructor(url: string, blob: Blob | null) {
    this.url = url
    this.blob = blob
  }

  getKey(): string {
    return this.url
  }

  async getBytes(offset: number, length: number): Promise<RangeResponse> {
    if (this.blob) {
      const data = await this.blob.slice(offset, offset + length).arrayBuffer()
      return { data }
    }
    const res = await fetch(this.url, {
      headers: { Range: `bytes=${offset}-${offset + length - 1}` },
    })
    return { data: await res.arrayBuffer() }
  }
}

/**
 * Télécharge tout le fichier pmtiles en streaming (progression) et le stocke
 * localement (Dexie). Renvoie le Blob.
 */
export async function downloadPmtiles(
  url: string,
  key: string,
  onProgress: (received: number, total: number) => void,
): Promise<Blob> {
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error('pmtiles HTTP ' + res.status)
  const total = Number(res.headers.get('content-length')) || 0
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
      received += value.length
      onProgress(received, total)
    }
  }
  const blob = new Blob(chunks as BlobPart[], {
    type: 'application/octet-stream',
  })
  await saveOfflineBlob(key, blob)
  return blob
}
