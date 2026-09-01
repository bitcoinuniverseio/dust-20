/**
 * DUST-20 deterministic client-side validator and transaction simulator.
 *
 * Mirrors the reader profile enforced by the Bitcoin Universe production
 * indexer. Every quantity is handled as a BigInt or a strict decimal
 * string. There is no floating-point arithmetic anywhere in this module:
 * a satoshi value can exceed Number.MAX_SAFE_INTEGER, and a double would
 * lose precision silently.
 *
 * Pure ESM, no dependencies. Runs identically in a browser and in Node.
 */

import { LIMITS, FIELDS_BY_OP, operationById } from './protocol-schema.js'

const STRICT_POSITIVE = /^[1-9][0-9]*$/
const STRICT_NON_NEGATIVE = /^(?:0|[1-9][0-9]*)$/
const TICK_FORBIDDEN = /[\u0000-\u001f\u007f\s/?#\\]/u

/** A single validation failure. Codes are stable and referenced by fixtures. */
export class Issue {
  constructor(code, message, field = null, status = 'universe') {
    this.code = code
    this.message = message
    this.field = field
    this.status = status
  }
}

class ParseError extends Error {
  constructor(issue) {
    super(issue.message)
    this.issue = issue
  }
}

const fail = (code, message, field, status) => {
  throw new ParseError(new Issue(code, message, field, status))
}

/* ------------------------------------------------------------------ *
 * Reader: flat JSON object of strings
 * ------------------------------------------------------------------ */

/**
 * Parse inscription content the way the production indexer does.
 * Rejects anything that is not a single flat JSON object whose values are
 * all strings: nesting, arrays, numbers, booleans, null, duplicate keys,
 * control characters and trailing content.
 */
export function parseFlatStringObject(source) {
  if (typeof source !== 'string') fail('not_object', 'Content must be text.')

  const bytes = new TextEncoder().encode(source).length
  if (bytes === 0) fail('not_object', 'Content is empty.')
  if (bytes > LIMITS.MAX_CONTENT_BYTES) {
    fail(
      'content_too_large',
      `Content is ${bytes} bytes. DUST-20 candidates are limited to ${LIMITS.MAX_CONTENT_BYTES} bytes.`,
    )
  }

  let position = 0
  const result = Object.create(null)
  const order = []

  const skipSpace = () => {
    while (position < source.length && /\s/u.test(source[position])) position += 1
  }

  const readString = (what) => {
    skipSpace()
    if (source[position] !== '"') {
      fail(
        'not_flat_strings',
        `Expected a JSON string for the ${what}. Every DUST-20 value must be quoted.`,
      )
    }
    const start = position
    position += 1
    let escaped = false
    while (position < source.length) {
      const character = source[position]
      position += 1
      if (escaped) {
        escaped = false
        continue
      }
      if (character === '\\') {
        escaped = true
        continue
      }
      if (character === '"') {
        try {
          return JSON.parse(source.slice(start, position))
        } catch {
          fail('not_flat_strings', 'Content contains an invalid JSON string escape.')
        }
      }
      if (character.charCodeAt(0) < 0x20) {
        fail('not_flat_strings', 'Content contains a raw control character inside a string.')
      }
    }
    return fail('not_object', 'Content contains an unterminated JSON string.')
  }

  skipSpace()
  if (source[position] !== '{') {
    fail('not_object', 'Content must be a single JSON object beginning with "{".')
  }
  position += 1
  skipSpace()

  if (source[position] === '}') {
    position += 1
  } else {
    for (;;) {
      const key = readString('field name')
      if (Object.hasOwn(result, key)) {
        fail('duplicate_key', `Field "${key}" appears more than once.`, key)
      }
      skipSpace()
      if (source[position] !== ':') fail('not_object', `Field "${key}" is missing its colon.`)
      position += 1
      result[key] = readString(`value of "${key}"`)
      order.push(key)
      skipSpace()
      if (source[position] === ',') {
        position += 1
        skipSpace()
        continue
      }
      if (source[position] === '}') {
        position += 1
        break
      }
      fail('not_object', 'Content is not a well-formed JSON object.')
    }
  }

  skipSpace()
  if (position !== source.length) {
    fail('trailing_content', 'Content continues after the closing brace.')
  }
  return { value: result, order }
}

/* ------------------------------------------------------------------ *
 * Strict decimal integers
 * ------------------------------------------------------------------ */

/** Parse a strict positive decimal integer string into a BigInt. */
export function positiveInteger(value, field, ceiling = LIMITS.MAX_ATOMIC) {
  if (typeof value !== 'string' || !STRICT_POSITIVE.test(value)) {
    fail(
      'bad_integer',
      `${field} must be a strict positive decimal string: digits only, no leading zero, sign, decimal point or whitespace.`,
      field,
    )
  }
  const parsed = BigInt(value)
  if (parsed > ceiling) {
    fail('exceeds_money_supply', `${field} exceeds the maximum permitted value.`, field)
  }
  return parsed
}

/** Parse a strict non-negative decimal integer string into a BigInt. */
export function nonNegativeInteger(value, field, ceiling = LIMITS.MAX_ATOMIC) {
  if (typeof value !== 'string' || !STRICT_NON_NEGATIVE.test(value)) {
    fail(
      'bad_integer',
      `${field} must be a strict non-negative decimal string: digits only, no leading zero, sign, decimal point or whitespace.`,
      field,
    )
  }
  const parsed = BigInt(value)
  if (parsed > ceiling) {
    fail('exceeds_money_supply', `${field} exceeds the maximum permitted value.`, field)
  }
  return parsed
}

/** Satoshi quantities are additionally bounded by Bitcoin's monetary supply. */
const positiveSats = (value, field) => positiveInteger(value, field, LIMITS.MAX_BITCOIN_SATS)
const nonNegativeSats = (value, field) => nonNegativeInteger(value, field, LIMITS.MAX_BITCOIN_SATS)

/* ------------------------------------------------------------------ *
 * Ticker identity
 * ------------------------------------------------------------------ */

/**
 * Fold a ticker to its comparison identity.
 * Identity is the NFC form case-folded to lower case; the original spelling
 * is preserved for display.
 */
export function normalizeTicker(value) {
  if (typeof value !== 'string') fail('bad_tick', 'tick must be a string.', 'tick')
  const display = value.normalize('NFC')
  const bytes = new TextEncoder().encode(display).length
  if (display !== value) {
    fail('bad_tick', 'tick must already be in Unicode NFC form (rule DUST-4.3).', 'tick')
  }
  if (bytes < LIMITS.MIN_TICK_BYTES || bytes > LIMITS.MAX_TICK_BYTES) {
    fail(
      'bad_tick',
      `tick must be ${LIMITS.MIN_TICK_BYTES} to ${LIMITS.MAX_TICK_BYTES} UTF-8 bytes; this is ${bytes}.`,
      'tick',
    )
  }
  if (TICK_FORBIDDEN.test(display)) {
    fail(
      'bad_tick',
      'tick must not contain control characters, whitespace, or the delimiters / ? # \\.',
      'tick',
    )
  }
  return { id: display.toLocaleLowerCase('en-US'), display, bytes }
}

/* ------------------------------------------------------------------ *
 * Key sets
 * ------------------------------------------------------------------ */

function checkKeys(payload, op) {
  const operation = operationById(op)
  const allowed = new Set([...operation.required, ...operation.optional])
  for (const key of operation.required) {
    if (!Object.hasOwn(payload, key)) {
      fail('missing_field', `Required field "${key}" is missing from this ${op}.`, key)
    }
  }
  for (const key of Object.keys(payload)) {
    if (!allowed.has(key)) {
      fail(
        'unknown_field',
        `Field "${key}" is not part of a DUST-20 ${op}. Unknown fields are rejected, not ignored.`,
        key,
      )
    }
  }
}

/* ------------------------------------------------------------------ *
 * Deploy
 * ------------------------------------------------------------------ */

/**
 * Validate a deploy payload.
 * @param {object} payload  flat object of strings
 * @param {object} context  { existingTickers?: string[] }
 */
export function validateDeploy(payload, context = {}) {
  checkKeys(payload, 'deploy')

  const ticker = normalizeTicker(payload.tick)
  const existing = (context.existingTickers ?? []).map((entry) =>
    String(entry).normalize('NFC').toLocaleLowerCase('en-US'),
  )
  if (existing.includes(ticker.id)) {
    fail(
      'duplicate_deployment',
      `Ticker "${ticker.id}" is already deployed. The first valid deployment of an identity wins.`,
      'tick',
    )
  }

  const supply = positiveInteger(payload.supply, 'supply')
  const unitSats = positiveSats(payload.unit_sats, 'unit_sats')
  const maxSats = positiveSats(payload.max_sats, 'max_sats')

  const expected = supply * unitSats
  if (expected !== maxSats) {
    fail(
      'max_sats_mismatch',
      `max_sats must equal supply x unit_sats. Expected ${format(expected)}, payload declares ${format(maxSats)} (off by ${format(abs(maxSats - expected))}).`,
      'max_sats',
    )
  }
  if (maxSats > LIMITS.MAX_BITCOIN_SATS) {
    fail(
      'exceeds_money_supply',
      `max_sats of ${format(maxSats)} exceeds the ${format(LIMITS.MAX_BITCOIN_SATS)} satoshis that will ever exist.`,
      'max_sats',
    )
  }

  const limSats = payload.lim_sats == null ? 0n : nonNegativeSats(payload.lim_sats, 'lim_sats')
  if (limSats > maxSats) {
    fail(
      'lim_sats_above_max',
      `lim_sats of ${format(limSats)} exceeds max_sats of ${format(maxSats)}.`,
      'lim_sats',
    )
  }

  const unitCap = limSats === 0n ? null : limSats / unitSats

  return {
    op: 'deploy',
    tick: ticker.id,
    display: ticker.display,
    supply,
    unitSats,
    maxSats,
    limSats,
    unitCap,
    derived: [
      { label: 'Ticker identity', value: ticker.id, note: 'NFC form folded to lower case.' },
      { label: 'Total backing', value: `${format(maxSats)} sats`, note: 'supply x unit_sats' },
      {
        label: 'Backing in BTC',
        value: `${satsToBtc(maxSats)} BTC`,
        note: 'The bitcoin that must exist in mint outputs for the supply to be fully minted.',
      },
      {
        label: 'Per-mint unit cap',
        value: unitCap == null ? 'No limit' : `${format(unitCap)} units`,
        note:
          unitCap == null
            ? 'lim_sats is absent or zero, so one mint may take the entire supply.'
            : 'floor(lim_sats / unit_sats)',
      },
      {
        label: 'Minimum mints to exhaust supply',
        value: unitCap == null || unitCap === 0n ? '1' : format(divideCeiling(supply, unitCap)),
        note: 'How many maximum-size mints it takes to reach the supply ceiling.',
      },
    ],
    warnings: deployWarnings({ unitSats, supply, limSats, unitCap }),
  }
}

function deployWarnings({ unitSats, supply, limSats, unitCap }) {
  const warnings = []
  if (unitSats < 546n) {
    warnings.push({
      status: 'universe',
      message: `unit_sats of ${format(unitSats)} is below the 546-satoshi dust threshold common to P2WPKH outputs. An indexer may accept this deployment while Bitcoin nodes refuse to relay its mint outputs.`,
    })
  }
  if (limSats > 0n && unitCap === 0n) {
    warnings.push({
      status: 'universe',
      message:
        'lim_sats is smaller than unit_sats, so the per-mint unit cap floors to zero. No mint of this deployment can ever succeed.',
    })
  }
  if (limSats > 0n && unitCap > 0n && limSats % unitSats !== 0n) {
    warnings.push({
      status: 'universe',
      message: `lim_sats is not a whole multiple of unit_sats. The effective cap is ${format(unitCap)} units (${format(unitCap * unitSats)} sats); the remaining ${format(limSats % unitSats)} sats of the cap are unusable.`,
    })
  }
  if (supply === 1n) {
    warnings.push({
      status: 'universe',
      message:
        'A supply of 1 makes this a single-unit deployment. That is valid, but not fungible in any useful sense.',
    })
  }
  return warnings
}

/* ------------------------------------------------------------------ *
 * Mint
 * ------------------------------------------------------------------ */

/**
 * Validate a mint payload against a resolved deployment.
 * @param {object} payload  flat object of strings
 * @param {object} context  { deployment, outputValueSats }
 */
export function validateMint(payload, context = {}) {
  checkKeys(payload, 'mint')

  const ticker = normalizeTicker(payload.tick)
  const deployment = context.deployment
  if (!deployment) {
    fail(
      'deployment_missing',
      `No accepted deployment for ticker "${ticker.id}". A mint must resolve exactly one deployment before its arithmetic can be checked.`,
      'tick',
    )
  }

  const deployTick = String(deployment.tick).normalize('NFC').toLocaleLowerCase('en-US')
  if (deployTick !== ticker.id) {
    fail(
      'deployment_missing',
      `This mint names "${ticker.id}" but the supplied deployment is "${deployTick}".`,
      'tick',
    )
  }

  const unitSats = positiveSats(String(deployment.unitSats), 'deployment unit_sats')
  const supply = positiveInteger(String(deployment.supply), 'deployment supply')
  const limSats =
    deployment.limSats == null
      ? 0n
      : nonNegativeSats(String(deployment.limSats), 'deployment lim_sats')
  const minted =
    deployment.minted == null ? 0n : nonNegativeInteger(String(deployment.minted), 'minted supply')

  const amount = positiveInteger(payload.amt, 'amt')
  const sats = positiveSats(payload.sats, 'sats')

  const expected = amount * unitSats
  if (sats !== expected) {
    fail(
      'mint_sats_mismatch',
      `sats must equal amt x unit_sats. ${format(amount)} x ${format(unitSats)} is ${format(expected)}, payload declares ${format(sats)} (off by ${format(abs(sats - expected))}).`,
      'sats',
    )
  }
  if (limSats > 0n && sats > limSats) {
    fail(
      'mint_exceeds_limit',
      `This mint declares ${format(sats)} sats but the deployment caps a single mint at ${format(limSats)} sats (${format(limSats / unitSats)} units).`,
      'sats',
    )
  }
  if (minted + amount > supply) {
    fail(
      'mint_exceeds_supply',
      `${format(minted)} units are already minted and supply is ${format(supply)}, so only ${format(supply - minted)} remain. A mint that crosses the ceiling is rejected in full, not partially filled.`,
      'amt',
    )
  }

  if (context.outputValueSats != null && String(context.outputValueSats) !== '') {
    const observed = nonNegativeSats(String(context.outputValueSats), 'output value')
    if (observed !== sats) {
      fail(
        'output_value_mismatch',
        `The Bitcoin output carrying this inscription holds ${format(observed)} sats but the payload declares ${format(sats)}. The mint is invalid and cannot be repaired after broadcast.`,
        'sats',
      )
    }
  }

  const remaining = supply - minted - amount

  return {
    op: 'mint',
    tick: ticker.id,
    display: ticker.display,
    amount,
    sats,
    unitSats,
    remaining,
    derived: [
      { label: 'Units minted', value: format(amount), note: 'Whole units created by this mint.' },
      { label: 'Satoshis per unit', value: format(unitSats), note: 'Fixed by the deployment.' },
      { label: 'Total backing', value: `${format(sats)} sats`, note: 'amt x unit_sats' },
      {
        label: 'Required output value',
        value: `${format(sats)} sats`,
        note: 'The inscription must sit at offset 0 of an output holding exactly this amount.',
      },
      {
        label: 'Remaining supply',
        value: `${format(remaining)} units`,
        note: `${format(minted + amount)} of ${format(supply)} minted after this mint.`,
      },
      {
        label: 'Per-mint cap',
        value:
          limSats === 0n
            ? 'No limit'
            : `${format(limSats / unitSats)} units (${format(limSats)} sats)`,
        note: limSats === 0n ? 'The deployment sets no lim_sats.' : 'Declared by lim_sats.',
      },
    ],
    warnings: mintWarnings({ sats, unitSats, remaining }),
  }
}

function mintWarnings({ sats, unitSats, remaining }) {
  const warnings = []
  if (sats < 546n) {
    warnings.push({
      status: 'universe',
      message: `The required output value of ${format(sats)} sats is below the 546-satoshi dust threshold common to P2WPKH outputs. Bitcoin nodes may refuse to relay this mint.`,
    })
  }
  if (remaining === 0n) {
    warnings.push({
      status: 'universe',
      message: 'This mint exhausts the supply. No further mints of this ticker can succeed.',
    })
  }
  if (unitSats > 100000n) {
    warnings.push({
      status: 'universe',
      message: `Each unit locks ${format(unitSats)} satoshis. Confirm that the bitcoin cost of holding these units is intended.`,
    })
  }
  return warnings
}

/* ------------------------------------------------------------------ *
 * Inspector: the single entry point used by the site
 * ------------------------------------------------------------------ */

/**
 * Inspect arbitrary DUST-20 content.
 * Never repairs, completes or rounds a malformed payload.
 *
 * @param {string|object} input  raw inscription text, or an already-parsed object
 * @param {object} context       { deployment, outputValueSats, existingTickers }
 */
export function inspect(input, context = {}) {
  const report = {
    ok: false,
    op: null,
    tick: null,
    payload: null,
    fields: [],
    result: null,
    issues: [],
    warnings: [],
  }

  let payload
  try {
    payload = typeof input === 'string' ? parseFlatStringObject(input).value : assertFlat(input)
  } catch (error) {
    if (error instanceof ParseError) {
      report.issues.push(error.issue)
      return report
    }
    throw error
  }
  report.payload = payload

  try {
    if (payload.p !== 'dust-20') {
      fail(
        'bad_protocol',
        payload.p == null
          ? 'No "p" field. DUST-20 content must declare p as the literal string "dust-20".'
          : `Protocol identifier is "${payload.p}", not "dust-20". This is not a DUST-20 message.`,
        'p',
        'verified',
      )
    }
    const op = payload.op
    if (op !== 'deploy' && op !== 'mint') {
      fail(
        'bad_operation',
        op === 'transfer'
          ? 'op is "transfer", but no transfer inscription is valid. DUST-20 movement happens by spending the satoshis that carry the units.'
          : `op is ${op == null ? 'missing' : `"${op}"`}. Only "deploy" and "mint" exist.`,
        'op',
        'universe',
      )
    }
    report.op = op
    report.result =
      op === 'deploy' ? validateDeploy(payload, context) : validateMint(payload, context)
    report.tick = report.result.tick
    report.warnings = report.result.warnings ?? []
    report.ok = true
  } catch (error) {
    if (error instanceof ParseError) {
      report.issues.push(error.issue)
    } else {
      throw error
    }
  }

  report.fields = describeFields(payload, report.op, report.issues)
  return report
}

function assertFlat(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('not_object', 'A DUST-20 payload must be a JSON object.')
  }
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== 'string') {
      const kind = Array.isArray(entry) ? 'array' : entry === null ? 'null' : typeof entry
      fail(
        'not_flat_strings',
        `Field "${key}" is a ${kind}. Every DUST-20 value must be a string.`,
        key,
      )
    }
  }
  return value
}

