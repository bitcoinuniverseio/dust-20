/**
 * DUST-20 machine schema.
 *
 * The smallest module the browser needs to decode and validate a payload:
 * the version, the numeric ceilings, the operation key sets and the field
 * constraints. Every word of explanation lives in protocol-data.js, which
 * the build reads and the browser never loads.
 *
 * Keeping the two apart is what lets the decoder page ship this file plus
 * protocol.js and nothing else.
 */

export const SPEC_VERSION = '1.1.0'
export const SPEC_DATE = '2026-09-01'

export const LIMITS = {
  /** Bitcoin's monetary supply in satoshis. Ceiling for every satoshi field. */
  MAX_BITCOIN_SATS: 2100000000000000n,
  /** Ceiling for token-unit quantities in the production indexer (2^128 - 1). */
  MAX_ATOMIC: (1n << 128n) - 1n,
  /** Largest inscription payload considered as a DUST-20 candidate, in bytes. */
  MAX_CONTENT_BYTES: 4096,
  /** Ticker length bounds, measured in UTF-8 bytes. */
  MIN_TICK_BYTES: 1,
  MAX_TICK_BYTES: 64,
  /** DUST-20 token balances have zero decimal places. */
  DECIMALS: 0,
}

/**
 * Operations. `carrier` records what physically transports the operation:
 * inscription content, or the shape of an ordinary Bitcoin spend.
 */
export const OPERATIONS = [
  {
    id: 'deploy',
    label: 'Deploy',
    carrier: 'inscription',
    status: 'verified',
    required: ['p', 'op', 'tick', 'supply', 'unit_sats', 'max_sats'],
    optional: ['lim_sats'],
  },
  {
    id: 'mint',
    label: 'Mint',
    carrier: 'inscription',
    status: 'verified',
    required: ['p', 'op', 'tick', 'amt', 'sats'],
    optional: [],
  },
  {
    id: 'transfer',
    label: 'Transfer',
    carrier: 'bitcoin-spend',
    status: 'universe',
    required: [],
    optional: [],
  },
  {
    id: 'burn',
    label: 'Burn',
    carrier: 'bitcoin-spend',
    status: 'universe',
    required: [],
    optional: [],
  },
]

/** Field constraints. The decoder renders `constraint` verbatim on a failure. */
export const FIELDS = [
  {
    name: 'p',
    ops: ['deploy', 'mint'],
    type: 'string',
    required: true,
    bytes: '7',
    status: 'verified',
    constraint: 'Exactly "dust-20".',
  },
  {
    name: 'op',
    ops: ['deploy', 'mint'],
    type: 'string',
    required: true,
    bytes: '4 or 6',
    status: 'verified',
    constraint: 'Exactly "deploy" or "mint".',
  },
  {
    name: 'tick',
    ops: ['deploy', 'mint'],
    type: 'string',
    required: true,
    bytes: '1 to 64',
    status: 'universe',
    constraint:
      'Unicode NFC text, 1 to 64 UTF-8 bytes, with no control characters, whitespace, or the URL delimiters / ? # \\.',
  },
  {
    name: 'supply',
    ops: ['deploy'],
    type: 'uint128 string',
    required: true,
    bytes: '1 to 39',
    status: 'verified',
    constraint: 'Strict positive decimal string matching /^[1-9][0-9]*$/, at most 2^128 - 1.',
  },
  {
    name: 'unit_sats',
    ops: ['deploy'],
    type: 'sats string',
    required: true,
    bytes: '1 to 16',
    status: 'verified',
    constraint:
      'Strict positive decimal string, at most Bitcoin’s monetary supply of 2,100,000,000,000,000 satoshis.',
  },
  {
    name: 'max_sats',
    ops: ['deploy'],
    type: 'sats string',
    required: true,
    bytes: '1 to 16',
    status: 'verified',
    constraint:
      'Strict positive decimal string that equals supply × unit_sats and does not exceed 2,100,000,000,000,000.',
  },
  {
    name: 'lim_sats',
    ops: ['deploy'],
    type: 'sats string',
    required: false,
    bytes: '1 to 16',
    status: 'verified',
    constraint:
      'Optional strict non-negative decimal string, at most max_sats. Omitted or "0" means no per-mint limit.',
  },
  {
    name: 'amt',
    ops: ['mint'],
    type: 'uint128 string',
    required: true,
    bytes: '1 to 39',
    status: 'verified',
    constraint: 'Strict positive decimal string matching /^[1-9][0-9]*$/, at most 2^128 - 1.',
  },
  {
    name: 'sats',
    ops: ['mint'],
    type: 'sats string',
    required: true,
    bytes: '1 to 16',
    status: 'verified',
    constraint:
      'Strict positive decimal string that equals amt × unit_sats of the resolved deployment.',
  },
]

export const FIELDS_BY_OP = OPERATIONS.reduce((map, operation) => {
  map[operation.id] = FIELDS.filter((field) => field.ops.includes(operation.id))
  return map
}, {})

export function operationById(id) {
  return OPERATIONS.find((operation) => operation.id === id)
}
