# Référencement Survimap : eau en ville, voyage à vélo, randonnée et bivouac

## Livrables et méthode

`mots-cles.csv` contient les requêtes principales, variantes de longue traîne, recherches locales et recherches par itinéraire, regroupées avec une page cible et une priorité. C'est une base de travail française, pas la liste de toutes les recherches possibles. Les volumes, difficultés et positions ne sont pas mesurés : aucun accès à Keyword Planner ni aux performances Search Console n'a été utilisé.

Recherche exploratoire des résultats Google et vérification des fonctionnalités dans le code, octobre 2026. Les priorités P1 indiquent l'adéquation au produit, pas un volume élevé ou une facilité à se classer. Les variantes grammaticales, accents et fautes ne nécessitent pas chacune une page.

## Architecture publiée

| Page | Besoin principal | Action utile |
| --- | --- | --- |
| `/fontaines-eau-potable/` | Fontaine, point d'eau, remplissage de gourde en ville | Carte avec Eau |
| `/ravitaillement-velo/` | Eau et nourriture pendant un voyage à vélo | Carte avec Eau, Ravitaillement et Tables |
| `/randonnee-bivouac/` | Préparer plusieurs étapes à pied | Carte avec Eau, Abris, Ravitaillement, sentiers et espaces protégés |
| `/boulangeries-autour-de-moi/` | Trouver du pain et des commerces près de soi | Carte Ravitaillement ; les boulangeries ont un croissant |
| `/refuges-abris-randonnee/` | Comparer les lieux et préparer les étapes | Carte Abris, Eau et sentiers |
| `/carte-randonnee-hors-ligne/` | Préparer une carte avant une zone sans réseau | Carte et mode d'emploi du téléchargement |
| `/guides/` | Choisir son besoin | Accès aux six guides |

Chaque page contient du texte visible sans JavaScript, un titre et une description propres, une URL canonique, des métadonnées de partage, des données structurées WebPage/BreadcrumbList et des liens vers les autres guides. Le sitemap est généré à partir des mêmes données. Les liens vers la carte ne demandent pas automatiquement le GPS ; ils sélectionnent seulement les filtres.

Le terme « autour de moi » ne garantit pas un classement local : la localisation du chercheur et les résultats concurrents comptent. Les pages ne redirigent pas automatiquement ; elles répondent d'abord à la question, puis proposent une carte adaptée.

## Longue traîne locale et par parcours

Les villes et parcours du CSV sont des hypothèses éditoriales. Ils ne sont pas présentés comme des pages existantes ni comme une couverture exhaustive. Développer d'abord les endroits pour lesquels des données vérifiées et un contenu distinct sont disponibles : sélection de points réels, types et accès connus, provenance, date de vérification, carte centrée, informations pratiques et liens officiels.

Ne pas publier des centaines de pages identiques en remplaçant uniquement le nom de la ville. Ne pas inventer un nombre de fontaines, une ouverture de commerce, la potabilité ou une autorisation de bivouac. Les recherches incompatibles avec le produit sont explicitement exclues du CSV.

## Mesure et suite

1. Valider la propriété `survimap.com` dans Google Search Console avec le compte du propriétaire (preuve DNS ou autre méthode proposée). Ne jamais publier un jeton de compte ; seul le code de vérification prévu à cet effet peut être ajouté.
2. Soumettre `https://survimap.com/sitemap.xml`, puis inspecter l'accueil et les trois pages principales : exploration, canonique retenue, rendu et indexation. Aucune indexation n'est garantie ni immédiate.
3. Relever les impressions, clics, requêtes et pages sur des périodes comparables. Éviter de conclure à partir de quelques jours ; distinguer pays, appareils et saisonnalité.
4. Enrichir les pages correspondant aux requêtes réellement observées, puis décider des premières pages locales. Compléter les volumes avec Keyword Planner si disponible ; les estimations resteront des estimations.
5. Chercher des liens éditoriaux utiles auprès d'acteurs locaux, associations vélo et randonnée, avec leur accord. Aucun achat de liens, démarchage ni publication externe n'est effectué ici.

## Maintenance

Modifier `seo/content.mjs`, puis lancer `node scripts/build-seo.mjs` pour régénérer les pages, le sitemap et le CSV. La compilation exécute également cette génération. Les données personnelles et l'API ne sont pas nécessaires au rendu des guides.

Références : [Google : JavaScript et SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [contenu utile](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), [règles antispam](https://developers.google.com/search/docs/essentials/spam-policies), [sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
