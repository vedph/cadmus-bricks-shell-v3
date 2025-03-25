import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { LookupDocReferencesComponent } from '../../../../../projects/myrmidon/cadmus-refs-lookup/src/public-api';
import { DocReference } from '../../../../../projects/myrmidon/cadmus-refs-doc-references/src/public-api';

@Component({
  selector: 'app-ref-lookup-doc-references-pg',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    LookupDocReferencesComponent,
  ],
  templateUrl: './ref-lookup-doc-references-pg.component.html',
  styleUrl: './ref-lookup-doc-references-pg.component.scss',
})
export class RefLookupDocReferencesPgComponent {
  public references: DocReference[];
  public typeEntries: ThesaurusEntry[];

  constructor() {
    this.references = [
      {
        type: 'paper',
        tag: 'biblio',
        citation: 'Rossi 1963',
      },
    ];
    this.typeEntries = [
      {
        id: 'text',
        value: 'text',
      },
      {
        id: 'book',
        value: 'book',
      },
      {
        id: 'biblio',
        value: 'bibliography',
      },
      {
        id: 'ms',
        value: 'manuscript',
      },
      {
        id: 'doc',
        value: 'archive document',
      },
    ];
  }

  public onReferencesChange(model: DocReference[]): void {
    this.references = model;
  }
}
