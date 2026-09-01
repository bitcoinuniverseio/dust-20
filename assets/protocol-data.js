/**
 * DUST-20 documentation model: the single source of truth for this site.
 *
 * Every field table, numbered rule, formula, example, datasheet row and
 * machine-readable artifact is generated from this module by tools/build.mjs.
 * Nothing here may be duplicated by hand in HTML.
 *
 * PROVENANCE POLICY
 * -----------------
 * Every technical statement carries a `status`. Nothing is asserted as a
 * protocol rule merely to make the documentation look complete.
 *
 *   verified        Documented in the legacy DUST-20 specification AND enforced
 *                   by the Bitcoin Universe production indexer. The two agree.
 *   universe        Enforced by the Bitcoin Universe production indexer. The
 *                   legacy specification does not settle it.
 *   legacy          Stated by legacy documentation, but superseded or not
 *                   enforced identically by the current implementation.
 *   implementation  One application's behaviour. Not a protocol rule.
 *   unresolved      No authoritative answer exists. Do not guess.
 */

import {
  SPEC_VERSION,
  SPEC_DATE,
  LIMITS,
  OPERATIONS as OPERATION_SCHEMA,
  FIELDS as FIELD_SCHEMA,
  FIELDS_BY_OP,
  operationById,
} from './protocol-schema.js'

export { SPEC_VERSION, SPEC_DATE, LIMITS, FIELDS_BY_OP, operationById }

/** Provenance labels. Every technical statement on the site carries one. */
export const STATUS = {
  verified: {
    id: 'verified',
    label: 'Verified protocol rule',
    short: 'VERIFIED',
    tone: 'pass',
    description:
      'Documented in the legacy DUST-20 specification and enforced by the Bitcoin Universe production indexer. Both sources agree.',
  },
  universe: {
    id: 'universe',
    label: 'Current Universe implementation',
    short: 'UNIVERSE',
    tone: 'info',
    description:
      'Enforced by the Bitcoin Universe production indexer. The legacy specification does not settle this point, so an independent implementation may differ.',
  },
  legacy: {
    id: 'legacy',
    label: 'Legacy profile',
    short: 'LEGACY',
    tone: 'muted',
    description:
      'Stated by legacy DUST-20 documentation. Superseded, narrowed, or not enforced identically by the current implementation.',
  },
  implementation: {
    id: 'implementation',
    label: 'Implementation-specific',
    short: 'IMPL',
    tone: 'warn',
    description:
      'The behaviour of one application or service. Useful evidence, but not a protocol rule. Do not rely on it across implementations.',
  },
  unresolved: {
    id: 'unresolved',
    label: 'Unresolved',
    short: 'UNRESOLVED',
    tone: 'fail',
    description:
      'No authoritative answer exists. Documented as an open question rather than invented. Stop before an irreversible step.',
  },
}

export const STATUS_ORDER = ['verified', 'universe', 'legacy', 'implementation', 'unresolved']

/**
 * Prose for each operation. The machine schema holds only the key sets, so
 * the browser never downloads any of this.
 */
const OPERATION_TEXT = {
  deploy: {
    summary: 'Creates a ticker and fixes the satoshi backing rule for every one of its units.',
    detail:
      'A deploy declares the maximum supply, the exact satoshis that back one unit, the total backing that follows from those two numbers, and an optional per-mint satoshi cap.',
  },
  mint: {
    summary: 'Creates units in a Bitcoin output whose value equals the declared satoshi backing.',
    detail:
      'A mint resolves an accepted deployment, states an amount of whole units, and states the satoshis backing them. The Bitcoin output that carries the inscription must hold exactly that many satoshis.',
  },
  transfer: {
    summary: 'An ordinary Bitcoin spend. There is no transfer inscription.',
    detail:
      'Units follow the satoshis that carry them, in ordinal first-in-first-out order. A whole unit that lands entirely inside one supported output survives; anything else is burned. No JSON payload participates.',
  },
  burn: {
    summary: 'A derived outcome, not an operation anyone writes.',
    detail:
      'Units are burned when the satoshis carrying them are paid to miners as fees, sent to an output the indexer cannot attribute to an address, or split so that no whole unit fits inside a single output.',
  },
}

/** Prose, examples and provenance for each field, keyed by field name. */
const FIELD_TEXT = {
  p: {
    example: 'dust-20',
    rule: 'Content whose "p" is not the literal dust-20 is not a DUST-20 message and is ignored.',
    source: ['legacy', 'universe'],
    notes:
      'The protocol identifier is matched literally. There is no aliasing, casing tolerance, or versioned variant.',
  },
  op: {
    example: 'deploy',
    rule: 'Any other operation value is rejected. No transfer or burn inscription exists.',
    source: ['legacy', 'universe'],
    notes:
      'The production indexer rejects an inscription whose op is anything other than deploy or mint, including op: "transfer".',
  },
  tick: {
    example: 'dust',
    rule: 'The identity of a ticker is its NFC form case-folded to lower case. A mint resolves against that folded identity.',
    source: ['universe'],
    notes:
      'The legacy guide says the ticker is not limited to four bytes but does not settle case handling or duplicates. The production indexer settles both: identity is NFC plus lower-case folding, and the first valid deployment of an identity wins. Later deploys of the same identity are rejected.',
  },
  supply: {
    example: '1000000',
    rule: 'Total whole units that may ever be minted for this ticker.',
    source: ['legacy', 'universe'],
    notes:
      'No leading zeros, no sign, no decimal point, no exponent, no whitespace. DUST-20 balances have zero decimal places, so a unit is always a whole number.',
  },
  unit_sats: {
    example: '546',
    rule: 'The exact number of satoshis that back one unit for the entire life of the ticker.',
    source: ['legacy', 'universe'],
    notes:
      '546 is a common documented example because it is Bitcoin’s usual dust threshold for P2WPKH. It is not a default. A payload that omits unit_sats is rejected, so never assume 546.',
  },
  max_sats: {
    example: '546000000',
    rule: 'Rejected unless it equals supply × unit_sats exactly, computed with exact integer arithmetic.',
    source: ['legacy', 'universe'],
    notes:
      'This is a redundancy check, not an independent quantity. It exists so a reader can detect a builder that computed the backing with floating point or the wrong unit size.',
  },
  lim_sats: {
    example: '54600',
    rule: 'When present and greater than zero, every mint of this ticker must satisfy sats ≤ lim_sats.',
    source: ['legacy', 'universe'],
    notes:
      'The cap is expressed in satoshis, not units. The equivalent unit cap is lim_sats ÷ unit_sats. A lim_sats that is not a whole multiple of unit_sats simply makes the effective unit cap the floor of that division.',
  },
  amt: {
    example: '100',
    rule: 'Whole units to create. Rejected if previously minted units plus amt would exceed supply.',
    source: ['legacy', 'universe'],
    notes: 'Zero, negative, fractional, and leading-zero values are rejected outright.',
  },
  sats: {
    example: '54600',
    rule: 'Rejected unless it equals amt × unit_sats, and unless the Bitcoin output carrying the inscription holds exactly this many satoshis.',
    source: ['legacy', 'universe'],
    notes:
      'Three numbers must agree: the deployment ratio, the sats field in the JSON, and the real output value on Bitcoin. A one-satoshi difference invalidates the mint.',
  },
}

/** The schema and its prose, joined. Build-time views use these. */
export const OPERATIONS = OPERATION_SCHEMA.map((operation) => ({
  ...operation,
  ...OPERATION_TEXT[operation.id],
}))

export const FIELDS = FIELD_SCHEMA.map((field) => ({ ...field, ...FIELD_TEXT[field.name] }))

export function fieldByName(name, op) {
  return FIELDS.find((field) => field.name === name && (!op || field.ops.includes(op)))
}

export const SOURCES = {
  legacy: {
    id: 'legacy',
    label: 'Legacy DUST-20 specification',
    url: 'https://dust-20.gitbook.io/dust20/readme.md',
    note: 'Documents the deploy and mint payloads and a colored-UTXO transfer example.',
  },
  universe: {
    id: 'universe',
    label: 'Bitcoin Universe production indexer',
    url: 'https://github.com/bitcoinuniverseio',
    note: 'index-dust20 reconstructs colored UTXO ownership from Bitcoin Core and a shared Ord 0.29 instance.',
  },
  registry: {
    id: 'registry',
    label: 'Bitcoin Universe capability registry',
    url: 'https://docs.bitcoinuniverse.io',
    note: 'Records, per protocol, which product surfaces and marketplace actions are actually available.',
  },
  docs: {
    id: 'docs',
    label: 'This documentation repository',
    url: 'https://github.com/bitcoinuniverseio/dust-20',
    note: 'Source of the published documentation and its conformance fixtures.',
  },
}

