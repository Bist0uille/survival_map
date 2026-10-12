"""Read-only comparison of public DATAtourisme exports and live OSM hostels."""
import csv
import json
import os
import pathlib
import urllib.parse
import urllib.request

ROOT = pathlib.Path(os.environ['TEMP']) / 'survimap-hostel-audit'
CITIES = {
    'Paris': ('idf', (48.815, 2.224, 48.902, 2.470)),
    'Rennes': ('bre', (48.070, -1.730, 48.155, -1.600)),
    'Toulouse': ('occ', (43.535, 1.350, 43.675, 1.520)),
    'Narbonne': ('occ', (43.140, 2.900, 43.220, 3.080)),
}

def inside(lat, lon, box):
    return box[0] <= lat <= box[2] and box[1] <= lon <= box[3]

def collect():
    statements = ''.join(f'nwr["tourism"~"^(hostel|hotel|guest_house|apartment)$"]({",".join(map(str, box))});'
                         for _, box in CITIES.values())
    query = '[out:json][timeout:60];(' + statements + ');out meta center;'
    request = urllib.request.Request(
        'https://overpass-api.de/api/interpreter',
        data=urllib.parse.urlencode({'data': query}).encode(),
        headers={'User-Agent': 'Survimap-data-quality-audit/1.0'})
    with urllib.request.urlopen(request, timeout=90) as response:
        data = response.read()
    (ROOT / 'osm.json').write_bytes(data)

def analyse():
    osm = json.loads((ROOT / 'osm.json').read_text(encoding='utf-8'))
    result = {'osm_timestamp': osm.get('osm3s', {}).get('timestamp_osm_base'), 'cities': {}}
    for city, (region, box) in CITIES.items():
        dt = []
        with (ROOT / f'datatourisme-reg-{region}.csv').open(encoding='utf-8-sig', newline='') as file:
            for row in csv.DictReader(file):
                try:
                    lat, lon = float(row['Latitude']), float(row['Longitude'])
                except (ValueError, TypeError):
                    continue
                if not inside(lat, lon, box):
                    continue
                strict = any(t.rsplit('#', 1)[-1] in ('YouthHostelAndInternationalCenter', 'CollectiveHostel')
                             for t in row['Categories_de_POI'].split('|'))
                candidate = any(word in row['Nom_du_POI'].lower() for word in ('hostel', 'auberge de jeunesse'))
                if strict or candidate:
                    dt.append({'name': row['Nom_du_POI'], 'strict': strict, 'lat': lat, 'lon': lon,
                               'updated': row['Date_de_mise_a_jour'], 'producer': row['Createur_de_la_donnee'],
                               'contacts': row['Contacts_du_POI'], 'description': row['Description'],
                               'types': row['Categories_de_POI'], 'url': row['URI_ID_du_POI']})
        points = []
        for element in osm['elements']:
            pos = element.get('center', element)
            if element['tags'].get('tourism') == 'hostel' and inside(pos['lat'], pos['lon'], box):
                points.append({'id': f"{element['type']}/{element['id']}",
                               'lat': pos['lat'], 'lon': pos['lon'],
                               'edited': element.get('timestamp'), 'tags': element['tags']})
        result['cities'][city] = {'bbox': box, 'datatourisme': dt, 'osm': points}
    target = pathlib.Path(__file__).parent / 'hostels-2026-10-12.json'
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    for city, sources in result['cities'].items():
        print(city, 'DATAtourisme:', len([x for x in sources['datatourisme'] if x['strict']]),
              'name candidates:', len([x for x in sources['datatourisme'] if not x['strict']]),
              'OSM objects:', len(sources['osm']))
        for item in sources['datatourisme']:
            print(' DT', item['name'], item['updated'], 'strict=', item['strict'])
        for item in sources['osm']:
            print(' OSM', item['id'], item['tags'].get('name'), item['edited'])

if __name__ == '__main__':
    import sys
    if '--collect' in sys.argv:
        collect()
    analyse()
