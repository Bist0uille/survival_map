# Segment nature / rando — AllTrails, Komoot, Visorando, Organic Maps, Refuges.info, OsmAnd

Recherche menée le 8 juillet 2026 (pages publiques uniquement).

## 1. AllTrails

**Positionnement.** Leader mondial grand public de la découverte d'itinéraires (450 000+ itinéraires). Cible : randonneurs occasionnels à réguliers, familles. Logique « catalogue d'itinéraires notés par la communauté », pas carte topo brute.

**Modèle économique.** Freemium à 3 niveaux depuis 2025 :
- Base (gratuit) : recherche d'itinéraires, avis/photos, navigation en ligne.
- **Plus : 35,99 €/an** : cartes hors-ligne (verrou principal), alertes de sortie d'itinéraire, aperçu 3D, Lifeline (partage d'itinéraire aux proches), cartes sur montre, impression PDF, filtres avancés.
- **Peak : 79,99 $/an** (2025) : itinéraires IA, heatmap communautaire, conditions temps réel.

**Compte.** De facto obligatoire pour utiliser réellement l'app. **Plateformes** : natives iOS/Android + web (consultation), pas de PWA offline.

**POI « survie ».** Faible : pas de couche eau/abris/toilettes ; l'info vit dans les descriptions d'itinéraires et les avis.

**Réputation UX.** Notes stores très élevées ; Trustpilot très critique (renouvellements auto, facturation après annulation, support injoignable) ; difficultés/temps d'itinéraires imprécis.

**À retenir.** Fiches avec photos + avis datés + conditions récentes (preuve sociale de fraîcheur) ; filtres riches ; onboarding « trouve une rando près de toi en 10 secondes » ; Lifeline comme argument sécurité.

Sources : alltrails.com/plans · communiqué Peak · weareexplorers.co · mapetiterando.fr · Trustpilot · uprootedtraveler.com · TechRadar.

## 2. Komoot

**Positionnement.** Planificateur vélo/rando européen, très fort en Allemagne, sync Garmin/Wahoo. Racheté ~300 M€ par **Bending Spoons en mars 2025**, ~85 % des salariés licenciés.

**Modèle économique.** Le plus verrouillé du panel :
- Gratuit : planificateur web + 1 région offline offerte.
- Map packs (~3,99 €/région, ~29,99 € monde) : plus achetables pour les nouveaux comptes depuis mars 2025.
- **Premium : 59,99 €/an** (voire 4,99 €/semaine sur mobile) : offline + navigation vocale, sync Garmin paywallée, multi-day planner, météo, live tracking.
- **Export GPX verrouillé** (région débloquée ou Premium requis) — friction célèbre.

**Compte.** Obligatoire pour l'essentiel. **Plateformes** : natives + planificateur web complet ; pas de PWA offline.

**POI « survie ».** Moyen : fontaines et refuges en « Highlights » communautaires ; pas de filtre systématique, pas de logique hors-itinéraire.

