/**
 * DUST-20 documentation site manifest.
 *
 * One list of pages and sections drives the navigation, the table of
 * contents, the search index, the sitemap, llms.txt and the link checker.
 * A page that is not listed here does not exist as far as the site is
 * concerned, so a stale link cannot survive a rename.
 *
 * `path` values are relative so the site works from the /dust-20/ base path
 * on GitHub Pages, from a local preview server, and from a file:// checkout.
 */

export const ORIGIN = 'https://bitcoinuniverseio.github.io/dust-20/'

export const GROUPS = [
  { id: 'start', label: '0 Orientation' },
  { id: 'normative', label: '1 Normative' },
  { id: 'applied', label: '2 Applied' },
  { id: 'operate', label: '3 Operating' },
  { id: 'appendix', label: '4 Appendix' },
]

export const PAGES = [
  {
    path: './',
    file: 'index.html',
    group: 'start',
    nav: 'Overview',
    title: 'DUST-20 | Satoshi-backed tokens on Bitcoin',
    heading: 'DUST-20',
    tagline: 'A token unit is an exact number of satoshis.',
    description:
      'DUST-20 binds every token unit to an exact number of satoshis. Deploy and mint are inscriptions, movement is an ordinary Bitcoin spend. Specification, decoder, test vectors and Bitcoin Universe availability.',
    priority: '1.0',
    sections: [
      { id: 'summary', label: 'What DUST-20 is' },
      { id: 'availability', label: 'Availability in Bitcoin Universe' },
      { id: 'shape', label: 'The shape of the protocol' },
      { id: 'audience', label: 'Who this is for' },
      { id: 'entry', label: 'Entry points' },
    ],
  },
  {
    path: 'specification.html',
    file: 'specification.html',
    group: 'normative',
    nav: 'Specification',
    title: 'DUST-20 specification | DUST-20',
    heading: 'Normative specification',
    tagline: 'Numbered rules, encoding, identifiers, operations and state transitions.',
    description:
      'The normative DUST-20 specification: numbered rules DUST-2.1 to DUST-9.8 covering carrier, integer encoding, identifiers, deploy, mint, allocation, burn and indexer semantics.',
    priority: '0.95',
    sections: [
      { id: 'scope', label: '1 Scope and conventions' },
      { id: 'carrier', label: '2 Message carrier' },
      { id: 'integers', label: '3 Integer encoding' },
      { id: 'identifiers', label: '4 Identifiers' },
      { id: 'deploy', label: '5 Deploy' },
      { id: 'mint', label: '6 Mint' },
      { id: 'allocation', label: '7 Allocation and movement' },
      { id: 'burn', label: '8 Burn' },
      { id: 'indexing', label: '9 Indexer semantics' },
      { id: 'anatomy', label: '10 Transaction anatomy' },
      { id: 'transitions', label: '11 State transitions' },
      { id: 'invalidity', label: '12 Invalidity conditions' },
    ],
  },
  {
    path: 'reference.html',
    file: 'reference.html',
    group: 'normative',
    nav: 'Reference',
    title: 'DUST-20 field and rule reference | DUST-20',
    heading: 'Reference',
    tagline: 'Field ledger, formulas, fee and size, limitations, checklist.',
    description:
      'Complete DUST-20 reference: every field with type, byte length, constraint and provenance, the formula set, fee and size considerations, limitations and a five-part implementation checklist.',
    priority: '0.9',
    sections: [
      { id: 'operations', label: 'Operations' },
      { id: 'fields', label: 'Field ledger' },
      { id: 'formulas', label: 'Formulas' },
      { id: 'fees', label: 'Fee and size' },
      { id: 'limitations', label: 'Limitations' },
      { id: 'checklist', label: 'Implementation checklist' },
      { id: 'reconciliation', label: 'Where sources disagree' },
      { id: 'open', label: 'Open questions' },
    ],
  },
  {
    path: 'how-it-works.html',
    file: 'how-it-works.html',
    group: 'applied',
    nav: 'Guide',
    title: 'How DUST-20 works | DUST-20',
    heading: 'Guide',
    tagline: 'The lifecycle in plain language, with the arithmetic shown.',
    description:
      'A plain-language walkthrough of DUST-20: what a deploy fixes, what a mint creates, how units follow satoshis through a spend, worked examples, and which Bitcoin Universe surfaces support it.',
    priority: '0.9',
    sections: [
      { id: 'lifecycle', label: 'The lifecycle' },
      { id: 'deploy', label: 'Reading a deploy' },
      { id: 'mint', label: 'Reading a mint' },
      { id: 'worked', label: 'Worked transactions' },
      { id: 'support', label: 'Support matrix' },
    ],
  },
  {
    path: 'transactions.html',
    file: 'transactions.html',
    group: 'applied',
    nav: 'Transactions',
    tool: true,
    title: 'DUST-20 transactions and sat flow | DUST-20',
    heading: 'Transactions',
    tagline: 'Ordinal sat flow, colored change, merges and the constructions that burn.',
    description:
      'How DUST-20 units follow satoshis through a Bitcoin spend: the ordinal first-in-first-out mapping, partial sends, colored change, merges, fee separation, and an interactive allocation simulator.',
    priority: '0.9',
    sections: [
      { id: 'mapping', label: 'The mapping' },
      { id: 'anatomy', label: 'Transaction anatomy' },
      { id: 'simulator', label: 'Allocation simulator' },
      { id: 'scenarios', label: 'Worked scenarios' },
    ],
  },
  {
    path: 'playground.html',
    file: 'playground.html',
    group: 'applied',
    nav: 'Decoder',
    tool: true,
    title: 'DUST-20 decoder and conformance runner | DUST-20',
    heading: 'Decoder and conformance runner',
    tagline: 'Paste a payload. Every rule is checked in your browser.',
    description:
      'Decode a DUST-20 payload field by field, validate it against the numbered specification rules with exact integer arithmetic, and run the published test vectors. Runs entirely in your browser.',
    priority: '0.9',
    sections: [
      { id: 'decoder', label: 'Payload decoder' },
      { id: 'builder', label: 'Deploy and mint builders' },
      { id: 'runner', label: 'Conformance runner' },
    ],
  },
  {
    path: 'conformance.html',
    file: 'conformance.html',
    group: 'applied',
    nav: 'Test vectors',
    title: 'DUST-20 test vectors | DUST-20',
    heading: 'Test vectors',
    tagline: 'Valid and invalid cases with expected outcomes and the rule each one exercises.',
    description:
      'The published DUST-20 conformance vectors: valid and invalid payloads, the expected outcome of each, the issue code a reader must emit, and the numbered rule the case exercises.',
    priority: '0.85',
    sections: [
      { id: 'summary', label: 'Vector summary' },
      { id: 'vectors', label: 'The vectors' },
      { id: 'scenarios', label: 'Transaction scenarios' },
      { id: 'codes', label: 'Issue codes' },
    ],
  },
  {
    path: 'indexer.html',
    file: 'indexer.html',
    group: 'operate',
    nav: 'Indexing',
    title: 'DUST-20 indexer semantics | DUST-20',
    heading: 'Indexer semantics',
    tagline: 'Confirmation, mempool, reorganizations and what a reader must publish.',
    description:
      'Implementing a DUST-20 reader: the six-stage pipeline, the allocation record, confirmation and pending state, mempool coverage, reorganization handling and the event contract.',
    priority: '0.85',
    sections: [
      { id: 'pipeline', label: 'The pipeline' },
      { id: 'allocation', label: 'The allocation record' },
      { id: 'confirmation', label: 'Confirmation and pending' },
      { id: 'reorg', label: 'Reorganizations' },
      { id: 'contract', label: 'Event contract' },
    ],
  },
  {
    path: 'universe.html',
    file: 'universe.html',
    group: 'operate',
    nav: 'Universe support',
    title: 'DUST-20 in Bitcoin Universe | DUST-20',
    heading: 'Bitcoin Universe support',
    tagline: 'You can view DUST-20. You cannot trade it. Here is exactly why.',
    description:
      'The recorded Bitcoin Universe capability state for DUST-20: read-only marketplace availability, the exact mutation gate, ownership and settlement statements, the first-party read path, and what would change it.',
    priority: '0.85',
    sections: [
      { id: 'state', label: 'Recorded state' },
      { id: 'actions', label: 'Marketplace actions' },
      { id: 'surfaces', label: 'Product surfaces' },
      { id: 'why', label: 'Why it is read-only' },
    ],
  },
  {
    path: 'safety.html',
    file: 'safety.html',
    group: 'operate',
    nav: 'Security',
    title: 'DUST-20 security considerations | DUST-20',
    heading: 'Security considerations',
    tagline: 'What destroys a balance, and what stops it.',
    description:
      'DUST-20 security considerations for holders and builders: key hygiene, output role review, colored change, fee funding, stale outpoints, reader disagreement, untyped ownership answers and reorganizations.',
    priority: '0.85',
    sections: [
      { id: 'model', label: 'Threat model' },
      { id: 'controls', label: 'Controls' },
      { id: 'before', label: 'Before you sign' },
      { id: 'report', label: 'Reporting a vulnerability' },
    ],
  },
  {
    path: 'glossary.html',
    file: 'glossary.html',
    group: 'appendix',
    nav: 'Glossary',
    title: 'DUST-20 glossary and FAQ | DUST-20',
    heading: 'Glossary and FAQ',
    tagline: 'Terminology, and the questions people actually ask.',
    description:
      'Plain definitions of satoshi, dust, UTXO, colored output, cardinal input, backing, outpoint, allocation, offset, ordinal flow, burn, mempool, RBF, reorg and PSBT, plus common DUST-20 questions.',
    priority: '0.7',
    sections: [
      { id: 'glossary', label: 'Glossary' },
      { id: 'faq', label: 'Frequently asked questions' },
    ],
  },
  {
    path: 'changelog.html',
    file: 'changelog.html',
    group: 'appendix',
    nav: 'Changelog',
    title: 'DUST-20 document changelog | DUST-20',
    heading: 'Changelog',
    tagline: 'What changed in this document, and when.',
    description:
      'Version history for the DUST-20 specification document: what was added, what was resolved, and which statements changed provenance label.',
    priority: '0.6',
    sections: [{ id: 'history', label: 'Version history' }],
  },
]

/** Pages that exist but are not part of the documentation navigation. */
export const EXTRA_FILES = [
  '404.html',
  'llms.txt',
  'docs.json',
  'conformance.json',
  'search-index.json',
  'docs.manifest.json',
  'robots.txt',
  'sitemap.xml',
]

export function pageByFile(file) {
  return PAGES.find((page) => page.file === file)
}

/** Absolute URL for a page, used for SEO metadata, llms.txt and the sitemap. */
export function pageUrl(page) {
  return page.path === './' ? ORIGIN : `${ORIGIN}${page.path}`
}

export function pagesInGroup(id) {
  return PAGES.filter((page) => page.group === id)
}
