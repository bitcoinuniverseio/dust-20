/**
 * DUST-20 documentation static site builder.
 *
 * Wraps the page fragments in content/ with one shared layout, expands the
 * {{token}} placeholders inside them into tables generated from the data
 * model, and writes every machine-readable artifact from the same source.
 *
 * This is deliberately not a framework. It reads HTML, writes HTML, and the
 * output is committed so GitHub Pages serves plain static files with no build
 * step of its own. Because the tables are rendered here rather than in the
 * browser, the whole site reads with JavaScript disabled.
 *
 *   node tools/build.mjs           write every page and artifact
 *   node tools/build.mjs --check   fail if anything on disk is out of date
 */

import { readFile, writeFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { PAGES, GROUPS, ORIGIN, pageUrl, pagesInGroup, EXTRA_FILES } from '../assets/site-map.js'
import {
  PROTOCOL,
  DATASHEET,
  SPEC_VERSION,
  OPERATIONS,
  FIELDS,
  FORMULAS,
  SPEC_SECTIONS,
  SPEC_RULES,
  ANATOMY,
  STATE_TRANSITIONS,
  INVALIDITY,
  FEE_NOTES,
  LIMITATIONS,
  CHECKLIST,
  RECONCILIATIONS,
  OPEN_QUESTIONS,
  STATUS,
  SOURCES,
  LIMITS,
  INDEXER_STAGES,
  ALLOCATION_RECORD,
  UNIVERSE_SUPPORT,
  SAFETY,
  CHANGELOG,
} from '../assets/protocol-data.js'
import {
  VECTORS,
  EXAMPLES,
  SCENARIOS,
  GLOSSARY,
  FAQ,
  VECTOR_RULES,
  SCENARIO_RULES,
  SEARCH_ALIASES,
} from '../assets/protocol-vectors.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const check = process.argv.includes('--check')
const problems = []
let written = 0

const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  )

const strip = (value) =>
  String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const snippet = (value, length = 168) => {
  const text = strip(value)
  return text.length <= length ? text : `${text.slice(0, length - 1).trimEnd()}...`
}

const tag = (statusId) => {
  const status = STATUS[statusId]
  if (!status) return ''
  return `<span class="tag tag--${statusId}" title="${esc(status.description)}">${status.short}</span>`
}

const ruleLink = (id) =>
  `<a class="tag tag--ref" href="specification.html#${esc(id)}">${esc(id)}</a>`

// Turns "DUST-5.1, DUST-6.2" and "DUST-5.1 to DUST-5.7" into linked ids,
// leaving the connecting words as plain text.
const ruleLinks = (value) => esc(value).replace(/DUST-\d+\.\d+/g, (id) => ruleLink(id))

const table = (caption, head, rows) =>
  `<div class="scroll"><table class="tbl"><caption>${esc(caption)}</caption><thead><tr>${head
    .map((cell) => `<th>${esc(cell)}</th>`)
    .join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`

/* ----------------------------------------------------------- renderers -- */

