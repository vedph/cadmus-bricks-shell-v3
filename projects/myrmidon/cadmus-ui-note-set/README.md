# CadmusUiNoteSet

- 📦 `@myrmidon/cadmus-ui-note-set`
- 📦 dependencies:
  - `ngx-markdown`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.0.

## NoteSetComponent

A set of editable notes, either plain text or Markdown. Each note has a key, a label, and some metadata for its format
and validation. Whenever the user saves his changes to a note, the `noteChange` event is emitted with its key and value.

To use this component, just bind its set property to a set, and handle the `noteChange` event.

- 🔑 `NoteSetComponent`
- 🚩 `cadmus-`
- ▶️ input:
  - set (`NoteSet`)
- 🔥 output:
  - setChange (`NoteSet`)
  - noteChange (`KeyValue<string, string | null>`): emitted whenever a single note is changed.
