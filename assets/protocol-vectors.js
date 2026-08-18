/**
 * DUST-20 — examples, conformance vectors, glossary and FAQ.
 *
 * These vectors are the fixtures the site's conformance laboratory renders,
 * the cases the Node test suite asserts against, and the content exported to
 * conformance.json. They exist once, here.
 *
 * Each vector names the exact issue code the validator must produce, so a
 * documentation claim and the running validator cannot drift apart.
 */

/** The deployment most examples resolve against. */
export const REFERENCE_DEPLOYMENT = {
  tick: 'dust',
  display: 'DUST',
  supply: '1000000',
  unitSats: '546',
  maxSats: '546000000',
  limSats: '54600',
  minted: '0',
}

export const EXAMPLES = [
  {
    id: 'deploy-basic',
    op: 'deploy',
    title: 'Deploy a ticker',
    summary: 'One million units, each backed by 546 satoshis, capped at 100 units per mint.',
    payload: {
      p: 'dust-20',
      op: 'deploy',
      tick: 'dust',
      supply: '1000000',
      unit_sats: '546',
      max_sats: '546000000',
      lim_sats: '54600',
    },
    notes: 'max_sats is 1,000,000 × 546. lim_sats of 54,600 allows 100 units per mint.',
  },
  {
    id: 'deploy-unlimited',
    op: 'deploy',
    title: 'Deploy without a per-mint cap',
    summary: 'Omitting lim_sats means a single mint may take the entire supply.',
    payload: {
      p: 'dust-20',
      op: 'deploy',
      tick: 'grain',
      supply: '21000',
      unit_sats: '1000',
      max_sats: '21000000',
    },
    notes: 'Omitted and "0" both mean no per-mint limit. Use a cap if you want distribution over time.',
  },
  {
    id: 'mint-basic',
    op: 'mint',
    title: 'Mint at the cap',
    summary: '100 units backed by exactly 54,600 satoshis.',
    payload: { p: 'dust-20', op: 'mint', tick: 'dust', amt: '100', sats: '54600' },
    notes: 'The inscription must sit at offset 0 of an output holding exactly 54,600 satoshis.',
  },
  {
    id: 'mint-small',
    op: 'mint',
    title: 'Mint a single unit',
    summary: 'One unit backed by 546 satoshis.',
    payload: { p: 'dust-20', op: 'mint', tick: 'dust', amt: '1', sats: '546' },
    notes: 'The smallest valid mint for this deployment is one whole unit.',
  },
]

/**
 * Conformance vectors.
 *
 * expect: 'accept' | 'reject'
 * code:   the issue code the validator must emit for a rejection
 * context: deployment state and observed output value, where relevant
 */
