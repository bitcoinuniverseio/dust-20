/**
 * DUST-20 documentation — site manifest.
 *
 * One list of pages and sections drives the navigation, the table of
 * contents, full-site search, the sitemap, llms.txt and the link checker.
 * A page that is not listed here does not exist as far as the site is
 * concerned, so a stale link cannot survive a rename.
 *
 * `path` values are relative so the site works from the /dust-20/ base path
 * on GitHub Pages, from a local preview server, and from a file:// checkout.
 */

export const ORIGIN = 'https://bitcoinuniverseio.github.io/dust-20/'

export const AUDIENCES = [
  {
    id: 'understand',
    label: 'I just want to understand DUST-20',
    href: 'how-it-works.html',
    blurb: 'Start with the lifecycle: what a deploy fixes, what a mint creates, and why satoshis matter.',
  },
  {
    id: 'create',
    label: 'I want to create a token',
    href: 'playground.html#deploy',
    blurb: 'Build a deploy in the playground, watch the arithmetic derive itself, then mint against it.',
  },
  {
    id: 'build',
    label: 'I want to build DUST-20 support',
    href: 'indexer.html',
    blurb: 'Discovery, resolution, allocation records, reorgs and the API expectations an integration needs.',
  },
  {
    id: 'reference',
    label: 'I want the technical reference',
    href: 'reference.html',
    blurb: 'Every field, type, constraint, validation rule and provenance label, searchable.',
  },
]

