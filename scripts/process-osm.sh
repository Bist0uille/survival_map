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
# -r1 : pas d'éclaircissement automatique au dézoom (sinon les points
#       disparaissent quand on dézoome — c'est ce qu'on veut éviter).
# -Z6..-z14 : visibles dès le zoom 6 (vues « plusieurs villes » couvertes).
# --drop-densest-as-needed --maximum-tile-bytes=2,5 Mo : on ne supprime des
#   points QUE si une tuile dépasse 2,5 Mo (zones ultra-denses uniquement) ;
#   les catégories éparses (boîtes à livres…) sont toujours conservées, et
#   les tuiles restent légères à charger sur mobile.
# Le poids total du fichier n'affecte pas le client : MapLibre ne télécharge
# que les tuiles visibles (requêtes HTTP range).
tippecanoe -o public/pois.pmtiles -l pois \
  -Z6 -z14 -r1 --drop-densest-as-needed --maximum-tile-bytes=2500000 --force \
  /tmp/input.geojsonseq

ls -lh public/pois.pmtiles

# ---------------------------------------------------------------------------
# Itinéraires balisés (relations route=hiking) -> public/routes.pmtiles
# ---------------------------------------------------------------------------
echo "→ Filtrage des itinéraires (relations route=hiking + membres)"
# Par défaut osmium tags-filter ajoute les objets référencés (ways + nodes)
# des relations -> géométrie complète pour l'assemblage.
osmium tags-filter "$PBF" r/route=hiking -o /tmp/routes.osm.pbf --overwrite

echo "→ Assemblage des géométries (GDAL/ogr2ogr, couche multilinestrings)"
# Le driver OSM de GDAL assemble chaque relation route en MultiLineString
# avec ses tags (name, type) + other_tags (ref, network, osmc:symbol…).
rm -f /tmp/routes.geojsonseq
OGR_INTERLEAVED_READING=YES ogr2ogr -f GeoJSONSeq /tmp/routes.geojsonseq \
  /tmp/routes.osm.pbf multilinestrings

echo "→ Transformation des itinéraires"
node scripts/osm-routes-to-input.mjs < /tmp/routes.geojsonseq > /tmp/routes-input.geojsonseq

echo "→ Construction de routes.pmtiles"
# -z13 (pas z14) : suffisant pour des lignes, et garde le fichier sous la
# limite GitHub de 100 Mo. MapLibre sur-zoome les tuiles z13 au-delà.
tippecanoe -o public/routes.pmtiles -l routes \
  -Z6 -z13 -r1 --drop-densest-as-needed --maximum-tile-bytes=2500000 --force \
  /tmp/routes-input.geojsonseq

ls -lh public/routes.pmtiles
