import { mkdir, writeFile } from 'node:fs/promises'
import { pages, cities, routes, hikingRoutes } from '../seo/content.mjs'

const origin = 'https://survimap.com'
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const link = (page) => `/${page.slug}/`
const nav = `<nav aria-label="Navigation principale"><a class="brand" href="/">Survimap</a><a href="/guides/">Guides</a><a href="/?filters=water">Eau</a><a href="/?filters=water,bakery">À vélo</a><a href="/?filters=water,refuge&trails=1">Randonnée</a></nav>`
function html({ title, description, url, body, heading }) {
  const schema = [
    { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: origin + url, inLanguage: 'fr', isPartOf: { '@type': 'WebSite', name: 'Survimap', url: origin + '/' } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Survimap', item: origin + '/' },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: origin + '/guides/' },
      ...(url === '/guides/' ? [] : [{ '@type': 'ListItem', position: 3, name: heading, item: origin + url }]),
    ] },
  ]
  return `<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title><meta name="description" content="${escape(description)}">
<link rel="canonical" href="${origin + url}"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#15803d"><link rel="stylesheet" href="/guides.css">
<meta property="og:type" content="website"><meta property="og:site_name" content="Survimap"><meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${origin + url}"><meta property="og:image" content="${origin}/og-image.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${origin}/og-image.png">
<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
</head><body><a class="skip" href="#contenu">Aller au contenu</a><header>${nav}</header>
<main id="contenu">${body}</main>
<footer><p>Survimap · Carte gratuite, sans compte · France, Espagne et Italie</p><p>Sources cartographiques : OpenStreetMap et, selon les lieux, Refuges.info et données publiques. La couverture et la fraîcheur varient.</p><a href="/guides/">Tous les guides</a> · <a href="/privacy.html">Confidentialité</a> · <a href="/">Ouvrir la carte</a></footer>
</body></html>
`
}

for (const page of pages) {
  const related = pages.filter((candidate) => candidate.slug !== page.slug)
  const body = `<p class="eyebrow">${escape(page.audience)}</p><h1>${escape(page.heading)}</h1>
<p class="intro">${escape(page.intro)}</p><p><a class="cta" href="${escape(page.map)}">${escape(page.cta)}</a></p>
<p class="hint">La localisation reste facultative. Vous pouvez rechercher une ville sur la carte.</p>
<section><h2>Comment utiliser Survimap pour ce besoin ?</h2><ol>${page.steps.map((step) => `<li>${escape(step)}</li>`).join('')}</ol></section>
${page.sections.map(([title, text]) => `<section><h2>${escape(title)}</h2><p>${escape(text)}</p></section>`).join('\n')}
<section><h2>Questions fréquentes</h2>${page.faq.map(([question, answer]) => `<h3>${escape(question)}</h3><p>${escape(answer)}</p>`).join('\n')}</section>
<section><h2>Préparer la suite de votre parcours</h2><ul>${related.map((item) => `<li><a href="${link(item)}">${escape(item.heading)}</a></li>`).join('')}</ul></section>
<p><a class="cta" href="${escape(page.map)}">${escape(page.cta)}</a></p>`
  await mkdir(`public/${page.slug}`, { recursive: true })
  await writeFile(`public/${page.slug}/index.html`, html({ ...page, url: link(page), body }), 'utf8')
}
await mkdir('public/guides', { recursive: true })
await writeFile('public/guides/index.html', html({
  title: 'Guides : fontaines, voyage à vélo et bivouac | Survimap',
  description: 'Trouvez le guide adapté à votre sortie : fontaines en ville, boulangeries, ravitaillement à vélo, refuges et préparation de carte hors ligne.',
  heading: 'De l’eau en ville aux étapes de randonnée', url: '/guides/',
  body: `<p class="eyebrow">Les guides Survimap</p><h1>De l’eau en ville aux étapes de randonnée</h1><p class="intro">Choisissez votre besoin pour découvrir les outils utiles, puis ouvrir la carte avec les bons filtres. À pied, à vélo ou simplement dans votre quartier, préparez un arrêt à partir des informations disponibles.</p><div class="cards">${pages.map((page) => `<article><p class="eyebrow">${escape(page.audience)}</p><h2><a href="${link(page)}">${escape(page.heading)}</a></h2><p>${escape(page.description)}</p></article>`).join('')}</div><section><h2>Une carte à explorer selon votre besoin</h2><p>Survimap rassemble des points d’eau, commerces, refuges, abris et sentiers. La carte est accessible gratuitement sans compte. Les informations dépendent des données disponibles et ne garantissent ni l’ouverture d’un lieu, ni la potabilité d’une source, ni l’autorisation de bivouaquer. Chaque guide explique les vérifications utiles et les limites des outils.</p><a class="cta" href="/">Explorer la carte</a></section>`,
}), 'utf8')

