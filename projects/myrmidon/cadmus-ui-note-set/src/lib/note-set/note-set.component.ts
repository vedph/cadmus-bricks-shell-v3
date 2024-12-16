import { CommonModule, KeyValue } from '@angular/common';
import { Component, OnInit, output, input, effect, model } from '@angular/core';
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
  notes?: Map<string, string | null>;
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
      this.updateForm(this.set() || { definitions: [] });
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

  /**
   * Update the count of non-falsy notes.
   */
  private updateNoteCount(): void {
    if (!this.set()?.notes?.size) {
      this.noteCount = 0;
    } else {
      let n = 0;
      this.set().notes!.forEach((v: string | null, k: string) => {
        if (v) {
          n++;
        }
      });
      this.noteCount = n;
    }
  }

  private updateForm(set?: NoteSet): void {
    if (!set?.definitions.length) {
      this.form.reset();
      this.keys = [];
      this.noteCount = 0;
      return;
    }

    // extract keys and labels
    this.keys = set.definitions.map((d) => {
      return {
        key: d.key,
        value: d.label,
      } as KeyValue<string, string>;
    });

    // update notes count
    this.updateNoteCount();
    this.missing = this.getMissingNotes();
    this.existing = this.getExistingNotes();
  }

  /**
   * Edit the note with the specified key.
   */
  private editNote(key: string | null): void {
    if (!key) {
      return;
    }

    // load selected note into text
    const set = { ...this.set() };
    if (!set.notes) {
      set.notes = new Map<string, string | null>();
    }
    this.text.clearValidators();
    this.text.setValue(set.notes.get(key) || null);

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
        (!this.set().notes?.has(def.key) || !this.set().notes?.get(def.key))
      ) {
        missing.push(def.label || def.key);
      }
    });
    return missing;
  }

  private getExistingNotes(): string[] {
    const existing: string[] = [];
    this.set().definitions.forEach((def) => {
      if (this.set().notes?.has(def.key) && this.set().notes!.get(def.key)) {
        existing.push(def.label || def.key);
      }
    });
    return existing;
  }

  private saveNote(note: KeyValue<string, string | null>): void {
    if (!this.set().notes) {
      return;
    }

    // save note into a new set
    const set = { ...this.set() };
    set.notes!.set(note.key, note.value);

    // emit note change and set change
    this.noteChange.emit({
      key: this.currentDef!.key,
      value: set.notes!.get(this.currentDef!.key) || null,
    });

    // update set
    this.set.set(set);

    // update UI
    this.text.markAsPristine();
    this.updateNoteCount();
    this.missing = this.getMissingNotes();
    this.existing = this.getExistingNotes();
    this.reqNotes.setValue(this.missing.length ? false : true);
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
