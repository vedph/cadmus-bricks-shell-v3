import { Component, effect, input, model } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

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
 * To avoid circular updates, in your container bind ids to initialIds
 * and handle idsChange for ids.setValue.
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
    LookupDocReferencesComponent,
  ],
})
export class DecoratedIdsComponent {
  private _dropNextInput?: boolean;

  public editedIndex: number;
  public editedId: DecoratedId | undefined;
  public editorOpen: boolean;

  public subForm: FormGroup;
  public id: FormControl<string | null>;
  public rank: FormControl<number>;
  public tag: FormControl<string | null>;
  public sources: FormControl<DocReference[]>;
  public form: FormGroup;

  /**
   * The IDs to edit.
   */
  public readonly ids = model<DecoratedId[]>([]);

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
    this.editedIndex = -1;
    this.editorOpen = false;

    this.id = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(50),
    ]);
    this.rank = formBuilder.control(0, { nonNullable: true });
    this.tag = formBuilder.control(null, Validators.maxLength(50));
    this.sources = formBuilder.control([], { nonNullable: true });
    this.subForm = formBuilder.group({
      id: this.id,
      rank: this.rank,
      tag: this.tag,
      sources: this.sources,
    });
    this.form = formBuilder.group({
      subForm: this.subForm,
    });

    // when ids change, close ID editor
    effect(() => {
      if (this._dropNextInput) {
        this._dropNextInput = false;
        return;
      }
      console.log('ids change', this.ids());
      this.closeIdEditor();
    });
  }

  private closeIdEditor(): void {
    this.editedIndex = -1;
    this.editedId = undefined;
    this.subForm?.reset();
    this.subForm?.disable();
    this.editorOpen = false;
  }

  private openIdEditor(id: DecoratedId): void {
    this.subForm.enable();

    this.editedId = id;
    this.sources.setValue(id.sources || []);
    this.id.setValue(id.id);
    this.rank.setValue(id.rank || 0);
    this.tag.setValue(id.tag || null);

    this.subForm.markAsPristine();
    this.editorOpen = true;
  }

  public addId(): void {
    this.editedIndex = -1;
    this.openIdEditor({ id: '' });
  }

  public editId(index: number): void {
    this.editedIndex = index;
    this.openIdEditor(this.ids()[index]);
  }

  private getEditedId(): DecoratedId | null {
    if (!this.editedId) {
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
    if (this.editedIndex === index) {
      this.closeEditedId();
    }
    this.closeEditedId();
    this._dropNextInput = true;
    this.ids.set(this.ids().splice(index, 1));
  }

  public onSourcesChange(sources: DocReference[]): void {
    this.sources.setValue(sources);
    this.subForm.markAsDirty();
  }

  public closeEditedId(): void {
    this.closeIdEditor();
  }

  public saveEditedId(): void {
    if (this.subForm.invalid) {
      return;
    }
    const id = this.getEditedId();
    if (!id) {
      return;
    }

    const ids = [...this.ids()];
    if (this.editedIndex === -1) {
      ids.push(id);
    } else {
      ids.splice(this.editedIndex, 1, id);
    }
    this.closeEditedId();
    this._dropNextInput = true;
    this.ids.set(ids);
  }
}
