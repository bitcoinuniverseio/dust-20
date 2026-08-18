/**
 * DUST-20 documentation — interactive modules.
 *
 * Every view here is generated from assets/protocol-data.js and
 * assets/protocol-vectors.js and validated by assets/protocol.js, so the
 * prose, the field tables, the playground and the conformance laboratory
 * cannot disagree with each other.
 *
 * Entirely client-side. No wallet, no private key, no signing, no network.
 */

import {
  FIELDS,
  FIELDS_BY_OP,
  OPERATIONS,
  FORMULAS,
  RULES,
  RECONCILIATIONS,
  OPEN_QUESTIONS,
  STATUS,
  STATUS_ORDER,
  SOURCES,
  INDEXER_STAGES,
  ALLOCATION_RECORD,
  SAFETY,
  PROTOCOL,
} from './protocol-data.js'

import {
  VECTORS,
  EXAMPLES,
  SCENARIOS,
  GLOSSARY,
  FAQ,
  REFERENCE_DEPLOYMENT,
} from './protocol-vectors.js'

import { inspect, simulateTransfer, renderPayload, format, satsToBtc } from './protocol.js'

import { escapeHtml, slug } from './site.js'

/* ------------------------------------------------------------- Utilities */

const el = (tag, attributes = {}, ...children) => {
  const node = document.createElement(tag)
  for (const [key, value] of Object.entries(attributes)) {
    if (value == null || value === false) continue
    if (key === 'class') node.className = value
    else if (key === 'html') node.innerHTML = value
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value)
    else node.setAttribute(key, value === true ? '' : String(value))
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue
    node.append(child instanceof Node ? child : document.createTextNode(String(child)))
  }
  return node
}

const chip = (statusId, extra = '') => {
  const status = STATUS[statusId]
  if (!status) return ''
  return `<span class="chip ${status.tone}" data-status="${statusId}" title="${escapeHtml(status.description)}">${escapeHtml(status.short)}${extra}</span>`
}

const chipNode = (statusId) => {
  const wrapper = document.createElement('span')
  wrapper.innerHTML = chip(statusId)
  return wrapper.firstElementChild
}

const $ = (selector, root = document) => root.querySelector(selector)
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]

/* ------------------------------------------------------ Shared: status legend */

function renderStatusLegend(container) {
  if (!container) return
  container.textContent = ''
  for (const id of STATUS_ORDER) {
    const status = STATUS[id]
    container.append(
      el(
        'div',
        {},
        el('span', { html: chip(id) }),
        el('p', {}, status.description),
      ),
    )
  }
}

/* ================================================================== *
 * Reference page
 * ================================================================== */

function initReference() {
  renderStatusLegend($('[data-status-legend]'))
  renderOperations($('[data-operations]'))
  renderFields($('[data-fields]'))
  renderFormulas($('[data-formulas]'))
  renderRules($('[data-rules]'))
  renderReconciliations($('[data-reconciliations]'))
  renderOpenQuestions($('[data-open-questions]'))
  initReferenceFilter()
}

function renderOperations(container) {
  if (!container) return
  container.textContent = ''
  for (const operation of OPERATIONS) {
    const keys =
      operation.carrier === 'inscription'
        ? el(
            'p',
            {},
            el('strong', {}, 'Fields: '),
            el('code', {}, operation.required.join(', ')),
            operation.optional.length
              ? el('span', {}, ' plus optional ', el('code', {}, operation.optional.join(', ')))
              : ' — no optional fields.',
          )
        : el(
            'p',
            {},
            el('strong', {}, 'Carrier: '),
            'an ordinary Bitcoin spend. No JSON payload participates.',
          )

    container.append(
      el(
        'article',
        { class: 'card', id: `op-${operation.id}` },
        el(
          'div',
          { class: 'field-entry-head' },
          el('h3', {}, operation.label),
          chipNode(operation.status),
        ),
        el('p', {}, operation.summary),
        el('p', {}, operation.detail),
        keys,
      ),
    )
  }
}

function renderFields(container) {
  if (!container) return
  container.textContent = ''
  for (const field of FIELDS) {
    const entry = el('article', {
      class: 'field-entry',
      id: `field-${field.name}`,
      'data-name': field.name,
      'data-status': field.status,
      'data-ops': field.ops.join(' '),
      'data-search': `${field.name} ${field.ops.join(' ')} ${field.constraint} ${field.rule} ${field.notes} ${field.type}`.toLowerCase(),
    })

    entry.append(
      el(
        'div',
        { class: 'field-entry-head' },
        el('h3', {}, field.name),
        el('span', {
          class: 'chip muted',
          html: escapeHtml(field.required ? 'Required' : 'Optional'),
        }),
        chipNode(field.status),
      ),
    )

    const list = el('dl', {})
    const rows = [
      ['Operation', field.ops.join(', ')],
      ['Type', field.type],
      ['Constraint', field.constraint],
      ['Example', el('code', {}, field.example)],
      ['Validation rule', field.rule],
      ['Provenance', field.source.map((id) => SOURCES[id]?.label ?? id).join(' + ')],
      ['Compatibility', field.notes],
    ]
    for (const [term, value] of rows) {
      list.append(el('dt', {}, term), el('dd', {}, value))
    }
    entry.append(list)
    container.append(entry)
  }
}

function renderFormulas(container) {
  if (!container) return
  container.textContent = ''
  for (const formula of FORMULAS) {
    container.append(
      el(
        'div',
        { class: 'formula', id: `formula-${formula.id}` },
        el('code', {}, formula.expression),
        el('small', { html: `${escapeHtml(formula.plain)} — ${escapeHtml(formula.example)}` }),
      ),
    )
  }
}

