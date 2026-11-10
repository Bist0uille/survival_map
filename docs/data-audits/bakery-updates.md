# Boulangeries : couverture, horaires et suivi

## Fonctionnement

- Une source principale : OpenStreetMap, importée par le pipeline PMTiles existant chaque lundi à 03:17 UTC. France, Espagne et Italie sont reconstruites ensemble ; les corrections et suppressions d'objets OSM passent au prochain import réussi.
- `osmium tags-filter nwr/shop=bakery` et l'export GeoJSON conservent les nœuds, chemins et aires, y compris les relations multipolygones. Un test exécute le convertisseur réel sur ces géométries. Le repli Aude utilise aussi `nwr`.
- Les horaires et `check_date:opening_hours` voyagent dans les tuiles pour le hors-ligne. À l'ouverture d'une boulangerie en ligne, la requête OSM déjà utilisée pour la fraîcheur récupère aussi les horaires actuels. Requête partagée et mise en cache pour la session, délai maximal de 6 secondes ; en cas d'échec, conservation des données téléchargées. Une réponse valide sans horaires retire les anciens horaires de la fiche.
- Affichage des horaires déclarés, ou « Horaires inconnus », sans calcul maison d'ouverture actuelle : jours fériés, expressions saisonnières et exceptions OSM exigeraient un interpréteur supplémentaire. Une modification de l'objet n'est pas présentée comme une vérification des horaires.
- « Corriger les infos » ouvre l'éditeur OSM sur l'objet exact (compte requis). Dans le menu « Plus », « Il manque une boulangerie ? » ouvre une note publique au centre de la carte : placer le repère et décrire le commerce. Le formulaire d'ajout de point personnel propose aussi ce lien à la position précise choisie pour une boulangerie. Aucun signalement n'est envoyé automatiquement.

## Publication et surveillance

`scripts/bakery-report.mjs` compte les identifiants OSM uniques `iconId=bakery` dans le flux réellement transmis au générateur de tuiles. Les épiceries et restaurants de la même catégorie générale sont exclus. Deux objets OSM peuvent toutefois représenter une même boutique ; les compteurs ne sont pas un recensement physique et couvrent FR/ES/IT ensemble. Ils ne garantissent pas non plus la visibilité de chaque objet à chaque zoom (réduction des tuiles ultra-denses par tippecanoe).

Avant tout remplacement des tuiles sur R2 :

- au moins 40 000 objets boulangerie sur le périmètre FR/ES/IT (la base auditée le 10 novembre 2026 en comptait 53 522) ;
- blocage si le nombre baisse de plus de 20 % par rapport au dernier rapport publié ;
- blocage si le nombre d'objets avec horaires baisse de plus de 30 % ;
- rapport précédent illisible ou indisponible : publication bloquée ; l'absence initiale (404) autorise l'amorçage ;
- configuration R2 incomplète : échec explicite, jamais un faux succès d'import.

Le rapport `bakery-status.json` est envoyé après les tuiles et contient la date de publication réussie. Un échec réseau pendant les uploads peut laisser une publication partielle : le journal du workflow reste la référence pour un import en échec. Les fichiers PMTiles sont remplacés individuellement par R2, pas dans une transaction multi-fichiers.

L'admin authentifié affiche les compteurs, la date et les alertes : import échoué/annulé, base de plus de dix jours, ou suivi indisponible. Il consulte le rapport R2 et l'API publique GitHub, sans jeton supplémentaire, avec un cache serveur de cinq minutes. Avant la première publication du rapport, il affiche la date réelle `Last-Modified` de la base existante et laisse les compteurs en attente. Les alertes dans l'admin et les échecs GitHub réutilisent les services existants ; aucun service d'envoi de mails n'a été ajouté.

Les sources professionnelles restent des outils de vérification ponctuelle : pas de collecte automatique ni de dépendance ajoutée à leurs annuaires.

## Vérification

`npm run test`, `node --test scripts/bakery-report.test.mjs`, `python -m unittest discover -s scripts -p 'test_*.py'`, `npm run build` et vérification Bash des scripts. Les tests Redis réels sont exécutés en CI avec le service Redis existant.
