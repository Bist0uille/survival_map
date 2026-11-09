(() => {
  const paths = ['/', '/guides/', '/fontaines-eau-potable/', '/ravitaillement-velo/', '/randonnee-bivouac/', '/boulangeries-autour-de-moi/', '/refuges-abris-randonnee/', '/carte-randonnee-hors-ligne/']
  if (!paths.includes(location.pathname)) return
  if (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1') return
  // No cookies, browser storage, fingerprint or visitor identifier.
  let source = 'direct'
  try { const ref = new URL(document.referrer); source = ref.origin === location.origin ? 'internal' : /(^|\.)google\.[a-z.]+$/.test(ref.hostname) ? 'google' : /(^|\.)bing\.com$/.test(ref.hostname) ? 'bing' : /(^|\.)(facebook\.com|instagram\.com|t\.co|linkedin\.com|youtube\.com)$/.test(ref.hostname) ? 'social' : 'other' } catch { /* direct */ }
  function send(event, seconds) {
    if (!navigator.onLine) return
    fetch('/api/analytics', { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event, path: location.pathname, source, ...(seconds ? { seconds } : {}) }), keepalive: true }).catch(() => {})
  }
  let viewed = false
  let visibleSince = null
  function visible() {
    if (document.visibilityState !== 'visible') return
    if (!viewed) { viewed = true; send('pageview') }
    visibleSince = performance.now()
  }
  function flush() {
    const now = performance.now()
    if (visibleSince !== null) {
      const seconds = Math.min(15, Math.floor((now - visibleSince) / 1000))
      if (seconds > 0) send('engagement', seconds)
    }
    visibleSince = document.visibilityState === 'visible' ? now : null
  }
  visible()
  setInterval(flush, 15000)
  document.addEventListener('visibilitychange', () => { flush(); visible() })
  window.addEventListener('pagehide', () => { flush(); visibleSince = null })
  window.addEventListener('pageshow', visible)
  const allowed = ['poi_open', 'filter_change', 'route_start', 'route_saved', 'gpx_import', 'offline_start', 'offline_complete']
  window.addEventListener('survimap:activity', e => { if (allowed.includes(e.detail)) send(e.detail) })
  document.addEventListener('click', e => { const a = e.target.closest?.('a[href]'); if (!a || location.pathname === '/') return; const u = new URL(a.href, location.href); if (u.origin === location.origin && u.pathname === '/') send('guide_map') })
})()
