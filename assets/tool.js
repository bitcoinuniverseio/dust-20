/**
 * DUST-20 decoder, builders, conformance runner and allocation simulator.
 *
 * Loaded only by playground.html and transactions.html. Everything runs in
 * this browser tab: nothing you paste is logged, stored or transmitted, and
 * the only network request this file can make is for conformance.json from
 * this same origin.
 *
 * All arithmetic uses BigInt: a satoshi quantity can exceed the safe integer
 * range, and a double would lose precision silently.
 */

import { SPEC_VERSION } from './protocol-schema.js'
import { inspect, simulateTransfer, format, renderPayload, positiveInteger } from './protocol.js'

const $ = (selector, root = document) => root.querySelector(selector)
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]
const encoder = new TextEncoder()
const byteLength = (value) => encoder.encode(value).length

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"]/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character],
  )

const RULE_BY_FIELD = {
  p: 'DUST-4.1',
  op: 'DUST-4.2',
  tick: 'DUST-4.3',
  supply: 'DUST-5.2',
  unit_sats: 'DUST-5.3',
  max_sats: 'DUST-5.4',
  lim_sats: 'DUST-5.6',
  amt: 'DUST-6.3',
  sats: 'DUST-6.4',
}

/* ------------------------------------------------------------------ *
 * Byte map: where each value sits inside the raw payload
 * ------------------------------------------------------------------ */

/**
 * Locate every "key": "value" pair in the raw text and report the UTF-8 byte
 * offset and length of each value literal. Used to render the byte map.
 * Returns an empty list when the text is too malformed to walk.
 */
function byteMap(raw) {
  const rows = []
  let cursor = 0
  for (;;) {
    const keyOpen = raw.indexOf('"', cursor)
    if (keyOpen === -1) break
    const keyClose = closingQuote(raw, keyOpen)
    if (keyClose === -1) break
    const colon = raw.indexOf(':', keyClose)
    if (colon === -1) break
    const valueOpen = raw.indexOf('"', colon)
    if (valueOpen === -1) break
    const valueClose = closingQuote(raw, valueOpen)
    if (valueClose === -1) break
    const key = raw.slice(keyOpen + 1, keyClose)
    const literal = raw.slice(valueOpen, valueClose + 1)
    rows.push({
      key,
      offset: byteLength(raw.slice(0, valueOpen)),
      bytes: byteLength(literal),
      value: raw.slice(valueOpen + 1, valueClose),
    })
    cursor = valueClose + 1
  }
  return rows
}

function closingQuote(text, open) {
  let index = open + 1
  while (index < text.length) {
    if (text[index] === '\\') {
      index += 2
      continue
    }
    if (text[index] === '"') return index
    index += 1
  }
  return -1
}

/* ------------------------------------------------------------------ *
 * Report rendering
 * ------------------------------------------------------------------ */

function verdict(ok) {
  return ok
    ? '<span class="verdict verdict--pass">PASS</span>'
    : '<span class="verdict verdict--fail">FAIL</span>'
}

function renderReport(host, report, raw) {
  const parts = []
  const map = raw ? byteMap(raw) : []
  const byKey = new Map(map.map((row) => [row.key, row]))

  parts.push(
    `<div class="panel-head"><h3>Result</h3>${verdict(report.ok)}</div><div class="panel-body">`,
  )

  if (report.issues.length > 0) {
    for (const issue of report.issues) {
      parts.push(
        `<div class="issue"><span class="issue-code">${escapeHtml(issue.code)}</span><p>${escapeHtml(issue.message)}</p></div>`,
      )
    }
  }

  if (report.fields.length > 0) {
    const rows = report.fields
      .map((field) => {
        const located = byKey.get(field.name)
        const state = field.missing
          ? '<span class="tag tag--unresolved">ABSENT</span>'
          : field.known
            ? '<span class="tag tag--verified">KNOWN</span>'
            : '<span class="tag tag--unresolved">UNKNOWN</span>'
        const rule = RULE_BY_FIELD[field.name]
        return `<tr>
          <td class="mono">${escapeHtml(field.name)}</td>
          <td class="num">${located ? located.offset : '-'}</td>
          <td class="num">${located ? located.bytes : '-'}</td>
          <td class="mono">${field.value == null ? '-' : escapeHtml(field.value)}</td>
          <td>${state}${rule ? ` <a class="tag tag--ref" href="specification.html#${rule}">${rule}</a>` : ''}<small>${escapeHtml(field.constraint)}</small></td>
        </tr>`
      })
      .join('')
    parts.push(
      `<div class="scroll"><table class="tbl"><caption>Byte map and field validation</caption><thead><tr><th>Field</th><th>Offset</th><th>Bytes</th><th>Value</th><th>Status and constraint</th></tr></thead><tbody>${rows}</tbody></table></div>`,
    )
  }

  if (report.result?.derived?.length) {
    const rows = report.result.derived
      .map(
        (row) =>
          `<div class="readout-row"><span>${escapeHtml(row.label)}</span><span>${escapeHtml(row.value)}<small>${escapeHtml(row.note)}</small></span></div>`,
      )
      .join('')
    parts.push(`<h4>Derived values</h4><div class="readout">${rows}</div>`)
  }

  for (const warning of report.warnings ?? []) {
    parts.push(`<div class="warnbox">${escapeHtml(warning.message)}</div>`)
  }

  parts.push('</div>')
  host.innerHTML = parts.join('')
}

