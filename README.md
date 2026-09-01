# DUST-20

**A token unit is an exact number of satoshis.**

DUST-20 is a fungible token protocol on Bitcoin. A deploy fixes how many satoshis stand behind one unit, permanently. A mint creates units inside a Bitcoin output holding exactly that many satoshis. After that there are no messages at all: units follow their satoshis through ordinary spends, and the output layout of the transaction you build decides which whole units survive.

This repository is the owning source of the DUST-20 documentation: the normative specification, the field reference, the conformance vectors, and a browser decoder that enforces every rule.

**Live site: <https://bitcoinuniverseio.github.io/dust-20/>**

## Availability in Bitcoin Universe

You can view DUST-20 in Bitcoin Universe products. You cannot trade it there.

The Bitcoin Universe capability registry records DUST-20 marketplace availability as `read-only`, mode `read-only`. `view`, `view-collection` and `view-activity` are supported. `list`, `update-listing`, `unlist`, `buy`, `sell`, `make-offer`, `accept-offer`, `cancel-offer`, `settle` and `reconcile` are not.

The recorded reason, word for word:

> DUST-20 mutations are unavailable until a typed authoritative ownership resolver replaces the retired address-only legacy flow.

The recorded ownership source of truth is **No safe typed mutation resolver is configured**, and settlement is **No supported settlement while ownership is unverifiable**. The read path is first-party: Bitcoin Universe engineering rules require that Bitcoin production blockchain data come from Universe-operated nodes, APIs and indexers with no third-party fallback, and DUST-20 discovery and portfolio data is served by the first-party `index-dust20` service.

Full recorded state, action matrix and reasoning: <https://bitcoinuniverseio.github.io/dust-20/universe.html>

## Documentation

