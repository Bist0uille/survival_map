// Source éditoriale des pages publiques et du plan de mots-clés.
// Les requêtes sont des cibles proposées, pas des volumes mesurés.
export const pages = [
  {
    slug: 'fontaines-eau-potable', audience: 'Eau en ville',
    title: 'Fontaines et points d’eau autour de moi | Survimap',
    description: 'Repérez les fontaines et points d’eau sur la carte Survimap. Cherchez une ville ou utilisez votre position pour préparer un remplissage de gourde.',
    heading: 'Trouver une fontaine et un point d’eau autour de vous',
    intro: 'Une gourde vide pendant une promenade, un trajet à vélo ou une journée en ville ? Survimap permet de repérer les points d’eau cartographiés, puis de consulter leur fiche avant de vous déplacer. La carte est gratuite et accessible sans compte.',
    map: '/?filters=water', cta: 'Voir les points d’eau sur la carte',
    steps: ['Ouvrez la carte avec le filtre Eau déjà sélectionné.', 'Cherchez une ville ou une adresse. Pour explorer votre quartier actuel, activez le GPS avec le bouton de localisation et autorisez-le dans votre navigateur.', 'Zoomez et touchez un point pour lire les informations disponibles. Vérifiez la potabilité indiquée et la signalétique sur place.'],
    sections: [
      ['Fontaine publique, robinet ou source : que montre la carte ?', 'Le filtre Eau rassemble plusieurs types de points : fontaines, robinets, sources et points de remplissage renseignés dans les données cartographiques. Une fontaine décorative ou une source n’est pas automatiquement potable. Consultez les indications de la fiche et ne déduisez pas la qualité de l’eau de la seule présence d’un symbole.'],
      ['Où remplir sa gourde en ville ?', 'Cherchez votre destination avant de partir, puis explorez les points signalés près des parcs, places ou rues de votre parcours. Vous pouvez ainsi prévoir un arrêt sans attendre que votre gourde soit vide. La disponibilité dépend du lieu, des horaires d’accès et de la saison ; une fontaine peut être arrêtée même si elle figure sur la carte.'],
      ['Trouver un point d’eau sans partager sa position', 'La localisation est facultative. Le champ de recherche permet de trouver une ville ou une adresse, puis vous pouvez déplacer la carte manuellement. Sur téléphone, si le GPS est refusé, cette recherche reste utilisable. Pour un voyage à vélo, associez ensuite le filtre Eau au ravitaillement.'],
    ],
    faq: [
      ['Comment trouver une fontaine à eau autour de moi ?', 'Ouvrez la carte, activez le filtre Eau et utilisez le bouton GPS. Vous pouvez aussi saisir votre ville sans autoriser la localisation.'],
      ['Tous les points d’eau de la carte sont-ils potables ?', 'Non. Le filtre comprend aussi des fontaines et des sources dont la potabilité peut être inconnue ou négative. Vérifiez la fiche et les indications sur place.'],
      ['Survimap indique-t-il les fontaines ouvertes en temps réel ?', 'Non. Les données et signalements aident à préparer un arrêt, mais ne garantissent pas le fonctionnement ni l’accès à l’instant de votre visite.'],
    ],
    keywords: ['fontaine eau potable', 'fontaine eau potable autour de moi', 'point eau potable autour de moi', 'fontaine à eau à proximité', 'carte fontaines eau potable', 'carte points eau potable France', 'où remplir sa gourde en ville', 'remplir gourde gratuitement', 'trouver eau potable gratuite', 'fontaine publique près de moi', 'robinet eau potable public', 'borne eau potable ville', 'où boire de l’eau en ville', 'point de remplissage gourde', 'fontaine eau potable sans application', 'carte fontaines sans inscription', 'trouver un point d’eau avec GPS', 'fontaine à boire parc', 'fontaine publique centre ville', 'eau potable promenade en ville', 'fontaine eau potable trajet vélo', 'comment trouver une fontaine publique', 'carte fontaines sur téléphone', 'point eau potable près de ma position'],
  },
  {
    slug: 'ravitaillement-velo', audience: 'Voyage à vélo',
    title: 'Ravitaillement à vélo : eau et commerces | Survimap',
    description: 'Préparez vos arrêts à vélo : points d’eau, boulangeries, épiceries et supermarchés sur Survimap. Une carte gratuite pour le cyclotourisme et le bikepacking.',
    heading: 'Trouver de l’eau et du ravitaillement en voyage à vélo',
    intro: 'En cyclotourisme ou en bikepacking, un arrêt pour acheter du pain et remplir les bidons compte autant que le prochain kilomètre. Survimap rassemble les points d’eau et les commerces cartographiés pour vous aider à préparer vos pauses et vos étapes.',
    map: '/?filters=water,bakery,picnic', cta: 'Voir l’eau et le ravitaillement',
    steps: ['Ouvrez la carte : Eau, Ravitaillement et Tables sont sélectionnés.', 'Recherchez votre ville d’étape ou utilisez le GPS pour explorer les environs de votre position.', 'Consultez les points autour de votre parcours et vérifiez les informations du commerce avant de prévoir votre arrêt.'],
    sections: [
      ['Boulangeries, épiceries et supermarchés sur une même carte', 'Le filtre Ravitaillement regroupe les boulangeries, les commerces alimentaires, les cafés et les restaurants. Les icônes permettent de distinguer leurs types : une boulangerie est représentée par un croissant. Vous pouvez comparer les arrêts possibles dans les villages traversés sans confondre une boulangerie avec l’ensemble des commerces.'],
      ['Préparer ses pauses avant une étape', 'Affichez votre destination et repérez des solutions de ravitaillement à plusieurs endroits du trajet. Une table de pique-nique peut compléter un arrêt courses, tandis que le filtre Eau aide à repérer un point de remplissage. Les commerces cartographiés ne sont pas nécessairement ouverts : vérifiez leurs horaires, notamment le dimanche ou lors d’un départ matinal.'],
      ['Comparer une trace GPX avec les points utiles', 'Si vous disposez déjà d’une trace, importez son fichier GPX dans Survimap et examinez visuellement les points voisins. La carte ne calcule pas automatiquement une liste de commerces à une distance donnée de la trace. Elle vous permet de repérer les possibilités et d’évaluer où vous souhaitez faire une pause.'],
      ['Emporter sa carte hors ligne', 'Avant de perdre le réseau, téléchargez la zone utile avec le panneau hors ligne. Testez-la sur votre téléphone avant le départ. Le GPS peut rester disponible sans connexion, mais la météo, les recherches en ligne et le calcul de nouveaux itinéraires nécessitent du réseau.'],
    ],
    faq: [
      ['Comment trouver une boulangerie pendant un voyage à vélo ?', 'Activez Ravitaillement, puis cherchez votre ville d’étape ou utilisez votre position. Repérez les icônes de croissant et consultez les fiches.'],
      ['Survimap connaît-il les commerces ouverts maintenant ?', 'Survimap ne garantit pas les horaires en temps réel. Vérifiez les informations disponibles et, si nécessaire, celles du commerce avant de faire un détour.'],
      ['Puis-je voir les points d’eau près de ma trace GPX ?', 'Oui, en important la trace et en activant Eau. La comparaison se fait visuellement sur la carte, sans classement automatique des points le long du parcours.'],
    ],
    keywords: ['ravitaillement vélo', 'carte ravitaillement vélo', 'ravitaillement voyage à vélo', 'ravitaillement cyclotourisme', 'ravitaillement bikepacking', 'trouver boulangerie voyage vélo', 'boulangerie sur itinéraire vélo', 'épicerie sur parcours vélo', 'supermarché voyage vélo', 'où remplir bidon vélo', 'eau potable cyclotourisme', 'points eau parcours vélo', 'carte eau boulangeries vélo', 'préparer étapes vélo ravitaillement', 'commerces près trace GPX vélo', 'points eau près trace GPX', 'carte gratuite voyage à vélo', 'carte bikepacking eau nourriture', 'ravitaillement vélo longue distance', 'où manger pendant voyage à vélo', 'pause pique nique vélo', 'tables pique nique itinéraire vélo', 'application ravitaillement vélo sans compte', 'carte cyclotourisme hors ligne'],
  },
  {
    slug: 'randonnee-bivouac', audience: 'Randonnée et bivouac',
    title: 'Randonnée et bivouac : eau, abris et sentiers | Survimap',
    description: 'Préparez une randonnée avec bivouac : repérez points d’eau, refuges, abris et sentiers sur Survimap, puis vérifiez les règles locales avant de partir.',
    heading: 'Préparer une randonnée avec bivouac : eau, abris et sentiers',
    intro: 'Pour une randonnée sur plusieurs jours, repérer l’eau, les abris et les étapes permet de préparer son parcours. Survimap vous aide à examiner ces éléments sur une carte topographique et à consulter les informations disponibles sur les lieux.',
    map: '/?filters=water,refuge,bakery&trails=1&protected=1', cta: 'Explorer la carte pour ma randonnée',
    steps: ['Ouvrez la carte avec Eau, Couchage & abris, Ravitaillement et les sentiers activés.', 'Cherchez votre secteur de randonnée ou importez votre trace GPX pour explorer les alentours du parcours.', 'Consultez les fiches des points utiles, puis préparez une solution de repli et vérifiez les conditions locales avant le départ.'],
    sections: [
      ['Repérer l’eau et le ravitaillement entre les étapes', 'Le filtre Eau affiche les sources, fontaines, robinets et points de remplissage présents dans les données. Leur présence ne garantit pas une eau potable ni un débit suffisant. Le filtre Ravitaillement complète la préparation avec les commerces des villages traversés. Une trace GPX importée permet de comparer visuellement votre chemin et les points voisins.'],
      ['Refuges, cabanes, abris et campings : des lieux différents', 'Le filtre Couchage & abris rassemble plusieurs types de lieux. Une cabane, un abri ouvert, un refuge gardé et un camping ne proposent pas les mêmes services. Consultez le type de point et les renseignements de sa fiche. Un refuge peut exiger une réservation, être fermé ou ne pas permettre de dormir à l’intérieur.'],
      ['Une carte de préparation, pas une autorisation de bivouac', 'La présence d’un abri, d’un camping ou d’un espace protégé sur la carte ne vaut pas autorisation de planter une tente. Vérifiez les règles auprès du gestionnaire du site, du parc ou de la commune concernée. Les limites d’espaces protégés affichées servent de repère et ne remplacent pas ces informations.'],
      ['Utiliser la carte quand le réseau disparaît', 'Téléchargez votre zone avant la randonnée et vérifiez qu’elle est disponible en mode avion. Vous pouvez enregistrer vos points personnels et importer une trace GPX. Les services en ligne, notamment la météo et le calcul de nouveaux itinéraires, restent dépendants de la connexion.'],
    ],
    faq: [
      ['Survimap indique-t-il les emplacements où le bivouac est autorisé ?', 'Non. La carte aide à préparer une randonnée, mais ne certifie pas l’autorisation de bivouaquer. Vérifiez les règles locales auprès du gestionnaire compétent.'],
      ['Comment trouver des points d’eau sur une randonnée ?', 'Activez Eau et les sentiers, ou importez votre trace GPX. Examinez les points près du parcours et vérifiez les indications de potabilité et de disponibilité.'],
      ['Puis-je préparer plusieurs jours de marche sans compte ?', 'Oui. La carte est accessible sans compte et vos points et itinéraires personnels sont conservés sur votre appareil. Pensez à exporter les traces que vous souhaitez sauvegarder.'],
    ],
    keywords: ['carte randonnée bivouac', 'préparer randonnée bivouac', 'carte eau refuges randonnée', 'points eau randonnée', 'points eau randonnée plusieurs jours', 'trouver eau en randonnée', 'source eau randonnée carte', 'carte abris randonnée', 'cabane randonnée carte', 'refuge randonnée autour de moi', 'carte randonnée gratuite sans compte', 'préparer itinéraire randonnée plusieurs jours', 'carte bivouac hors ligne', 'randonnée autonomie ravitaillement', 'ravitaillement grande randonnée', 'points eau près sentier randonnée', 'refuges près trace GPX', 'carte camping randonnée', 'préparer nuit bivouac randonnée', 'carte sentiers eau abris', 'carte topographique randonnée gratuite', 'importer GPX randonnée eau refuges', 'comment préparer une randonnée avec bivouac', 'carte espaces protégés randonnée'],
  },
  {
    slug: 'boulangeries-autour-de-moi', audience: 'Voyage à vélo',
    title: 'Trouver une boulangerie autour de moi sur la carte | Survimap',
    description: 'Repérez les boulangeries à proximité sur Survimap : activez Ravitaillement, cherchez une ville et identifiez les croissants pour préparer votre arrêt.',
    heading: 'Trouver une boulangerie autour de vous ou dans votre ville d’étape',
    intro: 'Une pause pain ou un arrêt courses pendant un trajet ? Survimap permet de repérer les boulangeries cartographiées aux côtés des autres commerces utiles. Vous pouvez explorer votre quartier actuel ou préparer un arrêt dans une ville à venir.',
    map: '/?filters=bakery', cta: 'Voir les commerces et boulangeries',
    steps: ['Ouvrez la carte avec le filtre Ravitaillement.', 'Saisissez une ville ou utilisez le bouton GPS pour explorer votre position.', 'Cherchez les icônes de croissant, puis touchez la boulangerie pour consulter sa fiche.'],
    sections: [
      ['Reconnaître les boulangeries parmi les commerces', 'Le filtre Ravitaillement n’affiche pas uniquement les boulangeries : il comprend aussi épiceries, supermarchés, cafés et restaurants. Les croissants identifient les boulangeries dans les données. Zoomez pour distinguer les points et choisir le type de commerce qui correspond à votre pause.'],
      ['Anticiper un arrêt pendant un voyage à vélo', 'Vous pouvez rechercher la prochaine ville traversée avant d’y arriver, puis associer Ravitaillement au filtre Eau pour préparer plusieurs besoins au même arrêt. Si vous avez importé une trace GPX, comparez visuellement l’emplacement des commerces avec votre trajet pour décider si un détour vous convient.'],
      ['Vérifier les horaires avant de se déplacer', 'Un point présent sur la carte n’est pas une confirmation d’ouverture. Survimap ne propose pas de filtre fiable « ouvert maintenant ». Pour un arrêt tôt le matin, le dimanche ou un jour férié, vérifiez les informations du commerce. Les données peuvent aussi être incomplètes ou anciennes.'],
    ],
    faq: [
      ['Comment voir uniquement les boulangeries ?', 'Le filtre actuel regroupe le ravitaillement. Repérez les icônes de croissant pour distinguer les boulangeries des autres commerces affichés.'],
      ['Faut-il autoriser le GPS pour chercher une boulangerie ?', 'Non. Vous pouvez rechercher une ville ou une adresse puis déplacer la carte. Le GPS est seulement une option pour explorer les environs de votre position.'],
    ],
    keywords: ['boulangerie autour de moi', 'boulangerie à proximité', 'carte boulangeries', 'trouver boulangerie près de moi', 'boulangerie près de ma position', 'boulangerie ville étape vélo', 'acheter pain voyage vélo', 'trouver boulangerie sur trajet', 'carte commerces alimentaires autour de moi', 'épicerie autour de moi carte', 'supermarché près de moi carte', 'où acheter pain à proximité', 'boulangerie GPS carte gratuite', 'chercher boulangerie sans application', 'boulangerie près parcours randonnée', 'trouver ravitaillement en village'],
  },
  {
    slug: 'refuges-abris-randonnee', audience: 'Randonnée et bivouac',
    title: 'Refuges, cabanes et abris de randonnée sur la carte | Survimap',
    description: 'Explorez les refuges, cabanes, abris et campings cartographiés sur Survimap pour préparer vos étapes de randonnée et consulter les informations des lieux.',
    heading: 'Repérer les refuges, cabanes et abris pour une randonnée',
    intro: 'Préparer une étape commence par comprendre ce que propose chaque lieu. Survimap affiche les refuges et les abris cartographiés pour vous aider à comparer leur emplacement avec votre randonnée et à lire les informations disponibles.',
    map: '/?filters=refuge,water&trails=1', cta: 'Voir les refuges et abris',
    steps: ['Ouvrez la carte avec Couchage & abris, Eau et les sentiers.', 'Cherchez votre massif ou votre ville de départ, puis zoomez dans le secteur.', 'Ouvrez les fiches pour distinguer refuges, campings et abris et consulter leurs renseignements.'],
    sections: [
      ['Comprendre les catégories de couchage et d’abris', 'Un refuge peut être gardé ou non gardé. Un abri n’est pas forcément un hébergement et une cabane peut avoir un accès restreint. Les campings constituent encore une autre catégorie. Le filtre les regroupe pour faciliter la préparation, mais il faut lire le type de lieu et ses informations avant d’en faire une étape.'],
      ['Examiner les points utiles autour du refuge', 'Affichez Eau pour repérer les sources et points de remplissage proches du parcours. Leur disponibilité et leur potabilité demandent une vérification distincte. Vous pouvez aussi importer une trace GPX pour voir si le refuge se situe réellement près du chemin que vous prévoyez de suivre.'],
      ['Contacter le lieu avant une nuit prévue', 'Survimap n’est pas un service de réservation et n’affiche pas les places libres en temps réel. Si vous prévoyez de dormir dans un refuge, vérifiez son ouverture, ses conditions d’accueil et la réservation auprès du gestionnaire. La présence d’un refuge ne confirme pas non plus que le bivouac soit autorisé autour.'],
    ],
    faq: [
      ['Peut-on réserver un refuge sur Survimap ?', 'Non. Utilisez les informations disponibles dans la fiche pour vous renseigner auprès du refuge ou de son gestionnaire.'],
      ['La carte recense-t-elle tous les abris ?', 'Non. La couverture dépend des données disponibles, notamment OpenStreetMap et Refuges.info. Un abri absent de la carte peut exister, et un point affiché peut avoir changé.'],
    ],
    keywords: ['carte refuges randonnée', 'carte cabanes montagne', 'carte abris montagne', 'refuge près de moi', 'cabane près sentier randonnée', 'abri randonnée à proximité', 'refuge non gardé carte', 'cabane non gardée randonnée', 'trouver refuge randonnée', 'points eau près refuge', 'carte refuges et points eau', 'refuges près parcours GPX', 'abris randonnée plusieurs jours', 'camping près sentier randonnée', 'préparer étape refuge randonnée', 'carte gratuite refuges montagne'],
  },
  {
    slug: 'carte-randonnee-hors-ligne', audience: 'Randonnée et bivouac',
    title: 'Carte hors ligne pour randonnée et voyage à vélo | Survimap',
    description: 'Préparez Survimap avant de partir : téléchargez une zone, importez une trace GPX et vérifiez la carte hors ligne sur votre téléphone.',
    heading: 'Préparer sa carte hors ligne avant une randonnée ou un voyage à vélo',
    intro: 'Une zone téléchargée permet de consulter sa carte quand la connexion disparaît. Survimap propose un panneau hors ligne pour préparer une zone avant de partir à pied ou à vélo. Le téléchargement doit être réalisé pendant que vous avez encore du réseau.',
    map: '/?filters=water,refuge,bakery', cta: 'Ouvrir la carte et préparer ma zone',
    steps: ['Avec une connexion, ouvrez la carte et placez-vous dans la zone de votre parcours.', 'Ouvrez le panneau de téléchargement hors ligne et préparez les données de la zone.', 'Importez votre trace si vous en avez une, puis testez la carte en mode avion avant le départ.'],
    sections: [
      ['Ce qui reste disponible sans réseau', 'Les données effectivement téléchargées sur votre appareil peuvent être consultées hors ligne. Le GPS peut fonctionner sans connexion si votre téléphone et votre navigateur l’autorisent. La couverture disponible dépend de la zone préparée : un secteur voisin non téléchargé ne sera pas automatiquement accessible.'],
      ['Ce qui demande encore une connexion', 'La recherche d’adresses, la météo, les signalements publics et le calcul de nouveaux itinéraires utilisent des services en ligne. Les vues satellite et le relief 3D nécessitent aussi le réseau. Préparez vos recherches et vos traces avant de partir plutôt que de compter sur ces services en zone blanche.'],
      ['Garder une copie de ses itinéraires', 'Les points et itinéraires personnels restent sur l’appareil et dans le navigateur utilisés. Exportez vos traces GPX pour conserver une copie indépendante. L’effacement des données du navigateur ou un manque de stockage peut supprimer les données locales ; vérifiez votre préparation avant chaque départ.'],
    ],
    faq: [
      ['Survimap fonctionne-t-il sans Internet dès la première visite ?', 'Non. Il faut une connexion pour ouvrir le site et télécharger les données nécessaires avant de les consulter hors ligne.'],
      ['Peut-on calculer un nouvel itinéraire hors ligne ?', 'Non. Le calcul de nouveaux itinéraires nécessite une connexion. Préparez ou importez vos traces à l’avance.'],
    ],
    keywords: ['carte randonnée hors ligne', 'carte vélo hors ligne', 'carte topographique hors ligne gratuite', 'carte randonnée sans réseau', 'carte randonnée sans inscription', 'carte GPX hors ligne', 'importer trace GPX carte gratuite', 'carte eau potable hors ligne', 'carte refuges hors ligne', 'préparer carte avant randonnée', 'télécharger carte randonnée téléphone', 'GPS randonnée sans connexion', 'carte cyclotourisme sans réseau', 'carte bikepacking hors ligne gratuite', 'consulter trace GPX sans réseau', 'carte randonnée gratuite navigateur'],
  },
]

export const cities = ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Toulouse', 'Nantes', 'Lille', 'Strasbourg', 'Montpellier', 'Nice', 'Rennes', 'Grenoble', 'Annecy', 'Narbonne', 'Arcachon']
export const routes = ['Loire à Vélo', 'Vélodyssée', 'ViaRhôna', 'EuroVelo 6', 'Canal des Deux Mers à vélo', 'Vélomaritime', 'Véloscénie', 'Dolce Via']
export const hikingRoutes = ['GR10', 'GR20', 'GR34', 'GR65', 'Tour du Mont-Blanc', 'Alpes', 'Pyrénées', 'Vosges', 'Jura', 'Massif central']