/* ------------------------------------------------------------------ *
 * Decoder
 * ------------------------------------------------------------------ */

function readContext(root) {
  const context = {}
  const outputValue = $('[data-ctx-output]', root)?.value.trim()
  if (outputValue) context.outputValueSats = outputValue

  const tick = $('[data-ctx-tick]', root)?.value.trim()
  const unitSats = $('[data-ctx-unit]', root)?.value.trim()
  const supply = $('[data-ctx-supply]', root)?.value.trim()
  const limSats = $('[data-ctx-lim]', root)?.value.trim()
  const minted = $('[data-ctx-minted]', root)?.value.trim()
  if (tick && unitSats && supply) {
    context.deployment = {
      tick,
      unitSats,
      supply,
      limSats: limSats || '0',
      minted: minted || '0',
    }
    context.existingTickers = [tick]
  }
  return context
}

function initDecoder() {
  const root = $('[data-decoder]')
  if (!root) return
  const input = $('textarea', root)
  const output = $('[data-decoder-output]', root)

  const run = () => {
    const raw = input.value.trim()
    if (!raw) {
      output.innerHTML =
        '<div class="panel-head"><h3>Result</h3><span class="verdict verdict--idle">IDLE</span></div><div class="panel-body"><p class="lede">Paste DUST-20 inscription content above. Nothing you paste leaves this page.</p></div>'
      return
    }
    const context = readContext(root)
    // A deploy must not resolve against itself, so only offer the ticker list
    // when the payload is not a deploy of that same identity.
    const report = inspect(raw, context)
    if (
      report.op === 'deploy' &&
      report.issues.some((issue) => issue.code === 'duplicate_deployment') &&
      !$('[data-ctx-duplicate]', root)?.checked
    ) {
      const retry = inspect(raw, { ...context, existingTickers: [] })
      renderReport(output, retry, raw)
      return
    }
    renderReport(output, report, raw)
  }

  input.addEventListener('input', run)
  for (const control of $$('input, select', root)) control.addEventListener('input', run)
  for (const button of $$('[data-sample]', root)) {
    button.addEventListener('click', () => {
      input.value = button.dataset.sample
      run()
      input.focus()
    })
  }
  run()
}

/* ------------------------------------------------------------------ *
 * Deploy and mint builders
 * ------------------------------------------------------------------ */

function safeProduct(a, b) {
  try {
    return (positiveInteger(a, 'a') * positiveInteger(b, 'b')).toString()
  } catch {
    return null
  }
}

