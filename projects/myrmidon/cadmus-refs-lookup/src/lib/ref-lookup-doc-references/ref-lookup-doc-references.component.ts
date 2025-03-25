import { Component, input, model } from '@angular/core';
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

@Component({
  selector: 'ref-cadmus-lookup-doc-references',
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
})
export class LookupDocReferencesComponent {
  public edited?: DocReference;
  public editedIndex: number = -1;

  /**
   * The references.
   */
  public readonly references = model<DocReference[]>([]);

  // doc-reference-types
  public readonly typeEntries = input<ThesaurusEntry[]>();

  // doc-reference-tags
  public readonly tagEntries = input<ThesaurusEntry[]>();

  constructor(private _dialogService: DialogService) {}

  public addReference(): void {
    const entry: DocReference = {
      citation: '',
    };
    this.editReference(entry, -1);
  }

  public editReference(entry: DocReference, index: number): void {
    this.editedIndex = index;
    this.edited = entry;
  }

  public closeReference(): void {
    this.editedIndex = -1;
    this.edited = undefined;
  }

  public saveReference(entry: DocReference): void {
    const entries = [...this.references()];
    if (this.editedIndex === -1) {
      entries.push(entry);
    } else {
      entries.splice(this.editedIndex, 1, entry);
    }
    this.references.set(entries);
    this.closeReference();
  }

  public deleteReference(index: number): void {
    this._dialogService
      .confirm('Confirmation', 'Delete Reference?')
      .subscribe((yes: boolean | undefined) => {
        if (yes) {
          if (this.editedIndex === index) {
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
