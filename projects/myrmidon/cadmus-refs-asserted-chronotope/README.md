# CadmusRefsAssertedChronotope

📦 `@myrmidon/cadmus-refs-asserted-chronotope`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.0.

## AssertedChronotopeComponent

Editor for a chronotope (place and/or date) with an optional [assertion](../cadmus-refs-assertion/README.md).

- 🔑 `AssertedChronotopeComponent`
- 🚩 `cadmus-refs-asserted-chronotope`
- ▶️ input:
  - chronotope (`AssertedChronotope`)
- 📚 thesauri:
  - `chronotope-tags` (tagEntries)
  - `assertion-tags` (assTagEntries)
  - `doc-reference-types` (refTypeEntries)
  - `doc-reference-tags` (refTagEntries)
- 🔥 output:
  - chronotopeChange (`AssertedChronotope`)

## AssertedChronotopeSet

A set of asserted chronotopes.

- 🔑 `AssertedChronotopeSet`
- 🚩 `cadmus-`
- ▶️ input:
  - chronotopes (`AssertedChronotope[]`)
- 📚 thesauri:
  - `chronotope-tags` (tagEntries)
  - `chronotope-assertion-tags` (assTagEntries)
  - `chronotope-reference-types` (refTypeEntries)
  - `chronotope-reference-tags` (refTagEntries)
- 🔥 output:
  - chronotopesChange  (`AssertedChronotope[]`)

## AssertedChronotopesPipe

- 🚩 `assertedChronotopes`

A pipe to transform a single chronotope or an array of chronotopes into a string.

## History

### 9.0.0

- 2025-01-03: ⚠️ updated [Cadmus dependencies](https://github.com/vedph/cadmus-shell-v3) to version 11 (standalone components).
