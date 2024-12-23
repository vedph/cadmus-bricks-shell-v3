# CadmusUiFlagSet

📦 `@myrmidon/cadmus-ui-flag-set`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.0.

## FlagsSetComponent

A set of checkable flags. This component replaces the legacy (V2) [Cadmus UI flags picker](https://github.com/vedph/cadmus-bricks-shell-v2/blob/master/projects/myrmidon/cadmus-ui-flags-picker/README.md), which required a much more complex configuration to avoid concurrency issues in handling its settings. If you want to migrate to this new component, just map a thesaurus to flags and bind them via `flags`, while setting the selected flags IDs via `checkedIds`; handle `checkedIdsChange` to update them in your component.

>Besides being much easier, this component provides additional features, like custom coloring and "black IDs" for each flag.

- 🔑 `FlagSetComponent`
- 🚩 `cadmus-ui-flag-set`
- ▶️ input:
  - flags (`Flag[]`): the flags set.
  - checkedIds (`string[]`)
  - allowCustom (`boolean?`)
  - hideToolbar (`boolean?`)
  - numbering (`boolean?`)
- 🔥 output:
  - checkedIdsChange (`string[]`)

This component represents a set of checkable flags. The available flags are specified by `flags`, using this mode (`Flag`):

- id (`string`): the flag ID.
- label (`string`): the flag label.
- custom (`boolean?`): true if this is a custom flag. This is set by the control when the user adds a custom flag.
- blackIds (`string[]?`): an optional set of flag IDs which should be switched off whenever this flag is switched on.
- color (`string?`): an optional color for this flag.

Usage:

1. import the component.
2. provide an array of `Flag`'s to the component, and handle the IDs of the checked flags in an array of strings.

💡 You can easily map between a Cadmus thesaurus and these flags, e.g.:

```ts
function entryToFlag(entry: ThesaurusEntry): Flag {
  return {
    id: entry.id,
    label: entry.value,
  };
}
```

>If you want to provide further metadata like color or black IDs, you can either define some convention for IDs, or use component settings.

## History

### 8.0.1

- 2024-12-23:
  - fixed selector name (cadmus-**ui**-flag-set).
  - added `numbering` option.
