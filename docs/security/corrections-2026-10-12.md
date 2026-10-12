# Corrections de sécurité — 12 octobre 2026

- Contributions : identifiants et coordonnées vérifiés auprès d'OpenStreetMap, requêtes JSON bornées, contrôle d'origine, quotas, dédoublonnage et écritures Redis atomiques.
- Un signalement isolé ne suffit plus à déclarer un lieu disparu. Deux contributeurs distincts sont nécessaires dans une fenêtre de sept jours.
- Stockage limité à 5 000 points, lecture paginée et rétention de 183 jours. Les anciens signalements non vérifiés restent dans leur ancien espace Redis et ne sont plus affichés.
- Import GPX limité à 5 Mo et 20 000 points, rejet des déclarations d'entités XML et coordonnées invalides.
- Liens externes contrôlés, en-têtes de sécurité et CSP, page de confidentialité avec suppression explicite des données personnelles locales.
- Dépendances mises à jour ; audit npm sans vulnérabilité connue au moment de la correction. Actions GitHub épinglées et secrets R2 isolés des étapes de compilation. Contrôles automatiques et mises à jour Dependabot ajoutés.

Validation locale : tests unitaires, compilation TypeScript et Vite, contrôle Chrome de la carte et du cône directionnel sans erreur JavaScript ni violation CSP. Les scripts Lua disposent de tests d'intégration sur Redis isolé dans GitHub Actions.

Limites : les contributions restent anonymes ; un quota par adresse IP ne prouve ni l'identité ni la présence sur place. L'accès aux fournisseurs de cartes et à OpenStreetMap reste nécessaire. Les réglages des comptes (MFA, permissions des jetons, alertes de facturation et sauvegardes) doivent être vérifiés dans les consoles des fournisseurs ; ils ne sont pas vérifiables dans ce dépôt.
