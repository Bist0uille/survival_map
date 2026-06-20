import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Map as MLMap } from 'maplibre-gl'
import { CATEGORIES, CUSTOM_CATEGORY } from '../data/categories'

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
 * Enregistre dans la carte une image par catégorie (pastille colorée +
 * icône Lucide blanche), utilisée par la couche symbole des POI.
 */
export async function addCategoryIcons(map: MLMap): Promise<void> {
  for (const cat of [...CATEGORIES, CUSTOM_CATEGORY]) {
    if (map.hasImage(cat.id)) continue
    const iconMarkup = renderToStaticMarkup(
      createElement(cat.icon, {
        color: '#ffffff',
        strokeWidth: 2.5,
        width: 22,
        height: 22,
      }),
    )
    const url =
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(buildSvg(cat.color, iconMarkup))
    const img = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = SIZE * DPR
    canvas.height = SIZE * DPR
    const ctx = canvas.getContext('2d')
    if (!ctx) continue
    ctx.drawImage(img, 0, 0, SIZE * DPR, SIZE * DPR)
    const data = ctx.getImageData(0, 0, SIZE * DPR, SIZE * DPR)
    map.addImage(cat.id, data, { pixelRatio: DPR })
  }
}