/** Annotate each present field, plus any required field that is absent. */
function describeFields(payload, op, issues) {
  const known = op ? (FIELDS_BY_OP[op] ?? []) : []
  const byName = new Map(known.map((field) => [field.name, field]))
  const issueByField = new Map(
    issues.filter((issue) => issue.field).map((issue) => [issue.field, issue]),
  )
  const rows = []

  for (const [name, value] of Object.entries(payload)) {
    const definition = byName.get(name)
    rows.push({
      name,
      value,
      known: Boolean(definition),
      type: definition?.type ?? 'unknown',
      required: definition?.required ?? false,
      constraint:
        definition?.constraint ?? 'Not a field of this operation. Unknown fields are rejected.',
      status: definition?.status ?? 'universe',
      issue: issueByField.get(name) ?? null,
    })
  }

  for (const field of known) {
    if (!Object.hasOwn(payload, field.name) && field.required) {
      rows.push({
        name: field.name,
        value: null,
        known: true,
        missing: true,
        type: field.type,
        required: true,
        constraint: field.constraint,
        status: field.status,
        issue: issueByField.get(field.name) ?? null,
      })
    }
  }
  return rows
}

/* ------------------------------------------------------------------ *
 * Transaction simulator: ordinal first-in-first-out sat flow
 * ------------------------------------------------------------------ */

