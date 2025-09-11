import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  model,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { debounceTime, filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { FlatLookupPipe, NgxToolsValidators } from '@myrmidon/ngx-tools';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { DocReference } from '@myrmidon/cadmus-refs-doc-references';
import { LookupDocReferencesComponent } from '@myrmidon/cadmus-refs-lookup';

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
    FormsModule,
    ReactiveFormsModule,
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
  private _updatingForm = false;

  public readonly editedIndex = signal<number>(-1);
  public readonly edited = signal<DecoratedId | undefined>(undefined);

  public id: FormControl<string | null>;
  public rank: FormControl<number>;
  public tag: FormControl<string | null>;
  public sources: FormControl<DocReference[]>;
  public idForm: FormGroup;

  public editedIds: FormControl<DecoratedId[]>;
  public form: FormGroup;

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

  constructor(formBuilder: FormBuilder) {
    this.id = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(50),
    ]);
    this.rank = formBuilder.control(0, { nonNullable: true });
    this.tag = formBuilder.control(null, Validators.maxLength(50));
    this.sources = formBuilder.control([], { nonNullable: true });
    this.idForm = formBuilder.group({
      id: this.id,
      rank: this.rank,
      tag: this.tag,
      sources: this.sources,
    });

    this.editedIds = formBuilder.control([], {
      validators: NgxToolsValidators.strictMinLengthValidator(1),
      nonNullable: true,
    });
    this.form = formBuilder.group({
      ids: this.editedIds,
    });

    // when ids change, update form and close ID editor
    effect(() => {
      const ids = this.ids();
      console.log('ids change', ids);
      this.closeIdEditor();
      this.updateForm(ids);
    });

    // autosave
    this.form.valueChanges
      .pipe(
        // react only on user changes, when form is valid
        filter(() => !this._updatingForm && this.form.valid),
        debounceTime(500),
        takeUntilDestroyed()
      )
      .subscribe((values) => {
        this.save();
      });
  }

  private updateForm(ids: DecoratedId[] | undefined): void {
    this._updatingForm = true;

    this.idForm.reset();

    if (!ids?.length) {
      this.form.reset();
    } else {
      this.editedIds.setValue(ids || [], { emitEvent: false });
      this.form.markAsPristine();
    }

    // reset guard only after marking controls
    this._updatingForm = false;
  }

  private closeIdEditor(): void {
    this.editedIndex.set(-1);
    this.edited.set(undefined);
    this.idForm?.reset();
    this.idForm?.disable();
  }

  private openIdEditor(id: DecoratedId): void {
    this.idForm.enable();

    this.edited.set(id);
    this.sources.setValue(id.sources || []);
    this.id.setValue(id.id);
    this.rank.setValue(id.rank || 0);
    this.tag.setValue(id.tag || null);

    this.idForm.markAsPristine();
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
    if (!this.edited) {
      return null;
    }
    return {
      id: this.id.value?.trim() || '',
      rank: this.rank.value || 0,
      tag: this.tag.value?.trim(),
      sources: this.sources.value?.length ? this.sources.value : undefined,
    };
  }

  public deleteId(index: number): void {
    if (this.editedIndex() === index) {
      this.closeEditedId();
    }
    this.closeEditedId();

    const ids = [...this.editedIds.value];
    ids.splice(index, 1);
    this.editedIds.setValue(ids);
  }

  public moveIdUp(index: number): void {
    if (index < 1) {
      return;
    }
    const entry = this.editedIds.value[index];
    const entries = [...this.editedIds.value];
    entries.splice(index, 1);
    entries.splice(index - 1, 0, entry);
    this.editedIds.setValue(entries);
    this.editedIds.markAsDirty();
    this.editedIds.updateValueAndValidity();
  }

  public moveIdDown(index: number): void {
    if (index + 1 >= this.editedIds.value.length) {
      return;
    }
    const entry = this.editedIds.value[index];
    const entries = [...this.editedIds.value];
    entries.splice(index, 1);
    entries.splice(index + 1, 0, entry);
    this.editedIds.setValue(entries);
    this.editedIds.markAsDirty();
    this.editedIds.updateValueAndValidity();
  }

  public onSourcesChange(sources: DocReference[]): void {
    this.sources.setValue(sources);
    this.idForm.markAsDirty();
  }

  public closeEditedId(): void {
    this.closeIdEditor();
  }

  public saveEditedId(): void {
    if (this.idForm.invalid) {
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
      this.editedIds.value.some((i) => i.id === id.id)
    ) {
      return;
    }

    const ids = [...this.editedIds.value];
    if (this.editedIndex() === -1) {
      ids.push(id);
    } else {
      ids.splice(this.editedIndex(), 1, id);
    }
    this.closeEditedId();
    this.editedIds.setValue(ids);
  }

  public save(pristine = true): void {
    if (this.form.invalid) {
      // show validation errors
      this.form.markAllAsTouched();
      return;
    }

    const ids = this.editedIds.value?.length ? this.editedIds.value : undefined;
    this.ids.set(ids);

    if (pristine) {
      this.form.markAsPristine();
    }
  }
}
