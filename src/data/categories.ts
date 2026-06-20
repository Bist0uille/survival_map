import {
  Droplet,
  Toilet,
  Plug,
  BookOpen,
  Croissant,
  Mountain,
  Waves,
  Eye,
  Gem,
  Home,
  TreePine,
  MapPin,
  type LucideIcon,
} from 'lucide-react'
import type { Category } from '../types'

export interface CategoryDef extends Category {
  icon: LucideIcon
}

/**
 * Définition déclarative des catégories : label, couleur (marqueur),
 * icône Lucide et combinaisons de tags OSM associées.
 */
export const CATEGORIES: CategoryDef[] = [
  {
    id: 'water',
    label: 'Eau',
    color: '#2563eb',
    icon: Droplet,
    osm: [
      { key: 'amenity', value: 'drinking_water' },
      { key: 'amenity', value: 'fountain' },
    ],
  },
  {
    id: 'toilets_shelter',
    label: 'Toilettes / Abris',
    color: '#7c3aed',
    icon: Toilet,
    osm: [
      { key: 'amenity', value: 'toilets' },
      { key: 'amenity', value: 'shelter' },
    ],
  },
  {
    id: 'power_picnic',
    label: 'Prises / Tables',
    color: '#dc2626',
    icon: Plug,
    osm: [
      { key: 'amenity', value: 'charging_station' },
      { key: 'leisure', value: 'picnic_table' },
      { key: 'tourism', value: 'picnic_site' },
    ],
  },
  {
    id: 'books_cemetery',
    label: 'Livres / Cimetières',
    color: '#0891b2',
    icon: BookOpen,
    osm: [
      { key: 'amenity', value: 'public_bookcase' },
      { key: 'landuse', value: 'cemetery' },
    ],
  },
  {
    id: 'bakery',
    label: 'Boulangerie',
    color: '#d97706',
    icon: Croissant,
    osm: [{ key: 'shop', value: 'bakery' }],
  },
  {
    id: 'peak',
    label: 'Sommet',
    color: '#78716c',
    icon: Mountain,
    osm: [{ key: 'natural', value: 'peak' }],
  },
  {
    id: 'waterfall',
    label: 'Cascade',
    color: '#0d9488',
    icon: Waves,
    osm: [{ key: 'waterway', value: 'waterfall' }],
  },
  {
    id: 'viewpoint',
    label: 'Point de vue',
    color: '#ca8a04',
    icon: Eye,
    osm: [{ key: 'tourism', value: 'viewpoint' }],
  },
  {
    id: 'rock',
    label: 'Rocher remarquable',
    color: '#57534e',
    icon: Gem,
    osm: [
      { key: 'natural', value: 'rock' },
      { key: 'natural', value: 'stone' },
    ],
  },
  {
    id: 'refuge',
    label: 'Refuges',
    color: '#16a34a',
    icon: Home,
    osm: [
      { key: 'tourism', value: 'alpine_hut' },
      { key: 'tourism', value: 'wilderness_hut' },
    ],
  },
  {
    id: 'rest_area',
    label: 'Aire de repos',
    color: '#65a30d',
    icon: TreePine,
    osm: [{ key: 'highway', value: 'rest_area' }],
  },
]

/** Catégorie générique pour les points perso sans correspondance */
export const CUSTOM_CATEGORY: CategoryDef = {
  id: 'custom',
  label: 'Point perso',
  color: '#db2777',
  icon: MapPin,
  osm: [],
}

const BY_ID: Record<string, CategoryDef> = Object.fromEntries(
  [...CATEGORIES, CUSTOM_CATEGORY].map((c) => [c.id, c]),
)

export function getCategory(id: string): CategoryDef {
  return BY_ID[id] ?? CUSTOM_CATEGORY
}

/**
 * Retrouve la catégorie correspondant à un jeu de tags OSM.
 * Renvoie null si aucun tag connu (le POI est alors ignoré).
 */
export function categoryForTags(tags: Record<string, string>): CategoryDef | null {
  for (const cat of CATEGORIES) {
    for (const t of cat.osm) {
      if (tags[t.key] === t.value) return cat
    }
  }
  return null
}