const RENDER = {
  datasheet: () =>
    `<dl class="dsheet">${DATASHEET.map(
      (row) =>
        `<div><dt>${esc(row.key)}</dt><dd>${esc(row.value)}<small>${esc(row.note)}</small></dd></div>`,
    ).join('')}</dl>`,

  'status-legend': () =>
    table(
      'Provenance labels used throughout this document',
      ['Label', 'Meaning'],
      Object.values(STATUS).map(
        (status) =>
          `<tr><td>${tag(status.id)}</td><td><p>${esc(status.description)}</p></td></tr>`,
      ),
    ),

  sources: () =>
    table(
      'Sources this document is built from',
      ['Source', 'What it provides'],
      Object.values(SOURCES).map(
        (source) =>
          `<tr><td><a href="${esc(source.url)}">${esc(source.label)}</a></td><td><p>${esc(source.note)}</p></td></tr>`,
      ),
    ),

  operations: () =>
    table(
      'The four operations, and what physically carries each one',
      ['Operation', 'Carrier', 'Required fields', 'Optional', 'Provenance'],
      OPERATIONS.map(
        (operation) => `<tr>
          <td class="mono"><b>${esc(operation.label)}</b><small>${esc(operation.summary)}</small></td>
          <td class="mono">${operation.carrier === 'inscription' ? 'Inscription' : 'Bitcoin spend'}</td>
          <td class="mono">${operation.required.length ? esc(operation.required.join(' ')) : 'none'}</td>
          <td class="mono">${operation.optional.length ? esc(operation.optional.join(' ')) : 'none'}</td>
          <td>${tag(operation.status)}</td>
        </tr>`,
      ),
    ),

  'operation-detail': () =>
    `<dl class="kv">${OPERATIONS.map(
      (operation) =>
        `<div><dt>${esc(operation.label)}</dt><dd><p>${esc(operation.detail)}</p></dd></div>`,
    ).join('')}</dl>`,

  fields: () =>
    table(
      'Every field of every operation, with its exact constraint',
      ['Field', 'Ops', 'Type', 'Req', 'Bytes', 'Constraint and rule', 'Provenance'],
      FIELDS.map(
        (field) => `<tr>
          <td class="mono">${esc(field.name)}</td>
          <td class="mono">${esc(field.ops.join(' '))}</td>
          <td class="mono">${esc(field.type)}</td>
          <td class="mono">${field.required ? 'yes' : 'no'}</td>
          <td class="mono">${esc(field.bytes)}</td>
          <td><p>${esc(field.constraint)}</p><small>${esc(field.rule)} ${esc(field.notes)}</small></td>
          <td>${tag(field.status)}</td>
        </tr>`,
      ),
    ),

  formulas: () =>
    table(
      'Every arithmetic relationship in the protocol',
      ['Expression', 'Applies to', 'Meaning', 'Rule', 'Provenance'],
      FORMULAS.map(
        (formula) => `<tr>
          <td class="mono">${esc(formula.expression)}</td>
          <td class="mono">${esc(formula.op)}</td>
          <td><p>${esc(formula.plain)}</p><small>${esc(formula.example)}</small></td>
          <td>${ruleLink(formula.rule)}</td>
          <td>${tag(formula.status)}</td>
        </tr>`,
      ),
    ),

  fees: () =>
    `<dl class="kv">${FEE_NOTES.map(
      (note) =>
        `<div><dt>${esc(note.title)}</dt><dd><p>${esc(note.body)}</p></dd></div>`,
    ).join('')}</dl>`,

  limitations: () =>
    `<dl class="kv">${LIMITATIONS.map(
      (item) => `<div><dt>${esc(item.title)}</dt><dd><p>${esc(item.body)}</p></dd></div>`,
    ).join('')}</dl>`,

  checklist: () =>
    CHECKLIST.map(
      (group) =>
        `<h3 id="checklist-${esc(group.group.toLowerCase().replace(/[^a-z]+/g, '-'))}">${esc(group.group)}</h3>` +
        table(
          `${group.group} checklist`,
          ['Requirement', 'Rule'],
          group.items.map(
            (item) =>
              `<tr><td><p>${esc(item.text)}</p></td><td>${ruleLinks(item.rule)}</td></tr>`,
          ),
        ),
    ).join(''),

  reconciliations: () =>
    RECONCILIATIONS.map(
      (item) => `<div class="panel" id="${esc(item.id)}">
        <div class="panel-head"><h3>${esc(item.title)}</h3>${tag(item.status)}</div>
        <dl class="kv" style="border:0;margin:0">
          <div><dt>Legacy position</dt><dd><p>${esc(item.legacy)}</p></dd></div>
          <div><dt>Current implementation</dt><dd><p>${esc(item.current)}</p></dd></div>
          <div><dt>Resolution</dt><dd><p>${esc(item.resolution)}</p></dd></div>
        </dl>
      </div>`,
    ).join(''),

  'open-questions': () =>
    OPEN_QUESTIONS.map(
      (item) => `<div class="note note--warn" id="${esc(item.id)}">
        <span class="note-mark" aria-hidden="true">?</span>
        <div class="note-body">
          <p class="note-title">${esc(item.question)}</p>
          <p><b>Why it matters.</b> ${esc(item.why)}</p>
          <p><b>Safe posture.</b> ${esc(item.posture)}</p>
        </div>
      </div>`,
    ).join(''),

  anatomy: (which) => {
    const block = ANATOMY[which]
    return (
      table(
        block.caption,
        ['Part', 'Role', 'Requirement', 'Verified against'],
        block.rows.map(
          (row) => `<tr>
            <td class="mono">${esc(row.part)}</td>
            <td class="mono">${esc(row.role)}</td>
            <td><p>${esc(row.requirement)}</p></td>
            <td><small>${esc(row.checked)}</small></td>
          </tr>`,
        ),
      )
    )
  },

  transitions: () =>
    table(
      'Every state transition DUST-20 defines',
      ['From', 'Event', 'To', 'Rule', 'Accounting'],
      STATE_TRANSITIONS.map(
        (row) => `<tr>
          <td class="mono">${esc(row.from)}</td>
          <td><p>${esc(row.event)}</p></td>
          <td class="mono">${esc(row.to)}</td>
          <td>${ruleLinks(row.rule)}</td>
          <td><small>${esc(row.note)}</small></td>
        </tr>`,
      ),
    ),

  invalidity: () =>
    table(
      'Issue codes a reader emits, and the rule each one enforces',
      ['Issue code', 'Rule', 'Condition'],
      INVALIDITY.map(
        (row) => `<tr>
          <td class="mono">${esc(row.code)}</td>
          <td>${ruleLinks(row.rule)}</td>
          <td><p>${esc(row.summary)}</p></td>
        </tr>`,
      ),
    ),

  'indexer-stages': () =>
    `<ol class="cards">${INDEXER_STAGES.map(
      (stage, index) => `<li class="card">
        <span class="card-index">${String(index + 1).padStart(2, '0')} / ${esc(stage.label.toUpperCase())}</span>
        <h3>${esc(stage.title)}</h3>
        <p>${esc(stage.body)}</p>
      </li>`,
    ).join('')}</ol>`,

  'allocation-record': () =>
    table(
      'The minimum an allocation record must hold',
      ['Field', 'Why it exists', 'Minimum implementation'],
      ALLOCATION_RECORD.map(
        (row) => `<tr>
          <td class="mono">${esc(row.field)}</td>
          <td><p>${esc(row.why)}</p></td>
          <td><p>${esc(row.minimum)}</p></td>
        </tr>`,
      ),
    ),

  safety: () =>
    table(
      'Security controls, ordered by the cost of getting them wrong',
      ['Severity', 'Control', 'Detail'],
      SAFETY.map(
        (item) => `<tr id="${esc(item.id)}">
          <td class="mono">${esc(item.severity.toUpperCase())}</td>
          <td><b>${esc(item.title)}</b></td>
          <td><p>${esc(item.body)}</p></td>
        </tr>`,
      ),
    ),

  glossary: () =>
    `<dl class="kv">${GLOSSARY.map(
      (entry) =>
        `<div id="term-${esc(entry.term.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}"><dt>${esc(entry.term)}</dt><dd><p>${esc(entry.definition)}</p></dd></div>`,
    ).join('')}</dl>`,

  faq: () =>
    `<dl class="kv">${FAQ.map(
      (entry) => `<div><dt>${esc(entry.q)}</dt><dd><p>${esc(entry.a)}</p></dd></div>`,
    ).join('')}</dl>`,

  examples: () =>
    EXAMPLES.map(
      (example) => `<div class="panel" id="example-${esc(example.id)}">
        <div class="panel-head"><h3>${esc(example.title)}</h3><span class="tag tag--universe">${esc(example.op.toUpperCase())}</span></div>
        <div class="panel-body">
          <p>${esc(example.summary)}</p>
          <pre><code>${esc(JSON.stringify(example.payload, null, 2))}</code></pre>
          <p><small>${esc(example.notes)}</small></p>
        </div>
      </div>`,
    ).join(''),

  'vector-summary': () => {
    const accept = VECTORS.filter((vector) => vector.expect === 'accept').length
    const groups = [...new Set(VECTORS.map((vector) => vector.group))]
    return `<dl class="dsheet">
      <div><dt>Total vectors</dt><dd>${VECTORS.length}<small>Published at conformance.json</small></dd></div>
      <div><dt>Expected accept</dt><dd>${accept}<small>Payloads a reader must index</small></dd></div>
      <div><dt>Expected reject</dt><dd>${VECTORS.length - accept}<small>Each names the exact issue code</small></dd></div>
      <div><dt>Groups</dt><dd>${esc(groups.join(', '))}<small>Deploy, mint and reader shape</small></dd></div>
    </dl>`
  },

  vectors: () => {
    const groups = [...new Set(VECTORS.map((vector) => vector.group))]
    return groups
      .map((group) => {
        const items = VECTORS.filter((vector) => vector.group === group)
          .map((vector) => {
            const rule = VECTOR_RULES[vector.id]
            const expectation =
              vector.expect === 'accept'
                ? '<span class="verdict verdict--pass">ACCEPT</span>'
                : `<span class="verdict verdict--fail">REJECT</span> <code>${esc(vector.code)}</code>`
            const payload = vector.raw ?? JSON.stringify(vector.payload, null, 2)
            const context = vector.context
              ? `<h4>Context</h4><pre><code>${esc(JSON.stringify(vector.context, null, 2))}</code></pre>`
              : ''
            return `<details class="vector" id="${esc(vector.id)}">
              <summary>${expectation}<span class="vname">${esc(vector.title)}</span><span class="vid">${esc(vector.id)}</span>${rule ? ruleLink(rule) : ''}${tag(vector.status)}</summary>
              <div class="vector-detail">
                <p>${esc(vector.reason)}</p>
                <h4>Input</h4>
                <pre><code>${esc(payload)}</code></pre>
                ${context}
              </div>
            </details>`
          })
          .join('')
        return `<h3 id="vectors-${esc(group.toLowerCase())}">${esc(group)}</h3><div class="panel">${items}</div>`
      })
      .join('')
  },

  scenarios: () =>
    table(
      'Transaction constructions and their outcomes',
      ['Scenario', 'Construction', 'Outcome', 'Rule'],
      SCENARIOS.map(
        (scenario) => `<tr>
          <td><b>${esc(scenario.title)}</b><small>${esc(scenario.summary)}</small></td>
          <td class="mono">${esc(scenario.inputs.map((i) => i.kind).join(' + '))}<br>&rarr; ${esc(scenario.outputs.map((o) => o.kind).join(' + '))}</td>
          <td>${
            scenario.expect === 'safe'
              ? '<span class="verdict verdict--pass">NO LOSS</span>'
              : '<span class="verdict verdict--fail">BURNS</span>'
          }</td>
          <td>${SCENARIO_RULES[scenario.id] ? ruleLink(SCENARIO_RULES[scenario.id]) : ''}</td>
        </tr>`,
      ),
    ),

  changelog: () =>
    CHANGELOG.map(
      (release) => `<div class="panel" id="v${esc(release.version)}">
        <div class="panel-head"><h3>Version ${esc(release.version)}</h3><span class="tag tag--universe">${esc(release.date)}</span></div>
        <div class="panel-body">
          <p class="lede">${esc(release.summary)}</p>
          <ul>${release.changes.map((change) => `<li>${esc(change)}</li>`).join('')}</ul>
        </div>
      </div>`,
    ).join(''),

  'universe-state': () => {
    const market = UNIVERSE_SUPPORT.marketplace
    return `<dl class="kv">
      <div><dt>Marketplace availability</dt><dd><b>${esc(market.availability)}</b></dd></div>
      <div><dt>Marketplace mode</dt><dd><b>${esc(market.mode)}</b></dd></div>
      <div><dt>Order book source</dt><dd>${esc(market.orderBook)}</dd></div>
      <div><dt>Ownership source of truth</dt><dd>${esc(market.ownership)}</dd></div>
      <div><dt>Settlement</dt><dd>${esc(market.settlement)}</dd></div>
      <div><dt>Protocol state source</dt><dd>${esc(market.protocolState)}</dd></div>
      <div><dt>Mutation gate</dt><dd>${esc(market.mutationGate)}</dd></div>
      <div><dt>Freshness policy</dt><dd>${esc(market.freshness)}</dd></div>
      <div><dt>Confirmation policy</dt><dd>${esc(market.confirmation)}</dd></div>
      <div><dt>Reorganization policy</dt><dd>${esc(market.reorg)}</dd></div>
    </dl>`
  },

  'universe-actions': () =>
    table(
      'Every marketplace action, and whether DUST-20 supports it',
      ['Action', 'Available', 'Mode or recorded reason'],
      UNIVERSE_SUPPORT.marketplaceActions.map(
        (row) => `<tr>
          <td class="mono">${esc(row.action)}</td>
          <td>${
            row.supported
              ? '<span class="verdict verdict--pass">YES</span>'
              : '<span class="verdict verdict--fail">NO</span>'
          }</td>
          <td>${row.supported ? `<code>${esc(row.mode)}</code>` : `<small>${esc(UNIVERSE_SUPPORT.marketplace.mutationGate)}</small>`}</td>
        </tr>`,
      ),
    ),

  'universe-surfaces': () =>
    table(
      'Bitcoin Universe product surfaces that handle DUST-20',
      ['Surface', 'Actions', 'What that means'],
      UNIVERSE_SUPPORT.surfaces.map(
        (row) => `<tr>
          <td class="mono"><b>${esc(row.surface)}</b></td>
          <td class="mono">${esc(row.actions.join(' '))}</td>
          <td><p>${esc(row.note)}</p></td>
        </tr>`,
      ),
    ),

  'universe-why': () =>
    UNIVERSE_SUPPORT.dataPath
      .map(
        (item) => `<div class="note note--info">
          <span class="note-mark" aria-hidden="true">i</span>
          <div class="note-body"><p class="note-title">${esc(item.title)}</p><p>${esc(item.body)}</p></div>
        </div>`,
      )
      .join(''),

  limits: () =>
    table(
      'Numeric ceilings a reader enforces',
      ['Quantity', 'Ceiling', 'Rule'],
      [
        `<tr><td>Satoshi fields</td><td class="num">${LIMITS.MAX_BITCOIN_SATS.toLocaleString('en-US')}</td><td>${ruleLink('DUST-3.3')}</td></tr>`,
        `<tr><td>Unit quantities</td><td class="num">${LIMITS.MAX_ATOMIC.toString()}</td><td>${ruleLink('DUST-3.4')}</td></tr>`,
        `<tr><td>Content size</td><td class="num">${LIMITS.MAX_CONTENT_BYTES} bytes</td><td>${ruleLink('DUST-2.3')}</td></tr>`,
        `<tr><td>Ticker length</td><td class="num">${LIMITS.MIN_TICK_BYTES} to ${LIMITS.MAX_TICK_BYTES} bytes</td><td>${ruleLink('DUST-4.3')}</td></tr>`,
        `<tr><td>Decimal places</td><td class="num">${LIMITS.DECIMALS}</td><td>${ruleLink('DUST-5.8')}</td></tr>`,
      ],
    ),
}

