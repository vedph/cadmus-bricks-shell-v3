# CadmusUiFlagSet

📦 `@myrmidon/cadmus-ui-flag-set`

- [CadmusUiFlagSet](#cadmusuiflagset)
  - [FlagSetComponent](#flagsetcomponent)
    - [FlagSetBadge](#flagsetbadge)
  - [History](#history)
    - [9.0.2](#902)
    - [9.0.1](#901)
    - [8.0.1](#801)

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.0.

## FlagSetComponent

A set of checkable flags. This component replaces the legacy (V2) [Cadmus UI flags picker](https://github.com/vedph/cadmus-bricks-shell-v2/blob/master/projects/myrmidon/cadmus-ui-flags-picker/README.md), which required a much more complex configuration to avoid concurrency issues in handling its settings. If you want to migrate to this new component, just map a thesaurus to flags and bind them via `flags`, while setting the selected flags IDs via `checkedIds`; handle `checkedIdsChange` to update them in your component.

>Besides being much easier, this component provides additional features, like custom coloring and "black IDs" for each flag.

- 🔑 `FlagSetComponent`
- 🚩 `cadmus-ui-flag-set`
- ▶️ input:
  - `flags` (`Flag[]`): the flags set.
  - `checkedIds` (`string[]`): the IDs of checked flags.
  - `allowCustom` (`boolean?`): allow custom-defined flags.
  - `hideToolbar` (`boolean?`): hide toolbar.
  - `numbering` (`boolean?`): number flags when displaying their list.
- 🔥 output:
  - `checkedIdsChange` (`string[]`)

This component represents a set of checkable flags. The available flags are specified by `flags`, using this mode (`Flag`):

- id (`string`): the flag ID.
- label (`string`): the flag label.
- custom (`boolean?`): true if this is a custom flag. This is set by the control when the user adds a custom flag.
- blackIds (`string[]?`): an optional set of flag IDs which should be switched off whenever this flag is switched on.
- color (`string?`): an optional color for this flag.

Usage:

1. import `FlagSetComponent` component in your component's `imports`.
2. provide an array of `Flag`'s to the component, and handle the IDs of the checked flags in an array of strings (typically in a form control).

Example (here we use an array of Cadmus thesaurus entries as the input):

```ts
import { Flag, FlagSetComponent } from '@myrmidon/cadmus-ui-flag-set';

function entryToFlag(entry: ThesaurusEntry): Flag {
  return {
    id: entry.id,
    label: entry.value,
  };
}

@Component({
  // ...
  imports: [
    // ...
    FlagSetComponent,
  ],
})
export class MyComponent {
  // selected flag IDs in a control
  public features: FormControl<string[]>;

  // a set of thesaurus entries mapped to flags
  public readonly featureEntries = input<ThesaurusEntry[]>();

  // flags mapped from thesaurus entries
  public featureFlags = computed<Flag[]>(
    () => this.featureEntries()?.map((e) => entryToFlag(e)) || []
  );

  constructor(formBuilder: FormBuilder) {
    this.features = formBuilder.control([], { nonNullable: true });
    // ...
  }

  public onFeatureCheckedIdsChange(ids: string[]): void {
    this.features.setValue(ids);
    this.features.markAsDirty();
    this.features.updateValueAndValidity();
  }
}
```

Template:

```css
@if (featureFlags().length) {
<div>
  <cadmus-ui-flag-set
    [flags]="featureFlags()"
    [checkedIds]="features.value"
    (checkedIdsChange)="onFeatureCheckedIdsChange($event)"
  />
</div>
}
```

>💡 If you want to provide further metadata like color or black IDs, you can either define some convention for IDs, or use component _settings_.

### FlagSetBadge

A set of flags badges, used to provide a compact visualization of a set of selected flags.

- 🔑 `FlagSetBadge`
- 🚩 `cadmus-ui-flag-set`
- ▶️ input:
  - `flags` (`Flag[]`): the flags set.
  - `noInitials` (`boolean`): true to hide flag initials and just show the color.
  - `flagSymbol` (`string`): the symbol to use for the flag. Default is a filled circle.
  - `size` (`string`): the CSS-like size of the flag symbol. Default is `1em`.

## History

### 9.0.2

- 2025-09-10: set components to `OnPush`.

### 9.0.1

- 2025-06-03:
  - ⚠️ upgraded to Angular 20.
  - fix: do not add custom flags if not allowed.

### 8.0.1

- 2024-12-23:
  - fixed selector name (cadmus-**ui**-flag-set).
  - added `numbering` option.
