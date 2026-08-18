/**
 * DUST-20 documentation — static site builder.
 *
 * Wraps the page fragments in content/ with a single shared layout, and
 * generates every machine-readable artifact from the same source of truth
 * the site itself renders from (assets/protocol-data.js and
 * assets/protocol-vectors.js).
 *
 * This is deliberately not a framework. It reads HTML, writes HTML, and the
 * output is committed so GitHub Pages serves plain static files with no build
 * step of its own. Clone, open a file, edit, run `npm run generate`, done.
 *
 *   node tools/build.mjs           write every page and artifact
 *   node tools/build.mjs --check   fail if anything on disk is out of date
 */

import { readFile, writeFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { PAGES, ORIGIN, canonical, AUDIENCES } from '../assets/site-map.js'
import {
  PROTOCOL,
  OPERATIONS,
  FIELDS,
  FORMULAS,
  RULES,
  RECONCILIATIONS,
  OPEN_QUESTIONS,
  STATUS,
  SOURCES,
  LIMITS,
  INDEXER_STAGES,
  ALLOCATION_RECORD,
  SAFETY,
} from '../assets/protocol-data.js'
import { VECTORS, EXAMPLES, SCENARIOS, GLOSSARY, FAQ } from '../assets/protocol-vectors.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const check = process.argv.includes('--check')
const problems = []
let written = 0

/* ----------------------------------------------------------------- Layout */

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  )

function head(page) {
  const url = canonical(page)
  const image = `${ORIGIN}assets/og.svg`
  return `  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escape(page.title)}</title>
  <meta name="description" content="${escape(page.description)}">
  <link rel="canonical" href="${url}">
  <meta name="theme-color" content="#3b2d19">
  <meta name="color-scheme" content="light">
  <meta property="og:type" content="${page.file === 'index.html' ? 'website' : 'article'}">
  <meta property="og:site_name" content="DUST-20 documentation">
  <meta property="og:title" content="${escape(page.title)}">
  <meta property="og:description" content="${escape(page.description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${image}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escape(page.title)}">
  <meta name="twitter:description" content="${escape(page.description)}">
  <meta name="twitter:image" content="${image}">
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="assets/site.css">
  <script type="module" src="assets/site.js"></script>
  <script type="module" src="assets/app.js"></script>
  <script type="application/ld+json">${JSON.stringify(structuredData(page))}</script>`
}

function structuredData(page) {
  const base = {
    '@context': 'https://schema.org',
    '@type': page.file === 'index.html' ? 'WebSite' : 'TechArticle',
    name: page.title,
    headline: page.heading,
    description: page.description,
    url: canonical(page),
    inLanguage: 'en',
    dateModified: PROTOCOL.updated,
    isPartOf: { '@type': 'WebSite', name: 'DUST-20 documentation', url: ORIGIN },
    publisher: { '@type': 'Organization', name: 'Bitcoin Universe', url: PROTOCOL.organization },
  }
  if (page.file === 'index.html') {
    base.about = {
      '@type': 'Thing',
      name: PROTOCOL.name,
      description: PROTOCOL.summary,
    }
  }
  if (page.file === 'glossary.html') {
    base['@type'] = 'FAQPage'
    base.mainEntity = FAQ.map((entry) => ({
      '@type': 'Question',
      name: entry.q,
      acceptedAnswer: { '@type': 'Answer', text: entry.a },
    }))
  }
  return base
}

function header(page) {
  const links = PAGES.map((entry) => {
    const current = entry.file === page.file ? ' aria-current="page"' : ''
    return `<a href="${entry.path}"${current}>${escape(entry.nav)}</a>`
  }).join('')

  return `  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="./"><span class="brand-mark" aria-hidden="true">DUST</span><span>DUST-20</span></a>
      <nav class="site-nav" data-site-nav aria-label="Primary">${links}</nav>
      <div class="header-tools">
        <button class="search-trigger" type="button" data-search-trigger aria-label="Search the documentation">
          <span aria-hidden="true">Search</span><kbd>/</kbd>
        </button>
        <button class="menu-toggle" type="button" data-menu-toggle aria-expanded="false" aria-controls="primary-navigation">Menu</button>
      </div>
    </div>
  </header>
  <dialog class="search-dialog" data-search-dialog aria-label="Search the documentation">
    <form method="dialog" role="search">
      <input type="search" placeholder="Search pages, fields, rules, terms…" aria-label="Search query" autocomplete="off">
      <button class="button small secondary" type="button" onclick="this.closest('dialog').close()">Close</button>
    </form>
    <ul class="search-results" data-search-results></ul>
  </dialog>`
}