export const PROTOCOL = {
  id: 'dust-20',
  name: 'DUST-20',
  chain: 'Bitcoin',
  network: 'mainnet',
  lifecycle: 'experimental',
  specVersion: SPEC_VERSION,
  updated: SPEC_DATE,
  decimals: 0,
  ownershipModel: 'UTXO',
  carrier: 'Inscription content for deploy and mint; ordinary Bitcoin spends for movement',
  classification: 'Satoshi-denominated colored UTXO fungibility protocol',
  site: 'https://bitcoinuniverseio.github.io/dust-20/',
  repository: 'https://github.com/bitcoinuniverseio/dust-20',
  sourcePath: 'https://github.com/bitcoinuniverseio/dust-20/tree/main',
  organization: 'https://github.com/bitcoinuniverseio',
  portal: 'https://docs.bitcoinuniverse.io',
  portalPage: 'https://docs.bitcoinuniverse.io/protocols/dust-20/',
  inscribe: 'https://inscribe.bitcoinuniverse.io',
  security: 'https://github.com/bitcoinuniverseio/dust-20/security/advisories/new',
  summary:
    'DUST-20 binds every token unit to an exact number of satoshis. Deploy and mint are inscriptions; every later movement is an ordinary Bitcoin spend of the satoshis that carry the units.',
}

/** The datasheet block printed at the head of every page. */
export const DATASHEET = [
  { key: 'Protocol', value: 'DUST-20', note: 'Registry id dust20, alias dust-20' },
  { key: 'Chain', value: 'Bitcoin', note: 'Network: mainnet' },
  { key: 'Ownership model', value: 'UTXO', note: 'Units are carried by satoshis in unspent outputs' },
  { key: 'Carrier', value: 'Inscription + spend', note: 'Deploy and mint are inscribed; movement is a spend' },
  { key: 'Decimals', value: '0', note: 'Balances are whole units only' },
  { key: 'Document version', value: SPEC_VERSION, note: `Revised ${SPEC_DATE}` },
  { key: 'Lifecycle', value: 'Experimental', note: 'Not a ratified multi-party standard' },
  { key: 'Owning repository', value: 'bitcoinuniverseio/dust-20', note: 'Documentation source of truth' },
]

/* ------------------------------------------------------------------ *
 * Normative specification: numbered rules
 * ------------------------------------------------------------------ */

/**
 * Numbered rules. `id` is stable and quotable, for example DUST-6.4.
 * `test` names the conformance vector that exercises the rule, when one does.
 */
