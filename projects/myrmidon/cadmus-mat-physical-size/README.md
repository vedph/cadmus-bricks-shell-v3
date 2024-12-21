# CadmusMatPhysicalSize

- 📦 `@myrmidon/cadmus-mat-physical-size`
- 🧱 [backend: physical size brick](https://github.com/vedph/cadmus-bricks/blob/master/docs/physical-size.md)

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.0.

## Component

This component allows you to edit a 2D or 3D physical size.

- 🚩 `cadmus-mat-physical-size`
- 🔑 `PhysicalSizeComponent`
- 📚 thesauri:
  - `physical-size-units`
  - `physical-size-tags`
  - `physical-size-dim-tags`
- ▶️ input:
  - size (`PhysicalSize`)
  - defaultWUnit (`string`): default unit for width (default=`cm`).
  - defaultHUnit (`string`): default unit for height (default=`cm`).
  - defaultDUnit (`string`): default unit for depth (default=`cm`).
  - hBeforeW (`boolean?`): true if the height comes before the width in the text representation.
  - hideTag (`boolean?`)
- 🔥 output:
  - sizeChange (`PhysicalSize`)