function renderRules(container) {
  if (!container) return
  container.textContent = ''
  for (const rule of RULES) {
    container.append(
      el(
        'article',
        {
          class: 'card',
          id: `rule-${rule.id}`,
          style: 'margin-bottom:.8rem',
        },
        el(
          'div',
          { class: 'field-entry-head' },
          el('h3', {}, rule.title),
          el('span', { class: 'chip muted' , html: escapeHtml(rule.scope) }),
          chipNode(rule.status),
        ),
        el('p', {}, rule.body),
      ),
    )
  }
}

function renderReconciliations(container) {
  if (!container) return
  container.textContent = ''
  for (const item of RECONCILIATIONS) {
    container.append(
      el(
        'article',
        { class: 'card', id: `reconcile-${item.id}`, style: 'margin-bottom:.8rem' },
        el(
          'div',
          { class: 'field-entry-head' },
          el('h3', {}, item.title),
          chipNode(item.status),
        ),
        el('p', {}, el('strong', {}, 'Legacy documentation: '), item.legacy),
        el('p', {}, el('strong', {}, 'Current implementation: '), item.current),
        el(
          'div',
          { class: 'notice good' },
          el('span', { class: 'notice-mark' }, '='),
          el('div', {}, el('h3', {}, 'How this site resolves it'), el('p', {}, item.resolution)),
        ),
      ),
    )
  }
}

function renderOpenQuestions(container) {
  if (!container) return
  container.textContent = ''
  for (const item of OPEN_QUESTIONS) {
    container.append(
      el(
        'article',
        { class: 'card', id: `open-${item.id}`, style: 'margin-bottom:.8rem' },
        el(
          'div',
          { class: 'field-entry-head' },
          el('h3', {}, item.question),
          chipNode('unresolved'),
        ),
        el('p', {}, el('strong', {}, 'Why it matters: '), item.why),
        el('p', {}, el('strong', {}, 'Safe posture: '), item.posture),
      ),
    )
  }
}

function initReferenceFilter() {
  const search = $('[data-field-search]')
  const status = $('[data-field-status]')
  const output = $('[data-field-count]')
  if (!search) return

  const entries = $$('.field-entry')
  let activeStatus = 'all'

  const apply = () => {
    const query = search.value.trim().toLowerCase()
    let shown = 0
    for (const entry of entries) {
      const matchesQuery = !query || entry.dataset.search.includes(query)
      const matchesStatus = activeStatus === 'all' || entry.dataset.status === activeStatus
      const visible = matchesQuery && matchesStatus
      entry.hidden = !visible
      if (visible) shown += 1
    }
    if (output) {
      output.textContent =
        shown === entries.length
          ? `Showing all ${entries.length} fields.`
          : `Showing ${shown} of ${entries.length} fields.`
    }
  }

  search.addEventListener('input', apply)

  if (status) {
    status.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-status-filter]')
      if (!button) return
      activeStatus = button.dataset.statusFilter
      for (const other of $$('button[data-status-filter]', status)) {
        other.setAttribute('aria-pressed', String(other === button))
      }
      apply()
    })
  }

  apply()
}

/* ================================================================== *
 * Playground
 * ================================================================== */

const DEPLOY_DEFAULTS = {
  tick: 'dust',
  supply: '1000000',
  unit_sats: '546',
  lim_sats: '54600',
}

function initPlayground() {
  initDeployBuilder()
  initMintBuilder()
  initInspector()
  applyDeepLink()
}

/** Read shareable state from the query string. */
function params() {
  return new URLSearchParams(window.location.search)
}

function writeParams(update) {
  const next = params()
  for (const [key, value] of Object.entries(update)) {
    if (value == null || value === '') next.delete(key)
    else next.set(key, value)
  }
  const query = next.toString()
  const url = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
  window.history.replaceState(null, '', url)
}

function applyDeepLink() {
  const current = params()
  const shared = $('[data-share-state]')
  if (shared) {
    shared.addEventListener('click', async () => {
      const original = shared.textContent
      try {
        await navigator.clipboard.writeText(window.location.href)
        shared.textContent = 'Link copied'
      } catch {
        shared.textContent = 'Copy the address bar'
      }
      window.setTimeout(() => {
        shared.textContent = original
      }, 1800)
    })
  }
  if (current.has('case')) {
    const target = document.getElementById(`case-${current.get('case')}`)
    if (target) target.scrollIntoView({ block: 'center' })
  }
}

/* ---------------------------------------------------------- Deploy builder */

function initDeployBuilder() {
  const form = $('[data-deploy-form]')
  if (!form) return

  const inputs = {
    tick: $('#deploy-tick', form),
    supply: $('#deploy-supply', form),
    unit_sats: $('#deploy-unit-sats', form),
    lim_sats: $('#deploy-lim-sats', form),
  }
  const output = $('[data-deploy-output]')
  const code = $('[data-deploy-json]')

  const current = params()
  for (const [key, input] of Object.entries(inputs)) {
    const value = current.get(`d_${key}`)
    if (value != null) input.value = value
    else if (!input.value) input.value = DEPLOY_DEFAULTS[key] ?? ''
  }

  const run = () => {
    // max_sats is always derived here, but it is derived and shown, never
    // silently supplied to a payload the user believes they wrote by hand.
    const payload = {
      p: PROTOCOL.id,
      op: 'deploy',
      tick: inputs.tick.value.trim(),
      supply: inputs.supply.value.trim(),
      unit_sats: inputs.unit_sats.value.trim(),
      max_sats: deriveMaxSats(inputs.supply.value.trim(), inputs.unit_sats.value.trim()),
    }
    const limit = inputs.lim_sats.value.trim()
    if (limit !== '') payload.lim_sats = limit

    const report = inspect(payload)
    const json = renderPayload(payload, 'deploy')
    if (code) code.textContent = json
    renderReport(output, report, json)

    for (const [key, input] of Object.entries(inputs)) {
      const field = key === 'lim_sats' ? 'lim_sats' : key
      const bad = report.issues.some((issue) => issue.field === field)
      input.setAttribute('aria-invalid', String(bad))
    }

    writeParams({
      d_tick: inputs.tick.value.trim(),
      d_supply: inputs.supply.value.trim(),
      d_unit_sats: inputs.unit_sats.value.trim(),
      d_lim_sats: inputs.lim_sats.value.trim(),
    })

    // Keep the mint builder's deployment in step with the deploy builder.
    if (report.ok) {
      window.__dustDeployment = {
        tick: report.result.tick,
        supply: report.result.supply.toString(),
        unitSats: report.result.unitSats.toString(),
        limSats: report.result.limSats.toString(),
        minted: '0',
      }
      document.dispatchEvent(new CustomEvent('dust:deployment'))
    }
  }

  for (const input of Object.values(inputs)) {
    input.addEventListener('input', run)
  }

  $('[data-deploy-reset]')?.addEventListener('click', () => {
    for (const [key, input] of Object.entries(inputs)) input.value = DEPLOY_DEFAULTS[key] ?? ''
    run()
  })

  $('[data-deploy-example]')?.addEventListener('click', () => {
    const example = EXAMPLES.find((entry) => entry.id === 'deploy-basic')
    inputs.tick.value = example.payload.tick
    inputs.supply.value = example.payload.supply
    inputs.unit_sats.value = example.payload.unit_sats
    inputs.lim_sats.value = example.payload.lim_sats ?? ''
    run()
  })

  run()
}

