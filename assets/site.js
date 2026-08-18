/**
 * DUST-20 documentation — site chrome.
 *
 * Progressive enhancement only: every page is fully readable and navigable
 * with this script disabled. Nothing here fetches anything over the network.
 */

import { PAGES } from './site-map.js'
import { FIELDS, RULES, RECONCILIATIONS, OPEN_QUESTIONS, STATUS } from './protocol-data.js'
import { GLOSSARY, FAQ, VECTORS } from './protocol-vectors.js'

/* ------------------------------------------------------------ Mobile menu */

function initMenu() {
  const toggle = document.querySelector('[data-menu-toggle]')
  const nav = document.querySelector('[data-site-nav]')
  if (!toggle || !nav) return

  const setOpen = (open) => {
    nav.setAttribute('data-open', String(open))
    toggle.setAttribute('aria-expanded', String(open))
    toggle.textContent = open ? 'Close' : 'Menu'
  }

  toggle.addEventListener('click', () => {
    setOpen(nav.getAttribute('data-open') !== 'true')
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.getAttribute('data-open') === 'true') {
      setOpen(false)
      toggle.focus()
    }
  })

  // Collapse the drawer when the viewport grows past the mobile breakpoint.
  const wide = window.matchMedia('(min-width: 1025px)')
  wide.addEventListener('change', (event) => {
    if (event.matches) setOpen(false)
  })
}

/* ------------------------------------------------------- Heading anchors */

function initAnchors() {
  const main = document.querySelector('.docs-main, main')
  if (!main) return
  for (const heading of main.querySelectorAll('h2[id], h3[id]')) {
    if (heading.querySelector('.anchor')) continue
    const link = document.createElement('a')
    link.className = 'anchor'
    link.href = `#${heading.id}`
    link.textContent = '#'
    link.setAttribute('aria-label', `Link to “${heading.textContent.trim()}”`)
    heading.append(link)
  }
}

/* -------------------------------------------------- Copy-to-clipboard */

function initCopy() {
  for (const button of document.querySelectorAll('[data-copy-target], [data-copy]')) {
    button.addEventListener('click', async () => {
      const explicit = button.getAttribute('data-copy')
      const selector = button.getAttribute('data-copy-target')
      const source = selector ? document.querySelector(selector) : null
      const text = explicit ?? (source ? (source.value ?? source.textContent) : '')
      const original = button.dataset.originalLabel ?? button.textContent
      button.dataset.originalLabel = original
      try {
        await navigator.clipboard.writeText(text)
        button.textContent = 'Copied'
        button.dataset.state = 'done'
      } catch {
        // Clipboard access can be denied; select the text so the user can copy it.
        button.textContent = 'Select and copy'
        if (source && typeof source.select === 'function') source.select()
        else if (source) selectElement(source)
      }
      window.setTimeout(() => {
        button.textContent = original
        delete button.dataset.state
      }, 1800)
    })
  }
}

function selectElement(element) {
  const range = document.createRange()
  range.selectNodeContents(element)
  const selection = window.getSelection()
  selection.removeAllRanges()
  selection.addRange(range)
}

/* --------------------------------------------- Table of contents spy */

function initToc() {
  const links = [...document.querySelectorAll('.toc-list a[href^="#"]')]
  if (links.length === 0) return

  const targets = links
    .map((link) => document.getElementById(decodeURIComponent(link.hash.slice(1))))
    .filter(Boolean)
  if (targets.length === 0) return

  const setActive = (id) => {
    for (const link of links) {
      const active = decodeURIComponent(link.hash.slice(1)) === id
      if (active) link.setAttribute('aria-current', 'true')
      else link.removeAttribute('aria-current')
    }
  }

  const visible = new Set()
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target.id)
        else visible.delete(entry.target.id)
      }
      const first = targets.find((target) => visible.has(target.id))
      if (first) setActive(first.id)
    },
    { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
  )
  for (const target of targets) observer.observe(target)
  setActive(targets[0].id)
}

/* ------------------------------------------------------ Full-site search */

