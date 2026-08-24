import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  model,
  signal,
} from '@angular/core';
import {
  disabled,
  FormField,
  form,
  maxLength,
  min,
  required,
} from '@angular/forms/signals';
import { debounceTime } from 'rxjs';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { FlatLookupPipe, NgxToolsSignalValidators } from '@myrmidon/ngx-tools';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { DocReference } from '@myrmidon/cadmus-refs-doc-references';
import {
  LookupDocReferencesComponent,
  LookupProviderOptions,
} from '@myrmidon/cadmus-refs-lookup';

/**
 * An ID optionally decorated with rank, tag, and sources.
 */
export interface DecoratedId {
  id: string;
  rank?: number;
  tag?: string;
  sources?: DocReference[];
}

/**
 * Decorated IDs real-time editor.
 */
@Component({
  selector: 'cadmus-refs-decorated-ids',
  templateUrl: './decorated-ids.component.html',
  styleUrls: ['./decorated-ids.component.css'],
  imports: [
    FormField,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    LookupDocReferencesComponent,
    FlatLookupPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DecoratedIdsComponent {
  // set synchronously wherever `ids` is written (not inside the effect
  // below), paired with _hasLastIds since undefined is both "never saved
  // yet" and a legitimate real value - see signal-forms-migration.md.
  private _lastIds: DecoratedId[] | undefined = undefined;
  private _hasLastIds = false;

  public readonly editedIndex = signal<number>(-1);
  public readonly edited = signal<DecoratedId | undefined>(undefined);

  private readonly _idEditorOpen = signal(false);
  private readonly _idDraft = signal({
    id: '',
    rank: 0,
    tag: '',
    sources: [] as DocReference[],
  });
  public readonly idForm = form(this._idDraft, (path) => {
    disabled(path, { when: () => !this._idEditorOpen() });
    required(path.id);
    maxLength(path.id, 50);
    maxLength(path.tag, 50);
    min(path.rank, 0);
  });

  private readonly _draft = signal({ editedIds: [] as DecoratedId[] });
  public readonly form = form(this._draft, (path) => {
    NgxToolsSignalValidators.strictMinLength(path.editedIds, 1);
  });

  /**
   * The IDs to edit.
   */
  public readonly ids = model<DecoratedId[] | undefined>(undefined);

  // decorated-id-tags
  public readonly tagEntries = input<ThesaurusEntry[]>();
  // doc-reference-tags
  public readonly refTagEntries = input<ThesaurusEntry[]>();
  // doc-reference-types
  public readonly refTypeEntries = input<ThesaurusEntry[]>();

  /**
   * True to disable the lookup set.
   */
  public readonly noLookup = input<boolean>();

  /**
   * True to disable the citation builder.
   */
  public readonly noCitation = input<boolean>();

  /**
   * The default picker to show when the editor opens.
   */
  public readonly defaultPicker = input<'citation' | 'lookup'>('citation');

  /**
   * Optional preset options for lookup providers.
   * Maps provider IDs to their available scopes.
   */
  public readonly lookupProviderOptions = input<LookupProviderOptions>();

  constructor() {
    // when ids change, update form and close ID editor
    effect(() => {
      const ids = this.ids();
      if (this._hasLastIds && this._lastIds === ids) {
        return;
      }
      this._lastIds = ids;
      this._hasLastIds = true;
      this.closeIdEditor();
      this.updateForm(ids);
    });

    // autosave
    toObservable(this.form.editedIds().value)
      .pipe(debounceTime(500), takeUntilDestroyed())
      .subscribe(() => {
        if (this.form().invalid()) {
          return;
        }
        const next = this.getIds();
        if (JSON.stringify(next) !== JSON.stringify(this.ids())) {
          this._lastIds = next;
          this._hasLastIds = true;
          this.ids.set(next);
        }
      });
  }

  // reads the plain array straight off the draft signal, and rebuilds
  // fresh objects, rather than reading `this.form.editedIds().value()`:
  // the FieldTree machinery tags each array-of-object item it adopts with
  // a hidden identity Symbol for its own reordering support, which then
  // shows up as an extra own property under toEqual() - see
  // signal-forms-migration.md. cadmus-refs-doc-references established
  // this same defense first.
  private getIds(): DecoratedId[] | undefined {
    const editedIds = this._draft().editedIds;
    return editedIds.length
      ? editedIds.map((d) => ({
          id: d.id,
          rank: d.rank,
          tag: d.tag,
          sources: d.sources,
        }))
      : undefined;
  }

  private updateForm(ids: DecoratedId[] | undefined): void {
    // map into fresh objects rather than adopting the caller's own
    // DecoratedId references directly: the FieldTree machinery tags each
    // array-of-object item it adopts with a hidden identity Symbol
    // in place, and adopting the caller's own objects would leak that
    // mutation back to them - see the comment on getIds() below.
    this._draft.set({
      editedIds: (ids || []).map((d) => ({
        id: d.id,
        rank: d.rank,
        tag: d.tag,
        sources: d.sources,
      })),
    });
    this.form().reset();
  }

  private closeIdEditor(): void {
    this.editedIndex.set(-1);
    this.edited.set(undefined);
    this._idDraft.set({ id: '', rank: 0, tag: '', sources: [] });
    this.idForm().reset();
    this._idEditorOpen.set(false);
  }

  private openIdEditor(id: DecoratedId): void {
    this._idEditorOpen.set(true);
    this.edited.set(id);
    this._idDraft.set({
      id: id.id,
      rank: id.rank || 0,
      tag: id.tag || '',
      sources: id.sources || [],
    });
    this.idForm().reset();
  }

  public addId(): void {
    this.editedIndex.set(-1);
    this.openIdEditor({ id: '' });
  }

  public editId(index: number): void {
    this.editedIndex.set(index);
    this.openIdEditor(this.ids()![index]);
  }

  private getEditedId(): DecoratedId | null {
    if (!this.edited()) {
      return null;
    }
    const v = this._idDraft();
    return {
      id: v.id.trim() || '',
      rank: v.rank || 0,
      tag: v.tag.trim() || undefined,
      sources: v.sources?.length ? v.sources : undefined,
    };
  }

  public deleteId(index: number): void {
    if (this.editedIndex() === index) {
      this.closeEditedId();
    }
    this.closeEditedId();

    this._draft.update((v) => {
      const editedIds = [...v.editedIds];
      editedIds.splice(index, 1);
      return { editedIds };
    });
  }

  public moveIdUp(index: number): void {
    if (index < 1) {
      return;
    }
    this._draft.update((v) => {
      const editedIds = [...v.editedIds];
      const entry = editedIds[index];
      editedIds.splice(index, 1);
      editedIds.splice(index - 1, 0, entry);
      return { editedIds };
    });
    this.form.editedIds().markAsDirty();
  }

  public moveIdDown(index: number): void {
    if (index + 1 >= this._draft().editedIds.length) {
      return;
    }
    this._draft.update((v) => {
      const editedIds = [...v.editedIds];
      const entry = editedIds[index];
      editedIds.splice(index, 1);
      editedIds.splice(index + 1, 0, entry);
      return { editedIds };
    });
    this.form.editedIds().markAsDirty();
  }

  public onSourcesChange(sources: DocReference[]): void {
    this.idForm.sources().value.set(sources);
    this.idForm().markAsDirty();
  }

  public closeEditedId(): void {
    this.closeIdEditor();
  }

  public saveEditedId(): void {
    if (this.idForm().invalid()) {
      return;
    }
    const id = this.getEditedId();
    if (!id) {
      return;
    }

    // if this is a new ID and any of the existing IDs
    // has the same ID, do nothing
    if (
      this.editedIndex() === -1 &&
      this._draft().editedIds.some((i) => i.id === id.id)
    ) {
      return;
    }

    const editedIds = [...this._draft().editedIds];
    if (this.editedIndex() === -1) {
      editedIds.push(id);
    } else {
      editedIds.splice(this.editedIndex(), 1, id);
    }
    this.closeEditedId();
    this._draft.set({ editedIds });
  }

  public onEditedFormSubmit(event: Event): void {
    event.preventDefault();
    this.saveEditedId();
  }

  public save(pristine = true): void {
    if (this.form().invalid()) {
      // show validation errors
      this.form().markAsTouched();
      return;
    }

    const ids = this.getIds();
    this._lastIds = ids;
    this._hasLastIds = true;
    this.ids.set(ids);

    if (pristine) {
      this.form().reset();
    }
  }
}