export const SPEC_SECTIONS = [
  {
    id: 'carrier',
    number: '2',
    title: 'Message carrier',
    intro:
      'DUST-20 defines two written messages, deploy and mint. Both are carried as inscription content on Bitcoin. Movement is not a written message at all: it is the shape of an ordinary spend, covered in section 7.',
    rules: [
      {
        id: 'DUST-2.1',
        title: 'Deploy and mint are inscription content',
        text: 'A DUST-20 deploy or mint is the content of a Bitcoin inscription. There is no OP_RETURN carrier, no separate script template, and no auxiliary transaction field. A reader obtains authoritative inscription identity, content and location from an inscription index and obtains transaction values and addresses from a Bitcoin node.',
        status: 'verified',
      },
      {
        id: 'DUST-2.2',
        title: 'Content is UTF-8',
        text: 'Inscription content is decoded as UTF-8. Content that is not well-formed UTF-8 is not a DUST-20 message.',
        status: 'universe',
      },
      {
        id: 'DUST-2.3',
        title: 'Content larger than 4096 bytes is not a candidate',
        text: 'A reader considers content of at most 4096 bytes. Larger content is not evaluated as DUST-20.',
        status: 'universe',
      },
      {
        id: 'DUST-2.4',
        title: 'Content is exactly one JSON object',
        text: 'Content must parse as a single JSON object. Nothing may follow the closing brace except insignificant whitespace. Trailing content makes the message ambiguous and is rejected.',
        status: 'universe',
        test: 'trailing-content',
      },
      {
        id: 'DUST-2.5',
        title: 'Every value is a JSON string',
        text: 'The object is flat and every value is a JSON string. Nested objects, arrays, numbers, booleans and null are rejected. JSON numbers cannot carry values above 2^53 exactly, so a bare number is never accepted for a quantity.',
        status: 'universe',
        test: 'non-string-value',
      },
      {
        id: 'DUST-2.6',
        title: 'Duplicate keys are rejected',
        text: 'A key that appears more than once is rejected rather than resolved last-wins or first-wins. Two readers must never be able to disagree about which value applied.',
        status: 'universe',
        test: 'duplicate-key',
      },
      {
        id: 'DUST-2.7',
        title: 'Raw control characters are rejected',
        text: 'A raw character below U+0020 inside a JSON string makes the content invalid. Escaped sequences that decode to control characters are still subject to the ticker rules in section 4.',
        status: 'universe',
      },
    ],
  },
  {
    id: 'integers',
    number: '3',
    title: 'Integer encoding',
    intro:
      'Every quantity in DUST-20 is a decimal string in strict form. This exists so that two implementations reading the same bytes compute the same number, and so that a reader cannot silently accept a value produced by floating-point arithmetic.',
    rules: [
      {
        id: 'DUST-3.1',
        title: 'Positive quantities match /^[1-9][0-9]*$/',
        text: 'supply, unit_sats, max_sats, amt and sats are strict positive decimal strings. A leading zero, a leading plus or minus, whitespace, a decimal point, a thousands separator and exponent notation are all rejected.',
        status: 'verified',
        test: 'deploy-leading-zero',
      },
      {
        id: 'DUST-3.2',
        title: 'Optional caps match /^(0|[1-9][0-9]*)$/',
        text: 'lim_sats is a strict non-negative decimal string. The single character "0" is valid and means no per-mint limit.',
        status: 'verified',
        test: 'deploy-zero-limit',
      },
      {
        id: 'DUST-3.3',
        title: 'Satoshi fields are bounded by the money supply',
        text: 'unit_sats, max_sats, lim_sats and sats may not exceed 2,100,000,000,000,000 satoshis, the total that will ever exist. A payload can be internally consistent and still exceed this bound, in which case it is rejected.',
        status: 'universe',
        test: 'deploy-exceeds-money',
      },
      {
        id: 'DUST-3.4',
        title: 'Unit quantities are bounded by 2^128 - 1',
        text: 'supply and amt may not exceed 340,282,366,920,938,463,463,374,607,431,768,211,455. This is the atomic ceiling the production indexer enforces on token quantities.',
        status: 'universe',
      },
      {
        id: 'DUST-3.5',
        title: 'Arithmetic is exact integer arithmetic',
        text: 'An implementation must evaluate supply × unit_sats and amt × unit_sats with exact integers. A 64-bit float loses precision above 2^53, which is well inside the satoshi range, and a rounded product produces a rejected payload that looks correct on screen.',
        status: 'verified',
        test: 'deploy-arithmetic-mismatch',
      },
    ],
  },
  {
    id: 'identifiers',
    number: '4',
    title: 'Identifiers',
    intro:
      'Three fields identify a message: the protocol tag, the operation, and the ticker. The ticker is the only one with a normalization step, and getting that step wrong is the most common source of disagreement between implementations.',
    rules: [
      {
        id: 'DUST-4.1',
        title: 'p is the literal string dust-20',
        text: 'Content whose p field is absent or is anything other than the seven bytes dust-20 is not a DUST-20 message. There is no case tolerance, no alias, and no versioned variant of the tag.',
        status: 'verified',
        test: 'wrong-protocol',
      },
      {
        id: 'DUST-4.2',
        title: 'op is deploy or mint',
        text: 'Exactly two operation values exist. Any other value, including transfer, is rejected.',
        status: 'universe',
        test: 'unknown-operation',
      },
      {
        id: 'DUST-4.3',
        title: 'tick is 1 to 64 UTF-8 bytes in NFC form',
        text: 'The ticker must already be in Unicode Normalization Form C, and its UTF-8 encoding must be between 1 and 64 bytes. Length is measured in bytes, not code points, so a multi-byte ticker is shorter in characters than the bound suggests.',
        status: 'universe',
      },
      {
        id: 'DUST-4.4',
        title: 'tick excludes control characters, whitespace and / ? # \\',
        text: 'These characters are excluded so a ticker identity is always safe to place in a path or query without escaping, and so two tickers cannot look identical in a log line.',
        status: 'universe',
        test: 'deploy-tick-whitespace',
      },
      {
        id: 'DUST-4.5',
        title: 'Identity is the NFC form folded to lower case',
        text: 'Two tickers are the same ticker when their NFC forms are equal after lower-case folding. DUST, dust and Dust are one identity. Comparison must happen on the folded identity, never on raw bytes.',
        status: 'universe',
        test: 'mint-case-insensitive-tick',
      },
      {
        id: 'DUST-4.6',
        title: 'The original spelling is preserved for display',
        text: 'An implementation stores the folded identity for comparison and the spelling as written for display. Replacing the display form with the folded form loses information a deployer chose deliberately.',
        status: 'universe',
      },
    ],
  },
  {
    id: 'deploy',
    number: '5',
    title: 'Deploy',
    intro:
      'A deploy creates a ticker and fixes, permanently, how many satoshis stand behind one of its units. Everything a mint or a transfer later computes depends on the numbers written here.',
    rules: [
      {
        id: 'DUST-5.1',
        title: 'The key set is exact',
        text: 'A deploy contains exactly p, op, tick, supply, unit_sats and max_sats, and may contain lim_sats. A missing required key and an unrecognised extra key both reject the whole payload. Unknown fields are not ignored.',
        status: 'universe',
        test: 'deploy-unknown-field',
      },
      {
        id: 'DUST-5.2',
        title: 'supply is the permanent unit ceiling',
        text: 'supply is the total whole units that may ever be minted for this ticker. It cannot be raised, lowered or reissued by any later message.',
        status: 'verified',
      },
      {
        id: 'DUST-5.3',
        title: 'unit_sats is the permanent backing ratio',
        text: 'unit_sats is the exact number of satoshis that back one unit, for the entire life of the ticker. There is no default: a deploy that omits unit_sats is rejected, and 546 is an example, not a fallback.',
        status: 'verified',
      },
      {
        id: 'DUST-5.4',
        title: 'max_sats equals supply × unit_sats',
        text: 'max_sats is a redundancy check, not an independent quantity. A deploy whose max_sats differs from the exact product by even one satoshi is rejected rather than corrected.',
        status: 'verified',
        test: 'deploy-arithmetic-mismatch',
      },
      {
        id: 'DUST-5.5',
        title: 'max_sats may not exceed the money supply',
        text: 'A deployment whose total backing exceeds 2,100,000,000,000,000 satoshis can never be fully minted, so it is rejected at deploy time rather than at the mint that would cross the line.',
        status: 'universe',
        test: 'deploy-exceeds-money',
      },
      {
        id: 'DUST-5.6',
        title: 'lim_sats is an optional per-mint satoshi cap',
        text: 'When absent or "0", one mint may take the entire supply. When present and positive it may not exceed max_sats, and every mint must satisfy sats ≤ lim_sats. The equivalent unit cap is the floor of lim_sats ÷ unit_sats.',
        status: 'verified',
        test: 'deploy-limit-above-max',
      },
      {
        id: 'DUST-5.7',
        title: 'The first valid deployment of an identity wins',
        text: 'Once a valid deployment exists for a folded ticker identity, every later deployment of that identity is rejected. Ordering is by block height, then transaction index within the block, then inscription order within the transaction.',
        status: 'universe',
        test: 'deploy-duplicate-ticker',
      },
      {
        id: 'DUST-5.8',
        title: 'There are no decimals',
        text: 'DUST-20 balances have zero decimal places. No decimals field exists, and supplying one rejects the payload under DUST-5.1.',
        status: 'universe',
      },
    ],
  },
  {
    id: 'mint',
    number: '6',
    title: 'Mint',
    intro:
      'A mint creates units. It is the only point where a written message and the physical shape of a Bitcoin output have to agree exactly, and the only place where an error cannot be repaired after broadcast.',
    rules: [
      {
        id: 'DUST-6.1',
        title: 'The key set is exact',
        text: 'A mint contains exactly p, op, tick, amt and sats. There are no optional mint fields.',
        status: 'universe',
        test: 'mint-missing-field',
      },
      {
        id: 'DUST-6.2',
        title: 'A mint resolves exactly one accepted deployment',
        text: 'The mint names a ticker; the reader folds it to its identity and finds the accepted deployment for that identity. A mint for an identity with no accepted deployment is rejected. Every ratio used to check the mint comes from the resolved deployment, never from the mint payload.',
        status: 'verified',
        test: 'mint-no-deployment',
      },
      {
        id: 'DUST-6.3',
        title: 'amt is a positive whole number of units',
        text: 'amt is a strict positive decimal string. A mint of zero units does not exist, and neither does a fractional one: there are no decimals, so the smallest possible mint is one whole unit backed by unit_sats satoshis.',
        status: 'verified',
        test: 'mint-zero-amount',
      },
      {
        id: 'DUST-6.4',
        title: 'sats equals amt × unit_sats',
        text: 'The satoshis a mint declares are the units it creates multiplied by the resolved deployment ratio. sats is never inferred from amt: omitting it rejects the payload.',
        status: 'verified',
        test: 'mint-sats-mismatch',
      },
      {
        id: 'DUST-6.5',
        title: 'sats respects the deployment per-mint cap',
        text: 'When the resolved deployment declares a positive lim_sats, a mint whose sats exceeds it is rejected in full.',
        status: 'verified',
        test: 'mint-limit-violation',
      },
      {
        id: 'DUST-6.6',
        title: 'Mints stop at the declared supply',
        text: 'Previously minted units plus amt must not exceed supply. There is no partial fill: a mint that would cross the ceiling is rejected in full rather than trimmed to the remainder.',
        status: 'verified',
        test: 'mint-exceeds-supply',
      },
      {
        id: 'DUST-6.7',
        title: 'The carrying output holds exactly sats satoshis',
        text: 'Three numbers must agree: the deployment ratio, the sats field in the JSON, and the real value of the Bitcoin output carrying the inscription. A one-satoshi difference invalidates the mint, and the transaction still confirms normally.',
        status: 'verified',
        test: 'mint-output-mismatch',
      },
      {
        id: 'DUST-6.8',
        title: 'The inscription sits at satoshi offset 0 of that output',
        text: 'The mint inscription must begin at the first satoshi of the output that carries it. Padding that shifts the inscription away from offset 0 invalidates the mint.',
        status: 'universe',
      },
      {
        id: 'DUST-6.9',
        title: 'The carrying output must not already hold an allocation',
        text: 'A mint cannot be layered on top of an output that already carries a DUST-20 allocation. Two allocations claiming the same satoshis would make ownership undecidable.',
        status: 'universe',
      },
    ],
  },
  {
    id: 'allocation',
    number: '7',
    title: 'Allocation and movement',
    intro:
      'After a mint, DUST-20 stops using messages. An allocation is a span of satoshis inside an output, and moving units means spending those satoshis. Everything in this section is derived from transaction shape, which is why output order and output size are protocol-significant.',
    rules: [
      {
        id: 'DUST-7.1',
        title: 'No transfer message exists',
        text: 'DUST-20 uses inscriptions only for deploy and mint. An inscription whose op is transfer is invalid, moves nothing, and must not be treated as a transfer by any implementation.',
        status: 'universe',
        test: 'transfer-inscription',
      },
      {
        id: 'DUST-7.2',
        title: 'An allocation is an outpoint, an identity, a ratio, an amount and an offset',
        text: 'The offset is the satoshi position at which the allocation begins inside its output. Without it the next spend cannot be computed, so an implementation that stores only an amount per outpoint is incomplete.',
        status: 'universe',
      },
      {
        id: 'DUST-7.3',
        title: 'Satoshis map input to output in ordinal first-in-first-out order',
        text: 'Lay every input value end to end in input index order to form one satoshi range, and every output value end to end in output index order to form another. The n-th satoshi of the input range is the n-th satoshi of the output range. Satoshis past the end of the output range are the miner fee.',
        status: 'universe',
      },
      {
        id: 'DUST-7.4',
        title: 'A unit survives only when its whole block lands in one supported output',
        text: 'Each unit is a contiguous block of unit_sats satoshis inside the allocation span. It survives where that entire block falls inside a single output the reader can attribute to a supported address. A block split across an output boundary survives nowhere.',
        status: 'universe',
      },
      {
        id: 'DUST-7.5',
        title: 'Output order is protocol-significant',
        text: 'Allocation is positional. Moving an output, changing its value, or inserting one changes which satoshis land where and therefore which units survive. Reordering outputs is never cosmetic.',
        status: 'universe',
      },
      {
        id: 'DUST-7.6',
        title: 'Allocations merge when identity and ratio match',
        text: 'Several allocations of the same ticker identity can be combined into one output, provided every contributing unit lands whole inside it. Allocations of different identities keep separate records even inside one output, tracked by their own offsets.',
        status: 'universe',
      },
      {
        id: 'DUST-7.7',
        title: 'A partial send requires an explicit colored change output',
        text: 'Spending an allocation of 91 units and sending 10 requires a second output holding at least 81 × unit_sats satoshis, positioned so each unit fits whole. Omitting that output does not keep the remainder: whole units land in whatever supported output the satoshis reach next, and the rest fall into the fee and are burned.',
        status: 'verified',
      },
      {
        id: 'DUST-7.8',
        title: 'Miner fees are funded from cardinal inputs',
        text: 'Satoshis that become the fee are past the end of the output range, so any units they carried are destroyed. A builder adds an ordinary bitcoin input to pay the fee and never shaves satoshis off a colored output.',
        status: 'verified',
      },
    ],
  },
  {
    id: 'burn',
    number: '8',
    title: 'Burn',
    intro:
      'Burning is a consequence of transaction shape, not an instruction. There is no way to write "burn this", and there is no way to undo it once the transaction confirms.',
    rules: [
      {
        id: 'DUST-8.1',
        title: 'Units paid as fees are burned',
        text: 'Satoshis that fall past the last output become the miner fee. Any whole unit inside that range is destroyed.',
        status: 'universe',
      },
      {
        id: 'DUST-8.2',
        title: 'Units sent to an unattributable output are burned',
        text: 'When a reader cannot attribute an output to a supported address, units landing in it are destroyed rather than held in an unknown state.',
        status: 'universe',
      },
      {
        id: 'DUST-8.3',
        title: 'Units split across an output boundary are burned',
        text: 'A unit is atomic. If its block of unit_sats satoshis straddles two outputs, no fraction survives in either.',
        status: 'universe',
      },
      {
        id: 'DUST-8.4',
        title: 'Burns are recorded in supply accounting',
        text: 'A burn decreases total and circulating supply by the burned amount and increases burned supply by the same amount. Minted supply is unchanged: a burn does not free supply for reminting.',
        status: 'universe',
      },
      {
        id: 'DUST-8.5',
        title: 'A burn is silent on Bitcoin',
        text: 'The transaction confirms normally. No node, no wallet and no block explorer flags it. Only a DUST-20 reader knows anything was destroyed.',
        status: 'universe',
      },
    ],
  },
  {
    id: 'indexing',
    number: '9',
    title: 'Indexer semantics',
    intro:
      'These rules govern what a reader publishes rather than what the chain contains. They are drawn from the event contract the Bitcoin Universe production indexer enforces on every accepted batch.',
    rules: [
      {
        id: 'DUST-9.1',
        title: 'Every event carries a stable source event id',
        text: 'An event is identified by an id that does not change between observations of the same chain fact. Downstream consumers deduplicate on it.',
        status: 'universe',
      },
      {
        id: 'DUST-9.2',
        title: 'A confirmed event carries complete block placement',
        text: 'An event marked confirmed must carry block height, block hash, transaction index and event index. Partial placement is rejected: an event either has a full position in the chain or it is pending.',
        status: 'universe',
      },
      {
        id: 'DUST-9.3',
        title: 'A pending event carries no block placement',
        text: 'An event marked pending must not carry a height, hash, transaction index, event index or a non-zero confirmation count. Mixing the two states hides whether a balance is settled.',
        status: 'universe',
      },
      {
        id: 'DUST-9.4',
        title: 'Wallet deltas balance per operation',
        text: 'For a transfer the wallet deltas sum to zero. For a mint they sum to the minted amount, and for a burn to the negative of the burned amount. Each delta must equal its own received minus sent, and an address may appear only once per event.',
        status: 'universe',
      },
      {
        id: 'DUST-9.5',
        title: 'A deploy carries no economic effect',
        text: 'A deploy event states metadata only. It carries no amount, no sender, no receiver, no wallet deltas and no supply movement. Supply appears when units are minted, not when a ticker is created.',
        status: 'universe',
      },
      {
        id: 'DUST-9.6',
        title: 'Reorganizations are replayed, not patched',
        text: 'On a reorganization a reader emits invalidations newest first, reverses ledger mutations, restores allocations that had been marked spent, removes allocations the orphaned branch created, and replays the replacement branch from the fork point.',
        status: 'universe',
      },
      {
        id: 'DUST-9.7',
        title: 'Coverage is declared, not assumed',
        text: 'A reader publishes its coverage as complete, partial or unavailable alongside a checkpoint of network, height, hash, finalized height and observation time. A consumer that ignores the coverage label cannot tell a quiet ticker from a stalled indexer.',
        status: 'universe',
      },
      {
        id: 'DUST-9.8',
        title: 'Mempool coverage is partial',
        text: 'The production indexer reports partial coverage precisely because it has no exhaustive mempool feed with a stable pending lifecycle and disappearance handling. Unconfirmed DUST-20 state is not a reliable input to an irreversible decision.',
        status: 'universe',
      },
    ],
  },
]