/** Derive max_sats with exact integer arithmetic, or return the raw text. */
function deriveMaxSats(supply, unitSats) {
  if (!/^[1-9][0-9]*$/.test(supply) || !/^[1-9][0-9]*$/.test(unitSats)) {
    // Leave the invalid inputs visible so the validator explains the problem
    // rather than the builder hiding it behind a computed value.
    return supply === '' || unitSats === '' ? '' : '0'
  }
  return (BigInt(supply) * BigInt(unitSats)).toString()
}

/* ------------------------------------------------------------ Mint builder */

function initMintBuilder() {
  const form = $('[data-mint-form]')
  if (!form) return

  const amount = $('#mint-amt', form)
  const outputValue = $('#mint-output', form)
  const summary = $('[data-mint-deployment]')
  const output = $('[data-mint-output-report]')
  const code = $('[data-mint-json]')
  const matchOutput = $('#mint-match', form)

  const current = params()
  if (current.get('m_amt')) amount.value = current.get('m_amt')
  if (current.get('m_out')) outputValue.value = current.get('m_out')

  const deployment = () => window.__dustDeployment ?? REFERENCE_DEPLOYMENT

  const run = () => {
    const active = deployment()
    if (summary) {
      summary.innerHTML = `Minting against <code>${escapeHtml(active.tick)}</code> — supply <code>${escapeHtml(format(active.supply))}</code>, <code>${escapeHtml(format(active.unitSats))}</code> sats per unit, per-mint cap <code>${active.limSats === '0' ? 'none' : escapeHtml(format(active.limSats))}</code>.`
    }

    const amt = amount.value.trim()
    const sats = /^[1-9][0-9]*$/.test(amt)
      ? (BigInt(amt) * BigInt(active.unitSats)).toString()
      : amt === ''
        ? ''
        : '0'

    const payload = { p: PROTOCOL.id, op: 'mint', tick: active.tick, amt, sats }

    // When "output matches" is ticked the observed value tracks the payload,
    // which is what a correct builder does. Untick it to model a real mismatch.
    if (matchOutput?.checked) {
      outputValue.value = sats
      outputValue.readOnly = true
    } else {
      outputValue.readOnly = false
    }

    const report = inspect(payload, {
      deployment: active,
      outputValueSats: outputValue.value.trim(),
    })

    const json = renderPayload(payload, 'mint')
    if (code) code.textContent = json
    renderReport(output, report, json)

    amount.setAttribute('aria-invalid', String(report.issues.some((i) => i.field === 'amt')))
    outputValue.setAttribute('aria-invalid', String(report.issues.some((i) => i.field === 'sats')))

    writeParams({ m_amt: amt, m_out: matchOutput?.checked ? '' : outputValue.value.trim() })
  }

  amount.addEventListener('input', run)
  outputValue.addEventListener('input', run)
  matchOutput?.addEventListener('change', run)
  document.addEventListener('dust:deployment', run)

  $('[data-mint-example]')?.addEventListener('click', () => {
    amount.value = '100'
    if (matchOutput) matchOutput.checked = true
    run()
  })

  run()
}

/* --------------------------------------------------------------- Inspector */

function initInspector() {
  const textarea = $('[data-inspector-input]')
  if (!textarea) return

  const output = $('[data-inspector-output]')
  const deploymentToggle = $('#inspector-resolve')
  const outputValue = $('#inspector-output-value')

  const current = params()
  if (current.get('i')) {
    try {
      textarea.value = decodeURIComponent(escape(atob(current.get('i'))))
    } catch {
      /* an unreadable share link simply falls back to the default sample */
    }
  }
  if (!textarea.value) {
    textarea.value = JSON.stringify(EXAMPLES[0].payload, null, 2)
  }

  const run = () => {
    const context = {}
    if (deploymentToggle?.checked) {
      context.deployment = window.__dustDeployment ?? REFERENCE_DEPLOYMENT
    }
    const observed = outputValue?.value.trim()
    if (observed) context.outputValueSats = observed

    const report = inspect(textarea.value, context)
    renderReport(output, report, null, { showFields: true })
    textarea.setAttribute('aria-invalid', String(!report.ok))

    try {
      writeParams({ i: btoa(unescape(encodeURIComponent(textarea.value))) })
    } catch {
      writeParams({ i: '' })
    }
  }

  textarea.addEventListener('input', run)
  deploymentToggle?.addEventListener('change', run)
  outputValue?.addEventListener('input', run)

  for (const button of $$('[data-inspector-load]')) {
    button.addEventListener('click', () => {
      const example = EXAMPLES.find((entry) => entry.id === button.dataset.inspectorLoad)
      if (!example) return
      textarea.value = JSON.stringify(example.payload, null, 2)
      run()
    })
  }

  $('[data-inspector-clear]')?.addEventListener('click', () => {
    textarea.value = ''
    run()
  })

  // Allow the conformance lab to hand a case to the inspector.
  document.addEventListener('dust:inspect', (event) => {
    textarea.value = event.detail.source
    if (deploymentToggle) deploymentToggle.checked = Boolean(event.detail.deployment)
    if (outputValue) outputValue.value = event.detail.outputValueSats ?? ''
    if (event.detail.deployment) window.__dustDeployment = event.detail.deployment
    run()
    textarea.scrollIntoView({ block: 'center' })
    textarea.focus()
  })

  run()
}

