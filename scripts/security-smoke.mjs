// Local production smoke test. PUPPETEER_MODULE_PATH points to a temporary
// puppeteer-core installation; no application dependency is required.
import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'

const { default: puppeteer } = await import(pathToFileURL(process.env.PUPPETEER_MODULE_PATH).href)
const headers = JSON.parse(await fs.readFile('vercel.json', 'utf8')).headers[0].headers
const root = path.resolve('dist')
const server = http.createServer(async (req, res) => {
  for (const { key, value } of headers) res.setHeader(key, value)
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname === '/api/checkins') {
    res.setHeader('Content-Type', 'application/json'); res.end('{}'); return
  }
  const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname))
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return }
  try {
    const data = await fs.readFile(file)
    const type = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.webmanifest': 'application/manifest+json' }[path.extname(file)] ?? 'application/octet-stream'
    res.setHeader('Content-Type', type); res.end(data)
  } catch { res.writeHead(404); res.end() }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
let browser
try {
  browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  const context = browser.defaultBrowserContext()
  await context.overridePermissions(origin, ['geolocation', 'accelerometer', 'gyroscope', 'magnetometer'])
  const page = await browser.newPage()
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 1 })
  await page.setGeolocation({ latitude: 43.184, longitude: 3.003, accuracy: 10 })
  const errors = []
  const violations = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.exposeFunction('recordCspViolation', (value) => violations.push(value))
  await page.evaluateOnNewDocument(() => {
    document.addEventListener('securitypolicyviolation', (event) => window.recordCspViolation({ directive: event.effectiveDirective, uri: event.blockedURI }))
  })
  await page.goto(origin, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 })
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes("C'est parti"))?.click())
  await page.waitForFunction(() => document.querySelector('.maplibregl-ctrl-geolocate')?.disabled === false)
  await page.click('.maplibregl-ctrl-geolocate')
  await page.waitForSelector('.maplibregl-user-location-dot', { timeout: 10000 })
  await page.evaluate(() => {
    window.compassTestTimer = setInterval(() => {
      const event = new Event('deviceorientationabsolute')
      Object.defineProperties(event, { alpha: { value: 270 }, absolute: { value: true } })
      window.dispatchEvent(event)
    }, 100)
  })
  await page.waitForSelector('.location-heading-beam')
  await page.evaluate(() => clearInterval(window.compassTestTimer))
  const beam = await page.$eval('.location-heading-beam', (el) => ({ width: getComputedStyle(el).width, transform: el.style.transform, background: getComputedStyle(el).backgroundImage }))
  assert.equal(beam.width, '100px')
  assert.equal(beam.transform, 'rotate(90deg)')
  assert.match(beam.background, /conic-gradient/)
  const layout = await page.$eval('.maplibregl-map', (el) => ({ width: el.clientWidth, height: el.clientHeight }))
  assert.equal(layout.width, 412)
  assert.ok(layout.height > 800)
  assert.deepEqual(errors, [])
  // JSON-LD is not executable. Unexpected worker/connect/script blocks fail.
  assert.deepEqual(violations, [])
  await fs.mkdir('docs/security', { recursive: true })
  await page.screenshot({ path: 'docs/security/map-security-smoke.png' })
  await page.goto(origin + '/privacy.html', { waitUntil: 'domcontentloaded' })
  assert.equal(await page.title(), 'Confidentialité — Survimap')
  await page.waitForSelector('#clear-personal')
  console.log(JSON.stringify({ layout, beam, pageErrors: errors, cspViolations: violations, privacyPage: true }, null, 2))
} finally {
  await browser?.close()
  await new Promise((resolve) => server.close(resolve))
}
