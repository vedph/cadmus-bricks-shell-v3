# CadmusUiObjectView

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.2.0.

- 📦 `@myrmidon/cadmus-ui-object-view`

## ObjectViewComponent

A component for displaying a read-only view of an object's properties in a structured and customizable way, with user-defined filtering.

- 🔑 `ObjectViewComponent`
- 🚩 `cadmus-ui-object-view`
- ▶️ input:
  - `data` (any): the item to view.
  - `title` (`string`): the title for the viewer's toolbar.
  - `hideEmptyArrays` (`boolean`): true to hide empty arrays.
  - `hideEmptyObjects` (`boolean`): true to hide empty objects.
  - `hideEmptyArrays` (`boolean`): true to hide empty strings.
  - `hideZeroNumbers` (`boolean`): true to hide 0 numbers.
  - `hideFalseBooleans` (`boolean`): true to hide false booleans.
  - `copyOnPick` (`boolean`): true to copy the value to clipboard when picked (default is `true`).
- 🔥 output:
  - `valuePick` (`ValuePickEvent`): emits the key and value of the picked property when clicked.

## Usage

1. Import `ObjectViewComponent` in your standalone component's `imports`.
2. Provide the object to display via the `data` input.
3. Optionally configure the settings as you prefer.

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