export const VECTORS = [
  /* ---------- deploy: accepted ---------- */
  {
    id: 'deploy-valid',
    group: 'Deploy',
    title: 'Valid deploy',
    expect: 'accept',
    status: 'verified',
    payload: {
      p: 'dust-20',
      op: 'deploy',
      tick: 'dust',
      supply: '1000000',
      unit_sats: '546',
      max_sats: '546000000',
      lim_sats: '54600',
    },
    reason: 'Every field is a canonical integer string and max_sats equals supply × unit_sats.',
  },
  {
    id: 'deploy-no-limit',
    group: 'Deploy',
    title: 'Valid deploy with lim_sats omitted',
    expect: 'accept',
    status: 'verified',
    payload: {
      p: 'dust-20',
      op: 'deploy',
      tick: 'grain',
      supply: '21000',
      unit_sats: '1000',
      max_sats: '21000000',
    },
    reason: 'lim_sats is optional. Omitting it means there is no per-mint cap.',
  },
  {
    id: 'deploy-zero-limit',
    group: 'Deploy',
    title: 'lim_sats of "0" means no cap',
    expect: 'accept',
    status: 'universe',
    payload: {
      p: 'dust-20',
      op: 'deploy',
      tick: 'grain',
      supply: '21000',
      unit_sats: '1000',
      max_sats: '21000000',
      lim_sats: '0',
    },
    reason: 'Zero is explicitly "no limit", not a cap of zero satoshis.',
  },

  /* ---------- deploy: rejected ---------- */
  {
    id: 'deploy-arithmetic-mismatch',
    group: 'Deploy',
    title: 'Arithmetic mismatch in max_sats',
    expect: 'reject',
    code: 'max_sats_mismatch',
    status: 'verified',
    payload: {
      p: 'dust-20',
      op: 'deploy',
      tick: 'dust',
      supply: '1000000',
      unit_sats: '546',
      max_sats: '545999999',
      lim_sats: '54600',
    },
    reason:
      'max_sats must equal supply × unit_sats exactly. Being one satoshi low usually means the builder used floating-point arithmetic.',
  },
  {
    id: 'deploy-missing-max-sats',
    group: 'Deploy',
    title: 'Deploy missing max_sats',
    expect: 'reject',
    code: 'missing_field',
    status: 'universe',
    payload: {
      p: 'dust-20',
      op: 'deploy',
      tick: 'dust',
      supply: '1000000',
      unit_sats: '546',
      lim_sats: '54600',
    },
    reason:
      'max_sats is required. Earlier documentation reported this as an unreconciled compatibility split; the current implementation rejects the payload rather than deriving the value.',
  },
  {
    id: 'deploy-unknown-field',
    group: 'Deploy',
    title: 'Deploy carrying an unknown field',
    expect: 'reject',
    code: 'unknown_field',
    status: 'universe',
    payload: {
      p: 'dust-20',
      op: 'deploy',
      tick: 'dust',
      supply: '1000000',
      unit_sats: '546',
      max_sats: '546000000',
      dec: '0',
    },
    reason:
      'Operations declare exact key sets. An unknown field is rejected, not ignored, so one payload cannot be read two ways.',
  },
  {
    id: 'deploy-leading-zero',
    group: 'Deploy',
    title: 'Malformed integer with a leading zero',
    expect: 'reject',
    code: 'bad_integer',
    status: 'universe',
    payload: {
      p: 'dust-20',
      op: 'deploy',
      tick: 'dust',
      supply: '0546',
      unit_sats: '546',
      max_sats: '298116',
    },
    reason: 'Integers are canonical decimal strings. "0546" is not canonical even though it parses.',
  },
  {
    id: 'deploy-float',
    group: 'Deploy',
    title: 'Fractional unit_sats',
    expect: 'reject',
    code: 'bad_integer',
    status: 'verified',
    payload: {
      p: 'dust-20',
      op: 'deploy',
      tick: 'dust',
      supply: '1000',
      unit_sats: '546.5',
      max_sats: '546500',
    },
    reason: 'Satoshis are indivisible. Decimal points are rejected outright.',
  },
  {
    id: 'deploy-zero-supply',
    group: 'Deploy',
    title: 'Zero supply',
    expect: 'reject',
    code: 'bad_integer',
    status: 'verified',
    payload: {
      p: 'dust-20',
      op: 'deploy',
      tick: 'dust',
      supply: '0',
      unit_sats: '546',
      max_sats: '0',
    },
    reason: 'supply must be a positive integer. Zero and negative values are rejected.',
  },
  {
    id: 'deploy-negative',
    group: 'Deploy',
    title: 'Negative unit_sats',
    expect: 'reject',
    code: 'bad_integer',
    status: 'verified',
    payload: {
      p: 'dust-20',
      op: 'deploy',
      tick: 'dust',
      supply: '1000',
      unit_sats: '-546',
      max_sats: '546000',
    },
    reason: 'A minus sign is not part of a canonical DUST-20 integer.',
  },
  {
    id: 'deploy-exceeds-money',
    group: 'Deploy',
    title: 'Backing exceeds Bitcoin’s monetary supply',
    expect: 'reject',
    code: 'exceeds_money_supply',
    status: 'universe',
    payload: {
      p: 'dust-20',
      op: 'deploy',
      tick: 'huge',
      supply: '1000000000',
      unit_sats: '10000000',
      max_sats: '10000000000000000',
    },
    reason:
      'max_sats of 10,000,000,000,000,000 exceeds the 2,100,000,000,000,000 satoshis that will ever exist. The arithmetic is self-consistent but unbackable.',
  },
  {
    id: 'deploy-limit-above-max',
    group: 'Deploy',
    title: 'lim_sats greater than max_sats',
    expect: 'reject',
    code: 'lim_sats_above_max',
    status: 'universe',
    payload: {
      p: 'dust-20',
      op: 'deploy',
      tick: 'dust',
      supply: '1000',
      unit_sats: '546',
      max_sats: '546000',
      lim_sats: '546001',
    },
    reason: 'A per-mint cap larger than the entire backing is contradictory.',
  },
  {
    id: 'deploy-tick-whitespace',
    group: 'Deploy',
    title: 'Ticker containing whitespace',
    expect: 'reject',
    code: 'bad_tick',
    status: 'universe',
    payload: {
      p: 'dust-20',
      op: 'deploy',
      tick: 'my dust',
      supply: '1000',
      unit_sats: '546',
      max_sats: '546000',
    },
    reason:
      'Tickers exclude whitespace, control characters and the URL delimiters / ? # \\ so an identity is always addressable.',
  },
  {
    id: 'deploy-duplicate-ticker',
    group: 'Deploy',
    title: 'Redeploying an existing ticker',
    expect: 'reject',
    code: 'duplicate_deployment',
    status: 'universe',
    context: { deployment: REFERENCE_DEPLOYMENT },
    payload: {
      p: 'dust-20',
      op: 'deploy',
      tick: 'DUST',
      supply: '5000',
      unit_sats: '546',
      max_sats: '2730000',
    },
    reason:
      'Identity is the NFC form folded to lower case, so "DUST" is the same ticker as "dust". The first valid deployment wins.',
  },

  /* ---------- mint: accepted ---------- */
  {
    id: 'mint-valid',
    group: 'Mint',
    title: 'Valid mint with matching output',
    expect: 'accept',
    status: 'verified',
    context: { deployment: REFERENCE_DEPLOYMENT, outputValueSats: '54600' },
    payload: { p: 'dust-20', op: 'mint', tick: 'dust', amt: '100', sats: '54600' },
    reason: 'sats equals amt × unit_sats, and the observed output value equals sats.',
  },
  {
    id: 'mint-case-insensitive-tick',
    group: 'Mint',
    title: 'Mint naming the ticker in a different case',
    expect: 'accept',
    status: 'universe',
    context: { deployment: REFERENCE_DEPLOYMENT, outputValueSats: '546' },
    payload: { p: 'dust-20', op: 'mint', tick: 'DuSt', amt: '1', sats: '546' },
    reason: 'The mint resolves against the folded identity, so casing does not prevent resolution.',
  },

  /* ---------- mint: rejected ---------- */
  {
    id: 'mint-sats-mismatch',
    group: 'Mint',
    title: 'Declared sats do not match the deployment ratio',
    expect: 'reject',
    code: 'mint_sats_mismatch',
    status: 'verified',
    context: { deployment: REFERENCE_DEPLOYMENT, outputValueSats: '54000' },
    payload: { p: 'dust-20', op: 'mint', tick: 'dust', amt: '100', sats: '54000' },
    reason: '100 units at 546 satoshis is 54,600, not 54,000.',
  },
  {
    id: 'mint-output-mismatch',
    group: 'Mint',
    title: 'Output value differs from declared sats by one satoshi',
    expect: 'reject',
    code: 'output_value_mismatch',
    status: 'verified',
    context: { deployment: REFERENCE_DEPLOYMENT, outputValueSats: '54599' },
    payload: { p: 'dust-20', op: 'mint', tick: 'dust', amt: '100', sats: '54600' },
    reason:
      'The payload is internally consistent, but the real Bitcoin output holds 54,599 satoshis. The mint is invalid and cannot be repaired after broadcast.',
  },
  {
    id: 'mint-limit-violation',
    group: 'Mint',
    title: 'Mint exceeds lim_sats',
    expect: 'reject',
    code: 'mint_exceeds_limit',
    status: 'verified',
    context: { deployment: REFERENCE_DEPLOYMENT, outputValueSats: '55146' },
    payload: { p: 'dust-20', op: 'mint', tick: 'dust', amt: '101', sats: '55146' },
    reason: '55,146 satoshis exceeds the declared per-mint cap of 54,600.',
  },
  {
    id: 'mint-exceeds-supply',
    group: 'Mint',
    title: 'Mint exceeds remaining supply',
    expect: 'reject',
    code: 'mint_exceeds_supply',
    status: 'verified',
    context: {
      deployment: { ...REFERENCE_DEPLOYMENT, limSats: '0', minted: '999950' },
      outputValueSats: '54600',
    },
    payload: { p: 'dust-20', op: 'mint', tick: 'dust', amt: '100', sats: '54600' },
    reason:
      '999,950 units are already minted, so only 50 remain. The mint is rejected in full rather than partially filled.',
  },
  {
    id: 'mint-no-deployment',
    group: 'Mint',
    title: 'Mint for a ticker that was never deployed',
    expect: 'reject',
    code: 'deployment_missing',
    status: 'verified',
    payload: { p: 'dust-20', op: 'mint', tick: 'ghost', amt: '10', sats: '5460' },
    reason:
      'A mint must resolve exactly one accepted deployment. Without it there is no unit size to check against.',
  },
  {
    id: 'mint-missing-field',
    group: 'Mint',
    title: 'Mint missing the sats field',
    expect: 'reject',
    code: 'missing_field',
    status: 'verified',
    context: { deployment: REFERENCE_DEPLOYMENT },
    payload: { p: 'dust-20', op: 'mint', tick: 'dust', amt: '100' },
    reason: 'sats is required. It is never inferred from amt, even though the ratio is known.',
  },
  {
    id: 'mint-zero-amount',
    group: 'Mint',
    title: 'Mint of zero units',
    expect: 'reject',
    code: 'bad_integer',
    status: 'verified',
    context: { deployment: REFERENCE_DEPLOYMENT },
    payload: { p: 'dust-20', op: 'mint', tick: 'dust', amt: '0', sats: '0' },
    reason: 'amt must be a positive integer.',
  },

  /* ---------- reader / shape ---------- */
  {
    id: 'unknown-operation',
    group: 'Reader',
    title: 'Unknown operation',
    expect: 'reject',
    code: 'bad_operation',
    status: 'universe',
    payload: { p: 'dust-20', op: 'update', tick: 'dust', amt: '1' },
    reason: 'Only deploy and mint exist. Any other op is rejected.',
  },
  {
    id: 'transfer-inscription',
    group: 'Reader',
    title: 'A transfer inscription',
    expect: 'reject',
    code: 'bad_operation',
    status: 'universe',
    payload: { p: 'dust-20', op: 'transfer', tick: 'dust', amt: '10' },
    reason:
      'No transfer inscription is valid. Movement happens by spending the satoshis that carry the units. Earlier documentation listed a canonical transfer payload as an open question; the current implementation answers it by accepting none.',
  },
  {
    id: 'wrong-protocol',
    group: 'Reader',
    title: 'A different protocol identifier',
    expect: 'reject',
    code: 'bad_protocol',
    status: 'verified',
    payload: { p: 'brc-20', op: 'deploy', tick: 'dust', max: '1000', lim: '10' },
    reason: 'Content whose p is not dust-20 is not a DUST-20 message.',
  },
  {
    id: 'non-string-value',
    group: 'Reader',
    title: 'A numeric JSON value',
    expect: 'reject',
    code: 'not_flat_strings',
    status: 'universe',
    raw: '{"p":"dust-20","op":"mint","tick":"dust","amt":100,"sats":"54600"}',
    reason:
      'Every value must be a JSON string. A bare number is rejected because JSON numbers cannot carry large integers exactly.',
  },
  {
    id: 'duplicate-key',
    group: 'Reader',
    title: 'A repeated field',
    expect: 'reject',
    code: 'duplicate_key',
    status: 'universe',
    raw: '{"p":"dust-20","op":"mint","tick":"dust","amt":"100","amt":"1","sats":"54600"}',
    reason:
      'A duplicate key is rejected rather than resolved last-wins, because two readers would otherwise disagree about the amount.',
  },
  {
    id: 'trailing-content',
    group: 'Reader',
    title: 'Trailing content after the object',
    expect: 'reject',
    code: 'trailing_content',
    status: 'universe',
    raw: '{"p":"dust-20","op":"mint","tick":"dust","amt":"1","sats":"546"} extra',
    reason: 'Content after the closing brace makes the message ambiguous and is rejected.',
  },
  {
    id: 'nested-object',
    group: 'Reader',
    title: 'A nested object',
    expect: 'reject',
    code: 'not_flat_strings',
    status: 'universe',
    raw: '{"p":"dust-20","op":"deploy","tick":"dust","meta":{"x":"1"}}',
    reason: 'A payload is a flat object of strings. Nesting is rejected.',
  },
  {
    id: 'not-json',
    group: 'Reader',
    title: 'Content that is not a JSON object',
    expect: 'reject',
    code: 'not_object',
    status: 'universe',
    raw: 'dust-20 deploy dust 1000',
    reason: 'Inscription content must parse as a single JSON object.',
  },
]

