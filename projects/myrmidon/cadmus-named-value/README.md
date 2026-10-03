# CadmusNamedValue

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.0.0.

## NamedValueEditor

- 🔑 `cadmus-named-value-editor`

The named value editor lets you edit a single named value, which is a name/value pair. You can optionally provide:

- a closed list of names;
- closed lists of values keyed by name.

In both cases the list contains `NamedValue` objects, where value is the machine-readable value and name its human-friendly label.

Additionally, some values can be multiple, i.e. the value contains multiple values separated by space.

## NamedValueSetEditor

- 🔑 `cadmus-named-value-set-editor`

The named values set editor lets you edit a set of named values.

## History

### 0.0.4

- 2026-10-02: fixed failing tests. They were test harness issues, not component bugs: `NamedValueEditor` tests never ran an initial change detection, so the component effects first ran inside each test, after it had already edited the form; that first run loaded the still unbound (undefined) value, clearing those edits. The setup now runs change detection once before each test.
