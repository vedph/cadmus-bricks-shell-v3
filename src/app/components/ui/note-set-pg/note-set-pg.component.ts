import { CommonModule, JsonPipe, KeyValue } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import {
  NoteSet,
  NoteSetComponent,
} from '../../../../../projects/myrmidon/cadmus-ui-note-set/src/public-api';

@Component({
  selector: 'app-note-set-pg',
  templateUrl: './note-set-pg.component.html',
  styleUrls: ['./note-set-pg.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    NoteSetComponent,
    JsonPipe,
  ],
})
export class NoteSetPgComponent {
  public set: NoteSet;
  public lastNoteChanged?: string;

  constructor() {
    this.set = {
      definitions: [
        {
          key: 'a',
          label: 'alpha',
          markdown: true,
          required: true,
          maxLength: 200,
        },
        {
          key: 'b',
          label: 'beta',
        },
      ],
      notes: new Map<string, string | null>(),
    };
    this.set.notes!.set(
      'a',
      'This is a *Markdown* note!\nMax **200** characters.'
    );
    this.set.notes!.set('b', 'This is plain text note with no max length.');
  }

  public onNoteChange(note: KeyValue<string, string | null>): void {
    console.log('Note changed', note);
    this.lastNoteChanged = `${note.key}=${note.value}`;
  }

  public onSetChange(set: NoteSet): void {
    console.log('Set changed', set);
    this.set = set;
  }
}
