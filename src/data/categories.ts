import {
  Droplet,
  Toilet,
  ShowerHead,
  Plug,
  Utensils,
  BookOpen,
  Croissant,
  ShoppingCart,
  Coffee,
  Mountain,
  Waves,
  Eye,
  Gem,
  Home,
  Tent,
  TentTree,
  TreePine,
  BedDouble,
  Cross,
  WashingMachine,
  MapPin,
  type LucideIcon,
} from 'lucide-react'
import type { OsmTag } from '../types'

/** Catégorie = unité de FILTRE (un bouton de la barre) + couleur. */
export interface CategoryDef {
  id: string
  label: string
  color: string
  icon: LucideIcon // icône représentative : chip de filtre + marqueur perso
}

/**
 * Sous-type = unité d'ICÔNE sur la carte. Plusieurs sous-types peuvent partager
 * une catégorie (donc un filtre et une couleur), avec des glyphes distincts :
 * ex. boulangerie 🥐 et supermarché 🛒 sont tous deux dans « Ravitaillement ».
 */
export interface SubtypeDef {
  iconId: string // pilote icon-image sur la carte
  categoryId: string // pilote le filtre + la couleur
  icon: LucideIcon
  osm: OsmTag[]
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'water', label: 'Eau', color: '#2563eb', icon: Droplet },
  { id: 'toilets', label: 'Sanitaires', color: '#7c3aed', icon: Toilet },
  { id: 'power', label: 'Prises', color: '#dc2626', icon: Plug },
  { id: 'picnic', label: 'Tables', color: '#c2410c', icon: Utensils },
  { id: 'books', label: 'Boîte à livres', color: '#0891b2', icon: BookOpen },
  { id: 'bakery', label: 'Ravitaillement', color: '#d97706', icon: ShoppingCart },
  { id: 'peak', label: 'Sommet', color: '#78716c', icon: Mountain },
  { id: 'waterfall', label: 'Cascade', color: '#0d9488', icon: Waves },
  { id: 'viewpoint', label: 'Point de vue', color: '#ca8a04', icon: Eye },
  { id: 'rock', label: 'Rocher remarquable', color: '#57534e', icon: Gem },
  { id: 'refuge', label: 'Couchage & abris', color: '#16a34a', icon: Home },
  { id: 'rest_area', label: 'Aire de repos', color: '#65a30d', icon: TreePine },
  { id: 'hostel', label: 'Auberge de jeunesse', color: '#4f46e5', icon: BedDouble },
  { id: 'pharmacy', label: 'Pharmacie', color: '#e11d48', icon: Cross },
  { id: 'laundry', label: 'Laverie', color: '#0284c7', icon: WashingMachine },
]

/** Catégorie générique pour les points perso sans correspondance */
export const CUSTOM_CATEGORY: CategoryDef = {
  id: 'custom',
  label: 'Point perso',
  color: '#db2777',
  icon: MapPin,
}

/**
 * Sous-types -> catégorie + tags OSM. À GARDER EN PHASE avec
 * scripts/osm-to-pmtiles-input.mjs (qui produit categoryId + iconId au build).
 */
