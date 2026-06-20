# Survival Map 🏕️

Mini web-app **PWA** pour préparer une rando et survivre en bivouac : carte topo (relief + courbes de niveau), points d'eau, abris, toilettes, prises, jolis spots… filtrés depuis OpenStreetMap **autour de toi**, plus tes **points perso**.

## Stack
- **Vite + React + TypeScript**
- **MapLibre GL JS** — fond raster **OpenTopoMap** (sans clé API)
- **Tailwind CSS** + **Lucide** icons
- **Dexie.js** (IndexedDB) — cache OSM + points perso, 100 % local
- **Overpass API** — données OSM autour de la position
- **vite-plugin-pwa** — manifest + service worker (offline des zones déjà visitées)

## Démarrage
```bash
npm install
npm run dev
```

La carte s'ouvre centrée sur **Narbonne**. Active des catégories dans la barre du haut, déplace la carte pour charger les points autour, et utilise le bouton **+** pour ajouter un point perso (ex. « prise fiable mairie »).

## Build
```bash
npm run build      # -> dist/
npm run preview
```

## Déploiement
Pensé pour **Vercel** : framework auto-détecté (Vite), build `npm run build`, sortie `dist/`.

## Catégories OSM
Eau (`drinking_water`, `fountain`), toilettes/abris (`toilets`, `shelter`), prises/tables (`charging_station`, `picnic_table`, `picnic_site`), boîtes à livres/cimetières, boulangerie, sommet, cascade, point de vue, rocher remarquable, refuges, aire de repos.

> Les prises électriques sont rares dans OSM : complète avec tes points perso.

## Limites & suite
- MVP local d'abord — pas de compte ni de backend.
- À venir : Supabase (sync multi-appareils), profil altimétrique d'une trace (GPX), offline étendu.
- Respecte les limites des instances Overpass publiques (cache + requêtes ciblées sur les catégories actives).
