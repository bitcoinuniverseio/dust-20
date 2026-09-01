/**
 * DUST-20 documentation static site checks.
 *
 * Verifies, without a browser:
 *   - every internal link resolves to a file that exists
 *   - every in-page anchor resolves to an id that exists
 *   - every referenced asset exists
 *   - the rel="canonical" link, Open Graph and sitemap URLs use the real origin
 *   - no stale origin from the project's history survives anywhere
 *   - every page is listed in the sitemap, and vice versa
 *   - the generated artifacts parse and agree with the source of truth
 *   - the site's text policy holds across every published file
 *
 *   node tools/check-docs.mjs
 */

import { readFile, readdir, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { PAGES, ORIGIN, pageUrl, EXTRA_FILES } from '../assets/site-map.js'
import {
  FIELDS,
  SPEC_RULES,
  RECONCILIATIONS,
  OPEN_QUESTIONS,
  SAFETY,
  PROTOCOL,
  SPEC_VERSION,
  UNIVERSE_SUPPORT,
} from '../assets/protocol-data.js'
import { VECTORS, GLOSSARY } from '../assets/protocol-vectors.js'

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

/* ------------------------------------------------------------------- Run */

const htmlFiles = [...PAGES.map((page) => page.file), '404.html']
const documents = new Map()

for (const file of htmlFiles) {
  if (!(await exists(file))) {
    fail(`${file}: missing, run \`npm run generate\``)
    continue
  }
  documents.set(file, await readFile(path.join(root, file), 'utf8'))
}

/* --- ids present in each document --- */

const idsByFile = new Map()
for (const [file, html] of documents) {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]))
  idsByFile.set(file, ids)
}

/* --- every structural id the data model promises is really rendered --- */

const expectIds = (file, ids, label) => {
  const present = idsByFile.get(file)
  if (!present) return
  for (const id of ids) {
    if (!present.has(id)) fail(`${file}: ${label} id #${id} was not rendered`)
  }
}

expectIds(
  'specification.html',
  SPEC_RULES.map((rule) => rule.id),
  'numbered rule',
)
expectIds(
  'conformance.html',
  VECTORS.map((vector) => vector.id),
  'conformance vector',
)
expectIds(
  'glossary.html',
  GLOSSARY.map((entry) => `term-${slug(entry.term)}`),
  'glossary term',
)
expectIds(
  'reference.html',
  [...RECONCILIATIONS.map((item) => item.id), ...OPEN_QUESTIONS.map((item) => item.id)],
  'reference block',
)
expectIds(
  'safety.html',
  SAFETY.map((item) => item.id),
  'security control',
)

/* --- links and assets --- */

