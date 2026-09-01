/**
 * DUST-20 documentation shell.
 *
 * Progressive enhancement only. Every page reads and navigates without this
 * file; it adds the theme toggle, the mobile navigation and local search.
 * Nothing here contacts the network except to fetch search-index.json from
 * this same origin, and nothing is ever sent anywhere.
 */

const $ = (selector, root = document) => root.querySelector(selector)
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]

/* ---------------------------------------------------------------- theme -- */

const THEME_KEY = 'dust20-theme'

function readStoredTheme() {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function applyTheme(theme) {
  const root = document.documentElement
  if (theme) root.setAttribute('data-theme', theme)
  else root.removeAttribute('data-theme')

  const systemDark = matchMedia('(prefers-color-scheme: dark)').matches
  const effective = theme ?? (systemDark ? 'dark' : 'light')
  const button = $('[data-theme-toggle]')
  if (button) {
    button.setAttribute('aria-pressed', String(effective === 'dark'))
    const label = $('.label', button)
    if (label) label.textContent = effective === 'dark' ? 'Dark' : 'Light'
  }
}

function initTheme() {
  applyTheme(readStoredTheme())
  const button = $('[data-theme-toggle]')
  if (!button) return
  button.addEventListener('click', () => {
    const systemDark = matchMedia('(prefers-color-scheme: dark)').matches
    const current = readStoredTheme() ?? (systemDark ? 'dark' : 'light')
    const next = current === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      /* storage unavailable, the toggle still applies for this page */
    }
    applyTheme(next)
  })
}

/* ------------------------------------------------------------------ nav -- */

function initNav() {
  const toggle = $('[data-menu-toggle]')
  const nav = $('[data-nav]')
  if (!toggle || !nav) return
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open')
    toggle.setAttribute('aria-expanded', String(open))
  })
}

/* --------------------------------------------------------------- search -- */

let index = null
let indexState = 'idle'

async function loadIndex(base) {
  if (index || indexState === 'loading') return index
  indexState = 'loading'
  try {
    const response = await fetch(`${base}search-index.json`, { cache: 'force-cache' })
    if (!response.ok) throw new Error(String(response.status))
    const payload = await response.json()
    index = payload.entries ?? []
    indexState = 'ready'
  } catch {
    indexState = 'error'
  }
  return index
}

/** Score a record against the query terms. Higher is better; 0 excludes. */
function score(entry, terms) {
  let total = 0
  for (const term of terms) {
    let best = 0
    if (entry.h.toLowerCase().includes(term)) best = 12
    else if ((entry.k ?? '').toLowerCase().includes(term)) best = 9
    else if (entry.s.toLowerCase().includes(term)) best = 4
    else if (entry.t.toLowerCase().includes(term)) best = 3
    if (best === 0) return 0
    if (entry.h.toLowerCase().startsWith(term)) best += 6
    total += best
  }
  return total + (entry.w ?? 0)
}

function renderResults(list, results, query) {
  list.innerHTML = ''
  if (!query) {
    list.innerHTML =
      '<li class="search-empty">Search rules, fields, terms, vectors and pages. Try <code>lim_sats</code>, <code>burn</code>, <code>DUST-6.7</code> or <code>marketplace</code>.</li>'
    return
  }
  if (indexState === 'error') {
    list.innerHTML =
      '<li class="search-empty">The search index could not be loaded. Every page is still linked from the index on the left.</li>'
    return
  }
  if (results.length === 0) {
    list.innerHTML = `<li class="search-empty">No match for <b>${escapeHtml(query)}</b>.<ul><li>Rule identifiers look like <code>DUST-6.4</code>.</li><li>Field names use underscores: <code>unit_sats</code>, <code>max_sats</code>, <code>lim_sats</code>.</li><li>Try a plain word such as <code>change</code>, <code>fee</code> or <code>reorg</code>.</li></ul></li>`
    return
  }
  for (const entry of results) {
    const item = document.createElement('li')
    item.innerHTML = `<a href="${entry.u}"><span class="sr-where">${escapeHtml(entry.t)}</span><span class="sr-title">${escapeHtml(entry.h)}</span><span class="sr-text">${escapeHtml(entry.s)}</span></a>`
    list.appendChild(item)
  }
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"]/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character],
  )
}

function initSearch() {
  const dialog = $('[data-search]')
  if (!dialog || typeof dialog.showModal !== 'function') return
  const input = $('input[type="search"]', dialog)
  const list = $('.search-results', dialog)
  const base = document.body.dataset.base ?? './'

  const run = () => {
    const query = input.value.trim()
    const terms = query.toLowerCase().split(/\s+/u).filter(Boolean)
    if (terms.length === 0 || !index) {
      renderResults(list, [], query)
      return
    }
    const results = index
      .map((entry) => ({ entry, value: score(entry, terms) }))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 25)
      .map((row) => row.entry)
    renderResults(list, results, query)
  }

  const open = async () => {
    if (!dialog.open) dialog.showModal()
    input.focus()
    input.select()
    await loadIndex(base)
    run()
  }

  input.addEventListener('input', run)
  for (const trigger of $$('[data-search-open]')) {
    trigger.addEventListener('click', (event) => {
      event.preventDefault()
      open()
    })
  }
  $('[data-search-close]', dialog)?.addEventListener('click', () => dialog.close())

  document.addEventListener('keydown', (event) => {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
    const active = document.activeElement
    const tag = active?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || active?.isContentEditable) return
    event.preventDefault()
    open()
  })

  renderResults(list, [], '')
}

/* ------------------------------------------------------------- copyable -- */

function initCopy() {
  for (const button of $$('[data-copy]')) {
    button.addEventListener('click', async () => {
      const target = document.getElementById(button.dataset.copy)
      if (!target || !navigator.clipboard) return
      try {
        await navigator.clipboard.writeText(target.textContent.trim())
        const label = $('.label', button) ?? button
        const original = label.textContent
        label.textContent = 'Copied'
        setTimeout(() => {
          label.textContent = original
        }, 1400)
      } catch {
        /* clipboard blocked; the text is selectable in the page */
      }
    })
  }
}

/* ----------------------------------------------------------------- boot -- */

initTheme()
initNav()
initSearch()
initCopy()
