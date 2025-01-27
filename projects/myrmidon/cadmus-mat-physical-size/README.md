# CadmusMatPhysicalSize

- 📦 `@myrmidon/cadmus-mat-physical-size`
- 🧱 [backend: physical size brick](https://github.com/vedph/cadmus-bricks/blob/master/docs/physical-size.md)

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.0.

## PhysicalSizeComponent

This component allows you to edit a 2D or 3D physical size.

- 🚩 `cadmus-mat-physical-size`
- 🔑 `PhysicalSizeComponent`
- 📚 thesauri:
  - `physical-size-units` (unitEntries)
  - `physical-size-tags` (tagEntries)
  - `physical-size-dim-tags` (dimTagEntries)
- ▶️ input:
  - size (`PhysicalSize`)
  - defaultWUnit (`string`): default unit for width (default=`cm`).
  - defaultHUnit (`string`): default unit for height (default=`cm`).
  - defaultDUnit (`string`): default unit for depth (default=`cm`).
  - hBeforeW (`boolean?`): true if the height comes before the width (both in text and visual representation).
  - hideTag (`boolean?`)
- 🔥 output:
  - sizeChange (`PhysicalSize`)

## PhysicalDimensionComponent

This component allows you to edit a single physical dimension (value, unit, and optional tag).

- 🚩 `cadmus-mat-physical-dimension`
- 🔑 `PhysicalDimensionComponent`
- 📚 thesauri:
  - `physical-size-units` (unitEntries)
  - `physical-size-dim-tags` (tagEntries)
- ▶️ input:
  - dimension (`PhysicalDimension`)
  - disabled (`boolean?`)
  - hideTag (`boolean?`)
- 🔥 output:
  - dimensionChange (`PhysicalDimension`)

## PhysicalMeasurementSet

This component allows you to edit a set of physical measurements. For each one you specify a name (e.g. width, diagonal, volume, column, etc.) a value, a unit, and optionally a tag.

- 🚩 `cadmus-mat-physical-measurement-set`
- 🔑 `PhysicalMeasurementSetComponent`
- 📚 thesauri:
  - `physical-size-units` (unitEntries)
  - `physical-size-dim-tags` (dimTagEntries)
  - `physical-size-set-names` (nameEntries)
- ▶️ input:
  - measurements (`PhysicalMeasurement[]`)
  - allowCustomName (`boolean?`): true to allow users entering custom names for measurements, rather than only picking them from a dropdown.
  - defaultUnit (`string`)
- 🔥 output:
  - measurementsChange (`PhysicalMeasurement[]`)

## History

- 2025-01-27: fix to physical measurement set.
