// Build first. Uses temporary puppeteer-core via PUPPETEER_MODULE_PATH.
import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
import { pages } from '../seo/content.mjs'

const { default: puppeteer } = await import(pathToFileURL(process.env.PUPPETEER_MODULE_PATH).href)
const headers = JSON.parse(await fs.readFile('vercel.json', 'utf8')).headers[0].headers
const root = path.resolve('dist')
const server = http.createServer(async (req, res) => {
  for (const { key, value } of headers) res.setHeader(key, value)
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname === '/api/checkins') { res.setHeader('Content-Type', 'application/json'); res.end('{}'); return }
  const file = path.resolve(root, '.' + url.pathname + (url.pathname.endsWith('/') ? 'index.html' : ''))
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return }
  try {
    const type = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(file)] ?? 'application/octet-stream'
    res.setHeader('Content-Type', type); res.end(await fs.readFile(file))
  } catch { res.writeHead(404); res.end() }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const origin = process.env.SEO_TEST_ORIGIN ?? `http://127.0.0.1:${server.address().port}`
let browser
try {
  browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const page = await browser.newPage()
  const errors = []
  const violations = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.exposeFunction('recordCspViolation', (value) => violations.push(value))
  await page.evaluateOnNewDocument(() => document.addEventListener('securitypolicyviolation', (event) => window.recordCspViolation(event.effectiveDirective)))
  await page.setViewport({ width: 390, height: 844 })
  await page.setJavaScriptEnabled(false)
  for (const guide of pages) {
    const response = await page.goto(`${origin}/${guide.slug}/`)
    assert.equal(response.status(), 200, guide.slug)
    assert.equal(await page.$eval('h1', (el) => el.textContent), guide.heading)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile overflow')
  }
  await fs.mkdir('docs/seo/previews', { recursive: true })
  await page.goto(origin + '/guides/')
  await page.screenshot({ path: 'docs/seo/previews/guides-mobile.png', fullPage: true })
  await page.setViewport({ width: 1280, height: 900 })
  await page.screenshot({ path: 'docs/seo/previews/guides-desktop.png', fullPage: true })
  await page.setJavaScriptEnabled(true)
  await page.goto(origin + pages[0].map)
  await page.waitForSelector('.maplibregl-canvas')
  assert.equal(await page.$eval('button[aria-label="Eau"]', (el) => el.getAttribute('aria-pressed')), 'true')
  assert.equal(await page.$eval('button[aria-label="Ravitaillement"]', (el) => el.getAttribute('aria-pressed')), 'false')
  // A controlling service worker must leave the static guide HTML intact.
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.reload()
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)
  await page.goto(origin + '/randonnee-bivouac/')
  assert.equal(await page.$eval('h1', (el) => el.textContent), pages[2].heading)
  await Promise.all([page.waitForNavigation(), page.click('a.cta')])
  await page.waitForSelector('.maplibregl-canvas')
  for (const label of ['Eau', 'Ravitaillement', 'Couchage & abris', 'Sentiers & chemins', 'Bivouac réglementé']) {
    assert.equal(await page.$eval(`button[aria-label="${label}"]`, (el) => el.getAttribute('aria-pressed')), 'true', label)
  }
  assert.deepEqual(errors, [])
  assert.deepEqual(violations, [])
  console.log(JSON.stringify({ guidesWithoutJavaScript: pages.length, mobileOverflow: false, filteredMapLinks: true, serviceWorkerNavigation: true, pageErrors: errors, cspViolations: violations }))
} finally {
  await browser?.close()
  await new Promise((resolve) => server.close(resolve))
}
