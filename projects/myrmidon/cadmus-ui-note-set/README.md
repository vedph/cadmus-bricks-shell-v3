# CadmusUiNoteSet

- 📦 `@myrmidon/cadmus-ui-note-set`
- 📦 dependencies:
  - `ngx-markdown`

- [CadmusUiNoteSet](#cadmusuinoteset)
  - [NoteSetComponent](#notesetcomponent)
    - [Usage](#usage)
  - [History](#history)
    - [9.0.1](#901)
    - [9.0.0](#900)

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.0.

## NoteSetComponent

- 🔑 `NoteSetComponent`
- 🚩 `cadmus-ui-note-set`
- ▶️ input:
  - `set` (`NoteSet`): object with definitions and note values.
- 🔥 output:
  - `noteChange` (`KeyValue<string, string | null>`): emitted whenever a single note is changed.
  - `setChange` (`NoteSet`): emitted when any changes occurs.

The `NoteSetComponent` provides a user interface for managing a set of notes, each with its own key, label, and metadata. Notes can be plain text or Markdown, and can have validation rules applied.

Main features:

- supports both plain text and Markdown notes;
- built-in validation for required fields and maximum length;
- live character count for length-limited notes;
- markdown preview for Markdown-enabled notes;
- visual indicators for required notes;
- save and revert functionality for each note;
- tracking of missing required notes.

Each note has a key, a label, and some metadata for its format and validation. Whenever the user saves his changes to a note, the `noteChange` event is emitted with its key and value.

To use this component, just bind its set property to a set, and handle the `setChange` event.

### Usage

(1) include the component in your code:

```ts
import { NoteSetComponent } from '@myrmidon/cadmus-ui-note-set';

@NgModule({
  imports: [
    // ...
    NoteSetComponent
  ]
})
export class YourModule { }
```

(2) add the component to your template:

```html
<cadmus-ui-note-set
  [(set)]="noteSet"
  (noteChange)="onNoteChange($event)"
  (setChange)="onSetChange($event)" />
```

The note set object (`NoteSet`) contains an array of definitions (`NoteSetDefinition`) and a key-value object with note content. The definition allows you to specify:

- `key`: a unique ID for the note.
- `label`: display label for the note.
- `markdown`: true to use Markdown.
- `required`: true if note is required.
- `maxLength`: optional max length for the note.

Additionally, the `NoteSet` model has a non-persisted `merge` property which enables preserving existing notes when updating the definitions array. When `merge` is true:

- existing notes with keys that match the new definitions are preserved;
- notes with keys not present in the new definitions are discarded;
- new keys in the definitions will start with empty notes.

This is particularly useful when dynamically changing the available note definitions without losing user input.

Example:

```ts
import { Component } from '@angular/core';
import { KeyValue } from '@angular/common';
import { NoteSet } from '@myrmidon/cadmus-ui-note-set';

@Component({
  selector: 'app-my-component',
  template: `
    <cadmus-ui-note-set
      [(set)]="noteSet"
      (noteChange)="onNoteChange($event)"
      (setChange)="onSetChange($event)">
    </cadmus-ui-note-set>
  `
})
export class MyComponent {
  public noteSet: NoteSet = {
    definitions: [
      {
        key: 'summary',
        label: 'Summary',
        markdown: true,
        required: true,
        maxLength: 500
      },
      {
        key: 'comments',
        label: 'Comments',
        markdown: false
      }
    ],
    notes: {
      'summary': '# Project Summary\nThis is a *Markdown* summary.'
    }
  };

  public onNoteChange(note: KeyValue<string, string | null>): void {
    console.log(`Note "${note.key}" changed to: ${note.value}`);
  }

  public onSetChange(set: NoteSet): void {
    console.log('Complete set updated:', set);
    this.noteSet = set;
  }
}
```

Example for changing definitions and using `merge`:

```ts
// changing definitions while preserving compatible notes
private updateDefinitions(): void {
  // create new set with different definitions
  const newSet: NoteSet = {
    definitions: [
      // existing key 'summary' will preserve its content
      {
        key: 'summary',
        label: 'Summary',
        markdown: true
      },
      // new key 'references' will be empty initially
      {
        key: 'references', 
        label: 'References'
      }
      // note: 'comments' key will be lost as it's not in new definitions
    ],
    notes: {},
    merge: true // Enable merging of compatible notes
  };

  // update the component's set
  this.noteSet = newSet;
}
```

## History

### 9.0.1

- 2025-09-10: refactored to use `OnPush`.

### 9.0.0

- 2025-05-15:
  - ⚠️ changed `NoteSet` model to avoid using `Map`.
  - added merge option for preserving notes while changing their definitions.
  - refactored component code.