/**
 * Simulate how DUST-20 units survive a Bitcoin spend.
 *
 * Inputs are concatenated end to end into one satoshi range, and so are
 * outputs. A colored allocation occupies a contiguous span in the input
 * range; a unit survives only where its whole block of unit_sats satoshis
 * lands inside a single supported output.
 */
export function simulateTransfer(spec) {
  const unitSats = positiveSats(String(spec.unitSats), 'unit_sats')
  const errors = []

  let cursor = 0n
  const inputs = []
  const allocations = []
  spec.inputs.forEach((input, index) => {
    const value = nonNegativeSats(String(input.valueSats ?? '0'), `input ${index + 1} value`)
    const record = {
      index,
      kind: input.kind,
      label: input.label ?? `Input ${index + 1}`,
      valueSats: value,
      start: cursor,
      end: cursor + value,
      units: null,
    }
    if (input.kind === 'colored') {
      const units = positiveInteger(String(input.units ?? '0'), `input ${index + 1} units`)
      const offset =
        input.offsetSats == null ? 0n : nonNegativeSats(String(input.offsetSats), 'offset')
      const span = units * unitSats
      if (offset + span > value) {
        errors.push(
          new Issue(
            'allocation_overflows_input',
            `${record.label} claims ${format(units)} units (${format(span)} sats) starting at offset ${format(offset)}, which does not fit inside its ${format(value)}-sat output.`,
            null,
            'universe',
          ),
        )
      }
      record.units = units
      allocations.push({
        inputIndex: index,
        label: record.label,
        units,
        start: cursor + offset,
        end: cursor + offset + span,
        tick: input.tick ?? 'dust',
      })
    }
    inputs.push(record)
    cursor += value
  })
  const totalIn = cursor

  cursor = 0n
  const outputs = spec.outputs.map((output, index) => {
    const value =
      output.valueSats != null && String(output.valueSats) !== ''
        ? nonNegativeSats(String(output.valueSats), `output ${index + 1} value`)
        : positiveInteger(String(output.units ?? '0'), `output ${index + 1} units`) * unitSats
    const record = {
      index,
      kind: output.kind,
      label: output.label ?? `Output ${index + 1}`,
      intendedUnits: output.units == null ? null : BigInt(String(output.units)),
      valueSats: value,
      start: cursor,
      end: cursor + value,
      supported: output.kind !== 'unsupported',
      received: 0n,
    }
    cursor += value
    return record
  })
  const totalOut = cursor
  const fee = totalIn - totalOut

  if (fee < 0n) {
    errors.push(
      new Issue(
        'outputs_exceed_inputs',
        `Outputs total ${format(totalOut)} sats but inputs only provide ${format(totalIn)}. This transaction cannot be built.`,
        null,
        'verified',
      ),
    )
  }

  const transitions = allocations.map((allocation) => {
    let surviving = 0n
    const landings = []
    for (const output of outputs) {
      const intersectionStart = max(allocation.start, output.start)
      const intersectionEnd = min(allocation.end, output.end)
      if (intersectionStart >= intersectionEnd) continue
      if (!output.supported) {
        landings.push({
          output: output.index,
          label: output.label,
          units: 0n,
          burned: true,
          note: 'Output cannot be attributed to a supported address, so any units landing here are burned.',
        })
        continue
      }
      const firstGroup = divideCeiling(intersectionStart - allocation.start, unitSats)
      const endGroup = (intersectionEnd - allocation.start) / unitSats
      if (endGroup <= firstGroup) {
        landings.push({
          output: output.index,
          label: output.label,
          units: 0n,
          burned: true,
          note: 'The satoshis reaching this output do not contain a whole unit, so nothing survives here.',
        })
        continue
      }
      const units = endGroup - firstGroup
      const offsetSats = allocation.start + firstGroup * unitSats - output.start
      surviving += units
      output.received += units
      landings.push({
        output: output.index,
        label: output.label,
        units,
        offsetSats,
        burned: false,
      })
    }
    const burned = allocation.units - surviving
    return { ...allocation, surviving, burned, landings }
  })

  const burnedTotal = transitions.reduce((sum, entry) => sum + entry.burned, 0n)
  const survivingTotal = transitions.reduce((sum, entry) => sum + entry.surviving, 0n)
  const inputUnits = transitions.reduce((sum, entry) => sum + entry.units, 0n)

  const warnings = []
  for (const output of outputs) {
    if (
      output.intendedUnits != null &&
      output.supported &&
      output.received !== output.intendedUnits
    ) {
      warnings.push({
        status: 'universe',
        message: `${output.label} was built for ${format(output.intendedUnits)} units but ordinal flow places ${format(output.received)} there.`,
      })
    }
    if (output.kind === 'cardinal' && output.received > 0n) {
      warnings.push({
        status: 'universe',
        message: `${output.label} is meant to be ordinary bitcoin, but ${format(output.received)} units land in it. Colored satoshis are reaching an output you did not intend to colour.`,
      })
    }
  }
  if (burnedTotal > 0n) {
    warnings.push({
      status: 'universe',
      message: `${format(burnedTotal)} unit${burnedTotal === 1n ? '' : 's'} of ${format(inputUnits)} will be destroyed. Bitcoin will confirm this transaction normally and nothing will warn you.`,
    })
  }

  return {
    unitSats,
    totalIn,
    totalOut,
    fee: fee < 0n ? 0n : fee,
    feeRaw: fee,
    inputs,
    outputs,
    transitions,
    inputUnits,
    survivingTotal,
    burnedTotal,
    errors,
    warnings,
    safe: errors.length === 0 && burnedTotal === 0n,
  }
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

export function format(value) {
  const text = (typeof value === 'bigint' ? value : BigInt(value)).toString()
  const negative = text.startsWith('-')
  const digits = negative ? text.slice(1) : text
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return negative ? `-${grouped}` : grouped
}

export function satsToBtc(value) {
  const sats = typeof value === 'bigint' ? value : BigInt(value)
  const negative = sats < 0n
  const magnitude = negative ? -sats : sats
  const whole = magnitude / 100000000n
  const fraction = (magnitude % 100000000n).toString().padStart(8, '0').replace(/0+$/, '')
  const text = fraction ? `${format(whole)}.${fraction}` : format(whole)
  return negative ? `-${text}` : text
}

/** Schema-ordered JSON rendering: key order from the operation, string values only. */
export function renderPayload(payload, op) {
  const operation = op ? operationById(op) : null
  const order = operation ? [...operation.required, ...operation.optional] : []
  const keys = [
    ...order.filter((key) => Object.hasOwn(payload, key)),
    ...Object.keys(payload).filter((key) => !order.includes(key)),
  ]
  const body = keys
    .map((key) => `  ${JSON.stringify(key)}: ${JSON.stringify(payload[key])}`)
    .join(',\n')
  return `{\n${body}\n}`
}

const abs = (value) => (value < 0n ? -value : value)
const max = (a, b) => (a > b ? a : b)
const min = (a, b) => (a < b ? a : b)

export function divideCeiling(value, divisor) {
  return (value + divisor - 1n) / divisor
}
