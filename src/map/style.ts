import type { StyleSpecification } from 'maplibre-gl'

/** Centre par défaut : Narbonne [lon, lat] */
export const NARBONNE: [number, number] = [3.003, 43.184]

/**
 * Style MapLibre raster basé sur OpenTopoMap (courbes de niveau + relief,
 * sans clé API). L'attribution OpenTopoMap / OSM est OBLIGATOIRE.
 */
export const TOPO_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    opentopomap: {
      type: 'raster',
      // Un seul sous-domaine : indispensable pour que les tuiles téléchargées
      // hors-ligne soient retrouvées (la clé de cache inclut l'hôte).
      tiles: ['https://a.tile.opentopomap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 17,
      attribution:
        '© <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA) · données © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [
    {
      id: 'opentopomap',
      type: 'raster',
      source: 'opentopomap',
    },
  ],
}