function sidebar(page) {
  const items = PAGES.map((entry) => {
    const current = entry.file === page.file ? ' aria-current="page"' : ''
    return `        <li><a href="${entry.path}"${current}>${escape(entry.nav)}</a></li>`
  }).join('\n')

  return `    <aside class="docs-sidebar">
      <nav aria-label="Documentation">
        <h2>Documentation</h2>
        <ul class="sidebar-list">
${items}
        </ul>
      </nav>
    </aside>`
}

function toc(page) {
  if (page.sections.length === 0) return '    <div class="docs-toc"></div>'
  const items = page.sections
    .map((section) => `        <li><a href="#${section.id}">${escape(section.label)}</a></li>`)
    .join('\n')
  return `    <aside class="docs-toc">
      <nav aria-label="On this page">
        <h2>On this page</h2>
        <ul class="toc-list">
${items}
        </ul>
      </nav>
    </aside>`
}

function pageNav(page) {
  const index = PAGES.findIndex((entry) => entry.file === page.file)
  const previous = PAGES[index - 1]
  const next = PAGES[index + 1]
  if (!previous && !next) return ''
  const parts = []
  if (previous) {
    parts.push(
      `      <a href="${previous.path}"><em>Previous</em><b>${escape(previous.nav)}</b></a>`,
    )
  }
  if (next) {
    parts.push(`      <a href="${next.path}"><em>Next</em><b>${escape(next.nav)}</b></a>`)
  }
  return `    <nav class="page-nav" aria-label="Pagination">\n${parts.join('\n')}\n    </nav>`
}

function footer() {
  const docLinks = PAGES.slice(0, 5)
    .map((entry) => `<li><a href="${entry.path}">${escape(entry.nav)}</a></li>`)
    .join('')
  const moreLinks = PAGES.slice(5)
    .map((entry) => `<li><a href="${entry.path}">${escape(entry.nav)}</a></li>`)
    .join('')

  return `  <footer class="footer">
    <div class="footer-inner">
      <div>
        <span class="footer-brand-mark" aria-hidden="true">DUST</span>
        <h2>DUST-20</h2>
        <p>${escape(PROTOCOL.summary)}</p>
      </div>
      <div>
        <h2>Documentation</h2>
        <ul>${docLinks}</ul>
      </div>
      <div>
        <h2>More</h2>
        <ul>${moreLinks}</ul>
      </div>
      <div>
        <h2>Machine readable</h2>
        <ul>
          <li><a href="llms.txt">llms.txt</a></li>
          <li><a href="docs.json">docs.json</a></li>
          <li><a href="conformance.json">conformance.json</a></li>
          <li><a href="${PROTOCOL.repository}">Source repository</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      Experimental documentation, last updated ${PROTOCOL.updated}. Review every Bitcoin transaction in your wallet before signing — this site never asks for a key and never signs anything.
    </div>
  </footer>`
}

function layout(page, content) {
  const bodyId = page.file === 'index.html' ? 'home' : page.file.replace(/\.html$/, '')
  const isLanding = page.file === 'index.html'

  const main = isLanding
    ? `  <main id="main">\n${content}\n  </main>`
    : `  <div class="docs-layout">
${sidebar(page)}
    <main class="docs-main" id="main">
${content}
${pageNav(page)}
    </main>
${toc(page)}
  </div>`

  return `<!doctype html>
<html lang="en">
<head>
${head(page)}
</head>
<body data-page="${bodyId}">
${header(page)}
${main}
${footer()}
</body>
</html>
`
}

/* ------------------------------------------------------------- Artifacts */