/** Build the search index from the same data the pages are generated from. */
function buildIndex() {
  const entries = []

  for (const page of PAGES) {
    entries.push({
      title: page.nav,
      detail: page.description,
      href: page.path,
      kind: 'Page',
      haystack: `${page.nav} ${page.title} ${page.description}`,
    })
    for (const section of page.sections) {
      entries.push({
        title: section.label,
        detail: page.nav,
        href: `${page.path}#${section.id}`,
        kind: 'Section',
        haystack: `${section.label} ${page.nav}`,
      })
    }
  }

  for (const field of FIELDS) {
    entries.push({
      title: field.name,
      detail: `${field.ops.join(', ')} — ${field.constraint}`,
      href: `reference.html#field-${field.name}`,
      kind: 'Field',
      haystack: `${field.name} ${field.ops.join(' ')} ${field.constraint} ${field.rule} ${field.notes}`,
    })
  }

  for (const rule of RULES) {
    entries.push({
      title: rule.title,
      detail: rule.body,
      href: `reference.html#rule-${rule.id}`,
      kind: 'Rule',
      haystack: `${rule.title} ${rule.body} ${rule.scope}`,
    })
  }

  for (const item of RECONCILIATIONS) {
    entries.push({
      title: item.title,
      detail: item.resolution,
      href: `reference.html#reconcile-${item.id}`,
      kind: 'Reconciliation',
      haystack: `${item.title} ${item.legacy} ${item.current} ${item.resolution}`,
    })
  }

  for (const item of OPEN_QUESTIONS) {
    entries.push({
      title: item.question,
      detail: item.posture,
      href: `reference.html#open-${item.id}`,
      kind: 'Open question',
      haystack: `${item.question} ${item.why} ${item.posture}`,
    })
  }

  for (const term of GLOSSARY) {
    entries.push({
      title: term.term,
      detail: term.definition,
      href: `glossary.html#term-${slug(term.term)}`,
      kind: 'Glossary',
      haystack: `${term.term} ${term.definition}`,
    })
  }

  for (const item of FAQ) {
    entries.push({
      title: item.q,
      detail: item.a,
      href: `glossary.html#faq-${slug(item.q)}`,
      kind: 'FAQ',
      haystack: `${item.q} ${item.a}`,
    })
  }

  for (const vector of VECTORS) {
    entries.push({
      title: vector.title,
      detail: vector.reason,
      href: `conformance.html#case-${vector.id}`,
      kind: 'Test case',
      haystack: `${vector.title} ${vector.reason} ${vector.code ?? ''} ${vector.group}`,
    })
  }

  for (const entry of entries) entry.haystack = entry.haystack.toLowerCase()
  return entries
}

export function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function score(entry, terms) {
  let total = 0
  for (const term of terms) {
    const index = entry.haystack.indexOf(term)
    if (index === -1) return -1
    total += index === 0 ? 12 : 6
    if (entry.title.toLowerCase().includes(term)) total += 10
  }
  return total
}

function initSearch() {
  const trigger = document.querySelector('[data-search-trigger]')
  const dialog = document.querySelector('[data-search-dialog]')
  if (!trigger || !dialog || typeof dialog.showModal !== 'function') return

  const input = dialog.querySelector('input[type="search"]')
  const results = dialog.querySelector('[data-search-results]')
  let index = null

  const render = (query) => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    results.textContent = ''

    if (terms.length === 0) {
      results.innerHTML =
        '<li><p class="search-empty">Search pages, fields, rules, glossary terms and test cases.</p></li>'
      return
    }

    const matches = index
      .map((entry) => ({ entry, rank: score(entry, terms) }))
      .filter((item) => item.rank >= 0)
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 25)

    if (matches.length === 0) {
      results.innerHTML = `<li><p class="search-empty">No matches for “${escapeHtml(query)}”.</p></li>`
      return
    }

    for (const { entry } of matches) {
      const item = document.createElement('li')
      const link = document.createElement('a')
      link.href = entry.href
      link.innerHTML = `<em>${escapeHtml(entry.kind)}</em><b>${escapeHtml(entry.title)}</b><span>${escapeHtml(truncate(entry.detail, 120))}</span>`
      item.append(link)
      results.append(item)
    }
  }

  const open = () => {
    if (!index) index = buildIndex()
    dialog.showModal()
    input.value = ''
    render('')
    input.focus()
  }

  trigger.addEventListener('click', open)
  input.addEventListener('input', () => render(input.value))

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close()
  })

  dialog.querySelector('form').addEventListener('submit', (event) => {
    event.preventDefault()
    const first = results.querySelector('a')
    if (first) first.click()
  })

  // Arrow-key navigation through results.
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const links = [...results.querySelectorAll('a')]
    if (links.length === 0) return
    event.preventDefault()
    const current = links.indexOf(document.activeElement)
    const next =
      event.key === 'ArrowDown'
        ? Math.min(current + 1, links.length - 1)
        : Math.max(current - 1, -1)
    if (next < 0) input.focus()
    else links[next].focus()
  })

  document.addEventListener('keydown', (event) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? '')
    if ((event.key === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !typing)) {
      event.preventDefault()
      if (!dialog.open) open()
    }
  })
}

export function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  )
}

function truncate(value, limit) {
  const text = String(value)
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`
}

/* --------------------------------------------- Status chip descriptions */

function initChipTitles() {
  for (const chip of document.querySelectorAll('.chip[data-status]')) {
    const status = STATUS[chip.dataset.status]
    if (status && !chip.title) chip.title = status.description
  }
}

/* --------------------------------------------------------------- Start */

function start() {
  initMenu()
  initAnchors()
  initCopy()
  initToc()
  initSearch()
  initChipTitles()
  document.documentElement.dataset.enhanced = 'true'
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start)
} else {
  start()
}
