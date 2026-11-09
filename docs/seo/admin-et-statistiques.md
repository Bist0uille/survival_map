# Administration et compteurs sans cookie

Page : https://survimap.com/admin/ (ou /admin). Mise à jour : 9 novembre 2026.

## Variables Vercel

Dans le projet existant survival-map-rando, Settings → Environment Variables, environnement Production :

- ADMIN_PASSWORD : mot de passe unique de 24 à 256 caractères, gardé uniquement par le propriétaire.
- ANALYTICS_ENABLED : true (une seule variable, nom exact en majuscules ; pas deux variables ANALYTICS et ENABLE).
- KV_REST_API_URL et KV_REST_API_TOKEN : connexion Upstash existante. Les variantes UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN sont aussi prises en charge.

Les variables ne prennent effet qu’après un déploiement. Ne jamais les préfixer par VITE_. Ne pas publier de secrets dans Git ou dans une URL.

## Authentification sans cookie

Le mot de passe est vérifié côté serveur avec limitation à dix tentatives par empreinte IP et fenêtre de quinze minutes dans Redis. Un jeton signé est renvoyé puis envoyé dans l’en-tête Authorization. Il reste uniquement en mémoire dans l’onglet : aucun cookie, localStorage ou sessionStorage. Recharger ou fermer la page nécessite une nouvelle connexion ; le jeton expire au maximum après huit heures. Changer ADMIN_PASSWORD invalide les anciens jetons. Se déconnecter efface le jeton de la mémoire ; un jeton déjà dérobé reste valable jusqu’à expiration ou rotation du mot de passe.

Toutes les statistiques sont protégées par l’API. Le HTML de connexion et ses CSS/JS sont publics, ne contiennent aucune statistique privée et sont exclus du précache PWA. L’API admin n’est pas mise en cache. noindex complète l’authentification sans la remplacer.

## Compteurs du site

Le suivi n’utilise aucun cookie, identifiant visiteur, stockage navigateur ou empreinte d’appareil. Chaque ouverture visible de page ajoute une visite de page. Une actualisation, un autre onglet ou une navigation entre deux guides compte à nouveau. Il est impossible d’en déduire un nombre exact de personnes uniques.

Le temps visible est envoyé par petits intervalles de quinze secondes, avec envoi du reliquat quand l’onglet devient caché ou quitte la page. Les intervalles cachés sont exclus ; les longues suspensions sont plafonnées. Ce temps estime la visibilité de l’onglet, pas l’attention. Des onglets multiples, des erreurs réseau ou la fermeture du navigateur peuvent fausser la moyenne. Le suivi ne reconstitue pas un parcours entre pages et ne conserve pas de session visiteur.

Sont aussi comptés les provenances générales de pages vues et des événements fixes sur la carte : fiche ouverte, filtre changé, création/enregistrement d’itinéraire, import GPX, téléchargement hors ligne. Aucune URL référente complète, recherche, coordonnée GPS, trace, nom de fichier ou identifiant POI n’est transmis. Les visites du propriétaire sur la carte sont comptées comme les autres ; la page admin n’est pas suivie.

Do Not Track et Global Privacy Control empêchent l’envoi. Il n’y a ni bandeau ni choix à conserver dans le navigateur. Les compteurs sont agrégés par jour UTC pendant 183 jours (namespace analytics:v2, distinct du prototype avec consentement). Le quota anti-abus utilise une empreinte HMAC IP renouvelée chaque minute et expirant en 60 secondes : maximum 120 événements/minute par connexion et 3 000 au total. Cette empreinte n’est pas utilisée pour identifier les visiteurs.

## Google Search Console (facultatif)

Le repère initial issu des captures du propriétaire reste visible dans l’admin : 2 clics, 135 impressions, CTR 1,5 %, position moyenne 16,1, fenêtre affichée « 3 mois ». Il est daté et identifié comme manuel, sans fausse courbe historique.

Pour synchroniser : activer Google Search Console API dans Google Cloud, créer un compte de service dédié et une clé JSON, ajouter son client_email dans les utilisateurs de la propriété Search Console avec les droits minimaux de lecture des performances. Ajouter côté serveur GOOGLE_CLIENT_EMAIL et GOOGLE_PRIVATE_KEY, puis GOOGLE_SEARCH_CONSOLE_PROPERTY=sc-domain:survimap.com (ou le préfixe URL exact de la propriété). Redéployer. Ne jamais donner la clé au code navigateur, à Git ou au chat.

L’accès utilise webmasters.readonly. Les données Google excluent les trois derniers jours pour leur finalisation et renvoient les totaux séparément des cent premières requêtes et pages. Les requêtes peuvent être anonymisées ou tronquées par Google. Les jours Google et les jours UTC du compteur ne coïncident pas toujours.

Références : https://developers.google.com/webmaster-tools/v1/searchanalytics/query et https://developers.google.com/identity/protocols/oauth2/service-account.

## Validation

npm run build : génération SEO, TypeScript, build et vérification du worker de carte.
npm test : accès anonyme refusé, sessions signées, expiration, quotas, en-tête Bearer sans cookie, champs autorisés, absence de stockage navigateur et temps visible hors onglets cachés.