function buildLlmsTxt() {
  const lines = []
  const push = (...entries) => lines.push(...entries)

  push(`# ${PROTOCOL.name} documentation`)
  push('')
  push(`> ${PROTOCOL.summary}`)
  push('')
  push(`- Site: ${ORIGIN}`)
  push(`- Source: ${PROTOCOL.repository}`)
  push(`- Machine-readable protocol model: ${ORIGIN}docs.json`)
  push(`- Conformance fixtures: ${ORIGIN}conformance.json`)
  push(`- Chain: ${PROTOCOL.chain}`)
  push(`- Classification: ${PROTOCOL.classification}`)
  push(`- Last updated: ${PROTOCOL.updated}`)
  push('')

  push('## How to read this document')
  push('')
  push(
    'Every statement carries a provenance label. Nothing below is asserted as a protocol rule merely to make the documentation look complete.',
  )
  push('')
  for (const status of Object.values(STATUS)) {
    push(`- ${status.short}: ${status.description}`)
  }
  push('')

  push('## Sources')
  push('')
  for (const source of Object.values(SOURCES)) {
    push(`- ${source.label} — ${source.url}`)
    push(`  ${source.note}`)
  }
  push('')

  push('## Pages')
  push('')
  for (const page of PAGES) {
    push(`- [${page.nav}](${canonical(page)}): ${page.description}`)
  }
  push('')

  push('## Operations')
  push('')
  for (const operation of OPERATIONS) {
    push(`### ${operation.label} [${STATUS[operation.status].short}]`)
    push('')
    push(operation.summary)
    push('')
    push(operation.detail)
    push('')
    if (operation.carrier === 'inscription') {
      push(`Required fields: ${operation.required.join(', ')}`)
      push(
        `Optional fields: ${operation.optional.length > 0 ? operation.optional.join(', ') : 'none'}`,
      )
      push('')
    }
  }

  push('## Field reference')
  push('')
  for (const field of FIELDS) {
    push(`### ${field.name} [${STATUS[field.status].short}]`)
    push('')
    push(`- Operations: ${field.ops.join(', ')}`)
    push(`- Type: ${field.type}`)
    push(`- ${field.required ? 'Required' : 'Optional'}`)
    push(`- Constraint: ${field.constraint}`)
    push(`- Example: ${field.example}`)
    push(`- Rule: ${field.rule}`)
    push(`- Provenance: ${field.source.map((id) => SOURCES[id].label).join(' + ')}`)
    push(`- Notes: ${field.notes}`)
    push('')
  }

  push('## Formulas')
  push('')
  for (const formula of FORMULAS) {
    push(`- ${formula.expression} [${STATUS[formula.status].short}]`)
    push(`  ${formula.plain} Example: ${formula.example}`)
  }
  push('')

  push('## Rules')
  push('')
  for (const rule of RULES) {
    push(`### ${rule.title} [${STATUS[rule.status].short}]`)
    push('')
    push(rule.body)
    push('')
  }

  push('## Examples')
  push('')
  for (const example of EXAMPLES) {
    push(`### ${example.title}`)
    push('')
    push('```json')
    push(JSON.stringify(example.payload, null, 2))
    push('```')
    push('')
    push(example.notes)
    push('')
  }

  push('## Where legacy documentation and the current implementation disagree')
  push('')
  for (const item of RECONCILIATIONS) {
    push(`### ${item.title} [${STATUS[item.status].short}]`)
    push('')
    push(`- Legacy: ${item.legacy}`)
    push(`- Current: ${item.current}`)
    push(`- Resolution: ${item.resolution}`)
    push('')
  }

  push('## Open questions')
  push('')
  for (const item of OPEN_QUESTIONS) {
    push(`### ${item.question} [UNRESOLVED]`)
    push('')
    push(`- Why it matters: ${item.why}`)
    push(`- Safe posture: ${item.posture}`)
    push('')
  }

  push('## Indexer pipeline')
  push('')
  for (const stage of INDEXER_STAGES) {
    push(`### ${stage.label} — ${stage.title} [${STATUS[stage.status].short}]`)
    push('')
    push(stage.body)
    push('')
  }

  push('## Safety requirements')
  push('')
  for (const item of SAFETY) {
    push(`- [${item.severity}] ${item.title}: ${item.body}`)
  }
  push('')

  push('## Conformance summary')
  push('')
  push(
    `${VECTORS.length} executable cases are published at ${ORIGIN}conformance.json and rendered at ${ORIGIN}conformance.html.`,
  )
  push('')
  for (const vector of VECTORS) {
    const outcome = vector.expect === 'accept' ? 'ACCEPT' : `REJECT (${vector.code})`
    push(`- ${vector.id}: ${outcome} — ${vector.title}. ${vector.reason}`)
  }
  push('')

  return `${lines.join('\n').trimEnd()}\n`
}

