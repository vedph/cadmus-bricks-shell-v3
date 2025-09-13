# CadmusRefsAssertedChronotope

📦 `@myrmidon/cadmus-refs-asserted-chronotope`

- [CadmusRefsAssertedChronotope](#cadmusrefsassertedchronotope)
  - [AssertedChronotopeComponent](#assertedchronotopecomponent)
  - [AssertedChronotopeSet](#assertedchronotopeset)
  - [AssertedChronotopesPipe](#assertedchronotopespipe)
  - [History](#history)
    - [10.0.4](#1004)
    - [10.0.3](#1003)
    - [10.0.2](#1002)
    - [10.0.1](#1001)
    - [9.0.0](#900)

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.0.

## AssertedChronotopeComponent

Editor for a chronotope (place and/or date) with an optional [assertion](../cadmus-refs-assertion/README.md).

- 🔑 `AssertedChronotopeComponent`
- 🚩 `cadmus-refs-asserted-chronotope`
- ▶️ input:
  - `chronotope` (`AssertedChronotope`)
- 📚 thesauri:
  - `chronotope-tags` (for `tagEntries`)
  - `assertion-tags` (for `assTagEntries`)
  - `doc-reference-types` (for `refTypeEntries`)
  - `doc-reference-tags` (for `refTagEntries`)
- 🔥 output:
  - `chronotopeChange` (`AssertedChronotope`)

## AssertedChronotopeSet

A set of asserted chronotopes.

- 🔑 `AssertedChronotopeSet`
- 🚩 `cadmus-asserted-chronotope-set`
- ▶️ input:
  - chronotopes (`AssertedChronotope[]`)
- 📚 thesauri:
  - `chronotope-tags` (for `tagEntries`)
  - `chronotope-assertion-tags` (for `assTagEntries`)
  - `chronotope-reference-types` (for `refTypeEntries`)
  - `chronotope-reference-tags` (for `refTagEntries`)
- 🔥 output:
  - `chronotopesChange`  (`AssertedChronotope[]`)

## AssertedChronotopesPipe

- 🚩 `assertedChronotopes`

A pipe to transform a single chronotope or an array of chronotopes into a string. Example:

```html
{{ chronotopes | assertedChronotopes }}
```

## History

### 10.0.4

- 2025-09-13: fixed missing refactoring of `AssertedChronotopeSetComponent`.

### 10.0.3

- 2025-09-11: refactored for `OnPush`.

### 10.0.2

- 2025-07-30:
  - handle chronotope date and place expansion via signals.
  - refactor interactivity in editor.

### 10.0.1

- 2025-06-03: fixes to chronotope editor.
- 2025-05-29: ⚠️ upgraded to Angular 20.

### 9.0.0

- 2025-01-03: ⚠️ updated [Cadmus dependencies](https://github.com/vedph/cadmus-shell-v3) to version 11 (standalone components).
