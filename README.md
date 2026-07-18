# DUST-20 documentation

Bitcoin Universe documentation for DUST-20 on Bitcoin.

## What this covers

DUST-20 pairs token metadata with a satoshi-denominated UTXO model. A mint output carries the exact number of sats required by the token amount, and a transfer divides that colored value across recipient and change outputs.

## State model

The arithmetic is the protocol. Token units are not an account entry detached from Bitcoin outputs: their satoshi backing must be conserved through every spend.

## Documentation site

- Overview: [index.html](index.html)
- Field reference: [reference.html](reference.html)
- Build and verification playbook: [guide.html](guide.html)

## Core rules

- unit_sats defaults to 546 sats when omitted by the documented profile.
- max_sats equals supply multiplied by unit_sats.
- Mint output value must equal amt multiplied by unit_sats.
- Transfer colored outputs must sum to the colored input amount.
- Fees must come from a separate cardinal input, not the token backing.
- Wallets need explicit colored UTXO tracking and change construction.

## Source material

- [Bitcoin Universe DUST-20 reference](https://github.com/bitcoinuniverse/inscribe/blob/main/frontend/docs/dust-20/index.html)

## Scope

A missing colored change output does not look like a formatting error. It changes where the token backing goes, so treat it as a transfer-critical condition.