export const PAGES = [
  {
    path: './',
    file: 'index.html',
    nav: 'Start here',
    title: 'DUST-20 | Tokens with Bitcoin at their core',
    heading: 'Tokens with Bitcoin at their core.',
    description:
      'DUST-20 binds every token unit to an exact number of satoshis. Start here to understand deploy, mint, transfer and the UTXOs that carry them.',
    priority: '1.0',
    sections: [
      { id: 'what', label: 'What is DUST-20?' },
      { id: 'satoshis', label: 'Why satoshis matter' },
      { id: 'utxo', label: 'What is a DUST-20 UTXO?' },
      { id: 'operations', label: 'Deploy, mint and transfer' },
      { id: 'paths', label: 'Where to go next' },
    ],
  },
  {
    path: 'how-it-works.html',
    file: 'how-it-works.html',
    nav: 'How it works',
    title: 'How DUST-20 works | DUST-20',
    heading: 'How DUST-20 works',
    description:
      'The DUST-20 lifecycle from deploy through mint, hold, split, transfer, change and indexing, with the satoshi arithmetic made visible at every step.',
    priority: '0.9',
    sections: [
      { id: 'lifecycle', label: 'The lifecycle' },
      { id: 'anatomy', label: 'Anatomy of a DUST-20 UTXO' },
      { id: 'arithmetic', label: 'The arithmetic' },
      { id: 'two-kinds', label: 'Two kinds of satoshi' },
      { id: 'flow', label: 'How units follow satoshis' },
    ],
  },
  {
    path: 'playground.html',
    file: 'playground.html',
    nav: 'Playground',
    title: 'DUST-20 playground | DUST-20',
    heading: 'Protocol playground',
    description:
      'Build and validate DUST-20 deploy and mint payloads in your browser with exact integer arithmetic. No wallet, no keys, no signing.',
    priority: '0.9',
    sections: [
      { id: 'deploy', label: 'Deploy builder' },
      { id: 'mint', label: 'Mint builder' },
      { id: 'inspector', label: 'Payload inspector' },
    ],
  },
  {
    path: 'transactions.html',
    file: 'transactions.html',
    nav: 'Transactions',
    title: 'DUST-20 transactions | DUST-20',
    heading: 'Transactions and the UTXO visualizer',
    description:
      'Visualize how DUST-20 units follow satoshis through a Bitcoin spend: partial sends, colored change, merges, fee separation and the constructions that burn units.',
    priority: '0.9',
    sections: [
      { id: 'rule', label: 'The rule that matters' },
      { id: 'visualizer', label: 'Transaction visualizer' },
      { id: 'scenarios', label: 'Worked scenarios' },
      { id: 'cases', label: 'Cases and failure modes' },
    ],
  },
  {
    path: 'reference.html',
    file: 'reference.html',
    nav: 'Reference',
    title: 'DUST-20 protocol reference | DUST-20',
    heading: 'Protocol reference',
    description:
      'Complete searchable DUST-20 field reference: types, constraints, examples, validation rules, provenance and compatibility notes for every field of every operation.',
    priority: '0.9',
    sections: [
      { id: 'operations', label: 'Operations' },
      { id: 'fields', label: 'Field ledger' },
      { id: 'formulas', label: 'Formulas' },
      { id: 'rules', label: 'Rules' },
      { id: 'reconciliation', label: 'Where sources disagree' },
      { id: 'open', label: 'Open questions' },
    ],
  },
  {
    path: 'conformance.html',
    file: 'conformance.html',
    nav: 'Conformance',
    title: 'DUST-20 conformance laboratory | DUST-20',
    heading: 'Conformance laboratory',
    description:
      'Valid and invalid DUST-20 examples, each executed live in your browser, showing exactly why it passes or fails. Load any case into the playground.',
    priority: '0.8',
    sections: [
      { id: 'lab', label: 'Test cases' },
      { id: 'codes', label: 'Issue codes' },
    ],
  },
  {
    path: 'indexer.html',
    file: 'indexer.html',
    nav: 'For builders',
    title: 'DUST-20 for indexer and app builders | DUST-20',
    heading: 'Indexer and builder guide',
    description:
      'Implementation guidance for DUST-20: discovery, deployment resolution, mint validation, allocation records, spent and mempool state, reorgs, RBF and API expectations.',
    priority: '0.8',
    sections: [
      { id: 'pipeline', label: 'The pipeline' },
      { id: 'allocation', label: 'The allocation record' },
      { id: 'propagation', label: 'Propagation algorithm' },
      { id: 'chain-state', label: 'Chain instability' },
      { id: 'api', label: 'API expectations' },
    ],
  },
  {
    path: 'safety.html',
    file: 'safety.html',
    nav: 'Safety',
    title: 'DUST-20 safety | DUST-20',
    heading: 'Staying safe with DUST-20',
    description:
      'What to check before you sign a DUST-20 transaction: keys, output roles, colored change, fee funding, stale UTXOs, indexer disagreement and retries.',
    priority: '0.8',
    sections: [
      { id: 'secrets', label: 'Never share secrets' },
      { id: 'review', label: 'Before you approve' },
      { id: 'checks', label: 'The full checklist' },
      { id: 'builders', label: 'For builders' },
    ],
  },
  {
    path: 'glossary.html',
    file: 'glossary.html',
    nav: 'Glossary',
    title: 'DUST-20 glossary and FAQ | DUST-20',
    heading: 'Glossary and FAQ',
    description:
      'Plain definitions of satoshi, dust, UTXO, colored output, cardinal input, backing, outpoint, mempool, RBF, reorg and every other DUST-20 term, plus common questions.',
    priority: '0.7',
    sections: [
      { id: 'glossary', label: 'Glossary' },
      { id: 'faq', label: 'Frequently asked questions' },
    ],
  },
]

/** Pages that exist but are not part of the documentation navigation. */
export const EXTRA_FILES = ['404.html', 'llms.txt', 'docs.json', 'conformance.json', 'robots.txt', 'sitemap.xml']

export function pageByFile(file) {
  return PAGES.find((page) => page.file === file)
}

/** Absolute canonical URL for a page, used for SEO metadata and the sitemap. */
export function canonical(page) {
  return page.path === './' ? ORIGIN : `${ORIGIN}${page.path}`
}
