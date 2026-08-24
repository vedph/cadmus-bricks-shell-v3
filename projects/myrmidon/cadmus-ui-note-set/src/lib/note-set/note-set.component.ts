import { KeyValue } from '@angular/common';
import {
  Component,
  output,
  effect,
  model,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  FieldTree,
  FormField,
  form,
  maxLength,
  required,
  validate,
} from '@angular/forms/signals';
import { debounceTime, distinctUntilChanged, map, take } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { marked } from 'marked';

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
 * The editable controls backing the note editor.
 */
interface NoteFormControls {
  key: string | null;
  text: string;
  reqNotes: boolean;
}

/**
 * A set of editable notes, either plain text or Markdown.
 * Each note has a key, a label, and some metadata for its format
 * and validation. Whenever the user saves his changes to a note,
 * the noteChange event is emitted with its key and value.
 * To use this component, just bind its set property to a set,
 * and handle the noteChange event.
 */
@Component({
  selector: 'cadmus-ui-note-set',
  templateUrl: './note-set.component.html',
  styleUrls: ['./note-set.component.css'],
  imports: [
    FormField,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoteSetComponent {
  // set synchronously at every site that writes `set` (not inside the
  // model-sync effect below), paired with _hasLastSet since undefined is
  // both "never saved yet" and a legitimate real value - see
  // signal-forms-migration.md
  private _lastSet: NoteSet | undefined = undefined;
  private _hasLastSet = false;
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

  private readonly _draft = signal<NoteFormControls>(
    this.makeDefaultControls(),
  );
  public readonly form: FieldTree<NoteFormControls>;

  public readonly keys = signal<KeyValue<string, string>[]>([]);
  public readonly currentDef = signal<NoteSetDefinition | undefined>(undefined);
  public readonly currentLen = signal<number>(0);
  public readonly previewHtml = signal<SafeHtml>('');

  public readonly noteCount = computed(
    () => Object.values(this.set().notes ?? {}).filter((v) => !!v).length
  );

  public readonly missing = computed(() => {
    return this.set()
      .definitions.filter(
        (def) =>
          def.required && (!this.set().notes || !this.set().notes![def.key])
      )
      .map((def) => def.label || def.key);
  });

  public readonly existing = computed(() => {
    return this.set()
      .definitions.filter(
        (def) => this.set().notes && this.set().notes![def.key]
      )
      .map((def) => def.label || def.key);
  });

  constructor(
    private _dialogService: DialogService,
    private _sanitizer: DomSanitizer
  ) {
    this.form = form(this._draft, (path) => {
      required(path.text, { when: () => !!this.currentDef()?.required });
      maxLength(path.text, () => this.currentDef()?.maxLength);
      validate(path.reqNotes, (ctx) =>
        ctx.value() ? null : { kind: 'required' }
      );
    });

    effect(() => {
      const newSet = this.set();
      if (this._hasLastSet && this._lastSet === newSet) {
        return;
      }
      this._lastSet = newSet;
      this._hasLastSet = true;

      // preserve existing notes during set updates
      if (this._previousSet) {
        this.preserveExistingNotes(this._previousSet, newSet);
      }

      // update the form with the potentially modified set
      this.updateForm(newSet);

      // cache the current set for next time
      this._previousSet = { ...newSet };
      if (newSet.notes) {
        this._previousSet.notes = { ...newSet.notes };
      }
    });

    // when a key changes, edit its note
    toObservable(this.form.key().value)
      .pipe(distinctUntilChanged(), debounceTime(10))
      .subscribe((k) => {
        this.editNote(k);
      });

    // show text length when typing
    toObservable(this.form.text().value)
      .pipe(
        map((text) => text?.length || 0),
        distinctUntilChanged(),
        debounceTime(50)
      )
      .subscribe((n) => {
        this.currentLen.set(n);
      });

    // update the markdown preview when typing
    toObservable(this.form.text().value)
      .pipe(debounceTime(50))
      .subscribe(() => {
        this.updatePreview();
      });
  }

  private makeDefaultControls(): NoteFormControls {
    return { key: null, text: '', reqNotes: true };
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

    // get valid keys from new definitions
    const validKeys = new Set(newSet.definitions.map((d) => d.key));

    // create a new notes object, preserving only valid keys
    const preservedNotes: { [key: string]: string | null } = {
      ...(newSet.notes ?? {}),
    };

    Object.entries(previousSet.notes).forEach(([key, value]) => {
      if (
        validKeys.has(key) &&
        value !== null &&
        preservedNotes[key] == null // only if not already present
      ) {
        preservedNotes[key] = value;
      }
    });

    // assign a new object reference to trigger change detection
    newSet.notes = { ...preservedNotes };
  }

  /**
   * Renders the current text as sanitized HTML for the Markdown preview.
   */
  private updatePreview(): void {
    const html = marked.parse(this.form.text().value() || '', {
      async: false,
    }) as string;
    this.previewHtml.set(this._sanitizer.bypassSecurityTrustHtml(html));
  }

  private updateForm(set?: NoteSet): void {
    if (!set?.definitions.length) {
      this._draft.set(this.makeDefaultControls());
      this.form().reset();
      this.keys.set([]);
      return;
    }

    // make defensive copies to avoid unintended mutations
    const safeSet = { ...set };
    if (!safeSet.notes) {
      safeSet.notes = {};
    }

    // extract keys and labels
    this.keys.set(
      safeSet.definitions.map((d) => {
        return {
          key: d.key,
          value: d.label,
        } as KeyValue<string, string>;
      })
    );

    // if a key is currently selected, ensure it's still valid
    const currentKey = this.form.key().value();
    if (currentKey) {
      const keyExists = safeSet.definitions.some((d) => d.key === currentKey);
      if (!keyExists) {
        this.form.key().value.set(null);
        this.form.text().value.set('');
        this.currentDef.set(undefined);
      } else if (this.currentDef()) {
        // if still valid, refresh the text value in case it changed
        this.form.text().value.set(safeSet.notes[currentKey] || '');
      }
    }

    // update notes count
    this.form.reqNotes().value.set(this.missing()?.length ? false : true);
  }

  /**
   * Edit the note with the specified key.
   */
  private editNote(key: string | null): void {
    if (!key) {
      this.currentDef.set(undefined);
      this.form.text().value.set('');
      return;
    }

    // create a defensive copy of the set
    const set = { ...this.set() };
    if (!set.notes) {
      set.notes = {};
    }

    this.form.text().value.set(set.notes[key] || '');

    // required/maxLength validators are driven reactively by currentDef()
    // in the schema, no imperative re-validation needed
    this.currentDef.set(set.definitions.find((d) => d.key === key));
    if (!this.currentDef()) {
      return;
    }
    this.form.text().reset();
  }

  public revertNote(): void {
    if (this.currentDef()) {
      this.editNote(this.currentDef()!.key);
    }
  }

  private saveNote(note: KeyValue<string, string | null>): void {
    // create a defensive copy with proper notes object
    const set = { ...this.set() };
    if (!set.notes) {
      set.notes = {};
    }

    // save note
    set.notes = { ...set.notes, [note.key]: note.value };

    // emit note change
    if (this.currentDef()) {
      this.noteChange.emit({
        key: this.currentDef()!.key,
        value: note.value,
      });
    }

    // cache the current set before updating
    this._previousSet = { ...this.set() };
    if (this._previousSet.notes) {
      this._previousSet.notes = { ...this._previousSet.notes };
    }

    this._lastSet = set;
    this._hasLastSet = true;
    this.set.set(set);

    // update UI
    this.form.text().reset();
    this.form.reqNotes().value.set(this.missing()?.length ? false : true);
  }

  /**
   * Save the currently edited note.
   */
  public save(): void {
    if (!this.currentDef() || this.form.text().invalid()) {
      return;
    }
    this.saveNote({
      key: this.currentDef()!.key,
      value: this.form.text().value().trim() || '',
    });
  }

  /**
   * Clear the currently edited note.
   */
  public clear(): void {
    if (!this.currentDef()) {
      return;
    }
    this._dialogService
      .confirm('Confirmation', `Delete note ${this.currentDef()!.label}?`)
      .pipe(take(1))
      .subscribe((yes) => {
        if (yes) {
          this.form.text().value.set('');
          this.saveNote({
            key: this.currentDef()!.key,
            value: null,
          });
        }
      });
  }
}