/* ------------------------------------------------------- Shared report view */

function renderReport(container, report, json, options = {}) {
  if (!container) return
  container.textContent = ''

  const verdict = el(
    'div',
    { class: 'verdict', 'data-state': report.ok ? 'valid' : 'invalid', role: 'status' },
    el('span', { class: 'verdict-mark', 'aria-hidden': 'true' }, report.ok ? '✓' : '!'),
    el(
      'span',
      {},
      report.ok
        ? `Valid ${report.op}${report.tick ? ` for ticker “${report.tick}”` : ''}.`
        : 'Rejected. This payload would not be indexed.',
    ),
  )
  container.append(verdict)

  if (report.issues.length > 0) {
    const list = el('ul', { class: 'issue-list' })
    for (const issue of report.issues) {
      list.append(
        el(
          'li',
          { class: 'issue' },
          el('code', {}, issue.code),
          el('div', {}, issue.message),
          el('div', { html: chip(issue.status) }),
        ),
      )
    }
    container.append(list)
  }

  for (const warning of report.warnings ?? []) {
    container.append(
      el(
        'div',
        { class: 'issue warning' },
        el('code', {}, 'warning'),
        el('div', {}, warning.message),
        el('div', { html: chip(warning.status) }),
      ),
    )
  }

  if (report.result?.derived) {
    const derived = el('div', { class: 'derived' })
    for (const row of report.result.derived) {
      derived.append(
        el(
          'div',
          { class: 'derived-row' },
          el('div', {}, el('b', {}, row.label), el('small', {}, row.note)),
          el('span', {}, row.value),
        ),
      )
    }
    container.append(derived)
  }

  if (options.showFields && report.fields.length > 0) {
    const wrapper = el('div', { class: 'field-report' })
    for (const field of report.fields) {
      wrapper.append(
        el(
          'div',
          {
            class: 'field-report-row',
            'data-known': String(field.known),
            'data-missing': String(Boolean(field.missing)),
          },
          el('code', {}, field.name),
          el(
            'div',
            {},
            el(
              'span',
              { class: 'value' },
              field.missing ? '— missing —' : JSON.stringify(field.value),
            ),
            el('span', { class: 'constraint' }, field.constraint),
          ),
        ),
      )
    }
    container.append(wrapper)
  }

  if (json) {
    container.append(
      el(
        'div',
        { class: 'packet' },
        el(
          'div',
          { class: 'packet-header' },
          el('span', {}, 'Generated payload'),
          el('button', { class: 'copy-button', type: 'button', 'data-copy': json }, 'Copy JSON'),
        ),
        el('pre', {}, el('code', {}, json)),
      ),
    )
    // The copy button is created after the global handler ran, so wire it here.
    wireCopy(container)
  }
}

function wireCopy(root) {
  for (const button of $$('[data-copy]', root)) {
    if (button.dataset.wired === 'true') continue
    button.dataset.wired = 'true'
    button.addEventListener('click', async () => {
      const original = button.textContent
      try {
        await navigator.clipboard.writeText(button.getAttribute('data-copy'))
        button.textContent = 'Copied'
        button.dataset.state = 'done'
      } catch {
        button.textContent = 'Copy failed'
      }
      window.setTimeout(() => {
        button.textContent = original
        delete button.dataset.state
      }, 1800)
    })
  }
}

/* ================================================================== *
 * Transaction visualizer
 * ================================================================== */

