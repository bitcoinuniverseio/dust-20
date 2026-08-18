# DUST-20

**Tokens with Bitcoin at their core.**

DUST-20 binds every token unit to an exact number of satoshis. Deploy and mint are inscriptions; every later movement is an ordinary Bitcoin spend of the satoshis that carry the units.

This repository is the DUST-20 interactive documentation and protocol laboratory.

**Live site: <https://bitcoinuniverseio.github.io/dust-20/>**

## Documentation

| Page | What it covers |
| --- | --- |
| [Start here](https://bitcoinuniverseio.github.io/dust-20/) | What DUST-20 is, why satoshis matter, and what a DUST-20 UTXO actually is. |
| [How it works](https://bitcoinuniverseio.github.io/dust-20/how-it-works.html) | The lifecycle from deploy through mint, hold, split, change and indexing. |
| [Playground](https://bitcoinuniverseio.github.io/dust-20/playground.html) | Deploy builder, mint builder and payload inspector, with exact integer arithmetic. |
| [Transactions](https://bitcoinuniverseio.github.io/dust-20/transactions.html) | Interactive UTXO visualizer, worked scenarios, and the constructions that burn units. |
| [Reference](https://bitcoinuniverseio.github.io/dust-20/reference.html) | Searchable field ledger, formulas, rules, and where sources disagree. |
| [Conformance](https://bitcoinuniverseio.github.io/dust-20/conformance.html) | Valid and invalid cases, executed live in the browser. |
| [For builders](https://bitcoinuniverseio.github.io/dust-20/indexer.html) | Indexing pipeline, allocation records, reorgs, and API expectations. |
| [Safety](https://bitcoinuniverseio.github.io/dust-20/safety.html) | What to check before approving a DUST-20 transaction. |
| [Glossary and FAQ](https://bitcoinuniverseio.github.io/dust-20/glossary.html) | Plain definitions and common questions. |

Machine readable: [`llms.txt`](https://bitcoinuniverseio.github.io/dust-20/llms.txt) · [`docs.json`](https://bitcoinuniverseio.github.io/dust-20/docs.json) · [`conformance.json`](https://bitcoinuniverseio.github.io/dust-20/conformance.json)

## Protocol at a glance

A **deploy** fixes a ticker's supply and the satoshis backing one unit, permanently:

```json
{"p":"dust-20","op":"deploy","tick":"dust","supply":"1000000","unit_sats":"546","max_sats":"546000000","lim_sats":"54600"}
```

A **mint** creates units in an output holding exactly the declared satoshis:

```json
{"p":"dust-20","op":"mint","tick":"dust","amt":"100","sats":"54600"}
```

There is **no transfer payload**. Units follow their satoshis in ordinal first-in-first-out order, and a unit survives a spend only when its whole block of `unit_sats` satoshis lands inside a single supported output. Anything else — satoshis paid as fees, sent to an unattributable output, or split across an output boundary — is burned.

```
max_sats = supply × unit_sats
sats     = amt × unit_sats          and the mint output must hold exactly `sats`
```

## Provenance

Every technical statement on the site carries a label, because DUST-20 is not a ratified multi-party standard:

| Label | Meaning |
| --- | --- |
| **Verified protocol rule** | In the legacy DUST-20 specification *and* enforced by the Bitcoin Universe production indexer. |
| **Current Universe implementation** | Enforced by the production indexer; the legacy specification does not settle it. |
| **Legacy profile** | Stated by legacy documentation; superseded or not enforced identically today. |
| **Implementation-specific** | One application's behaviour, not a protocol rule. |
| **Unresolved / experimental** | No authoritative answer exists. Documented as open rather than invented. |

Where the legacy documentation and the current implementation disagree, both positions and the difference are published in the [reconciliation section](https://bitcoinuniverseio.github.io/dust-20/reference.html#reconciliation) rather than silently resolved.

## Working on the docs

Requires Node.js 20 or newer. There are no runtime dependencies — `node_modules` is never needed to build or serve the site.

```bash
npm run generate   # rebuild pages and machine-readable artifacts
npm test           # generated files up to date + protocol tests + docs checks
npm run serve      # preview at http://localhost:4173/dust-20/
```

### How it fits together

```
assets/protocol-data.js      single source of truth: operations, fields, formulas,
                             rules, reconciliations, open questions, provenance
assets/protocol-vectors.js   examples, conformance vectors, scenarios, glossary, FAQ
assets/protocol.js           BigInt validator, strict reader, transaction simulator
assets/site-map.js           page and section manifest (nav, TOC, search, sitemap)
content/*.html               page content fragments
tools/build.mjs              wraps fragments in the shared layout, generates
                             llms.txt, docs.json, conformance.json, sitemap.xml, robots.txt
tools/check-docs.mjs         links, anchors, assets, canonical URLs, sitemap, artifacts
test/protocol.test.mjs       protocol logic, asserted against the same vectors the site renders
```

Field tables, formulas, examples, validation messages and the machine-readable
artifacts are all generated from `protocol-data.js` and `protocol-vectors.js`.
Nothing is duplicated by hand in HTML, so the documentation, the playground and
the test suite cannot drift apart. **Edit the data model, not the generated
`*.html`, `llms.txt`, `docs.json`, `conformance.json` or `sitemap.xml`.**

### Deployment

GitHub Pages serves the repository root of `main` directly — the generated HTML
is committed, so there is no build step on the Pages side. Push to `main` and
the site updates.

## Stay in control

Before signing, check the ticker, amount, satoshi value, recipient, **colored
change** and miner fee shown by your wallet. Fund fees from ordinary bitcoin and
keep token-carrying outputs separate from fee funding. A DUST-20 transaction can
confirm perfectly on Bitcoin while destroying your balance.

No page on this site asks for a private key or seed phrase, builds a transaction,
or sends your input anywhere. Everything runs locally in your browser.

## License

MIT — see [LICENSE](LICENSE).
