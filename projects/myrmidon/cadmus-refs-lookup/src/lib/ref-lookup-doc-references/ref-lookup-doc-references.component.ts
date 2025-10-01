import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  signal,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { FlatLookupPipe } from '@myrmidon/ngx-tools';
import { DocReference } from '@myrmidon/cadmus-refs-doc-references';

import { LookupDocReferenceComponent } from '../ref-lookup-doc-reference/ref-lookup-doc-reference.component';

/**
 * Document references editor component.
 */
@Component({
  selector: 'cadmus-refs-lookup-doc-references',
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
    FlatLookupPipe,
    LookupDocReferenceComponent,
  ],
  templateUrl: './ref-lookup-doc-references.component.html',
  styleUrl: './ref-lookup-doc-references.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LookupDocReferencesComponent {
  /**
   * The reference being edited (if any).
   */
  public readonly edited = signal<DocReference | undefined>(undefined);

  /**
   * The index of the reference being edited, or -1 if a new reference is
   * being added.
   */
  public readonly editedIndex = signal<number>(-1);

  /**
   * The references.
   */
  public readonly references = model<DocReference[]>([]);

  /*
   * Thesaurus entries: doc-reference-types
   */
  public readonly typeEntries = input<ThesaurusEntry[]>();

  /**
   * Thesaurus entries: doc-reference-tags
   */
  public readonly tagEntries = input<ThesaurusEntry[]>();

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
   * True to auto-close the picker when a lookup item is picked.
   */
  public readonly autoCloseOnPick = input<boolean>(true);

  constructor(private _dialogService: DialogService) {}

  public addReference(): void {
    const entry: DocReference = {
      citation: '',
    };
    this.editReference(entry, -1);
  }

  public editReference(entry: DocReference, index: number): void {
    this.editedIndex.set(index);
    this.edited.set(structuredClone(entry));
  }

  public closeReference(): void {
    this.editedIndex.set(-1);
    this.edited.set(undefined);
  }

  public saveReference(entry: DocReference): void {
    const entries = [...this.references()];
    if (this.editedIndex() === -1) {
      entries.push(entry);
    } else {
      entries.splice(this.editedIndex(), 1, entry);
    }
    this.references.set(entries);
    this.closeReference();
  }

  public deleteReference(index: number): void {
    this._dialogService
      .confirm('Confirmation', 'Delete Reference?')
      .subscribe((yes: boolean | undefined) => {
        if (yes) {
          if (this.editedIndex() === index) {
            this.closeReference();
          }
          const entries = [...this.references()];
          entries.splice(index, 1);
          this.references.set(entries);
        }
      });
  }

  public moveReferenceUp(index: number): void {
    if (index < 1) {
      return;
    }
    const entry = this.references()[index];
    const entries = [...this.references()];
    entries.splice(index, 1);
    entries.splice(index - 1, 0, entry);
    this.references.set(entries);
  }

  public moveReferenceDown(index: number): void {
    if (index + 1 >= this.references().length) {
      return;
    }
    const entry = this.references()[index];
    const entries = [...this.references()];
    entries.splice(index, 1);
    entries.splice(index + 1, 0, entry);
    this.references.set(entries);
  }
}