function initBuilders() {
  const deploy = $('[data-build-deploy]')
  if (deploy) {
    const out = $('[data-build-output]', deploy)
    const run = () => {
      const tick = $('[name=tick]', deploy).value.trim()
      const supply = $('[name=supply]', deploy).value.trim()
      const unit = $('[name=unit_sats]', deploy).value.trim()
      const lim = $('[name=lim_sats]', deploy).value.trim()
      const max = safeProduct(supply, unit)
      const payload = { p: 'dust-20', op: 'deploy', tick, supply, unit_sats: unit }
      if (max) payload.max_sats = max
      if (lim) payload.lim_sats = lim
      out.textContent = renderPayload(payload, 'deploy')
      const report = inspect(payload, {})
      $('[data-build-verdict]', deploy).outerHTML = max
        ? verdict(report.ok).replace('<span', '<span data-build-verdict')
        : '<span data-build-verdict class="verdict verdict--idle">IDLE</span>'
      $('[data-build-note]', deploy).textContent = max
        ? `max_sats derived as ${format(max)} from supply x unit_sats (rule DUST-5.4).`
        : 'Enter a supply and a unit_sats to derive max_sats.'
    }
    for (const control of $$('input', deploy)) control.addEventListener('input', run)
    run()
  }

  const mint = $('[data-build-mint]')
  if (mint) {
    const out = $('[data-build-output]', mint)
    const run = () => {
      const tick = $('[name=tick]', mint).value.trim()
      const amt = $('[name=amt]', mint).value.trim()
      const unit = $('[name=unit_sats]', mint).value.trim()
      const supply = $('[name=supply]', mint).value.trim() || '1000000'
      const sats = safeProduct(amt, unit)
      const payload = { p: 'dust-20', op: 'mint', tick, amt }
      if (sats) payload.sats = sats
      out.textContent = renderPayload(payload, 'mint')
      const report = inspect(payload, {
        deployment: { tick, unitSats: unit, supply, limSats: '0', minted: '0' },
        outputValueSats: sats ?? '',
      })
      $('[data-build-verdict]', mint).outerHTML = sats
        ? verdict(report.ok).replace('<span', '<span data-build-verdict')
        : '<span data-build-verdict class="verdict verdict--idle">IDLE</span>'
      $('[data-build-note]', mint).textContent = sats
        ? `The carrying output must hold exactly ${format(sats)} satoshis (rule DUST-6.7).`
        : 'Enter an amount and the deployment unit_sats to derive sats.'
    }
    for (const control of $$('input', mint)) control.addEventListener('input', run)
    run()
  }
}

/* ------------------------------------------------------------------ *
 * Conformance runner
 * ------------------------------------------------------------------ */

function runVector(vector) {
  const input = vector.raw ?? vector.payload
  const report = inspect(input, vector.context ?? {})
  const actual = report.ok ? 'accept' : 'reject'
  const actualCode = report.issues[0]?.code ?? null
  const ok = actual === vector.expect && (vector.expect === 'accept' || actualCode === vector.code)
  return { ok, actual, actualCode, message: report.issues[0]?.message ?? null }
}

async function initRunner() {
  const root = $('[data-runner]')
  if (!root) return
  const body = $('[data-runner-body]', root)
  const summary = $('[data-runner-summary]', root)
  const button = $('[data-runner-run]', root)

  button.addEventListener('click', async () => {
    button.disabled = true
    summary.textContent = 'Loading vectors...'
    let cases = []
    try {
      const base = document.body.dataset.base ?? './'
      const response = await fetch(`${base}conformance.json`, { cache: 'force-cache' })
      const payload = await response.json()
      cases = payload.cases ?? []
    } catch {
      summary.innerHTML =
        '<span class="verdict verdict--fail">FAIL</span> conformance.json could not be loaded from this origin.'
      button.disabled = false
      return
    }

    let passed = 0
    const rows = cases
      .map((vector) => {
        const result = runVector(vector)
        if (result.ok) passed += 1
        const expected =
          vector.expect === 'accept' ? 'accept' : `reject / ${escapeHtml(vector.code ?? '')}`
        const got =
          result.actual === 'accept'
            ? 'accept'
            : `reject / ${escapeHtml(result.actualCode ?? 'none')}`
        return `<tr>
          <td>${result.ok ? '<span class="verdict verdict--pass">PASS</span>' : '<span class="verdict verdict--fail">FAIL</span>'}</td>
          <td class="mono">${escapeHtml(vector.id)}</td>
          <td>${escapeHtml(vector.title)}<small>${escapeHtml(vector.reason)}</small></td>
          <td class="mono">${expected}</td>
          <td class="mono">${got}</td>
        </tr>`
      })
      .join('')

    body.innerHTML = `<div class="scroll"><table class="tbl"><caption>Executed in this browser against assets/protocol.js</caption><thead><tr><th>Result</th><th>Case</th><th>What it checks</th><th>Expected</th><th>Observed</th></tr></thead><tbody>${rows}</tbody></table></div>`
    summary.innerHTML = `${passed === cases.length ? '<span class="verdict verdict--pass">PASS</span>' : '<span class="verdict verdict--fail">FAIL</span>'} ${passed} of ${cases.length} vectors match the published expectation. Document version ${SPEC_VERSION}, Bitcoin mainnet.`
    button.disabled = false
  })
}

/* ------------------------------------------------------------------ *
 * Allocation simulator
 * ------------------------------------------------------------------ */

function satBar(rows, total, kindOf) {
  if (total === 0n) return ''
  const cells = rows
    .map((row) => {
      const width = Number((row.valueSats * 10000n) / total) / 100
      const kind = kindOf(row)
      return `<span class="seg--${kind}" style="flex:0 0 ${width}%" title="${escapeHtml(row.label)}: ${format(row.valueSats)} sats">${width > 9 ? escapeHtml(row.label) : ''}</span>`
    })
    .join('')
  return `<div class="satbar">${cells}</div>`
}