/** Flat list of every numbered rule, for search, llms.txt and cross-linking. */
export const SPEC_RULES = SPEC_SECTIONS.flatMap((section) =>
  section.rules.map((rule) => ({ ...rule, section: section.id, sectionTitle: section.title })),
)

/* ------------------------------------------------------------------ *
 * Transaction anatomy: the datasheet view
 * ------------------------------------------------------------------ */

export const ANATOMY = {
  mint: {
    id: 'mint',
    title: 'Mint transaction',
    caption:
      'A mint is a reveal transaction. The payload lives in the witness; the value that matters lives in the output.',
    rows: [
      {
        part: 'Input 0',
        role: 'Commit outpoint',
        requirement: 'Spends the commit output that carries the inscription envelope.',
        checked: 'Inscription index',
      },
      {
        part: 'Witness',
        role: 'Inscription envelope',
        requirement:
          'Holds the content type and the JSON payload. Content is UTF-8, at most 4096 bytes for a DUST-20 candidate.',
        checked: 'Inscription index',
      },
      {
        part: 'Output 0',
        role: 'Carrying output',
        requirement:
          'Value must equal the sats field exactly. The inscription must sit at satoshi offset 0. The output must not already carry an allocation.',
        checked: 'Bitcoin node + inscription index',
      },
      {
        part: 'Output 1..n',
        role: 'Cardinal change',
        requirement: 'Ordinary bitcoin. Carries no units and is not evaluated.',
        checked: 'Bitcoin node',
      },
      {
        part: 'Fee',
        role: 'Miner payment',
        requirement:
          'Funded from cardinal value. Satoshis that reach the fee are past the output range and carry nothing.',
        checked: 'Derived',
      },
    ],
  },
  transfer: {
    id: 'transfer',
    title: 'Transfer transaction',
    caption:
      'A transfer is an ordinary spend. Nothing marks it as DUST-20; the units follow the satoshis.',
    rows: [
      {
        part: 'Input 0..i',
        role: 'Colored inputs',
        requirement:
          'Outputs that carry allocations. Each contributes a span at a known offset into the concatenated input range.',
        checked: 'Reader allocation ledger',
      },
      {
        part: 'Input i+1..n',
        role: 'Cardinal inputs',
        requirement: 'Ordinary bitcoin added to fund the fee without disturbing colored spans.',
        checked: 'Bitcoin node',
      },
      {
        part: 'Output 0..j',
        role: 'Colored outputs',
        requirement:
          'Sized and ordered so each surviving unit lands whole inside one of them. A partial send needs an explicit colored change output.',
        checked: 'Derived from ordinal flow',
      },
      {
        part: 'Output j+1..m',
        role: 'Cardinal outputs',
        requirement:
          'Ordinary change. Units landing here are still tracked if the address is supported, which is usually a construction error.',
        checked: 'Derived from ordinal flow',
      },
      {
        part: 'Fee',
        role: 'Miner payment',
        requirement: 'Any colored satoshi that falls into the fee gap is burned.',
        checked: 'Derived',
      },
    ],
  },
}

