# Fusion des auberges OSM / DATAtourisme

La génération mensuelle des POI France/Espagne/Italie complète désormais les auberges OSM avec les fiches françaises de l'export officiel DATAtourisme. Aucun accès payant ni clé API supplémentaire.

## Sélection et rapprochement

- Catégories DATAtourisme `YouthHostelAndInternationalCenter`, `CollectiveHostel`, ou `CollectiveAccommodation` avec un nom explicitement « hostel » / « auberge de jeunesse ». Les hébergements collectifs génériques ne sont pas importés en masse.
- Coordonnées WGS84 finies, nom non vide, URI officielle distincte ; identifiant synthétique stable dérivé de l'URI.
- Recherche locale à 180 mètres maximum. L'identité exige un nom discriminant normalisé/alias, ou une combinaison adresse complète et nom/site, ou un site spécifique à l'établissement avec des indices concordants. À moins de 30 mètres, les extensions de nom sont également reconnues avec plusieurs mots distinctifs communs, ou avec un nom compatible et le même site. Les variantes linguistiques des URL et les adresses OSM `contact:*` sont normalisées. Un domaine de chaîne partagé ne suffit pas.
- Un point OSM déjà affiché garde son identifiant, ses coordonnées et ses champs renseignés. Les informations manquantes peuvent être complétées, les sources DATAtourisme sont conservées séparément.
- Les hôtels et autres hébergements OSM sont consultés comme contexte, sans être affichés en masse. Si un établissement identifié est classé différemment, une seule fiche auberge DATAtourisme est ajoutée à sa position, avec son identifiant synthétique (pas de signalement OSM sur une catégorie différente).
- Les doublons entre fiches DATAtourisme sont regroupés avec conservation des crédits de chaque producteur. Les correspondances multiples et les voisins à moins de 75 mètres sans identité fiable sont écartés de l'ajout et listés dans le rapport. Jusqu'à 180 mètres, les ressemblances de noms ou de sites insuffisantes pour prouver l'identité sont également mises en attente. Aucun rapprochement par proximité seule.

La détection est volontairement conservatrice : certains compléments attendent une vérification humaine. Elle ne garantit pas la correction de tous les doublons déjà présents dans OSM ou de coordonnées erronées dans les sources.

## Publication et maintenance

`scripts/process-osm.sh` télécharge l'export `datatourisme-place.csv` via l'API de métadonnées data.gouv.fr, puis appelle `scripts/merge-hostels.py` avant tippecanoe. Les ajouts et enrichissements sont directement dans `pois.pmtiles` : filtres, recherche du point proche et téléchargement hors ligne utilisent la même source.

Une indisponibilité de l'export, un schéma CSV incompatible ou l'absence inattendue de candidats fait échouer la génération avant publication ; les anciennes tuiles restent disponibles. Chaque génération repart des sources, sans accumulation des imports précédents. La liste mensuelle est actualisée ; l'absence d'une fiche dans un flux ne constitue pas à elle seule une preuve de fermeture.

Le workflow `build-pmtiles.yml` publie l'archive `hostel-merge-report` conservée 90 jours : compteurs, URI rapprochées, nouveaux points, voisins des cas ambigus et métadonnées du fichier source. Les tuiles sont ensuite envoyées sur R2 par le job séparé existant. Les utilisateurs ayant téléchargé une ancienne carte hors ligne doivent la retélécharger pour obtenir les nouveaux points.

Attribution générale dans la carte ; crédits par producteur, URI et dates dans chaque fiche, y compris quand plusieurs fiches ont été fusionnées. La date DATAtourisme reste une date de mise à jour, distincte d'une vérification terrain.

## Validation

`python -m unittest discover -s scripts -p 'test_*.py'` : changements de nom, adresses, domaines partagés, branches voisines, correspondances multiples, doublons DATAtourisme, champs OSM conservés, entrées invalides. Exécuté également en CI.

Tests React existants et tests des crédits/liens de la fiche ; compilation de production. Essai bout en bout sur les quatre périmètres de l'audit avec les données réelles : 54 points OSM conservés, 24 fiches candidates, 15 rapprochements, 8 ajouts, 1 cas ambigu écarté. Cet essai utilise les auberges OSM de l'audit ; la génération nationale consulte aussi les autres catégories d'hébergement avant de décider des ajouts.

L'export national du 12 octobre 2026 fournit 235 fiches candidates avant rapprochement. Ce nombre inclut des doublons potentiels et des centres de séjour, et ne représente pas 235 nouveaux points.