/* ------------------------------------------------------------------ *
 * Transaction scenarios rendered by the visualizer
 * ------------------------------------------------------------------ */

export const SCENARIOS = [
  {
    id: 'partial-send',
    title: 'Partial send with colored change',
    summary: 'Send 10 of 91 units and keep the rest. The canonical safe construction.',
    unitSats: '546',
    tick: 'dust',
    inputs: [
      { kind: 'colored', units: '91', valueSats: '49686', label: 'Your DUST allocation' },
      { kind: 'cardinal', valueSats: '20000', label: 'Ordinary bitcoin for the fee' },
    ],
    outputs: [
      { kind: 'colored', units: '10', label: 'Receiver' },
      { kind: 'colored', units: '81', label: 'Your DUST change' },
      { kind: 'cardinal', valueSats: '18000', label: 'Ordinary bitcoin change' },
    ],
    expect: 'safe',
  },
  {
    id: 'full-send',
    title: 'Send the whole allocation',
    summary: 'Nothing remains, so no colored change output is needed.',
    unitSats: '546',
    tick: 'dust',
    inputs: [
      { kind: 'colored', units: '91', valueSats: '49686', label: 'Your DUST allocation' },
      { kind: 'cardinal', valueSats: '20000', label: 'Ordinary bitcoin for the fee' },
    ],
    outputs: [
      { kind: 'colored', units: '91', label: 'Receiver' },
      { kind: 'cardinal', valueSats: '18000', label: 'Ordinary bitcoin change' },
    ],
    expect: 'safe',
  },
  {
    id: 'missing-change',
    title: 'Missing colored change burns the remainder',
    summary: 'Only the receiver output is colored, so the other 81 units are destroyed.',
    unitSats: '546',
    tick: 'dust',
    inputs: [
      { kind: 'colored', units: '91', valueSats: '49686', label: 'Your DUST allocation' },
      { kind: 'cardinal', valueSats: '20000', label: 'Ordinary bitcoin for the fee' },
    ],
    outputs: [
      { kind: 'colored', units: '10', label: 'Receiver' },
      { kind: 'cardinal', valueSats: '18000', label: 'Ordinary bitcoin change' },
    ],
    expect: 'burn',
  },
  {
    id: 'fee-from-backing',
    title: 'Paying the fee out of colored backing',
    summary: 'No cardinal input, so the fee eats into the colored range and burns units.',
    unitSats: '546',
    tick: 'dust',
    inputs: [{ kind: 'colored', units: '91', valueSats: '49686', label: 'Your DUST allocation' }],
    outputs: [
      { kind: 'colored', units: '10', label: 'Receiver' },
      { kind: 'colored', units: '78', label: 'Your DUST change (short)' },
    ],
    expect: 'burn',
  },
  {
    id: 'merge',
    title: 'Merging two allocations',
    summary: 'Two colored inputs of the same ticker combine into one output.',
    unitSats: '546',
    tick: 'dust',
    inputs: [
      { kind: 'colored', units: '30', valueSats: '16380', label: 'Allocation A' },
      { kind: 'colored', units: '61', valueSats: '33306', label: 'Allocation B' },
      { kind: 'cardinal', valueSats: '20000', label: 'Ordinary bitcoin for the fee' },
    ],
    outputs: [
      { kind: 'colored', units: '91', label: 'Merged allocation' },
      { kind: 'cardinal', valueSats: '18000', label: 'Ordinary bitcoin change' },
    ],
    expect: 'safe',
  },
]