/* ------------------------------------------------------------------ *
 * Formulas
 * ------------------------------------------------------------------ */

export const FORMULAS = [
  {
    id: 'max-sats',
    op: 'deploy',
    rule: 'DUST-5.4',
    expression: 'max_sats = supply × unit_sats',
    plain: 'Total backing is supply multiplied by the satoshis behind one unit.',
    example: '1,000,000 units × 546 sats = 546,000,000 sats',
    status: 'verified',
  },
  {
    id: 'mint-sats',
    op: 'mint',
    rule: 'DUST-6.4',
    expression: 'sats = amt × unit_sats',
    plain: 'The satoshis a mint declares are the units it creates multiplied by the unit size.',
    example: '100 units × 546 sats = 54,600 sats',
    status: 'verified',
  },
  {
    id: 'mint-output',
    op: 'mint',
    rule: 'DUST-6.7',
    expression: 'output_value = sats',
    plain:
      'The Bitcoin output that carries the mint inscription must hold exactly the declared satoshis.',
    example: 'A mint declaring 54,600 sats must sit in an output worth exactly 54,600 sats.',
    status: 'verified',
  },
  {
    id: 'unit-cap',
    op: 'deploy',
    rule: 'DUST-5.6',
    expression: 'mint_unit_cap = floor(lim_sats ÷ unit_sats)',
    plain: 'A satoshi cap per mint implies a whole-unit cap per mint.',
    example: '54,600 ÷ 546 = 100 units per mint',
    status: 'universe',
  },
  {
    id: 'conservation',
    op: 'transfer',
    rule: 'DUST-7.4',
    expression: 'input_units = surviving_units + burned_units',
    plain:
      'Units leaving an input either land whole inside a supported output or are burned. Nothing else can happen to them.',
    example: '91 units in produces 10 to the receiver, 81 as change, 0 burned',
    status: 'universe',
  },
  {
    id: 'backing',
    op: 'transfer',
    rule: 'DUST-7.4',
    expression: 'output_backing = units_in_output × unit_sats',
    plain:
      'Every output carrying units must hold at least the satoshis those whole units occupy, positioned so each unit fits entirely inside it.',
    example: '81 units × 546 = 44,226 sats of backing',
    status: 'universe',
  },
  {
    id: 'fee',
    op: 'transfer',
    rule: 'DUST-7.8',
    expression: 'fee = sum(inputs) - sum(outputs)',
    plain:
      'The miner fee is whatever the transaction does not pay out. Any colored satoshi that falls into that gap is burned, so fees must be funded by ordinary bitcoin.',
    example: 'Fund the fee from a separate cardinal input, never by shrinking a colored output.',
    status: 'universe',
  },
]

/* ------------------------------------------------------------------ *
 * State transitions
 * ------------------------------------------------------------------ */

export const STATE_TRANSITIONS = [
  {
    from: 'No ticker',
    event: 'Valid deploy inscription',
    to: 'Ticker deployed, 0 minted',
    rule: 'DUST-5.1 to DUST-5.7',
    note: 'The identity is claimed permanently. A second deploy of the same identity changes nothing.',
  },
  {
    from: 'Ticker deployed',
    event: 'Valid mint inscription in an output of exactly sats satoshis',
    to: 'Allocation live at that outpoint, offset 0',
    rule: 'DUST-6.1 to DUST-6.9',
    note: 'Minted supply increases by amt. Total and circulating supply increase by amt.',
  },
  {
    from: 'Allocation live',
    event: 'The carrying output is spent, whole units land in supported outputs',
    to: 'Allocation spent, new allocations live',
    rule: 'DUST-7.3, DUST-7.4',
    note: 'Wallet deltas sum to zero across the event. Supply is unchanged.',
  },
  {
    from: 'Allocation live',
    event: 'The carrying output is spent, some units land nowhere whole',
    to: 'Allocation spent, remainder burned',
    rule: 'DUST-8.1 to DUST-8.4',
    note: 'Total and circulating supply fall by the burned amount. Minted supply is unchanged.',
  },
  {
    from: 'Allocation live at confirmed depth',
    event: 'The confirming block is orphaned by a reorganization',
    to: 'Allocation invalidated, prior state restored, replacement branch replayed',
    rule: 'DUST-9.6',
    note: 'Invalidations are emitted newest first. A balance is only as final as the depth it was confirmed at.',
  },
  {
    from: 'Pending event',
    event: 'The transaction is replaced or evicted from the mempool',
    to: 'No event',
    rule: 'DUST-9.3, DUST-9.8',
    note: 'Coverage is partial, so a pending event may disappear without a stable notification.',
  },
]

/* ------------------------------------------------------------------ *
 * Invalidity conditions, keyed to issue codes the decoder emits
 * ------------------------------------------------------------------ */

export const INVALIDITY = [
  { code: 'not_object', rule: 'DUST-2.4', summary: 'Content is not a single JSON object.' },
  {
    code: 'not_flat_strings',
    rule: 'DUST-2.5',
    summary: 'A value is not a JSON string, or the object is nested.',
  },
  { code: 'duplicate_key', rule: 'DUST-2.6', summary: 'A field appears more than once.' },
  {
    code: 'trailing_content',
    rule: 'DUST-2.4',
    summary: 'Content continues after the closing brace.',
  },
  {
    code: 'content_too_large',
    rule: 'DUST-2.3',
    summary: 'Content exceeds 4096 bytes and is not evaluated.',
  },
  { code: 'bad_protocol', rule: 'DUST-4.1', summary: 'p is not the literal string dust-20.' },
  { code: 'bad_operation', rule: 'DUST-4.2', summary: 'op is not deploy or mint.' },
  {
    code: 'bad_tick',
    rule: 'DUST-4.3, DUST-4.4',
    summary: 'The ticker is not NFC, is outside 1 to 64 bytes, or contains an excluded character.',
  },
  {
    code: 'missing_field',
    rule: 'DUST-5.1, DUST-6.1',
    summary: 'A required field of the operation is absent.',
  },
  {
    code: 'unknown_field',
    rule: 'DUST-5.1, DUST-6.1',
    summary: 'A field outside the operation key set is present.',
  },
  {
    code: 'bad_integer',
    rule: 'DUST-3.1, DUST-3.2',
    summary: 'A quantity is not a strict decimal string.',
  },
  {
    code: 'exceeds_money_supply',
    rule: 'DUST-3.3, DUST-5.5',
    summary: 'A satoshi quantity exceeds the total that will ever exist.',
  },
  {
    code: 'max_sats_mismatch',
    rule: 'DUST-5.4',
    summary: 'max_sats does not equal supply × unit_sats.',
  },
  { code: 'lim_sats_above_max', rule: 'DUST-5.6', summary: 'lim_sats exceeds max_sats.' },
  {
    code: 'duplicate_deployment',
    rule: 'DUST-5.7',
    summary: 'The ticker identity already has an accepted deployment.',
  },
  {
    code: 'deployment_missing',
    rule: 'DUST-6.2',
    summary: 'The mint resolves no accepted deployment.',
  },
  {
    code: 'mint_sats_mismatch',
    rule: 'DUST-6.4',
    summary: 'sats does not equal amt × unit_sats for the resolved deployment.',
  },
  {
    code: 'mint_exceeds_limit',
    rule: 'DUST-6.5',
    summary: 'sats exceeds the deployment per-mint cap.',
  },
  {
    code: 'mint_exceeds_supply',
    rule: 'DUST-6.6',
    summary: 'Minted units plus amt would exceed supply.',
  },
  {
    code: 'output_value_mismatch',
    rule: 'DUST-6.7',
    summary: 'The carrying output value differs from sats.',
  },
  {
    code: 'allocation_overflows_input',
    rule: 'DUST-7.2',
    summary: 'A claimed allocation does not fit inside the output it is recorded against.',
  },
  {
    code: 'outputs_exceed_inputs',
    rule: 'DUST-7.3',
    summary: 'Outputs total more than inputs, so the transaction cannot be built.',
  },
]

