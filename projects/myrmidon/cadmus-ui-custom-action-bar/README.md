# CadmusUiCustomActionBar

📦 `@myrmidon/cadmus-ui-custom-action-bar`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.0.

## CustomActionBarComponent

- 🔑 `CustomActionBarComponent`
- 🚩 `cadmus-custom-action-bar`
- ▶️ input:
  - actions (`BarCustomAction[]`)
  - disabled (`boolean?`)
  - payload (`any`): optional payload data linked to this bar. For instance, in a list of actionable items having a bar for each item, this could be the item. The payload gets passed back to the `actionRequest` handler together with the action's ID.
- 🔥 output:
  - actionRequest (`BarCustomActionRequest`)

Custom actions bar component. This bar contains a row of buttons corresponding to custom-defined actions via the `actions` input property. Whenever the user clicks a button, the `actionRequest` event is emitted.

To use this component, set the actions and handle the `actionRequest` event. Optionally, you can set additional data in the payload property, which will be passed back to the `actionRequest` handler.

Each custom action is defined by an object implementing `BarCustomAction`.