function initVisualizer() {
  const root = $('[data-visualizer]')
  if (!root) return

  const unitInput = $('#viz-unit-sats')
  const inputsHost = $('[data-viz-inputs]')
  const outputsHost = $('[data-viz-outputs]')
  const diagram = $('[data-viz-diagram]')
  const report = $('[data-viz-report]')
  const scenarioSelect = $('[data-viz-scenario]')

  let state = structuredClone(SCENARIOS[0])

  if (scenarioSelect) {
    for (const scenario of SCENARIOS) {
      scenarioSelect.append(el('option', { value: scenario.id }, scenario.title))
    }
    scenarioSelect.addEventListener('change', () => {
      const found = SCENARIOS.find((entry) => entry.id === scenarioSelect.value)
      if (found) {
        state = structuredClone(found)
        syncInputs()
        render()
      }
    })
  }

  function syncInputs() {
    if (unitInput) unitInput.value = state.unitSats
    renderRows(inputsHost, state.inputs, 'input')
    renderRows(outputsHost, state.outputs, 'output')
  }

  function renderRows(host, rows, kind) {
    if (!host) return
    host.textContent = ''
    rows.forEach((row, index) => {
      const kindSelect = el(
        'select',
        {
          'aria-label': `${kind} ${index + 1} type`,
          onchange: (event) => {
            row.kind = event.target.value
            if (row.kind === 'colored' && row.units == null) row.units = '1'
            render()
          },
        },
        ...(kind === 'input'
          ? [
              el('option', { value: 'colored' }, 'DUST-20'),
              el('option', { value: 'cardinal' }, 'Ordinary BTC'),
            ]
          : [
              el('option', { value: 'colored' }, 'DUST-20'),
              el('option', { value: 'cardinal' }, 'Ordinary BTC'),
              el('option', { value: 'unsupported' }, 'Unsupported'),
            ]),
      )
      kindSelect.value = row.kind

      const unitsInput = el('input', {
        type: 'text',
        inputmode: 'numeric',
        value: row.units ?? '',
        placeholder: 'units',
        'aria-label': `${kind} ${index + 1} units`,
        disabled: row.kind !== 'colored',
        oninput: (event) => {
          row.units = event.target.value.trim()
          if (kind === 'output') row.valueSats = undefined
          render()
        },
      })

      const satsInput = el('input', {
        type: 'text',
        inputmode: 'numeric',
        value: row.valueSats ?? '',
        placeholder: 'sats',
        'aria-label': `${kind} ${index + 1} satoshis`,
        oninput: (event) => {
          row.valueSats = event.target.value.trim()
          render()
        },
      })

      const remove = el(
        'button',
        {
          class: 'icon-button',
          type: 'button',
          'aria-label': `Remove ${kind} ${index + 1}`,
          onclick: () => {
            rows.splice(index, 1)
            syncInputs()
            render()
          },
        },
        '×',
      )

      host.append(el('div', { class: 'io-row' }, kindSelect, unitsInput, satsInput, remove))
    })
  }

  $('[data-viz-add-input]')?.addEventListener('click', () => {
    state.inputs.push({ kind: 'cardinal', valueSats: '10000', label: `Input ${state.inputs.length + 1}` })
    syncInputs()
    render()
  })

  $('[data-viz-add-output]')?.addEventListener('click', () => {
    state.outputs.push({ kind: 'colored', units: '1', label: `Output ${state.outputs.length + 1}` })
    syncInputs()
    render()
  })

  unitInput?.addEventListener('input', () => {
    state.unitSats = unitInput.value.trim()
    render()
  })

  function render() {
    let result
    try {
      result = simulateTransfer(state)
    } catch (error) {
      diagram.textContent = ''
      report.textContent = ''
      report.append(
        el(
          'div',
          { class: 'verdict', 'data-state': 'invalid', role: 'status' },
          el('span', { class: 'verdict-mark', 'aria-hidden': 'true' }, '!'),
          el('span', {}, error.message),
        ),
      )
      return
    }
    renderDiagram(diagram, result, state)
    renderVizReport(report, result)
  }

  syncInputs()
  render()
}

function renderDiagram(host, result, state) {
  if (!host) return
  host.textContent = ''

  const inputsSide = el(
    'div',
    { class: 'utxo-side' },
    el('p', { class: 'utxo-side-title' }, 'Inputs', el('span', {}, `${format(result.totalIn)} sats`)),
  )
  const inputStack = el('div', { class: 'utxo-stack' })
  for (const input of result.inputs) {
    inputStack.append(
      el(
        'div',
        { class: 'utxo', 'data-kind': input.kind },
        el(
          'span',
          { class: 'label' },
          el('span', {}, input.kind === 'colored' ? 'DUST-20 input' : 'Ordinary BTC input'),
          el('span', {}, `#${input.index}`),
        ),
        el(
          'strong',
          {},
          input.units != null ? `${format(input.units)} units` : `${format(input.valueSats)} sats`,
        ),
        el(
          'small',
          {},
          input.units != null
            ? `${format(input.valueSats)} sats — ${format(state.unitSats)} sats per unit`
            : 'Cardinal value, available to pay the fee',
        ),
      ),
    )
  }
  inputsSide.append(inputStack)

  const outputsSide = el(
    'div',
    { class: 'utxo-side' },
    el('p', { class: 'utxo-side-title' }, 'Outputs', el('span', {}, `${format(result.totalOut)} sats`)),
  )
  const outputStack = el('div', { class: 'utxo-stack' })
  for (const output of result.outputs) {
    const burned = output.kind === 'unsupported' && output.received === 0n
    outputStack.append(
      el(
        'div',
        { class: 'utxo', 'data-kind': output.kind, 'data-burn': String(burned) },
        el(
          'span',
          { class: 'label' },
          el(
            'span',
            {},
            output.kind === 'colored'
              ? 'DUST-20 output'
              : output.kind === 'unsupported'
                ? 'Unsupported output'
                : 'Ordinary BTC output',
          ),
          el('span', {}, `#${output.index}`),
        ),
        el(
          'strong',
          {},
          output.received > 0n ? `${format(output.received)} units` : `${format(output.valueSats)} sats`,
        ),
        el(
          'small',
          {},
          output.received > 0n
            ? `${format(output.valueSats)} sats carrying units`
            : output.kind === 'colored'
              ? 'No whole unit lands here'
              : `${format(output.valueSats)} sats`,
        ),
      ),
    )
  }
  if (result.fee > 0n) {
    outputStack.append(
      el(
        'div',
        { class: 'utxo', 'data-kind': 'cardinal' },
        el('span', { class: 'label' }, el('span', {}, 'Miner fee'), el('span', {}, 'implicit')),
        el('strong', {}, `${format(result.fee)} sats`),
        el('small', {}, 'Everything the transaction does not pay out'),
      ),
    )
  }
  outputsSide.append(outputStack)

  host.append(inputsSide, el('div', { class: 'flow-arrow', 'aria-hidden': 'true' }, '↓'))
  host.append(outputsSide)
  host.append(buildSatBar(result))
}

