#!/usr/bin/env bash
# Filtre les extraits OSM (FR + ES + IT par défaut), les convertit, et construit
# /tmp/pois.pmtiles et /tmp/routes.pmtiles (uploadés sur R2 par le workflow —
# trop gros pour le repo à 3 pays). Les réglages de génération (zoom, densité…)
# se modifient ICI (script versionné) sans toucher au workflow.
#
# Usage : process-osm.sh ["france spain italy"]
#   La liste de pays peut aussi être passée via $COUNTRIES.
set -euo pipefail

COUNTRIES="${1:-${COUNTRIES:-france spain italy}}"

# URLs Geofabrik (+ miroir OSM-France pour la France).
geofabrik_urls() {
  case "$1" in
    france)
      echo "https://download.geofabrik.de/europe/france-latest.osm.pbf https://download.openstreetmap.fr/extracts/europe/france.osm.pbf"
      ;;
    *)
      echo "https://download.geofabrik.de/europe/$1-latest.osm.pbf"
      ;;
  esac
}
download() { # $1 = pays, $2 = sortie
  for u in $(geofabrik_urls "$1"); do
    echo "Essai : $u"
    if wget --tries=2 --read-timeout=60 --waitretry=20 -O "$2" "$u"; then return 0; fi
  done
  echo "Échec du téléchargement pour : $1" >&2
  return 1
}

# Pour chaque pays : un seul téléchargement, deux filtres (POI + itinéraires),
# puis suppression du gros .pbf avant le pays suivant (disque limité en CI).
poi_parts=()
route_parts=()
for c in $COUNTRIES; do
  raw="/tmp/${c}.osm.pbf"
  echo "=== [$c] téléchargement ==="
  download "$c" "$raw"
  test -s "$raw"

  echo "→ [$c] filtrage POI"
  # Prises : charging_station (filtré ensuite sur bicycle=yes pour exclure les
  # bornes voiture), device_charging_station (téléphone), power_supply, et
  # power=outlet (prises publiques).
  osmium tags-filter "$raw" \
    nwr/amenity=drinking_water,fountain,toilets,charging_station,device_charging_station,power_supply,public_bookcase \
    nwr/power=outlet \
    nwr/leisure=picnic_table \
    nwr/tourism=picnic_site,viewpoint,alpine_hut,wilderness_hut \
    nwr/shop=bakery \
    nwr/natural=peak,rock,stone \
    nwr/waterway=waterfall \
    nwr/highway=rest_area \
    -o "/tmp/${c}.poi.pbf" --overwrite
  poi_parts+=("/tmp/${c}.poi.pbf")

  echo "→ [$c] filtrage itinéraires (relations route=hiking + membres)"
  # osmium tags-filter ajoute par défaut les objets référencés (ways + nodes)
  # des relations -> géométrie complète pour l'assemblage.
  osmium tags-filter "$raw" r/route=hiking -o "/tmp/${c}.routes.pbf" --overwrite
  route_parts+=("/tmp/${c}.routes.pbf")

  rm -f "$raw" # libère le disque
done

merge_into() { # $1 = sortie, $@ (à partir de $2) = parties
  local out="$1"; shift
  if [ "$#" -eq 1 ]; then mv "$1" "$out"; else osmium merge "$@" -o "$out" --overwrite; rm -f "$@"; fi
}

echo "→ Fusion des POI filtrés"
merge_into /tmp/filtered.osm.pbf "${poi_parts[@]}"

echo "→ Export GeoJSONSeq (POI)"
osmium export /tmp/filtered.osm.pbf --add-unique-id=type_id \
  -f geojsonseq -o /tmp/filtered.geojsonseq --overwrite

echo "→ Transformation (catégories + centroïdes)"
node scripts/osm-to-pmtiles-input.mjs < /tmp/filtered.geojsonseq > /tmp/input.geojsonseq

echo "→ Construction de pois.pmtiles"
# -r1 : pas d'éclaircissement automatique au dézoom (sinon les points
#       disparaissent quand on dézoome — c'est ce qu'on veut éviter).
# -Z6..-z14 : visibles dès le zoom 6 (vues « plusieurs villes » couvertes).
# --drop-densest-as-needed --maximum-tile-bytes=2,5 Mo : on ne supprime des
#   points QUE si une tuile dépasse 2,5 Mo (zones ultra-denses uniquement).
# Le poids total du fichier n'affecte pas le client : MapLibre ne télécharge
# que les tuiles visibles (requêtes HTTP range).
tippecanoe -o /tmp/pois.pmtiles -l pois \
  -Z6 -z14 -r1 --drop-densest-as-needed --maximum-tile-bytes=2500000 --force \
  /tmp/input.geojsonseq
ls -lh /tmp/pois.pmtiles

# ---------------------------------------------------------------------------
# Itinéraires balisés (relations route=hiking) -> /tmp/routes.pmtiles
# ---------------------------------------------------------------------------
echo "→ Fusion des itinéraires filtrés"
merge_into /tmp/routes.osm.pbf "${route_parts[@]}"

echo "→ Assemblage des géométries (GDAL/ogr2ogr, couche multilinestrings)"
# Le driver OSM de GDAL assemble chaque relation route en MultiLineString
# avec ses tags (name, type) + other_tags (ref, network, osmc:symbol…).
rm -f /tmp/routes.geojsonseq
OGR_INTERLEAVED_READING=YES ogr2ogr -f GeoJSONSeq /tmp/routes.geojsonseq \
  /tmp/routes.osm.pbf multilinestrings

echo "→ Transformation des itinéraires"
node scripts/osm-routes-to-input.mjs < /tmp/routes.geojsonseq > /tmp/routes-input.geojsonseq

echo "→ Construction de routes.pmtiles"
# -z13 (pas z14) : suffisant pour des lignes. MapLibre sur-zoome au-delà.
tippecanoe -o /tmp/routes.pmtiles -l routes \
  -Z6 -z13 -r1 --drop-densest-as-needed --maximum-tile-bytes=2500000 --force \
  /tmp/routes-input.geojsonseq
ls -lh /tmp/routes.pmtiles