/* ------------------------------------------------------------------ *
 * Fee and size considerations
 * ------------------------------------------------------------------ */

export const FEE_NOTES = [
  {
    id: 'payload-size',
    title: 'Payload size is small and nearly constant',
    body: 'A deploy payload is typically 110 to 130 bytes of JSON and a mint is 60 to 70 bytes. Both sit in the witness, so they are discounted to one weight unit per byte. Payload size is almost never what makes a DUST-20 transaction expensive.',
    status: 'universe',
  },
  {
    id: 'locked-value',
    title: 'Backing is locked capital, not a fee',
    body: 'A mint of 100 units at 546 satoshis per unit puts 54,600 satoshis into an output and keeps them there for as long as you hold the units. Sizing a deployment is a decision about how much bitcoin every holder must immobilise.',
    status: 'universe',
  },
  {
    id: 'dust-threshold',
    title: 'unit_sats below the relay dust threshold is valid but unspendable',
    body: 'DUST-20 permits any positive unit_sats, and a reader will accept it. Bitcoin nodes will not relay an output below the standard dust threshold for its script type, which is 546 satoshis for P2WPKH and 330 for P2TR. Check the threshold for the output type you will actually use.',
    status: 'universe',
  },
  {
    id: 'output-count',
    title: 'Colored change adds an output, and outputs cost more than payload bytes',
    body: 'A safe partial send needs a receiver output, a colored change output, a cardinal change output and at least one cardinal input. Budget for that shape rather than for the smallest transaction that would confirm.',
    status: 'universe',
  },
  {
    id: 'fee-funding',
    title: 'Never let the fee come out of backing',
    body: 'A wallet that subtracts the fee from the largest output will silently shrink a colored output, move the colored span, and burn units. Fee funding must come from cardinal inputs, and the builder must verify every colored output value after the fee is applied.',
    status: 'verified',
  },
  {
    id: 'consolidation',
    title: 'Consolidate deliberately, not automatically',
    body: 'Merging allocations of one identity into a single output is valid and reduces future fees. Automatic consolidation that treats colored outputs as ordinary change will destroy units, so consolidation must be an explicit DUST-20 aware operation.',
    status: 'universe',
  },
]

/* ------------------------------------------------------------------ *
 * Limitations
 * ------------------------------------------------------------------ */

export const LIMITATIONS = [
  {
    id: 'not-consensus',
    title: 'Validity is an interpretation, not consensus',
    body: 'Bitcoin does not know DUST-20 exists. Every balance is one reader’s conclusion from applying these rules to the chain. Two readers that differ on a rule will differ on a balance, and Bitcoin will not settle the argument.',
  },
  {
    id: 'single-implementation',
    title: 'Most transfer behaviour is settled by one implementation',
    body: 'The legacy specification documents deploy and mint and one colored-UTXO transfer example. Ordinal flow, burn conditions, ticker identity and output ordering are settled here by the Bitcoin Universe production indexer. Rules labelled UNIVERSE are a working profile, not a multi-party agreement.',
  },
  {
    id: 'capital',
    title: 'Holding units immobilises bitcoin',
    body: 'Backing is real bitcoin sitting in an output. A large supply at a large unit_sats can require more bitcoin than the deployer expects, and DUST-5.5 rejects a deployment that would require more than exists.',
  },
  {
    id: 'indivisible',
    title: 'Units are indivisible and non-fractional',
    body: 'There are no decimals. A holder cannot send half a unit, and a unit that cannot be placed whole in an output is destroyed rather than rounded.',
  },
  {
    id: 'no-mempool',
    title: 'There is no reliable unconfirmed view',
    body: 'The production indexer declares partial coverage: no exhaustive mempool feed, no stable pending lifecycle, no disappearance handling. Applications must not present unconfirmed DUST-20 state as settled.',
  },
  {
    id: 'no-marketplace',
    title: 'Trading DUST-20 inside Bitcoin Universe is not available',
    body: 'Marketplace availability for DUST-20 is read-only. Listing, buying, offers and settlement are all unavailable until a typed authoritative ownership resolver exists. See the Universe support page for the exact recorded reason.',
  },
  {
    id: 'rbf',
    title: 'Replacement can change the outcome',
    body: 'Replace-by-fee can alter the output layout, which changes where colored satoshis land. A replacement can burn units the original would have preserved, so state must be derived from the transaction that actually confirmed.',
  },
]

/* ------------------------------------------------------------------ *
 * Where sources disagree
 * ------------------------------------------------------------------ */

export const RECONCILIATIONS = [
  {
    id: 'max-sats-required',
    title: 'Is max_sats required in a deploy?',
    legacy:
      'The legacy profile includes max_sats and frames it as supply × unit_sats. Earlier versions of this documentation additionally reported that a builder emitted deploys without max_sats, and labelled the question an unreconciled compatibility split.',
    current:
      'The production indexer requires max_sats. Its deploy key set is exactly p, op, tick, supply, unit_sats, max_sats, with lim_sats optional, and a deploy missing max_sats is rejected rather than inferred.',
    resolution:
      'Resolved in favour of required. Emit max_sats and verify it equals supply × unit_sats. A deploy without it is not indexed by the current implementation.',
    status: 'verified',
  },
  {
    id: 'transfer-payload',
    title: 'Is there an official transfer payload?',
    legacy:
      'The legacy guide documents deploy and mint JSON and a colored-UTXO transfer example, but publishes no transfer schema. Earlier documentation listed a transfer inscription as an open question and noted an application emitting a transfer preview containing amt.',
    current:
      'The production indexer accepts no transfer inscription at all. Movement is derived purely from ordinal satoshi flow through ordinary Bitcoin spends.',
    resolution:
      'Resolved: there is no transfer payload. Treat any op: "transfer" inscription as invalid, and treat an application preview containing amt as a user-interface artifact, not a protocol message.',
    status: 'universe',
  },
  {
    id: 'ticker-identity',
    title: 'How are duplicate and differently-cased tickers handled?',
    legacy:
      'The legacy guide states the ticker is not limited to four bytes but does not settle case normalization or which deployment wins when a name is reused.',
    current:
      'Identity is the NFC form case-folded to lower case, bounded to 64 UTF-8 bytes, excluding control characters, whitespace and the delimiters / ? # \\. The first valid deployment of an identity wins; later ones are rejected.',
    resolution:
      'Resolved by the current implementation. Independent implementations that compare tickers byte-for-byte will disagree with it, so preserve the original spelling for display and compare on the folded identity.',
    status: 'universe',
  },
  {
    id: 'burn-definition',
    title: 'What counts as a burn?',
    legacy:
      'The legacy material defines no burn rule, and earlier documentation advised showing recovery actions as potentially allocation-destroying rather than as settled burns.',
    current:
      'Burning is defined precisely and is a consequence of transaction shape, not an instruction: satoshis paid as fees, sent to an unsupported output, or split so no whole unit fits are burned, and the supply accounting records it.',
    resolution:
      'Resolved as a derived outcome. There is still no way to express "burn this" as a message. You burn by constructing a transaction that drops the satoshis.',
    status: 'universe',
  },
  {
    id: 'output-ordering',
    title: 'Does output order matter?',
    legacy: 'Earlier documentation listed output ordering as an open question.',
    current:
      'Order matters completely. Allocation is positional: inputs and outputs are concatenated into satoshi ranges in index order, so moving an output changes which units land where.',
    resolution:
      'Resolved: build outputs deliberately and test the exact ordering your builder produces. Reordering outputs is never cosmetic.',
    status: 'universe',
  },
  {
    id: 'indexer-api',
    title: 'Is there one official DUST-20 indexer API?',
    legacy:
      'No API schema, pagination model, or response versioning is published in the legacy guide.',
    current:
      'The production indexer exposes its own normalized and legacy routes with bearer authentication, stable cursors and explicit coverage labels, but these are one service’s contract.',
    resolution:
      'Unresolved as a standard. Validate remote responses against a schema you control and treat coverage, source identity and observation height as part of every answer.',
    status: 'unresolved',
  },
]

/* ------------------------------------------------------------------ *
 * Open questions
 * ------------------------------------------------------------------ */

