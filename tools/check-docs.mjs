/**
 * DUST-20 documentation — static site checks.
 *
 * Verifies, without a browser:
 *   - every internal link resolves to a file that exists
 *   - every in-page anchor resolves to an id that exists (including ids that
 *     are generated at runtime from the protocol data model)
 *   - every referenced asset exists
 *   - canonical, Open Graph and sitemap URLs all use the real Pages origin
 *   - no stale origin from the project's history survives anywhere
 *   - every page is listed in the sitemap, and vice versa
 *   - the generated artifacts parse and agree with the source of truth
 *
 *   node tools/check-docs.mjs
 */

import { readFile, readdir, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { PAGES, ORIGIN, canonical, EXTRA_FILES } from '../assets/site-map.js'
import { FIELDS, RULES, RECONCILIATIONS, OPEN_QUESTIONS, INDEXER_STAGES, SAFETY, PROTOCOL } from '../assets/protocol-data.js'
import { VECTORS, GLOSSARY, FAQ, SCENARIOS } from '../assets/protocol-vectors.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const failures = []
const notes = []

const fail = (message) => failures.push(message)

/** Origins that appeared in this project's history and must never come back. */
const STALE_ORIGINS = [
  'bitcoinuniverse.github.io',
  'bitcoin-universe-global.github.io',
  'dust-20-docs',
  'github.com/bitcoinuniverse/',
  'github.com/bitcoinuniverse"',
]

const exists = async (relative) => {
  try {
    await access(path.join(root, relative))
    return true
  } catch {
    return false
  }
}

const slug = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * Ids that assets/app.js creates at runtime from the data model.
 * The checker knows about them so a link into generated content is still
 * verified rather than skipped.
 */
function runtimeIds(file) {
  switch (file) {
    case 'reference.html':
      return [
        ...FIELDS.map((field) => `field-${field.name}`),
        ...RULES.map((rule) => `rule-${rule.id}`),
        ...RECONCILIATIONS.map((item) => `reconcile-${item.id}`),
        ...OPEN_QUESTIONS.map((item) => `open-${item.id}`),
      ]
    case 'conformance.html':
      return VECTORS.map((vector) => `case-${vector.id}`)
    case 'glossary.html':
      return [
        ...GLOSSARY.map((entry) => `term-${slug(entry.term)}`),
        ...FAQ.map((entry) => `faq-${slug(entry.q)}`),
      ]
    case 'indexer.html':
      return INDEXER_STAGES.map((stage) => `stage-${stage.id}`)
    case 'safety.html':
      return SAFETY.map((item) => `safety-${item.id}`)
    case 'transactions.html':
    case 'how-it-works.html':
      return SCENARIOS.map((scenario) => `scenario-${scenario.id}`)
    default:
      return []
  }
}

/* ------------------------------------------------------------------- Run */

const htmlFiles = [...PAGES.map((page) => page.file), '404.html']
const documents = new Map()

for (const file of htmlFiles) {
  if (!(await exists(file))) {
    fail(`${file}: missing — run \`npm run generate\``)
    continue
  }
  documents.set(file, await readFile(path.join(root, file), 'utf8'))
}

/* --- ids present in each document --- */

const idsByFile = new Map()
for (const [file, html] of documents) {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]))
  for (const id of runtimeIds(file)) ids.add(id)
  idsByFile.set(file, ids)
}

/* --- links and assets --- */

for (const [file, html] of documents) {
  const links = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1])

  for (const link of links) {
    if (/^(https?:|mailto:|tel:|data:|#)/.test(link) === false) {
      // A relative path: strip any fragment and resolve against the site root.
      const [target, fragment] = link.split('#')
      const resolved =
        target === '' || target === './'
          ? 'index.html'
          : target.replace(/^\/dust-20\//, '').replace(/^\.\//, '')
      const finalTarget = resolved === '' ? 'index.html' : resolved

      if (!(await exists(finalTarget))) {
        fail(`${file}: link to "${link}" but ${finalTarget} does not exist`)
        continue
      }
      if (fragment) {
        const ids = idsByFile.get(finalTarget)
        if (ids && !ids.has(fragment)) {
          fail(`${file}: link to "${link}" but #${fragment} is not an id in ${finalTarget}`)
        }
      }
    } else if (link.startsWith('#')) {
      const fragment = link.slice(1)
      if (fragment && !idsByFile.get(file).has(fragment)) {
        fail(`${file}: in-page link to #${fragment} but no such id exists`)
      }
    }
  }
}

/* --- stale origins --- */

const allFiles = [...htmlFiles, ...EXTRA_FILES, 'README.md', 'package.json']
for (const file of allFiles) {
  if (!(await exists(file))) continue
  const contents = await readFile(path.join(root, file), 'utf8')
  for (const stale of STALE_ORIGINS) {
    if (contents.includes(stale)) {
      fail(`${file}: contains stale origin "${stale}"`)
    }
  }
}

/* --- SEO metadata --- */

for (const page of PAGES) {
  const html = documents.get(page.file)
  if (!html) continue
  const url = canonical(page)

  if (!html.includes(`<link rel="canonical" href="${url}">`)) {
    fail(`${page.file}: canonical URL is missing or not ${url}`)
  }
  if (!html.includes(`<meta property="og:url" content="${url}">`)) {
    fail(`${page.file}: og:url is missing or not ${url}`)
  }
  if (!/<meta name="description" content="[^"]{50,}">/.test(html)) {
    fail(`${page.file}: description meta tag is missing or too short`)
  }
  if (!/<title>[^<]{10,}<\/title>/.test(html)) {
    fail(`${page.file}: title is missing or too short`)
  }
  if (!html.includes('application/ld+json')) {
    fail(`${page.file}: structured data is missing`)
  }
  // Exactly one h1 per page.
  const h1s = (html.match(/<h1[\s>]/g) ?? []).length
  if (h1s !== 1) fail(`${page.file}: expected exactly one <h1>, found ${h1s}`)
  // Skip link and main landmark.
  if (!html.includes('class="skip-link"')) fail(`${page.file}: skip link is missing`)
  if (!html.includes('id="main"')) fail(`${page.file}: main landmark is missing`)
}

