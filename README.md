# DUST-20 documentation

The public documentation site is live at [bitcoinuniverse.github.io/dust-20-docs](https://bitcoinuniverse.github.io/dust-20-docs/).

## Pages

| Page | Purpose |
| --- | --- |
| [Overview](https://bitcoinuniverse.github.io/dust-20-docs/) | Scope, source hierarchy, lifecycle, and documentation map. |
| [Protocol reference](https://bitcoinuniverse.github.io/dust-20-docs/reference.html) | Deploy and mint fields, arithmetic, validation, compatibility split, and conformance vectors. |
| [Build and verify](https://bitcoinuniverse.github.io/dust-20-docs/guide.html) | Preflight, deploy, mint, transfer construction, and safe error behavior. |
| [Transactions](https://bitcoinuniverse.github.io/dust-20-docs/transactions.html) | Colored UTXO splits, merges, fee separation, colored change, and unresolved rules. |
| [Indexer](https://bitcoinuniverse.github.io/dust-20-docs/indexer.html) | Provenance, allocation records, event ordering, RBF, reorgs, and API expectations. |
| [Safety](https://bitcoinuniverse.github.io/dust-20-docs/safety.html) | Wallet boundaries, PSBT review, threats, incidents, and release gates. |
| [llms.txt](https://bitcoinuniverse.github.io/dust-20-docs/llms.txt) | Compact source-aware reference for retrieval systems and agents. |

## Scope and status

DUST-20 is an experimental Bitcoin UTXO allocation model. This repository is a public field guide, not a Bitcoin consensus rule, a wallet guarantee, or financial advice.

The documentation deliberately separates:

1. Legacy-guide facts from [the DUST-20 GitBook](https://dust-20.gitbook.io/dust20).
2. Current Universe Inscribe implementation behavior.
3. Proposed or unresolved rules that must not be treated as consensus.

The legacy profile documents deploy and mint payloads. It does not define a complete canonical transfer payload, indexer API, duplicate-ticker rule, output-order rule, RBF policy, reorg policy, or burn rule. The site labels those gaps rather than inventing answers.

## Core compatibility rules

- Deploy profile: `p`, `op`, `tick`, `supply`, `unit_sats`, `max_sats`, optional `lim_sats`.
- `max_sats` must equal `supply * unit_sats` in the legacy profile.
- Mint profile: `p`, `op`, `tick`, `amt`, `sats`.
- `sats` must equal `amt * unit_sats`, and the actual inscription output value must equal `sats`.
- When a transfer sends only part of a colored allocation, it needs an explicit colored change output.
- Miner fees must be paid with a separate cardinal input, not by reducing colored backing.

## Local preview and validation

The site is static HTML. Open `index.html` in a browser or serve this directory with any static HTTP server for local review. Before publishing, check internal links, HTML structure, source URLs, and that no generated copy contains the U+2014 character.

## Repository links

- Public source: <https://github.com/bitcoinuniverse/dust-20-docs>
- Published site: <https://bitcoinuniverse.github.io/dust-20-docs/>
- Legacy reference: <https://dust-20.gitbook.io/dust20>
- Universe Inscribe: <https://inscribe.bitcoinuniverse.io>