export const OPEN_QUESTIONS = [
  {
    id: 'independent-implementations',
    question: 'Do independent implementations agree with these rules?',
    why: 'Most of the transfer, burn and ticker-identity behaviour on this site is settled by one production implementation rather than by a multi-party specification.',
    posture:
      'Treat rules marked UNIVERSE as a working profile. Before relying on them across tools, test against the specific reader your users will see.',
  },
  {
    id: 'confirmation-threshold',
    question: 'How many confirmations make a DUST-20 balance safe to act on?',
    why: 'The protocol defines no threshold, and reorg handling restores or removes allocations depending on depth.',
    posture:
      'Publish your own finality depth, show confirmation counts to users, and never present unconfirmed DUST-20 state as settled.',
  },
  {
    id: 'mempool-lifecycle',
    question: 'What is the pending lifecycle for an unconfirmed DUST-20 movement?',
    why: 'The production indexer reports partial coverage precisely because it has no exhaustive mempool feed with stable pending and disappearance handling.',
    posture:
      'Do not build balance guarantees on mempool state. Show pending movements as unverified and re-check at confirmation.',
  },
  {
    id: 'rbf',
    question: 'What happens to DUST-20 state when a transaction is replaced?',
    why: 'Replace-by-fee can change the output layout, which changes where colored satoshis land, so a replacement can burn units the original preserved.',
    posture:
      'Re-derive allocation from the transaction that actually confirmed. Never carry forward the pre-replacement interpretation, and never blindly rebroadcast.',
  },
  {
    id: 'typed-ownership',
    question: 'What would a typed authoritative ownership resolver look like?',
    why: 'This is the exact blocker recorded against DUST-20 marketplace mutations: a boolean "is this output still good" answer cannot prove amount, owner, schema, freshness or settlement authority.',
    posture:
      'A resolver has to return the identity, the exact amount, the owning address, the outpoint, the observation height and the coverage label, and it has to be first-party. Until one exists, DUST-20 stays read-only in Bitcoin Universe products.',
  },
]

/* ------------------------------------------------------------------ *
 * Indexer implementation guidance
 * ------------------------------------------------------------------ */

export const INDEXER_STAGES = [
  {
    id: 'observe',
    label: 'Observe',
    title: 'Ingest raw chain events',
    body: 'Read complete blocks with input values, output values and output addresses, plus authoritative inscription identity. Record the transaction, output, inscription association and block position before declaring anything about balances.',
    status: 'universe',
  },
  {
    id: 'normalize',
    label: 'Normalize',
    title: 'Parse strictly and keep failures visible',
    body: 'Apply the flat-string-object reader, exact key sets and strict integer parsing. Keep parse failures as recorded invalid events rather than dropping them into an unexplained empty result.',
    status: 'universe',
  },
  {
    id: 'resolve',
    label: 'Resolve',
    title: 'Resolve deployment and history',
    body: 'Fold the ticker to its identity, apply first-deploy-wins, and check the mint against the resolved unit size, the per-mint cap and remaining supply. Do not guess when two candidates conflict.',
    status: 'universe',
  },
  {
    id: 'materialize',
    label: 'Materialize',
    title: 'Create allocation records with position',
    body: 'An allocation is an outpoint, a ticker identity, an amount, a unit size and a satoshi offset inside that output. The offset is not optional bookkeeping, it is what makes the next spend computable.',
    status: 'universe',
  },
  {
    id: 'propagate',
    label: 'Propagate',
    title: 'Follow satoshis through each spend',
    body: 'Concatenate input values into one range and output values into another, intersect each allocation span with each output, keep only whole units, and record the difference as burned. Emit transfer effects only where the owning address actually changes.',
    status: 'universe',
  },
  {
    id: 'reconcile',
    label: 'Reconcile',
    title: 'Roll forward and roll back',
    body: 'Track block association so a reorganization can invalidate newest first, reverse mutations, restore spent allocations, remove orphaned ones and replay the replacement branch. Preserve enough history to explain every transition.',
    status: 'universe',
  },
]

export const ALLOCATION_RECORD = [
  {
    field: 'outpoint',
    why: 'Identifies the actual Bitcoin output holding the units.',
    minimum: 'Store txid, vout, output value, address where available, and spent status.',
  },
  {
    field: 'offset_sats',
    why: 'Locates the colored range inside the output. Without it the next spend cannot be computed.',
    minimum: 'Store the satoshi offset at which this allocation begins within its output.',
  },
  {
    field: 'tick + unit_sats',
    why: 'Binds the output to a resolved deployment rule.',
    minimum: 'Preserve the original spelling for display and the folded identity for comparison.',
  },
  {
    field: 'amount',
    why: 'Lets a client recheck the unit arithmetic independently.',
    minimum: 'Store exact integers as strings; assert amount × unit_sats fits within the output.',
  },
  {
    field: 'status',
    why: 'Distinguishes pending, confirmed, spent, invalidated and unknown.',
    minimum: 'Never present unknown or stale state as a confirmed balance.',
  },
  {
    field: 'source + observation',
    why: 'Explains who made the interpretation and when.',
    minimum: 'Expose upstream identity, retrieval time, observed height and coverage label.',
  },
  {
    field: 'origin inscription',
    why: 'Traces an allocation back to the mint that created it.',
    minimum: 'Retain the originating inscription id through every split and merge.',
  },
]

/* ------------------------------------------------------------------ *
 * Implementation checklist
 * ------------------------------------------------------------------ */

export const CHECKLIST = [
  {
    group: 'Reader',
    items: [
      { text: 'Decode content as UTF-8 and reject anything over 4096 bytes.', rule: 'DUST-2.2, DUST-2.3' },
      { text: 'Reject nested values, non-string values, duplicate keys and trailing content.', rule: 'DUST-2.4 to DUST-2.6' },
      { text: 'Parse every quantity as a strict decimal string into an exact integer type.', rule: 'DUST-3.1, DUST-3.5' },
      { text: 'Enforce the exact key set per operation; never ignore an unknown field.', rule: 'DUST-5.1, DUST-6.1' },
      { text: 'Record rejected payloads as invalid events rather than discarding them.', rule: 'DUST-9.7' },
    ],
  },
  {
    group: 'Identity and state',
    items: [
      { text: 'Fold tickers with NFC plus lower case, and keep the written spelling for display.', rule: 'DUST-4.5, DUST-4.6' },
      { text: 'Apply first-deploy-wins by height, then transaction index, then inscription order.', rule: 'DUST-5.7' },
      { text: 'Check every mint against the resolved deployment, not against its own payload.', rule: 'DUST-6.2' },
      { text: 'Compare the declared sats against the real output value before accepting a mint.', rule: 'DUST-6.7' },
      { text: 'Reject a mint into an output that already carries an allocation.', rule: 'DUST-6.9' },
    ],
  },
  {
    group: 'Allocation',
    items: [
      { text: 'Store a satoshi offset with every allocation.', rule: 'DUST-7.2' },
      { text: 'Compute movement by concatenating input and output ranges in index order.', rule: 'DUST-7.3' },
      { text: 'Keep only whole units, and record the difference as burned.', rule: 'DUST-7.4, DUST-8.3' },
      { text: 'Treat output order as significant and never normalize it away.', rule: 'DUST-7.5' },
      { text: 'Account for fee burns and unattributable-output burns in supply.', rule: 'DUST-8.1, DUST-8.2, DUST-8.4' },
    ],
  },
  {
    group: 'Publication',
    items: [
      { text: 'Give every event a stable source event id.', rule: 'DUST-9.1' },
      { text: 'Require complete block placement on confirmed events and none on pending events.', rule: 'DUST-9.2, DUST-9.3' },
      { text: 'Balance wallet deltas per operation, and reject an address appearing twice.', rule: 'DUST-9.4' },
      { text: 'Emit deploys with no economic effect.', rule: 'DUST-9.5' },
      { text: 'Publish a coverage label and a checkpoint with every answer.', rule: 'DUST-9.7' },
      { text: 'Invalidate newest first on a reorganization and replay the replacement branch.', rule: 'DUST-9.6' },
    ],
  },
  {
    group: 'Wallet and application',
    items: [
      { text: 'Show the receiver, colored change, cardinal funding and fee as distinct roles before signing.', rule: 'DUST-7.7' },
      { text: 'Block a partial send that has no colored change output.', rule: 'DUST-7.7' },
      { text: 'Fund fees from cardinal inputs and re-verify colored output values after fee application.', rule: 'DUST-7.8' },
      { text: 'Revalidate outpoints at build time, not at page load.', rule: 'DUST-9.7' },
      { text: 'Treat disagreement between two readers as a blocking error, not a choice.', rule: 'DUST-9.7' },
    ],
  },
]