export const SUBTYPES: SubtypeDef[] = [
  {
    iconId: 'water',
    categoryId: 'water',
    icon: Droplet,
    osm: [
      { key: 'amenity', value: 'drinking_water' },
      { key: 'amenity', value: 'fountain' },
      { key: 'natural', value: 'spring' },
      { key: 'amenity', value: 'water_point' },
      { key: 'man_made', value: 'water_tap' },
    ],
  },
  { iconId: 'toilets', categoryId: 'toilets', icon: Toilet, osm: [{ key: 'amenity', value: 'toilets' }] },
  { iconId: 'shower', categoryId: 'toilets', icon: ShowerHead, osm: [{ key: 'amenity', value: 'shower' }] },
  {
    iconId: 'power',
    categoryId: 'power',
    icon: Plug,
    osm: [
      { key: 'amenity', value: 'device_charging_station' },
      { key: 'amenity', value: 'power_supply' },
      { key: 'power', value: 'outlet' },
    ],
  },
  {
    iconId: 'picnic',
    categoryId: 'picnic',
    icon: Utensils,
    osm: [
      { key: 'leisure', value: 'picnic_table' },
      { key: 'tourism', value: 'picnic_site' },
    ],
  },
  { iconId: 'books', categoryId: 'books', icon: BookOpen, osm: [{ key: 'amenity', value: 'public_bookcase' }] },
  { iconId: 'bakery', categoryId: 'bakery', icon: Croissant, osm: [{ key: 'shop', value: 'bakery' }] },
  {
    iconId: 'grocery',
    categoryId: 'bakery',
    icon: ShoppingCart,
    osm: [
      { key: 'shop', value: 'supermarket' },
      { key: 'shop', value: 'convenience' },
      { key: 'shop', value: 'grocery' },
    ],
  },
  {
    iconId: 'food',
    categoryId: 'bakery',
    icon: Coffee,
    osm: [
      { key: 'amenity', value: 'cafe' },
      { key: 'amenity', value: 'restaurant' },
      { key: 'amenity', value: 'fast_food' },
    ],
  },
  { iconId: 'peak', categoryId: 'peak', icon: Mountain, osm: [{ key: 'natural', value: 'peak' }] },
  { iconId: 'waterfall', categoryId: 'waterfall', icon: Waves, osm: [{ key: 'waterway', value: 'waterfall' }] },
  { iconId: 'viewpoint', categoryId: 'viewpoint', icon: Eye, osm: [{ key: 'tourism', value: 'viewpoint' }] },
  {
    iconId: 'rock',
    categoryId: 'rock',
    icon: Gem,
    osm: [
      { key: 'natural', value: 'rock' },
      { key: 'natural', value: 'stone' },
    ],
  },
  {
    iconId: 'hut',
    categoryId: 'refuge',
    icon: Home,
    osm: [
      { key: 'tourism', value: 'alpine_hut' },
      { key: 'tourism', value: 'wilderness_hut' },
    ],
  },
  { iconId: 'camp', categoryId: 'refuge', icon: Tent, osm: [{ key: 'tourism', value: 'camp_site' }] },
  { iconId: 'shelter', categoryId: 'refuge', icon: TentTree, osm: [{ key: 'amenity', value: 'shelter' }] },
  { iconId: 'rest_area', categoryId: 'rest_area', icon: TreePine, osm: [{ key: 'highway', value: 'rest_area' }] },
  { iconId: 'hostel', categoryId: 'hostel', icon: BedDouble, osm: [{ key: 'tourism', value: 'hostel' }] },
  { iconId: 'pharmacy', categoryId: 'pharmacy', icon: Cross, osm: [{ key: 'amenity', value: 'pharmacy' }] },
  { iconId: 'laundry', categoryId: 'laundry', icon: WashingMachine, osm: [{ key: 'shop', value: 'laundry' }] },
]

const BY_ID: Record<string, CategoryDef> = Object.fromEntries(
  [...CATEGORIES, CUSTOM_CATEGORY].map((c) => [c.id, c]),
)

export function getCategory(id: string): CategoryDef {
  return BY_ID[id] ?? CUSTOM_CATEGORY
}

/**
 * Retrouve la catégorie correspondant à un jeu de tags OSM (pour le filtre).
 * Renvoie null si aucun tag connu (le POI est alors ignoré).
 */
export function categoryForTags(tags: Record<string, string>): CategoryDef | null {
  const sub = subtypeForTags(tags)
  return sub ? getCategory(sub.categoryId) : null
}

/** Sous-type (donc icône + catégorie) correspondant à un jeu de tags OSM. */
export function subtypeForTags(tags: Record<string, string>): SubtypeDef | null {
  // Recharge : on exclut les bornes uniquement voiture. Une charging_station
  // n'est rangée dans « Prises » que si elle sert aux vélos (VAE).
  if (tags.amenity === 'charging_station') {
    return tags.bicycle === 'yes' || tags.bicycle === 'designated'
      ? SUBTYPES.find((s) => s.iconId === 'power') ?? null
      : null
  }
  // amenity=shelter sert aussi aux abris de bus : on les écarte.
  if (tags.amenity === 'shelter' && tags.shelter_type === 'public_transport') return null
  for (const s of SUBTYPES) {
    for (const t of s.osm) {
      if (tags[t.key] === t.value) return s
    }
  }
  return null
}
