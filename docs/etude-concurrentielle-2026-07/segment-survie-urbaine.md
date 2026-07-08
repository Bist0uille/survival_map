# Segment survie urbaine / aide aux sans-abri — Soliguide, Entourage, Watizat, La Cloche…

Recherche menée le 8 juillet 2026. Aucune donnée scrapée ; licences et documentations publiques uniquement.

## 1. Soliguide (Solinum) — le référentiel dominant

**Qui.** Association Solinum (2017, Bordeaux), budget ~1,7 M€ (2022), financements publics (départements, CCAS, DDETS), fondations, fonds européens FEDER/Interreg. Déploiement par « franchise associative ».

**Couverture.** 7 départements en 2019 → 40+ territoires en 2024, objectif national 2026. **Couverture encore partielle**, dépendante des financeurs locaux.

**Cartographié.** Aide alimentaire, hygiène (douches, laveries), accueils de jour, santé, accompagnement, cours de français, insertion, médiation numérique. Le référentiel le plus complet de France — exactement le périmètre qui manque à OSM.

**UX.** Web + apps + **listes imprimables** (aveu que le tout-numérique ne suffit pas). Gratuit, **anonyme, sans compte**, 10 langues. **Pas de hors-ligne.** Utilisé massivement par les travailleurs sociaux.

**Fraîcheur.** Équipes locales salariées (~1 ETP par département), MAJ ≥ 2×/an, garantie « à jour à moins de 6 mois », guides saisonniers.

**Données.** **Pas d'open data** (position argumentée : crainte de copies obsolètes nuisibles). « API Solidarité » réservée aux structures publiques/assos **par convention** (interdiction de copies). Survimap n'y a pas droit en l'état. **Porte légale : data·inclusion** (service public numérique) publie chaque semaine sur data.gouv.fr **+100 000 structures / 140 000 services** sous **Licence Ouverte etalab-2.0** (réutilisation libre avec attribution) — inclut une partie des données Soliguide (celle conforme au schéma data·inclusion).

Sources : solinum.org · soliguide.fr · solinum.org/pourquoi-soliguide-nest-pas-en-opendata · data.gouv.fr (API Solidarité, référentiel data·inclusion) · data.inclusion.gouv.fr · Solidatech.

## 2. Entourage — réseau social, pas annuaire

Association (2014), ~200 000 membres. Sa « carte des lieux solidaires » est **alimentée par l'API Soliguide** (partenariat). Cœur produit : lien social, événements, entraide. **Compte obligatoire** (barrière forte pour le public cible), pas d'offline, communautés actives dans les grandes métropoles. Pas d'API.

Sources : entourage.social · solinum.org (partenariat) · Fondation Caritas.

## 3. Autres acteurs français

- **Watizat** — guide **papier/PDF mensuel** multilingue (FR/EN/AR/pashto/dari) pour personnes exilées : adresses + procédures. Paris, Lyon, Toulouse, Nantes, Oise. Le seul outil du segment qui « fonctionne hors-ligne »… parce qu'il est en papier. watizat.org
- **La Cloche / Le Carillon** — réseau de **+1 000 commerçants solidaires** (9 villes) offrant gratuitement : **remplir sa gourde, recharger son téléphone, toilettes**, café. Pictogrammes en vitrine. Fonctionnellement le décalque urbain des POI Survimap, mais données propriétaires sans API.
- **Reconnect (Groupe SOS)** — coffre-fort numérique pour documents administratifs (27 000 bénéficiaires) : la perte de papiers est un problème central du public.
- **Homeless Plus, We Save Homeless, app Samusocial** — géolocalisation des personnes/besoins pour bénévoles (éthiquement discuté, faible échelle). Contexte : ~10 % des demandes 115 satisfaites.
- **Open data municipal (réutilisable !)** — Paris publie sous **ODbL** : « Fontaines à boire » (~1 200 points) et « Sanisettes » (toilettes publiques), MAJ en continu. Équivalents dans d'autres métropoles. ODbL = même licence qu'OSM → directement intégrable. Guides solidarité municipaux en PDF (même logique que Watizat).