/** Render one numbered specification section. */
function renderRules(sectionId) {
  const section = SPEC_SECTIONS.find((entry) => entry.id === sectionId)
  if (!section) throw new Error(`Unknown specification section: ${sectionId}`)
  const rules = section.rules
    .map(
      (rule) => `<div class="rule" id="${esc(rule.id)}">
        <div class="rule-id"><a href="#${esc(rule.id)}">${esc(rule.id)}</a></div>
        <div class="rule-body">
          <h3>${esc(rule.title)}</h3>
          <p>${esc(rule.text)}</p>
          <div class="rule-foot">${tag(rule.status)}${
            rule.test
              ? `<a class="tag tag--ref" href="conformance.html#${esc(rule.test)}">VECTOR ${esc(rule.test)}</a>`
              : ''
          }</div>
        </div>
      </div>`,
    )
    .join('')
  return `<p class="lede">${esc(section.intro)}</p><div class="rules">${rules}</div>`
}

function expand(html) {
  return html.replace(/\{\{([a-z-]+)(?::([a-z-]+))?\}\}/g, (match, name, argument) => {
    if (name === 'rules') return renderRules(argument)
    const renderer = RENDER[name]
    if (!renderer) throw new Error(`Unknown template token: ${match}`)
    return renderer(argument)
  })
}