/** A proportional map of the output satoshi range showing where units sit. */
function buildSatBar(result) {
  const wrapper = el('div', {})
  const total = result.totalIn
  if (total === 0n) return wrapper

  const bar = el('div', {
    class: 'sat-bar',
    role: 'img',
    'aria-label': `Satoshi layout: ${format(result.survivingTotal)} units survive, ${format(result.burnedTotal)} are burned, fee ${format(result.fee)} satoshis.`,
  })

  for (const output of result.outputs) {
    const percent = Number((output.valueSats * 10000n) / total) / 100
    if (percent <= 0) continue
    const kind = output.received > 0n ? 'colored' : output.kind === 'unsupported' ? 'burn' : 'cardinal'
    bar.append(
      el(
        'span',
        {
          class: 'sat-seg',
          'data-kind': kind,
          style: `width:${percent}%`,
          title: `${output.label}: ${format(output.valueSats)} sats`,
        },
        percent > 8 ? (output.received > 0n ? `${format(output.received)}u` : `#${output.index}`) : '',
      ),
    )
  }
  if (result.fee > 0n) {
    const percent = Number((result.fee * 10000n) / total) / 100
    bar.append(
      el(
        'span',
        {
          class: 'sat-seg',
          'data-kind': 'fee',
          style: `width:${percent}%`,
          title: `Miner fee: ${format(result.fee)} sats`,
        },
        percent > 8 ? 'fee' : '',
      ),
    )
  }

  wrapper.append(bar)
  wrapper.append(
    el(
      'div',
      { class: 'sat-legend' },
      el('span', {}, el('i', { style: 'background:#f4c86a' }), 'Carries units'),
      el('span', {}, el('i', { style: 'background:#d9e6ee' }), 'Ordinary bitcoin'),
      el('span', {}, el('i', { style: 'background:#e9c6bd' }), 'Miner fee'),
      el('span', {}, el('i', { style: 'background:#d99b8c' }), 'Burns units'),
    ),
  )
  return wrapper
}

function renderVizReport(host, result) {
  if (!host) return
  host.textContent = ''

  const state = result.errors.length > 0 ? 'invalid' : result.burnedTotal > 0n ? 'invalid' : 'valid'
  host.append(
    el(
      'div',
      { class: 'verdict', 'data-state': state, role: 'status' },
      el('span', { class: 'verdict-mark', 'aria-hidden': 'true' }, state === 'valid' ? '✓' : '!'),
      el(
        'span',
        {},
        result.errors.length > 0
          ? 'This transaction cannot be built.'
          : result.burnedTotal > 0n
            ? `${format(result.burnedTotal)} of ${format(result.inputUnits)} units would be destroyed.`
            : `All ${format(result.inputUnits)} units survive.`,
      ),
    ),
  )

  for (const error of result.errors) {
    host.append(el('div', { class: 'issue' }, el('code', {}, error.code), el('div', {}, error.message)))
  }
  for (const warning of result.warnings) {
    host.append(
      el(
        'div',
        { class: 'issue warning' },
        el('code', {}, 'warning'),
        el('div', {}, warning.message),
      ),
    )
  }

  const derived = el('div', { class: 'derived' })
  const rows = [
    ['Units in', format(result.inputUnits), 'Total units carried by the colored inputs.'],
    ['Units surviving', format(result.survivingTotal), 'Whole units that land inside a supported output.'],
    ['Units burned', format(result.burnedTotal), 'Destroyed by fees, unsupported outputs, or splitting.'],
    ['Total input value', `${format(result.totalIn)} sats`, `${satsToBtc(result.totalIn)} BTC`],
    ['Total output value', `${format(result.totalOut)} sats`, 'Sum of every output.'],
    ['Miner fee', `${format(result.fee)} sats`, 'Inputs minus outputs.'],
  ]
  for (const [label, value, note] of rows) {
    derived.append(
      el(
        'div',
        { class: 'derived-row' },
        el('div', {}, el('b', {}, label), el('small', {}, note)),
        el('span', {}, value),
      ),
    )
  }
  host.append(derived)

  for (const transition of result.transitions) {
    const list = el('div', { class: 'field-report' })
    for (const landing of transition.landings) {
      list.append(
        el(
          'div',
          { class: 'field-report-row', 'data-known': String(!landing.burned) },
          el('code', {}, `#${landing.output}`),
          el(
            'div',
            {},
            el(
              'span',
              { class: 'value' },
              landing.burned ? 'no units survive here' : `${format(landing.units)} units at offset ${format(landing.offsetSats)}`,
            ),
            el('span', { class: 'constraint' }, landing.note ?? landing.label),
          ),
        ),
      )
    }
    host.append(
      el(
        'div',
        {},
        el(
          'p',
          { style: 'margin:.9rem 0 .4rem;font-size:.84rem;font-weight:700;color:var(--night)' },
          `${transition.label}: ${format(transition.units)} units in, ${format(transition.surviving)} survive, ${format(transition.burned)} burned`,
        ),
        list,
      ),
    )
  }
}

/* ================================================================== *
 * Conformance laboratory
 * ================================================================== */

