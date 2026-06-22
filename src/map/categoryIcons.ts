import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Map as MLMap } from 'maplibre-gl'
import type { LucideIcon } from 'lucide-react'
import { CATEGORIES, CUSTOM_CATEGORY, SUBTYPES, getCategory } from '../data/categories'

const SIZE = 44 // taille logique de la pastille (px)
const DPR = 2 // rendu 2x pour rester net sur écrans HiDPI

function buildSvg(color: string, iconMarkup: string): string {
  const r = SIZE / 2 - 2
  // L'icône Lucide (22x22) est positionnée, centrée, dans la pastille.
  const icon = iconMarkup.replace(
    '<svg',
    `<svg x="${SIZE / 2 - 11}" y="${SIZE / 2 - 11}"`,
  )
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
    <circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${r}" fill="${color}" stroke="#ffffff" stroke-width="3"/>
    ${icon}
  </svg>`
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

/**
 * Enregistre dans la carte une image par SOUS-TYPE (glyphe fin : douche, WC,
 * croissant, caddie…) et par CATÉGORIE (repli pour les anciennes données /
 * marqueurs perso). La couche POI utilise `iconId` avec repli sur `categoryId`.
 * Pastille = couleur de la catégorie, glyphe = icône du sous-type.
 */
export async function addCategoryIcons(map: MLMap): Promise<void> {
  // Sous-types d'abord (glyphe précis), puis catégories en repli : si un id est
  // partagé (ex. « water »), c'est le sous-type qui prime.
  const entries: Array<{ id: string; color: string; icon: LucideIcon }> = [
    ...SUBTYPES.map((s) => ({ id: s.iconId, color: getCategory(s.categoryId).color, icon: s.icon })),
    ...[...CATEGORIES, CUSTOM_CATEGORY].map((c) => ({ id: c.id, color: c.color, icon: c.icon })),
  ]
  for (const e of entries) {
    if (map.hasImage(e.id)) continue
    const iconMarkup = renderToStaticMarkup(
      createElement(e.icon, {
        color: '#ffffff',
        strokeWidth: 2.5,
        width: 22,
        height: 22,
      }),
    )
    const url =
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(buildSvg(e.color, iconMarkup))
    const img = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = SIZE * DPR
    canvas.height = SIZE * DPR
    const ctx = canvas.getContext('2d')
    if (!ctx) continue
    ctx.drawImage(img, 0, 0, SIZE * DPR, SIZE * DPR)
    const data = ctx.getImageData(0, 0, SIZE * DPR, SIZE * DPR)
    map.addImage(e.id, data, { pixelRatio: DPR })
  }
}
