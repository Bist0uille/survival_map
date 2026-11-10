/* Private data is requested only through the authenticated server endpoint. */
const $ = id => document.getElementById(id)
const fmt = n => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n || 0)
let current
let generation = 0
let sessionToken = null // Tab memory only; no browser storage or cookie.
const names = { pageview: 'Pages vues', guide_map: 'Guide → carte', poi_open: 'Fiches ouvertes', filter_change: 'Changements de filtres', route_start: 'Créations commencées', route_saved: 'Itinéraires enregistrés', gpx_import: 'Imports GPX réussis', offline_start: 'Téléchargements lancés', offline_complete: 'Fonds de carte téléchargés' }
async function api(options = {}, days = $('days').value) {
  const response = await fetch('/api/admin?days=' + days, { credentials: 'omit', cache: 'no-store', ...options, headers: { ...(sessionToken ? { Authorization: 'Bearer ' + sessionToken } : {}), ...options.headers } })
  const data = await response.json()
  if (!response.ok) { if (response.status === 401) lock(); throw new Error(data.error || 'Service indisponible') }
  return data
}
function lock() { sessionToken = null; generation++; current = null; $('dashboard').hidden = true; $('logout').hidden = true; $('login').hidden = false; for (const id of ['metrics', 'chart', 'pages', 'sources', 'events', 'google-metrics', 'queries', 'google-pages', 'baseline-metrics', 'baseline-queries', 'data-metrics', 'data-status']) $(id).replaceChildren() }
function table(id, headings, rows) {
  const root = $(id); root.replaceChildren()
  if (!rows.length) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Aucune donnée sur cette période.'; root.append(p); return }
  const t = document.createElement('table'), head = document.createElement('thead'), tr = document.createElement('tr')
  for (const title of headings) { const th = document.createElement('th'); th.scope = 'col'; th.textContent = title; tr.append(th) }
  head.append(tr); t.append(head)
  const body = document.createElement('tbody')
  for (const row of rows) { const line = document.createElement('tr'); for (const value of row) { const td = document.createElement('td'); td.textContent = String(value); line.append(td) } body.append(line) }
  t.append(body); root.append(t)
}
function metrics(id, values) {
  $(id).replaceChildren(...values.map(([label, value]) => { const box = document.createElement('div'); box.className = 'metric'; const name = document.createElement('span'), count = document.createElement('strong'); name.textContent = label; count.textContent = value; box.append(name, count); return box }))
}
function seoMetrics(id, data, percent = false) { metrics(id, [['Clics Google', fmt(data.clicks)], ['Impressions', fmt(data.impressions)], ['Taux de clics', fmt(data.ctr * (percent ? 1 : 100)) + ' %'], ['Position moyenne', data.impressions ? fmt(data.position) : '—']]) }
function render(data) {
  current = data; $('login').hidden = true; $('dashboard').hidden = false; $('logout').hidden = false
  const quality = data.dataStatus
  const report = quality?.report
  metrics('data-metrics', [
    ['Dernière publication', quality?.publishedAt ? new Date(quality.publishedAt).toLocaleString('fr-FR') : 'Inconnue'],
    ['Boulangeries · FR/ES/IT', report ? fmt(report.count) : 'En attente'],
    ['Avec horaires renseignés', report ? fmt(report.withHours) + ' · ' + fmt(report.withHours / report.count * 100) + ' %' : 'En attente'],
  ])
  $('data-status').textContent = quality ? [
    quality.latestRun && quality.latestRun.status !== 'completed' ? 'Import en cours ou en attente.' : '',
    ...(quality.alerts || []),
  ].filter(Boolean).join(' ') || 'Dernier import publié sans alerte. État vérifié au plus toutes les 5 minutes.' : 'Suivi des imports temporairement indisponible.'
  $('data-status').classList.toggle('warning', !quality || quality.alerts?.length > 0)
  $('updated').textContent = 'Actualisé à ' + new Date().toLocaleTimeString('fr-FR') + ' · audience sur ' + $('days').value + ' jours, aujourd’hui inclus'
  $('collection').textContent = data.enabled ? 'Compteurs sans cookie ni identifiant visiteur. Une ouverture de page compte une visite ; recharger ou ouvrir un autre onglet compte à nouveau. Aucun historique antérieur à l’installation n’est reconstitué.' : 'Collecte désactivée. Définir ANALYTICS_ENABLED=true dans les variables serveur, puis redéployer pour démarrer la mesure.'
  const totals = {}
  for (const day of data.daily) for (const [key, value] of Object.entries(day.counts)) totals[key] = (totals[key] || 0) + Number(value)
  const views = totals['event:pageview'] || 0
  const seconds = totals.visible_seconds || 0
  const duration = value => Math.floor(value / 60) + ' min ' + Math.floor(value % 60) + ' s'
  metrics('metrics', [['Visites de page', fmt(views)], ['Temps visible cumulé', duration(seconds)], ['Temps moyen par visite', views ? duration(seconds / views) : '—'], ['Fiches ouvertes', fmt(totals['event:poi_open'])]])
  const group = prefix => Object.entries(totals).filter(([k]) => k.startsWith(prefix)).sort((a,b) => b[1]-a[1]).map(([k,v]) => [k.slice(prefix.length), fmt(v)])
  table('pages', ['Page', 'Vues'], group('page:'))
  table('sources', ['Provenance', 'Vues'], group('source:'))
  table('events', ['Action', 'Nombre'], group('event:').filter(([k]) => k !== 'pageview').map(([k,v]) => [names[k] || k, v]))
  const chart = $('chart'); chart.replaceChildren()
  const max = Math.max(0, ...data.daily.map(d => Number(d.counts['event:pageview'] || 0)))
  if (!max) { const p = document.createElement('p'); p.className = 'chart-empty'; p.textContent = 'Les premières pages vues apparaîtront ici.'; chart.append(p) }
  else for (const day of data.daily) { const n = Number(day.counts['event:pageview'] || 0); const bar = document.createElement('div'); bar.className = 'bar'; bar.style.height = (n ? Math.max(2, n/max*100) : 0) + '%'; bar.title = day.date + ' : ' + n + ' pages vues'; bar.setAttribute('aria-label', bar.title); chart.append(bar) }
  const google = data.google
  $('google-status').textContent = google.connected ? `Données Google synchronisées du ${google.startDate} au ${google.endDate}. Les derniers jours sont exclus pour laisser le temps à Google de finaliser ses données.` : google.error || 'Synchronisation Google non configurée. Le repère manuel issu de tes captures est disponible ci-dessous. Les clés du compte de service se configurent uniquement côté serveur.'
  $('google-metrics').replaceChildren(); $('queries').replaceChildren(); $('google-pages').replaceChildren()
  if (google.connected) {
    seoMetrics('google-metrics', google.totals || {})
    for (const [id, rows, title] of [['queries', google.queries, 'Recherche'], ['google-pages', google.pages, 'Page']]) table(id, [title, 'Clics', 'Impr.', 'Position'], rows.map(r => [r.keys[0], fmt(r.clicks), fmt(r.impressions), fmt(r.position)]))
  } else { table('queries', [], []); table('google-pages', [], []) }
  $('baseline-source').textContent = data.baseline.source
  seoMetrics('baseline-metrics', data.baseline, true)
  table('baseline-queries', ['Recherche visible', 'Clics', 'Impressions'], data.baseline.queries.map(([q,n]) => [q, '0', n]))
}
async function load() {
  const ticket = ++generation
  $('status').textContent = ''; $('refresh').disabled = true
  try { const data = await api(); if (ticket === generation) render(data) } catch (error) { if (ticket === generation || $('dashboard').hidden) $('status').textContent = error.message } finally { $('refresh').disabled = false }
}
$('login-form').addEventListener('submit', async e => {
  e.preventDefault(); const button = e.target.querySelector('button'); button.disabled = true; $('status').textContent = ''
  try { const data = await api({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'login', password: $('password').value }) }); sessionToken = data.token; $('password').value = ''; await load() } catch (error) { $('status').textContent = error.message } finally { button.disabled = false }
})
$('logout').addEventListener('click', async () => { try { await api({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) }); lock() } catch (error) { $('status').textContent = error.message } })
$('refresh').addEventListener('click', load); $('days').addEventListener('change', load)
$('export').addEventListener('click', () => {
  if (!current) return
  const rows = [['date_utc', 'mesure', 'nombre'], ...current.daily.flatMap(d => Object.entries(d.counts).map(([k,v]) => [d.date, k, v]))]
  const csv = '\ufeff' + rows.map(r => r.map(v => '"' + String(v).replaceAll('"','""') + '"').join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'survimap-activite.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
})
window.addEventListener('pageshow', e => { if (e.persisted) { lock(); load() } })
load()