function buildDocsJson() {
  return `${JSON.stringify(
    {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      generator: 'tools/build.mjs from assets/protocol-data.js',
      warning:
        'Generated file. Edit assets/protocol-data.js and run `npm run generate`; changes made here are overwritten.',
      protocol: PROTOCOL,
      updated: PROTOCOL.updated,
      limits: {
        maxBitcoinSats: LIMITS.MAX_BITCOIN_SATS.toString(),
        maxAtomic: LIMITS.MAX_ATOMIC.toString(),
        maxContentBytes: LIMITS.MAX_CONTENT_BYTES,
        minTickBytes: LIMITS.MIN_TICK_BYTES,
        maxTickBytes: LIMITS.MAX_TICK_BYTES,
        decimals: LIMITS.DECIMALS,
      },
      statuses: STATUS,
      sources: SOURCES,
      operations: OPERATIONS,
      fields: FIELDS,
      formulas: FORMULAS,
      rules: RULES,
      reconciliations: RECONCILIATIONS,
      openQuestions: OPEN_QUESTIONS,
      indexerStages: INDEXER_STAGES,
      allocationRecord: ALLOCATION_RECORD,
      safety: SAFETY,
      glossary: GLOSSARY,
      faq: FAQ,
      pages: PAGES.map((page) => ({
        path: page.path,
        url: canonical(page),
        title: page.title,
        nav: page.nav,
        description: page.description,
        sections: page.sections,
      })),
    },
    null,
    2,
  )}\n`
}

function buildConformanceJson() {
  return `${JSON.stringify(
    {
      generator: 'tools/build.mjs from assets/protocol-vectors.js',
      warning:
        'Generated file. Edit assets/protocol-vectors.js and run `npm run generate`; changes made here are overwritten.',
      updated: PROTOCOL.updated,
      documentation: `${ORIGIN}conformance.html`,
      note: 'Each case is executed live in the browser at the URL above and asserted by test/protocol.test.mjs.',
      referenceDeployment: VECTORS.find((vector) => vector.context?.deployment)?.context.deployment,
      count: VECTORS.length,
      cases: VECTORS.map((vector) => ({
        id: vector.id,
        group: vector.group,
        title: vector.title,
        expect: vector.expect,
        code: vector.code ?? null,
        status: vector.status,
        reason: vector.reason,
        context: vector.context ?? null,
        payload: vector.payload ?? null,
        raw: vector.raw ?? null,
      })),
      scenarios: SCENARIOS,
    },
    null,
    2,
  )}\n`
}

function buildSitemap() {
  const entries = PAGES.map(
    (page) => `  <url>
    <loc>${canonical(page)}</loc>
    <lastmod>${PROTOCOL.updated}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
  ).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`
}

function buildRobots() {
  return `User-agent: *
Allow: /

Sitemap: ${ORIGIN}sitemap.xml
`
}

/* ------------------------------------------------------------------- Run */

async function emit(relative, contents) {
  const target = path.join(root, relative)
  let existing = null
  try {
    existing = await readFile(target, 'utf8')
  } catch {
    existing = null
  }
  if (existing === contents) return
  if (check) {
    problems.push(relative)
    return
  }
  await writeFile(target, contents, 'utf8')
  written += 1
  console.log(`  wrote ${relative}`)
}

async function main() {
  console.log(check ? 'Checking generated files…' : 'Generating DUST-20 documentation…')

  const fragments = await readdir(path.join(root, 'content'))
  for (const page of PAGES) {
    if (!fragments.includes(page.file)) {
      throw new Error(`Missing content fragment for ${page.file} (expected content/${page.file})`)
    }
    const content = await readFile(path.join(root, 'content', page.file), 'utf8')
    await emit(page.file, layout(page, content.trimEnd()))
  }

  await emit('llms.txt', buildLlmsTxt())
  await emit('docs.json', buildDocsJson())
  await emit('conformance.json', buildConformanceJson())
  await emit('sitemap.xml', buildSitemap())
  await emit('robots.txt', buildRobots())

  if (check) {
    if (problems.length > 0) {
      console.error('\nOut of date — run `npm run generate`:')
      for (const problem of problems) console.error(`  ${problem}`)
      process.exitCode = 1
    } else {
      console.log('All generated files are up to date.')
    }
  } else {
    console.log(written === 0 ? 'Everything already up to date.' : `\nDone — ${written} file(s).`)
  }
}

await main()