/* ------------------------------------------------------------------ *
 * Bitcoin Universe support
 * ------------------------------------------------------------------ */

export const UNIVERSE_SUPPORT = {
  summary:
    'You can view DUST-20 in Bitcoin Universe products. You cannot trade it there. The reason is recorded in the capability registry rather than left implicit, and it is reproduced below word for word.',
  marketplace: {
    availability: 'read-only',
    mode: 'read-only',
    owner: 'Core marketplace',
    mutationGate:
      'DUST-20 mutations are unavailable until a typed authoritative ownership resolver replaces the retired address-only legacy flow.',
    ownership: 'No safe typed mutation resolver is configured',
    orderBook: 'Read-only legacy Universe catalog',
    settlement: 'No supported settlement while ownership is unverifiable',
    protocolState: 'DUST-20 indexer discovery and portfolio data',
    freshness: 'Discovery is non-authoritative for mutations.',
    confirmation: 'No supported marketplace mutation reaches settlement.',
    reorg: 'Read-only catalog data follows its discovery source.',
  },
  surfaces: [
    {
      surface: 'Core',
      actions: ['view', 'discover', 'view-collection', 'view-activity', 'view-transaction'],
      note: 'Discovery and browsing of DUST-20 tokens, collections, activity and transactions.',
    },
    {
      surface: 'Wallet',
      actions: ['view', 'send', 'receive'],
      note: 'Balance display and ordinary Bitcoin send and receive of the outputs that carry units.',
    },
    {
      surface: 'Inscribe',
      actions: ['deploy', 'mint', 'transfer'],
      note: 'Building deploy and mint inscriptions, and the spend that moves an allocation.',
    },
  ],
  marketplaceActions: [
    { action: 'view', supported: true, mode: 'read-only' },
    { action: 'view-collection', supported: true, mode: 'read-only' },
    { action: 'view-activity', supported: true, mode: 'read-only' },
    { action: 'list', supported: false },
    { action: 'update-listing', supported: false },
    { action: 'unlist', supported: false },
    { action: 'buy', supported: false },
    { action: 'sell', supported: false },
    { action: 'make-offer', supported: false },
    { action: 'accept-offer', supported: false },
    { action: 'cancel-offer', supported: false },
    { action: 'settle', supported: false },
    { action: 'reconcile', supported: false },
  ],
  dataPath: [
    {
      title: 'The read path is first-party',
      body: 'Bitcoin Universe engineering rules require that all Bitcoin production blockchain data come from Universe-owned and Universe-operated nodes, APIs, databases and indexers, with no third-party fallback path. DUST-20 discovery and portfolio data is served by the first-party index-dust20 service, which reads a Universe-operated Bitcoin Core node and the shared Universe Ord 0.29 instance.',
    },
    {
      title: 'Why a boolean output check is not enough to trade on',
      body: 'The retired legacy path answered one question: is this listing output still good, true or false. That answer cannot prove the exact amount, the owning address, the schema of the response, the freshness of the observation, or authority to settle. Every one of those is required before a purchase can move someone else’s money, so the route is deliberately non-executable rather than best-effort.',
    },
    {
      title: 'What would change this',
      body: 'A typed authoritative ownership resolver: first-party, returning identity, exact amount, owning address, outpoint, observation height and coverage, bound to a checkpoint. When one is configured, the capability registry entry changes and marketplace mutations can be reconsidered. Until then, treat every DUST-20 listing surface in Universe products as catalog data only.',
    },
  ],
}

/* ------------------------------------------------------------------ *
 * Security considerations
 * ------------------------------------------------------------------ */

export const SAFETY = [
  {
    id: 'secrets',
    severity: 'critical',
    title: 'Never share a recovery phrase or private key',
    body: 'No DUST-20 application needs your seed phrase or private key. An app can prepare an unsigned transaction without them. Leave immediately if a site asks for either.',
  },
  {
    id: 'review',
    severity: 'critical',
    title: 'Review every output role before signing',
    body: 'Before the wallet prompt appears you should be able to see the receiver, the units and satoshis going to them, your colored change, the ordinary bitcoin funding the fee, and the fee itself. A list of addresses is not a review.',
  },
  {
    id: 'colored-change',
    severity: 'critical',
    title: 'Missing colored change is a stop sign',
    body: 'If you are sending part of an allocation and no colored change output is present, the remainder does not stay yours in any predictable way: some whole units land in whatever supported output comes next, and the rest are burned. This is not a formatting detail. Do not approve it.',
  },
  {
    id: 'fee-inputs',
    severity: 'high',
    title: 'Keep fee funding separate from colored inputs',
    body: 'Fund the miner fee from ordinary bitcoin. If the fee is taken out of colored backing, the colored range shifts and units can be destroyed even though the transaction confirms.',
  },
  {
    id: 'stale-utxo',
    severity: 'high',
    title: 'Revalidate outputs immediately before building',
    body: 'A selected output may have been spent since the screen loaded. A marketplace listing is discovery data, not proof that an output is still unspent. Re-check at build time, not at page load.',
  },
  {
    id: 'indexer-disagreement',
    severity: 'high',
    title: 'Treat source disagreement as a blocking error',
    body: 'If two readers describe the same output differently, do not pick the friendlier answer. Show the conflict, block the irreversible step, and keep redacted evidence for investigation.',
  },
  {
    id: 'ambiguity',
    severity: 'high',
    title: 'Do not downgrade an ambiguous construction to a warning',
    body: 'Unexplained satoshi differences, mixed-ticker selections and unattributable outputs are failures. Silently filling in a field, rounding a satoshi value, or assuming an unspecified payload is valid converts a caught bug into a burned balance.',
  },
  {
    id: 'untyped-proof',
    severity: 'high',
    title: 'Never settle value on an untyped ownership answer',
    body: 'A boolean "still available" response proves nothing about amount, owner, schema or freshness. This is the recorded reason DUST-20 marketplace mutations are unavailable in Bitcoin Universe, and the same reasoning applies to any integration you build.',
  },
  {
    id: 'retry',
    severity: 'medium',
    title: 'Never blindly retry an uncertain broadcast',
    body: 'Keep the transaction id and known status. Disable repeat submission until someone has inspected the transaction. A duplicate broadcast can spend the same colored inputs a second way.',
  },
  {
    id: 'reorg-awareness',
    severity: 'medium',
    title: 'Remember that confirmed is not permanent',
    body: 'A reorganization can remove a confirmation and change which transaction actually spent an output. Track confirmation depth and invalidate derived state when the chain moves under you.',
  },
]

/* ------------------------------------------------------------------ *
 * Document history
 * ------------------------------------------------------------------ */

export const CHANGELOG = [
  {
    version: '1.1.0',
    date: '2026-09-01',
    summary: 'Normative renumbering, Universe availability truth, and a static-first rebuild.',
    changes: [
      'Added a numbered normative specification with stable rule identifiers from DUST-2.1 to DUST-9.8, and linked every conformance vector to the rule it exercises.',
      'Published the recorded Bitcoin Universe capability state for DUST-20: marketplace availability read-only, with the exact mutation gate, ownership and settlement statements from the capability registry.',
      'Documented that the DUST-20 read path in Universe products is first-party, and why an untyped boolean output check cannot support settlement.',
      'Added transaction anatomy tables, state transitions, invalidity conditions keyed to decoder issue codes, fee and size considerations, limitations, and a five-part implementation checklist.',
      'Moved every data-driven table to build-time rendering, so the whole site now reads without JavaScript. Scripts remain only for the decoder, the visualizer, search and the theme toggle.',
      'Added client-side search over pages, rules, fields, terms and vectors, plus a changelog page and a Universe support page.',
      'Rebuilt the presentation as a technical datasheet with a fine grid substrate, hairline rules and monospace numerics.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-08-18',
    summary: 'First complete documentation set generated from a single data model.',
    changes: [
      'Established assets/protocol-data.js and assets/protocol-vectors.js as the source of truth for every table, example and machine-readable artifact.',
      'Published the strict reader profile, the field ledger with provenance labels, the formula set and the reconciliation section.',
      'Shipped an exact-integer validator, a transaction simulator and a browser conformance laboratory backed by the same vectors the Node test suite asserts.',
      'Resolved max_sats to required, resolved the transfer payload question to "none exists", and resolved ticker identity to NFC plus lower-case folding.',
    ],
  },
]