/* ------------------------------------------------------------------ *
 * Glossary and FAQ
 * ------------------------------------------------------------------ */

export const GLOSSARY = [
  {
    term: 'Satoshi',
    definition:
      'The smallest unit of Bitcoin — one hundred-millionth of a bitcoin. Satoshis are indivisible, which is why every DUST-20 amount is a whole number.',
  },
  {
    term: 'Dust',
    definition:
      'A Bitcoin output so small that nodes will not relay it, because spending it would cost more in fees than it is worth. The usual threshold for a common output type is 546 satoshis, which is why that number appears throughout DUST-20 examples.',
  },
  {
    term: 'UTXO',
    definition:
      'An unspent transaction output — a discrete piece of bitcoin with an amount and an owner. Bitcoin has no account balances; a wallet balance is the sum of its UTXOs.',
  },
  {
    term: 'Outpoint',
    definition:
      'The address of a specific output, written as a transaction id and an output index, such as txid:0. It is how an allocation is identified.',
  },
  {
    term: 'Colored output',
    definition:
      'An output whose satoshis an indexer interprets as carrying token units. Bitcoin itself sees an ordinary output; the colour exists only in the interpretation.',
  },
  {
    term: 'Cardinal input',
    definition:
      'An ordinary bitcoin input carrying no token allocation. Cardinal inputs are what you use to pay miner fees without disturbing colored satoshis.',
  },
  {
    term: 'Backing',
    definition:
      'The satoshis that stand behind a quantity of units, equal to units × unit_sats. Backing is not a price — it is the physical space the units occupy in a transaction.',
  },
  {
    term: 'unit_sats',
    definition:
      'The number of satoshis that back one unit, fixed at deploy time and unchangeable afterwards. Every later calculation depends on it.',
  },
  {
    term: 'Deploy',
    definition:
      'The inscription that creates a ticker and fixes its supply and satoshi backing rule.',
  },
  {
    term: 'Mint',
    definition:
      'The inscription that creates units, in an output whose value equals the declared satoshi backing exactly.',
  },
  {
    term: 'Colored change',
    definition:
      'The output that receives the units you did not send. Omitting it does not keep those units — it burns them.',
  },
  {
    term: 'Allocation',
    definition:
      'An indexer’s record that a specific span of satoshis inside a specific output represents a number of units of a ticker.',
  },
  {
    term: 'Offset',
    definition:
      'Where an allocation begins inside its output, measured in satoshis from the start of that output. Without the offset, the next spend cannot be computed.',
  },
  {
    term: 'Ordinal flow',
    definition:
      'The first-in-first-out rule that decides which satoshis in the outputs correspond to which satoshis in the inputs. DUST-20 uses it to follow units through a spend.',
  },
  {
    term: 'Burn',
    definition:
      'The destruction of units, caused by their satoshis being paid as fees, sent somewhere unattributable, or split so that no whole unit fits in an output. There is no burn message.',
  },
  {
    term: 'Mempool',
    definition:
      'The waiting area for broadcast but unconfirmed transactions. DUST-20 mempool coverage is partial, so unconfirmed state is not a safe basis for an irreversible decision.',
  },
  {
    term: 'RBF',
    definition:
      'Replace-by-fee — resubmitting a transaction with a higher fee. Because the replacement can have a different output layout, it can burn units the original would have preserved.',
  },
  {
    term: 'Reorg',
    definition:
      'A chain reorganization, where confirmed blocks are replaced by a different branch. An indexer must roll allocations back and replay the new branch.',
  },
  {
    term: 'PSBT',
    definition:
      'A partially signed Bitcoin transaction — the unsigned transaction your wallet shows you before you approve it. It is your last chance to check every output role.',
  },
]