/* --- sitemap --- */

if (await exists('sitemap.xml')) {
  const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8')
  for (const page of PAGES) {
    if (!sitemap.includes(`<loc>${canonical(page)}</loc>`)) {
      fail(`sitemap.xml: missing ${canonical(page)}`)
    }
  }
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
  for (const loc of locs) {
    if (!PAGES.some((page) => canonical(page) === loc)) {
      fail(`sitemap.xml: lists ${loc}, which is not a documented page`)
    }
  }
  if (locs.length !== PAGES.length) {
    fail(`sitemap.xml: has ${locs.length} entries for ${PAGES.length} pages`)
  }
} else {
  fail('sitemap.xml: missing')
}

/* --- robots --- */

if (await exists('robots.txt')) {
  const robots = await readFile(path.join(root, 'robots.txt'), 'utf8')
  if (!robots.includes(`Sitemap: ${ORIGIN}sitemap.xml`)) {
    fail('robots.txt: sitemap line does not point at the canonical origin')
  }
} else {
  fail('robots.txt: missing')
}

/* --- machine-readable artifacts --- */

for (const artifact of ['docs.json', 'conformance.json']) {
  if (!(await exists(artifact))) {
    fail(`${artifact}: missing`)
    continue
  }
  const raw = await readFile(path.join(root, artifact), 'utf8')
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    fail(`${artifact}: is not valid JSON — ${error.message}`)
    continue
  }
  if (artifact === 'docs.json') {
    if (parsed.fields?.length !== FIELDS.length) {
      fail(`docs.json: has ${parsed.fields?.length} fields, source of truth has ${FIELDS.length}`)
    }
    if (parsed.pages?.length !== PAGES.length) {
      fail(`docs.json: has ${parsed.pages?.length} pages, site map has ${PAGES.length}`)
    }
    if (parsed.protocol?.site !== ORIGIN) {
      fail(`docs.json: protocol.site is ${parsed.protocol?.site}, expected ${ORIGIN}`)
    }
  }
  if (artifact === 'conformance.json') {
    if (parsed.cases?.length !== VECTORS.length) {
      fail(
        `conformance.json: has ${parsed.cases?.length} cases, source of truth has ${VECTORS.length}`,
      )
    }
  }
}

/* --- llms.txt --- */

if (await exists('llms.txt')) {
  const llms = await readFile(path.join(root, 'llms.txt'), 'utf8')
  if (!llms.includes(ORIGIN)) fail('llms.txt: does not reference the canonical origin')
  for (const field of FIELDS) {
    if (!llms.includes(`### ${field.name} `)) fail(`llms.txt: missing field ${field.name}`)
  }
  for (const page of PAGES) {
    if (!llms.includes(canonical(page))) fail(`llms.txt: missing page ${canonical(page)}`)
  }
} else {
  fail('llms.txt: missing')
}

/* --- assets referenced by the pages actually exist --- */

const assetFiles = await readdir(path.join(root, 'assets'))
for (const required of [
  'site.css',
  'site.js',
  'app.js',
  'protocol.js',
  'protocol-data.js',
  'protocol-vectors.js',
  'site-map.js',
  'favicon.svg',
  'og.svg',
]) {
  if (!assetFiles.includes(required)) fail(`assets/${required}: missing`)
}

/* --- content fragments match the page list --- */

const fragments = await readdir(path.join(root, 'content'))
for (const page of PAGES) {
  if (!fragments.includes(page.file)) fail(`content/${page.file}: missing fragment`)
}
for (const fragment of fragments) {
  if (!PAGES.some((page) => page.file === fragment)) {
    fail(`content/${fragment}: fragment has no page in the site map`)
  }
}

/* --- every page section id declared in the site map exists --- */

for (const page of PAGES) {
  const ids = idsByFile.get(page.file)
  if (!ids) continue
  for (const section of page.sections) {
    if (!ids.has(section.id)) {
      fail(`${page.file}: site map declares section #${section.id} but the page has no such id`)
    }
  }
}

/* --------------------------------------------------------------- Report */

notes.push(`${PAGES.length} pages, ${FIELDS.length} fields, ${VECTORS.length} conformance cases`)
notes.push(`canonical origin ${ORIGIN}`)
notes.push(`protocol data updated ${PROTOCOL.updated}`)

if (failures.length > 0) {
  console.error(`\nDocumentation checks failed (${failures.length}):\n`)
  for (const failure of failures) console.error(`  ✗ ${failure}`)
  console.error('')
  process.exit(1)
}

console.log('Documentation checks passed.')
for (const note of notes) console.log(`  · ${note}`)