**Réputation UX.** Historiquement excellente ; depuis 2025 **backlash massif** (paywalls étendus, hausses, refonte contestée, exode d'utilisateurs).

**À retenir.** Highlights (POI photo + avis épinglés) ; planificateur drag-and-drop avec profil de surface/dénivelé ; Collections éditorialisées. Le backlash crée une demande explicite d'alternatives.

Sources : support.komoot.com · komoot.com/product · DC Rainmaker · BikeRadar · Cycling Weekly · bikepacking.com (« When We Get Komooted »).

## 3. Visorando

**Positionnement.** Le concurrent frontal français : ~29 000+ itinéraires **modérés par une équipe**, ~15 salariés (Alsace), 2,1 M de téléchargements. Cible : randonneur français grand public.

**Modèle économique.** Freemium : gratuit avec pub (consultation, fond OSM, enregistrement de trace) ; **Premium ~5,99 €/mois ou ~24,99 €/an** : cartes IGN 1:25 000 hors-ligne (verrou n°1), création avancée, import/export GPX complet, météo 7 jours, partage de position, sans pub.

**Compte.** Oui pour l'essentiel ; consultation web des fiches libre.

**POI « survie ».** Quasi nul en tant que couche (l'info vit dans le texte des fiches).

**Réputation UX.** Bonne (fiabilité des fiches modérées) ; critiques : batterie, perte d'état, alertes réseau intempestives, IGN offline payant.

**À retenir.** La **modération humaine** comme gage de confiance unique du panel ; fiches pas-à-pas imprimables ; prix agressif (moitié d'un Komoot).

Sources : visorando.com/en/premium.html · mapetiterando.fr · Clubic · justuseapp · Google Play.

## 4. Organic Maps

**Positionnement.** App de cartes **100 % offline, open source, privacy-first** (fork de Maps.me), 6 M+ d'installations. Le jumeau philosophique de Survimap.

**Modèle économique.** Entièrement gratuit, sans pub ni tracking, financé par dons (insuffisants selon le projet). Crise de gouvernance 2025 → fork communautaire **CoMaps** : l'écosystème se scinde.

**Compte.** Aucun. **Plateformes** : natives iOS/Android (+ desktop bêta) ; **pas de version web utilisable**.

**POI « survie ».** Bon par héritage OSM (eau, toilettes, abris affichés offline) mais **pas de filtres dédiés survie**, pas de prises, pas de météo, routing rando basique.

**Réputation UX.** Adorée des connaisseurs (léger, batterie, offline) ; critiques : recherche médiocre, POI pauvres, navigation rudimentaire.

**À retenir.** Téléchargement de cartes par région ultra-simple ; promesse « no account, no ads, no tracking » comme argument marketing central ; un modèle 100 % dons exige une gouvernance financière transparente.

Sources : organicmaps.app · GitHub · LWN (fork CoMaps) · It's FOSS · comaps.app · hikeforpurpose.com · Hacker News.

## 5. Refuges.info

**Positionnement.** Site associatif bénévole francophone, non commercial — **la** référence refuges non gardés, cabanes, abris et points d'eau en montagne (Alpes, Pyrénées, massifs).

**Modèle économique.** Gratuit, contributif, dons. Données **CC BY-SA 2.0** avec **API publique en lecture, sans clé** (multi-formats dont GPX).

**Compte.** Non pour consulter ; compte léger pour contribuer. **Plateformes** : web uniquement, pas de vrai offline.

**POI « survie ».** Excellent sur son créneau — refuges, cabanes, abris, points d'eau, avec **commentaires horodatés des passages** (« la source coulait le 12/06 »). Limité à la montagne, interface datée, pas de routing ni météo.

**À retenir.** Les fiches à commentaires datés = le meilleur modèle de fiabilité terrain du panel ; l'API ouverte est légalement intégrable à Survimap (attribution CC BY-SA).

Sources : refuges.info · refuges.info/api/doc · refuges.info/wiki/licence · Randonner Malin · refuges.yoandev.co.

## 6. OsmAnd (bref)

Le « couteau suisse » OSM offline pour power users. Freemium : gratuit limité à ~7 téléchargements de cartes ; Pro 2,99 €/mois ou 29,99 €/an ; version F-Droid intégralement gratuite. Pas de compte, natif uniquement. Tout OSM est là mais enfoui dans les menus. **UI notoirement rébarbative — l'anti-modèle UX** dont Survimap doit se différencier.

Sources : osmand.net/pricing · Backdrop Journal · GitHub discussions.

## Gaps du segment

1. **Le hors-ligne gratuit sur le web n'existe pas.** L'offline est LE verrou premium universel ; les seuls gratuits offline (Organic Maps, OsmAnd~) exigent une installation native. Aucune PWA carto offline gratuite sur le segment.
2. **La couche « survie » comme produit** : eau + abris + refuges + toilettes + prises en filtres de premier niveau — personne.
3. **La survie urbaine / le public précaire** : angle totalement absent, tous ciblent le loisir solvable.
4. **Zéro compte, zéro donnée** : seuls Organic Maps/OsmAnd, sans web ni couche survie.
5. **La fiabilité datée des POI** reste le maillon faible général ; le modèle refuges.info est la meilleure inspiration, et son API CC BY-SA est réutilisable.

Vigilance : la modération humaine (Visorando) et la preuve sociale (AllTrails) sont des signatures de confiance sans équivalent « sans compte » à ce jour ; la crise Organic Maps montre les limites du 100 % dons.
