#!/usr/bin/env python3
"""Merge official DATAtourisme hostel records into the streamed OSM tile input.

No third-party dependencies. Ambiguous matches are reported and not inserted.
OSM geometry, identity and populated fields win; DT provenance is kept separately.
"""
import argparse
import csv
import hashlib
import html
import json
import math
import pathlib
import re
import unicodedata
import urllib.parse
import urllib.request

DATASET = 'https://www.data.gouv.fr/api/1/datasets/datatourisme-la-plateforme-nationale-des-donnees-touristiques/'
TYPES = {'YouthHostelAndInternationalCenter', 'CollectiveHostel'}
GENERIC = set('le la les l de des du d et and the by hotel hostel auberge jeunesse youth international centre sejour paris france hi mije'.split())


def normal(value):
    value = unicodedata.normalize('NFKD', value or '').lower()
    return ' '.join(re.sub(r'[^a-z0-9]+', ' ', ''.join(c for c in value if not unicodedata.combining(c))).split())


def words(name):
    return set(normal(name).split()) - GENERIC


def distance(a, b):
    lon1, lat1 = map(math.radians, a['geometry']['coordinates'])
    lon2, lat2 = map(math.radians, b['geometry']['coordinates'])
    h = math.sin((lat2-lat1)/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2
    return 6371000 * 2 * math.asin(min(1, math.sqrt(h)))


def website(value):
    try:
        url = urllib.parse.urlsplit(value)
        if url.scheme not in ('https', 'http') or not url.hostname or url.username or url.password:
            return ''
        return (url.hostname.lower().removeprefix('www.') + url.path.rstrip('/')).lower()
    except ValueError:
        return ''


def aliases(feature):
    p = feature['properties']
    return [name for k in ('name', 'alt_name', 'old_name', 'official_name', 'short_name', 'dt_names')
            for name in p.get(k, '').split(';') if name.strip()]


def score(a, b):
    """Require location AND identity; a shared chain domain alone is insufficient."""
    metres = distance(a, b)
    if metres > 180:
        return 0
    ap, bp = a['properties'], b['properties']
    exact = any(normal(x) == normal(y) and len(words(x)) > 0 for x in aliases(a) for y in aliases(b))
    token_match = any(words(x) and words(x) == words(y) for x in aliases(a) for y in aliases(b))
    # Same address only counts when both a house number and street are available.
    address = all(ap.get(k) and normal(ap[k]) == normal(bp.get(k, ''))
                  for k in ('addr:housenumber', 'addr:street'))
    url_a, url_b = website(ap.get('website', '')), website(bp.get('website', ''))
    same_url = bool(url_a and url_a == url_b)
    # Root domains can be shared by an entire hostel chain, even on adjacent sites.
    site_specific = same_url and '/' in url_a
    overlap = any(words(x) & words(y) for x in aliases(a) for y in aliases(b))
    if exact:
        return 100
    if token_match:
        return 95
    if address and (overlap or same_url):
        return 90
    if site_specific and (overlap or metres < 30):
        return 90
    return 0


def point(lon, lat, props):
    return {'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [lon, lat]}, 'properties': props}


def valid_position(lon, lat):
    # France metropolitan/overseas: finite WGS84, reject placeholder origin.
    return math.isfinite(lon) and math.isfinite(lat) and -180 <= lon <= 180 and -90 <= lat <= 90 and (lon, lat) != (0, 0)


def dt_records(path):
    records = []
    seen = set()
    with open(path, encoding='utf-8-sig', newline='') as handle:
        reader = csv.DictReader(handle)
        expected = {'Nom_du_POI', 'Categories_de_POI', 'Latitude', 'Longitude', 'URI_ID_du_POI', 'Date_de_mise_a_jour', 'Createur_de_la_donnee'}
        if not expected <= set(reader.fieldnames or []):
            raise ValueError('DATAtourisme CSV schema changed; refusing partial import')
        for row in reader:
            types = {t.rsplit('#', 1)[-1] for t in row['Categories_de_POI'].split('|')}
            name = row['Nom_du_POI'].strip()
            named = bool(re.search(r'\bhostel\b|auberge de jeunesse', name, re.I))
            if not (types & TYPES or ('CollectiveAccommodation' in types and named)):
                continue
            uri = row['URI_ID_du_POI']
            if not uri.startswith('https://data.datatourisme.fr/') or uri in seen or not name:
                continue
            try:
                lon, lat = float(row['Longitude']), float(row['Latitude'])
            except (TypeError, ValueError):
                continue
            if not valid_position(lon, lat):
                continue
            seen.add(uri)
            contacts = re.findall(r'https?://[^\s#|<>]+', row.get('Contacts_du_POI', ''))
            site = next((s for s in contacts if website(s)), '')
            address = row.get('Adresse_postale', '').strip()
            match = re.match(r'^(\d+\s*(?:bis|ter)?)[ ,]+(.+)', address, re.I)
            description = html.unescape(re.sub(r'<[^>]*>', ' ', row.get('Description', '')))
            props = {'id': 'dt:' + hashlib.sha256(uri.encode()).hexdigest()[:24],
                     'categoryId': 'hostel', 'iconId': 'hostel', 'name': name,
                     'source': 'DATAtourisme', 'source_date': row['Date_de_mise_a_jour'],
                     'dt_uri': uri, 'dt_producer': row['Createur_de_la_donnee'],
                     'dt_updated': row['Date_de_mise_a_jour'], 'website': site,
                     'address': address, 'description': ' '.join(description.split())[:1600]}
            if match:
                props.update({'addr:housenumber': match[1], 'addr:street': match[2]})
            records.append(point(lon, lat, props))
    if not records:
        raise ValueError('No hostel candidates in national export; refusing silent data loss')
    return sorted(records, key=lambda f: (f['properties']['dt_updated'], f['properties']['dt_uri']), reverse=True)


def provenance(target, incoming):
    p, q = target['properties'], incoming['properties']
    # Preserve all record-level credits and dates, including duplicate source records.
    credits = json.loads(p.get('dt_records', '[]'))
    for item in json.loads(q.get('dt_records', '[]')) or [{'uri': q['dt_uri'], 'producer': q['dt_producer'], 'updated': q['dt_updated']}]:
        if item not in credits:
            credits.append(item)
    p['dt_records'] = json.dumps(credits, ensure_ascii=False, separators=(',', ':'))
    if not p.get('dt_updated') or q['dt_updated'] > p['dt_updated']:
        for key in ('dt_uri', 'dt_producer', 'dt_updated'):
            p[key] = q[key]
    for key in ('website', 'description', 'address'):
        if not p.get(key) and q.get(key):
            p[key] = q[key]
    p['dt_names'] = '; '.join(dict.fromkeys([*p.get('dt_names', '').split('; '), q['name']])).strip('; ')


class Index:
    """Small spatial buckets: avoid national POI x hostel quadratic comparisons."""
    def __init__(self):
        self.cells = {}

    def add(self, feature):
        lon, lat = feature['geometry']['coordinates']
        self.cells.setdefault((math.floor(lon*200), math.floor(lat*200)), []).append(feature)

    def nearby(self, feature):
        lon, lat = feature['geometry']['coordinates']
        x, y = math.floor(lon*200), math.floor(lat*200)
        return [f for dx in range(-2, 3) for dy in range(-1, 2)
                for f in self.cells.get((x+dx, y+dy), []) if distance(feature, f) <= 180]


def merge_candidates(candidates, osm):
    index = Index()
    for f in osm:
        index.add(f)
    additions, report = [], {'merged': [], 'added': [], 'ambiguous': [], 'dt_duplicates': []}
    def ambiguous(candidate, reason, nearby):
        report['ambiguous'].append({
            'uri': candidate['properties']['dt_uri'], 'name': candidate['properties']['name'], 'reason': reason,
            'nearby': [{'id': f['properties']['id'], 'name': f['properties'].get('name', ''),
                        'distance_m': round(distance(candidate, f)), 'identity_score': score(candidate, f)} for f in nearby]})
    for candidate in candidates:
        nearby = index.nearby(candidate)
        matches = sorted([(score(candidate, f), f) for f in nearby if score(candidate, f)], key=lambda pair: -pair[0])
        ident = candidate['properties']['dt_uri']
        if matches:
            best_score, target = matches[0]
            if len(matches) > 1 and matches[1][0] >= best_score - 5:
                ambiguous(candidate, 'multiple_identity_matches', nearby)
                continue
            if target['properties'].get('categoryId') == 'hostel':
                provenance(target, candidate)
                key = 'dt_duplicates' if target['properties']['id'].startswith('dt:') else 'merged'
                report[key].append({'uri': ident, 'target': target['properties']['id']})
                continue
            # A known hotel or guesthouse can be a hostel too. Keep DT's synthetic
            # identity (no OSM check-in on the wrong category), use its location.
            candidate['geometry'] = target['geometry']
            candidate['properties']['related_osm_id'] = target['properties']['id']
        elif any(distance(candidate, f) < 75 for f in nearby):
            # Close but different identity: never guess, including neighbouring MIJEs.
            ambiguous(candidate, 'nearby_without_identity_match', nearby)
            continue
        provenance(candidate, candidate)
        additions.append(candidate)
        index.add(candidate)
        report['added'].append({'uri': ident, 'name': candidate['properties']['name'], 'id': candidate['properties']['id']})
    return additions, report


def features(path):
    with open(path, encoding='utf-8-sig') as handle:
        for line in handle:
            line = line.replace('\x1e', '').strip()
            if line:
                yield json.loads(line)


def osm_context(path):
    result = []
    for f in features(path):
        p = f.get('properties', {})
        if p.get('tourism') not in ('hostel', 'hotel', 'guest_house', 'apartment'):
            continue
        g = f.get('geometry') or {}
        coords = g.get('coordinates')
        if g.get('type') == 'Point':
            lon, lat = coords
        else:
            while coords and isinstance(coords[0][0], list):
                coords = coords[0]
            if not coords:
                continue
            lon, lat = [round(sum(c[i] for c in coords)/len(coords), 6) for i in (0, 1)]
        if not valid_position(lon, lat):
            continue
        props = dict(p)
        props['id'] = str(p.get('@id', f.get('id', '')))
        props['categoryId'] = 'hostel' if p['tourism'] == 'hostel' else 'lodging-context'
        props['website'] = p.get('website', p.get('contact:website', ''))
        result.append(point(lon, lat, props))
    return result


def download(path):
    def get(url):
        return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Survimap-hostel-import/1.0'}), timeout=120)
    with get(DATASET) as response:
        dataset = json.load(response)
    resource = next(r for r in dataset['resources'] if r['title'] == 'datatourisme-place.csv')
    url = resource['url']
    if urllib.parse.urlsplit(url).hostname != 'static.data.gouv.fr' or not url.startswith('https://'):
        raise ValueError('Unexpected DATAtourisme download host')
    temp = pathlib.Path(str(path) + '.part')
    with get(url) as response, temp.open('wb') as handle:
        size = 0
        while chunk := response.read(1024*1024):
            size += len(chunk)
            if size > 600*1024*1024:
                raise ValueError('Unexpected export size')
            handle.write(chunk)
    temp.replace(path)
    pathlib.Path(str(path) + '.metadata.json').write_text(json.dumps(resource, ensure_ascii=False, indent=2), encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--csv', required=True)
    parser.add_argument('--osm-context', required=True)
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--report', required=True)
    parser.add_argument('--download', action='store_true')
    args = parser.parse_args()
    if args.download:
        download(args.csv)
    candidates = dt_records(args.csv)
    context = osm_context(args.osm_context)
    # Enrich the same feature objects that will be emitted, using the canonical
    # OSM input properties while retaining full address/aliases for matching.
    hostels = {f['properties']['id']: f for f in context if f['properties']['categoryId'] == 'hostel'}
    for f in context:
        f['properties']['categoryId'] = 'lodging-context'
    for f in features(args.input):
        p = f['properties']
        if p['categoryId'] == 'hostel':
            if p['id'] not in hostels:
                raise ValueError('OSM context and tile input identities differ')
            hostels[p['id']]['properties'].update(p)
            hostels[p['id']]['geometry'] = f['geometry']
    additions, report = merge_candidates(candidates, context)
    count = 0
    with open(args.output, 'w', encoding='utf-8') as handle:
        for f in features(args.input):
            if f['properties']['categoryId'] == 'hostel':
                enriched = hostels[f['properties']['id']]['properties']
                for key in ('website', 'description', 'address', 'dt_uri', 'dt_producer', 'dt_updated', 'dt_records'):
                    if enriched.get(key):
                        f['properties'][key] = enriched[key]
            handle.write(json.dumps(f, ensure_ascii=False, separators=(',', ':')) + '\n')
            count += 1
        for f in additions:
            handle.write(json.dumps(f, ensure_ascii=False, separators=(',', ':')) + '\n')
    report['counts'] = {'osm_pois_preserved': count, 'candidates': len(candidates), **{k: len(v) for k, v in report.items()}}
    pathlib.Path(args.report).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report['counts']))


if __name__ == '__main__':
    main()
