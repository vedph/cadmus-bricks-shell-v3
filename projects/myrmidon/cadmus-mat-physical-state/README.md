# CadmusMatPhysicalState

📦 `@myrmidon/cadmus-mat-physical-state`

- [CadmusMatPhysicalState](#cadmusmatphysicalstate)
  - [PhysicalStateComponent](#physicalstatecomponent)
  - [History](#history)
    - [8.0.3](#803)
    - [8.0.2](#802)
    - [8.0.1](#801)

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.0.

## PhysicalStateComponent

- 🔑 `PhysicalStateComponent`
- 🚩 `cadmus-mat-physical-state`
- ▶️ input:
  - `state` (`PhysicalState`)
  - `noRecognition` (`boolean`): true to hide UI about the recognition of the state (date and reporter name)
- 📚 thesauri:
  - `physical-states` (for `stateEntries`)
  - `physical-state-reporters` (for `reporterEntries`)
  - `physical-state-features` (for `featEntries`)
- 🔥 output:
  - `stateChange` (`PhysicalState`)
  - `stateCancel`

## History

### 8.0.3

- 2025-01-27: fix to date format.

### 8.0.2

- 2025-01-27: fix to reporter.

### 8.0.1

- 2024-12-23: updated selector name for `cadmus-ui-flag-set`.
