# CadmusRefsAssertion

📦 `@myrmidon/cadmus-refs-assertion`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.0.

## AssertionComponent

This component provides an editable assertion. The assertion decorates some other datum providing a likelihood estimation of its truthfulness.

- 🔑 `AssertionComponent`
- 🚩 `cadmus-refs-assertion`
- ▶️ input:
  - `assertion` (`Assertion`)
  - `noLookup`: true to disable the lookup set.
  - `noCitation`: true to disable the citation builder.
  - `defaultPicker` (`citation` (default) or `lookup`): the default picker to show when the editor opens.
- 📚 thesauri:
  - `assertion-tags` (assTagEntries)
  - `doc-reference-types` (refTypeEntries)
  - `doc-reference-tags` (refTagEntries)
- 🔥 output:
  - `assertionChange` (`Assertion`)

### 9.0.1

- 2025-07-15: replaced doc references with lookup doc references.

### 9.0.0

- 2025-01-03: ⚠️ updated [Cadmus dependencies](https://github.com/vedph/cadmus-shell-v3) to version 11 (standalone components).