/* -------------------------------------------------------------- layout -- */

function head(page) {
  const url = pageUrl(page)
  const image = `${ORIGIN}assets/og.svg`
  return `  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(page.title)}</title>
  <meta name="description" content="${esc(page.description)}">
  <link rel="canonical" href="${url}">
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" content="#f4f4f1" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0c0e11" media="(prefers-color-scheme: dark)">
  <meta property="og:type" content="${page.file === 'index.html' ? 'website' : 'article'}">
  <meta property="og:site_name" content="DUST-20 documentation">
  <meta property="og:title" content="${esc(page.title)}">
  <meta property="og:description" content="${esc(page.description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${image}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(page.title)}">
  <meta name="twitter:description" content="${esc(page.description)}">
  <meta name="twitter:image" content="${image}">
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="assets/site.css">
  <script>try{var t=localStorage.getItem('dust20-theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>
  <script type="module" src="assets/site.js" defer></script>${
    page.tool ? `\n  <script type="module" src="assets/tool.js" defer></script>` : ''
  }
  <script type="application/ld+json">${JSON.stringify(structuredData(page))}</script>`
}

function structuredData(page) {
  const base = {
    '@context': 'https://schema.org',
    '@type': page.file === 'index.html' ? 'WebSite' : 'TechArticle',
    name: page.title,
    headline: page.heading,
    description: page.description,
    url: pageUrl(page),
    inLanguage: 'en',
    version: SPEC_VERSION,
    dateModified: PROTOCOL.updated,
    isPartOf: { '@type': 'WebSite', name: 'DUST-20 documentation', url: ORIGIN },
    publisher: { '@type': 'Organization', name: 'Bitcoin Universe', url: PROTOCOL.organization },
  }
  if (page.file === 'index.html') {
    base.about = { '@type': 'Thing', name: PROTOCOL.name, description: PROTOCOL.summary }
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

function masthead(page) {
  const links = PAGES.map(
    (entry) =>
      `<a href="${entry.path}"${entry.file === page.file ? ' aria-current="page"' : ''}>${esc(entry.nav)}</a>`,
  ).join('')

  return `  <a class="skip-link" href="#main">Skip to content</a>
  <header class="masthead">
    <div class="masthead-inner">
      <a class="brand" href="./">
        <svg class="brand-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="1.5" y="1.5" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="6" y="6" width="5" height="5" fill="currentColor"/><rect x="13" y="13" width="5" height="5" fill="currentColor"/><path d="M11 8.5h2M8.5 11v2" stroke="currentColor" stroke-width="1.2"/></svg>
        <span class="brand-text">DUST-20</span>
        <span class="brand-rev">REV ${esc(SPEC_VERSION)}</span>
      </a>
      <nav class="masthead-nav" data-nav aria-label="Documentation">${links}</nav>
      <div class="masthead-tools">
        <button class="tool-button" type="button" data-search-open aria-label="Search the documentation">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>
          <span class="label">Search</span><kbd>/</kbd>
        </button>
        <button class="tool-button" type="button" data-theme-toggle aria-pressed="false" aria-label="Switch between light and dark theme">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M19.4 4.6l-2.1 2.1M6.7 17.3l-2.1 2.1"/></svg>
          <span class="label">Light</span>
        </button>
        <button class="tool-button menu-toggle" type="button" data-menu-toggle aria-expanded="false" aria-controls="primary-nav" aria-label="Show the documentation menu">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          <span class="label">Menu</span>
        </button>
      </div>
    </div>
  </header>
  <dialog class="search" data-search aria-label="Search the documentation">
    <form class="search-form" method="dialog" role="search">
      <input type="search" placeholder="Search rules, fields, terms, vectors" aria-label="Search query" autocomplete="off" spellcheck="false">
      <button class="btn" type="button" data-search-close>Close</button>
    </form>
    <ul class="search-results"></ul>
  </dialog>`
}

function sidebar(page) {
  const groups = GROUPS.map((group) => {
    const items = pagesInGroup(group.id)
      .map(
        (entry) =>
          `<li><a href="${entry.path}"${entry.file === page.file ? ' aria-current="page"' : ''}>${esc(entry.nav)}</a></li>`,
      )
      .join('')
    if (!items) return ''
    return `<div class="sidebar-group"><span>${esc(group.label)}</span><ul>${items}</ul></div>`
  }).join('')

  return `    <aside class="sidebar" id="primary-nav">
      <nav aria-label="Documentation index">
        <h2>Index</h2>
${groups}
      </nav>
      <div class="sidebar-meta">
        <div><b>Document</b><span>${esc(SPEC_VERSION)}</span></div>
        <div><b>Revised</b><span>${esc(PROTOCOL.updated)}</span></div>
        <div><b>Chain</b><span>Bitcoin</span></div>
        <div><b>Network</b><span>${esc(PROTOCOL.network)}</span></div>
        <div><b>Lifecycle</b><span>${esc(PROTOCOL.lifecycle)}</span></div>
      </div>
    </aside>`
}

function contents(page) {
  if (page.sections.length === 0) return '    <div class="contents"></div>'
  const items = page.sections
    .map((section) => `          <li><a href="#${section.id}">${esc(section.label)}</a></li>`)
    .join('\n')
  return `    <aside class="contents">
      <nav aria-label="On this page">
        <h2>On this page</h2>
        <ul>
${items}
        </ul>
      </nav>
    </aside>`
}

function pagehead(page) {
  return `      <div class="pagehead">
        <p class="eyebrow">${esc(page.group === 'normative' ? 'Normative' : 'DUST-20 documentation')}</p>
        <h1>${esc(page.heading)}</h1>
        <p class="tagline">${esc(page.tagline)}</p>
        ${RENDER.datasheet()}
      </div>`
}

function pagenav(page) {
  const index = PAGES.findIndex((entry) => entry.file === page.file)
  const previous = PAGES[index - 1]
  const next = PAGES[index + 1]
  if (!previous && !next) return ''
  const parts = []
  if (previous) {
    parts.push(`      <a href="${previous.path}"><em>Previous</em><b>${esc(previous.nav)}</b></a>`)
  }
  if (next) parts.push(`      <a href="${next.path}"><em>Next</em><b>${esc(next.nav)}</b></a>`)
  return `      <nav class="pagenav" aria-label="Page">\n${parts.join('\n')}\n      </nav>`
}

function colophon(page) {
  const editUrl =
    page.file === 'index.html'
      ? `${PROTOCOL.sourcePath}/content/index.html`
      : `${PROTOCOL.sourcePath}/content/${page.file}`

  return `  <footer class="colophon">
    <div class="colophon-inner">
      <div class="colophon-grid">
        <dl>
          <dt>Owning repository</dt>
          <dd><a href="${PROTOCOL.repository}">bitcoinuniverseio/dust-20</a></dd>
          <dt>Source path</dt>
          <dd>content/${esc(page.file)}</dd>
          <dt>Last verified</dt>
          <dd>${esc(PROTOCOL.updated)}</dd>
        </dl>
        <dl>
          <dt>Document version</dt>
          <dd>${esc(SPEC_VERSION)}</dd>
          <dt>Lifecycle</dt>
          <dd>${esc(PROTOCOL.lifecycle)}</dd>
          <dt>Chain and network</dt>
          <dd>Bitcoin ${esc(PROTOCOL.network)}</dd>
        </dl>
        <div>
          <h2>Documentation</h2>
          <ul>
            <li><a href="${editUrl}">Edit this page on GitHub</a></li>
            <li><a href="${PROTOCOL.portal}">docs.bitcoinuniverse.io</a></li>
            <li><a href="${PROTOCOL.security}">Report a vulnerability</a></li>
            <li><a href="${PROTOCOL.inscribe}">Bitcoin Universe Inscribe</a></li>
          </ul>
        </div>
        <div>
          <h2>Machine readable</h2>
          <ul>
            <li><a href="llms.txt">llms.txt</a></li>
            <li><a href="docs.json">docs.json</a></li>
            <li><a href="conformance.json">conformance.json</a></li>
            <li><a href="search-index.json">search-index.json</a></li>
          </ul>
        </div>
      </div>
      <p class="colophon-note">Experimental documentation of an experimental protocol. Every statement carries a provenance label, and where the legacy specification and the current implementation disagree, both positions are published rather than silently resolved. No page on this site asks for a key, builds a transaction, or sends anything you type anywhere.</p>
    </div>
  </footer>`
}

function layout(page, content) {
  return `<!doctype html>
<html lang="en">
<head>
${head(page)}
</head>
<body data-page="${page.file.replace(/\.html$/, '')}" data-base="./">
${masthead(page)}
  <div class="layout">
${sidebar(page)}
    <main class="main" id="main">
${content}
${pagenav(page)}
    </main>
${contents(page)}
  </div>
${colophon(page)}
</body>
</html>
`
}

/* ----------------------------------------------------------- artifacts -- */

function buildSearchIndex() {
  const entries = []
  const add = (page, anchor, heading, text, keywords, weight = 0) => {
    entries.push({
      u: anchor ? `${page.path === './' ? './' : page.path}#${anchor}` : page.path,
      t: page.nav,
      h: heading,
      s: snippet(text),
      k: keywords,
      w: weight,
    })
  }

  const aliasFor = (term) => {
    const row = SEARCH_ALIASES.find((entry) => entry.term === term)
    return row ? `${term} ${row.aliases.join(' ')}` : term
  }

  for (const page of PAGES) {
    add(page, null, page.heading, page.description, `${page.nav} ${page.tagline}`, 6)
    for (const section of page.sections) {
      add(page, section.id, section.label, page.description, page.nav, 2)
    }
  }

  const spec = PAGES.find((page) => page.file === 'specification.html')
  for (const rule of SPEC_RULES) {
    add(spec, rule.id, `${rule.id} ${rule.title}`, rule.text, `${rule.id} ${rule.sectionTitle}`, 4)
  }

  const reference = PAGES.find((page) => page.file === 'reference.html')
  for (const field of FIELDS) {
    add(
      reference,
      'fields',
      `Field ${field.name}`,
      `${field.constraint} ${field.rule}`,
      aliasFor(field.name),
      3,
    )
  }
  for (const formula of FORMULAS) {
    add(reference, 'formulas', formula.expression, formula.plain, formula.op, 1)
  }
  for (const note of FEE_NOTES) add(reference, 'fees', note.title, note.body, 'fee size cost', 1)
  for (const item of LIMITATIONS) {
    add(reference, 'limitations', item.title, item.body, 'limitation constraint', 1)
  }

  const glossary = PAGES.find((page) => page.file === 'glossary.html')
  for (const entry of GLOSSARY) {
    add(
      glossary,
      `term-${entry.term.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      entry.term,
      entry.definition,
      aliasFor(entry.term.toLowerCase()),
      3,
    )
  }
  for (const entry of FAQ) add(glossary, 'faq', entry.q, entry.a, 'faq question', 2)

  const conformance = PAGES.find((page) => page.file === 'conformance.html')
  for (const vector of VECTORS) {
    add(
      conformance,
      vector.id,
      vector.title,
      vector.reason,
      `${vector.id} ${vector.group} ${vector.code ?? 'accept'} ${VECTOR_RULES[vector.id] ?? ''}`,
      1,
    )
  }

  const universe = PAGES.find((page) => page.file === 'universe.html')
  add(
    universe,
    'state',
    'Marketplace availability is read-only',
    UNIVERSE_SUPPORT.marketplace.mutationGate,
    'marketplace trade buy sell list offer settle read-only',
    5,
  )

  const safety = PAGES.find((page) => page.file === 'safety.html')
  for (const item of SAFETY) {
    add(safety, item.id, item.title, item.body, `security ${item.severity}`, 2)
  }

  const indexer = PAGES.find((page) => page.file === 'indexer.html')
  for (const stage of INDEXER_STAGES) {
    add(indexer, 'pipeline', `${stage.label}: ${stage.title}`, stage.body, 'indexer pipeline', 1)
  }

  return `${JSON.stringify(
    {
      generator: 'tools/build.mjs',
      warning: 'Generated file. Run `npm run generate` after editing the data model.',
      version: SPEC_VERSION,
      origin: ORIGIN,
      count: entries.length,
      entries,
    },
    null,
    0,
  )}\n`
}

function buildLlmsTxt() {
  const lines = []
  const push = (...entries) => lines.push(...entries)

  push(`# ${PROTOCOL.name} documentation`)
  push('')
  push(`> ${PROTOCOL.summary}`)
  push('')
  push(`- Site: ${ORIGIN}`)
  push(`- Source: ${PROTOCOL.repository}`)
  push(`- Documentation portal: ${PROTOCOL.portalPage}`)
  push(`- Chain: ${PROTOCOL.chain} ${PROTOCOL.network}`)
  push(`- Document version: ${SPEC_VERSION}, revised ${PROTOCOL.updated}`)
  push(`- Lifecycle: ${PROTOCOL.lifecycle}`)
  push(`- Classification: ${PROTOCOL.classification}`)
  push(`- Machine-readable model: ${ORIGIN}docs.json`)
  push(`- Conformance fixtures: ${ORIGIN}conformance.json`)
  push(`- Search index: ${ORIGIN}search-index.json`)
  push('')

  push('## Availability in Bitcoin Universe products')
  push('')
  push(
    `DUST-20 marketplace availability is ${UNIVERSE_SUPPORT.marketplace.availability}, mode ${UNIVERSE_SUPPORT.marketplace.mode}. You can view DUST-20 in Bitcoin Universe products and you cannot trade it there.`,
  )
  push('')
  push(`- Mutation gate: ${UNIVERSE_SUPPORT.marketplace.mutationGate}`)
  push(`- Ownership source of truth: ${UNIVERSE_SUPPORT.marketplace.ownership}`)
  push(`- Settlement: ${UNIVERSE_SUPPORT.marketplace.settlement}`)
  push(`- Order book: ${UNIVERSE_SUPPORT.marketplace.orderBook}`)
  push(`- Protocol state: ${UNIVERSE_SUPPORT.marketplace.protocolState}`)
  push(
    `- Supported marketplace actions: ${UNIVERSE_SUPPORT.marketplaceActions
      .filter((row) => row.supported)
      .map((row) => row.action)
      .join(', ')}`,
  )
  push(
    `- Unsupported marketplace actions: ${UNIVERSE_SUPPORT.marketplaceActions
      .filter((row) => !row.supported)
      .map((row) => row.action)
      .join(', ')}`,
  )
  push('')

  push('## Pages')
  push('')
  for (const page of PAGES) {
    push(`- [${page.nav}](${pageUrl(page)}): ${page.description}`)
  }
  push('')

  push('## How to read this document')
  push('')
  push(
    'Every statement carries a provenance label. Nothing below is asserted as a protocol rule merely to make the documentation look complete.',
  )
  push('')
  for (const status of Object.values(STATUS)) push(`- ${status.short}: ${status.description}`)
  push('')

  push('## Sources')
  push('')
  for (const source of Object.values(SOURCES)) {
    push(`- ${source.label}, ${source.url}`)
    push(`  ${source.note}`)
  }
  push('')

  push('## Normative rules')
  push('')
  for (const section of SPEC_SECTIONS) {
    push(`### ${section.number} ${section.title}`)
    push('')
    push(section.intro)
    push('')
    for (const rule of section.rules) {
      push(`- ${rule.id} ${rule.title} [${STATUS[rule.status].short}]`)
      push(`  ${rule.text}`)
    }
    push('')
  }

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
    push(`- ${formula.expression} [${formula.rule}] [${STATUS[formula.status].short}]`)
    push(`  ${formula.plain} Example: ${formula.example}`)
  }
  push('')

  push('## Transaction anatomy')
  push('')
  for (const block of Object.values(ANATOMY)) {
    push(`### ${block.title}`)
    push('')
    push(block.caption)
    push('')
    for (const row of block.rows) {
      push(`- ${row.part} (${row.role}): ${row.requirement} Verified against: ${row.checked}.`)
    }
    push('')
  }

  push('## State transitions')
  push('')
  for (const row of STATE_TRANSITIONS) {
    push(`- ${row.from} + ${row.event} -> ${row.to} [${row.rule}]. ${row.note}`)
  }
  push('')

  push('## Invalidity conditions')
  push('')
  for (const row of INVALIDITY) push(`- ${row.code} [${row.rule}]: ${row.summary}`)
  push('')

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
    push(`### ${stage.label}: ${stage.title} [${STATUS[stage.status].short}]`)
    push('')
    push(stage.body)
    push('')
  }

  push('## Fee and size considerations')
  push('')
  for (const note of FEE_NOTES) push(`- ${note.title}: ${note.body}`)
  push('')

  push('## Limitations')
  push('')
  for (const item of LIMITATIONS) push(`- ${item.title}: ${item.body}`)
  push('')

  push('## Implementation checklist')
  push('')
  for (const group of CHECKLIST) {
    push(`### ${group.group}`)
    push('')
    for (const item of group.items) push(`- [${item.rule}] ${item.text}`)
    push('')
  }

  push('## Security considerations')
  push('')
  for (const item of SAFETY) push(`- [${item.severity}] ${item.title}: ${item.body}`)
  push('')

  push('## Conformance summary')
  push('')
  push(
    `${VECTORS.length} executable cases are published at ${ORIGIN}conformance.json and rendered at ${ORIGIN}conformance.html.`,
  )
  push('')
  for (const vector of VECTORS) {
    const outcome = vector.expect === 'accept' ? 'ACCEPT' : `REJECT (${vector.code})`
    push(
      `- ${vector.id}: ${outcome} [${VECTOR_RULES[vector.id] ?? 'n/a'}] ${vector.title}. ${vector.reason}`,
    )
  }
  push('')

  push('## Document history')
  push('')
  for (const release of CHANGELOG) {
    push(`### ${release.version} (${release.date})`)
    push('')
    push(release.summary)
    push('')
    for (const change of release.changes) push(`- ${change}`)
    push('')
  }

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
      specVersion: SPEC_VERSION,
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
      specification: SPEC_SECTIONS,
      operations: OPERATIONS,
      fields: FIELDS,
      formulas: FORMULAS,
      anatomy: ANATOMY,
      stateTransitions: STATE_TRANSITIONS,
      invalidity: INVALIDITY,
      feeNotes: FEE_NOTES,
      limitations: LIMITATIONS,
      checklist: CHECKLIST,
      reconciliations: RECONCILIATIONS,
      openQuestions: OPEN_QUESTIONS,
      indexerStages: INDEXER_STAGES,
      allocationRecord: ALLOCATION_RECORD,
      universeSupport: UNIVERSE_SUPPORT,
      safety: SAFETY,
      glossary: GLOSSARY,
      faq: FAQ,
      changelog: CHANGELOG,
      pages: PAGES.map((page) => ({
        path: page.path,
        url: pageUrl(page),
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
      specVersion: SPEC_VERSION,
      updated: PROTOCOL.updated,
      chain: 'bitcoin',
      network: PROTOCOL.network,
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
        rule: VECTOR_RULES[vector.id] ?? null,
        status: vector.status,
        reason: vector.reason,
        context: vector.context ?? null,
        payload: vector.payload ?? null,
        raw: vector.raw ?? null,
      })),
      scenarios: SCENARIOS.map((scenario) => ({
        ...scenario,
        rule: SCENARIO_RULES[scenario.id] ?? null,
      })),
    },
    null,
    2,
  )}\n`
}

function buildSitemap() {
  const entries = PAGES.map(
    (page) => `  <url>
    <loc>${pageUrl(page)}</loc>
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

