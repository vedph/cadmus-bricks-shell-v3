import { CommonModule, JsonPipe, KeyValue } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import {
  NoteSet,
  NoteSetComponent,
} from '@myrmidon/cadmus-ui-note-set';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'app-note-set-pg',
  templateUrl: './note-set-pg.component.html',
  styleUrls: ['./note-set-pg.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButton,
    MatCardModule,
    NoteSetComponent,
    JsonPipe,
  ],
})
export class NoteSetPgComponent {
  public altSet = false;
  public set: NoteSet;
  public lastNoteChanged?: string;

  constructor() {
    this.set = this.getDefaultSet();
  }

  private getDefaultSet(): NoteSet {
    const set: NoteSet = {
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
      notes: {},
    };
    set.notes!['a'] =
      'This is an alpha *Markdown* note!\nMax **200** characters.';
    set.notes!['b'] = 'This is a beta plain text note with no max length.';
    return set;
  }

  private getAltSet(): NoteSet {
    const set: NoteSet = {
      definitions: [
        {
          key: 'a',
          label: 'alpha',
          markdown: true,
          required: true,
          maxLength: 200,
        },
        {
          key: 'g',
          label: 'gamma',
        },
      ],
      notes: {},
    };
    return set;
  }

  public onNoteChange(note: KeyValue<string, string | null>): void {
    console.log('Note changed', note);
    this.lastNoteChanged = `${note.key}=${note.value}`;
  }

  public onSetChange(set: NoteSet): void {
    console.log('Set changed', set);
    this.set = set;
  }

  public toggleDefinitions(): void {
    // get the appropriate base set
    const newSet = this.altSet ? this.getDefaultSet() : this.getAltSet();

    // set merge flag to preserve compatible notes
    newSet.merge = true;

    // add demo data for new keys only (NoteSetComponent will handle preservation of existing notes)
    if (this.altSet) {
      // going to default set - ensure 'b' has demo data
      if (!this.set?.notes?.['b']) {
        if (!newSet.notes) {
          newSet.notes = {};
        }
        newSet.notes['b'] =
          'This is a beta plain text note with no max length.';
      }
    } else {
      // going to alternate set - ensure 'g' has demo data
      if (!this.set?.notes?.['g']) {
        if (!newSet.notes) {
          newSet.notes = {};
        }
        newSet.notes['g'] = 'This is gamma plain text note with no max length.';
      }
    }

    // update the set and toggle state
    this.set = newSet;
    this.altSet = !this.altSet;
  }
}
