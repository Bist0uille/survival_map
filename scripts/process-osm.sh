#!/usr/bin/env bash
# Filtre l'extrait OSM, le convertit, et construit public/pois.pmtiles.
# Appelé par le workflow CI. Les réglages de génération (zoom, densité…)
# se modifient ICI (script versionné) sans toucher au workflow.
set -euo pipefail

PBF="${1:-/tmp/france.osm.pbf}"

echo "→ Filtrage des POI (osmium)"
osmium tags-filter "$PBF" \
  nwr/amenity=drinking_water,fountain,toilets,charging_station,public_bookcase \
  nwr/leisure=picnic_table \
  nwr/tourism=picnic_site,viewpoint,alpine_hut,wilderness_hut \
  nwr/shop=bakery \
  nwr/natural=peak,rock,stone \
  nwr/waterway=waterfall \
  nwr/highway=rest_area \
  -o /tmp/filtered.osm.pbf --overwrite

echo "→ Export GeoJSONSeq"
osmium export /tmp/filtered.osm.pbf --add-unique-id=type_id \
  -f geojsonseq -o /tmp/filtered.geojsonseq --overwrite

echo "→ Transformation (catégories + centroïdes)"
node scripts/osm-to-pmtiles-input.mjs < /tmp/filtered.geojsonseq > /tmp/input.geojsonseq

echo "→ Construction du PMTiles"
mkdir -p public
# -r1 + --no-tile-size-limit : on GARDE TOUS LES POINTS (aucun éclaircissement)
# de z9 à z14, pour voir toute une région d'un coup. En dessous de z9
# (vue quasi nationale) la couche est vide, ce qui est voulu.
# Le poids total n'affecte pas le client : MapLibre ne charge que les
# tuiles visibles (requêtes HTTP range).
tippecanoe -o public/pois.pmtiles -l pois \
  -Z9 -z14 -r1 --no-tile-size-limit --force \
  /tmp/input.geojsonseq

ls -lh public/pois.pmtiles