/* ------------------------------------------------------------------- run */

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
  console.log(check ? 'Checking generated files...' : 'Generating DUST-20 documentation...')

  const fragments = await readdir(path.join(root, 'content'))
  for (const page of PAGES) {
    if (!fragments.includes(page.file)) {
      throw new Error(`Missing content fragment for ${page.file} (expected content/${page.file})`)
    }
    const source = await readFile(path.join(root, 'content', page.file), 'utf8')
    const body = `${pagehead(page)}\n${expand(source.trimEnd())}`
    await emit(page.file, layout(page, body))
  }

  await emit('llms.txt', buildLlmsTxt())
  await emit('docs.json', buildDocsJson())
  await emit('conformance.json', buildConformanceJson())
  await emit('search-index.json', buildSearchIndex())
  await emit('sitemap.xml', buildSitemap())
  await emit('robots.txt', buildRobots())

  if (check) {
    if (problems.length > 0) {
      console.error('\nOut of date, run `npm run generate`:')
      for (const problem of problems) console.error(`  ${problem}`)
      process.exitCode = 1
    } else {
      console.log('All generated files are up to date.')
    }
  } else {
    console.log(
      written === 0 ? 'Everything already up to date.' : `\nDone, ${written} file(s) written.`,
    )
  }
  void EXTRA_FILES
}

await main()
