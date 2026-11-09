#!/usr/bin/env bash
# Sourced by the two national OSM pipelines. Each mirror starts independently;
# partial bytes from different snapshots must never be combined.
geofabrik_urls() {
  case "$1" in
    france) echo "https://download.geofabrik.de/europe/france-latest.osm.pbf https://download.openstreetmap.fr/extracts/europe/france.osm.pbf" ;;
    *) echo "https://download.geofabrik.de/europe/$1-latest.osm.pbf" ;;
  esac
}

download() {
  local country="$1" target="$2" candidate url
  candidate="${target}.download"
  for url in $(geofabrik_urls "$country"); do
    echo "Téléchargement : $url"
    # Only our temporary file and its aria2 control file, never a directory.
    rm -f -- "$candidate" "${candidate}.aria2"
    if timeout --signal=TERM --kill-after=30s 90m aria2c \
      --max-connection-per-server=4 --split=4 --min-split-size=16M \
      --connect-timeout=30 --timeout=60 --max-tries=3 --retry-wait=15 \
      --lowest-speed-limit=64K --file-allocation=none \
      --allow-overwrite=true --auto-file-renaming=false --continue=true \
      --summary-interval=60 --console-log-level=warn \
      --dir="$(dirname "$candidate")" --out="$(basename "$candidate")" "$url"; then
      if test -s "$candidate" && osmium fileinfo -F pbf "$candidate" >/dev/null; then
        mv -- "$candidate" "$target"
        return 0
      fi
      echo "Fichier vide ou PBF invalide, essai du miroir suivant." >&2
    fi
  done
  rm -f -- "$candidate" "${candidate}.aria2"
  echo "Échec du téléchargement pour : $country" >&2
  return 1
}
