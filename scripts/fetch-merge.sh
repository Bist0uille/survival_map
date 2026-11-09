#!/usr/bin/env bash
# Télécharge plusieurs extraits OSM pays (Geofabrik), applique un filtre osmium
# à CHACUN puis supprime le gros .pbf avant le suivant (le runner CI gratuit
# n'a que ~14 Go de disque), et fusionne les .pbf filtrés en un seul.
#
# Usage : fetch-merge.sh OUTPUT.pbf "pays1 pays2 ..." <args osmium tags-filter>
#   ex. : fetch-merge.sh /tmp/paths.osm.pbf "france spain italy" \
#           w/highway=path,track,footway,bridleway,steps,via_ferrata,cycleway,pedestrian
#
# Les slugs pays correspondent à Geofabrik : europe/<pays>-latest.osm.pbf.
set -euo pipefail

OUT="$1"
COUNTRIES="$2"
shift 2 # le reste = arguments de osmium tags-filter

source "$(dirname "${BASH_SOURCE[0]}")/download-osm.sh"

filtered=()
for c in $COUNTRIES; do
  raw="/tmp/${c}.osm.pbf"
  out="/tmp/${c}.filtered.pbf"
  echo "→ [$c] téléchargement"
  download "$c" "$raw"
  test -s "$raw"
  echo "→ [$c] filtrage osmium"
  osmium tags-filter "$raw" "$@" -o "$out" --overwrite
  rm -f "$raw" # libère le disque avant le pays suivant
  filtered+=("$out")
done

echo "→ Fusion (${#filtered[@]} pays) → $OUT"
if [ "${#filtered[@]}" -eq 1 ]; then
  mv "${filtered[0]}" "$OUT"
else
  osmium merge "${filtered[@]}" -o "$OUT" --overwrite
  rm -f "${filtered[@]}"
fi
ls -lh "$OUT"
