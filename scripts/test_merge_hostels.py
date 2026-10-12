import csv
import importlib.util
import json
import pathlib
import tempfile
import unittest
import subprocess
import sys

spec = importlib.util.spec_from_file_location('merge_hostels', pathlib.Path(__file__).with_name('merge-hostels.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def osm(name='Auberge Yves Robert', lon=2.36, lat=48.88, **props):
    return m.point(lon, lat, {'id': 'n1', 'categoryId': 'hostel', 'name': name, **props})


def dt(name='Auberge de jeunesse HI Paris Yves Robert', lon=2.36, lat=48.88, uri='one', **props):
    return m.point(lon, lat, {'id': 'dt:' + uri, 'name': name, 'categoryId': 'hostel',
                            'dt_uri': 'https://data.datatourisme.fr/' + uri,
                            'dt_updated': '2026-09-01', 'dt_producer': 'Office de tourisme', **props})


class MergeTests(unittest.TestCase):
    def test_same_place_keeps_osm_identity_geometry_and_fields(self):
        original = osm(website='https://original.example/', description='OSM description')
        original_geometry = original['geometry'].copy()
        additions, report = m.merge_candidates([dt(lon=2.3601, website='https://dt.example/', description='DT')], [original])
        self.assertEqual(additions, [])
        self.assertEqual(original['properties']['id'], 'n1')
        self.assertEqual(original['geometry'], original_geometry)
        self.assertEqual(original['properties']['website'], 'https://original.example/')
        self.assertEqual(original['properties']['description'], 'OSM description')
        self.assertEqual(len(report['merged']), 1)
        self.assertEqual(json.loads(original['properties']['dt_records'])[0]['producer'], 'Office de tourisme')

    def test_duplicate_dt_credits_preserved_on_one_point(self):
        additions, report = m.merge_candidates([dt(), dt(uri='two', dt_producer='Other producer')], [])
        self.assertEqual(len(additions), 1)
        self.assertEqual(len(report['dt_duplicates']), 1)
        self.assertEqual(len(json.loads(additions[0]['properties']['dt_records'])), 2)

    def test_distinct_neighbouring_mije_not_merged(self):
        original = osm(name='MIJE Fourcy', website='https://www.mije.com/')
        candidate = dt(name='Auberge MIJE Fauconnier', lon=2.3613, website='https://www.mije.com/')
        additions, report = m.merge_candidates([candidate], [original])
        self.assertEqual(len(additions), 1)
        self.assertEqual(report['merged'], [])

    def test_shared_chain_domain_not_identity(self):
        original = osm(name='The People Nation', website='https://thepeoplehostel.com/')
        additions, report = m.merge_candidates([dt(name='The People Belleville', website='https://thepeoplehostel.com/')], [original])
        self.assertEqual(additions, [])
        self.assertEqual(len(report['ambiguous']), 1)

    def test_unknown_neighbour_not_inserted(self):
        additions, report = m.merge_candidates([dt(name='Hostel20')], [osm(name='HI Rennes')])
        self.assertEqual(additions, [])
        self.assertEqual(len(report['ambiguous']), 1)

    def test_address_and_site_recognise_renamed_hostel(self):
        fields = {'addr:housenumber': '10', 'addr:street': 'canal Saint-Martin', 'website': 'https://hostel-rennes.com/'}
        additions, report = m.merge_candidates([dt(name='HI Rennes', **fields)], [osm(name='Hostel20', **fields)])
        self.assertEqual(additions, [])
        self.assertEqual(len(report['merged']), 1)

    def test_same_name_distant_branch_not_merged(self):
        additions, _ = m.merge_candidates([dt(lon=2.40)], [osm()])
        self.assertEqual(len(additions), 1)

    def test_two_identity_matches_quarantined(self):
        additions, report = m.merge_candidates([dt()], [osm(), osm(lon=2.3601, id='w2')])
        self.assertEqual(additions, [])
        self.assertEqual(report['ambiguous'][0]['reason'], 'multiple_identity_matches')

    def test_generic_name_not_sufficient(self):
        additions, report = m.merge_candidates([dt(name='Auberge de jeunesse')], [osm(name='Auberge de jeunesse')])
        self.assertEqual(additions, [])
        self.assertEqual(len(report['ambiguous']), 1)

    def test_other_osm_lodging_reuses_location_but_no_false_checkin_id(self):
        hotel = osm(name='Chouettes Hostel', categoryId='lodging-context')
        additions, _ = m.merge_candidates([dt(name='Les Chouettes Hostel', lon=2.3601)], [hotel])
        self.assertEqual(len(additions), 1)
        self.assertTrue(additions[0]['properties']['id'].startswith('dt:'))
        self.assertEqual(additions[0]['geometry'], hotel['geometry'])

    def test_fills_only_empty_fields(self):
        original = osm()
        m.merge_candidates([dt(description='Travel description', website='https://example.org')], [original])
        self.assertEqual(original['properties']['description'], 'Travel description')

    def test_csv_selection_validation_stable_ids_and_html(self):
        fields = ['Nom_du_POI', 'Categories_de_POI', 'Latitude', 'Longitude', 'URI_ID_du_POI', 'Date_de_mise_a_jour', 'Createur_de_la_donnee', 'Description']
        base = ['Chouettes Hostel', 'x#CollectiveAccommodation', '48.1', '-1.67', 'https://data.datatourisme.fr/one', '2026-09-01', 'Tourism', '<p>Welcome &amp; enjoy</p>']
        rows = [base, base, [*base[:2], 'nan', *base[3:]], ['Hostel Pub', 'x#Restaurant', *base[2:]], ['House', 'x#CollectiveAccommodation', *base[2:]]]
        with tempfile.TemporaryDirectory() as temp:
            path = pathlib.Path(temp)/'input.csv'
            with path.open('w', encoding='utf-8', newline='') as handle:
                writer = csv.writer(handle); writer.writerow(fields); writer.writerows(rows)
            records = m.dt_records(path)
            self.assertEqual(len(records), 1)
            self.assertEqual(records[0]['properties']['description'], 'Welcome & enjoy')
            self.assertEqual(records[0]['properties']['id'], m.dt_records(path)[0]['properties']['id'])

    def test_schema_change_fails_closed(self):
        with tempfile.TemporaryDirectory() as temp:
            path = pathlib.Path(temp)/'input.csv'
            path.write_text('unexpected\nvalue\n', encoding='utf-8')
            with self.assertRaises(ValueError):
                m.dt_records(path)

    def test_cli_preserves_other_pois_and_enriches_hostel(self):
        with tempfile.TemporaryDirectory() as temp:
            root = pathlib.Path(temp)
            csv_path = root/'dt.csv'
            fields = ['Nom_du_POI', 'Categories_de_POI', 'Latitude', 'Longitude', 'URI_ID_du_POI', 'Date_de_mise_a_jour', 'Createur_de_la_donnee']
            with csv_path.open('w', encoding='utf-8', newline='') as handle:
                writer = csv.writer(handle); writer.writerow(fields)
                writer.writerow(['Auberge Yves Robert', 'x#YouthHostelAndInternationalCenter', '48.88', '2.36', 'https://data.datatourisme.fr/test', '2026-09-01', 'Office'])
            context = m.point(2.36, 48.88, {'tourism': 'hostel', '@id': 'n1', 'name': 'Auberge Yves Robert'})
            (root/'context.jsonl').write_text(json.dumps(context)+'\n', encoding='utf-8')
            water = m.point(2.36, 48.88, {'id': 'n2', 'categoryId': 'water', 'name': 'Fontaine'})
            (root/'input.jsonl').write_text(json.dumps(osm())+'\n'+json.dumps(water)+'\n', encoding='utf-8')
            subprocess.run([sys.executable, str(pathlib.Path(m.__file__)), '--csv', str(csv_path),
                            '--osm-context', str(root/'context.jsonl'), '--input', str(root/'input.jsonl'),
                            '--output', str(root/'output.jsonl'), '--report', str(root/'report.json')], check=True, capture_output=True)
            output = list(m.features(root/'output.jsonl'))
            self.assertEqual(len(output), 2)
            self.assertEqual(output[1], water)
            self.assertEqual(output[0]['properties']['id'], 'n1')
            self.assertEqual(output[0]['properties']['dt_producer'], 'Office')


if __name__ == '__main__':
    unittest.main()