| Page | What it covers |
| --- | --- |
| [Overview](https://bitcoinuniverseio.github.io/dust-20/) | What DUST-20 is, lifecycle state, chain and network, entry points. |
| [Specification](https://bitcoinuniverseio.github.io/dust-20/specification.html) | Numbered rules DUST-2.1 to DUST-9.8, transaction anatomy, state transitions, invalidity conditions. |
| [Reference](https://bitcoinuniverseio.github.io/dust-20/reference.html) | Field ledger, formulas, fee and size, limitations, implementation checklist, reconciliation. |
| [Guide](https://bitcoinuniverseio.github.io/dust-20/how-it-works.html) | Plain-language lifecycle, worked transactions, support matrix. |
| [Transactions](https://bitcoinuniverseio.github.io/dust-20/transactions.html) | Ordinal sat flow and an allocation simulator. |
| [Decoder](https://bitcoinuniverseio.github.io/dust-20/playground.html) | Byte map, rule-by-rule validation, deploy and mint builders, conformance runner. |
| [Test vectors](https://bitcoinuniverseio.github.io/dust-20/conformance.html) | Valid and invalid cases with expected outcomes and the rule each exercises. |
| [Indexing](https://bitcoinuniverseio.github.io/dust-20/indexer.html) | Pipeline, allocation record, confirmation, mempool, reorganizations, event contract. |
| [Universe support](https://bitcoinuniverseio.github.io/dust-20/universe.html) | Recorded capability state and why the marketplace is read-only. |
| [Security](https://bitcoinuniverseio.github.io/dust-20/safety.html) | What destroys a balance, and what stops it. |
| [Glossary and FAQ](https://bitcoinuniverseio.github.io/dust-20/glossary.html) | Terminology and common questions. |
| [Changelog](https://bitcoinuniverseio.github.io/dust-20/changelog.html) | Document version history. |

Machine readable: [`llms.txt`](https://bitcoinuniverseio.github.io/dust-20/llms.txt) · [`docs.json`](https://bitcoinuniverseio.github.io/dust-20/docs.json) · [`conformance.json`](https://bitcoinuniverseio.github.io/dust-20/conformance.json) · [`search-index.json`](https://bitcoinuniverseio.github.io/dust-20/search-index.json) · [`docs.manifest.json`](https://bitcoinuniverseio.github.io/dust-20/docs.manifest.json)

## The protocol in one screen

A **deploy** fixes a ticker's supply and its satoshi backing, permanently:

```json
{"p":"dust-20","op":"deploy","tick":"dust","supply":"1000000","unit_sats":"546","max_sats":"546000000","lim_sats":"54600"}
```

A **mint** creates units in an output holding exactly the declared satoshis:

```json
{"p":"dust-20","op":"mint","tick":"dust","amt":"100","sats":"54600"}
```

```
max_sats = supply x unit_sats
sats     = amt x unit_sats,  and the mint output must hold exactly `sats`
```

There is **no transfer payload**. Units follow their satoshis in ordinal first-in-first-out order, and a unit survives a spend only when its whole block of `unit_sats` satoshis lands inside a single supported output. Satoshis paid as fees, sent to an unattributable output, or split across an output boundary destroy the units they carried, and Bitcoin confirms the transaction normally.

| Fact | Value |
| --- | --- |
| Chain and network | Bitcoin mainnet |
| Ownership model | UTXO |
| Decimals | 0, whole units only |
| Carrier | Inscription content for deploy and mint; ordinary spends for movement |
| Content ceiling | 4096 bytes |
| Ticker length | 1 to 64 UTF-8 bytes, NFC, folded to lower case for identity |
| Satoshi ceiling | 2,100,000,000,000,000 |
| Unit ceiling | 2^128 - 1 |
| Document version | 1.1.0 |
| Lifecycle | Experimental |

## Provenance

DUST-20 originates outside Bitcoin Universe and is not a ratified multi-party standard, so every technical statement on the site carries a label:

| Label | Meaning |
| --- | --- |
| **VERIFIED** | In the legacy DUST-20 specification *and* enforced by the Bitcoin Universe production indexer. |
| **UNIVERSE** | Enforced by the production indexer; the legacy specification does not settle it. |
| **LEGACY** | Stated by legacy documentation; superseded or not enforced identically today. |
| **IMPL** | One application's behaviour, not a protocol rule. |
| **UNRESOLVED** | No authoritative answer exists. Documented as open rather than invented. |

Where the legacy documentation and the current implementation disagree, both positions and the resolution are published in the [reconciliation section](https://bitcoinuniverseio.github.io/dust-20/reference.html#reconciliation) rather than silently resolved. Five questions remain [open](https://bitcoinuniverseio.github.io/dust-20/reference.html#open).

## Working on the docs

Requires Node.js 20 or newer. There are no runtime dependencies and `node_modules` is never needed to build or serve the site.

```bash
npm run generate   # rebuild pages and machine-readable artifacts
npm test           # generated files up to date + protocol tests + docs checks
npm run serve      # preview at http://localhost:4173/dust-20/
```

### How it fits together

```
assets/protocol-schema.js    machine schema: limits, operation key sets, field table
assets/protocol-data.js      documentation model: numbered rules, anatomy, transitions,
                             invalidity, fees, limitations, checklist, Universe support
assets/protocol-vectors.js   examples, conformance vectors, scenarios, glossary, FAQ
assets/protocol.js           exact-integer validator, strict reader, transaction simulator
assets/site-map.js           page and section manifest (nav, contents, search, sitemap)
assets/site.js               theme toggle, mobile nav, local search
assets/tool.js               decoder, builders, conformance runner, allocation simulator
content/*.html               page fragments with {{token}} placeholders
tools/build.mjs              expands tokens into tables, wraps pages in the shared layout,
                             generates llms.txt, docs.json, conformance.json,
                             search-index.json, sitemap.xml, robots.txt
tools/check-docs.mjs         links, anchors, ids, assets, SEO, budgets, text policy
test/protocol.test.mjs       protocol logic and specification integrity
```

Every table on the site is rendered at build time from the data model, so the whole site reads with JavaScript disabled. Scripts exist only for the decoder, the simulator, search and the theme toggle.

**Edit the data model and the content fragments, not the generated `*.html`, `llms.txt`, `docs.json`, `conformance.json`, `search-index.json` or `sitemap.xml`.** `npm run check:generated` fails if a generated file is out of date.

### Deployment

GitHub Pages serves the repository root of `main` directly and the generated HTML is committed, so there is no build step on the Pages side. `.nojekyll` is present. Push to `main` and the site updates.

## Stay in control

Before signing, check the ticker, the whole-unit amount, every colored output value, the **colored change output**, the cardinal input funding the fee, and the fee itself. A DUST-20 transaction can confirm perfectly on Bitcoin while destroying your balance, and nothing will warn you.

No page on this site asks for a private key or seed phrase, builds a transaction, or sends your input anywhere. Everything runs locally in your browser.

## Reporting

Security issues: open a private advisory at <https://github.com/bitcoinuniverseio/dust-20/security/advisories/new>. See [SECURITY.md](SECURITY.md). Questions and corrections: see [SUPPORT.md](SUPPORT.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT, see [LICENSE](LICENSE).