## 4. Inspirations internationales

- **Streetlives / YourPeer (NYC)** — plateforme web mobile-first pour jeunes sans-abri, **maintenue par des pairs ayant vécu la rue, MAJ quotidienne**, zéro donnée personnelle. Code open source MIT (github.com/streetlives/yourpeer.nyc), données non ouvertes. Leçon : la fraîcheur par les pairs-usagers.
- **Ask Izzy (Australie)** — annuaire national anonyme (350 000+ services). Innovation : **zero-rating négocié avec les opérateurs — accessible même sans crédit data**. Réponse structurelle au problème « pas de forfait » que l'offline résout autrement.

## 5. Vérification des hypothèses

- **« Les apps rando ignorent ce public » — VRAI** (aucune couche sociale chez AllTrails/Komoot/Visorando/IGN). Nuance : Organic Maps/OsmAnd affichent eau/toilettes/abris offline sans compte — concurrents indirects sur les POI physiques. Mais la donnée *sociale* (repas, douches) vit chez Soliguide, pas dans OSM (tags `social_facility` très peu renseignés en France).
- **« Les outils sociaux n'ont ni offline ni nature » — VRAI.** Le seul mode dégradé du secteur est le papier (trois acteurs impriment). Aucun ne couvre la nature.

## 6. Usage du smartphone à la rue (France)

Étude de référence : **« Précarité connectée » (Solinum, 2019** ; 300 personnes, 16 villes) :
- **91 %** ont un téléphone, **71 %** un smartphone, **55 %** se connectent chaque jour ;
- Problème n°1 : **la recharge** (53 % rechargent dans des structures sociales, sinon gares, bibliothèques, bars) ;
- **31 %** ont subi le vol d'un appareil ;
- Recommandations de l'étude : points de recharge, wifi, tarifs solidaires — pas « plus d'apps ».

## Gaps du segment

1. **Personne ne fait d'offline** — le vide technique est réel.
2. **Personne ne fait le pont urbain ↔ nature** — le profil « baroudeur précaire / vie en véhicule / marcheur au long cours » n'est servi par personne.
3. **Compte requis chez Entourage** ; Soliguide et Streetlives ont compris l'anonymat.
4. **La donnée sociale est enfermée** — brèche légale : **data·inclusion (etalab-2.0)** + **open data municipal (ODbL)** + OSM. Un agrégat offline de ces trois sources n'existe nulle part.
5. **Fraîcheur** : salariés (Soliguide, coûteux) ou pairs (Streetlives) — seules alternatives documentées.

## Évaluation honnête : l'offline sans compte aiderait-il vraiment les personnes SDF ?

**Oui, mais moins que l'intuition ne le suggère.**

- **Pour** : forfaits prépayés épuisés en fin de mois, wifi rare, batterie comptée — l'offline et la sobriété répondent à des contraintes documentées (cf. zero-rating Ask Izzy, impressions papier du secteur). Le public « baroudeur/van/marche au long cours » est totalement orphelin.
- **Contre** : (a) la donnée qui sauve une journée (repas de 12h, douche ouverte) est **horaire et périssable** — une carte offline avec des horaires faux fait perdre 2 h de marche à quelqu'un d'épuisé, c'est pire que rien ; (b) les POI OSM ne couvrent pas le cœur du besoin SDF (alimentation, hygiène, accueil) ; (c) la découverte passe par les travailleurs sociaux et les maraudes, pas par les stores ; (d) illectronisme et barrière de la langue (d'où les 10 langues de Soliguide).

**Position réaliste** : ne pas concurrencer Soliguide sur son terrain ; viser la **« survie mobile » offline** (baroudeurs, vie en véhicule, marcheurs précaires, saisonniers) en agrégeant légalement OSM + data·inclusion + open data municipaux, avec la date de fraîcheur affichée sur chaque lieu, et le réflexe assumé « vérifier en ligne quand on a du réseau » pour les horaires.
