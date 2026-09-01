# Security policy

## Reporting a vulnerability

Report privately, through GitHub's private vulnerability reporting:

**<https://github.com/bitcoinuniverseio/dust-20/security/advisories/new>**

Do not open a public issue, a pull request, or a public discussion for a security report, and do not post details publicly before a fix is available.

## What is in scope

This repository publishes protocol documentation and a client-side decoder. A finding is in scope when it could lead someone to build a Bitcoin transaction that destroys value, or when it misrepresents what the protocol or Bitcoin Universe products actually do.

- A published rule that contradicts the implementation it claims to describe.
- A decoder result that accepts an invalid payload or rejects a valid one.
- A test vector with the wrong expected outcome, or a worked example whose arithmetic is wrong.
- A claim of wallet, indexer or marketplace support that is not real.
- Any behaviour in a page on this site that transmits, logs or stores what a visitor pastes.
- Cross-site scripting or content injection in the decoder, the simulator or the search dialog.

## What is out of scope

- Findings about third-party wallets, marketplaces or indexers. Report those to their maintainers.
- The fact that DUST-20 permits transaction constructions that destroy units. That is documented behaviour, described at <https://bitcoinuniverseio.github.io/dust-20/safety.html>, not a defect in this repository.
- Missing security headers on GitHub Pages, which this repository does not control.
- Automated scanner output with no demonstrated impact.

## What to include

- The exact payload, transaction shape or URL.
- What you expected and what happened.
- The numbered rule you believe is wrong, for example `DUST-6.7`.

A failing case written in the format of the published conformance vectors is the fastest possible report, because it can be added to `assets/protocol-vectors.js` and asserted directly.

## Handling

Reports are acknowledged through the advisory thread. A documentation error that could cause value loss is corrected first and explained afterwards. Fixes are published to `main`, which deploys the site, and are recorded on the [changelog page](https://bitcoinuniverseio.github.io/dust-20/changelog.html) with the document version they landed in.

## Scope note on keys

Nothing in this repository handles private keys, seed phrases, signing or broadcasting, and nothing should ever be added that does. If you find a page here asking for a secret, that is a critical finding and should be reported immediately.