function initConformance() {
  const host = $('[data-conformance]')
  if (!host) return

  renderStatusLegend($('[data-status-legend]'))
  host.textContent = ''

  let passed = 0
  const groups = [...new Set(VECTORS.map((vector) => vector.group))]

  for (const group of groups) {
    host.append(el('h3', { id: `group-${slug(group)}` }, group))
    for (const vector of VECTORS.filter((entry) => entry.group === group)) {
      const source = vector.raw != null ? vector.raw : JSON.stringify(vector.payload, null, 2)
      const context = {}
      if (vector.context?.deployment) {
        context.deployment = vector.context.deployment
        context.existingTickers = [vector.context.deployment.tick]
      }
      if (vector.context?.outputValueSats != null) {
        context.outputValueSats = vector.context.outputValueSats
      }

      const report = inspect(source, context)
      const expectedAccept = vector.expect === 'accept'
      const agrees =
        report.ok === expectedAccept && (expectedAccept || report.issues[0]?.code === vector.code)
      if (agrees) passed += 1

      const body = el('div', { class: 'vector-body', hidden: true })
      body.append(
        el('p', {}, vector.reason),
        el(
          'div',
          { class: 'packet' },
          el(
            'div',
            { class: 'packet-header' },
            el('span', {}, 'Input'),
            el('button', { class: 'copy-button', type: 'button', 'data-copy': source }, 'Copy'),
          ),
          el('pre', {}, el('code', {}, source)),
        ),
      )

      if (vector.context?.deployment) {
        const deployment = vector.context.deployment
        body.append(
          el(
            'p',
            {},
            el('strong', {}, 'Resolved deployment: '),
            `${deployment.tick} — supply ${format(deployment.supply)}, ${format(deployment.unitSats)} sats per unit, ${deployment.minted === '0' ? 'nothing minted yet' : `${format(deployment.minted)} already minted`}.`,
          ),
        )
      }
      if (vector.context?.outputValueSats != null) {
        body.append(
          el(
            'p',
            {},
            el('strong', {}, 'Observed output value: '),
            `${format(vector.context.outputValueSats)} sats.`,
          ),
        )
      }

      const outcome = el('div', {})
      renderReport(outcome, report, null, { showFields: true })
      body.append(outcome)

      body.append(
        el(
          'div',
          { class: 'lab-actions', style: 'margin-top:.9rem' },
          el(
            'a',
            {
              class: 'button small secondary',
              href: `playground.html?case=${vector.id}#inspector`,
              onclick: (event) => {
                // Same-page hand-off when the playground is already loaded.
                if (!$('[data-inspector-input]')) return
                event.preventDefault()
                document.dispatchEvent(
                  new CustomEvent('dust:inspect', {
                    detail: {
                      source,
                      deployment: vector.context?.deployment ?? null,
                      outputValueSats: vector.context?.outputValueSats ?? '',
                    },
                  }),
                )
              },
            },
            'Open in playground',
          ),
        ),
      )

      const summary = el(
        'button',
        {
          class: 'vector-summary',
          type: 'button',
          'aria-expanded': 'false',
          onclick: (event) => {
            const open = body.hidden
            body.hidden = !open
            event.currentTarget.setAttribute('aria-expanded', String(open))
          },
        },
        el('span', { html: chip(expectedAccept ? 'verified' : 'unresolved') }),
        el('b', {}, vector.title),
        el(
          'span',
          { class: 'live-result', 'data-ok': String(agrees) },
          agrees ? '✓ ' : '✗ ',
          expectedAccept ? 'accepted' : `rejected: ${vector.code}`,
        ),
      )

      const article = el(
        'article',
        {
          class: 'vector',
          id: `case-${vector.id}`,
          'data-group': group,
          'data-expect': vector.expect,
          'data-search': `${vector.title} ${vector.reason} ${vector.code ?? ''}`.toLowerCase(),
        },
        summary,
        body,
      )
      host.append(article)
      wireCopy(article)
    }
  }

  const status = $('[data-conformance-status]')
  if (status) {
    status.textContent = `${passed} of ${VECTORS.length} cases behave exactly as documented, executed live in your browser just now.`
    status.dataset.ok = String(passed === VECTORS.length)
  }

  renderIssueCodes($('[data-issue-codes]'))
  initConformanceFilter()

  // Deep link straight to a case.
  const requested = new URLSearchParams(window.location.search).get('case')
  if (requested) {
    const target = document.getElementById(`case-${requested}`)
    if (target) {
      target.querySelector('.vector-summary')?.click()
      target.scrollIntoView({ block: 'center' })
    }
  }
}

function renderIssueCodes(container) {
  if (!container) return
  const codes = new Map()
  for (const vector of VECTORS) {
    if (!vector.code) continue
    if (!codes.has(vector.code)) codes.set(vector.code, [])
    codes.get(vector.code).push(vector)
  }
  container.textContent = ''
  const body = el('tbody', {})
  for (const [code, cases] of [...codes].sort((a, b) => a[0].localeCompare(b[0]))) {
    body.append(
      el(
        'tr',
        {},
        el('td', {}, el('code', {}, code)),
        el('td', {}, cases[0].reason),
        el(
          'td',
          {},
          cases.map((entry, index) =>
            el(
              'span',
              {},
              index > 0 ? ', ' : '',
              el('a', { href: `#case-${entry.id}` }, entry.title),
            ),
          ),
        ),
      ),
    )
  }
  container.append(
    el(
      'table',
      {},
      el(
        'thead',
        {},
        el('tr', {}, el('th', {}, 'Code'), el('th', {}, 'Meaning'), el('th', {}, 'Cases')),
      ),
      body,
    ),
  )
}

function initConformanceFilter() {
  const search = $('[data-vector-search]')
  const filters = $('[data-vector-filters]')
  if (!search) return
  const vectors = $$('.vector')
  let expect = 'all'

  const apply = () => {
    const query = search.value.trim().toLowerCase()
    for (const vector of vectors) {
      const matchesQuery = !query || vector.dataset.search.includes(query)
      const matchesExpect = expect === 'all' || vector.dataset.expect === expect
      vector.hidden = !(matchesQuery && matchesExpect)
    }
  }

  search.addEventListener('input', apply)
  filters?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-expect-filter]')
    if (!button) return
    expect = button.dataset.expectFilter
    for (const other of $$('button[data-expect-filter]', filters)) {
      other.setAttribute('aria-pressed', String(other === button))
    }
    apply()
  })
  apply()
}

/* ================================================================== *
 * Indexer, safety, glossary
 * ================================================================== */