function renderSimulation(host, result) {
  const parts = []
  const status = result.errors.length > 0 || result.burnedTotal > 0n

  parts.push(
    `<div class="panel-head"><h3>Allocation outcome</h3>${verdict(!status)}</div><div class="panel-body">`,
  )

  for (const issue of result.errors) {
    parts.push(
      `<div class="issue"><span class="issue-code">${escapeHtml(issue.code)}</span><p>${escapeHtml(issue.message)}</p></div>`,
    )
  }

  parts.push('<h4>Input satoshi range</h4>')
  parts.push(
    satBar(result.inputs, result.totalIn, (row) => (row.kind === 'colored' ? 'colored' : 'cardinal')),
  )
  parts.push('<h4>Output satoshi range and fee</h4>')
  const outputRows = [...result.outputs]
  if (result.feeRaw > 0n) {
    outputRows.push({
      label: `Fee ${format(result.feeRaw)} sats`,
      valueSats: result.feeRaw,
      kind: 'burn',
    })
  }
  parts.push(
    satBar(outputRows, result.totalIn, (row) =>
      row.kind === 'burn' ? 'burn' : row.kind === 'unsupported' ? 'unsupported' : row.received > 0n ? 'colored' : 'cardinal',
    ),
  )
  parts.push(
    '<div class="satbar-legend"><span class="k-colored">Carries units</span><span class="k-cardinal">Ordinary bitcoin</span><span class="k-burn">Miner fee</span></div>',
  )

  const rows = result.transitions
    .flatMap((transition) =>
      transition.landings.map(
        (landing) => `<tr>
          <td class="mono">${escapeHtml(transition.label)}</td>
          <td class="mono">${escapeHtml(landing.label)}</td>
          <td class="num">${format(landing.units)}</td>
          <td>${landing.burned ? '<span class="verdict verdict--fail">BURNED</span>' : '<span class="verdict verdict--pass">SURVIVES</span>'}<small>${escapeHtml(landing.note ?? `Lands at offset ${format(landing.offsetSats)} of the output.`)}</small></td>
        </tr>`,
      ),
    )
    .join('')

  parts.push(
    `<div class="scroll"><table class="tbl"><caption>Unit landings, computed by ordinal first-in-first-out flow (rule DUST-7.3)</caption><thead><tr><th>From</th><th>To</th><th>Units</th><th>Outcome</th></tr></thead><tbody>${rows || '<tr><td colspan="4">No colored input in this construction.</td></tr>'}</tbody></table></div>`,
  )

  parts.push(
    `<div class="readout">
      <div class="readout-row"><span>Units in</span><span>${format(result.inputUnits)}</span></div>
      <div class="readout-row"><span>Units surviving</span><span>${format(result.survivingTotal)}</span></div>
      <div class="readout-row"><span>Units burned</span><span>${format(result.burnedTotal)}</span></div>
      <div class="readout-row"><span>Miner fee</span><span>${format(result.fee)} sats</span></div>
    </div>`,
  )

  for (const warning of result.warnings) {
    parts.push(`<div class="warnbox">${escapeHtml(warning.message)}</div>`)
  }

  parts.push('</div>')
  host.innerHTML = parts.join('')
}

/**
 * The scenarios come from conformance.json rather than being duplicated here,
 * so the simulator, the static scenario table and the Node test suite are all
 * driven by the same fixtures.
 */
async function initSimulator() {
  const root = $('[data-simulator]')
  if (!root) return
  const output = $('[data-simulator-output]', root)
  const select = $('[data-scenario]', root)
  const base = document.body.dataset.base ?? './'

  let scenarios = []
  try {
    const response = await fetch(`${base}conformance.json`, { cache: 'force-cache' })
    scenarios = (await response.json()).scenarios ?? []
  } catch {
    output.innerHTML =
      '<div class="panel-body"><p class="lede">The scenario fixtures could not be loaded from this origin. Every outcome is published as a static table below.</p></div>'
    return
  }

  const run = () => {
    const scenario = scenarios.find((entry) => entry.id === select.value) ?? scenarios[0]
    if (!scenario) return
    try {
      renderSimulation(output, simulateTransfer(scenario))
    } catch (error) {
      output.innerHTML = `<div class="panel-body"><div class="issue"><span class="issue-code">input_error</span><p>${escapeHtml(error.message)}</p></div></div>`
    }
  }

  select.addEventListener('change', run)
  run()
}

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */

initDecoder()
initBuilders()
initRunner()
initSimulator()
