# CadmusUiObjectView

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.2.0.

- 📦 `@myrmidon/cadmus-ui-object-view`

## ObjectViewComponent

A component for displaying a read-only view of an object's properties in a structured and customizable way.

- 🔑 `ObjectViewComponent`
- 🚩 `cadmus-ui-object-view`
- ▶️ input:
  - `object` (`Record<string, unknown>`): the object to display.
  - `label` (`string?`): optional label/title for the view.
  - `fields` (`ObjectViewField[]?`): optional array of fields to control display order, labels, and formatting.
  - `emptyMessage` (`string?`): message to show when the object is empty.
- 🔥 output:
  - `fieldClick` (`string`): emits the name of the field when a field is clicked (if enabled).

## Usage

1. Import `ObjectViewComponent` in your standalone component's `imports`.
2. Provide the object to display via the `object` input.
3. Optionally, configure `fields` to customize which properties are shown, their order, and labels.
4. Optionally, handle the `fieldClick` event for interactivity.

### Example

```ts
import { JsonPipe } from '@angular/common';
import { ObjectViewComponent, ObjectViewField } from '@myrmidon/cadmus-ui-object-view';

@Component({
  // ...
  imports: [ObjectViewComponent, JsonPipe],
})
export class MyComponent {
    public readonly data = signal<any>({
    names: [
      {
        first: 'John',
        last: 'Doe',
      },
      {
        first: 'JD',
        last: '',
        type: 'alias',
      },
    ],
    sex: 'male',
    'birth-date': '2020-12-31',
    inventory: [
      {
        type: 'weapon',
        size: {
          width: 4,
          height: 22,
        },
      },
    ],
  });

  public readonly value = signal<any>(undefined);

  public onValuePick(event: any): void {
    this.value.set(event);
  }
} 
```

```html
<cadmus-ui-object-view [data]="data()" (valuePick)="onValuePick($event)" />
@if (value()) {
<code>
  <pre>{{ value() | json }}</pre>
</code>
}
```

### Features

- Displays object properties in a clean, readable format.
- Supports custom field labels, order, and formatting.
- Emits events when fields are clicked (optional).
- Shows a customizable message when the object is empty.

> 💡 Use this component to quickly visualize object data in forms, detail panels, or read-only views.