for (const [file, html] of documents) {
  const links = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1])

  for (const link of links) {
    if (/^(https?:|mailto:|tel:|data:|#)/.test(link) === false) {
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

const publishedFiles = [...htmlFiles, ...EXTRA_FILES, 'README.md', 'package.json']
for (const file of publishedFiles) {
  if (!(await exists(file))) continue
  const contents = await readFile(path.join(root, file), 'utf8')
  for (const stale of STALE_ORIGINS) {
    if (contents.includes(stale)) fail(`${file}: contains stale origin "${stale}"`)
  }
}

/* --- text policy: no em dash, and the word is only ever the HTML attribute -- */

const textPolicyFiles = [
  ...publishedFiles,
  'SECURITY.md',
  'CONTRIBUTING.md',
  'SUPPORT.md',
  'assets/site.css',
  'assets/site.js',
  'assets/tool.js',
  'assets/protocol.js',
  'assets/protocol-data.js',
  'assets/protocol-schema.js',
  'assets/protocol-vectors.js',
  'assets/site-map.js',
  'tools/build.mjs',
  'tools/check-docs.mjs',
  'tools/serve.mjs',
]

// Both offenders are built from parts so that this checker does not trip
// over its own source when it scans the repository.
const EM_DASH = String.fromCharCode(0x2014)
const BANNED_WORD = ['ca', 'nonical'].join('')
const BANNED_PATTERN = new RegExp(BANNED_WORD, 'i')
const ALLOWED_ATTRIBUTE = `rel="${BANNED_WORD}"`

for (const file of textPolicyFiles) {
  if (!(await exists(file))) continue
  const contents = await readFile(path.join(root, file), 'utf8')
  if (contents.includes(EM_DASH)) fail(`${file}: contains an em dash`)
  if (BANNED_PATTERN.test(contents.replaceAll(ALLOWED_ATTRIBUTE, ''))) {
    fail(`${file}: uses the word this project avoids, outside the permitted HTML attribute`)
  }
}

/* --- SEO metadata and page structure --- */

for (const page of PAGES) {
  const html = documents.get(page.file)
  if (!html) continue
  const url = pageUrl(page)

  if (!html.includes(`<link rel="canonical" href="${url}">`)) {
    fail(`${page.file}: the rel="canonical" URL is missing or not ${url}`)
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
  if (!html.includes('application/ld+json')) fail(`${page.file}: structured data is missing`)

  const h1s = (html.match(/<h1[\s>]/g) ?? []).length
  if (h1s !== 1) fail(`${page.file}: expected exactly one <h1>, found ${h1s}`)
  if (!html.includes('class="skip-link"')) fail(`${page.file}: skip link is missing`)
  if (!html.includes('id="main"')) fail(`${page.file}: main landmark is missing`)
  if (!html.includes('<footer class="colophon">')) fail(`${page.file}: colophon footer is missing`)
  if (!html.includes(`content/${page.file}`)) {
    fail(`${page.file}: colophon does not name its source path`)
  }
  if (!html.includes('https://docs.bitcoinuniverse.io')) {
    fail(`${page.file}: colophon does not link the documentation portal`)
  }
  if (!html.includes(SPEC_VERSION)) fail(`${page.file}: document version is not shown`)

  // Every image and diagram carries a text alternative.
  for (const svg of html.match(/<svg[\s\S]*?<\/svg>/g) ?? []) {
    if (svg.includes('aria-hidden="true"')) continue
    if (!svg.includes('role="img"') || !svg.includes('aria-labelledby=')) {
      fail(`${page.file}: an inline SVG has no accessible name`)
    }
    if (!svg.includes('<title') || !svg.includes('<desc')) {
      fail(`${page.file}: an inline SVG is missing title or desc`)
    }
  }
  for (const img of html.match(/<img[^>]*>/g) ?? []) {
    if (!/\salt="/.test(img)) fail(`${page.file}: an <img> has no alt attribute`)
  }
}

/* --- no page can overflow horizontally, and headings never skip a level --- */

for (const [file, html] of documents) {
  const tables = (html.match(/<table/g) ?? []).length
  const wrapped = (html.match(/<div class="scroll">\s*<table/g) ?? []).length
  if (tables !== wrapped) {
    fail(`${file}: ${tables - wrapped} table(s) are not inside a scrolling container`)
  }

  let previous = 0
  for (const match of html.matchAll(/<h([1-4])[\s>]/g)) {
    const level = Number(match[1])
    if (previous && level > previous + 1) {
      fail(`${file}: heading level jumps from h${previous} to h${level}`)
      break
    }
    previous = level
  }
}

/* --- sitemap --- */

if (await exists('sitemap.xml')) {
  const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8')
  for (const page of PAGES) {
    if (!sitemap.includes(`<loc>${pageUrl(page)}</loc>`)) fail(`sitemap.xml: missing ${pageUrl(page)}`)
  }
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
  for (const loc of locs) {
    if (!PAGES.some((page) => pageUrl(page) === loc)) {
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
    fail('robots.txt: sitemap line does not point at the published origin')
  }
} else {
  fail('robots.txt: missing')
}

/* --- machine-readable artifacts --- */

for (const artifact of ['docs.json', 'conformance.json', 'search-index.json', 'docs.manifest.json']) {
  if (!(await exists(artifact))) {
    fail(`${artifact}: missing`)
    continue
  }
  const raw = await readFile(path.join(root, artifact), 'utf8')
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    fail(`${artifact}: is not valid JSON, ${error.message}`)
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
    if (parsed.universeSupport?.marketplace?.availability !== 'read-only') {
      fail('docs.json: the recorded marketplace availability is not read-only')
    }
  }
  if (artifact === 'conformance.json' && parsed.cases?.length !== VECTORS.length) {
    fail(
      `conformance.json: has ${parsed.cases?.length} cases, source of truth has ${VECTORS.length}`,
    )
  }
  if (artifact === 'search-index.json') {
    if (!Array.isArray(parsed.entries) || parsed.entries.length < 80) {
      fail(`search-index.json: only ${parsed.entries?.length} entries, expected at least 80`)
    }
    for (const entry of parsed.entries ?? []) {
      for (const key of ['u', 't', 'h', 's']) {
        if (typeof entry[key] !== 'string') {
          fail(`search-index.json: an entry is missing "${key}"`)
          break
        }
      }
    }
  }
  if (artifact === 'docs.manifest.json') {
    if (parsed.repository !== 'bitcoinuniverseio/dust-20') {
      fail('docs.manifest.json: repository is wrong')
    }
    if (parsed.classification !== 'protocol') fail('docs.manifest.json: classification is wrong')
    if (parsed.sourceRef !== 'main') fail('docs.manifest.json: sourceRef is wrong')
    if (!/^[0-9a-f]{40}$/.test(parsed.lastVerified?.commit ?? '')) {
      fail('docs.manifest.json: lastVerified.commit is not a 40-hex SHA')
    }
  }
}

/* --- llms.txt --- */

if (await exists('llms.txt')) {
  const llms = await readFile(path.join(root, 'llms.txt'), 'utf8')
  if (!llms.includes(ORIGIN)) fail('llms.txt: does not reference the published origin')
  for (const field of FIELDS) {
    if (!llms.includes(`### ${field.name} `)) fail(`llms.txt: missing field ${field.name}`)
  }
  for (const page of PAGES) {
    if (!llms.includes(pageUrl(page))) fail(`llms.txt: missing page ${pageUrl(page)}`)
  }
  for (const rule of SPEC_RULES) {
    if (!llms.includes(rule.id)) fail(`llms.txt: missing rule ${rule.id}`)
  }
  if (!llms.includes(UNIVERSE_SUPPORT.marketplace.mutationGate)) {
    fail('llms.txt: does not state the recorded marketplace mutation gate')
  }
} else {
  fail('llms.txt: missing')
}

/* --- assets referenced by the pages actually exist --- */

const assetFiles = await readdir(path.join(root, 'assets'))
for (const required of [
  'site.css',
  'site.js',
  'tool.js',
  'protocol.js',
  'protocol-schema.js',
  'protocol-data.js',
  'protocol-vectors.js',
  'site-map.js',
  'favicon.svg',
  'og.svg',
]) {
  if (!assetFiles.includes(required)) fail(`assets/${required}: missing`)
}

/* --- budgets --- */

const sizeOf = async (relative) => (await readFile(path.join(root, relative))).length
const cssBytes = await sizeOf('assets/site.css')
if (cssBytes > 50_000) fail(`assets/site.css is ${cssBytes} bytes, over the 50KB budget`)
const shellJs = await sizeOf('assets/site.js')
const toolJs =
  (await sizeOf('assets/tool.js')) +
  (await sizeOf('assets/protocol.js')) +
  (await sizeOf('assets/protocol-schema.js'))
if (shellJs + toolJs > 60_000) {
  fail(`JavaScript on the heaviest page is ${shellJs + toolJs} bytes, over the 60KB budget`)
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

notes.push(
  `${PAGES.length} pages, ${SPEC_RULES.length} numbered rules, ${FIELDS.length} fields, ${VECTORS.length} conformance cases`,
)
notes.push(`published origin ${ORIGIN}`)
notes.push(`document ${SPEC_VERSION}, revised ${PROTOCOL.updated}`)
notes.push(`css ${cssBytes} bytes, shell js ${shellJs} bytes, tool js ${toolJs} bytes`)

if (failures.length > 0) {
  console.error(`\nDocumentation checks failed (${failures.length}):\n`)
  for (const failure of failures) console.error(`  x ${failure}`)
  console.error('')
  process.exit(1)
}

console.log('Documentation checks passed.')
for (const note of notes) console.log(`  . ${note}`)
