# CadmusUiFlagSet

📦 `@myrmidon/cadmus-ui-flag-set`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.0.

## Flags Set

- 🔑 `FlagSetComponent`
- 🚩 `cadmus-flag-set`
- ▶️ input:
  - `flags` (`Flag[]`)
  - `checkedIds` (`string[]`)
  - `allowCustom` (`boolean?`)
  - `hideToolbar` (`boolean?`)
- 🔥 output:
  - `checkedIdsChange` (`string[]`)

This component represents a set of checkable flags. The available flags are specified by `flags`, using this model:

- `id` (`string`): the flag ID.
- `label` (`string`): the flag label.
- `custom` (`boolean?`): true if this is a custom flag. This is set by the control when the user adds a custom flag.
- `blackIds` (`string[]?`): an optional set of flag IDs which should be switched off whenever this flag is switched on.
- `color` (`string?`): an optional color for this flag.

Usage:

1. import the component.
2. provide an array of `Flag`'s to the component, and handle the IDs of the checked flags in an array of strings.
