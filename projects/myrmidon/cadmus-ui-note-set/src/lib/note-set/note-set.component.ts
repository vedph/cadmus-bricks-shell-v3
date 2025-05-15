import { CommonModule, KeyValue } from '@angular/common';
import { Component, OnInit, output, effect, model } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { debounceTime, distinctUntilChanged, map, take } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { NgeMarkdownModule } from '@cisstech/nge/markdown';

import { DialogService } from '@myrmidon/ngx-mat-tools';

/**
 * The definition of a note in a set of notes.
 */
export interface NoteSetDefinition {
  key: string;
  label: string;
  markdown?: boolean;
  required?: boolean;
  maxLength?: number;
}

/**
 * A set of notes with their definitions.
 */
export interface NoteSet {
  definitions: NoteSetDefinition[];
  notes?: { [key: string]: string | null };
  /**
   * When true, setting a new NoteSet will preserve existing notes
   * that have matching keys in the new definitions.
   * This is used to modify the component's behavior while setting
   * its data, and is not part of the persistent data model.
   */
  merge?: boolean;
}

/**
 * A set of editable notes, either plain text or Markdown.
 * Each note has a key, a label, and some metadata for its format
 * and validation. Whenever the user saves his changes to a note,
 * the noteChange event is emitted with its key and value.
 * To use this component, just bind its set property to a set,
 * and handle the noteChange event.
 * NOTE: requires ngx-markdown.
 */
@Component({
  selector: 'cadmus-ui-note-set',
  templateUrl: './note-set.component.html',
  styleUrls: ['./note-set.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    // vendor
    NgeMarkdownModule,
    // material
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule,
  ],
})
export class NoteSetComponent implements OnInit {
  private _updating = false;
  // cache the previous set for comparison during updates
  private _previousSet: NoteSet | null = null;

  /**
   * The set of notes with their definitions.
   */
  public readonly set = model<NoteSet>({ definitions: [] });

  /**
   * Event emitted whenever a note is changed.
   * The argument is a key/value pair.
   */
  public readonly noteChange = output<KeyValue<string, string | null>>();

  public form: FormGroup;
  public key: FormControl<string | null>;
  public text: FormControl<string | null>;
  public reqNotes: FormControl<boolean>;

  public keys: KeyValue<string, string>[];
  public noteCount: number;
  public currentDef: NoteSetDefinition | undefined;
  public currentLen: number;
  public missing: string[] | undefined;
  public existing: string[] | undefined;

  constructor(formBuilder: FormBuilder, private _dialogService: DialogService) {
    this.keys = [];
    this.noteCount = 0;
    this.currentLen = 0;
    // form
    this.text = formBuilder.control(null);
    this.key = formBuilder.control(null);
    this.reqNotes = formBuilder.control(true, {
      validators: Validators.requiredTrue,
      nonNullable: true,
    });
    this.form = formBuilder.group({
      note: this.key,
      text: this.text,
      reqNotes: this.reqNotes,
    });

    effect(() => {
      // prevent recursive updates
      if (this._updating) {
        return;
      }

      const newSet = this.set();
      this._updating = true;

      try {
        // preserve existing notes during set updates
        if (this._previousSet) {
          this.preserveExistingNotes(this._previousSet, newSet);
        }

        // Update the form with the potentially modified set
        this.updateForm(newSet);

        // Cache the current set for next time
        this._previousSet = { ...newSet };
        if (newSet.notes) {
          this._previousSet.notes = { ...newSet.notes };
        }
      } finally {
        // always reset flag even if an error occurs
        this._updating = false;
      }
    });
  }

  /**
   * Preserves existing notes when the set definitions change.
   * Only notes with keys that still exist in the new definitions are preserved.
   * This happens only when the set.merge property is true.
   */
  private preserveExistingNotes(previousSet: NoteSet, newSet: NoteSet): void {
    // exit if there's no valid set or definitions
    if (!newSet || !newSet.definitions || newSet.definitions.length === 0) {
      return;
    }

    // if merge flag isn't set, don't preserve notes
    if (!newSet.merge) {
      return;
    }

    // no previous notes to preserve
    if (!previousSet?.notes) {
      return;
    }

    // initialize notes object if it doesn't exist
    if (!newSet.notes) {
      newSet.notes = {};
    }

    // get valid keys from new definitions
    const validKeys = new Set(newSet.definitions.map((d) => d.key));

    // for each previous note, preserve it if its key exists in new definitions
    // and it doesn't already have a value in the new notes
    Object.entries(previousSet.notes).forEach(([key, value]) => {
      if (validKeys.has(key) && value !== null && !newSet.notes![key]) {
        console.log(`Preserving note for key: ${key} with value: ${value}`);
        newSet.notes![key] = value;
      }
    });
  }

  public ngOnInit(): void {
    // when a key changes, edit its note
    this.key.valueChanges
      .pipe(distinctUntilChanged(), debounceTime(10))
      .subscribe((k: string | null) => {
        this.editNote(k);
      });

    // show text length when typing
    this.text.valueChanges
      .pipe(
        map((text) => {
          return text?.length || 0;
        }),
        distinctUntilChanged(),
        debounceTime(50)
      )
      .subscribe((n) => {
        this.currentLen = n;
      });
  }

