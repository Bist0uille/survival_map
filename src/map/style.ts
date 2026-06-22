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
    // Imagerie satellite Esri World Imagery (sans clé). En ligne uniquement :
    // ces tuiles ne font pas partie du cache hors-ligne (qui ne couvre que la
    // topo). Attribution Esri/Maxar obligatoire.
    satellite: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        'Imagerie © <a href="https://www.esri.com">Esri</a>, Maxar, Earthstar Geographics',
    },
    // Modèle numérique de terrain (relief 3D) : AWS Terrain Tiles, encodage
    // terrarium, sans clé. En ligne uniquement.
    'terrain-dem': {
      type: 'raster-dem',
      tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 15,
      encoding: 'terrarium',
      attribution: 'Relief © <a href="https://registry.opendata.aws/terrain-tiles/">AWS Terrain Tiles</a>',
    },
  },
  layers: [
    {
      id: 'opentopomap',
      type: 'raster',
      source: 'opentopomap',
    },
    // Satellite juste au-dessus de la topo (donc sous les POI/itinéraires) :
    // masqué par défaut, recouvre la topo quand activé.
    {
      id: 'satellite',
      type: 'raster',
      source: 'satellite',
      layout: { visibility: 'none' },
    },
  ],
}