export const FAQ = [
  {
    q: 'Do I need 546 satoshis per unit?',
    a: 'No. 546 is the most common example because it matches Bitcoin’s usual dust threshold, but unit_sats is whatever the deploy declares. Never assume 546 when a payload omits the field — omitting it makes the deploy invalid.',
  },
  {
    q: 'Why is there no transfer inscription?',
    a: 'Because the satoshis themselves carry the units. Spending them moves the units, so a separate message would be redundant and could disagree with the transaction that actually happened. The current implementation rejects any op: "transfer" inscription.',
  },
  {
    q: 'What happens if I forget the colored change output?',
    a: 'The units you meant to keep are burned. Bitcoin will confirm the transaction normally — nothing warns you. This is the single most expensive mistake in DUST-20.',
  },
  {
    q: 'Can I pay the miner fee from my token backing?',
    a: 'No. Satoshis that go to the fee are gone, and any units they carried are burned. Always add a separate ordinary bitcoin input to fund the fee.',
  },
  {
    q: 'Are DUST-20 amounts divisible?',
    a: 'No. Balances have zero decimal places, and a unit only survives a spend if its whole block of unit_sats satoshis lands inside one output.',
  },
  {
    q: 'What if two people deploy the same ticker?',
    a: 'The first valid deployment wins. Tickers are compared after Unicode NFC normalization and lower-case folding, so "DUST" and "dust" are the same ticker.',
  },
  {
    q: 'Is a balance from an indexer authoritative?',
    a: 'It is one service’s interpretation of Bitcoin, not consensus. Check its source, coverage and observation height, and treat disagreement between two indexers as a blocking error rather than a choice.',
  },
  {
    q: 'Is this documentation a specification?',
    a: 'No. It documents the legacy DUST-20 specification and the behaviour of the Bitcoin Universe production indexer, labelling every statement with which of the two supports it. Where they disagree or nothing settles a question, that is stated rather than resolved by guesswork.',
  },
]
