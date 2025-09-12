# CadmusMatPhysicalSize

- 📦 `@myrmidon/cadmus-mat-physical-size`
- 🧱 [backend: physical size brick](https://github.com/vedph/cadmus-bricks/blob/master/docs/physical-size.md)

- [CadmusMatPhysicalSize](#cadmusmatphysicalsize)
  - [PhysicalSizeComponent](#physicalsizecomponent)
  - [PhysicalDimensionComponent](#physicaldimensioncomponent)
  - [PhysicalMeasurementSet](#physicalmeasurementset)
  - [History](#history)
    - [9.0.8](#908)
    - [9.0.7](#907)
    - [9.0.6](#906)
    - [9.0.5](#905)
    - [9.0.4](#904)
    - [9.0.3](#903)

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.0.

## PhysicalSizeComponent

This component allows you to edit a 2D or 3D physical size.

The component has two editing modes: textual and visual:

- in textual mode, you just type the size following a conventional syntax, and parse it by clicking a button. If the text is valid, the visual counterpart will be automatically populated.
- in visual mode, you edit each dimension value, unit, and tag, plus optionally the size's tag. Whenever you make a change in visual mode, the textual counterpart is updated.

In both modes, every change (i.e. saving text using the button in text mode, or just changing control values in visual mode) triggers an output event for the size being edited.

>Note that depth is optional; when not set, its value will be displayed as 0 in the visual editor, and be missing from the text editor.

- 🚩 `cadmus-mat-physical-size`
- 🔑 `PhysicalSizeComponent`
- 📚 thesauri:
  - `physical-size-units` (unitEntries)
  - `physical-size-tags` (tagEntries)
  - `physical-size-dim-tags` (dimTagEntries)
- ▶️ input:
  - `size` (`PhysicalSize`)
  - `defaultWUnit` (`string`): default unit for width (default=`cm`).
  - `defaultHUnit` (`string`): default unit for height (default=`cm`).
  - `defaultDUnit` (`string`): default unit for depth (default=`cm`).
  - `hBeforeW` (`boolean?`): true if the height comes before the width (both in text and visual representation).
  - `hideTag` (`boolean?`)
- 🔥 output:
  - `sizeChange` (`PhysicalSize`)

## PhysicalDimensionComponent

This component allows you to edit a single physical dimension (value, unit, and optional tag).

- 🚩 `cadmus-mat-physical-dimension`
- 🔑 `PhysicalDimensionComponent`
- 📚 thesauri:
  - `physical-size-units` (for `unitEntries`)
  - `physical-size-dim-tags` (for `tagEntries`)
- ▶️ input:
  - `dimension` (`PhysicalDimension`)
  - `disabled` (`boolean?`)
  - `hideTag` (`boolean?`)
- 🔥 output:
  - `dimensionChange` (`PhysicalDimension`)

## PhysicalMeasurementSet

This component allows you to edit a set of physical measurements. For each one you specify a name (e.g. width, diagonal, volume, column, etc.) a value, a unit, and optionally a tag.

- 🚩 `cadmus-mat-physical-measurement-set`
- 🔑 `PhysicalMeasurementSetComponent`
- 📚 thesauri:
  - `physical-size-units` (for `unitEntries`)
  - `physical-size-dim-tags` (for `dimTagEntries`)
  - `physical-size-set-names` (for `nameEntries`)
- ▶️ input:
  - `measurements` (`PhysicalMeasurement[]`)
  - `allowCustomName` (`boolean?`): true to allow users entering custom names for measurements, rather than only picking them from a dropdown.
  - `defaultUnit` (`string`)
- 🔥 output:
  - `measurementsChange` (`PhysicalMeasurement[]`)

## PhysicalSizePipe

The `PhysicalSizePipe` is an Angular pipe that formats a PhysicalSize object into a human-readable string, displaying its width, height, and (optionally) depth, with their units.

Add the pipe to your template to display a formatted physical size:

```html
<!-- Example usage in a template -->
<span>{{ size | physicalSize }}</span>
```

Parameters:

- `value` (PhysicalSize): The physical size object to format.
- `hBeforeW` (boolean, optional, default: false): If true, displays height -before width (e.g., "10 × 20 cm" instead of "20 × 10 cm").

Examples:

```html
{{ size | physicalSize }}
<!-- e.g.: 20.00 × 10.00 × 5.00 cm -->
```

Height before width:

```html
{{ size | physicalSize:true }}
<!-- e.g.: 10.00 × 20.00 × 5.00 cm -->
 ```

## History

### 9.0.10

- 2025-09-12: fix to default sizes.

### 9.0.9

- 2025-09-10: set components change detection strategy to `OnPush`.

### 9.0.8

- 2025-07-08: fixed `unitDisabled` (renamed from `staticUnit`).

### 9.0.7

- 2025-07-07: added `staticUnit` property to physical dimension editor.

### 9.0.6

- 2025-07-04: refactored `PhysicalDimensionComponent`. This was not used, and has been refactored to provide an editor for single dimensions.

### 9.0.5

- 2025-06-14:
  - fixes to physical size parser `toString`.
  - more tests for physical size parser.

### 9.0.4

- 2025-06-13: set text after form update in size.

### 9.0.3

- 2025-06-13: refactored physical size.
- 2025-01-27: fix to physical measurement set.