function initIndexer() {
  const stages = $('[data-indexer-stages]')
  if (stages) {
    stages.textContent = ''
    for (const stage of INDEXER_STAGES) {
      stages.append(
        el(
          'div',
          { class: 'timeline-item', id: `stage-${stage.id}` },
          el('div', { class: 'timeline-key' }, stage.label.toUpperCase()),
          el(
            'div',
            {},
            el(
              'div',
              { class: 'field-entry-head' },
              el('h3', {}, stage.title),
              chipNode(stage.status),
            ),
            el('p', {}, stage.body),
          ),
        ),
      )
    }
  }

  const record = $('[data-allocation-record]')
  if (record) {
    const body = el('tbody', {})
    for (const row of ALLOCATION_RECORD) {
      body.append(
        el(
          'tr',
          {},
          el('td', {}, el('code', {}, row.field)),
          el('td', {}, row.why),
          el('td', {}, row.minimum),
        ),
      )
    }
    record.textContent = ''
    record.append(
      el(
        'table',
        {},
        el(
          'thead',
          {},
          el(
            'tr',
            {},
            el('th', {}, 'Field'),
            el('th', {}, 'Why it is needed'),
            el('th', {}, 'Minimum safe behaviour'),
          ),
        ),
        body,
      ),
    )
  }
}

function initSafety() {
  const host = $('[data-safety]')
  if (!host) return
  host.textContent = ''
  for (const item of SAFETY) {
    const tone = item.severity === 'critical' ? 'critical' : item.severity === 'high' ? '' : 'info'
    host.append(
      el(
        'div',
        { class: `notice ${tone}`.trim(), id: `safety-${item.id}` },
        el('span', { class: 'notice-mark', 'aria-hidden': 'true' }, item.severity === 'critical' ? '!' : 'i'),
        el(
          'div',
          {},
          el('p', { class: 'notice-title' }, item.title),
          el('p', {}, item.body),
          el(
            'p',
            {},
            el('span', {
              class: 'chip muted',
              html: escapeHtml(`${item.severity} priority`),
            }),
          ),
        ),
      ),
    )
  }
}

function initGlossary() {
  const list = $('[data-glossary]')
  if (list) {
    list.textContent = ''
    for (const entry of GLOSSARY) {
      list.append(
        el(
          'div',
          {
            class: 'glossary-item',
            id: `term-${slug(entry.term)}`,
            'data-search': `${entry.term} ${entry.definition}`.toLowerCase(),
          },
          el('dt', {}, entry.term),
          el('dd', {}, entry.definition),
        ),
      )
    }
  }

  const faq = $('[data-faq]')
  if (faq) {
    faq.textContent = ''
    for (const entry of FAQ) {
      faq.append(
        el(
          'details',
          { class: 'faq-item', id: `faq-${slug(entry.q)}` },
          el('summary', {}, entry.q),
          el('p', {}, entry.a),
        ),
      )
    }
  }

  const search = $('[data-glossary-search]')
  if (search && list) {
    const items = $$('.glossary-item', list)
    const count = $('[data-glossary-count]')
    const apply = () => {
      const query = search.value.trim().toLowerCase()
      let shown = 0
      for (const item of items) {
        const visible = !query || item.dataset.search.includes(query)
        item.hidden = !visible
        if (visible) shown += 1
      }
      if (count) {
        count.textContent =
          shown === items.length
            ? `Showing all ${items.length} terms.`
            : `Showing ${shown} of ${items.length} terms.`
      }
    }
    search.addEventListener('input', apply)
    apply()
  }

  // Open a FAQ entry that was deep-linked.
  if (window.location.hash.startsWith('#faq-')) {
    const target = document.querySelector(window.location.hash)
    if (target) target.open = true
  }
}

/* ================================================================== *
 * Home and how-it-works
 * ================================================================== */

function initScenarioGallery() {
  const host = $('[data-scenarios]')
  if (!host) return
  host.textContent = ''
  for (const scenario of SCENARIOS) {
    const result = simulateTransfer(scenario)
    const safe = result.burnedTotal === 0n
    host.append(
      el(
        'article',
        { class: 'card', id: `scenario-${scenario.id}`, style: 'margin-bottom:.8rem' },
        el(
          'div',
          { class: 'field-entry-head' },
          el('h3', {}, scenario.title),
          el('span', {
            class: `chip ${safe ? 'good' : 'danger'}`,
            html: escapeHtml(safe ? 'All units survive' : `${format(result.burnedTotal)} units burned`),
          }),
        ),
        el('p', {}, scenario.summary),
        buildSatBar(result),
        el(
          'p',
          { style: 'margin-top:.7rem;font-size:.85rem' },
          `${format(result.inputUnits)} units in — ${format(result.survivingTotal)} survive, ${format(result.burnedTotal)} burned, ${format(result.fee)} sats to the miner.`,
        ),
        el(
          'a',
          { class: 'button small secondary', href: `transactions.html#visualizer` },
          'Open in the visualizer',
        ),
      ),
    )
  }
}

function initOperationSummary() {
  const host = $('[data-operation-summary]')
  if (!host) return
  host.textContent = ''
  for (const operation of OPERATIONS) {
    host.append(
      el(
        'article',
        { class: 'card' },
        el(
          'div',
          { class: 'field-entry-head' },
          el('h3', {}, operation.label),
          chipNode(operation.status),
        ),
        el('p', {}, operation.summary),
        el(
          'p',
          { style: 'font-size:.82rem;color:var(--muted-soft)' },
          operation.carrier === 'inscription' ? 'Carried by an inscription' : 'An ordinary Bitcoin spend',
        ),
      ),
    )
  }
}

/* ------------------------------------------------------------------ Start */

const PAGE_MODULES = {
  home: [initOperationSummary],
  'how-it-works': [initScenarioGallery],
  playground: [initPlayground],
  transactions: [initVisualizer, initScenarioGallery],
  reference: [initReference],
  conformance: [initConformance],
  indexer: [initIndexer],
  safety: [initSafety],
  glossary: [initGlossary],
}

function start() {
  const page = document.body.dataset.page
  for (const module of PAGE_MODULES[page] ?? []) {
    try {
      module()
    } catch (error) {
      // A failure in one widget must never take down the rest of the page.
      console.error(`DUST-20: ${page} module failed`, error)
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start)
} else {
  start()
}