  private updateForm(set?: NoteSet): void {
    if (!set?.definitions.length) {
      this.form.reset();
      this.keys = [];
      this.noteCount = 0;
      this.missing = [];
      this.existing = [];
      return;
    }

    // make defensive copies to avoid unintended mutations
    const safeSet = { ...set };
    if (!safeSet.notes) {
      safeSet.notes = {};
    }

    // extract keys and labels
    this.keys = safeSet.definitions.map((d) => {
      return {
        key: d.key,
        value: d.label,
      } as KeyValue<string, string>;
    });

    // if a key is currently selected, ensure it's still valid
    if (this.key.value) {
      const keyExists = safeSet.definitions.some(
        (d) => d.key === this.key.value
      );
      if (!keyExists) {
        this.key.setValue(null);
        this.text.setValue(null);
        this.currentDef = undefined;
      } else if (this.currentDef) {
        // if still valid, refresh the text value in case it changed
        this.text.setValue(safeSet.notes[this.key.value] || null);
      }
    }

    // update notes count
    this.updateNoteCount();
    this.missing = this.getMissingNotes();
    this.existing = this.getExistingNotes();
    this.reqNotes.setValue(this.missing?.length ? false : true);
  }

  /**
   * Update the count of non-falsy notes.
   */
  private updateNoteCount(): void {
    if (!this.set().notes) {
      this.noteCount = 0;
    } else {
      let n = 0;
      Object.values(this.set()?.notes ?? {}).forEach((value) => {
        if (value) {
          n++;
        }
      });
      this.noteCount = n;
    }
  }

  /**
   * Edit the note with the specified key.
   */
  private editNote(key: string | null): void {
    if (!key) {
      this.currentDef = undefined;
      this.text.setValue(null);
      this.text.clearValidators();
      this.text.updateValueAndValidity();
      return;
    }

    // create a defensive copy of the set
    const set = { ...this.set() };
    if (!set.notes) {
      set.notes = {};
    }

    this.text.clearValidators();
    this.text.setValue(set.notes[key] || null);

    // update text validators
    this.currentDef = set.definitions.find((d) => d.key === key);
    if (!this.currentDef) {
      return;
    }
    const validators: ValidatorFn[] = [];
    if (this.currentDef.required) {
      validators.push(Validators.required);
    }
    if (this.currentDef.maxLength) {
      validators.push(Validators.maxLength(this.currentDef.maxLength));
    }
    this.text.setValidators(validators);
    this.text.updateValueAndValidity();
    this.text.markAsPristine();
  }

  public revertNote(): void {
    if (this.currentDef) {
      this.editNote(this.currentDef.key);
    }
  }

  /**
   * Get the list of missing notes.
   */
  private getMissingNotes(): string[] {
    const missing: string[] = [];
    this.set().definitions.forEach((def) => {
      if (
        def.required &&
        (!this.set().notes || !this.set()?.notes?.[def.key])
      ) {
        missing.push(def.label || def.key);
      }
    });
    return missing;
  }

  private getExistingNotes(): string[] {
    const existing: string[] = [];
    this.set().definitions.forEach((def) => {
      if (this.set().notes && this.set()?.notes?.[def.key]) {
        existing.push(def.label || def.key);
      }
    });
    return existing;
  }

  private saveNote(note: KeyValue<string, string | null>): void {
    // create a defensive copy with proper notes object
    const set = { ...this.set() };
    if (!set.notes) {
      set.notes = {};
    }

    // save note
    set.notes[note.key] = note.value;

    // emit note change
    if (this.currentDef) {
      this.noteChange.emit({
        key: this.currentDef.key,
        value: note.value,
      });
    }

    // use the updating flag to prevent an infinite loop
    this._updating = true;
    try {
      // Cache the current set before updating
      this._previousSet = { ...this.set() };
      if (this._previousSet.notes) {
        this._previousSet.notes = { ...this._previousSet.notes };
      }

      // update set
      this.set.set(set);

      // update UI
      this.text.markAsPristine();
      this.updateNoteCount();
      this.missing = this.getMissingNotes();
      this.existing = this.getExistingNotes();
      this.reqNotes.setValue(this.missing?.length ? false : true);
    } finally {
      this._updating = false;
    }
  }

  /**
   * Save the currently edited note.
   */
  public save(): void {
    if (!this.currentDef || this.text.invalid) {
      return;
    }
    this.saveNote({
      key: this.currentDef.key,
      value: this.text.value?.trim() || '',
    });
  }

  /**
   * Clear the currently edited note.
   */
  public clear(): void {
    if (!this.currentDef) {
      return;
    }
    this._dialogService
      .confirm('Confirmation', `Delete note ${this.currentDef.label}?`)
      .pipe(take(1))
      .subscribe((yes) => {
        if (yes) {
          this.text.reset();
          this.saveNote({
            key: this.currentDef!.key,
            value: null,
          });
        }
      });
  }
}
