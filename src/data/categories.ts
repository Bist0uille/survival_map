import {
  Droplet,
  Toilet,
  Plug,
  Utensils,
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
    id: 'toilets',
    label: 'Toilettes',
    color: '#7c3aed',
    icon: Toilet,
    osm: [{ key: 'amenity', value: 'toilets' }],
  },
  {
    id: 'power',
    label: 'Prises',
    color: '#dc2626',
    icon: Plug,
    // Recharge téléphone/appareils + prises publiques. Les bornes voiture
    // (charging_station sans bicycle=yes) sont exclues, cf. categoryForTags.
    osm: [
      { key: 'amenity', value: 'device_charging_station' },
      { key: 'amenity', value: 'power_supply' },
      { key: 'power', value: 'outlet' },
    ],
  },
  {
    id: 'picnic',
    label: 'Tables',
    color: '#c2410c',
    icon: Utensils,
    osm: [
      { key: 'leisure', value: 'picnic_table' },
      { key: 'tourism', value: 'picnic_site' },
    ],
  },
  {
    id: 'books',
    label: 'Boîte à livres',
    color: '#0891b2',
    icon: BookOpen,
    osm: [{ key: 'amenity', value: 'public_bookcase' }],
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
  // Recharge : on exclut les bornes uniquement voiture. Une charging_station
  // n'est rangée dans « Prises » que si elle sert aux vélos (VAE).
  if (tags.amenity === 'charging_station') {
    return tags.bicycle === 'yes' || tags.bicycle === 'designated'
      ? getCategory('power')
      : null
  }
  for (const cat of CATEGORIES) {
    for (const t of cat.osm) {
      if (tags[t.key] === t.value) return cat
    }
  }
  return null
}