const urls = ['/', '/guides/', ...pages.map(link), '/privacy.html']
await writeFile('public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${origin + url}</loc></url>`).join('\n')}\n</urlset>\n`, 'utf8')

const rows = []
function add(query, page, priority, type, condition = 'Contenu en ligne ; mesurer dans Search Console') {
  rows.push([query, page.audience, type, priority, origin + link(page), condition, 'Non mesuré', 'Non mesurée'])
}
for (const page of pages) for (const query of page.keywords) add(query, page, 'P1', query.split(' ').length > 3 ? 'Longue traîne' : 'Principal')
for (const city of cities) {
  for (const query of [`fontaine eau potable ${city}`, `où remplir sa gourde à ${city}`, `carte points eau ${city}`, `fontaine publique ${city} centre ville`]) add(query, pages[0], 'P2', 'Local', 'Cible locale à valider ; page ville seulement avec données et contenu spécifiques vérifiés')
  for (const query of [`boulangerie ${city} carte`, `ravitaillement vélo ${city}`, `points eau vélo ${city}`]) add(query, query.startsWith('boulangerie') ? pages[3] : pages[1], 'P2', 'Local', 'Cible locale à valider ; pas de page ville générée automatiquement')
}
for (const route of routes) for (const query of [`ravitaillement ${route}`, `boulangeries ${route}`, `points eau ${route}`, `préparer étapes ${route} ravitaillement`]) add(query, pages[1], 'P2', 'Itinéraire vélo', 'Vérifier couverture et données du parcours avant de créer un guide dédié')
for (const route of hikingRoutes) for (const query of [`points eau ${route}`, `refuges et abris ${route}`, `préparer randonnée bivouac ${route}`, `carte hors ligne ${route}`]) add(query, query.startsWith('refuges') ? pages[4] : query.startsWith('carte') ? pages[5] : pages[2], 'P2', 'Randonnée locale', 'Vérifier le parcours, les sources et les règles auprès du gestionnaire avant un guide dédié')
const excluded = [
  ['boulangerie ouverte maintenant', 'Horaires en temps réel non garantis'], ['boulangerie ouverte dimanche autour de moi', 'Absence de filtre d’ouverture fiable'],
  ['bivouac autorisé autour de moi', 'La carte ne certifie pas les autorisations'], ['carte spots bivouac légaux', 'Pas de registre vérifié des autorisations'],
  ['fontaine potable garantie', 'Potabilité non garantie par Survimap'], ['calcul itinéraire randonnée hors ligne', 'Calcul en ligne uniquement'],
]
for (const [query, reason] of excluded) rows.push([query, 'À exclure', 'Promesse non prise en charge', 'Exclu', '', reason, 'Non mesuré', 'Non mesurée'])
const unique = [...new Map(rows.map((row) => [row[0].toLocaleLowerCase('fr'), row])).values()]
const csv = (row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';')
await mkdir('docs/seo', { recursive: true })
await writeFile('docs/seo/mots-cles.csv', '\ufeff' + [
  ['Requête', 'Public', 'Intention', 'Priorité', 'Page cible', 'Condition / limite', 'Volume mensuel', 'Difficulté SEO'], ...unique,
].map(csv).join('\n') + '\n', 'utf8')
console.log(`SEO : ${pages.length + 1} pages et ${unique.length} requêtes documentées (${excluded.length} exclues).`)
