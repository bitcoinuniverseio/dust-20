# Contributing

Thank you for improving the DUST-20 documentation. This repository has one job: describe DUST-20 accurately enough that someone can implement it, and honestly enough that they know which parts are settled and which are not.

## The rule that matters most

**Never assert a protocol rule you cannot source.** Every technical statement carries a provenance label:

| Label | Use it when |
| --- | --- |
| `verified` | The legacy DUST-20 specification and the Bitcoin Universe production indexer agree. |
| `universe` | The production indexer enforces it and the legacy specification does not settle it. |
| `legacy` | Legacy documentation states it but the current implementation differs. |
| `implementation` | It is one application's behaviour, not a protocol rule. |
| `unresolved` | No authoritative answer exists. |

If you do not know which label applies, that is itself the answer: it is `unresolved`, and it belongs in the open questions list rather than in a numbered rule. A gap documented as a gap is more useful than a confident guess.

Do not claim wallet, indexer or marketplace support that you cannot point at in real code. "Not currently supported" is an acceptable and often correct thing to write.

## Where to edit

Every table, list and machine-readable artifact is generated. Editing a generated file is always the wrong move, and `npm run check:generated` will fail.

| Want to change | Edit |
| --- | --- |
| A numeric limit, an operation key set, a field constraint | `assets/protocol-schema.js` |
| A numbered rule, anatomy, transitions, invalidity, fees, limitations, checklist, Universe support | `assets/protocol-data.js` |
| An example, a conformance vector, a scenario, a glossary term, an FAQ answer | `assets/protocol-vectors.js` |
| Validator or simulator behaviour | `assets/protocol.js` |
| Page prose, headings, diagrams | `content/*.html` |
| The page list, section anchors, navigation groups | `assets/site-map.js` |
| How a table is rendered, or a new `{{token}}` | `tools/build.mjs` |

Then run `npm run generate`, and commit the generated output along with your source change.

## Adding a numbered rule

1. Add it to the right section in `SPEC_SECTIONS`, using the next free index in that section. Never reuse a number, and never change the meaning of an existing one: add a new rule instead.
2. Give it a `status`, and a `test` naming the conformance vector that exercises it, if one does.
3. If it introduces a new rejection, add the issue code to `INVALIDITY` and make the validator emit it.
4. Add a vector to `VECTORS` and map it in `VECTOR_RULES`.
5. Run `npm test`. The suite fails if a rule number is malformed, if a vector maps to a rule that does not exist, if an expected issue code is undocumented, or if a rule is too thin to be useful.

## Style rules, enforced by the test suite

- No em dash characters anywhere, in prose, code or comments. Use commas, colons, periods or parentheses.
- Do not use the word this project avoids for "authoritative". The only permitted appearance is the HTML attribute `rel="canonical"`. Write "authoritative", "owning", "official" or "the source of truth" instead.
- No filler, no unsupported superlatives, no fake urgency, no placeholder sections, no TODOs, no "coming soon".
- Plain, direct writing. Prefer a table or a diagram to a paragraph.
- Numbers in prose use thousands separators; numbers in code and payloads never do, because DUST-20 integers are strict decimal strings.

## Accessibility and budget, also enforced

- The site must read completely with JavaScript disabled. Scripts may enhance the decoder, the simulator, search and the theme toggle, and nothing else.
- Every inline SVG that conveys meaning needs `role="img"`, `aria-labelledby`, a `<title>` and a `<desc>`. Decorative SVG gets `aria-hidden="true"`.
- Exactly one `<h1>` per page, correct heading order, a skip link, a `main` landmark, visible focus.
- No horizontal page overflow at 320px. Wide tables and code scroll inside their own container.
- Both themes must meet WCAG 2.2 AA contrast.
- CSS stays under 50KB and the JavaScript on the heaviest page stays under 60KB. `npm test` fails otherwise.
- No external fonts, no CDNs, no trackers, no network requests except to files in this repository.

## Checks before you open a pull request

```bash
npm test
```

That runs three things: generated files are up to date, the protocol logic and specification integrity tests pass, and the documentation checks pass (links, anchors, ids, assets, SEO metadata, budgets, text policy).

## Commits and pull requests

Work on a branch, describe what changed and why, and say which source of truth supports any new factual claim. A pull request that adds a rule should link the code or specification that settles it. If your change moves a statement from one provenance label to another, add a row to the changelog.

## Reporting a security issue

Do not open a pull request or a public issue. See [SECURITY.md](SECURITY.md).
