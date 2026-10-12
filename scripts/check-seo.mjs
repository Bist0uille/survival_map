import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import { JSDOM } from 'jsdom'
import { pages } from '../seo/content.mjs'

const origin = 'https://survimap.com'
const urls = ['/guides/', ...pages.map((page) => `/${page.slug}/`)]
const sitemap = await readFile('public/sitemap.xml', 'utf8')
const titles = new Set()
for (const pathname of urls) {
  const source = await readFile(`public${pathname}index.html`, 'utf8')
  const document = new JSDOM(source, { url: origin + pathname }).window.document
  assert.equal(document.documentElement.lang, 'fr')
  assert.equal(document.querySelectorAll('h1').length, 1, pathname)
  assert.equal(document.querySelector('link[rel="canonical"]').href, origin + pathname)
  assert.ok(document.querySelector('meta[name="description"]').content.length > 50)
  assert.ok(!titles.has(document.title), `Duplicate title: ${pathname}`)
  titles.add(document.title)
  assert.ok(sitemap.includes(`<loc>${origin + pathname}</loc>`), `Sitemap: ${pathname}`)
  for (const script of document.querySelectorAll('script')) {
    assert.equal(script.type, 'application/ld+json')
    const schema = JSON.parse(script.textContent)
    assert.equal(schema[0].url, origin + pathname)
  }
  for (const anchor of document.querySelectorAll('a[href]')) {
    const url = new URL(anchor.href)
    if (url.origin !== origin || url.pathname === '/' || anchor.getAttribute('href').startsWith('#')) continue
    await access('public' + url.pathname + (url.pathname.endsWith('/') ? 'index.html' : ''))
  }
}
console.log(`SEO : ${urls.length} pages contrôlées (titres, H1, canonique, données structurées, sitemap et liens).`)
