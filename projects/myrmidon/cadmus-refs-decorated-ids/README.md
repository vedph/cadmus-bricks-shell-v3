# CadmusRefsDecoratedIds

📦 `@myrmidon/cadmus-refs-decorated-ids`

- [CadmusRefsDecoratedIds](#cadmusrefsdecoratedids)
  - [DecoratedIdsComponent](#decoratedidscomponent)
  - [History](#history)
    - [9.0.1](#901)

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.0.

## DecoratedIdsComponent

This component provides an editable list of simple identifiers decorated with some optional metadata (rank, tag, documental sources).

- 🔑 `DecoratedIdsComponent`
- 🚩 `cadmus-refs-decorated-ids`
- ▶️ input:
  - `ids` (`DecoratedId[]`)
  - `noLookup`: true to disable the lookup set.
  - `noCitation`: true to disable the citation builder.
  - `defaultPicker` (`citation` (default) or `lookup`): the default picker to show when the editor opens.
- 📚 thesauri:
  - `decorated-id-tags` (tagEntries)
  - `doc-reference-tags` (refTagEntries)
  - `doc-reference-types` (refTypeEntries)
- 🔥 output:
  - `idsChange` (`DecoratedId[]`)

## History

### 9.0.1

- 2025-07-15: replaced doc references with lookup doc references.
