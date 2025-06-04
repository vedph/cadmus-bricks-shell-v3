# CadmusRefsDecoratedCounts

📦 `@myrmidon/cadmus-refs-decorated-counts`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.0.

## DecoratedCountsComponent

This component provides an editable list of counts with some essential metadata attached.

Each decorated count is a count (thus a numeric value) decorated with the ID of the entity being counted, and optionally by a tag and/or note.

- 🔑 `DecoratedCountsComponent`
- 🚩 `cadmus-refs-decorated-counts`
- ▶️ input:
  - counts (`DecoratedCount[]`)
  - allowCustomId (`boolean`, default is `true`)
  - distinct (`boolean`)
- 📚 thesauri:
  - `decorated-count-ids` (idEntries)
  - `decorated-count-tags` (tagEntries)
- 🔥 output:
  - countsChange (`DecoratedCount[]`)

## History

### 8.0.1

- 2025-01-23:
  - refactored UI.
  - added `allowCustomId` and `distinct` properties.
