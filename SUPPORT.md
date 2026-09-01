# Support

## Start with the site

Almost every question has an answer at <https://bitcoinuniverseio.github.io/dust-20/>. Press `/` on any page to search rules, fields, terms and test vectors.

| Question | Where |
| --- | --- |
| What is DUST-20? | [Overview](https://bitcoinuniverseio.github.io/dust-20/) |
| What exactly does a reader have to enforce? | [Specification](https://bitcoinuniverseio.github.io/dust-20/specification.html), rules DUST-2.1 to DUST-9.8 |
| What does this field mean? | [Reference](https://bitcoinuniverseio.github.io/dust-20/reference.html#fields) |
| Why was my payload rejected? | [Decoder](https://bitcoinuniverseio.github.io/dust-20/playground.html), then the [invalidity table](https://bitcoinuniverseio.github.io/dust-20/specification.html#invalidity) |
| Why did my units disappear? | [Transactions](https://bitcoinuniverseio.github.io/dust-20/transactions.html) and [Security](https://bitcoinuniverseio.github.io/dust-20/safety.html) |
| Can I trade DUST-20 in Bitcoin Universe? | No. [Universe support](https://bitcoinuniverseio.github.io/dust-20/universe.html) explains the recorded reason. |
| Is my reader correct? | [Test vectors](https://bitcoinuniverseio.github.io/dust-20/conformance.html) |
| What does this word mean? | [Glossary](https://bitcoinuniverseio.github.io/dust-20/glossary.html) |

## Questions about this documentation

Open an issue on <https://github.com/bitcoinuniverseio/dust-20/issues>. Useful reports include the page, the numbered rule or field, what you expected, and what you found instead.

If you believe a published rule is wrong, the most effective report is a failing case in the format of the [conformance vectors](https://bitcoinuniverseio.github.io/dust-20/conformance.json): an input, a context, and the outcome you expected.

## Security issues

Do not open a public issue. Use private vulnerability reporting: <https://github.com/bitcoinuniverseio/dust-20/security/advisories/new>. See [SECURITY.md](SECURITY.md).

## What this project cannot help with

- **Recovering burned units.** Nothing can. Once the transaction confirms, satoshis paid as fees belong to a miner, and there is no correction message in DUST-20.
- **Fixing an invalid mint.** A mint whose output value does not equal its `sats` field is invalid permanently.
- **Third-party wallets, indexers and marketplaces.** Report those to their maintainers. This repository documents the protocol and the Bitcoin Universe capability state, not other people's software.
- **Prices, listings, trading or investment questions.** Not in scope here.
- **Anything involving your keys.** No one working on this documentation will ever ask for a seed phrase or a private key, and no page here accepts one.

## Bitcoin Universe

For the wider documentation platform, see <https://docs.bitcoinuniverse.io>. For the organization, see <https://github.com/bitcoinuniverseio>.
